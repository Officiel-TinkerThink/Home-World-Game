// Run with:  node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../docs/js/homeworld.js");
const lcg = (s) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };

test("world: 4 rooms, 4 quests, 16 descriptions, every quest reachable", () => {
  assert.equal(H.NUM_ROOM_DESC, 16);
  for (let q = 0; q < 4; q++) assert.ok(H.questRoom(q) >= 0);
  assert.equal(H.questRoom(2), H.ROOMS.indexOf("Kitchen")); // hungry → apple → kitchen
});
test("rewards: finish +1, valid −0.01, invalid −0.11, terminal after 20 steps", () => {
  const g = new H.Game(lcg(1));
  g.newGame(H.ROOMS.indexOf("Kitchen"), 2);
  let r = g.step(H.ACTIONS.indexOf("eat"), H.OBJECTS.indexOf("bed"));   // invalid here
  assert.equal(r.reward, -0.11); assert.equal(r.valid, false); assert.equal(r.terminal, false);
  r = g.step(H.ACTIONS.indexOf("go"), H.OBJECTS.indexOf("north"));
  assert.equal(r.reward, -0.01); assert.equal(H.ROOMS[g.room], "Garden");
  r = g.step(H.ACTIONS.indexOf("go"), H.OBJECTS.indexOf("south"));
  r = g.step(H.ACTIONS.indexOf("eat"), H.OBJECTS.indexOf("apple"));
  assert.equal(r.reward, 1); assert.equal(r.finished, true); assert.equal(r.terminal, true);
  const g2 = new H.Game(lcg(2)); g2.newGame(0, 0);
  for (let i = 0; i < 20; i++) { const s = g2.step(H.ACTIONS.indexOf("eat"), H.OBJECTS.indexOf("north")); if (i < 19) assert.equal(s.terminal, false); else assert.equal(s.terminal, true); }
});
test("optimal expected return is 0.55375", () => {
  assert.ok(Math.abs(H.optimalExpectedReturn(0.5) - 0.55375) < 1e-9);
  assert.equal(H.stepsToFinish(H.ROOMS.indexOf("Living"), 2), 3); // Living → Kitchen is diagonal
  assert.ok(Math.abs(H.optimalReturn(H.ROOMS.indexOf("Garden"), 2, 0.5) - 0.49) < 1e-9);
});
test("bag of words separates punctuation and counts words", () => {
  assert.deepEqual(H.extractWords("You are hungry."), ["you", "are", "hungry", "."]);
  const v = H.bow("You are hungry. You are bored.");
  assert.equal(v[H.DICT.get("you")], 2);
  assert.equal(H.STATE_DIM, H.DICT.size);
});
test("tabular update follows Q ← (1−α)Q + α(r + γ max Q')", () => {
  const ag = new H.TabularQ({ alpha: 0.5, gamma: 0.5 });
  const obs = { roomDesc: H.ROOM_DESC.Kitchen[0], questDesc: H.QUESTS[2] };
  ag.update(obs, 0, 0, 1, obs, true);
  assert.equal(ag.qMatrix(obs)[0][0], 0.5);
  ag.update(obs, 0, 0, 1, obs, true);
  assert.equal(ag.qMatrix(obs)[0][0], 0.75);
});
test("all three agents learn: tabular and DQN approach the optimum, random baseline is negative", () => {
  const rng = lcg(9);
  const o = Object.assign({}, H.DEFAULTS, { rng });
  const final = (ag, epochs) => { const g = new H.Game(rng); const c = []; for (let e = 0; e < epochs; e++) c.push(H.runEpoch(ag, g, o)); return c.slice(-10).reduce((a, b) => a + b, 0) / 10; };
  assert.ok(final(new H.TabularQ({ alpha: 0.1 }), 120) > 0.4);
  assert.ok(final(new H.DQN({ alpha: 0.1, rng }), 100) > 0.35);
  const lin = final(new H.LinearQ({ alpha: 0.001 }), 80);
  assert.ok(lin > -0.2 && lin < 0.55);
  const first = H.runEpoch(new H.TabularQ({ alpha: 0 }), new H.Game(rng), o); // never learns
  assert.ok(first < 0.2);
});

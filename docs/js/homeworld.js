/*
 * Home World — text-game environment + three Q-learning agents.
 * Port of framework.py / utils.py / agent_tabular_ql.py / agent_linear.py / agent_dqn.py. No DOM.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HW = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ------------------------------------------------------------ world (framework.py)
  const DEFAULT_REWARD = -0.01, JUNK_CMD_REWARD = -0.1, QUEST_REWARD = 1, MAX_STEPS = 20;
  const QUESTS = ["You are bored.", "You are getting fat.", "You are hungry.", "You are sleepy."];
  const QUEST_ACTIONS = ["watch", "exercise", "eat", "sleep"];
  const QUEST_OBJECTS = ["tv", "bike", "apple", "bed"];
  const ROOMS = ["Living", "Garden", "Kitchen", "Bedroom"];
  const ROOM_DESC = {
    Living: ["This room has a couch, chairs and TV.", "You have entered the living room. You can watch TV here.", "This room has two sofas, chairs and a chandelier.", "A huge television that is great for watching games."],
    Garden: ["This space has a swing, flowers and trees.", "You have arrived at the garden. You can exercise here", "This area has plants, grass and rabbits.", "A nice shiny bike that is fun to ride."],
    Kitchen: ["This room has a fridge, oven, and a sink.", "You have arrived in the kitchen. You can find food and drinks here.", "This living area has pizza, coke, and icecream.", "A red juicy fruit."],
    Bedroom: ["This area has a bed, desk and a dresser.", "You have arrived in the bedroom. You can rest here.", "You see a wooden cot and a mattress on top of it.", "A nice, comfortable bed with pillows and sheets."],
  };
  const ACTIONS = ["eat", "sleep", "watch", "exercise", "go"];
  const OBJECTS = ["apple", "bed", "tv", "bike", "north", "south", "east", "west"];
  const VALID = { // room → [[action, object, nextRoom]]
    Living: [["go", "south", "Bedroom"], ["go", "west", "Garden"], ["watch", "tv", "Living"]],
    Garden: [["go", "south", "Kitchen"], ["go", "east", "Living"], ["exercise", "bike", "Garden"]],
    Kitchen: [["go", "north", "Garden"], ["go", "east", "Bedroom"], ["eat", "apple", "Kitchen"]],
    Bedroom: [["go", "north", "Living"], ["go", "west", "Kitchen"], ["sleep", "bed", "Bedroom"]],
  };
  // map layout (row, col) for drawing: Garden NW, Living NE, Kitchen SW, Bedroom SE
  const LAYOUT = { Garden: [0, 0], Living: [0, 1], Kitchen: [1, 0], Bedroom: [1, 1] };
  const NA = ACTIONS.length, NO = OBJECTS.length;

  const roomDescIndex = new Map(); // description → unique index (make_all_states_index)
  const roomOfDesc = new Map();    // description → room index
  ROOMS.forEach((r, ri) => ROOM_DESC[r].forEach((d) => { roomDescIndex.set(d, roomDescIndex.size); roomOfDesc.set(d, ri); }));
  const NUM_ROOM_DESC = roomDescIndex.size;

  function validCommand(roomIdx, a, o) { return VALID[ROOMS[roomIdx]].find((v) => v[0] === ACTIONS[a] && v[1] === OBJECTS[o]) || null; }
  function questRoom(q) { return ROOMS.findIndex((r) => VALID[r].some((v) => v[0] === QUEST_ACTIONS[q] && v[1] === QUEST_OBJECTS[q])); }
  /** Shortest number of commands to finish quest q from room r (1 = already there). */
  function stepsToFinish(r, q) {
    const target = questRoom(q);
    const dist = { [r]: 0 }; const queue = [r];
    while (queue.length) { const x = queue.shift(); for (const [a, o, next] of VALID[ROOMS[x]]) { const n = ROOMS.indexOf(next); if (a === "go" && dist[n] === undefined) { dist[n] = dist[x] + 1; queue.push(n); } } }
    return dist[target] + 1;
  }
  function optimalReturn(r, q, gamma) {
    const n = stepsToFinish(r, q); let ret = 0;
    for (let k = 0; k < n - 1; k++) ret += DEFAULT_REWARD * Math.pow(gamma, k);
    return ret + QUEST_REWARD * Math.pow(gamma, n - 1);
  }
  function optimalExpectedReturn(gamma) { let s = 0; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) s += optimalReturn(r, q, gamma); return s / 16; }

  class Game {
    constructor(rng) { this.rng = rng || Math.random; this.steps = 0; this.terminal = true; }
    rand(n) { return Math.floor(this.rng() * n); }
    newGame(roomIdx, questIdx) {
      this.steps = 0; this.terminal = false; this.finished = false;
      this.room = roomIdx === undefined ? this.rand(4) : roomIdx;
      this.quest = questIdx === undefined ? this.rand(4) : questIdx;
      this.startRoom = this.room;
      this.roomDesc = ROOM_DESC[ROOMS[this.room]][this.rand(4)];
      this.questDesc = QUESTS[this.quest];
      return this.observe();
    }
    observe() { return { roomDesc: this.roomDesc, questDesc: this.questDesc, terminal: this.terminal }; }
    /** step_game(): returns { roomDesc, questDesc, reward, terminal, valid, finished } */
    step(a, o) {
      if (this.terminal) throw new Error("episode over");
      this.steps++;
      let terminal = this.steps >= MAX_STEPS, reward, valid = false, finished = false;
      const v = validCommand(this.room, a, o);
      if (v) {
        valid = true;
        if (ACTIONS[a] === QUEST_ACTIONS[this.quest] && OBJECTS[o] === QUEST_OBJECTS[this.quest]) { terminal = true; finished = true; reward = QUEST_REWARD; }
        else reward = DEFAULT_REWARD;
        this.room = ROOMS.indexOf(v[2]);
        this.roomDesc = ROOM_DESC[ROOMS[this.room]][this.rand(4)];
      } else reward = DEFAULT_REWARD + JUNK_CMD_REWARD;
      this.terminal = terminal; this.finished = finished;
      return { roomDesc: this.roomDesc, questDesc: this.questDesc, reward, terminal, valid, finished };
    }
  }

  // ------------------------------------------------------------ text features (utils.py)
  function extractWords(s) {
    const punct = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~0123456789";
    let out = "";
    for (const c of s) out += punct.includes(c) ? " " + c + " " : c;
    return out.toLowerCase().split(/\s+/).filter(Boolean);
  }
  const DICT = new Map();
  [...ROOMS.flatMap((r) => ROOM_DESC[r]), ...QUESTS].forEach((t) => extractWords(t).forEach((w) => { if (!DICT.has(w)) DICT.set(w, DICT.size); }));
  const STATE_DIM = DICT.size;
  function bow(text) { const v = new Float64Array(STATE_DIM); for (const w of extractWords(text)) if (DICT.has(w)) v[DICT.get(w)]++; return v; }
  const stateVector = (obs) => bow(obs.roomDesc + obs.questDesc);

  // ------------------------------------------------------------ agents
  const pick = (rng) => [Math.floor(rng() * NA), Math.floor(rng() * NO)];
  /** Target used by all three agents (the original's terminal special-cases included). */
  function qSample(reward, terminal, maxNext, gamma) {
    if (terminal && (reward === DEFAULT_REWARD || reward === DEFAULT_REWARD + JUNK_CMD_REWARD)) return reward + 0.01; // ran out of steps: as in the original
    if (terminal) return reward;
    return reward + gamma * maxNext;
  }

  class TabularQ {
    constructor(o) { this.o = Object.assign({ alpha: 0.1, gamma: 0.5 }, o); this.q = new Float64Array(NUM_ROOM_DESC * 4 * NA * NO); this.name = "Tabular Q-learning"; this.id = "tabular"; }
    idx(s, q, a, o) { return ((s * 4 + q) * NA + a) * NO + o; }
    key(obs) { return [roomDescIndex.get(obs.roomDesc), QUESTS.indexOf(obs.questDesc)]; }
    qMatrix(obs) { const [s, q] = this.key(obs); const m = []; for (let a = 0; a < NA; a++) { const row = []; for (let o = 0; o < NO; o++) row.push(this.q[this.idx(s, q, a, o)]); m.push(row); } return m; }
    act(obs, epsilon, rng) {
      if (rng() < epsilon) return pick(rng);
      const m = this.qMatrix(obs); let best = -Infinity, ba = 0, bo = 0;
      for (let a = 0; a < NA; a++) for (let o = 0; o < NO; o++) if (m[a][o] > best) { best = m[a][o]; ba = a; bo = o; }
      return [ba, bo];
    }
    update(obs, a, o, reward, next, terminal) {
      const [s, q] = this.key(obs);
      let maxNext = -Infinity; if (!terminal) { const m = this.qMatrix(next); for (const row of m) for (const v of row) if (v > maxNext) maxNext = v; }
      const target = qSample(reward, terminal, maxNext, this.o.gamma);
      const i = this.idx(s, q, a, o);
      this.q[i] = this.o.alpha * target + (1 - this.o.alpha) * this.q[i];
    }
    get size() { return this.q.length; }
  }

  class LinearQ {
    constructor(o) { this.o = Object.assign({ alpha: 0.001, gamma: 0.5 }, o); this.theta = Array.from({ length: NA * NO }, () => new Float64Array(STATE_DIM)); this.name = "Linear Q (bag of words)"; this.id = "linear"; }
    qVec(x) { return this.theta.map((row) => { let s = 0; for (let i = 0; i < STATE_DIM; i++) s += row[i] * x[i]; return s; }); }
    qMatrix(obs) { const v = this.qVec(stateVector(obs)); const m = []; for (let a = 0; a < NA; a++) m.push(v.slice(a * NO, a * NO + NO)); return m; }
    act(obs, epsilon, rng) {
      if (rng() < epsilon) return pick(rng);
      const v = this.qVec(stateVector(obs)); let bi = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[bi]) bi = i;
      return [Math.floor(bi / NO), bi % NO];
    }
    update(obs, a, o, reward, next, terminal) {
      const x = stateVector(obs);
      const maxNext = terminal ? 0 : Math.max(...this.qVec(stateVector(next)));
      const target = qSample(reward, terminal, maxNext, this.o.gamma);
      const i = a * NO + o; const row = this.theta[i];
      let cur = 0; for (let k = 0; k < STATE_DIM; k++) cur += row[k] * x[k];
      const g = this.o.alpha * (target - cur);
      for (let k = 0; k < STATE_DIM; k++) row[k] += g * x[k];
    }
    get size() { return NA * NO * STATE_DIM; }
  }

  /** Two-head MLP trained with plain SGD, exactly like agent_dqn.py (loss = mean of the two half-squared errors). */
  class DQN {
    constructor(o) {
      this.o = Object.assign({ alpha: 0.1, gamma: 0.5, hidden: 100 }, o);
      const H = this.o.hidden, rng = this.o.rng || Math.random;
      const init = (n, m) => { const lim = 1 / Math.sqrt(m); return Array.from({ length: n }, () => Float64Array.from({ length: m }, () => (rng() * 2 - 1) * lim)); };
      this.W1 = init(H, STATE_DIM); this.b1 = new Float64Array(H);
      this.Wa = init(NA, H); this.ba = new Float64Array(NA);
      this.Wo = init(NO, H); this.bo = new Float64Array(NO);
      this.name = "Deep Q-network"; this.id = "dqn";
    }
    forward(x) {
      const H = this.o.hidden, h = new Float64Array(H);
      for (let j = 0; j < H; j++) { let s = this.b1[j]; const w = this.W1[j]; for (let i = 0; i < STATE_DIM; i++) s += w[i] * x[i]; h[j] = s > 0 ? s : 0; }
      const qa = new Float64Array(NA), qo = new Float64Array(NO);
      for (let a = 0; a < NA; a++) { let s = this.ba[a]; const w = this.Wa[a]; for (let j = 0; j < H; j++) s += w[j] * h[j]; qa[a] = s; }
      for (let o = 0; o < NO; o++) { let s = this.bo[o]; const w = this.Wo[o]; for (let j = 0; j < H; j++) s += w[j] * h[j]; qo[o] = s; }
      return { h, qa, qo };
    }
    qMatrix(obs) { const { qa, qo } = this.forward(stateVector(obs)); const m = []; for (let a = 0; a < NA; a++) { const row = []; for (let o = 0; o < NO; o++) row.push((qa[a] + qo[o]) / 2); m.push(row); } return m; }
    heads(obs) { const { qa, qo } = this.forward(stateVector(obs)); return { qa: Array.from(qa), qo: Array.from(qo) }; }
    act(obs, epsilon, rng) {
      if (rng() < epsilon) return pick(rng);
      const { qa, qo } = this.forward(stateVector(obs));
      let a = 0, o = 0; for (let i = 1; i < NA; i++) if (qa[i] > qa[a]) a = i; for (let i = 1; i < NO; i++) if (qo[i] > qo[o]) o = i;
      return [a, o];
    }
    update(obs, a, o, reward, next, terminal) {
      const x = stateVector(obs);
      let maxNext = 0;
      if (!terminal) { const n = this.forward(stateVector(next)); maxNext = 0.5 * (Math.max(...n.qa) + Math.max(...n.qo)); }
      const target = qSample(reward, terminal, maxNext, this.o.gamma);
      const { h, qa, qo } = this.forward(x);
      // loss = ((t - qa[a])²/2 + (t - qo[o])²/2) / 2  →  dL/dqa[a] = -(t - qa[a]) / 2
      const ga = -(target - qa[a]) / 2, go = -(target - qo[o]) / 2;
      const lr = this.o.alpha, H = this.o.hidden;
      const dh = new Float64Array(H);
      for (let j = 0; j < H; j++) { dh[j] = ga * this.Wa[a][j] + go * this.Wo[o][j]; }
      for (let j = 0; j < H; j++) { this.Wa[a][j] -= lr * ga * h[j]; this.Wo[o][j] -= lr * go * h[j]; }
      this.ba[a] -= lr * ga; this.bo[o] -= lr * go;
      for (let j = 0; j < H; j++) {
        if (h[j] <= 0) continue;
        const g = dh[j]; const w = this.W1[j];
        for (let i = 0; i < STATE_DIM; i++) if (x[i]) w[i] -= lr * g * x[i];
        this.b1[j] -= lr * g;
      }
    }
    get size() { return this.o.hidden * (STATE_DIM + 1) + (NA + NO) * (this.o.hidden + 1); }
  }

  function makeAgent(id, o) { return id === "tabular" ? new TabularQ(o) : id === "linear" ? new LinearQ(o) : new DQN(o); }

  // ------------------------------------------------------------ training loop (run_episode / run_epoch)
  function runEpisode(agent, game, forTraining, o) {
    const eps = forTraining ? o.trainEps : o.testEps, rng = o.rng || Math.random;
    let obs = game.newGame(), ret = 0, n = 0;
    while (!obs.terminal) {
      const [a, ob] = agent.act(obs, eps, rng);
      const res = game.step(a, ob);
      const next = { roomDesc: res.roomDesc, questDesc: res.questDesc, terminal: res.terminal };
      if (forTraining) agent.update(obs, a, ob, res.reward, next, res.terminal);
      else ret += res.reward * Math.pow(o.gamma, n);
      n++; obs = next;
    }
    return ret;
  }
  function runEpoch(agent, game, o) {
    for (let i = 0; i < o.episTrain; i++) runEpisode(agent, game, true, o);
    let s = 0; for (let i = 0; i < o.episTest; i++) s += runEpisode(agent, game, false, o);
    return s / o.episTest;
  }
  const DEFAULTS = { gamma: 0.5, trainEps: 0.5, testEps: 0.05, episTrain: 25, episTest: 50 };

  return {
    DEFAULT_REWARD, JUNK_CMD_REWARD, QUEST_REWARD, MAX_STEPS, QUESTS, QUEST_ACTIONS, QUEST_OBJECTS, ROOMS, ROOM_DESC, ACTIONS, OBJECTS, VALID, LAYOUT,
    NUM_ROOM_DESC, STATE_DIM, DICT, roomDescIndex, roomOfDesc, validCommand, questRoom, stepsToFinish, optimalReturn, optimalExpectedReturn,
    Game, extractWords, bow, stateVector, TabularQ, LinearQ, DQN, makeAgent, runEpisode, runEpoch, DEFAULTS,
  };
});

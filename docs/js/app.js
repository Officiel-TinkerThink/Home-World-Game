/* Home World — UI controller. Depends on homeworld.js and chart.js */
(function () {
  "use strict";
  const H = window.HW;
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "home-world-v1";
  const GAMMA = 0.5;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const num = (v) => Number(v).toLocaleString("en-US");
  const OBJ_ICON = { Living: "📺", Garden: "🚲", Kitchen: "🍎", Bedroom: "🛏️" };
  const QUEST_ICON = ["📺", "🚲", "🍎", "🛏️"];

  // ------------------------------------------------------------ sound
  const Sound = (() => {
    let ctx = null, enabled = true;
    function tone(f, dur, type, gain, when) {
      if (!enabled) return;
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || "sine"; o.frequency.value = f;
        const t = ctx.currentTime + (when || 0);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
      } catch (e) { /* no audio */ }
    }
    return {
      set enabled(v) { enabled = v; },
      step() { tone(520, 0.05, "triangle", 0.04); }, bad() { tone(160, 0.15, "square", 0.04); }, win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, i * 0.08)); },
      lose() { tone(220, 0.25, "sawtooth", 0.05); }, click() { tone(900, 0.03, "square", 0.03); },
    };
  })();

  // ------------------------------------------------------------ state
  const ACHIEVEMENTS = [
    { id: "first", emoji: "🎯", title: "Quest complete", desc: "Finish any quest." },
    { id: "perfect", emoji: "⭐", title: "Optimal", desc: "Finish a quest in the fewest possible steps, map hidden." },
    { id: "allquests", emoji: "🏡", title: "House-trained", desc: "Finish all four quests." },
    { id: "streak5", emoji: "🔥", title: "Knows the house", desc: "Five optimal episodes in a row." },
    { id: "junk", emoji: "🥴", title: "Eat TV", desc: "Try an invalid command. It happens." },
    { id: "trainer", emoji: "🧠", title: "Trainer", desc: "Train an agent above 0.5 test reward." },
  ];
  function freshState() { return { sound: true, reveal: false, episodes: 0, finished: 0, sumReturn: 0, perfect: 0, streak: 0, bestStreak: 0, questsDone: {}, achievements: {} }; }
  let S = load();
  function load() { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return Object.assign(freshState(), JSON.parse(r)); } catch (e) { /* ignore */ } return freshState(); }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------ shared: map + terminal
  function renderMap(el, opts) {
    // opts: { here (room idx or null), known: Set of room idx, target: room idx|null, path: [room idx] }
    el.innerHTML = "";
    const order = ["Garden", "Living", "Kitchen", "Bedroom"];
    for (const name of order) {
      const idx = H.ROOMS.indexOf(name);
      const known = opts.known && opts.known.has(idx);
      const d = document.createElement("div");
      d.className = `room ${name} ${known ? "known" : ""} ${opts.here === idx ? "here-room" : ""} ${opts.target === idx && known ? "target" : ""}`;
      d.innerHTML = `<span class="obj">${known ? OBJ_ICON[name] : "?"}</span><span>${known ? name : "unknown"}</span>${opts.here === idx ? '<span class="here">🧍</span>' : ""}`;
      el.appendChild(d);
    }
  }
  function termLine(el, cls, text) { const d = document.createElement("div"); d.className = cls; d.textContent = text; el.appendChild(d); el.scrollTop = el.scrollHeight; }
  const fmtR = (r) => (r > 0 ? "+" : "") + r.toFixed(2);

  // ------------------------------------------------------------ PLAY
  const game = new H.Game();
  const P = { obs: null, ret: 0, n: 0, known: new Set(), act: null, obj: null, junk: false, revealedThisEpisode: false };

  function newQuest() {
    P.obs = game.newGame(); P.ret = 0; P.n = 0; P.known = new Set(); P.act = null; P.obj = null; P.junk = false; P.revealedThisEpisode = S.reveal;
    const t = $("term"); t.innerHTML = "";
    termLine(t, "sys", "— New quest —");
    termLine(t, "desc", P.obs.roomDesc);
    $("banner").hidden = true;
    $("cmdInput").value = "";
    renderPlay();
  }
  function renderPlay() {
    $("quest").textContent = QUEST_ICON[game.quest] + " " + P.obs.questDesc;
    $("steps").textContent = `step ${P.n}/${H.MAX_STEPS} · return ${P.ret.toFixed(3)}`;
    const known = S.reveal ? new Set([0, 1, 2, 3]) : P.known;
    renderMap($("map"), { here: S.reveal || game.terminal ? game.room : null, known: game.terminal ? new Set([0, 1, 2, 3]) : known, target: game.terminal || S.reveal ? H.questRoom(game.quest) : null });
    $("actBtns").innerHTML = H.ACTIONS.map((a) => `<button data-a="${a}" class="${P.act === a ? "on" : ""}">${a}</button>`).join("");
    $("objBtns").innerHTML = H.OBJECTS.map((o) => `<button data-o="${o}" class="${P.obj === o ? "on" : ""} ${["north", "south", "east", "west"].includes(o) ? "dir" : ""}">${o}</button>`).join("");
    $("actBtns").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { P.act = b.dataset.a; Sound.click(); $("cmdInput").value = (P.act || "") + (P.obj ? " " + P.obj : ""); renderPlay(); if (P.act && P.obj) doCommand(P.act, P.obj); }));
    $("objBtns").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { P.obj = b.dataset.o; Sound.click(); $("cmdInput").value = (P.act || "") + " " + P.obj; renderPlay(); if (P.act && P.obj) doCommand(P.act, P.obj); }));
    const opt = H.optimalReturn(game.startRoom, game.quest, GAMMA);
    $("score").innerHTML = `<div><b>${P.ret.toFixed(3)}</b><span>return</span></div><div><b>${game.terminal ? opt.toFixed(3) : "?"}</b><span>optimal</span></div><div><b>${S.episodes ? (S.sumReturn / S.episodes).toFixed(3) : "—"}</b><span>your avg</span></div>`;
    renderStats();
  }
  function doCommand(actWord, objWord) {
    if (game.terminal) return;
    const a = H.ACTIONS.indexOf(actWord), o = H.OBJECTS.indexOf(objWord);
    if (a < 0 || o < 0) { toast(`Unknown command. Actions: ${H.ACTIONS.join(", ")}. Objects: ${H.OBJECTS.join(", ")}.`); Sound.bad(); return; }
    const t = $("term");
    termLine(t, "you", `> ${actWord} ${objWord}`);
    const res = game.step(a, o);
    P.ret += res.reward * Math.pow(GAMMA, P.n); P.n++;
    P.act = null; P.obj = null; $("cmdInput").value = "";
    if (!res.valid) { P.junk = true; unlock("junk"); termLine(t, "rw neg", `Nothing happens. (${fmtR(res.reward)})`); Sound.bad(); }
    else if (res.finished) { termLine(t, "win", `Quest complete! (${fmtR(res.reward)})`); }
    else { termLine(t, "rw mid", `(${fmtR(res.reward)})`); termLine(t, "desc", res.roomDesc); Sound.step(); }
    if (res.valid) P.known.add(H.roomOfDesc.get(res.roomDesc));
    P.obs = { roomDesc: res.roomDesc, questDesc: res.questDesc, terminal: res.terminal };
    if (res.terminal) finishEpisode(res.finished);
    renderPlay();
  }
  function finishEpisode(finished) {
    const opt = H.optimalReturn(game.startRoom, game.quest, GAMMA);
    const optimal = finished && Math.abs(P.ret - opt) < 1e-9;
    S.episodes++; S.sumReturn += P.ret;
    if (finished) { S.finished++; S.questsDone[game.quest] = true; unlock("first"); }
    if (optimal && !P.revealedThisEpisode) { S.perfect++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); unlock("perfect"); if (S.streak >= 5) unlock("streak5"); } else S.streak = 0;
    if (Object.keys(S.questsDone).length === 4) unlock("allquests");
    save();
    const b = $("banner"); b.hidden = false;
    b.innerHTML = finished
      ? `<div class="big win">${optimal ? "Optimal! " : ""}Quest done in ${P.n} step${P.n === 1 ? "" : "s"}</div><p>Return ${P.ret.toFixed(3)} · optimal from your start (${H.ROOMS[game.startRoom]}) was ${opt.toFixed(3)}${P.junk ? " · an invalid command cost you 0.1" : ""}</p><button class="btn btn-primary" id="btnAgain">Next quest</button>`
      : `<div class="big lose">Out of steps</div><p>You were in the ${H.ROOMS[game.startRoom]} and needed the ${H.ROOMS[H.questRoom(game.quest)]}. Return ${P.ret.toFixed(3)}.</p><button class="btn btn-primary" id="btnAgain">Try again</button>`;
    $("btnAgain").addEventListener("click", newQuest);
    if (finished) Sound.win(); else Sound.lose();
  }
  function renderStats() {
    const tile = (l, v, sub) => `<div class="tile"><div class="tile-label">${l}</div><div class="tile-value">${v}</div>${sub ? `<div class="tile-sub">${sub}</div>` : ""}</div>`;
    $("stats").innerHTML = tile("Episodes", S.episodes, S.finished + " finished") + tile("Avg return", S.episodes ? (S.sumReturn / S.episodes).toFixed(3) : "—", "optimal 0.554") + tile("Optimal runs", S.perfect, "streak " + S.streak + " · best " + S.bestStreak);
    $("achievements").innerHTML = ACHIEVEMENTS.map((a) => `<li class="${S.achievements[a.id] ? "done" : ""}"><span class="emoji">${a.emoji}</span><div>${a.title}<small>${a.desc}</small></div></li>`).join("");
  }
  function unlock(id) { if (S.achievements[id]) return; S.achievements[id] = Date.now(); save(); const a = ACHIEVEMENTS.find((x) => x.id === id); toast(`${a.emoji} Achievement — <b>${a.title}</b>: ${a.desc}`, 4500); }

  // ------------------------------------------------------------ TRAIN
  const agents = {};      // id -> { agent, curve: [], alpha, eps }
  const COLORS = { tabular: "#2f6fd6", linear: "#c96a0e", dqn: "#6b3fa0" };
  const chart = window.LineChart.create($("chart"), $("tip"), $("legend"), { yMin: -0.6, yMax: 1, yFormat: (v) => v.toFixed(2), xFormat: num, xLabel: "epochs", refLines: [{ y: H.optimalExpectedReturn(GAMMA), label: "optimal 0.554" }] });
  const T = { running: false, stop: false, speed: 0 };
  function getAgent(id, alpha, eps) {
    if (!agents[id] || agents[id].alpha !== alpha || agents[id].eps !== eps) agents[id] = { agent: H.makeAgent(id, { alpha, gamma: GAMMA }), curve: [], alpha, eps };
    return agents[id];
  }
  function trainOptions(eps) { return Object.assign({}, H.DEFAULTS, { gamma: GAMMA, trainEps: eps }); }
  async function train() {
    if (T.running) return;
    const id = $("agentSel").value, alpha = Number($("alphaSel").value), eps = Number($("epsSel").value), epochs = Number($("epochSel").value);
    const A = getAgent(id, alpha, eps);
    const g = new H.Game(); const o = trainOptions(eps);
    T.running = true; T.stop = false; $("btnTrain").disabled = true; $("btnPause").disabled = false;
    const start = A.curve.length, t0 = performance.now();
    for (let e = 0; e < epochs && !T.stop; e++) {
      A.curve.push(H.runEpoch(A.agent, g, o));
      if ((e + 1) % (id === "tabular" ? 5 : 2) === 0 || e === epochs - 1) { T.speed = ((A.curve.length - start) / (performance.now() - t0)) * 1000; renderTrain(); await sleep(0); }
    }
    T.running = false; $("btnTrain").disabled = false; $("btnPause").disabled = true;
    renderTrain();
    const last = A.curve.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, A.curve.length);
    if (last > 0.5) unlock("trainer");
    toast(`${A.agent.name}: ${A.curve.length} epochs, last-10 average reward ${last.toFixed(3)}.`);
  }
  function renderTrain() {
    const id = $("agentSel").value;
    const A = agents[id];
    const tile = (l, v, sub) => `<div class="tile"><div class="tile-label">${l}</div><div class="tile-value">${v}</div>${sub ? `<div class="tile-sub">${sub}</div>` : ""}</div>`;
    const ewma = (arr) => { if (!arr.length) return null; let w = 0, s = 0; for (let i = 0; i < arr.length; i++) { const k = Math.pow(0.9, arr.length - 1 - i); w += k; s += k * arr[i]; } return s / w; };
    $("trainStats").innerHTML = tile("Epochs", A ? num(A.curve.length) : 0) + tile("Last test reward", A && A.curve.length ? A.curve[A.curve.length - 1].toFixed(3) : "—") + tile("EWMA reward", A && A.curve.length ? ewma(A.curve).toFixed(3) : "—", "vs optimal 0.554") + tile("Best epoch", A && A.curve.length ? Math.max(...A.curve).toFixed(3) : "—") + tile("Parameters", A ? num(A.agent.size) : "—") + tile("Speed", T.speed ? T.speed.toFixed(1) + " epochs/s" : "—");
    chart.draw(Object.keys(agents).filter((k) => agents[k].curve.length).map((k) => ({ name: agents[k].agent.name + ` (α=${agents[k].alpha}, ε=${agents[k].eps})`, color: COLORS[k], points: agents[k].curve.map((v, i) => [i + 1, v]) })));
  }

  // ------------------------------------------------------------ WATCH
  const wGame = new H.Game();
  const W = { obs: null, ret: 0, n: 0, agent: null, auto: false, last: null };
  function watchAgent() {
    const id = $("wAgent").value;
    if (!agents[id] || agents[id].curve.length < 20) {
      // quick background training so there's always something to watch
      const alpha = id === "linear" ? 0.001 : 0.1;
      const A = getAgent(id, alpha, 0.5); const g = new H.Game(); const o = trainOptions(0.5);
      const need = (id === "tabular" ? 150 : id === "dqn" ? 120 : 200) - A.curve.length;
      for (let e = 0; e < need; e++) A.curve.push(H.runEpoch(A.agent, g, o));
      $("wNote").textContent = `The ${A.agent.name} had no training yet, so it was trained for ${A.curve.length} epochs just now (α=${alpha}). Train it differently in the Train tab.`;
      renderTrain();
    } else $("wNote").textContent = `Playing with the ${agents[id].agent.name} from the Train tab (${agents[id].curve.length} epochs, α=${agents[id].alpha}).`;
    return agents[id].agent;
  }
  function wNew() {
    W.agent = watchAgent(); W.obs = wGame.newGame(); W.ret = 0; W.n = 0; W.last = null;
    const t = $("wTerm"); t.innerHTML = ""; termLine(t, "sys", "— New episode —"); termLine(t, "desc", W.obs.roomDesc);
    renderWatch();
  }
  function wStep() {
    if (!W.obs || wGame.terminal) return false;
    const [a, o] = W.agent.act(W.obs, 0.05, Math.random);
    const t = $("wTerm");
    termLine(t, "you", `> ${H.ACTIONS[a]} ${H.OBJECTS[o]}`);
    const res = wGame.step(a, o);
    W.ret += res.reward * Math.pow(GAMMA, W.n); W.n++; W.last = [a, o];
    if (!res.valid) termLine(t, "rw neg", `Nothing happens. (${fmtR(res.reward)})`);
    else if (res.finished) termLine(t, "win", `Quest complete! (${fmtR(res.reward)})`);
    else { termLine(t, "rw mid", `(${fmtR(res.reward)})`); termLine(t, "desc", res.roomDesc); }
    if (res.terminal) termLine(t, "sys", res.finished ? `Return ${W.ret.toFixed(3)} · optimal ${H.optimalReturn(wGame.startRoom, wGame.quest, GAMMA).toFixed(3)}` : `Out of steps. Return ${W.ret.toFixed(3)}`);
    W.obs = { roomDesc: res.roomDesc, questDesc: res.questDesc, terminal: res.terminal };
    renderWatch();
    return !res.terminal;
  }
  async function wAuto() {
    if (W.auto) { W.auto = false; $("btnWAuto").textContent = "▶ Auto"; return; }
    W.auto = true; $("btnWAuto").textContent = "■ Stop";
    while (W.auto) {
      if (!W.obs || wGame.terminal) { wNew(); await sleep(900); }
      const more = wStep();
      await sleep(1100 - Number($("wSpeed").value) * 10);
      if (!more) await sleep(1400);
    }
  }
  function renderWatch() {
    if (!W.obs) return;
    $("wQuest").textContent = QUEST_ICON[wGame.quest] + " " + W.obs.questDesc;
    $("wSteps").textContent = `step ${W.n}/${H.MAX_STEPS} · return ${W.ret.toFixed(3)}`;
    renderMap($("wMap"), { here: wGame.room, known: new Set([0, 1, 2, 3]), target: H.questRoom(wGame.quest) });
    const m = W.agent.qMatrix(W.obs);
    let lo = Infinity, hi = -Infinity; m.forEach((r) => r.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); }));
    const [ba, bo] = W.agent.act(W.obs, 0, () => 1);
    let html = `<div class="h"></div>` + H.OBJECTS.map((o) => `<div class="h">${o}</div>`).join("");
    m.forEach((row, a) => { html += `<div class="r">${H.ACTIONS[a]}</div>` + row.map((v, o) => { const t = hi > lo ? (v - lo) / (hi - lo) : 0; return `<div class="c ${a === ba && o === bo ? "chosen" : ""}" style="background:rgba(194,65,12,${(0.08 + t * 0.7).toFixed(2)})">${v.toFixed(2)}</div>`; }).join(""); });
    $("qgrid").innerHTML = html;
    $("wScore").innerHTML = `<div><b>${W.ret.toFixed(3)}</b><span>return</span></div><div><b>${H.optimalReturn(wGame.startRoom, wGame.quest, GAMMA).toFixed(3)}</b><span>optimal</span></div><div><b>${H.ROOMS[wGame.room]}</b><span>hidden room</span></div>`;
  }

  // ------------------------------------------------------------ misc
  function toast(html, ms) { const t = document.createElement("div"); t.className = "toast"; t.innerHTML = html; $("toasts").appendChild(t); setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, ms || 3200); }
  function switchTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".tab-body").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    if (name === "train") renderTrain();
    if (name === "watch" && !W.obs) wNew();
    if (name !== "watch" && W.auto) { W.auto = false; $("btnWAuto").textContent = "▶ Auto"; }
  }

  document.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => b.blur()));
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => { switchTab(t.dataset.tab); Sound.click(); }));
  $("cmdForm").addEventListener("submit", (e) => { e.preventDefault(); const parts = $("cmdInput").value.trim().toLowerCase().split(/\s+/); if (parts.length !== 2) { toast("Commands are two words: an action and an object, e.g. <b>go north</b>."); return; } doCommand(parts[0], parts[1]); });
  $("btnNew").addEventListener("click", newQuest);
  $("btnRules").addEventListener("click", () => $("rulesDialog").showModal());
  $("chkReveal").addEventListener("change", (e) => { S.reveal = e.target.checked; save(); P.revealedThisEpisode = P.revealedThisEpisode || S.reveal; renderPlay(); });
  $("btnSound").addEventListener("click", () => { S.sound = !S.sound; save(); $("btnSound").setAttribute("aria-pressed", S.sound); $("btnSound").textContent = S.sound ? "🔊" : "🔇"; Sound.enabled = S.sound; });
  $("btnTrain").addEventListener("click", train);
  $("btnPause").addEventListener("click", () => { T.stop = true; });
  $("btnResetAgent").addEventListener("click", () => { delete agents[$("agentSel").value]; renderTrain(); });
  $("btnClearCurves").addEventListener("click", () => { Object.keys(agents).forEach((k) => delete agents[k]); renderTrain(); });
  ["agentSel", "alphaSel", "epsSel"].forEach((id) => $(id).addEventListener("change", () => { if (id === "agentSel") $("alphaSel").value = $("agentSel").value === "linear" ? "0.001" : "0.1"; renderTrain(); }));
  $("btnWNew").addEventListener("click", wNew);
  $("btnWStep").addEventListener("click", () => { if (!W.obs || wGame.terminal) wNew(); else wStep(); });
  $("btnWAuto").addEventListener("click", wAuto);
  $("wAgent").addEventListener("change", wNew);
  document.addEventListener("keydown", (e) => { if (e.target.matches("input, select, textarea") || $("rulesDialog").open) return; if (e.key.toLowerCase() === "n") newQuest(); });

  // boot
  $("chkReveal").checked = S.reveal; Sound.enabled = S.sound; $("btnSound").setAttribute("aria-pressed", S.sound); $("btnSound").textContent = S.sound ? "🔊" : "🔇";
  newQuest();
  if (!S.episodes) setTimeout(() => toast("You only get a description of the room. Move with <b>go north/south/east/west</b>, finish with e.g. <b>eat apple</b>. Press Rules for the reward table.", 7000), 600);
  window.__hw = { P, W, T, agents, game, doCommand, newQuest, train, wNew, wStep };
})();

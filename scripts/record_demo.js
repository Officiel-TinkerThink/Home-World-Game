const { chromium } = require('playwright');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: 'assets/raw-video', size: { width: 1280, height: 800 } } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div'); c.style.cssText = 'position:fixed;z-index:9999;width:22px;height:22px;border-radius:50%;background:rgba(194,65,12,.4);border:2px solid #fff;pointer-events:none;transform:translate(-50%,-50%);transition:transform .08s;left:-100px;top:-100px;box-shadow:0 2px 8px rgba(0,0,0,.4)';
    document.body.appendChild(c); document.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; });
    document.addEventListener('mousedown', () => { c.style.transform = 'translate(-50%,-50%) scale(.7)'; }); document.addEventListener('mouseup', () => { c.style.transform = 'translate(-50%,-50%) scale(1)'; }); }); });
  await page.goto('http://127.0.0.1:8000/index.html'); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(1500);
  async function glideClick(sel, pause = 400) { const b = await page.locator(sel).first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 }); await sleep(pause); await page.mouse.down(); await sleep(60); await page.mouse.up(); }
  // play one quest with buttons, taking the optimal route
  for (let i = 0; i < 4; i++) {
    const st = await page.evaluate(() => { const g = window.__hw.game; const H = window.HW; if (g.terminal) return null; const target = H.questRoom(g.quest); if (g.room === target) return [H.QUEST_ACTIONS[g.quest], H.QUEST_OBJECTS[g.quest]]; for (const [a, o, n] of H.VALID[H.ROOMS[g.room]]) if (a === 'go' && H.stepsToFinish(H.ROOMS.indexOf(n), g.quest) < H.stepsToFinish(g.room, g.quest)) return [a, o]; return ['go','north']; });
    if (!st) break;
    await glideClick(`#actBtns button[data-a="${st[0]}"]`, 500); await sleep(300);
    await glideClick(`#objBtns button[data-o="${st[1]}"]`, 500); await sleep(1200);
  }
  await sleep(1200);
  await glideClick('#chkReveal', 400); await sleep(1200);
  // train tabular then dqn
  await glideClick('.tab[data-tab="train"]', 400); await sleep(600);
  await page.selectOption('#epochSel', '100');
  await glideClick('#btnTrain', 400); await sleep(3500);
  await page.selectOption('#agentSel', 'dqn'); await sleep(300);
  await glideClick('#btnTrain', 400); await sleep(7000);
  await page.selectOption('#agentSel', 'linear'); await sleep(300);
  await page.selectOption('#epochSel', '100');
  await glideClick('#btnTrain', 400); await sleep(5000);
  const chart = await page.locator('#chart').boundingBox();
  await page.mouse.move(chart.x + 100, chart.y + 100, { steps: 5 }); await page.mouse.move(chart.x + chart.width - 120, chart.y + 100, { steps: 50 }); await sleep(1200);
  // watch the DQN play
  await glideClick('.tab[data-tab="watch"]', 400); await sleep(500);
  await page.selectOption('#wAgent', 'dqn'); await sleep(600);
  await page.$eval('#wSpeed', el => { el.value = 40; });
  await glideClick('#btnWAuto', 400); await sleep(9000);
  await glideClick('#btnWAuto', 300); await sleep(800);
  await ctx.close(); await browser.close(); console.log('recorded');
})();

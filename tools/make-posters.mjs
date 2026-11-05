// Captures a still of every live view (3D scenes, canvas animations) into media/posters/, shown while the real thing loads.
// Needs Chrome and the built site being served: node tools/build.mjs; node tools/serve.mjs; node tools/make-posters.mjs [only-this-name]
import { spawn } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', SITE = 'http://localhost:8740/', PORT = 9334;
const OUT = fileURLToPath(new URL('../media/posters/', import.meta.url)), ONLY = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// where in a view to take the still (0..1 through the view); the rest use the middle
const AT = { 'platform-assemble': 0.8, 'airbrakes-mechanism': 0.2 };

const dir = mkdtempSync(join(tmpdir(), 'posters-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--no-first-run', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let targets; for (let i = 0; i < 60 && !targets; i++) { await sleep(250); targets = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json()).catch(() => null); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(d.error.message)) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const run = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// only the media is shown: everything else on the page is hidden, and the stills themselves are off
const HIDE = `{ const s = document.createElement('style'); s.textContent = 'body{visibility:hidden!important} .layer.on,.thumb.shot{visibility:visible!important} .ph{display:none!important} *{transition:none!important}'; document.head.append(s); }`;
const shot = async (name, rect) => {
  const { data } = await send('Page.captureScreenshot', { format: 'webp', quality: 72, clip: { ...rect, scale: 1 }, captureBeyondViewport: false });
  writeFileSync(join(OUT, `${name}.webp`), Buffer.from(data, 'base64'));
  console.log(name, Math.round(data.length * 0.75 / 1024) + ' KB');
};
mkdirSync(OUT, { recursive: true });
const done = new Set();

for (const hash of ['', '#professional']) {
  await send('Page.navigate', { url: SITE + hash }); await sleep(hash ? 4000 : 2000);
  await run(HIDE);
  await run(`import('/chapters.js').then((m) => { window.__m = m; scrollTo(0, innerHeight); })`);
  await sleep(500);
  const views = await run(`__m.chapterState.flatMap((st, si) => st.sec.offsetHeight ? st.ch.views.map((v, vi) => ({ si, vi, name: st.ch.id + '-' + v.id, live: !!v.el })).filter((x) => x.live) : [])`);
  for (const v of views) {
    if (done.has(v.name) || (ONLY && !v.name.includes(ONLY))) continue; done.add(v.name);
    const at = AT[v.name] ?? 0.5;
    const rect = await run(`(async () => { const st = __m.chapterState[${v.si}], i = ${v.vi}, end = st.starts[i + 1] ?? 1, p = st.starts[i] + (end - st.starts[i]) * ${at};
      scrollTo({ top: st.sec.getBoundingClientRect().top + scrollY + p * st.total * innerHeight, behavior: 'instant' });
      for (let k = 0; k < 150 && !st.ready[i]; k++) await new Promise((r) => setTimeout(r, 100));
      await new Promise((r) => setTimeout(r, 2500));
      const b = st.sec.querySelector('.layers').getBoundingClientRect(); return { x: Math.max(0, b.x) + scrollX, y: Math.max(0, b.y) + scrollY, width: Math.min(b.width, innerWidth), height: Math.min(b.height, innerHeight - Math.max(0, b.y)) }; })()`);
    await shot(v.name, rect);
  }
}
// grid cards with a live element
await send('Page.navigate', { url: SITE }); await sleep(2000); await run(HIDE);
const cards = await run(`import('/data.js').then((d) => d.cards.filter((c) => c.media?.el).map((c) => c.id))`);
for (const c of cards) {
  if (ONLY && !`card-${c}`.includes(ONLY)) continue;
  const rect = await run(`(async () => { const t = document.querySelector('#grid .card[data-open="${c}"] .thumb'); t.classList.add('shot'); t.scrollIntoView({ block: 'center', behavior: 'instant' });
    for (let k = 0; k < 100 && !t.querySelector(':scope > :not(.ph)'); k++) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 3000)); const b = t.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; })()`);
  await shot(`card-${c}`, rect);
  await run(`document.querySelector('#grid .card[data-open="${c}"] .thumb').classList.remove('shot')`);
}
await send('Browser.close').catch(() => {}); proc.kill(); await sleep(500); try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(0);

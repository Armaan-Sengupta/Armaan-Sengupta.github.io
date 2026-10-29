/* <as-flight-control> — the Borealis airbrake control loop as a timeline (2D canvas).
 *
 * Content follows the 2024 Launch Canada podium presentation (slides 39-44):
 *   sense    VN-300 raw IMU (serial) + altimeter (CAN)
 *   estimate Madgwick filter (orientation)
 *   predict  4th-order Runge-Kutta to apogee, drag from a polynomial fit of the Ansys data, AoA = 0
 *   control  PI loop on (target apogee − predicted apogee)   [slide 43: "PI~~D~~", D struck out]
 *   actuate  extension command over CAN → one servo turns the cam, three panels move together
 *   lockouts no actuation during boost; recovery detected by timer or low velocity (slide 44)
 * The plotted signals are illustrative of one control cycle, not flight telemetry.
 *
 * Attributes / properties
 *   progress 0..1   scrub the cycle (overrides autoplay once set)
 *   autoplay, loop  run the ~14 s cycle continuously
 *   controls        show a play/scrub bar (off by default); clean is accepted and ignored
 * Methods: play(), pause(), seek(seconds), renderAt(seconds). Events: 'ready'.
 */
import * as G from './geometry.js';

export const FLOW_DURATION = 14;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const INK = '#f2efe9', MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', SANS = '"Inter Tight", Inter, system-ui, sans-serif';
const C = { alu: '#c4c8cd', aluDark: '#7d838a', brass: '#a58c55', pcb: '#4f6b4a', warn: '#a8564b' };
const STAGES = [
  { name: 'SENSE', sub: ['VN-300 raw IMU', 'altimeter · CAN'] },
  { name: 'ESTIMATE', sub: ['Madgwick filter', 'orientation'] },
  { name: 'PREDICT', sub: ['RK4 to apogee', 'CFD drag fit'] },
  { name: 'CONTROL', sub: ['PI loop', 'target − predicted'] },
  { name: 'ACTUATE', sub: ['extension cmd · CAN', 'one servo, three panels'] },
  { name: 'FEEDBACK', sub: ['panel drag', 'changes the state'] }
];
const a = (c, al) => { c.globalAlpha = al; };
function txt(c, s, x, y, size, al = 1, align = 'left', fam = MONO, weight = 500) { c.font = `${weight} ${size}px ${fam}`; c.textAlign = align; c.fillStyle = INK; a(c, al); c.fillText(s, x, y); a(c, 1); }
function seg(c, x1, y1, x2, y2, al = 0.2, w = 1, col = INK) { c.strokeStyle = col; c.lineWidth = w; a(c, al); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); a(c, 1); }
function poly(c, pts, ox, oy, s, rot) { const cs = Math.cos(rot), sn = Math.sin(rot); pts.forEach((p, i) => { const x = p[0] * cs - p[1] * sn, y = p[0] * sn + p[1] * cs; i ? c.lineTo(ox + x * s, oy - y * s) : c.moveTo(ox + x * s, oy - y * s); }); c.closePath(); }

export class FlightControlRenderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.time = 0; this.resize(1280, 760); }
  resize(w, h) { this.w = Math.max(1, w); this.h = Math.max(1, h); this.dpr = Math.min(devicePixelRatio || 1, 2); this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr); this.renderAt(this.time); }
  renderAt(t) {
    this.time = clamp(t, 0, FLOW_DURATION); const c = this.ctx; if (!c) return;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.w, this.h);
    const narrow = this.w < 640;
    const DW = narrow ? 640 : 1280, DH = narrow ? 1000 : 720;
    const s = Math.min(this.w / DW, this.h / DH);
    c.translate((this.w - DW * s) / 2, (this.h - DH * s) / 2); c.scale(s, s);
    c.lineCap = 'round'; c.lineJoin = 'round';
    narrow ? this.drawNarrow(c, this.time) : this.drawWide(c, this.time);
  }
  phase(t) { return Math.min(5, Math.floor(Math.max(0, t - 1) / 2)); }
  extension(t) { return ease((t - 9.2) / 1.6) * 0.62; }
  /* ------------- pieces ------------- */
  timeline(c, t, x0, x1, y, compact) {
    const ph = this.phase(t), n = STAGES.length, xs = STAGES.map((_, i) => x0 + (x1 - x0) * i / (n - 1));
    const prog = clamp((t - 1) / 12);
    seg(c, x0, y, x1, y, 0.14);
    seg(c, x0, y, x0 + (x1 - x0) * prog, y, 0.6);
    xs.forEach((x, i) => {
      const on = i === ph, done = i < ph || prog >= 1;
      c.beginPath(); c.arc(x, y, on ? 7 : 5, 0, Math.PI * 2);
      c.fillStyle = on ? INK : '#08080a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; a(c, on ? 1 : done ? 0.7 : 0.35); c.stroke(); a(c, 1);
      txt(c, STAGES[i].name, x, y - 22, compact ? 11 : 12, on ? 1 : 0.55, 'center');
      txt(c, STAGES[i].sub[0], x, y + 30, compact ? 11 : 12, on ? 0.95 : 0.5, 'center', MONO, 400);
      txt(c, STAGES[i].sub[1], x, y + 47, compact ? 10 : 11, on ? 0.6 : 0.3, 'center', MONO, 400);
    });
    // feedback return path
    const yb = y + 66; c.setLineDash([2, 4]); seg(c, xs[n - 1], y + 56, xs[n - 1], yb, 0.22); seg(c, xs[n - 1], yb, xs[0], yb, 0.22); seg(c, xs[0], yb, xs[0], y + 56, 0.22); c.setLineDash([]);
    if (prog > 0 && prog < 1) { const px = x0 + (x1 - x0) * prog; c.beginPath(); c.arc(px, y, 2.5, 0, 7); c.fillStyle = INK; c.fill(); }
  }
  plot(c, t, L, T, R, B) {
    seg(c, L, B, R, B, 0.3); seg(c, L, B, L, T, 0.3);
    for (let j = 1; j < 4; j++) seg(c, L, B - (B - T) * j / 4, R, B - (B - T) * j / 4, 0.05);
    txt(c, 'ALTITUDE', L, T - 12, 10, 0.4); txt(c, 'TIME →', R, B + 20, 10, 0.4, 'right');
    const target = T + (B - T) * 0.2;
    c.setLineDash([4, 6]); seg(c, L, target, R, target, 0.45); c.setLineDash([]);
    txt(c, 'TARGET APOGEE', L + 10, target - 9, 10, 0.6);
    // ascent curve: sensed portion (solid) up to "now", predicted remainder (thin)
    const now = 0.34, curve = (apex, u) => B - (B - apex) * (1 - (1 - u) * (1 - u));
    const xAt = u => L + 20 + (R - L - 40) * u;
    c.strokeStyle = INK; c.lineWidth = 2; a(c, 0.85); c.beginPath();
    for (let j = 0; j <= 40; j++) { const u = now * j / 40; const y = curve(T + 8, u); j ? c.lineTo(xAt(u), y) : c.moveTo(xAt(u), y); } c.stroke(); a(c, 1);
    const corr = ease((t - 10.2) / 2.4), first = T + 8, apex = first + (target - first) * corr, vis = ease((t - 5) / 1);
    if (vis > 0) {
      c.lineWidth = 1.4; c.strokeStyle = INK; a(c, 0.75 * vis); c.setLineDash([1, 5]); c.beginPath();
      for (let j = 0; j <= 80; j++) { const u = now + (1 - now) * j / 80; const y = j === 0 ? curve(first, u) : curve(apex, u) + (curve(first, now) - curve(apex, now)) * Math.max(0, 1 - j / 18); j ? c.lineTo(xAt(u), y) : c.moveTo(xAt(u), y); }
      c.stroke(); c.setLineDash([]); a(c, 1);
      c.beginPath(); c.arc(xAt(1), apex, 3.5, 0, 7); c.fillStyle = INK; a(c, vis); c.fill(); a(c, 1);
      txt(c, corr > 0.95 ? 'PREDICTED = TARGET' : 'PREDICTED APOGEE', xAt(1) - 10, apex - 10, 10, 0.75 * vis, 'right');
    }
    const ex = xAt(now), ey = curve(T + 8, now);
    c.beginPath(); c.arc(ex, ey, 4, 0, 7); c.fillStyle = INK; c.fill();
    txt(c, 'NOW · SENSED STATE', ex + 10, ey + 16, 10, 0.55);
    if (t >= 7 && t < 12.6) { const x = xAt(1) + 14, al = Math.min(ease((t - 7) / 0.5), 1 - ease((t - 12.1) / 0.5)) * 0.8; seg(c, x, apex, x, target, al, 1); seg(c, x - 4, apex, x + 4, apex, al); seg(c, x - 4, target, x + 4, target, al); txt(c, 'ERROR e', x + 8, (apex + target) / 2 + 4, 10, al); }
  }
  camView(c, t, cx, cy, s) {
    const k = G.kinematics(this.extension(t));
    c.save();
    // airframe
    c.beginPath(); c.arc(cx, cy, G.AIRFRAME_R * s, 0, 7); c.strokeStyle = INK; c.lineWidth = 1; a(c, 0.18); c.stroke(); a(c, 1);
    for (const al of G.ALPHA) { c.beginPath(); poly(c, G.panelPolygon(32).map(p => [p[0] + k.travel, p[1]]), cx, cy, s, al); c.fillStyle = C.aluDark; c.fill(); c.strokeStyle = C.alu; a(c, 0.5); c.stroke(); a(c, 1); }
    c.beginPath(); poly(c, G.camOutline(240), cx, cy, s, k.rot); for (let i = 0; i < 3; i++) poly(c, G.slotPolygon(i, 48), cx, cy, s, k.rot); poly(c, G.hexPolygon(), cx, cy, s, k.rot);
    c.fillStyle = C.alu; c.fill('evenodd'); c.strokeStyle = '#e4e6e9'; c.lineWidth = 0.8; c.stroke();
    for (const al of G.ALPHA) { const x = cx + Math.cos(al) * k.pinR * s, y = cy - Math.sin(al) * k.pinR * s; c.beginPath(); c.arc(x, y, 0.3 * s, 0, 7); c.fillStyle = C.brass; c.fill(); c.beginPath(); c.arc(x, y, 0.15 * s, 0, 7); c.fillStyle = '#26272a'; c.fill(); }
    c.restore();
    txt(c, `CAM ${(k.rot * 180 / Math.PI).toFixed(0).padStart(3, ' ')}°   TRAVEL ${(k.travel * 25.4).toFixed(1)} mm`, cx, cy + (G.AIRFRAME_R + 1.4) * s, 10, 0.55, 'center');
  }
  lockouts(c, t, x0, x1, y) {
    // flight phases from slide 44: boost locked out, coast actuated, recovery locked out
    const parts = [['BOOST', 0.22, 'LOCKED OUT'], ['COAST', 0.56, 'ACTUATION PERMITTED'], ['RECOVERY', 0.22, 'LOCKED OUT']];
    let x = x0; const W = x1 - x0;
    parts.forEach(([n, f, d], i) => {
      const w = W * f, on = i === 1;
      c.fillStyle = on ? INK : C.warn; a(c, on ? 0.1 : 0.14); c.fillRect(x + 1, y, w - 2, 22); a(c, 1);
      seg(c, x + 1, y, x + w - 1, y, on ? 0.5 : 0.25);
      txt(c, n, x + 8, y + 15, 10, on ? 0.85 : 0.5); txt(c, d, x + w - 8, y + 15, 9, on ? 0.6 : 0.4, 'right', MONO, 400);
      x += w;
    });
    const mx = x0 + W * (0.22 + 0.56 * clamp((t - 1) / 12)); seg(c, mx, y - 6, mx, y + 28, 0.8, 1);
  }
  drawWide(c, t) {
    this.timeline(c, t, 110, 1170, 70, false);
    this.plot(c, t, 70, 220, 760, 560);
    this.camView(c, t, 1010, 390, 40);
    this.lockouts(c, t, 70, 1210, 650);
  }
  drawNarrow(c, t) {
    // two-row timeline on phones
    const ph = this.phase(t);
    const rows = [[0, 1, 2], [3, 4, 5]];
    rows.forEach((r, ri) => {
      const y = 60 + ri * 130, xs = r.map((_, i) => 110 + i * 210);
      seg(c, xs[0], y, xs[2], y, 0.14);
      r.forEach((si, i) => {
        const on = si === ph, x = xs[i];
        c.beginPath(); c.arc(x, y, on ? 7 : 5, 0, 7); c.fillStyle = on ? INK : '#08080a'; c.fill(); c.strokeStyle = INK; a(c, on ? 1 : 0.4); c.stroke(); a(c, 1);
        txt(c, STAGES[si].name, x, y - 20, 13, on ? 1 : 0.55, 'center');
        txt(c, STAGES[si].sub[0], x, y + 30, 13, on ? 0.95 : 0.5, 'center', MONO, 400);
        txt(c, STAGES[si].sub[1], x, y + 48, 11, on ? 0.6 : 0.3, 'center', MONO, 400);
      });
    });
    this.plot(c, t, 50, 330, 600, 590);
    this.camView(c, t, 320, 790, 34);
    // lockout strip omitted on phones for legibility
  }
}

class ASFlightControl extends HTMLElement {
  static get observedAttributes() { return ['progress']; }
  constructor() { super(); this.duration = FLOW_DURATION; this.time = 0; this._progress = null; this._visible = true; }
  get progress() { return this._progress ?? 0; }
  set progress(v) { const n = Number(v); if (!Number.isFinite(n)) return; this._progress = clamp(n); this.seek(this._progress * this.duration, true); }
  attributeChangedCallback(n, o, v) { if (n === 'progress' && v !== null) this.progress = v; }
  connectedCallback() {
    if (this._connected) return; this._connected = true;
    this._reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this._playing = this.hasAttribute('autoplay') && !this._reduced.matches;
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>:host{display:block;width:100%;height:100%;position:relative;min-height:220px}
      canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
      .controls{position:absolute;left:16px;right:16px;bottom:10px;display:none;gap:12px;align-items:center;font:10px "JetBrains Mono",monospace;color:#f2efe9}
      :host([controls]:not([controls=false])) .controls{display:flex}
      .controls button{font:inherit;color:inherit;background:transparent;border:1px solid rgba(255,255,255,.16);padding:6px 10px;cursor:pointer}.controls input{flex:1;accent-color:#f2efe9}</style>
      <canvas role="img" aria-label="Airbrake control loop: sense with the VN-300 IMU and altimeter, estimate orientation with a Madgwick filter, predict apogee with RK4, PI control on the apogee error, actuate the panels, and feed the new drag back. Actuation is locked out during boost and recovery."></canvas>
      <div class="controls"><button type="button">PLAY</button><input type="range" min="0" max="${FLOW_DURATION}" step="0.01" value="0" aria-label="Control cycle"></div>`;
    this.canvas = root.querySelector('canvas'); this.view = new FlightControlRenderer(this.canvas);
    this._button = root.querySelector('button'); this._slider = root.querySelector('input');
    this._button.addEventListener('click', () => this._playing ? this.pause() : this.play());
    this._slider.addEventListener('input', () => { this.pause(); this._progress = null; this.seek(+this._slider.value); });
    this._ro = new ResizeObserver(es => { const r = es[0].contentRect; this.view.resize(r.width, r.height); }); this._ro.observe(this);
    this._io = new IntersectionObserver(es => { this._visible = es[es.length - 1].isIntersecting; this._kick(); }, { rootMargin: '64px' }); this._io.observe(this);
    this._onVis = () => this._kick(); document.addEventListener('visibilitychange', this._onVis);
    if (this.hasAttribute('progress')) this.progress = this.getAttribute('progress');
    else this.seek(this._reduced.matches ? 11.5 : 0); // reduced motion: a representative still frame
    this._kick();
    this.dispatchEvent(new CustomEvent('ready', { bubbles: true }));
  }
  _kick() { if (!this._raf && this._connected && this._playing && this._visible && !document.hidden) { this._last = performance.now(); this._raf = requestAnimationFrame(n => this._tick(n)); } }
  _tick(now) {
    this._raf = 0; const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    if (!this._playing || !this._visible || document.hidden || this._progress !== null) return;
    this.time += dt; if (this.time > this.duration) { if (this.hasAttribute('loop')) this.time = 0; else { this.time = this.duration; this.pause(); } }
    this.seek(this.time, true); this._kick();
  }
  seek(t, keep) { this.time = clamp(+t || 0, 0, this.duration); this.view?.renderAt(this.time); if (this._slider) this._slider.value = String(this.time); return this.time; }
  renderAt(t) { return this.seek(t); }
  play() { if (this.time >= this.duration) this.time = 0; this._playing = true; this._progress = null; if (this._button) this._button.textContent = 'PAUSE'; this._kick(); }
  pause() { this._playing = false; if (this._button) this._button.textContent = 'PLAY'; }
  disconnectedCallback() { this._connected = false; cancelAnimationFrame(this._raf); this._raf = 0; this._ro?.disconnect(); this._io?.disconnect(); document.removeEventListener('visibilitychange', this._onVis); }
}
if (!customElements.get('as-flight-control')) customElements.define('as-flight-control', ASFlightControl);

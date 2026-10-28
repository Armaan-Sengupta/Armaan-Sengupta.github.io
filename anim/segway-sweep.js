// <as-segway-sweep>: passive-dynamics parameter study of a human transporter.
// Left: side-view run (wheel + leaning rider rod) that rolls until it tips.
// Right: wireframe response surface of distance travelled vs thrust F and
// initial lean β, with the global maximum marked. The run on the left is the
// (F, β) under the marker. Hover / drag over the surface to pick (F, β).
// The surface is an illustrative fit, not the original study data.

const MONO = '500 10px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
const GLOW = 'rgba(255,244,226,0.95)';

class AnimBase extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:block;position:relative;width:100%;height:100%;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}</style><canvas part="canvas"></canvas>';
    this.cv = root.querySelector('canvas');
    this.ctx = this.cv.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this._playing = true; this._inView = false; this._raf = 0; this._last = 0; this._bound = false;
    this._mq = matchMedia('(prefers-reduced-motion: reduce)');
    this._tick = this._tick.bind(this); this._sync = this._sync.bind(this);
  }
  get reduced() { return this._mq.matches; }
  connectedCallback() {
    this.cv.style.touchAction = this.constructor.touch || 'none';
    this._ro = new ResizeObserver((e) => { const r = e[0].contentRect; this._resize(r.width, r.height); });
    this._ro.observe(this);
    this._io = new IntersectionObserver((e) => { this._inView = e[e.length - 1].isIntersecting; this._sync(); }, { rootMargin: '48px' });
    this._io.observe(this);
    document.addEventListener('visibilitychange', this._sync);
    this._mq.addEventListener?.('change', this._sync);
    if (!this._bound) { this._bound = true; this._bindPointer(); }
  }
  disconnectedCallback() {
    this._ro?.disconnect(); this._io?.disconnect();
    document.removeEventListener('visibilitychange', this._sync);
    this._mq.removeEventListener?.('change', this._sync);
    cancelAnimationFrame(this._raf); this._raf = 0;
  }
  play() { this._playing = true; this._sync(); }
  pause() { this._playing = false; this._sync(); }
  _sync() {
    if (this.reduced && !this._static) { this._static = true; this.toStatic?.(); this.invalidate(); }
    if (!this.reduced) this._static = false;
    const run = this._playing && this._inView && !document.hidden && !this.reduced;
    if (run && !this._raf) { this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); }
    else if (!run && this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
  }
  _tick(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this._last) / 1000)); this._last = now;
    this.step(dt); this.render();
    this._raf = requestAnimationFrame(this._tick);
  }
  _resize(w, h) {
    this.w = Math.max(1, w); this.h = Math.max(1, h);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
    this.layout?.(); this.render();
  }
  invalidate() { if (!this._raf) this.render(); }
  render() {
    if (!this.w || !this.h) return;
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    c.font = MONO; c.letterSpacing = '0.8px'; c.textBaseline = 'alphabetic';
    c.lineCap = 'butt'; c.lineJoin = 'round'; c.shadowBlur = 0;
    this.draw(c);
  }
  _bindPointer() {
    const pos = (e) => { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    this.cv.addEventListener('pointerdown', (e) => { const [x, y] = pos(e); this.onDown?.(x, y, e); });
    this.cv.addEventListener('pointermove', (e) => { const [x, y] = pos(e); this.onMove?.(x, y, e); });
    this.cv.addEventListener('pointerup', (e) => { const [x, y] = pos(e); this.onUp?.(x, y, e); });
    this.cv.addEventListener('pointercancel', (e) => this.onLeave?.(e));
    this.cv.addEventListener('pointerleave', (e) => this.onLeave?.(e));
  }
}

function label(c, s, x, y, a = 0.5, align = 'left') { c.globalAlpha = a; c.textAlign = align; c.fillStyle = '#fff'; c.fillText(s, x, y); c.globalAlpha = 1; }
function ih(n) { n |= 0; n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n ^= n >>> 16; return (n >>> 0) / 4294967296; }


// ---------------------------------------------------------------------------
const F0 = 100, F1 = 200, B0 = 0.2, B1 = 0.8;
const NF = 21, NB = 17;
const RUN = 3.1;
const TRACK = 14;

function distance(F, b) {
  const a = (F - 170) / 30, c = (b - 0.47) / 0.15;
  const peak = 10.6 * Math.exp(-0.5 * (a * a + c * c));
  const ridge = 1.7 * Math.exp(-0.5 * (((F - 122) / 16) ** 2 + ((b - 0.69) / 0.09) ** 2));
  return 1.2 + peak + ridge + 0.9 * (F - F0) / 100 * (1 - Math.abs(b - 0.5) * 1.6);
}
const MAX = (() => {
  let best = { d: -1, F: 0, b: 0 };
  for (let i = 0; i <= 200; i++) for (let j = 0; j <= 120; j++) {
    const F = F0 + (i / 200) * (F1 - F0), b = B0 + (j / 120) * (B1 - B0), d = distance(F, b);
    if (d > best.d) best = { d, F, b };
  }
  return best;
})();
const SWEEP = (() => {
  const Fs = [110, 130, 150, 170, 190], Bs = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75], out = [];
  Bs.forEach((b, j) => (j % 2 ? [...Fs].reverse() : Fs).forEach((F) => out.push([F, b])));
  return out;
})();

class AsSegwaySweep extends AnimBase {
  static touch = 'pan-y';
  constructor() {
    super();
    this.H = new Float32Array(NF * NB);
    for (let i = 0; i < NF; i++) for (let j = 0; j < NB; j++) this.H[i * NB + j] = distance(F0 + (i / (NF - 1)) * (F1 - F0), B0 + (j / (NB - 1)) * (B1 - B0));
    this.px = new Float32Array(NF * NB); this.py = new Float32Array(NF * NB);
    this.clock = 0;
    this.idx = 0; this.runT = 0.9;
    this.from = [...SWEEP[SWEEP.length - 1]];
    this.par = [...SWEEP[0]]; this.cur = [...SWEEP[0]];
    this.runD = distance(...this.par);
    this.prevD = -1;
    this.trail = []; this.trailFade = 1;
    this.manual = false; this.leaveAt = -1;
    this.view = null;
  }
  toStatic() {
    this.manual = false; this.par = [MAX.F, MAX.b]; this.cur = [...this.par]; this.from = [...this.par];
    this.runD = MAX.d; this.runT = 2.6; this.clock = 0;
    this.trail = SWEEP.slice(0, 16).map(([F, b]) => [F, b]);
  }
  layout() {}
  regions() {
    const W = this.w, H = this.h;
    if (W >= 560) { const lw = Math.round(W * 0.42); return { L: { x: 0, y: 0, w: lw, h: H }, R: { x: lw, y: 0, w: W - lw, h: H }, stacked: false }; }
    const th = Math.round(H * 0.45);
    return { L: { x: 0, y: 0, w: W, h: th }, R: { x: 0, y: th, w: W, h: H - th }, stacked: true };
  }
  step(dt) {
    this.clock += dt;
    this.runT += dt;
    if (this.manual) {
      this.runD += (distance(...this.par) - this.runD) * (1 - Math.exp(-dt * 8));
      if (this.runT >= RUN) { this.prevD = this.runD; this.runT = 0.35; }
    } else {
      if (this.leaveAt >= 0) { this.leaveAt += dt; }
      if (this.runT >= RUN) {
        this.prevD = this.runD;
        this.trail.push([...this.par]);
        this.from = [...this.cur];
        this.idx = (this.idx + 1) % SWEEP.length;
        if (this.idx === 0) this.trailFade = 0.999;
        this.par = [...SWEEP[this.idx]];
        this.runD = distance(...this.par);
        this.runT = 0;
      }
      const k = ease(this.runT / 0.4);
      this.cur[0] = this.from[0] + (this.par[0] - this.from[0]) * k;
      this.cur[1] = this.from[1] + (this.par[1] - this.from[1]) * k;
    }
    if (this.trailFade < 1) { this.trailFade -= dt / 1.6; if (this.trailFade <= 0) { this.trail.length = 0; this.trailFade = 1; } }
  }

  // ----- surface projection
  makeView(R) {
    const yaw = -0.62 + (this.reduced ? 0 : 0.09 * Math.sin(this.clock * 0.25)), pitch = 0.5;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const raw = (u, v, h) => { const xr = u * cy - v * sy, zr = u * sy + v * cy; return [xr, -(h * cp + zr * sp), zr * cp - h * sp]; };
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const u of [-1, 1]) for (const v of [-1, 1]) for (const h of [0, 1.05]) { const p = raw(u, v, h); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const sm = R.h < 200 || R.w < 360, padX = sm ? 30 : 46, padT = sm ? 30 : 40, padB = sm ? 22 : 40;
    const S = Math.min((R.w - padX * 2) / (x1 - x0), (R.h - padT - padB) / (y1 - y0));
    const ox = R.x + R.w / 2 - ((x0 + x1) / 2) * S, oy = R.y + padT + (R.h - padT - padB) / 2 - ((y0 + y1) / 2) * S;
    const P = (F, b, d) => { const p = raw(((F - F0) / (F1 - F0)) * 2 - 1, ((b - B0) / (B1 - B0)) * 2 - 1, (d / MAX.d) * 0.95); const f = 9 / (9 + p[2]); return [ox + p[0] * S * f, oy + p[1] * S * f]; };
    return { P, S };
  }
  pick(x, y) {
    const { R } = this.regions(); if (!this.view) return null;
    if (x < R.x || x > R.x + R.w || y < R.y || y > R.y + R.h) return null;
    let best = 1e9, bF = 0, bb = 0;
    for (let i = 0; i <= 40; i++) for (let j = 0; j <= 32; j++) {
      const F = F0 + (i / 40) * (F1 - F0), b = B0 + (j / 32) * (B1 - B0), p = this.view.P(F, b, distance(F, b));
      const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < best) { best = d; bF = F; bb = b; }
    }
    return best < 40 * 40 ? [bF, bb] : null;
  }
  onMove(x, y, e) {
    const p = this.pick(x, y);
    if (!p) return;
    if (!this.manual) { this.manual = true; this.runT = 0.35; this.prevD = -1; this.runD = distance(...p); }
    this.par = p; this.cur = [...p]; this.leaveAt = -1;
    if (this.reduced) { this.runD = distance(...p); this.runT = 2.6; }
    this.cv.style.cursor = 'crosshair';
    this.invalidate();
  }
  onDown(x, y, e) { this.onMove(x, y, e); }
  onUp(x, y, e) { if (e.pointerType === 'touch') this._resume(); }
  onLeave() { this._resume(); this.cv.style.cursor = ''; }
  _resume() {
    if (!this.manual) return;
    this.manual = false; this.from = [...this.cur]; this.runT = 0; this.prevD = -1;
    // continue the sweep from the nearest sweep point
    let best = 1e9;
    SWEEP.forEach(([F, b], i) => { const d = ((F - this.cur[0]) / 100) ** 2 + (b - this.cur[1]) ** 2; if (d < best) { best = d; this.idx = i; } });
    this.par = [...SWEEP[this.idx]]; this.runD = distance(...this.par);
    if (this.reduced) { this.cur = [...this.par]; this.runT = 2.6; }
    this.invalidate();
  }

  draw(c) {
    const { L, R, stacked } = this.regions();
    // divider
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.globalAlpha = 0.08; c.beginPath();
    if (stacked) { c.moveTo(12, Math.round(R.y) + 0.5); c.lineTo(this.w - 12, Math.round(R.y) + 0.5); }
    else { c.moveTo(Math.round(R.x) + 0.5, 14); c.lineTo(Math.round(R.x) + 0.5, this.h - 14); }
    c.stroke(); c.globalAlpha = 1;
    this.drawSim(c, L, stacked);
    this.drawSurface(c, R, stacked);
  }

  drawSim(c, L, stacked) {
    c.save(); c.beginPath(); c.rect(L.x, L.y, L.w, L.h); c.clip();
    this._sim(c, L, stacked);
    c.restore();
  }
  _sim(c, L, stacked) {
    const m = 14, gy = Math.round(L.y + L.h - (stacked ? 22 : Math.max(34, L.h * 0.26))) + 0.5;
    const gx0 = L.x + m + 8, gx1 = L.x + L.w - m;
    const Lr = stacked ? clamp((gy - L.y - 30) / 1.12, 24, 120) : clamp(Math.min(L.h * 0.42, L.w * 0.4), 30, 190), r = Lr * 0.13;
    const ppm = Math.max(4, (gx1 - gx0 - Lr * 0.9) / TRACK);
    const t = this.runT;
    const p = clamp((t - 0.35) / 2.1), pe = ease(p);
    const fade = Math.min(ease(t / 0.3), 1 - ease((t - (RUN - 0.28)) / 0.28));
    const D = this.runD, beta = this.cur[1];
    const xm = D * pe;
    const theta = beta + (1.3 - beta) * Math.pow(p, 2.3);

    // ground + ticks
    c.strokeStyle = '#fff'; c.lineWidth = 1;
    c.globalAlpha = 0.4; c.beginPath(); c.moveTo(gx0 - 8, gy); c.lineTo(gx1, gy); c.stroke();
    c.globalAlpha = 0.18; c.beginPath();
    for (let i = 0; i <= TRACK; i++) { const x = Math.round(gx0 + i * ppm) + 0.5; c.moveTo(x, gy); c.lineTo(x, gy + (i % 5 ? 3 : 6)); }
    c.stroke();
    for (let i = 0; i <= TRACK; i += 5) label(c, i === 10 ? '10 m' : String(i), gx0 + i * ppm, gy + 16, 0.42, 'center');

    // previous run ghost
    if (this.prevD > 0) {
      const x = Math.round(gx0 + this.prevD * ppm) + 0.5;
      c.globalAlpha = 0.25; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(x, gy - 12); c.lineTo(x, gy); c.stroke(); c.setLineDash([]);
    }
    // travelled segment
    const xs = gx0 + xm * ppm;
    c.globalAlpha = 0.9 * fade; c.lineWidth = 2; c.beginPath(); c.moveTo(gx0, gy); c.lineTo(xs, gy); c.stroke(); c.lineWidth = 1;
    c.beginPath(); c.moveTo(Math.round(gx0) + 0.5, gy - 5); c.lineTo(Math.round(gx0) + 0.5, gy + 1); c.stroke();

    // rig
    const ax = xs, ay = gy - r - 0.5;
    const st = Math.sin(theta), ct = Math.cos(theta);
    c.save(); c.globalAlpha = fade; c.strokeStyle = '#fff';
    // vertical reference + lean arc
    c.globalAlpha = 0.22 * fade; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, ay - Lr * 0.95); c.stroke(); c.setLineDash([]);
    c.globalAlpha = 0.5 * fade; c.beginPath(); c.arc(ax, ay, Lr * 0.34, -Math.PI / 2, -Math.PI / 2 + theta); c.stroke();
    if (Lr > 40 && !stacked) label(c, 'θ ' + theta.toFixed(2), ax, ay - Lr * 0.95 - 7, 0.6 * fade, 'center');
    c.globalAlpha = fade;
    // wheel
    c.lineWidth = 1.25; c.beginPath(); c.arc(ax, ay, r, 0, 7); c.stroke();
    const rot = (xm * ppm) / r;
    c.lineWidth = 1; c.globalAlpha = 0.55 * fade; c.beginPath();
    for (let k = 0; k < 3; k++) { const a = rot + (k * Math.PI * 2) / 3; c.moveTo(ax, ay); c.lineTo(ax + Math.cos(a) * r, ay + Math.sin(a) * r); }
    c.stroke(); c.globalAlpha = fade;
    // platform
    c.lineWidth = 2; c.beginPath(); c.moveTo(ax - r * 1.35, ay); c.lineTo(ax + r * 1.35, ay); c.stroke();
    // stem + bar
    const sx = ax + st * Lr * 0.62, sy = ay - ct * Lr * 0.62;
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(ax + r * 0.3, ay); c.lineTo(sx, sy); c.stroke();
    c.beginPath(); c.moveTo(sx - ct * r * 0.6, sy - st * r * 0.6); c.lineTo(sx + ct * r * 0.6, sy + st * r * 0.6); c.stroke();
    // rider rod
    const bx = ax - r * 0.4, by = ay - 1;
    const hx = bx + st * Lr, hy = by - ct * Lr;
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(bx, by); c.lineTo(hx - st * Lr * 0.1, hy + ct * Lr * 0.1); c.stroke();
    c.lineWidth = 1.25; c.beginPath(); c.arc(hx, hy, Lr * 0.07, 0, 7); c.stroke();
    const shx = bx + st * Lr * 0.74, shy = by - ct * Lr * 0.74;
    c.beginPath(); c.moveTo(shx, shy); c.lineTo(sx, sy); c.stroke();
    c.restore();

    // readouts
    const tx = L.x + m, big = stacked ? 13 : clamp(L.w / 18, 16, 26);
    if (stacked) {
      label(c, 'DIST', tx, L.y + 18, 0.5);
      c.font = `500 ${big}px "JetBrains Mono", ui-monospace, monospace`; c.letterSpacing = '0px';
      label(c, xm.toFixed(1).padStart(4, '0') + ' m', tx + 38, L.y + 18.5, 0.95);
    } else {
      label(c, 'DIST', tx, L.y + 20, 0.5);
      c.font = `500 ${big}px "JetBrains Mono", ui-monospace, monospace`; c.letterSpacing = '0px';
      label(c, xm.toFixed(1).padStart(4, '0') + ' m', tx, L.y + 22 + big, 0.95);
    }
    c.font = MONO; c.letterSpacing = '0.8px';
    const ptxt = 'F ' + Math.round(this.cur[0]) + ' N   β ' + this.cur[1].toFixed(2) + ' rad';
    if (stacked) label(c, ptxt, L.x + L.w - m, L.y + 18, 0.6, 'right');
    else label(c, ptxt, tx, L.y + 40 + big, 0.6);
    const mode = this.manual ? 'MANUAL' : 'SWEEP ' + String(this.idx + 1).padStart(2, '0') + '/' + SWEEP.length;
    if (stacked) { if (L.h > 120) label(c, mode, L.x + L.w - m, L.y + 32, 0.35, 'right'); }
    else label(c, mode, L.x + L.w - m, L.y + 20, 0.35, 'right');
  }

  drawSurface(c, R) {
    const view = (this.view = this.makeView(R)), P = view.P, { H, px, py } = this;
    for (let i = 0; i < NF; i++) for (let j = 0; j < NB; j++) {
      const k = i * NB + j, q = P(F0 + (i / (NF - 1)) * (F1 - F0), B0 + (j / (NB - 1)) * (B1 - B0), H[k]); px[k] = q[0]; py[k] = q[1];
    }
    // base plane
    const corners = [[F0, B0], [F1, B0], [F1, B1], [F0, B1]].map(([F, b]) => P(F, b, 0));
    c.strokeStyle = '#fff'; c.lineWidth = 1;
    c.globalAlpha = 0.05; c.beginPath();
    for (let i = 0; i <= 10; i++) { const F = F0 + i * 10; let a = P(F, B0, 0), b = P(F, B1, 0); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
    for (let j = 0; j <= 6; j++) { const b0 = B0 + j * 0.1; let a = P(F0, b0, 0), b = P(F1, b0, 0); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
    c.stroke();
    c.globalAlpha = 0.3; c.beginPath(); corners.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.stroke();

    // mesh, bucketed by height for alpha
    const NBK = 6;
    for (let bk = 0; bk < NBK; bk++) {
      c.beginPath();
      for (let i = 0; i < NF; i++) for (let j = 0; j < NB; j++) {
        const k = i * NB + j;
        if (i + 1 < NF) { const k2 = k + NB; const hb = Math.min(NBK - 1, Math.floor(((H[k] + H[k2]) / 2 / MAX.d) * NBK)); if (hb === bk) { c.moveTo(px[k], py[k]); c.lineTo(px[k2], py[k2]); } }
        if (j + 1 < NB) { const k2 = k + 1; const hb = Math.min(NBK - 1, Math.floor(((H[k] + H[k2]) / 2 / MAX.d) * NBK)); if (hb === bk) { c.moveTo(px[k], py[k]); c.lineTo(px[k2], py[k2]); } }
      }
      c.globalAlpha = 0.12 + 0.55 * (bk / (NBK - 1)); c.stroke();
    }
    c.globalAlpha = 1;

    // axes
    const bF = P(150, B0, 0)[1] > P(150, B1, 0)[1] ? B0 : B1, bO = bF === B0 ? B1 : B0;
    const fB = P(F0, 0.5, 0)[1] > P(F1, 0.5, 0)[1] ? F0 : F1, fO = fB === F0 ? F1 : F0;
    const small = R.w < 360 || R.h < 200;
    const nF = (() => { const a = P(150, bF, 0), b = P(150, bO, 0), l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [(a[0] - b[0]) / l, (a[1] - b[1]) / l]; })();
    const nB = (() => { const a = P(fB, 0.5, 0), b = P(fO, 0.5, 0), l = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [(a[0] - b[0]) / l, (a[1] - b[1]) / l]; })();
    const at = (q, n, d, txt = '') => { d += Math.abs(n[0]) * c.measureText(txt).width / 2; return [q[0] + n[0] * d, q[1] + n[1] * d + 3.5]; };
    c.globalAlpha = 0.3; c.beginPath();
    for (const F of [100, 150, 200]) { const q = P(F, bF, 0); c.moveTo(q[0], q[1]); c.lineTo(q[0] + nF[0] * 4, q[1] + nF[1] * 4); }
    for (const b of [0.2, 0.5, 0.8]) { const q = P(fB, b, 0); c.moveTo(q[0], q[1]); c.lineTo(q[0] + nB[0] * 4, q[1] + nB[1] * 4); }
    c.stroke(); c.globalAlpha = 1;
    for (const F of [100, 150, 200]) { const q = at(P(F, bF, 0), nF, 9, String(F)); label(c, String(F), q[0], q[1], 0.45, 'center'); }
    if (!small) { const q = at(P(150, bF, 0), nF, 24, 'THRUST F · N'); label(c, 'THRUST F · N', q[0], q[1], 0.32, 'center'); }
    for (const b of [0.2, 0.5, 0.8]) { const q = at(P(fB, b, 0), nB, 9, '0.0'); label(c, b.toFixed(1), q[0], q[1], 0.45, 'center'); }
    if (!small) { const q = at(P(fB, 0.5, 0), nB, 24, 'LEAN β · rad'); label(c, 'LEAN β · rad', q[0], q[1], 0.32, 'center'); }
    // vertical D axis at the back corner
    let back = corners[0], bi = 0; corners.forEach((q, i) => { if (q[1] < back[1]) { back = q; bi = i; } });
    const bc = [[F0, B0], [F1, B0], [F1, B1], [F0, B1]][bi];
    const top = P(bc[0], bc[1], MAX.d * 1.05);
    c.strokeStyle = '#fff'; c.globalAlpha = 0.3; c.beginPath(); c.moveTo(back[0], back[1]); c.lineTo(top[0], top[1]); c.stroke();
    for (const d of [0, 5, 10]) { const q = P(bc[0], bc[1], d); c.globalAlpha = 0.3; c.beginPath(); c.moveTo(q[0] - 3, q[1]); c.lineTo(q[0], q[1]); c.stroke(); if (!small || d === 10) label(c, d === 10 ? 'D 10 m' : String(d), q[0] - 6, q[1] + 3, 0.42, 'right'); }
    c.globalAlpha = 1;

    // sweep trail
    const tf = this.trailFade;
    c.fillStyle = '#fff';
    for (const [F, b] of this.trail) { const q = P(F, b, distance(F, b)); c.globalAlpha = 0.5 * tf; c.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); }
    c.globalAlpha = 1;

    // global max
    const mq = P(MAX.F, MAX.b, MAX.d);
    c.save(); c.shadowColor = GLOW; c.shadowBlur = 10; c.fillStyle = '#fff';
    c.beginPath(); c.arc(mq[0], mq[1], 2.6, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.globalAlpha = 0.7; c.beginPath(); c.moveTo(mq[0], mq[1] - 5); c.lineTo(mq[0], mq[1] - 20); c.stroke();
    c.restore();
    const mtxt = 'MAX 12.3 m @ 170 N'; // measured Simulink optimum; surface shape is illustrative
    const mw = c.measureText(mtxt).width;
    const mx = clamp(mq[0], R.x + mw / 2 + 6, R.x + R.w - mw / 2 - 6);
    c.save(); c.shadowColor = GLOW; c.shadowBlur = 6; label(c, mtxt, mx, mq[1] - 25, 0.95, 'center'); c.restore();

    // marker
    const [F, b] = this.cur, d = distance(F, b), q = P(F, b, d), g = P(F, b, 0);
    c.strokeStyle = '#fff'; c.lineWidth = 1;
    c.globalAlpha = 0.45; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(q[0], q[1] + 5); c.lineTo(g[0], g[1]); c.stroke(); c.setLineDash([]);
    c.globalAlpha = 0.6; c.beginPath(); c.moveTo(g[0] - 3, g[1]); c.lineTo(g[0] + 3, g[1]); c.moveTo(g[0], g[1] - 2); c.lineTo(g[0], g[1] + 2); c.stroke();
    c.globalAlpha = 1; c.lineWidth = 1.25; c.fillStyle = '#000';
    c.beginPath(); c.arc(q[0], q[1], 4.5, 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(q[0], q[1], 1.5, 0, 7); c.fill();
    const dt = d.toFixed(1) + ' m', dw = c.measureText(dt).width + 8;
    const lx = q[0] + 9 + dw > R.x + R.w ? q[0] - 9 - dw : q[0] + 9;
    c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillRect(lx, q[1] - 7, dw, 14);
    label(c, dt, lx + 4, q[1] + 3.5, 0.95);
  }
}

if (!customElements.get('as-segway-sweep')) customElements.define('as-segway-sweep', AsSegwaySweep);
export { AsSegwaySweep };

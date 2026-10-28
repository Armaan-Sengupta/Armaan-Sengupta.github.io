// <as-point-cloud>: LiDAR point-cloud processing pipeline.
// A procedurally generated urban scan (ground rings, box buildings, trees,
// dust / noise) passes through RAW -> VOXEL DOWNSAMPLE -> OUTLIER REMOVAL ->
// FURTHEST PAIR, looping continuously. Drag to orbit; auto-rotation resumes.
// Scene is synthetic; the downsample and furthest-pair are actually computed.

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
const PERIOD = 17;
const VOXEL = 1.6;
const STAGES = ['RAW', 'VOXEL DOWNSAMPLE', 'OUTLIER REMOVAL', 'FURTHEST PAIR'];
const PARAMS = ['FRAME 0001', 'LEAF 1.6 m', 'SOR k=16 σ=1.0', 'O(n²) EXACT'];

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function buildScene() {
  const R = rng(7), X = [], Y = [], Z = [], N = [];
  const add = (x, y, z, noise = 0) => { X.push(x); Y.push(y); Z.push(z); N.push(noise); };
  const B = [[-9, -6, 8, 7, 14], [7, -8, 9, 6, 9], [-6, 9, 7, 6, 6.5], [10, 8, 6, 8, 17]];
  const inside = (x, z, m = 0.2) => B.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + m && Math.abs(z - cz) < d / 2 + m);
  // Ground: concentric scan rings from a sensor at the origin (fixed angular pitch).
  for (let r = 3.4; r < 29; r += 0.8 + r * 0.014) {
    const n = Math.round(90 + r * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.03 + r * 0.37;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) > 20 || Math.abs(z) > 20 || inside(x, z)) continue;
      add(x, (R() - 0.5) * 0.08, z);
    }
  }
  // Buildings: walls + roof, sampled proportional to area.
  for (const [cx, cz, w, d, h] of B) {
    const faces = [[w, h, 0], [w, h, 1], [d, h, 2], [d, h, 3], [w, d, 4]];
    const area = faces.reduce((s, f) => s + f[0] * f[1], 0);
    for (const [a, b, k] of faces) {
      const n = Math.round((a * b / area) * 900 * (0.7 + h / 30));
      for (let i = 0; i < n; i++) {
        const u = R() - 0.5, v = R(), j = (R() - 0.5) * 0.06;
        if (k === 0) add(cx + u * w, v * h, cz - d / 2 + j);
        else if (k === 1) add(cx + u * w, v * h, cz + d / 2 + j);
        else if (k === 2) add(cx - w / 2 + j, v * h, cz + u * d);
        else if (k === 3) add(cx + w / 2 + j, v * h, cz + u * d);
        else add(cx + u * w, h + j, cz + (v - 0.5) * d);
      }
    }
  }
  // Trees: trunk + crown blob.
  for (const [tx, tz, th, cr] of [[1.5, 3.5, 5.2, 2.3], [-15, 4, 6, 2.8], [15, -1, 4.6, 2]]) {
    for (let i = 0; i < 40; i++) add(tx + (R() - 0.5) * 0.3, R() * th * 0.75, tz + (R() - 0.5) * 0.3);
    for (let i = 0; i < 230; i++) {
      let x, y, z; do { x = R() * 2 - 1; y = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + y * y + z * z > 1);
      const s = 0.75 + R() * 0.25;
      add(tx + x * cr * s, th + y * cr * 0.85 * s, tz + z * cr * s);
    }
  }
  // Noise: sparse airborne returns + a dust plume near the sensor.
  for (let i = 0; i < 230; i++) add((R() - 0.5) * 44, R() * 21, (R() - 0.5) * 44, 1);
  for (let i = 0; i < 170; i++) { const a = R() * 6.283, r = 2 + R() * 5; add(Math.cos(a) * r, 0.4 + R() * 3.2, Math.sin(a) * r, 1); }

  const n = X.length;
  const px = new Float32Array(X), py = new Float32Array(Y), pz = new Float32Array(Z), noise = new Uint8Array(N);
  const vx = new Float32Array(n), vy = new Float32Array(n), vz = new Float32Array(n), rep = new Uint8Array(n), fall = new Float32Array(n);
  const map = new Map();
  for (let i = 0; i < n; i++) {
    const ix = Math.floor(px[i] / VOXEL), iy = Math.floor(py[i] / VOXEL), iz = Math.floor(pz[i] / VOXEL);
    vx[i] = (ix + 0.5) * VOXEL; vy[i] = (iy + 0.5) * VOXEL; vz[i] = (iz + 0.5) * VOXEL;
    const key = (ix + 64) * 65536 + (iy + 64) * 256 + (iz + 64);
    if (!map.has(key)) { map.set(key, i); rep[i] = 1; }
    fall[i] = 0.6 + R() * 0.8;
  }
  // Inlier reps get their voxel centroid snapped; furthest pair on retained set.
  const keep = [];
  let noiseReps = 0;
  for (let i = 0; i < n; i++) if (rep[i]) { if (noise[i]) noiseReps++; else keep.push(i); }
  let best = -1, A = 0, Bp = 0;
  for (let a = 0; a < keep.length; a++) {
    const i = keep[a], xi = vx[i], yi = vy[i], zi = vz[i];
    for (let b = a + 1; b < keep.length; b++) {
      const j = keep[b], dx = vx[j] - xi, dy = vy[j] - yi, dz = vz[j] - zi, d = dx * dx + dy * dy + dz * dz;
      if (d > best) { best = d; A = i; Bp = j; }
    }
  }
  return { n, px, py, pz, noise, vx, vy, vz, rep, fall, reps: map.size, inliers: keep.length, noiseReps, A, B: Bp, dist: Math.sqrt(best) };
}

let SCENE = null;

class AsPointCloud extends AnimBase {
  static touch = 'none';
  constructor() {
    super();
    if (!SCENE) SCENE = buildScene();
    this.s = SCENE;
    this.t = 0.4;
    this.yaw = 0.75; this.pitch = 0.52;
    this.auto = 1; this.releaseAt = -1;
    this.drag = null;
    const n = this.s.n;
    this.sx = new Float32Array(n); this.sy = new Float32Array(n);
  }
  toStatic() { this.t = 13.6; this.yaw = 0.75; }
  step(dt) {
    this.t = (this.t + dt) % PERIOD;
    if (!this.drag) {
      if (this.releaseAt >= 0) { this.releaseAt += dt; this.auto = ease((this.releaseAt - 1.2) / 1.4); if (this.auto >= 1) this.releaseAt = -1; }
      this.yaw += dt * 0.11 * this.auto;
    }
  }
  onDown(x, y, e) { this.drag = { x, y, id: e.pointerId }; this.auto = 0; this.cv.setPointerCapture?.(e.pointerId); this.cv.style.cursor = 'grabbing'; }
  onMove(x, y) {
    if (!this.drag) { this.cv.style.cursor = 'grab'; return; }
    this.yaw += (x - this.drag.x) * 0.0085;
    this.pitch = clamp(this.pitch + (y - this.drag.y) * 0.006, 0.08, 1.3);
    this.drag.x = x; this.drag.y = y;
    this.invalidate();
  }
  onUp() { if (this.drag) { this.drag = null; this.releaseAt = 0; this.cv.style.cursor = 'grab'; } }
  onLeave(e) { if (this.drag && e.type === 'pointercancel') { this.drag = null; this.releaseAt = 0; } }

  phases(t) {
    const k1 = t < 15.2 ? ease((t - 3.5) / 1.2) : 1 - ease((t - 15.2) / 1.5);
    const k2 = t < 15.2 ? clamp((t - 7.5) / 1.4) : 1 - ease((t - 15.2) / 1.5);
    const k3 = t < 15.2 ? ease((t - 11) / 1.3) : 1 - ease((t - 15.2) / 0.6);
    const stage = t < 3.5 || t >= 15.2 ? 0 : t < 7.5 ? 1 : t < 11 ? 2 : 3;
    const since = t >= 15.2 ? t - 15.2 : t < 3.5 ? t + 1.8 : t < 7.5 ? t - 3.5 : t < 11 ? t - 7.5 : t - 11;
    return { k1, k2, k3, stage, since };
  }

  draw(c) {
    const W = this.w, H = this.h, s = this.s;
    const { k1, k2, k3, stage, since } = this.phases(this.t);
    const cy0 = 5.5;
    const cyaw = Math.cos(this.yaw), syaw = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const cam = 90;
    const S = Math.min(W / 60, (H - 44) / (24 + 40 * sp));
    const ox = W * 0.5, oy = H * 0.5 - 6;
    let lastD = 0;
    const proj = (x, y, z) => {
      const xr = x * cyaw - z * syaw, zr = x * syaw + z * cyaw, yc = y - cy0;
      const y2 = yc * cp + zr * sp, z2 = zr * cp - yc * sp;
      const f = cam / (cam + z2);
      lastD = z2;
      return [ox + xr * S * f, oy - y2 * S * f];
    };

    // Ground graticule
    c.strokeStyle = '#fff'; c.lineWidth = 1;
    c.globalAlpha = 0.07; c.beginPath();
    for (let g = -20; g <= 20; g += 5) {
      let p = proj(g, 0, -20), q = proj(g, 0, 20); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
      p = proj(-20, 0, g); q = proj(20, 0, g); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
    }
    c.stroke();
    if (k1 > 0.01 && k2 < 0.99) {
      c.globalAlpha = 0.05 * k1 * (1 - k2); c.beginPath();
      for (let g = -12; g <= 12; g++) {
        const v = g * VOXEL;
        let p = proj(v, 0, -19.2), q = proj(v, 0, 19.2); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
        p = proj(-19.2, 0, v); q = proj(19.2, 0, v); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]);
      }
      c.stroke();
    }
    c.globalAlpha = 1;

    // Points
    const { px, py, pz, vx, vy, vz, rep, noise, fall, n } = s;
    const size0 = 1.15 + k1 * 0.85, half = size0 / 2;
    const flash = k2 > 0 && k2 < 1 ? Math.sin(clamp(k2 * 2.2) * Math.PI) : 0;
    c.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      let a = rep[i] ? 1 : 1 - k1;
      if (noise[i]) a *= 1 - clamp(k2 * 1.25 - 0.25);
      if (a < 0.015) continue;
      let x = px[i] + (vx[i] - px[i]) * k1, y = py[i] + (vy[i] - py[i]) * k1, z = pz[i] + (vz[i] - pz[i]) * k1;
      if (noise[i] && k2 > 0) y -= k2 * k2 * 7 * fall[i];
      const xr = x * cyaw - z * syaw, zr = x * syaw + z * cyaw, yc = y - cy0;
      const y2 = yc * cp + zr * sp, z2 = zr * cp - yc * sp, f = cam / (cam + z2);
      const sx = ox + xr * S * f, sy = oy - y2 * S * f;
      const depth = clamp(0.5 - z2 / 60, 0, 1);
      let al = a * (0.28 + 0.62 * depth) * (noise[i] ? 0.85 : 1);
      if (noise[i] && flash > 0 && rep[i]) { al = Math.min(1, al + 0.7 * flash); c.globalAlpha = al; c.fillRect(sx - 1.5, sy - 0.5, 3, 1); c.fillRect(sx - 0.5, sy - 1.5, 1, 3); continue; }
      c.globalAlpha = al;
      c.fillRect(sx - half, sy - half, size0, size0);
    }
    c.globalAlpha = 1;

    // Furthest pair
    if (k3 > 0.001) {
      const A = s.A, B = s.B;
      const pa = proj(vx[A], vy[A], vz[A]), pb = proj(vx[B], vy[B], vz[B]);
      const e = [pa[0] + (pb[0] - pa[0]) * k3, pa[1] + (pb[1] - pa[1]) * k3];
      c.save();
      c.strokeStyle = '#fff'; c.lineWidth = 1.25; c.globalAlpha = 0.9; c.shadowColor = GLOW; c.shadowBlur = 8;
      c.beginPath(); c.moveTo(pa[0], pa[1]); c.lineTo(e[0], e[1]); c.stroke();
      c.lineWidth = 1;
      c.beginPath(); c.arc(pa[0], pa[1], 4.5, 0, 7); c.stroke();
      if (k3 > 0.98) { c.beginPath(); c.arc(pb[0], pb[1], 4.5, 0, 7); c.stroke(); }
      c.shadowBlur = 0; c.fillStyle = '#fff';
      c.beginPath(); c.arc(pa[0], pa[1], 1.6, 0, 7); c.arc(e[0], e[1], 1.6, 0, 7); c.fill();
      c.restore();
      if (k3 > 0.6) {
        const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2, txt = 'd = ' + s.dist.toFixed(1) + ' m';
        const tw = c.measureText(txt).width + 12;
        const a = ease((k3 - 0.6) / 0.4);
        c.globalAlpha = a; c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillRect(mx - tw / 2, my - 22, tw, 15);
        c.save(); c.shadowColor = GLOW; c.shadowBlur = 6; label(c, txt, mx, my - 11, a, 'center'); c.restore();
      }
    }

    // Axis triad (top-right)
    {
      const L = 12, tx = W - 22, ty = 22;
      const ax = (x, y, z) => { const xr = x * cyaw - z * syaw, zr = x * syaw + z * cyaw, y2 = y * cp + zr * sp; return [tx + xr * L, ty - y2 * L]; };
      c.strokeStyle = '#fff'; c.lineWidth = 1;
      for (const [v, nm] of [[[1, 0, 0], 'X'], [[0, 1, 0], 'Z'], [[0, 0, 1], 'Y']]) {
        const p = ax(...v); c.globalAlpha = 0.45; c.beginPath(); c.moveTo(tx, ty); c.lineTo(p[0], p[1]); c.stroke();
        if (W > 360) label(c, nm, tx + (p[0] - tx) * 1.6, ty + (p[1] - ty) * 1.6 + 3, 0.4, 'center');
      }
      c.globalAlpha = 1;
    }

    // Readouts
    const cnt = Math.round(s.n + (s.reps - s.n) * k1 - s.noiseReps * clamp(k2 * 1.25 - 0.25));
    label(c, 'PTS ' + cnt.toLocaleString('en-US'), 12, 20, 0.85);
    if (W > 360) label(c, 'YAW ' + String(Math.round((((this.yaw * 180) / Math.PI) % 360 + 360) % 360)).padStart(3, '0') + '°  PITCH ' + String(Math.round((this.pitch * 180) / Math.PI)).padStart(2, '0') + '°', 12, 34, 0.35);

    const by = H - 12, fade = ease(since / 0.45);
    // stage pips
    for (let i = 0; i < 4; i++) {
      c.globalAlpha = i === stage ? 0.9 : i < stage ? 0.35 : 0.14;
      c.fillStyle = '#fff'; c.fillRect(12 + i * 16, by - 16, 12, 2);
    }
    const name = String(stage + 1).padStart(2, '0') + ' / ' + STAGES[stage];
    label(c, name, 12, by, 0.35 + 0.55 * fade);
    if (W > 380) label(c, PARAMS[stage], W - 12, by, 0.45 * fade, 'right');
    c.globalAlpha = 1;
  }
}

if (!customElements.get('as-point-cloud')) customElements.define('as-point-cloud', AsPointCloud);
export { AsPointCloud };

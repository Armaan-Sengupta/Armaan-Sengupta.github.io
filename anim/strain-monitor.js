// <as-strain-monitor>: in-die crack detection on a hydraulic press.
// Four strain-gauge channels scroll left like a live scope. Each stroke is
// compared against a learned normal envelope; a cracked part produces a sharp
// drop that leaves the band, glows, and is rejected.
// Click / tap: inject a crack into the next stroke. Hover: channel cursor.
// Signals are a procedural illustration, not recorded press data.

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
const P = 1.15;          // stroke period, s
const RATE = 500;        // sample rate, Hz
const CH = 4;
const BINS = 240;        // envelope resolution per stroke
const GAIN = [1, 0.84, 0.68, 0.92];
const SHIFT = [0, 0.016, -0.012, 0.028];
const UE = [880, 740, 600, 810];   // microstrain at unit value
const COUNT_FROM = 333;            // counters start here
const START_STROKE = 347;

function profile(u, ch) {
  const x = (u - 0.1 - SHIFT[ch]) / 0.68;
  if (x <= 0 || x >= 1) return 0;
  const xw = Math.pow(x, 0.82);
  const s = Math.sin(Math.PI * xw);
  return Math.pow(s, 1.5) + 0.13 * Math.exp(-(((x - 0.74) / 0.065) ** 2)) * s;
}
const strokeGain = (s, ch) => 1 + 0.045 * (ih(s * 8 + ch) * 2 - 1);
const strokeJit = (s, ch) => 0.008 * (ih(s * 8 + ch + 4) * 2 - 1);
const crackU = (s) => 0.34 + 0.2 * ih(s * 31 + 7);
const crackPrimary = (s) => Math.floor(ih(s * 13 + 1) * CH) % CH;
const crackSecondary = (s) => (ih(s * 17 + 3) > 0.5 ? (crackPrimary(s) + 1 + Math.floor(ih(s * 19 + 5) * 3)) % CH : -1);
const crackDepth = (s) => 0.4 + 0.18 * ih(s * 23 + 9);

class AsStrainMonitor extends AnimBase {
  static touch = 'pan-y';
  constructor() {
    super();
    this.now = (START_STROKE + 0.62) * P;
    this.inject = new Set();
    this.queued = -1;
    this.hover = null;
    this._down = null;
    this.lo = []; this.hi = [];
    // Learned normal envelope: min/max of 32 control strokes per phase bin.
    for (let ch = 0; ch < CH; ch++) {
      const lo = new Float32Array(BINS + 1).fill(9), hi = new Float32Array(BINS + 1).fill(-9);
      for (let s = 100; s < 132; s++) {
        const g = GAIN[ch] * strokeGain(s, ch), j = strokeJit(s, ch);
        for (let i = 0; i <= BINS; i++) {
          const v = g * profile(i / BINS - j, ch);
          if (v < lo[i]) lo[i] = v; if (v > hi[i]) hi[i] = v;
        }
      }
      for (let i = 0; i <= BINS; i++) { const m = 0.018 + 0.035 * hi[i]; lo[i] -= m; hi[i] += m; }
      // light smoothing so the band reads as a learned statistic, not a polyline
      const sl = new Float32Array(lo), sh = new Float32Array(hi);
      for (let i = 2; i <= BINS - 2; i++) {
        lo[i] = Math.min(sl[i], (sl[i - 2] + sl[i - 1] + sl[i] + sl[i + 1] + sl[i + 2]) / 5);
        hi[i] = Math.max(sh[i], (sh[i - 2] + sh[i - 1] + sh[i] + sh[i + 1] + sh[i + 2]) / 5);
      }
      this.lo.push(lo); this.hi.push(hi);
    }
    this.xs = new Float32Array(16); this.ys = new Float32Array(16); this.fl = new Uint8Array(16);
  }
  cracked(s) { return s % 5 === 4 || this.inject.has(s); }
  value(k, ch) {
    const t = k / RATE, sf = t / P, s = Math.floor(sf), u = sf - s;
    let v = GAIN[ch] * strokeGain(s, ch) * profile(u - strokeJit(s, ch), ch);
    if (this.cracked(s)) {
      const p = crackPrimary(s), q = crackSecondary(s);
      if (ch === p || ch === q) {
        const w = u - crackU(s);
        if (w > 0) {
          const d = crackDepth(s) * (ch === p ? 1 : 0.62);
          v = v * (1 - d * (1 - Math.exp(-w * 320))) + 0.075 * GAIN[ch] * Math.exp(-w * 26) * Math.sin(w * 210) * (v > 0.02 ? 1 : 0);
        }
      }
    }
    return v + (ih(k * 4 + ch) - 0.5) * 0.018 + 0.005 * Math.sin(k * 0.37 + ch * 2.1);
  }
  envAt(ch, u, hi) { const f = clamp(u) * BINS, i = Math.min(BINS - 1, f | 0), r = f - i, a = hi ? this.hi[ch] : this.lo[ch]; return a[i] + (a[i + 1] - a[i]) * r; }
  crackCount(now) {
    const sNow = Math.floor(now / P);
    const sCut = (sNow + crackU(sNow)) * P <= now ? sNow : sNow - 1;
    const f = (n) => Math.floor((n + 1) / 5);
    let n = Math.max(0, f(sCut) - f(COUNT_FROM - 1));
    for (const s of this.inject) if (s % 5 !== 4 && s >= COUNT_FROM && s <= sCut && (s < sNow || (s + crackU(s)) * P <= now)) n++;
    return n;
  }
  lastDetection(now) {
    let s = Math.floor(now / P);
    for (let i = 0; i < 6; i++, s--) { if (this.cracked(s)) { const tc = (s + crackU(s)) * P; if (tc <= now) return now - tc; } }
    return 99;
  }
  toStatic() { const s = 349; this.now = (s + crackU(s) + 0.26) * P; }
  layout() {
    const n = Math.ceil(this.w) * 2 + 16;
    if (this.xs.length < n) { this.xs = new Float32Array(n); this.ys = new Float32Array(n); this.fl = new Uint8Array(n); }
  }
  step(dt) {
    this.now += dt;
    if (this.queued >= 0 && Math.floor(this.now / P) > this.queued + 1) this.queued = -1;
  }
  geom() {
    const W = this.w, H = this.h;
    const top = 26, bot = 24, gut = W < 420 ? 38 : 50, x0 = gut, x1 = W - 10;
    const lh = (H - top - bot) / CH;
    const win = P * clamp((x1 - x0) / 235, 1.55, 4.3);
    return { W, H, top, bot, x0, x1, lh, win };
  }
  onMove(x, y, e) {
    if (e.pointerType === 'touch' && !this._down) return;
    this.hover = { x, y }; this.invalidate();
    if (this._down && Math.hypot(x - this._down.x, y - this._down.y) > 10) this._down.moved = true;
  }
  onDown(x, y, e) { this._down = { x, y, t: performance.now(), moved: false }; this.hover = { x, y }; this.invalidate(); }
  onUp(x, y, e) {
    const d = this._down; this._down = null;
    if (e.pointerType === 'touch') { this.hover = null; }
    if (d && !d.moved && performance.now() - d.t < 450) this.injectCrack();
    this.invalidate();
  }
  onLeave(e) { this._down = null; this.hover = null; this.invalidate(); }
  injectCrack() {
    let s;
    if (this.reduced) { s = Math.floor(this.now / P); if ((s + crackU(s)) * P > this.now) s--; while (this.cracked(s)) s--; }
    else { s = Math.floor(this.now / P) + 1; while (this.cracked(s)) s++; this.queued = s; }
    this.inject.add(s);
    if (this.inject.size > 64) this.inject.delete(this.inject.values().next().value);
  }

  draw(c) {
    const { W, H, top, bot, x0, x1, lh, win } = this.geom();
    const now = this.now, tL = now - win, span = x1 - x0;
    const xOf = (t) => x1 - ((now - t) / win) * span;
    const pad = Math.max(4, lh * 0.1);
    const yOf = (v, ch) => top + lh * (ch + 1) - pad - (v / 1.12) * (lh - pad * 2);
    const sNow = Math.floor(now / P);

    // Graticule: fixed relative to the write head.
    c.lineWidth = 1; c.strokeStyle = '#fff';
    c.globalAlpha = 0.06; c.beginPath();
    for (let i = 0; i * 0.25 <= win + 1e-6; i++) { const x = Math.round(xOf(now - i * 0.25)) + 0.5; if (x < x0) break; c.moveTo(x, top); c.lineTo(x, H - bot); }
    for (let ch = 0; ch <= CH; ch++) { const y = Math.round(top + ch * lh) + 0.5; c.moveTo(x0, y); c.lineTo(x1, y); }
    c.stroke();
    c.globalAlpha = 0.11; c.beginPath();
    for (let ch = 0; ch < CH; ch++) { const y = Math.round(yOf(0, ch)) + 0.5; c.moveTo(x0, y); c.lineTo(x1, y); }
    c.stroke(); c.globalAlpha = 1;

    // Time axis
    for (let i = 0; i * 0.5 <= win + 1e-6; i++) {
      const x = xOf(now - i * 0.5); if (x < x0 + 12) break;
      const xr = Math.round(x) + 0.5;
      c.globalAlpha = 0.25; c.beginPath(); c.moveTo(xr, H - bot); c.lineTo(xr, H - bot + (i % 2 ? 3 : 5)); c.stroke();
      if (i % 2 === 0) label(c, i === 0 ? '0 s' : '−' + (i * 0.5).toFixed(0) + ' s', x, H - 8, 0.42, i === 0 ? 'right' : 'center');
    }

    // Envelope bands
    const pxPerBin = (P / win) * span / BINS, bstep = Math.max(1, Math.floor(1.6 / pxPerBin));
    c.fillStyle = '#fff';
    for (let ch = 0; ch < CH; ch++) {
      c.beginPath();
      for (let s = Math.floor(tL / P); s <= sNow; s++) {
        const t0 = s * P, iA = Math.max(0, Math.ceil(((tL - t0) / P) * BINS)), iB = Math.min(BINS, Math.floor(((now - t0) / P) * BINS));
        if (iB <= iA) continue;
        let first = true;
        for (let i = iA; i <= iB; i += bstep) { const x = xOf(t0 + (i / BINS) * P), y = yOf(this.hi[ch][i], ch); first ? c.moveTo(x, y) : c.lineTo(x, y); first = false; }
        c.lineTo(xOf(t0 + (iB / BINS) * P), yOf(this.hi[ch][iB], ch));
        c.lineTo(xOf(t0 + (iB / BINS) * P), yOf(this.lo[ch][iB], ch));
        for (let i = iB - ((iB - iA) % bstep); i >= iA; i -= bstep) c.lineTo(xOf(t0 + (i / BINS) * P), yOf(this.lo[ch][i], ch));
        c.closePath();
      }
      c.globalAlpha = 0.1; c.fill();
      c.globalAlpha = 0.16; c.lineWidth = 1; c.strokeStyle = '#fff'; c.stroke();
    }
    c.globalAlpha = 1;

    // Traces
    const kL = Math.floor(tL * RATE), kR = Math.floor(now * RATE);
    const stride = Math.max(1, Math.ceil((kR - kL) / span));
    const { xs, ys, fl } = this;
    const head = [];
    for (let ch = 0; ch < CH; ch++) {
      let n = 0;
      for (let k = Math.ceil(kL / stride) * stride; ; k += stride) {
        if (k > kR) k = kR;
        const t = k / RATE, v = this.value(k, ch), sf = t / P, u = sf - Math.floor(sf);
        xs[n] = xOf(t); ys[n] = yOf(v, ch);
        fl[n] = v < this.envAt(ch, u, false) || v > this.envAt(ch, u, true) ? 1 : 0;
        n++;
        if (k === kR || n >= xs.length) break;
      }
      c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.globalAlpha = 0.9;
      c.beginPath(); c.moveTo(xs[0], ys[0]); for (let i = 1; i < n; i++) c.lineTo(xs[i], ys[i]); c.stroke();
      // Out-of-band segments glow
      c.globalAlpha = 1; c.lineWidth = 1.8; c.strokeStyle = '#fff'; c.shadowColor = GLOW; c.shadowBlur = 10;
      c.beginPath(); let on = false;
      for (let i = 1; i < n; i++) {
        if (fl[i] && fl[i - 1]) { if (!on) { c.moveTo(xs[i - 1], ys[i - 1]); on = true; } c.lineTo(xs[i], ys[i]); }
        else on = false;
      }
      c.stroke(); c.shadowBlur = 0;
      head.push(this.value(kR, ch));
      // write head
      c.globalAlpha = 1; c.fillStyle = '#fff'; c.beginPath(); c.arc(xs[n - 1], ys[n - 1], 2, 0, 7); c.fill();
    }

    // Channel labels
    for (let ch = 0; ch < CH; ch++) {
      const yl = top + lh * ch;
      label(c, 'CH' + (ch + 1), 8, yl + Math.min(lh * 0.5, 16), 0.5);
      if (lh > 30) label(c, String(Math.max(0, Math.round(head[ch] * UE[ch]))).padStart(3, ' '), 8, yl + Math.min(lh * 0.5, 16) + 13, 0.85);
    }
    if (lh > 44 && W > 380) label(c, 'µε', x0 - 8, top + lh * CH - 6, 0.3, 'right');

    // Anomaly events
    for (let s = Math.floor(tL / P) - 1; s <= sNow; s++) {
      if (!this.cracked(s)) continue;
      const tc = (s + crackU(s)) * P; if (tc > now || tc < tL - P) continue;
      const age = now - tc, ax = xOf(tc + 0.004), p = crackPrimary(s);
      const flash = Math.exp(-age * 2.6);
      if (ax > x0) {
        c.save(); c.strokeStyle = '#fff'; c.shadowColor = GLOW; c.shadowBlur = 12; c.globalAlpha = 0.55 * flash; c.lineWidth = 1;
        c.beginPath(); c.moveTo(Math.round(ax) + 0.5, top); c.lineTo(Math.round(ax) + 0.5, H - bot); c.stroke(); c.restore();
      }
      const k = Math.round(tc * RATE) + 3, cy = yOf(this.value(k, p), p);
      const txt = W < 380 ? 'ANOMALY · REJECT' : 'ANOMALY · PART REJECTED';
      const tw = c.measureText(txt).width + 14, th = 17;
      let tx = Math.max(x0 + 2, ax - tw - 10); const ty = top + lh * p + 4;
      const a = ease(age / 0.18) * clamp((ax - x0) / (tw * 0.5));
      if (a <= 0.01) continue;
      c.save(); c.globalAlpha = a;
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.setLineDash([2, 3]); c.globalAlpha = a * 0.6;
      c.beginPath(); c.moveTo(ax, cy - 5); c.lineTo(ax, ty + th); c.lineTo(Math.min(ax, tx + tw), ty + th); c.stroke(); c.setLineDash([]);
      c.globalAlpha = a; c.shadowColor = GLOW; c.shadowBlur = 6 + 10 * flash;
      c.beginPath(); c.arc(ax, cy, 3.5, 0, 7); c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.82)'; c.shadowBlur = 0; c.fillRect(tx, ty, tw, th);
      c.shadowBlur = 4 + 8 * flash; c.strokeRect(Math.round(tx) + 0.5, Math.round(ty) + 0.5, Math.round(tw), th);
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(txt, tx + 7, ty + 12);
      c.restore();
    }

    // Hover cursor
    const hv = this.hover;
    if (hv && hv.x >= x0 && hv.x <= x1) {
      const t = now - ((x1 - hv.x) / span) * win, k = Math.round(t * RATE), x = Math.round(xOf(k / RATE)) + 0.5;
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.globalAlpha = 0.45;
      c.beginPath(); c.moveTo(x, top); c.lineTo(x, H - bot); c.stroke(); c.globalAlpha = 1;
      const right = x < x1 - 70;
      for (let ch = 0; ch < CH; ch++) {
        const v = this.value(k, ch), y = yOf(v, ch);
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill();
        const s = Math.max(0, Math.round(v * UE[ch])) + ' µε', tw = c.measureText(s).width + 8;
        const lx = right ? x + 6 : x - 6 - tw, ly = clamp(y - 14, top + lh * ch + 2, top + lh * (ch + 1) - 16);
        c.fillStyle = 'rgba(0,0,0,0.75)'; c.fillRect(lx, ly, tw, 14);
        label(c, s, lx + 4, ly + 10.5, 0.95);
      }
      const ts = (t - now).toFixed(2) + ' s';
      const tw = c.measureText(ts).width + 8;
      c.fillStyle = '#000'; c.fillRect(clamp(x - tw / 2, x0, x1 - tw), H - bot + 1, tw, bot - 2);
      label(c, ts, clamp(x, x0 + tw / 2, x1 - tw / 2), H - 8, 0.9, 'center');
    }

    // Header readouts
    const cracks = this.crackCount(now), since = this.lastDetection(now);
    const sTxt = String(sNow).padStart(4, '0'), cTxt = String(cracks);
    const parts = W < 470 ? ['STK ' + sTxt, ' · CRK ', cTxt, ' · FP 0'] : ['STROKE ' + sTxt, ' · CRACKS ', cTxt, ' · FALSE POS 0'];
    let xr = x1; const yh = 16;
    for (let i = parts.length - 1; i >= 0; i--) {
      const wpt = c.measureText(parts[i]).width; xr -= wpt;
      if (i === 2 && since < 1.4) {
        c.save(); c.shadowColor = GLOW; c.shadowBlur = 10 * Math.exp(-since * 2); label(c, parts[i], xr, yh, 1); c.restore();
      } else label(c, parts[i], xr, yh, i === 2 ? 0.9 : 0.5);
    }
    if (this.queued >= 0 && this.queued > sNow - 1 && !this.reduced) {
      label(c, (W < 470 ? 'INJECT → ' : 'CRACK QUEUED → STROKE ') + String(this.queued).padStart(4, '0'), x0, yh, 0.85);
    } else {
      label(c, W < 470 ? '500 Hz' : 'SAMPLE RATE 500 Hz', x0, yh, 0.5);
    }
  }
}

if (!customElements.get('as-strain-monitor')) customElements.define('as-strain-monitor', AsStrainMonitor);
export { AsStrainMonitor };

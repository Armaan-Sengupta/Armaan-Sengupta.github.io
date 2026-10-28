// <as-wire-protocol>: custom unidirectional 2-wire link (clock + data,
// loosely I2C-like) carrying a turntable angle from an ESP32 to a VEX V5
// brain that only supports digital reads. Frame = START, 9-bit angle (MSB
// first, sampled on CLK rising edge), 2-bit checksum (popcount mod 4), STOP.
// Click / drag the turntable to choose the next angle to transmit.
// Bit timing is slowed down for legibility.

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
const TB = 0.2;                 // bit slot, s (illustrative)
const NBITS = 11;               // 9 angle + 2 checksum
const T_START = 0.35, T_SLOT0 = 0.5;
const T_END = T_SLOT0 + NBITS * TB;   // 2.7
const T_STOP = T_END + 0.2;          // DATA rises while CLK high
const TW = T_STOP + 0.2;             // scope window
const FRAME = 4.9;
const ANGLES = [90, 215, 45, 300];

const bitsOf = (a) => {
  const b = []; for (let i = 8; i >= 0; i--) b.push((a >> i) & 1);
  const chk = b.reduce((s, x) => s + x, 0) % 4; b.push((chk >> 1) & 1, chk & 1); return b;
};
function edgesFor(bits) {
  const clk = [[0, 1], [T_SLOT0 - 0.05, 0]], dat = [[0, 1], [T_START, 0]];
  let lv = 0;
  for (let i = 0; i < NBITS; i++) {
    const s = T_SLOT0 + i * TB;
    if (i > 0) clk.push([s, 0]);
    clk.push([s + TB / 2, 1]);
    if (bits[i] !== lv) { dat.push([s + 0.03, bits[i]]); lv = bits[i]; }
  }
  clk.push([T_END, 0], [T_END + 0.1, 1]);
  if (lv !== 0) dat.push([T_END + 0.03, 0]);
  dat.push([T_STOP, 1]);
  return { clk, dat };
}
const fmtBits = (a) => { const s = a.toString(2).padStart(9, '0'); return s[0] + ' ' + s.slice(1, 5) + ' ' + s.slice(5); };
const pad3 = (a) => String(a).padStart(3, '0');
const shortest = (from, to) => { let d = ((to - from) % 360 + 540) % 360 - 180; return from + d; };

class AsWireProtocol extends AnimBase {
  static touch = 'none';
  constructor() {
    super();
    this.ai = 0; this.queued = null; this.hoverA = null; this.drag = false;
    this.ft = 0.2;
    this.table = 0;
    this.setFrame(ANGLES[0], null);
    this.lastRx = null;
  }
  setFrame(a, prev) {
    this.prev = prev;
    this.angle = a; this.bits = bitsOf(a); this.edges = edgesFor(this.bits);
    this.tFrom = this.table ?? 0; this.tTo = shortest(this.tFrom, a);
  }
  nextFrame() {
    const prev = this.edges;
    let a;
    if (this.queued != null) { a = this.queued; this.queued = null; }
    else { this.ai = (this.ai + 1) % ANGLES.length; a = ANGLES[this.ai]; }
    this.table = this.tTo;
    this.setFrame(a, prev);
    this.ft = 0;
  }
  toStatic() { this.ft = FRAME - 0.3; this.table = this.tTo; this.lastRx = this.angle; }
  step(dt) {
    this.ft += dt;
    const k = (this.ft - (T_STOP + 0.08)) / 1.1;
    this.table = k <= 0 ? this.tFrom : this.tFrom + (this.tTo - this.tFrom) * (k >= 1 ? 1 : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    if (this.ft >= T_STOP) this.lastRx = this.angle;
    if (this.ft >= FRAME) this.nextFrame();
  }
  geom() {
    const W = this.w, H = this.h;
    if (W >= 520) {
      const sw = Math.round(W * 0.64);
      const r = Math.max(30, Math.min((W - sw) / 2 - 36, H * 0.3));
      return { stacked: false, S: { x: 0, y: 0, w: sw, h: H }, cx: sw + (W - sw) / 2, cy: H * 0.5 - 6, r };
    }
    const sh = Math.round(H * 0.6), r = Math.max(22, Math.min((H - sh) / 2 - 10, W * 0.2));
    return { stacked: true, S: { x: 0, y: 0, w: W, h: sh }, cx: 16 + r + 4, cy: sh + (H - sh) / 2 + 2, r };
  }
  angleAt(x, y) {
    const g = this.geom(), dx = x - g.cx, dy = y - g.cy;
    if (Math.hypot(dx, dy) > g.r * 1.4 + 10) return null;
    return (Math.round((Math.atan2(dx, -dy) * 180) / Math.PI) + 360) % 360;
  }
  onDown(x, y, e) {
    const a = this.angleAt(x, y); if (a == null) return;
    this.drag = true; this.queued = a; this.cv.setPointerCapture?.(e.pointerId); this.invalidate();
  }
  onMove(x, y) {
    if (this.drag) { const g = this.geom(); this.queued = (Math.round((Math.atan2(x - g.cx, -(y - g.cy)) * 180) / Math.PI) + 360) % 360; this.invalidate(); return; }
    const a = this.angleAt(x, y); this.hoverA = a; this.cv.style.cursor = a == null ? '' : 'pointer'; this.invalidate();
  }
  onUp() {
    if (!this.drag) return; this.drag = false;
    if (this.reduced) { this.nextFrame(); this.toStatic(); }
    else if (this.ft >= T_STOP + 1.3) this.nextFrame();
    this.invalidate();
  }
  onLeave(e) { if (!this.drag) { this.hoverA = null; this.invalidate(); } else if (e.type === 'pointercancel') this.onUp(); }

  draw(c) {
    const g = this.geom();
    this.drawScope(c, g);
    this.drawTable(c, g);
  }

  drawScope(c, g) {
    const S = g.S, small = S.h < 170;
    const x0 = S.x + (small ? 44 : 56), x1 = S.x + S.w - (g.stacked ? 12 : 20);
    const head = small ? 18 : 22, foot = small ? 30 : 44;
    const lh = Math.min((S.h - head - foot - 8) / 2, 130);
    const top = S.y + head + 4 + (S.h - head - foot - 8 - lh * 2) / 2;
    const xOf = (t) => x0 + (t / TW) * (x1 - x0);
    const cur = Math.min(this.ft, TW);
    const lanes = [{ name: 'CLK', y: top, e: 'clk' }, { name: 'DATA', y: top + lh, e: 'dat' }];
    const amp = Math.min(lh * 0.56, 60);

    // graticule: slot sample instants
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.globalAlpha = 0.06; c.beginPath();
    for (let i = 0; i < NBITS; i++) { const x = Math.round(xOf(T_SLOT0 + i * TB + TB / 2)) + 0.5; c.moveTo(x, top); c.lineTo(x, top + lh * 2); }
    for (const L of lanes) { const y = Math.round(L.y) + 0.5; c.moveTo(x0, y); c.lineTo(x1, y); }
    c.moveTo(x0, Math.round(top + lh * 2) + 0.5); c.lineTo(x1, Math.round(top + lh * 2) + 0.5);
    c.stroke(); c.globalAlpha = 1;

    const trace = (edges, y, tA, tB, alpha, lw) => {
      if (tB <= tA) return;
      const yH = Math.round(y + (lh - amp) / 2) + 0.5, yL = Math.round(y + (lh + amp) / 2) + 0.5;
      let lv = 1; for (const [t, v] of edges) { if (t <= tA) lv = v; else break; }
      c.beginPath(); c.moveTo(xOf(tA), lv ? yH : yL);
      for (const [t, v] of edges) {
        if (t <= tA || t > tB) continue;
        const x = Math.round(xOf(t)) + 0.5;
        c.lineTo(x, lv ? yH : yL); lv = v; c.lineTo(x, lv ? yH : yL);
      }
      c.lineTo(xOf(tB), lv ? yH : yL);
      c.globalAlpha = alpha; c.lineWidth = lw; c.lineJoin = 'miter'; c.stroke(); c.lineJoin = 'round'; c.globalAlpha = 1;
    };
    for (const L of lanes) {
      label(c, L.name, S.x + 12, L.y + lh / 2 + 3.5, 0.5);
      if (this.prev && cur < TW) trace(this.prev[L.e], L.y, cur, TW, 0.16, 1);
      trace(this.edges[L.e], L.y, 0, cur, 0.95, 1.4);
    }
    // write cursor
    if (cur < TW) { const x = Math.round(xOf(cur)) + 0.5; c.globalAlpha = 0.3; c.beginPath(); c.moveTo(x, top - 2); c.lineTo(x, top + lh * 2 + 2); c.stroke(); c.globalAlpha = 1; }

    // sampled bits
    const dY = (v) => top + lh + (v ? (lh - amp) / 2 : (lh + amp) / 2);
    const by = top + lh * 2 + (small ? 12 : 15);
    c.fillStyle = '#fff';
    for (let i = 0; i < NBITS; i++) {
      const ts = T_SLOT0 + i * TB + TB / 2; if (cur < ts) break;
      const x = xOf(ts), age = cur - ts, a = 0.6 + 0.4 * Math.exp(-age * 5);
      c.globalAlpha = 0.85; c.beginPath(); c.arc(x, dY(this.bits[i]), 2, 0, 7); c.fill();
      label(c, String(this.bits[i]), x, by, a, 'center');
    }
    c.globalAlpha = 1;
    // field brackets
    const fy = by + (small ? 9 : 12);
    const field = (tA, tB, name, active) => {
      const xa = xOf(tA) + 2, xb = xOf(tB) - 2, a = active ? 0.75 : 0.28;
      c.globalAlpha = a; c.beginPath(); c.moveTo(xa, fy - 3); c.lineTo(xa, fy); c.lineTo(xb, fy); c.lineTo(xb, fy - 3); c.stroke(); c.globalAlpha = 1;
      if (!small || name.length <= 3) label(c, name, (xa + xb) / 2, fy + 12, a, 'center');
    };
    const live = this.ft < TW;
    field(T_START - 0.05, T_SLOT0, 'S', live && cur >= T_START && cur < T_SLOT0);
    field(T_SLOT0, T_SLOT0 + 9 * TB, small ? 'ANGLE' : 'ANGLE [8:0]', live && cur >= T_SLOT0 && cur < T_SLOT0 + 9 * TB);
    field(T_SLOT0 + 9 * TB, T_END, 'CHK', live && cur >= T_SLOT0 + 9 * TB && cur < T_END);
    field(T_END + 0.05, T_STOP + 0.1, 'P', live && cur >= T_END && cur < T_STOP + 0.1);

    // header readouts: TX with per-bit progress
    const hy = S.y + (small ? 13 : 16);
    let x = S.x + 12;
    const seg = (s, a) => { label(c, s, x, hy, a); x += c.measureText(s).width; };
    seg('TX ', 0.5); seg(pad3(this.angle) + '°', 0.95); seg(' → ', 0.4);
    const bs = fmtBits(this.angle);
    let bi = 0;
    for (const ch of bs) {
      if (ch === ' ') { x += c.measureText(' ').width; continue; }
      const sent = cur >= T_SLOT0 + bi * TB + TB / 2; seg(ch, sent ? 0.95 : 0.3); bi++;
    }
    if (g.S.w > 380) {
      x += 12; seg('CHK ', 0.5); seg(String(this.bits[9]) + String(this.bits[10]), cur >= T_SLOT0 + 10 * TB + TB / 2 ? 0.95 : 0.3);
    }
    // RX status
    const rxDone = this.ft >= T_STOP;
    const rx = rxDone ? 'RX ' + pad3(this.angle) + '° OK' : cur >= T_START ? 'RX ' + '·'.repeat(1 + (Math.floor(cur / 0.25) % 3)) : 'RX IDLE';
    if (rxDone) {
      const age = this.ft - T_STOP;
      c.save(); c.shadowColor = GLOW; c.shadowBlur = 4 + 10 * Math.exp(-age * 1.6); label(c, rx, x1, hy, 1, 'right'); c.restore();
    } else label(c, rx, x1, hy, 0.45, 'right');
  }

  drawTable(c, g) {
    const { cx, cy, r } = g;
    c.strokeStyle = '#fff'; c.lineWidth = 1;
    // fixed ring + graduations
    c.globalAlpha = 0.4; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
    c.globalAlpha = 0.1; c.beginPath(); c.arc(cx, cy, r * 0.9, 0, 7); c.stroke();
    c.beginPath();
    for (let d = 0; d < 360; d += 10) {
      const a = (d * Math.PI) / 180, s = Math.sin(a), co = -Math.cos(a), l = d % 30 ? 3.5 : 7;
      c.moveTo(cx + s * r, cy + co * r); c.lineTo(cx + s * (r + l), cy + co * (r + l));
    }
    c.globalAlpha = 0.3; c.stroke(); c.globalAlpha = 1;
    if (r > 44) for (const d of [0, 90, 180, 270]) { const a = (d * Math.PI) / 180; label(c, String(d), cx + Math.sin(a) * (r + 24), cy - Math.cos(a) * (r + 24) + 3.5, 0.4, 'center'); }

    // rotating table + part
    const th = (this.table * Math.PI) / 180;
    c.save(); c.translate(cx, cy); c.rotate(th);
    c.globalAlpha = 0.18; c.beginPath(); c.arc(0, 0, r * 0.82, 0, 7); c.stroke();
    c.globalAlpha = 0.08; c.beginPath(); c.moveTo(-r * 0.82, 0); c.lineTo(r * 0.82, 0); c.moveTo(0, r * 0.82); c.lineTo(0, -r * 0.82); c.stroke();
    // part outline: bracket with tab pointing to the indexed angle
    const u = r * 0.82;
    c.globalAlpha = 0.95; c.lineWidth = 1.25; c.fillStyle = 'rgba(255,255,255,0.06)';
    c.beginPath();
    c.moveTo(-0.46 * u, -0.22 * u); c.lineTo(-0.12 * u, -0.22 * u); c.lineTo(-0.07 * u, -0.62 * u); c.lineTo(0.07 * u, -0.62 * u); c.lineTo(0.12 * u, -0.22 * u);
    c.lineTo(0.46 * u, -0.22 * u); c.lineTo(0.46 * u, 0.3 * u); c.lineTo(0.18 * u, 0.42 * u); c.lineTo(-0.18 * u, 0.42 * u); c.lineTo(-0.46 * u, 0.3 * u); c.closePath();
    c.fill(); c.stroke();
    c.beginPath(); c.arc(0, 0, 0.11 * u, 0, 7); c.stroke();
    c.globalAlpha = 0.5; c.lineWidth = 1;
    for (const sx of [-0.32, 0.32]) { c.beginPath(); c.arc(sx * u, 0.1 * u, 0.045 * u, 0, 7); c.stroke(); }
    c.globalAlpha = 0.9; c.beginPath(); c.moveTo(0, -0.66 * u); c.lineTo(0, -r * 0.97); c.stroke();
    c.restore();

    // commanded angle marker (TX target)
    const tri = (deg, fill, alpha, size = 6) => {
      const a = (deg * Math.PI) / 180, s = Math.sin(a), co = -Math.cos(a), R0 = r + 9, R1 = R0 + size * 1.3, px = co, py = -s;
      c.beginPath(); c.moveTo(cx + s * R0, cy + co * R0);
      c.lineTo(cx + s * R1 + px * size * 0.7 * -1, cy + co * R1 + py * size * 0.7 * -1);
      c.lineTo(cx + s * R1 - px * size * 0.7 * -1, cy + co * R1 - py * size * 0.7 * -1); c.closePath();
      c.globalAlpha = alpha; if (fill) { c.fillStyle = '#fff'; c.fill(); } else c.stroke(); c.globalAlpha = 1;
    };
    tri(this.angle, true, this.ft >= T_START ? 0.85 : 0.4);
    if (this.hoverA != null && !this.drag) tri(this.hoverA, false, 0.35);
    if (this.queued != null) tri(this.queued, false, 0.9);

    // readouts
    const pos = (((Math.round(this.table) % 360) + 360) % 360);
    const lines = [['POS', pad3(pos) + '°', 0.9]];
    if (this.queued != null) lines.push(['NEXT', pad3(this.queued) + '°', 0.9]);
    else if (g.r > 40 || g.stacked) lines.push(['CMD', pad3(this.angle) + '°', 0.6]);
    if (g.stacked) {
      let y = cy - (lines.length - 1) * 8 + 3.5; const lx = cx + r + 26;
      for (const [k, v, a] of lines) { label(c, k, lx, y, 0.45); label(c, v, lx + 44, y, a); y += 16; }
      label(c, 'ESP32 → V5', this.w - 12, cy + 3.5 + (lines.length - 1) * 8, 0.3, 'right');
    } else {
      let y = cy + r + (r > 44 ? 52 : 30);
      for (const [k, v, a] of lines) { label(c, k, cx - 34, y, 0.45); label(c, v, cx + 34, y, a, 'right'); y += 16; }
      if (y < this.h - 4) label(c, 'ESP32 → V5', cx, y + 6, 0.3, 'center');
    }
  }
}

if (!customElements.get('as-wire-protocol')) customElements.define('as-wire-protocol', AsWireProtocol);
export { AsWireProtocol };

/* <as-segway-ride> — side view of the SYDE 351 human transporter riding open-loop until it tips.
 *
 * Phase 1 integrates the report's coupled nonlinear equations of motion (section 3.2) with RK4:
 *   C1 ẍ + mu·LG·cos(θ+β) θ̈ − mu·LG·sin(θ+β) θ̇² = F_T
 *   C4 θ̈ + mu·LG·cos(θ+β) ẍ − mu·g·LG·sin(θ+β) = 0
 *   C1 = M + (IG)w/R² + mu,  C4 = mu·LG² + (IG)u
 * with Table 1 values: M = 35 kg, mu = 50.5 kg, R = 0.127 m, LG = 1 m, (IG)u = 20 kg·m², (IG)w = 0.02 kg·m².
 * Thrust is constant (170 N, the force of the report's Simulink optimum) and the lean β is fixed; with no controller
 * the upright state is unstable, so it diverges and tips — the report's "distance before tipping" metric.
 * Each run picks β a hair off the balancing lean so the ride covers a few metres, falling forward or back.
 * Phase 2 (illustrative, not from the report): when the deck edge or rider meets the ground the body pivots
 * about that contact (angular momentum conserved through the impact) under gravity until it lands.
 * Body proportions follow Table 2 (legs 0.9 m, torso 0.9 m, head 0.2 m); handlebar shaft 1 m (Table 3).
 *
 * Interaction: click / tap pushes the rider (behind the rider → forward, in front → backward).
 * Attributes: paused (boolean). Methods: play(), pause(), push(dir = 1). Events: 'tip' {distance, direction}.
 * prefers-reduced-motion → a single still frame mid-ride.
 */

const MONO = '500 10px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const INK = '#f2efe9';
const P = { M: 35, mu: 50.5, R: 0.127, LG: 1.0, Iu: 20, Iw: 0.02, g: 9.81, F: 170 };
P.C1 = P.M + P.Iw / (P.R * P.R) + P.mu;
P.C4 = P.mu * P.LG * P.LG + P.Iu;
const BETA_EQ = Math.atan(P.F / (P.C1 * P.g)); // lean that balances the constant acceleration F/C1
const DT = 1 / 240;
const COL = {
  tyre: '#18191b', rim: '#7b8086', hub: '#a3a8ae', deck: '#2b2d31', deckTop: '#50545a', stem: '#9197a0', grip: '#202124',
  jacket: '#57606b', jacketDark: '#474e58', trousers: '#343a44', trousersBack: '#2a2f37', shoe: '#1c1c1e', skin: '#b5937a', hair: '#2b2521'
};
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const ease = v => { v = clamp(v); return v * v * (3 - 2 * v); };

// geometry in local frames: transporter frame (s forward, u up) rotated by θ; rider frame rotated by θ+β. Origin = axle.
const DECK = { s0: -0.14, s1: 0.14, u0: -0.035, u1: 0.025 };
const STEM = { s0: 0.13, u0: 0.02, s1: 0.4, u1: 0.98 };
const GRIP = [0.45, 1.0];
const RIDER_PTS = [[-0.13, 0.92], [0.15, 0.92], [0.15, 1.78], [-0.13, 1.78], [0.06, 0.48], [-0.05, 0.48], [0.03, 2.03], [0.13, 1.93], [-0.07, 1.95]];

function deriv(s, b, F) {
  const [, v, th, w] = s, c = Math.cos(th + b), sn = Math.sin(th + b);
  const a11 = P.C1, a12 = P.mu * P.LG * c, a21 = a12, a22 = P.C4;
  const b1 = F + P.mu * P.LG * sn * w * w, b2 = P.mu * P.g * P.LG * sn;
  const d = a11 * a22 - a12 * a21;
  return [v, (b1 * a22 - a12 * b2) / d, w, (a11 * b2 - a21 * b1) / d];
}
function rk4(s, b, F, h) {
  const k1 = deriv(s, b, F), s2 = s.map((v, i) => v + h / 2 * k1[i]);
  const k2 = deriv(s2, b, F), s3 = s.map((v, i) => v + h / 2 * k2[i]);
  const k3 = deriv(s3, b, F), s4 = s.map((v, i) => v + h * k3[i]);
  const k4 = deriv(s4, b, F);
  return s.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
// world position of a local point (s along forward, u along up) in a frame at origin (ox, oy) tilted by ang (positive = forward)
const W = (ox, oy, ang, s, u) => [ox + s * Math.cos(ang) + u * Math.sin(ang), oy - s * Math.sin(ang) + u * Math.cos(ang)];

/** all contact candidates for a pose; returns [{p:[x,y], r}] */
function contactPoints(ox, oy, th, b, includeWheel) {
  const out = [];
  for (const s of [DECK.s0, DECK.s1]) for (const u of [DECK.u0, DECK.u1]) out.push({ p: W(ox, oy, th, s, u), r: 0 });
  out.push({ p: W(ox, oy, th, STEM.s1, STEM.u1), r: 0.02 }, { p: W(ox, oy, th, GRIP[0], GRIP[1]), r: 0.03 });
  for (const [s, u] of RIDER_PTS) out.push({ p: W(ox, oy, th + b, s, u), r: 0.02 });
  out.push({ p: W(ox, oy, th + b, 0.03, 1.93), r: 0.1 });
  if (includeWheel) out.push({ p: [ox, oy], r: P.R });
  return out;
}
const lowest = pts => { let m = null; for (const c of pts) { const y = c.p[1] - c.r; if (!m || y < m.y) m = { y, c }; } return m; };

/** simulate phase 1 from rest; returns distance at first ground contact (or Infinity) */
function rideDistance(b, tMax = 8) {
  let s = [0, 0, 0, 0], t = 0;
  while (t < tMax) {
    s = rk4(s, b, P.F, DT); t += DT;
    if (Math.abs(s[2]) > 0.3 && lowest(contactPoints(s[0], P.R, s[2], b, false)).y <= 0) return s[0];
  }
  return Infinity;
}

class AsSegwayRide extends HTMLElement {
  static get observedAttributes() { return ['paused']; }
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:block;position:relative;width:100%;height:100%;min-height:200px;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer;touch-action:pan-y}</style><canvas role="img" aria-label="A rider on a two-wheeled transporter with constant thrust and a fixed lean rides a few metres, then tips over. Click to push."></canvas>';
    this.cv = root.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1; this._inView = false; this._playing = true; this._raf = 0;
    this._mq = matchMedia('(prefers-reduced-motion: reduce)');
    this._sync = this._sync.bind(this); this._tick = this._tick.bind(this);
    this.marks = []; this.camX = null; this.pushFx = null; this.runIdx = 0;
    this._newRun();
  }
  connectedCallback() {
    this._ro = new ResizeObserver(e => { const r = e[0].contentRect; this._resize(r.width, r.height); }); this._ro.observe(this);
    this._io = new IntersectionObserver(e => { this._inView = e[e.length - 1].isIntersecting; this._sync(); }, { rootMargin: '48px' }); this._io.observe(this);
    document.addEventListener('visibilitychange', this._sync); this._mq.addEventListener?.('change', this._sync);
    if (!this._bound) { this._bound = true; this.cv.addEventListener('pointerdown', e => this._onDown(e)); }
    this._playing = !this.hasAttribute('paused'); this._sync();
  }
  disconnectedCallback() { this._ro?.disconnect(); this._io?.disconnect(); document.removeEventListener('visibilitychange', this._sync); this._mq.removeEventListener?.('change', this._sync); cancelAnimationFrame(this._raf); this._raf = 0; }
  attributeChangedCallback(n, o, v) { if (n === 'paused') v === null ? this.play() : this.pause(); }
  play() { this._playing = true; this._sync(); }
  pause() { this._playing = false; this._sync(); }
  _sync() {
    if (this._mq.matches) { this._stillFrame(); this._render(); }
    const run = this._playing && this._inView && !document.hidden && !this._mq.matches;
    if (run && !this._raf) { this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); }
    else if (!run && this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
  }
  _resize(w, h) {
    this.w = Math.max(1, w); this.h = Math.max(1, h); this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr); this._render();
  }
  /* ------------------------------------------------------------------ simulation */
  _newRun() {
    // deterministic-ish variety: alternate targets, mostly forward falls
    const i = this.runIdx++, r = ((Math.sin(i * 12.9898 + 4.1) * 43758.5453) % 1 + 1) % 1;
    const dir = (i % 3 === 2) ? -1 : 1, target = 3.8 + 3.0 * r;
    let lo = Math.log(1e-8), hi = Math.log(0.08);
    for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2, d = rideDistance(BETA_EQ + dir * Math.exp(m)); if (d > target) lo = m; else hi = m; }
    this.beta = BETA_EQ + dir * Math.exp((lo + hi) / 2);
    this.s = [0, 0, 0, 0]; this.t = 0; this.phase = 'ready'; this.phaseT = 0; this.wheelA = 0; this.wheelW = 0; this.fade = 0;
    this.O = [0, P.R]; this.th = 0; this.tip = null;
  }
  _stillFrame() {
    if (this._still) return; this._still = true;
    this._newRun(); this.phase = 'ride'; this.fade = 1;
    for (let k = 0; k < 1.7 / DT; k++) this._stepRide(DT);
  }
  push(dir = 1) {
    if (this.phase === 'ready') { this.phase = 'ride'; this.phaseT = 0; }
    if (this.phase !== 'ride') return;
    this.s[3] += dir * 0.55; this.pushFx = { dir, t: 0 };
    this._kickOnce();
  }
  _kickOnce() { if (!this._raf && this._mq.matches) { this._still = false; } this._sync(); }
  _onDown(e) {
    if (this.phase !== 'ride' && this.phase !== 'ready') return;
    const r = this.cv.getBoundingClientRect(), x = e.clientX - r.left;
    const sx = this._toScreen ? this._toScreen(this.O[0] + Math.sin(this.th + this.beta) * 1.2, 0)[0] : this.w / 2;
    this.push(x < sx ? 1 : -1);
  }
  _stepRide(h) {
    this.s = rk4(this.s, this.beta, P.F, h); this.t += h;
    this.O = [this.s[0], P.R]; this.th = this.s[2]; this.wheelA = this.s[0] / P.R; this.wheelW = this.s[1] / P.R;
    if (Math.abs(this.th) > 0.25) {
      const lo = lowest(contactPoints(this.O[0], this.O[1], this.th, this.beta, false));
      if (lo.y <= 0) this._impact(lo.c);
    }
  }
  _impact(c) {
    const [x, v, th, w] = this.s, b = this.beta, Pp = [c.p[0], 0];
    const O = [x, P.R], a = th + b, G = [x + P.LG * Math.sin(a), P.R + P.LG * Math.cos(a)];
    const vO = [v, 0], vG = [v + P.LG * Math.cos(a) * w, -P.LG * Math.sin(a) * w];
    const cr = (r, u) => r[0] * u[1] - r[1] * u[0];
    const rG = [G[0] - Pp[0], G[1] - Pp[1]], rO = [O[0] - Pp[0], O[1] - Pp[1]];
    const H = P.Iu * (-w) + P.mu * cr(rG, vG) + P.M * cr(rO, vO);
    this.Ip = P.Iu + P.mu * (rG[0] ** 2 + rG[1] ** 2) + P.M * (rO[0] ** 2 + rO[1] ** 2);
    this.piv = Pp; this.psi = 0; this.psiDot = H / this.Ip; this.O0 = O; this.G0 = G; this.th0 = th;
    this.tip = { x, dir: Math.sign(th) || 1 };
    this.marks.push(x); if (this.marks.length > 4) this.marks.shift();
    this.phase = 'fall'; this.phaseT = 0;
    this.dispatchEvent(new CustomEvent('tip', { detail: { distance: x, direction: th > 0 ? 'forward' : 'backward' }, bubbles: true }));
  }
  _stepFall(h) {
    // rigid body pivoting about the contact point under gravity (CCW-positive ψ)
    const rot = (p, ang) => { const c = Math.cos(ang), s = Math.sin(ang), dx = p[0] - this.piv[0], dy = p[1] - this.piv[1]; return [this.piv[0] + dx * c - dy * s, this.piv[1] + dx * s + dy * c]; };
    const O = rot(this.O0, this.psi), G = rot(this.G0, this.psi);
    const tau = -P.g * (P.mu * (G[0] - this.piv[0]) + P.M * (O[0] - this.piv[0]));
    this.psiDot += tau / this.Ip * h; const npsi = this.psi + this.psiDot * h;
    const nO = rot(this.O0, npsi), nth = this.th0 - npsi;
    // stop when another part of the body reaches the ground
    const pts = contactPoints(nO[0], nO[1], nth, this.beta, true).filter(c => Math.hypot(c.p[0] - this.piv[0], c.p[1] - this.piv[1]) > 0.08);
    const lo = lowest(pts);
    if (lo.y <= 0 || Math.abs(npsi) > 2) { this.phase = 'down'; this.phaseT = 0; this.psiDot = 0; return; }
    this.psi = npsi; this.O = nO; this.th = nth;
    this.wheelW *= Math.exp(-h * 1.5); this.wheelA += this.wheelW * h;
  }
  _tick(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this._last) / 1000)); this._last = now;
    this.phaseT += dt;
    if (this.pushFx) { this.pushFx.t += dt; if (this.pushFx.t > 0.7) this.pushFx = null; }
    switch (this.phase) {
      case 'ready': this.fade = Math.min(1, this.fade + dt / 0.4); if (this.phaseT > 0.9) { this.phase = 'ride'; this.phaseT = 0; } break;
      case 'ride': for (let k = Math.round(dt / DT); k > 0 && this.phase === 'ride'; k--) this._stepRide(DT); if (this.t > 9) this._newRun(); break;
      case 'fall': for (let k = Math.round(dt / DT); k > 0 && this.phase === 'fall'; k--) this._stepFall(DT); break;
      case 'down': this.wheelW *= Math.exp(-dt * 1.5); this.wheelA += this.wheelW * dt; if (this.phaseT > 1.8) { this.phase = 'out'; this.phaseT = 0; } break;
      case 'out': this.fade = Math.max(0, 1 - this.phaseT / 0.45); if (this.phaseT > 0.5) this._newRun(); break;
    }
    this._render();
    this._raf = requestAnimationFrame(this._tick);
  }
  /* ------------------------------------------------------------------ drawing */
  _render() {
    if (!this.w || !this.h) return;
    const c = this.ctx, w = this.w, h = this.h;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, w, h);
    const ppm = Math.min(h * 0.5 / 2.05, w / 5), gy = Math.round(h * 0.8) + 0.5;
    const viewM = w / ppm, lead = Math.min(2.2, viewM * 0.3);
    // camera: fixed when the whole run fits, otherwise follow the rider
    let target = -lead;
    if (viewM < 9) target = Math.max(-lead, this.O[0] - viewM * 0.42);
    if (this.camX === null || this.phase === 'ready') this.camX = target;
    this.camX += (target - this.camX) * 0.08;
    const X = m => (m - this.camX) * ppm, Y = m => gy - m * ppm;
    this._toScreen = (mx, my) => [X(mx), Y(my)];
    // ground + metre ticks
    c.font = MONO; c.textBaseline = 'alphabetic';
    c.strokeStyle = INK; c.lineWidth = 1; c.globalAlpha = 0.28; c.beginPath(); c.moveTo(0, gy); c.lineTo(w, gy); c.stroke();
    const m0 = Math.floor(this.camX), m1 = Math.ceil(this.camX + viewM);
    c.globalAlpha = 0.16; c.beginPath();
    for (let m = m0; m <= m1; m++) { if (m < 0) continue; const x = Math.round(X(m)) + 0.5; c.moveTo(x, gy); c.lineTo(x, gy + (m % 5 ? 4 : 7)); }
    c.stroke();
    c.fillStyle = INK; c.textAlign = 'center';
    for (let m = Math.max(0, m0); m <= m1; m++) { c.globalAlpha = m === 0 ? 0.5 : 0.28; c.fillText(m === 0 ? '0 m' : String(m), X(m), gy + 19); }
    // previous tip distances
    for (let i = 0; i < this.marks.length; i++) { const x = Math.round(X(this.marks[i])) + 0.5; c.globalAlpha = 0.1 + 0.07 * i; c.beginPath(); c.moveTo(x, gy - 9); c.lineTo(x, gy); c.stroke(); }
    c.globalAlpha = 1;
    const f = ease(this.fade);
    c.save(); c.globalAlpha = f;
    if (this.tip) {
      const x = Math.round(X(this.tip.x)) + 0.5; c.setLineDash([2, 3]); c.globalAlpha = 0.55 * f; c.beginPath(); c.moveTo(x, gy - 2.2 * ppm); c.lineTo(x, gy); c.stroke(); c.setLineDash([]);
      c.globalAlpha = 0.85 * f; c.textAlign = this.tip.dir > 0 ? 'right' : 'left'; c.fillText('TIPPED AT ' + this.tip.x.toFixed(2) + ' m', x + (this.tip.dir > 0 ? -6 : 6), gy - 2.2 * ppm + 10);
    }
    c.globalAlpha = f;
    this._drawRig(c, X, Y, ppm);
    c.restore();
    this._hud(c, f);
  }
  _drawRig(c, X, Y, ppm) {
    const [ox, oy] = this.O, th = this.th, al = th + this.beta;
    const T = (s, u) => { const p = W(ox, oy, th, s, u); return [X(p[0]), Y(p[1])]; };
    const Rr = (s, u) => { const p = W(ox, oy, al, s, u); return [X(p[0]), Y(p[1])]; };
    const quad = (pts, fill) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = fill; c.fill(); };
    const limb = (a, b, wM, col) => { c.strokeStyle = col; c.lineWidth = Math.max(1.5, wM * ppm); c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
    // contact shadow
    const sh = Math.max(0, 1 - (oy - P.R) * 3);
    if (sh > 0) { c.save(); c.globalAlpha *= 0.35 * sh; c.fillStyle = '#000'; c.beginPath(); c.ellipse(X(ox), Y(0) - 1, 0.32 * ppm, 0.035 * ppm, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    // far-side leg (behind the stem)
    const hip = Rr(-0.01, 0.93), kneeB = Rr(0.0, 0.48), footB = Rr(-0.03, 0.06);
    limb(hip, kneeB, 0.13, COL.trousersBack); limb(kneeB, footB, 0.12, COL.trousersBack);
    // stem + grip (transporter frame)
    limb(T(STEM.s0, STEM.u0), T(STEM.s1, STEM.u1), 0.032, COL.stem);
    limb(T(STEM.s1 - 0.02, STEM.u1 - 0.01), T(GRIP[0], GRIP[1]), 0.045, COL.grip);
    // wheel
    const wc = [X(ox), Y(oy)], rp = P.R * ppm;
    c.fillStyle = COL.tyre; c.beginPath(); c.arc(wc[0], wc[1], rp, 0, Math.PI * 2); c.fill();
    c.fillStyle = COL.rim; c.beginPath(); c.arc(wc[0], wc[1], rp * 0.68, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3c3f44'; c.beginPath(); c.arc(wc[0], wc[1], rp * 0.56, 0, Math.PI * 2); c.fill();
    c.strokeStyle = COL.rim; c.lineWidth = Math.max(1, rp * 0.12); c.beginPath();
    for (let k = 0; k < 5; k++) { const a = this.wheelA + k * Math.PI * 2 / 5; c.moveTo(wc[0], wc[1]); c.lineTo(wc[0] + Math.cos(a) * rp * 0.6, wc[1] + Math.sin(a) * rp * 0.6); }
    c.stroke();
    c.fillStyle = COL.hub; c.beginPath(); c.arc(wc[0], wc[1], rp * 0.16, 0, Math.PI * 2); c.fill();
    // deck
    quad([T(DECK.s0, DECK.u0), T(DECK.s1, DECK.u0), T(DECK.s1, DECK.u1), T(DECK.s0, DECK.u1)], COL.deck);
    limb(T(DECK.s0 + 0.01, DECK.u1), T(DECK.s1 - 0.01, DECK.u1), 0.012, COL.deckTop);
    // near leg, shoes
    const kneeF = Rr(0.06, 0.48), footF = Rr(0.03, 0.06);
    limb(hip, kneeF, 0.14, COL.trousers); limb(kneeF, footF, 0.125, COL.trousers);
    quad([Rr(-0.07, 0.03), Rr(0.17, 0.03), Rr(0.15, 0.09), Rr(-0.06, 0.09)], COL.shoe);
    // torso (rounded) and head
    c.save(); const tc = Rr(0.01, 1.35); c.translate(tc[0], tc[1]); c.rotate(al);
    c.fillStyle = COL.jacket; c.beginPath(); c.roundRect(-0.14 * ppm, -0.45 * ppm, 0.28 * ppm, 0.88 * ppm, 0.07 * ppm); c.fill();
    c.fillStyle = COL.jacketDark; c.fillRect(-0.14 * ppm, 0.36 * ppm, 0.28 * ppm, 0.06 * ppm);
    c.restore();
    limb(Rr(0.02, 1.76), Rr(0.03, 1.83), 0.07, COL.skin); // neck
    const hc = Rr(0.03, 1.93); c.fillStyle = COL.skin; c.beginPath(); c.arc(hc[0], hc[1], 0.1 * ppm, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(hc[0], hc[1]); c.rotate(al); c.fillStyle = COL.hair; c.beginPath(); c.arc(0, 0, 0.106 * ppm, Math.PI * 0.75, Math.PI * 1.85); c.closePath(); c.fill(); c.restore();
    // near arm: 2-link IK from shoulder to grip, elbow bending back/down
    const sh0 = Rr(0.03, 1.68), gp = T(GRIP[0], GRIP[1]);
    const L1 = 0.34 * ppm, L2 = 0.33 * ppm, dx = gp[0] - sh0[0], dy = gp[1] - sh0[1], d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01);
    const base = Math.atan2(dy, dx), cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), A = Math.acos(cosA);
    const el = [sh0[0] + Math.cos(base + A) * L1, sh0[1] + Math.sin(base + A) * L1];
    const hand = [sh0[0] + Math.cos(base) * d, sh0[1] + Math.sin(base) * d];
    limb(sh0, el, 0.095, COL.jacketDark); limb(el, hand, 0.08, COL.jacketDark);
    c.fillStyle = COL.skin; c.beginPath(); c.arc(hand[0], hand[1], 0.045 * ppm, 0, Math.PI * 2); c.fill();
    // thrust arrow at the axle while riding
    if (this.phase === 'ride' || this.phase === 'ready') {
      const on = this.phase === 'ride' ? 1 : 0.4, ax = wc[0] + rp * 1.6, ay = wc[1];
      c.save(); c.globalAlpha *= 0.55 * on; c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 0.35 * ppm, ay); c.moveTo(ax + 0.35 * ppm - 5, ay - 3.5); c.lineTo(ax + 0.35 * ppm, ay); c.lineTo(ax + 0.35 * ppm - 5, ay + 3.5); c.stroke();
      c.fillStyle = INK; c.font = MONO; c.textAlign = 'left'; c.fillText('F', ax + 0.35 * ppm + 4, ay + 3.5); c.restore();
    }
    // push cue
    if (this.pushFx) {
      const k = this.pushFx.t / 0.7, p = Rr(this.pushFx.dir > 0 ? -0.3 : 0.4, 1.45), dir = this.pushFx.dir;
      c.save(); c.globalAlpha *= 0.8 * (1 - k); c.strokeStyle = INK; c.lineWidth = 1.2; const x0 = p[0] - dir * (18 - 10 * k), x1 = x0 + dir * 16;
      c.beginPath(); c.moveTo(x0, p[1]); c.lineTo(x1, p[1]); c.moveTo(x1 - dir * 5, p[1] - 4); c.lineTo(x1, p[1]); c.lineTo(x1 - dir * 5, p[1] + 4); c.stroke(); c.restore();
    }
  }
  _hud(c, f) {
    const x = 16, y = 22; c.font = MONO; c.textAlign = 'left'; c.fillStyle = INK;
    const deg = r => (r * 180 / Math.PI).toFixed(1) + '°';
    c.globalAlpha = 0.45; c.fillText('F_T ' + P.F + ' N   β ' + deg(this.beta) + '   NO CONTROLLER', x, y);
    c.globalAlpha = 0.8; c.fillText('x ' + this.O[0].toFixed(2).padStart(5, ' ') + ' m   ẋ ' + (this.phase === 'ride' ? this.s[1] : 0).toFixed(2) + ' m/s   θ ' + deg(this.th), x, y + 16);
    if (this.phase === 'ready' && this.runIdx <= 2) { c.globalAlpha = 0.4 * f; c.textAlign = 'right'; c.fillText('CLICK TO PUSH', this.w - 16, y); }
    c.globalAlpha = 1;
  }
}
if (!customElements.get('as-segway-ride')) customElements.define('as-segway-ride', AsSegwayRide);
export { AsSegwayRide, rideDistance, BETA_EQ, P as SEGWAY_PARAMS };

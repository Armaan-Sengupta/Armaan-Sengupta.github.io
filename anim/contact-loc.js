// <as-contact-loc>: torque-based contact localization on a Franka-Panda-like arm (side view, planar).
// An external force is injected on a link; the joints proximal to that link feel torque (τ = r × F).
// A contact-particle-filter-style estimator scores every point on the arm surface: for each candidate it
// fits the force that best explains the measured (noisy) joint torques, constrained to a friction cone
// pushing into the surface, and accumulates the likelihood. The belief (blue along the surface) collapses
// onto the true contact (coral arrow); the crosshair is the running estimate.
//
// API: no attributes required. Loops through random contacts every ~6 s. Click / tap the arm to inject a
// contact at the nearest surface point. Pauses offscreen / when document.hidden; prefers-reduced-motion
// renders one converged still frame. Event: 'contact' {detail:{link, errorMm}} when an estimate settles.
// Out-of-plane joints (τ1, τ3, τ5, τ7) see only sensor noise because the force is in the drawing plane.

const MONO = '500 9.5px "JetBrains Mono", ui-monospace, monospace';
const ARM = '#c9c6bf', ARM_EDGE = 'rgba(8,8,10,.55)', CAP = '#1c1d1f';
const FORCE = '#cf6a4c', EST = '#8fb8c9';
const CYCLE = 6.2, STEP = 1 / 30, SIGMA_TAU = 0.25, CONE = 0.05;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const u = a => [Math.cos(a), Math.sin(a)];
const add = (p, d, k = 1) => [p[0] + d[0] * k, p[1] + d[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = a => Math.hypot(a[0], a[1]);
const cross = (r, F) => r[0] * F[1] - r[1] * F[0];
const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
function gauss(rng) { let s = 0; for (let i = 0; i < 4; i++) s += rng(); return (s - 2) * 1.732; }

// Franka link proportions (m): d1 .333, d3 .316, a4 .0825, d5 .384, a7 .088, flange .107
function pose(t) {
  const w = 2 * Math.PI / 14;
  const th1 = 1.12 + 0.07 * Math.sin(w * t);
  const th2 = th1 - 1.22 + 0.09 * Math.sin(w * t * 1.3 + 1.1);
  const th3 = th2 - 1.38 + 0.08 * Math.sin(w * t * 0.9 + 2.3);
  const J2 = [0, 0.333];
  const A = add(J2, u(th1), 0.316), J4 = add(A, u(th1 - Math.PI / 2), 0.0825);
  const J6 = add(J4, u(th2), 0.384), W = add(J6, u(th2), 0.088), E = add(W, u(th3), 0.15);
  const caps = [
    { a: [0, 0.07], b: J2, r: 0.068, link: 0 },
    { a: J2, b: A, r: 0.062, link: 1 },
    { a: A, b: J4, r: 0.058, link: 1 },
    { a: J4, b: J6, r: 0.054, link: 2 },
    { a: J6, b: W, r: 0.050, link: 2 },
    { a: W, b: E, r: 0.040, link: 3 }
  ];
  return { J: [J2, J4, J6], caps, th3, E, W };
}

// fixed surface parameterisation: per capsule, samples along its stadium outline
function buildCandidates(p0) {
  const out = [];
  p0.caps.forEach((c, ci) => {
    if (c.link === 0) return;
    const L = len(sub(c.b, c.a)), per = 2 * L + 2 * Math.PI * c.r, n = Math.round(per / 0.007);
    for (let k = 0; k < n; k++) out.push({ ci, s: (k / n) * per, link: c.link });
  });
  return out;
}
function surfacePoint(c, s) {
  const d = sub(c.b, c.a), L = len(d), t = [d[0] / L, d[1] / L], nrm = [-t[1], t[0]], pr = Math.PI * c.r;
  if (s < L) return { p: add(add(c.a, t, s), nrm, c.r), n: nrm };
  s -= L;
  if (s < pr) { const a = Math.atan2(nrm[1], nrm[0]) - s / c.r, n = u(a); return { p: add(c.b, n, c.r), n }; }
  s -= pr;
  if (s < L) { const m = [-nrm[0], -nrm[1]]; return { p: add(add(c.b, t, -s), m, c.r), n: m }; }
  s -= L; { const a = Math.atan2(-nrm[1], -nrm[0]) - s / c.r, n = u(a); return { p: add(c.a, n, c.r), n }; }
}
function insideCap(p, c, m) { const d = sub(c.b, c.a), L2 = dot(d, d), t = clamp(dot(sub(p, c.a), d) / L2); return len(sub(p, add(c.a, d, t))) < c.r - m; }

class ContactLoc extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:block;position:relative;width:100%;height:100%}canvas{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;touch-action:manipulation}</style><canvas aria-label="Robot arm: an external force is applied to a link, joint torques respond, and an estimate converges on the contact point."></canvas>';
    this.cv = root.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cands = buildCandidates(pose(0)); this.logb = new Float32Array(this.cands.length); this.bel = new Float32Array(this.cands.length);
    this.seed = 7; this.rng = () => { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; };
    this.t = 0; this.ct = 0; this.acc = 0; this.visible = false; this.running = false;
    this.tauShow = new Float32Array(7); this.est = null; this.estR = 0.2; this.settled = false;
    this.newContact();
  }
  connectedCallback() {
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.visible ? this.play() : this.pause(); }); this.io.observe(this);
    this.onVis = () => (document.hidden ? this.pause() : this.visible && this.play()); document.addEventListener('visibilitychange', this.onVis);
    this.onDown = e => this.click(e); this.cv.addEventListener('pointerdown', this.onDown);
    if (this.reduce) { for (let i = 0; i < 90; i++) this.step(STEP, true); }
  }
  disconnectedCallback() { this.ro.disconnect(); this.io.disconnect(); document.removeEventListener('visibilitychange', this.onVis); this.cv.removeEventListener('pointerdown', this.onDown); this.pause(); }
  play() { if (this.running || this.reduce) { this.render(); return; } this.running = true; this.last = 0; const loop = now => { if (!this.running) return; const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0; this.last = now; this.advance(dt); this.render(); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  pause() { this.running = false; cancelAnimationFrame(this.raf); }
  resize() { const r = this.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); this.W = r.width; this.H = r.height; this.cv.width = Math.max(1, Math.round(r.width * d)); this.cv.height = Math.max(1, Math.round(r.height * d)); this.ctx.setTransform(d, 0, 0, d, 0, 0); this.render(); }

  frame() { // world box x[-0.24,0.86] y[-0.03,0.86]
    const W = this.W || 1, H = this.H || 1, bw = 1.0, bh = 0.86, s = Math.min(W / bw, H / bh) * 0.94;
    return { s, ox: (W - bw * s) / 2 + 0.16 * s, oy: (H + bh * s) / 2 - 0.02 * s };
  }
  toScr(p, f) { return [f.ox + p[0] * f.s, f.oy - p[1] * f.s]; }

  newContact(idx) {
    const P = pose(this.t);
    if (idx === undefined) { // random spot on forearm / wrist / hand, avoiding hidden points
      // demo contacts: forearm / wrist / hand, with a usable lever arm about the last loaded joint (a force whose
      // line passes through that joint is indistinguishable from one on the previous link)
      for (let k = 0; k < 200; k++) {
        const i = Math.floor(this.rng() * this.cands.length), c = this.cands[i];
        if (c.link < 2 || !this.valid(i, P)) continue;
        const q = surfacePoint(P.caps[c.ci], c.s), arm = Math.abs(cross(sub(q.p, P.J[c.link - 1]), [-q.n[0], -q.n[1]]));
        if (arm > 0.07) { idx = i; break; }
      }
      if (idx === undefined) idx = this.cands.findIndex(c => c.link === 2);
    }
    this.contact = { idx, mag: 18 + 12 * this.rng(), ang: (this.rng() - 0.5) * 0.06 };
    this.logb.fill(0); this.ct = 0; this.settled = false; this.estR = 0.12; this.est = null;
  }
  valid(i, P) { const c = this.cands[i], sp = surfacePoint(P.caps[c.ci], c.s); return !P.caps.some((k, j) => j !== c.ci && insideCap(sp.p, k, 0.004)) && sp.p[1] > 0.075; }
  click(e) {
    const r = this.cv.getBoundingClientRect(), f = this.frame(), w = [(e.clientX - r.left - f.ox) / f.s, (f.oy - (e.clientY - r.top)) / f.s];
    const P = pose(this.t); let best = -1, bd = 1e9;
    this.cands.forEach((c, i) => { if (!this.valid(i, P)) return; const d = len(sub(surfacePoint(P.caps[c.ci], c.s).p, w)); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { this.newContact(best); if (this.reduce) { for (let i = 0; i < 90; i++) this.step(STEP, true); this.render(); } }
  }

  forceState() { const c = this.ct; return c < 0.35 ? smooth(c / 0.35) : c < 4.9 ? 1 : c < 5.5 ? 1 - smooth((c - 4.9) / 0.6) : 0; }
  advance(dt) { this.acc += dt; while (this.acc >= STEP) { this.acc -= STEP; this.step(STEP, false); } }
  step(dt, frozen) {
    if (!frozen) { this.t += dt; this.ct += dt; if (this.ct > CYCLE) this.newContact(); }
    else this.ct = Math.max(this.ct, 2.5);
    const P = pose(this.t), k = this.forceState();
    const cc = this.cands[this.contact.idx], sp = surfacePoint(P.caps[cc.ci], cc.s);
    const dir = rot([-sp.n[0], -sp.n[1]], this.contact.ang), F = [dir[0] * this.contact.mag * k, dir[1] * this.contact.mag * k];
    this.cur = { P, sp, dir, k, F };
    // measured torques (planar joints J2, J4, J6 = τ2, τ4, τ6)
    const tau = [0, 0, 0];
    for (let j = 0; j < 3; j++) if (cc.link >= j + 1) tau[j] = cross(sub(sp.p, P.J[j]), F);
    const meas = tau.map(v => v + SIGMA_TAU * gauss(this.rng));
    const full = [SIGMA_TAU * 0.5 * gauss(this.rng), meas[0], SIGMA_TAU * 0.5 * gauss(this.rng), meas[1], SIGMA_TAU * 0.5 * gauss(this.rng), meas[2], SIGMA_TAU * 0.4 * gauss(this.rng)];
    for (let i = 0; i < 7; i++) this.tauShow[i] += (full[i] - this.tauShow[i]) * 0.35;
    if (k < 0.5 || this.ct > 5.0) return;
    // contact-particle-filter style update over all surface candidates
    let mx = -1e9;
    for (let i = 0; i < this.cands.length; i++) {
      const c = this.cands[i];
      if (!this.valid(i, P)) { this.logb[i] = -60; continue; }
      const q = surfacePoint(P.caps[c.ci], c.s), rows = [];
      for (let j = 0; j < 3; j++) { const r = sub(q.p, P.J[j]); rows.push(c.link >= j + 1 ? [-r[1], r[0]] : [0, 0]); }
      const nin = [-q.n[0], -q.n[1]];
      const fitAlong = e => { let num = 0, den = 0; for (let j = 0; j < 3; j++) { const a = dot(rows[j], e); num += a * meas[j]; den += a * a; } const m = den > 1e-9 ? Math.max(0, num / den) : 0; let r2 = 0; for (let j = 0; j < 3; j++) { const d = dot(rows[j], e) * m - meas[j]; r2 += d * d; } return r2; };
      // free least-squares fit, then clip to the friction cone
      let a = 0, b = 0, d = 0, v0 = 0, v1 = 0;
      for (let j = 0; j < 3; j++) { const R = rows[j]; a += R[0] * R[0]; b += R[0] * R[1]; d += R[1] * R[1]; v0 += R[0] * meas[j]; v1 += R[1] * meas[j]; }
      a += 1e-6; d += 1e-6; const det = a * d - b * b;
      let r2;
      const Fh = [(d * v0 - b * v1) / det, (a * v1 - b * v0) / det], fl = len(Fh);
      if (fl > 1e-6 && dot(Fh, nin) / fl >= Math.cos(CONE)) { r2 = 0; for (let j = 0; j < 3; j++) { const e = dot(rows[j], Fh) - meas[j]; r2 += e * e; } }
      else r2 = Math.min(fitAlong(rot(nin, CONE)), fitAlong(rot(nin, -CONE)));
      this.logb[i] = 0.97 * this.logb[i] - 0.2 * r2 / (2 * SIGMA_TAU * SIGMA_TAU);
      if (this.logb[i] > mx) mx = this.logb[i];
    }
    let sum = 0, best = 0;
    for (let i = 0; i < this.cands.length; i++) { const p = Math.exp(this.logb[i] - mx); this.bel[i] = p; sum += p; if (p > this.bel[best]) best = i; }
    // estimate = belief-weighted mean near the MAP point; spread = global weighted radius
    const bp = surfacePoint(P.caps[this.cands[best].ci], this.cands[best].s).p;
    let wx = 0, wy = 0, ws = 0, sr = 0;
    for (let i = 0; i < this.cands.length; i++) {
      const w = this.bel[i] / sum; if (w < 1e-5) continue;
      const q = surfacePoint(P.caps[this.cands[i].ci], this.cands[i].s).p, dd = len(sub(q, bp));
      if (dd < 0.08) { wx += w * q[0]; wy += w * q[1]; ws += w; sr += w * dd * dd; }
    }
    const e = [wx / ws, wy / ws];
    this.est = this.est ? add(this.est, sub(e, this.est), 0.25) : e;
    this.estR += (clamp(2 * Math.sqrt(sr / ws) + 0.25 * (1 - ws), 0.012, 0.12) - this.estR) * 0.15;
    this.err = len(sub(this.est, sp.p));
    if (!this.settled && this.ct > 2.6) { this.settled = true; this.dispatchEvent(new CustomEvent('contact', { detail: { link: cc.link, errorMm: Math.round(this.err * 1000) } })); }
  }

  drawCap(c, f, ctx) {
    const a = this.toScr(c.a, f), b = this.toScr(c.b, f), r = c.r * f.s, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.beginPath(); ctx.arc(a[0], a[1], r, ang + Math.PI / 2, ang + 1.5 * Math.PI); ctx.arc(b[0], b[1], r, ang - Math.PI / 2, ang + Math.PI / 2); ctx.closePath();
  }
  render() {
    const ctx = this.ctx, W = this.W, H = this.H; if (!W || !H) return;
    if (!this.cur) this.step(0, this.reduce);
    ctx.clearRect(0, 0, W, H);
    const f = this.frame(), { P, sp, dir, k, F } = this.cur, s = f.s;
    // floor + plinth
    const fl = this.toScr([-0.16, 0], f), fr = this.toScr([0.84, 0], f);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fl[0], fl[1] + 0.5); ctx.lineTo(fr[0], fr[1] + 0.5); ctx.stroke();
    const pb = this.toScr([-0.11, 0.075], f); ctx.fillStyle = '#a9a69f'; ctx.fillRect(pb[0], pb[1], 0.22 * s, 0.075 * s);
    // links
    const g = ctx.createLinearGradient(0, f.oy - 0.9 * s, 0, f.oy); g.addColorStop(0, '#d6d3cc'); g.addColorStop(1, '#b3b0a9');
    ctx.lineWidth = 1.2; ctx.strokeStyle = ARM_EDGE;
    P.caps.forEach(c => { this.drawCap(c, f, ctx); ctx.fillStyle = g; ctx.fill(); ctx.stroke(); });
    // gripper fingers
    const t3 = u(P.th3), n3 = [-t3[1], t3[0]];
    ctx.fillStyle = '#9d9a94';
    for (const sgn of [-1, 1]) { const base = add(add(P.E, n3, sgn * 0.022), t3, -0.005); const tip = add(base, t3, 0.055); const a = this.toScr(base, f), b = this.toScr(tip, f); ctx.lineCap = 'round'; ctx.strokeStyle = '#8d8a84'; ctx.lineWidth = 0.014 * s; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.lineCap = 'butt';
    // joint caps (pitch joints, dark like the Panda's)
    P.J.forEach((j, i) => { const q = this.toScr(j, f), r = [0.047, 0.044, 0.04][i] * s; ctx.fillStyle = CAP; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(q[0], q[1], r * 0.62, 0, 7); ctx.stroke(); });
    // belief along the surface
    const active = k > 0.02 && this.ct > 0.3 && this.ct < 5.6;
    const fade = this.ct < 5.0 ? 1 : 1 - smooth((this.ct - 5.0) / 0.5);
    if (active && this.est) {
      let bm = 0; for (let i = 0; i < this.bel.length; i++) bm = Math.max(bm, this.bel[i]);
      ctx.fillStyle = EST;
      for (let i = 0; i < this.cands.length; i++) {
        const w = this.bel[i] / bm; if (w < 0.02) continue;
        const c = this.cands[i], q = surfacePoint(P.caps[c.ci], c.s), p = this.toScr(add(q.p, q.n, 0.006), f);
        ctx.globalAlpha = fade * Math.pow(w, 0.6) * 0.9; ctx.beginPath(); ctx.arc(p[0], p[1], 1.1 + 1.6 * w, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // force arrow (tail outside the surface, head on the contact point)
    if (k > 0.01) {
      const L = (0.07 + 0.08 * this.contact.mag / 30) * k, tip = this.toScr(sp.p, f), tail = this.toScr(add(sp.p, dir, -L), f);
      const ang = Math.atan2(tip[1] - tail[1], tip[0] - tail[0]), h = 7;
      ctx.globalAlpha = k; ctx.strokeStyle = FORCE; ctx.fillStyle = FORCE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(tip[0] - Math.cos(ang) * h, tip[1] - Math.sin(ang) * h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] - Math.cos(ang - 0.42) * h * 1.4, tip[1] - Math.sin(ang - 0.42) * h * 1.4); ctx.lineTo(tip[0] - Math.cos(ang + 0.42) * h * 1.4, tip[1] - Math.sin(ang + 0.42) * h * 1.4); ctx.closePath(); ctx.fill();
      ctx.font = MONO; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(207,106,76,.9)';
      const lab = `${(this.contact.mag * k).toFixed(0)} N`, tw = ctx.measureText(lab).width, lx = tail[0] - Math.cos(ang) * 12 - (Math.cos(ang) > 0 ? tw : 0) * (Math.abs(Math.cos(ang)) > .3 ? 1 : .5);
      ctx.fillText(lab, lx, tail[1] - Math.sin(ang) * 12);
      ctx.globalAlpha = 1;
    }
    // estimate crosshair
    if (active && this.est) {
      const p = this.toScr(this.est, f), r = Math.max(6, this.estR * s);
      ctx.globalAlpha = fade; ctx.strokeStyle = EST; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.stroke();
      ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(p[0] + dx * (r + 3), p[1] + dy * (r + 3)); ctx.lineTo(p[0] + dx * (r + 8), p[1] + dy * (r + 8)); } ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // joint torque bars (bottom right)
    const bw = Math.min(110, W * 0.2), rowH = clamp(H * 0.03, 6.5, 10), bx = W - bw - 12, by = H - 10 - rowH * 7, mid = bx + bw / 2, full = 12;
    ctx.font = H < 280 ? MONO.replace('9.5px', '8px') : MONO; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.moveTo(mid + 0.5, by - 2); ctx.lineTo(mid + 0.5, by + rowH * 7 - 2); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const v = this.tauShow[i], y = by + i * rowH, wv = clamp(v / full, -1, 1) * bw / 2, planar = i % 2 === 1;
      ctx.fillStyle = 'rgba(242,239,233,.42)'; ctx.textAlign = 'right'; ctx.fillText(`τ${i + 1}`, bx - 6, y + rowH * 0.3);
      ctx.fillStyle = planar && Math.abs(v) > 1 ? 'rgba(242,239,233,.78)' : 'rgba(242,239,233,.32)';
      ctx.fillRect(Math.min(mid, mid + wv), y, Math.max(1, Math.abs(wv)), rowH * 0.6);
    }
        // HUD
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(242,239,233,.5)';
    const txt = active && this.est ? (this.ct > 2.2 ? `contact est. · err ${Math.round(this.err * 1000)} mm` : 'localizing…') : 'awaiting contact · tap the arm';
    ctx.fillText(txt, 12, 15);
    ctx.fillStyle = 'rgba(242,239,233,.32)'; ctx.fillText('joint torque · ±12 N·m', 12, 28);
  }
}
if (!customElements.get('as-contact-loc')) customElements.define('as-contact-loc', ContactLoc);
export { ContactLoc };

/* <as-airbrakes> — Waterloo Rocketry (Borealis) airbrake cam-slot mechanism, Three.js.
 *
 * One servo turns a trilobed cam plate; three Archimedean slots (0.78 in of radial travel per 90 deg)
 * drive the shoulder-bolt/bearing followers of three sector panels that ride MGN linear rails on a
 * pocketed aluminium bulkhead. Geometry lives in ./geometry.js (shared with <as-flight-control>).
 *
 * Attributes / properties
 *   view="mechanism" | "top" | "airframe"   camera + airframe shell, smooth transition (default mechanism)
 *   view="journey"   one scroll-driven story (progress 0..1): panels deploy on the bench, retract while the camera pulls
 *                    back into the airframe, then deploy into a CFD-style air stream that also flows around the cursor
 *   progress  0..1   scroll-scrubbed deployment. Once set, it drives the panels (autoplay is ignored).
 *   extension 0..1   direct deployment (same as progress, unsmoothed)
 *   autoplay, loop   cycle retract → deploy → hold → retract while no progress is supplied
 *   controls         show a small play/scrub bar (off by default)
 *   nohud            hide the mono readout (cam angle, panel travel)
 *   clean            accepted for compatibility (no titles are drawn either way)
 * Methods: play(), pause(), seek(seconds), setExtension(f).  Events: 'ready'.
 * Colours: machined 6061 aluminium (cam, panels, bulkhead), black-oxide rails and fasteners,
 * MGN carriages with red end caps / green seals, brass shim washers, black servo with purple label.
 */
import * as THREE from '../shared/vendor/three.module.min.js';
import * as G from './geometry.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const VIEWS = {
  //            azimuth  elevation  distance  target-y  airframe opacity
  mechanism: { az: -0.55, el: 0.62, d: 15.5, ty: 0.15, shell: 0 },
  top:       { az: -Math.PI / 2, el: 1.38, d: 15.5, ty: 0.4, shell: 0 },
  airframe:  { az: -Math.PI, el: 0.12, d: 30, ty: 0.9, shell: 1 }   // one panel points away, the other two stand out either side
};
export const AIRBRAKE_DURATION = 9;
// Borealis, redrawn as a vector from Waterloo Rocketry's upright render (paint, markings and proportions from their
// video): 230 x 2700 units, body 63 wide centred at x 114.5, airbrake ring at y 1080. Takes over once the camera has
// pulled back far enough to see the whole rocket; sized directly (not scaled) so it stays sharp.
// half-widths (left, right of the centre line) of the rocket's silhouette every 10 units from y 300, measured from the
// render's alpha: the ogive nose, the 32-unit body and the fins at the bottom. The air stream flows around this solid.
const BOREALIS_PROFILE = { y0: 300, step: 10,
  l: [0, 0, 1, 4, 5, 7, 9, 10, 11, 13, 14, 15, 16, 17, 18, 18, 19, 20, 21, 22, 22, 23, 24, 24, 25, 25, 26, 27, 27, 28, 28, 29, 29, 29, 30, 30, 30, 31, 31, 31, 31, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 33, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 34, 44, 54, 64, 74, 84, 93, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 30, 29, 28, -1, 0],
  r: [0, 0, 1, 4, 5, 7, 9, 10, 11, 13, 14, 15, 16, 17, 18, 18, 19, 20, 21, 22, 22, 23, 24, 24, 25, 25, 26, 27, 27, 28, 28, 29, 29, 29, 30, 30, 30, 31, 31, 31, 31, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 33, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 33, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 34, 43, 53, 63, 73, 82, 92, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 30, 29, 28, 3, 0] };
const BOREALIS = { src: new URL('./borealis.svg', import.meta.url).href, w: 230, h: 2700, body: 63, cx: 114.5, ring: 1080 };
/* Apogee control, precomputed: 3.5 s of the coast toward apogee. The rocket climbs against gravity and
 * quadratic drag that grows with extension e; the flight computer predicts apogee P in closed form assuming the
 * current extension holds, and a PI loop on P - target drives the panels through a lagging, rate-limited servo. With the
 * panels fully out the prediction starts short of the target; they pull in, the servo lag lets P overshoot a little,
 * and the loop brings it back. h = altitude. Metres and seconds. */
const APO = { g: 9.81, k0: 2e-5, k1: 2.4e-4, h0: 2400, v0: 150, T: 3.5 };
const apogee = (h, v, k) => h + Math.log(1 + k * v * v / APO.g) / (2 * k);
APO.target = (() => { const a0 = apogee(APO.h0, APO.v0, APO.k0), a1 = apogee(APO.h0, APO.v0, APO.k0 + APO.k1); return a1 + 0.6 * (a0 - a1); })();
const CONTROL = (() => {
  const { g, k0, k1, T, target } = APO, dt = 0.01, Kp = 0.8, Ki = 3, lag = 0.5, rate = 1.2, out = [];
  let h = APO.h0, v = APO.v0, e = 1, I = 0;
  for (let i = 0; i <= Math.round(T / dt); i++) {
    const k = k0 + k1 * e, P = apogee(h, v, k), err = (P - target) / 100;
    out.push({ h, P, e });
    const cmd = Kp * err + I, c = clamp(cmd);
    if (c === cmd) I += Ki * err * dt;                                   // anti-windup
    e += clamp((c - e) * dt / lag, -rate * dt, rate * dt);              // servo: first-order lag, rate-limited
    v -= (g + k * v * v) * dt; h += v * dt;
  }
  return out;
})();
const controlAt = (q) => CONTROL[Math.round(clamp(q) * (CONTROL.length - 1))];
// journey: deploy on the bench, retract while the camera pulls back into the airframe, deploy into the flow,
// then pull back further: the rocket moves aside, flies through the stream, and the control loop plays out
function journeyAt(p) {
  // ...and finally the rocket carries on up and out of frame, on its way to apogee
  const zoom = smooth((p - 0.6) / 0.12), q = clamp((p - 0.7) / 0.22), exit = smooth((p - 0.9) / 0.1);
  const ext = p < 0.2 ? smooth(p / 0.2) : p < 0.26 ? 1 : p < 0.4 ? 1 - smooth((p - 0.26) / 0.14) : p < 0.44 ? 0
    : p < 0.6 ? smooth((p - 0.44) / 0.14) : p < 0.7 ? 1 : controlAt(q).e;
  return { ext, cam: smooth((p - 0.25) / 0.17), zoom, q, exit };
}

/* Screen-space air stream, coloured by speed like a CFD velocity plot. Freestream falls from the top of the
 * frame (the rocket flies up), slows in the boundary layer along the airframe, accelerates around each panel tip
 * and curls into an eddy behind it. The cursor is a small round obstacle. */
const CFD = [[0.3, [59, 111, 214]], [0.62, [67, 194, 122]], [0.9, [242, 207, 74]], [1.05, [240, 160, 64]], [1.4, [229, 83, 58]]];
function cfdColor(k) {
  if (k <= CFD[0][0]) return CFD[0][1];
  for (let i = 1; i < CFD.length; i++) if (k <= CFD[i][0]) { const [k0, a] = CFD[i - 1], [k1, b] = CFD[i], t = (k - k0) / (k1 - k0); return a.map((v, j) => v + (b[j] - v) * t); }
  return CFD[CFD.length - 1][1];
}
const CFD_FREE = cfdColor(1).map((v) => v | 0).join(',');   // colour of undisturbed freestream
class AirStream {
  constructor(canvas) { this.c = canvas; this.g = canvas.getContext('2d'); this.ps = []; this.w = 0; this.h = 0; this.mouse = null; }
  // h includes any bleed below the element; vh is the element's own height (sets the flow speed)
  resize(w, h, dpr, vh = h) { this.w = w; this.h = h; this.vh = vh; this.dpr = dpr; this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr); this.ps = []; }
  clear() { if (this.ps.length) { this.g.setTransform(1, 0, 0, 1, 0, 0); this.g.clearRect(0, 0, this.c.width, this.c.height); this.ps = []; } }
  spawn(geo, top) {
    const { w, h } = this, y = top ? -Math.random() * h * 0.05 : Math.random() * h;
    const eL = geo.edgeAt(y, -1), eR = geo.edgeAt(y, 1); let x;
    if (eL != null && Math.random() < 0.4) { const side = Math.random() < 0.5 ? -1 : 1, d = 1.5 + Math.abs(Math.random() + Math.random() - 1) * 90; x = (side < 0 ? eL : eR) + side * d; }   // denser close to the airframe
    else do { x = Math.random() * w; } while (eL != null && x > eL - 3 && x < eR + 3);   // where there is no rocket (above the nose, once it has gone) the column fills
    return { x, y, life: 0 };
  }
  step(dt, geo, alpha) {
    const { w, h, g } = this; if (!w || !h) return;
    // streamline budget follows the frame rate: fewer when frames run slow, back up when there is headroom
    const nMax = Math.round(Math.min(720, Math.max(220, w * h / 2600)));
    this.budget = Math.min(nMax, this.budget ?? nMax * 0.75); this.ema = (this.ema ?? dt) * 0.95 + dt * 0.05;
    if (this.ema > 1 / 45) this.budget = Math.max(140, this.budget * 0.985); else if (this.ema < 1 / 57) this.budget = Math.min(nMax, this.budget + 1.5);
    const n = Math.round(this.budget);
    if (this.ps.length > n + 20) this.ps.length = n;
    // as the rocket climbs out, its fins sweep up the screen and blast the stream off to the sides; nothing new starts
    const sweep = geo.sweep ?? null, ended = sweep != null && sweep < this.vh * 1.05;
    if (!ended) while (this.ps.length < n) this.ps.push(this.spawn(geo, false));
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // trails fade; every fourth frame fades harder so 8-bit rounding cannot leave a faint residue behind
    this.frame = (this.frame || 0) + 1;
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = this.frame % 4 ? 'rgba(0,0,0,.045)' : 'rgba(0,0,0,.2)'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over'; g.lineWidth = 1.5; g.lineCap = 'round';
    const U = this.vh * 0.5 * (this.speed ?? 1), cx = (geo.bx0 + geo.bx1) / 2, M = this.mouse;
    const rc = Math.max(8, 0.22 * Math.max(geo.ext[0], geo.ext[1], 30));
    const near = (geo.bx1 - geo.bx0) * 0.5 + 280;
    for (const q of this.ps) {
      // well away from the rocket and the cursor the air just falls: no collision maths
      if (sweep == null && Math.abs(q.x - cx) > near && !(M && Math.abs(q.x - M.x) < rc * 4 + 40)) {
        const oy = q.y; q.y += U * dt; q.life += dt;
        const D = this.dim, inChart = D && q.x > D.x0 && q.x < D.x1 && q.y > D.y0 && q.y < D.y1 ? 1 - 0.8 * D.k : 1, col = CFD_FREE;
        g.strokeStyle = `rgba(${col},${(0.95 * alpha * inChart).toFixed(3)})`; g.beginPath(); g.moveTo(q.x, oy); g.lineTo(q.x, q.y); g.stroke();
        if (q.y > h + 8 || q.life > 7) Object.assign(q, this.spawn(geo, true));
        continue;
      }
      const side = q.x < cx ? -1 : 1, e0 = geo.edgeAt(q.y, side), free = e0 == null, edge = free ? (side < 0 ? geo.bx0 : geo.bx1) : e0, dx = free ? 999 : (q.x - edge) * side;
      let vx = 0, vy = U * (0.45 + 0.55 * smooth(dx / 30));             // thin boundary layer along the airframe
      const eA = geo.edgeAt(q.y + 40, side);                             // the surface just downstream: nose shoulder, fins
      if (eA != null) { const dA = (q.x - eA) * side; if (dA < 26) vx += side * U * 1.7 * clamp((26 - dA) / 26); }
      if (dx > 2 && dx < 120 && q.y < geo.py - 200) vx -= side * U * 0.05 * (1 - dx / 120);   // upstream, drawn in close to the body
      const ext = geo.ext[side < 0 ? 0 : 1], py = geo.py;
      if (ext > 3) {
        const above = py - q.y, below = q.y - py, k = 1 - clamp((dx - ext) / (ext * 0.6 + 20));
        if (above > 0 && above < 190 && k > 0) {                           // pushed out and over the panel tip
          const f = Math.exp(-above / 60) * k; vx += side * U * 1.9 * f; vy *= 1 - 0.55 * f * (dx < ext ? 1 : 0.3);
        }
        if (below >= 0 && below < ext * 2.6 + 30 && dx < ext * 1.15) {    // eddy behind the panel
          const ex = edge + side * ext * 0.55, ey = py + ext * 0.75 + 10, rx = q.x - ex, ry = q.y - ey, r = Math.hypot(rx, ry) + 1;
          const sw = U * 1.3 * Math.exp(-r / (ext * 0.9 + 12));
          vx += (-ry / r) * sw * side; vy = vy * 0.35 + (rx / r) * sw * side;
        } else if (below >= 0 && below < ext * 4 && dx < ext * 1.6) vy *= 0.6 + 0.4 * below / (ext * 4);
        if (below > ext * 1.2 && below < ext * 9 && dx > 2 && dx < ext * 3) vx -= side * U * 0.22 * Math.exp(-(below - ext * 1.2) / (ext * 4));   // reattaches to the body downstream
        if (Math.abs(q.y - py) < 5 && dx < ext) q.x = edge + side * (ext + 2);   // never through the panel
      }
      if (sweep != null && q.y > sweep - 40) { vx += side * this.vh * 2.6; vy *= 0.5; }   // the fins blast everything below them off to the sides
      if (M) {                                                             // cursor: flow around a small cylinder
        const rx = q.x - M.x, ry = q.y - M.y, d2 = rx * rx + ry * ry, d = Math.sqrt(d2) + 0.01;
        if (d < rc * 4) { const k = (rc * rc) / Math.max(d2, rc * rc * 0.6); vx += (rx / d) * U * 1.4 * k; vy += (ry / d) * U * 0.4 * k - U * 0.3 * k; }
      }
      const ox = q.x, oy = q.y; q.x += vx * dt; q.y += vy * dt; q.life += dt;
      const e1 = geo.edgeAt(q.y, side); if (e1 != null && (q.x - e1) * side < 1.5) q.x = e1 + side * 1.5;   // never inside the solid
      const sp = Math.hypot(vx, vy) / U, col = cfdColor(sp);
      const D = this.dim, inChart = D && q.x > D.x0 && q.x < D.x1 && q.y > D.y0 && q.y < D.y1 ? 1 - 0.8 * D.k : 1;   // quieter behind the chart
      g.strokeStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${(0.95 * alpha * inChart).toFixed(3)})`;
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(q.x, q.y); g.stroke();
      if (q.y > h + 8 || q.x < -8 || q.x > w + 8 || q.life > 7) { if (ended) q.dead = true; else Object.assign(q, this.spawn(geo, true)); }
    }
    if (ended) { this.ps = this.ps.filter((q) => !q.dead); if (!this.ps.length) { this._fade = (this._fade || 0) + dt; if (this._fade > 1.2) g.clearRect(0, 0, w, h); } } else this._fade = 0;   // the trail fade never quite reaches zero
  }
}
export function airbrakeStateAt(t) {
  t = clamp(t, 0, AIRBRAKE_DURATION);
  const e = t < 0.8 ? 0 : t < 3.6 ? smooth((t - 0.8) / 2.8) : t < 5 ? 1 : t < 7.8 ? 1 - smooth((t - 5) / 2.8) : 0;
  return { extension: e };
}
export const airbrakeKinematics = G.kinematics;

/* ---------- geometry helpers (plan polygons → extruded solids lying in the XZ plane) ---------- */
const shapeFrom = pts => { const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; };
const pathFrom = pts => { const s = new THREE.Path(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath(); return s; };
function plate(shape, thick, mat, bevel = 0.02) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick - 2 * bevel, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 48 });
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
const arcPts = (r, a0, a1, n = 24) => { const o = []; for (let j = 0; j <= n; j++) { const a = a0 + (a1 - a0) * j / n; o.push([r * Math.cos(a), r * Math.sin(a)]); } return o; };

function makeEnvironment(renderer) {
  // Small studio "room" baked into a PMREM so the machined metal has something to reflect.
  const pm = new THREE.PMREMGenerator(renderer), s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x3a3c40, side: THREE.BackSide })));
  const panel = (w, h, pos, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m); };
  panel(16, 8, [-3, 14, 5], 3.6); panel(8, 12, [-14, 5, 6], 3); panel(7, 10, [13, 4, -8], 2.2); panel(24, 4, [0, 0, -14], 1.2); panel(24, 4, [0, 0, 14], 0.9);
  const rt = pm.fromScene(s, 0.035); pm.dispose(); return rt;
}

export class AirbrakeRenderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.debug.checkShaderErrors = false;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this._env = makeEnvironment(this.renderer);
    this.scene.environment = this._env.texture;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    const key = new THREE.DirectionalLight(0xfff6ea, 2.2); key.position.set(-6, 14, 7); key.castShadow = true;
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 }); key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    this.scene.add(key, new THREE.HemisphereLight(0xdfe6ee, 0x0c0c0e, 0.5));
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.9); rim.position.set(8, 3, -9); this.scene.add(rim);
    const M = (color, metalness, roughness, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
    this.mat = {
      alu: M(0xd0d3d7, 0.75, 0.34), aluCam: M(0xd8dbdf, 0.78, 0.28), aluBase: M(0xc3c6ca, 0.72, 0.4),
      oxide: M(0x2a2b2e, 0.6, 0.45), steel: M(0x9ea3a8, 0.95, 0.25), brass: M(0xa58c55, 0.9, 0.33),
      capRed: M(0x8e3a31, 0.1, 0.55), sealGreen: M(0x3c6447, 0.1, 0.6), servo: M(0x161618, 0.2, 0.55),
      label: M(0x5f4a6d, 0.15, 0.6), shell: M(0x8d9298, 0.55, 0.5, { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
      shellCap: M(0x2c2e31, 0.4, 0.5, { transparent: true, opacity: 0, depthWrite: false })
    };
    this.root = new THREE.Group(); this.scene.add(this.root);
    this._build();
    this.cam = { ...VIEWS.mechanism }; this._from = { ...this.cam }; this._to = { ...this.cam }; this._viewT = 1;
    this.extension = -1; this.setExtension(0); this.resize(800, 500);
  }
  cyl(r, h, mat, x, y, z, parent = this.root, seg = 32) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
  box(w, h, d, mat, x, y, z, parent = this.root) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
  // plan (x, y) → world (x, -y): shapes are built in plan coordinates
  _build() {
    const { mat } = this, T = 0.25;
    // Levels (in): bulkhead 0..0.25, rails 0.25..0.56, carriages ..0.80, panels 0.84..1.09, cam 1.13..1.38
    this.Y = { base: 0, rail: 0.25, panel: 0.84, cam: 1.13 };
    /* Bulkhead: machined disc with six spokes (three carry rails), pockets, centre bearing. */
    const base = shapeFrom(arcPts(G.BASE_R, 0, G.TAU, 160).slice(0, -1));
    base.holes.push(pathFrom(arcPts(0.42, 0, G.TAU, 40).slice(0, -1).reverse()));
    for (let k = 0; k < 6; k++) {
      const a = k * G.TAU / 6 + G.TAU / 12, half = G.TAU / 12, wSpoke = k % 2 ? 0.2 : 0.2;
      const r0 = 0.95, r1 = G.BASE_R - 0.3, i0 = (wSpoke + 0.18) / r0, i1 = (wSpoke + 0.12) / r1;
      const pts = [...arcPts(r1, a - half + i1, a + half - i1, 20), ...arcPts(r0, a + half - i0, a - half + i0, 8)];
      base.holes.push(pathFrom(pts.reverse()));
    }
    this.root.add(plate(base, T, mat.aluBase, 0.015));
    this.cyl(0.42, 0.24, mat.steel, 0, 0.13, 0, this.root, 32); // bearing outer race
    this.cyl(0.24, 0.27, mat.oxide, 0, 0.13, 0, this.root, 24);
    /* Servo bracket, stand-offs and the servo hanging below the bulkhead. */
    this.box(2.9, 0.12, 1.0, mat.aluBase, 0, -0.95, 0);
    for (const x of [-1.25, 1.25]) for (const z of [-0.3, 0.3]) this.cyl(0.13, 0.89, mat.steel, x, -0.45, z, this.root, 16);
    this.box(1.6, 1.55, 0.8, mat.servo, 0, -1.8, 0);
    this.box(2.15, 0.1, 0.8, mat.servo, 0, -1.12, 0);
    const lab = this.box(1.45, 0.95, 0.01, mat.label, 0, -1.95, 0.405); lab.castShadow = false;
    this.cyl(0.18, 0.5, mat.steel, 0, -0.75, 0, this.root, 20); // output spline / coupler
    /* Rails (fixed) */
    for (const a of G.ALPHA) {
      const g = new THREE.Group(); g.rotation.y = a; this.root.add(g);
      this.box(2.3, 0.31, 0.47, mat.oxide, 0.72 + 1.15, this.Y.rail + 0.155, 0, g);
      for (const x of [0.95, 1.75, 2.55]) this.cyl(0.09, 0.02, mat.steel, x, this.Y.rail + 0.32, 0, g, 6);
    }
    /* Panels with carriage, spacer and follower stack — each in its own sliding group. */
    this.sliders = [];
    const panelShape = shapeFrom(G.panelPolygon(48));
    for (const a of G.ALPHA) {
      const g = new THREE.Group(); g.rotation.y = a; this.root.add(g);
      const s = new THREE.Group(); g.add(s); this.sliders.push(s);
      const p = plate(panelShape, T, mat.alu, 0.02); p.position.y = this.Y.panel; s.add(p);
      // MGN carriage under the panel (steel body, red end caps, green seals) + spacer
      const cx = 1.45;
      this.box(1.0, 0.24, 0.78, mat.steel, cx, 0.62, 0, s);
      for (const d of [-1, 1]) { this.box(0.08, 0.22, 0.76, mat.capRed, cx + d * 0.54, 0.61, 0, s); this.box(0.035, 0.2, 0.74, mat.sealGreen, cx + d * 0.6, 0.61, 0, s); }
      this.box(1.0, 0.08, 0.7, mat.aluBase, cx, 0.78, 0, s);
      // follower: bearing in the slot, brass shims, steel washer, socket-head cap screw
      const fx = G.PIN_R0, y0 = this.Y.cam;
      this.cyl(0.155, 0.25, mat.steel, fx, y0 + 0.125, 0, s, 24);
      this.cyl(0.33, 0.025, mat.brass, fx, y0 + 0.27, 0, s, 32);
      this.cyl(0.33, 0.025, mat.brass, fx, y0 + 0.3, 0, s, 32);
      this.cyl(0.3, 0.035, mat.steel, fx, y0 + 0.335, 0, s, 32);
      this.cyl(0.16, 0.13, mat.steel, fx, y0 + 0.415, 0, s, 24);
      this.cyl(0.155, 0.155, mat.oxide, fx, y0 + 0.555, 0, s, 28);
      this.cyl(0.07, 0.02, mat.servo, fx, y0 + 0.634, 0, s, 6);
    }
    /* Cam plate */
    const cam = shapeFrom(G.camOutline(360));
    for (let i = 0; i < 3; i++) cam.holes.push(pathFrom(G.slotPolygon(i, 80).slice().reverse()));
    cam.holes.push(pathFrom(G.hexPolygon().slice().reverse()));
    this.camPlate = plate(cam, T, mat.aluCam, 0.02); this.camPlate.position.y = this.Y.cam;
    this.camGroup = new THREE.Group(); this.camGroup.add(this.camPlate); this.root.add(this.camGroup);
    const hex = this.cyl(0.25, 1.25, mat.steel, 0, 0.95, 0, this.camGroup, 6); hex.rotation.y = Math.PI / 6;
    this.cyl(0.12, 0.02, mat.oxide, 0, 1.585, 0, this.camGroup, 20);
    /* Airframe shell with three panel windows (only visible in the airframe view). */
    this.shell = new THREE.Group(); this.root.add(this.shell);
    const R = G.AIRFRAME_R, Ri = R - 0.1, y0 = -40, y1 = 40, w0 = this.Y.panel - 0.06, w1 = this.Y.panel + 0.31;
    const win = Math.asin((R * Math.sin(G.PANEL_HALF) + 0.04) / R);
    const seg = (r, a0, a1, ya, yb, inward) => {
      const geo = new THREE.CylinderGeometry(r, r, yb - ya, 48, 1, true, a0, a1 - a0);
      const m = new THREE.Mesh(geo, this.mat.shell); m.position.y = (ya + yb) / 2; if (inward) m.scale.set(1, 1, 1); this.shell.add(m); return m;
    };
    // CylinderGeometry theta is measured from +z toward +x; panel i sits at world angle -ALPHA[i] from +x about y.
    for (let i = 0; i < 3; i++) {
      const c = Math.PI / 2 + G.ALPHA[i]; // theta of panel centre-line
      const nxt = Math.PI / 2 + G.ALPHA[i] + G.TAU / 3;
      for (const r of [R, Ri]) {
        seg(r, c - win, c + win, y0, w0); seg(r, c - win, c + win, w1, y1);
        seg(r, c + win, nxt - win, y0, y1);
      }
    }
    const cap = (y) => { const g = new THREE.RingGeometry(Ri, R, 96); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, this.mat.shell); m.position.y = y; this.shell.add(m); };
    cap(y0); cap(y1);
    const lid = new THREE.Mesh(new THREE.CircleGeometry(Ri, 96).rotateX(-Math.PI / 2), this.mat.shellCap); lid.position.y = y1 - 0.15; this.shell.add(lid);
    this.shell.visible = false;
    this._paintShell(R, this.Y.panel + 0.12);
  }
  /* Paint the tube with the same Borealis drawing the flat overlay uses: the drawing is projected straight on along
     the airframe camera's view (+x), its airbrake ring on the panels and its body width matching the tube, so the
     3D-to-flat crossfade swaps nothing but depth. */
  _paintShell(R, ringY) {
    const B = BOREALIS, img = new Image(), cv = document.createElement('canvas'); cv.width = 128; cv.height = 4096;
    img.onload = () => {
      cv.getContext('2d').drawImage(img, B.cx - B.body / 2, 0, B.body, B.h, 0, 0, cv.width, cv.height);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const svgY = (y) => B.ring - (y - ringY) * B.body / (2 * R);
      this.shell.traverse((m) => {
        if (!m.isMesh || m.material !== this.mat.shell) return;
        const p = m.geometry.attributes.position, uv = m.geometry.attributes.uv;
        for (let i = 0; i < p.count; i++) uv.setXY(i, Math.min(1, Math.max(0, 0.5 + p.getZ(i) / (2 * R))), 1 - svgY(p.getY(i) + m.position.y) / B.h);
        uv.needsUpdate = true;
      });
      Object.assign(this.mat.shell, { map: tex, metalness: 0.2, roughness: 0.55 }); this.mat.shell.color.set(0xffffff); this.mat.shell.needsUpdate = true;
      this._dirty = true;
    };
    img.src = B.src;
  }
  setExtension(f) {
    const k = G.kinematics(f);
    if (k.fraction === this.extension) return false;
    this.extension = k.fraction; this.kin = k;
    this.camGroup.rotation.y = k.rot;
    this.sliders.forEach(s => { s.position.x = k.travel; });
    return true;
  }
  setRise(k) { this.root.position.y = 260 * k * k; }
  setShellFade(k) { this._shellFade = k; }
  setCamMix(m, zoom = 0) {
    const a = VIEWS.mechanism, b = VIEWS.airframe, e = smooth(m); for (const k of Object.keys(a)) this.cam[k] = a[k] + (b[k] - a[k]) * e; this._viewT = 1;
    this.cam.d *= 1 + 0.75 * zoom; this._shift = zoom;
  }
  // the airframe silhouette and how far each side's panels reach beyond it, in CSS px (for the air stream)
  flowGeometry(w, h) {
    this._applyCamera(); this.camera.updateMatrixWorld(); this.root.updateMatrixWorld(true);
    const P = (v) => { v.project(this.camera); return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h]; };
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0); right.y = 0; right.normalize();
    const y = this.Y.panel + 0.12 + this.root.position.y, R = G.AIRFRAME_R;
    const a = P(right.clone().multiplyScalar(-R).setY(y)), b = P(right.clone().multiplyScalar(R).setY(y));
    const bx0 = Math.min(a[0], b[0]), bx1 = Math.max(a[0], b[0]), ext = [0, 0];
    for (const s of this.sliders) {
      for (const z of [-0.9, 0, 0.9]) {
        const [x] = P(s.localToWorld(new THREE.Vector3(R, y, z)));
        if (x < bx0) ext[0] = Math.max(ext[0], bx0 - x); else if (x > bx1) ext[1] = Math.max(ext[1], x - bx1);
      }
    }
    const tail = P(new THREE.Vector3(0, -40 + this.root.position.y, 0))[1];   // below the tail the stream is free (overridden by the full rocket)
    return { bx0, bx1, py: (a[1] + b[1]) / 2, ext, tail, edgeAt: (yy, side) => (yy <= tail ? (side < 0 ? bx0 : bx1) : null) };
  }
  setView(name, instant = false) {
    const v = VIEWS[name] || VIEWS.mechanism;
    this._from = { ...this.cam }; this._to = { ...v }; this._viewT = instant ? 1 : 0;
    if (instant) this.cam = { ...v };
  }
  /** advance view transition; returns true while animating */
  stepView(dt) {
    if (this._viewT >= 1) return false;
    this._viewT = Math.min(1, this._viewT + dt / 0.9);
    const e = smooth(this._viewT);
    for (const k of Object.keys(this._to)) this.cam[k] = this._from[k] + (this._to[k] - this._from[k]) * e;
    return true;
  }
  _applyCamera() {
    const { az, el, d, ty } = this.cam, shell = this.cam.shell * (1 - (this._shellFade || 0)), asp = this._aspect || 1.6;
    const dist = d * Math.max(1, 1.45 / asp); // keep the assembly in frame on tall/narrow hosts
    this.camera.position.set(Math.cos(el) * Math.cos(az) * dist, ty + Math.sin(el) * dist, -Math.cos(el) * Math.sin(az) * dist);
    this.camera.lookAt(0, ty, 0);
    // push the rocket toward the left so the chart has room on the right
    const sw = this._w || 800, sh = this._h || 500;
    if (this._shift > 0.001) this.camera.setViewOffset(sw, sh, sw * 0.24 * smooth(this._shift), 0, sw, sh); else this.camera.clearViewOffset();
    this.shell.visible = shell > 0.01;
    this.mat.shell.opacity = shell; this.mat.shellCap.opacity = shell;
    this.mat.shell.depthWrite = this.mat.shellCap.depthWrite = shell > 0.98;
  }
  resize(w, h) { this._w = w; this._h = h; this._aspect = w / Math.max(1, h); this.renderer.setSize(Math.max(1, w), Math.max(1, h), false); this.camera.aspect = this._aspect; this.camera.updateProjectionMatrix(); }
  render() { this._applyCamera(); this.renderer.render(this.scene, this.camera); }
  dispose() { this.scene.traverse(o => { o.geometry?.dispose(); }); Object.values(this.mat).forEach(m => m.dispose()); this._env.dispose(); this.renderer.dispose(); }
}

class ASAirbrakes extends HTMLElement {
  static get observedAttributes() { return ['view', 'progress', 'extension', 'controls', 'nohud']; }
  constructor() { super(); this._progress = null; this.time = 0; this.duration = AIRBRAKE_DURATION; this._playing = false; this._visible = true; this._target = 0; this._ext = 0; }
  get progress() { return this._progress ?? 0; }
  set progress(v) { const n = Number(v); if (!Number.isFinite(n)) return; this._progress = clamp(n); this._target = this._progress; this._kick(); }
  get view() { return this.getAttribute('view') || 'mechanism'; }
  set view(v) { this.setAttribute('view', v); }
  connectedCallback() {
    if (this._connected) return; this._connected = true;
    this._reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this._playing = this.hasAttribute('autoplay') && !this._reduced.matches;
    const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>:host{display:block;width:100%;height:100%;position:relative;min-height:200px;color:#f2efe9}
      .stage{position:absolute;inset:0}canvas{display:block;width:100%;height:100%;outline:0}
      .hud{position:absolute;left:16px;bottom:14px;font:500 10px/1.7 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.06em;color:rgba(242,239,233,.5);pointer-events:none;font-variant-numeric:tabular-nums}
      .hud b{font-weight:500;color:rgba(242,239,233,.88)}:host([nohud]) .hud{display:none}
      .controls{position:absolute;left:16px;right:16px;bottom:44px;display:none;gap:12px;align-items:center;font:10px "JetBrains Mono",monospace}
      :host([controls]:not([controls=false])) .controls{display:flex}
      .controls button{font:inherit;color:#f2efe9;background:transparent;border:1px solid rgba(255,255,255,.16);padding:6px 10px;cursor:pointer}
      .controls input{flex:1;accent-color:#f2efe9}</style>
      <div class="stage"><canvas aria-label="Airbrake cam mechanism: one servo turns a slotted cam that drives three panels outward together."></canvas></div>
      <div class="controls"><button type="button">PLAY</button><input type="range" min="0" max="1000" value="0" aria-label="Airbrake extension"></div>
      <div class="hud" hidden>CAM <b class="a">0.0°</b> &nbsp; TRAVEL <b class="t">0.0 mm</b></div>
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none"><img class="rocket" alt="" aria-hidden="true" src="${BOREALIS.src}" style="position:absolute;left:0;top:0;opacity:0;will-change:transform"><i class="pan" style="position:absolute;left:0;top:0;opacity:0;border-radius:1px;background:linear-gradient(#e4e6e9,#a9adb3 60%,#7d8188)"></i><i class="pan" style="position:absolute;left:0;top:0;opacity:0;border-radius:1px;background:linear-gradient(#e4e6e9,#a9adb3 60%,#7d8188)"></i></div>
      <canvas class="flow" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"></canvas>
      <canvas class="chart" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>`;
    this._canvas = root.querySelector('canvas');
    try { this.r = new AirbrakeRenderer(this._canvas); }
    catch (e) { root.querySelector('.stage').innerHTML = '<div style="padding:24px;font:12px monospace;color:#999">WebGL unavailable</div>'; return; }
    this._hudA = root.querySelector('.a'); this._hudT = root.querySelector('.t');
    this._btn = root.querySelector('button'); this._range = root.querySelector('input');
    this._btn.addEventListener('click', () => this._playing ? this.pause() : this.play());
    this._range.addEventListener('input', () => { this.pause(); this._progress = null; this._target = this._ext = this._range.value / 1000; this._kick(); });
    this._journey = this.view === 'journey'; this._jp = 0; this._mix = 0;
    this._flow = new AirStream(root.querySelector('.flow'));
    this._chart = root.querySelector('.chart'); this._cg = this._chart.getContext('2d'); this._rocket = root.querySelector('.rocket'); this._pans = [...root.querySelectorAll('.pan')];
    this.addEventListener('pointermove', (e) => { const r = this.getBoundingClientRect(); this._flow.mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    this.addEventListener('pointerleave', () => { this._flow.mouse = null; });
    if (this._journey) this.r.setCamMix(0); else this.r.setView(this.view, true);
    if (this.hasAttribute('progress')) this.progress = this.getAttribute('progress');
    else if (this.hasAttribute('extension')) this._target = this._ext = clamp(+this.getAttribute('extension') || 0);
    this._ro = new ResizeObserver(es => { const c = es[0].contentRect; this.r.resize(c.width, c.height); this._sizeFlow(c.width, c.height); this._w = c.width; this._h = c.height; this._dirty = true; this._kick(); });
    this._ro.observe(root.querySelector('.stage'));
    this._io = new IntersectionObserver(es => { this._visible = es[es.length - 1].isIntersecting; this._kick(); }, { rootMargin: '64px' });
    this._io.observe(this);
    this._onVis = () => this._kick(); document.addEventListener('visibilitychange', this._onVis);
    this._dirty = true; this._kick();
    this.dispatchEvent(new CustomEvent('ready', { bubbles: true }));
  }
  disconnectedCallback() { this._connected = false; cancelAnimationFrame(this._raf); this._raf = 0; this._ro?.disconnect(); this._io?.disconnect(); document.removeEventListener('visibilitychange', this._onVis); this.r?.dispose(); this.r = null; }
  attributeChangedCallback(n, o, v) {
    if (!this.r) return;
    if (n === 'view') { this._journey = v === 'journey'; if (!this._journey) { this._flow?.clear(); this.r.setView(v || 'mechanism', this._reduced?.matches); } this._dirty = true; this._kick(); }
    else if (n === 'progress' && v !== null) this.progress = v;
    else if (n === 'extension' && v !== null) { this._progress = null; this._target = this._ext = clamp(+v || 0); this._dirty = true; this._kick(); }
  }
  // in the journey the stream runs on past the bottom of the element and fades out, so it bleeds into what follows
  // predicted apogee against the target, and the extension that gets it there, revealed as the loop runs
  _drawChart(J) {
    const cv = this._chart, g = this._cg, w = this._w, h = this._h, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const al = smooth((J.zoom - 0.5) / 0.5) * (1 - smooth(J.exit / 0.6)); if (al <= 0) { this._flow.dim = null; return; }
    const narrow = w < 700, x0 = narrow ? w * 0.08 : w * 0.55, x1 = narrow ? w * 0.92 : Math.min(w * 0.93, x0 + 560);
    const top = narrow ? h * 0.34 : h * 0.2, mid = top + (narrow ? h * 0.17 : h * 0.3), bot = narrow ? h * 0.74 : h * 0.78, n = Math.round(J.q * (CONTROL.length - 1));
    // Altitude runs on an exponentially stretched scale, about 3x finer near the target than at the start, so the
    // prediction's overshoot reads next to the whole climb. Time fills the left 62%; from the latest point a dashed
    // arc carries the predicted trajectory out to its apogee at the right edge.
    const N = CONTROL.length - 1, yT = top + 14, yB = mid - 4, { h0, target } = APO, S = 3;
    const xd = x0 + 0.62 * (x1 - x0), X = (i) => x0 + (xd - x0) * i / N, Ye = (e) => bot - (bot - mid - 56) * e;
    const Y = (a) => yB - (yB - yT) * Math.expm1(S * (a - h0) / (target - h0)) / Math.expm1(S);
    this._flow.dim = { x0: x0 - 18, x1: x1 + 18, y0: top - 34, y1: bot + 18, k: al };
    g.globalAlpha = al; g.font = `400 ${narrow ? 12 : 13}px Inter, system-ui, sans-serif`; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(8,8,10,.55)'; g.fillRect(x0 - 18, top - 34, x1 - x0 + 36, bot - top + 52);
    // target apogee
    g.strokeStyle = 'rgba(242,239,233,.3)'; g.setLineDash([1, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, yT); g.lineTo(x1, yT); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(242,239,233,.55)'; g.textAlign = 'right'; g.fillText('Target apogee', x1 - 14, yT + 18);
    // legend: altitude (solid) and predicted apogee (dashed)
    g.textAlign = 'left'; g.fillStyle = 'rgba(242,239,233,.9)'; g.fillText('Altitude', x0, top - 8);
    const lx = x0 + g.measureText('Altitude').width + 22;
    g.strokeStyle = 'rgba(242,239,233,.9)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(lx, top - 12); g.lineTo(lx + 18, top - 12); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(242,239,233,.7)'; g.fillText('Predicted apogee', lx + 26, top - 8);
    g.strokeStyle = 'rgba(242,239,233,.9)'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= n; i++) { const y = Y(CONTROL[i].h); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); } g.stroke();
    // predicted trajectory from here, holding the current extension: eases into its apogee at the right edge
    const c = CONTROL[n], xs = X(n);
    g.strokeStyle = 'rgba(242,239,233,.75)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath();
    for (let j = 0; j <= 40; j++) { const s = j / 40, y = Y(c.h + (c.P - c.h) * (1 - (1 - s) * (1 - s))); j ? g.lineTo(xs + (x1 - xs) * s, y) : g.moveTo(xs, y); }
    g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#f2efe9'; g.lineWidth = 1.5; g.beginPath(); g.arc(x1, Y(c.P), 4, 0, 7); g.stroke();
    // extension
    g.fillStyle = 'rgba(242,239,233,.9)'; g.fillText('Airbrake extension', x0, mid + 36);
    g.strokeStyle = 'rgba(242,239,233,.15)'; g.beginPath(); g.moveTo(x0, bot); g.lineTo(x1, bot); g.stroke();
    g.strokeStyle = '#8fb4ff'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= n; i++) { const y = Ye(CONTROL[i].e); i ? g.lineTo(X(i), y) : g.moveTo(X(i), y); } g.stroke();
    g.fillStyle = '#f2efe9'; g.beginPath(); g.arc(xs, Y(c.h), 3.5, 0, 7); g.fill(); g.fillStyle = '#8fb4ff'; g.beginPath(); g.arc(xs, Ye(c.e), 3.5, 0, 7); g.fill();
    g.globalAlpha = 1;
  }
  _sizeFlow(w, h) {
    const bleed = this._journey ? Math.round(innerHeight * 0.55) : 0, cv = this._flow.c;
    cv.style.height = `${h + bleed}px`;
    cv.style.webkitMaskImage = cv.style.maskImage = bleed ? `linear-gradient(#000 ${h - 40}px, transparent ${h + bleed}px)` : '';
    this._flow.resize(w, h + bleed, Math.min(1.5, devicePixelRatio || 1), h);
  }
  setExtension(f) { this._progress = null; this._target = this._ext = clamp(+f || 0); this._dirty = true; this._kick(); }
  play() { if (this.time >= this.duration) this.time = 0; this._playing = true; if (this._btn) this._btn.textContent = 'PAUSE'; this._kick(); }
  pause() { this._playing = false; if (this._btn) this._btn.textContent = 'PLAY'; }
  seek(t) { this.time = clamp(+t || 0, 0, this.duration); this._progress = null; this._target = this._ext = airbrakeStateAt(this.time).extension; this._dirty = true; this._kick(); return this.time; }
  renderAt(t) { return this.seek(t); }
  // compiles the shaders off the main thread (KHR_parallel_shader_compile) and holds the first frame until they are ready
  warm() {
    if (!this.r?.renderer || this._warming) return Promise.resolve(); this._warming = true;
    return this.r?.renderer.compileAsync(this.r.scene, this.r.camera).catch(() => {}).finally(() => { this._warming = false; this._kick(); });
  }
  _kick() { if (!this._raf && this._connected && this.r) { this._last = performance.now(); this._raf = requestAnimationFrame(n => this._tick(n)); } }
  _tick(now) {
    this._raf = 0; if (!this.r) return;
    const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    const active = this._visible && !document.hidden && !this._warming;
    let moving = false;
    if (active) {
      const auto = this._playing && this._progress === null && !this._reduced.matches;
      if (auto) { this.time += dt; if (this.time > this.duration) { if (this.hasAttribute('loop')) this.time %= this.duration; else { this.time = this.duration; this.pause(); } } this._target = airbrakeStateAt(this.time).extension; moving = true; }
      if (this._journey) {
        const tgt = this._progress ?? 0, k = this._reduced.matches ? 1 : 1 - Math.exp(-dt * 10);
        this._jp += (tgt - this._jp) * k; if (Math.abs(tgt - this._jp) > 1e-4) moving = true; else this._jp = tgt;
        const J = journeyAt(this._jp); this._target = this._ext = J.ext; this._J = J;
        if (J.exit !== this._exit) { this.r.setRise(J.exit); this._exit = J.exit; this._dirty = true; }
        const rf = smooth((J.zoom - 0.15) / 0.6); if (rf !== this._rf) { this.r.setShellFade(rf); this._rf = rf; this._dirty = true; }
        this._flow.speed = 1.8 * (1 - 0.25 * J.q);   // still fast at the end: the loop settles seconds before apogee
        if (J.cam !== this._mix || J.zoom !== this._zoom) { this.r.setCamMix(J.cam, J.zoom); this._mix = J.cam; this._zoom = J.zoom; this._dirty = true; }
      }
      else if (this._progress !== null && !this._reduced.matches) { const k = 1 - Math.exp(-dt * 10); this._ext += (this._target - this._ext) * k; if (Math.abs(this._target - this._ext) > 1e-4) moving = true; else this._ext = this._target; }
      else this._ext = this._target;
      if (this.r.stepView(dt)) moving = true;
      if (this.r.setExtension(this._ext) || this._dirty || moving) {
        this.r.render(); this._dirty = false;
        const k = this.r.kin; this._hudA.textContent = (k.rot * 180 / Math.PI).toFixed(1) + '°'; this._hudT.textContent = (k.travel * 25.4).toFixed(1) + ' mm';
        if (this._range && document.activeElement !== this._range) this._range.value = String(Math.round(k.fraction * 1000));
      }
      const fa = this._journey && !this._reduced.matches ? smooth((this._mix - 0.55) / 0.35) : 0;
      const geo = this._journey && (fa > 0 || this._rf > 0) ? this.r.flowGeometry(this._w, this._h) : null;
      if (geo) {   // the full Borealis, sized and placed so its airbrake ring sits on the 3D panels
        const k = (geo.bx1 - geo.bx0) / BOREALIS.body, x = (geo.bx0 + geo.bx1) / 2 - BOREALIS.cx * k, y = geo.py - BOREALIS.ring * k;
        const rs = this._rocket.style; rs.opacity = this._rf || 0; rs.width = `${BOREALIS.w * k}px`; rs.height = `${BOREALIS.h * k}px`; rs.transform = `translate(${x}px,${y}px)`;
        if (this._rf > 0.5) {
          const P = BOREALIS_PROFILE, cxs = (geo.bx0 + geo.bx1) / 2;
          geo.tail = y + BOREALIS.h * k;
          if (this._J && this._J.exit > 0.02) geo.sweep = geo.tail;
          geo.edgeAt = (yy, side) => { const i = Math.round(((yy - y) / k + 300 - P.y0) / P.step); if (i < 0 || i >= P.l.length) return null; const hw = side < 0 ? P.l[i] : P.r[i]; return hw ? cxs + side * hw * k : null; };
        }
        // the two panels standing out either side, drawn over the rocket at the extension the 3D model is at
        const t = Math.max(2, (geo.bx1 - geo.bx0) * 0.05);
        this._pans.forEach((pn, i) => { const e = geo.ext[i], ps = pn.style; ps.opacity = this._rf || 0; ps.height = `${t}px`; ps.width = `${e + 2}px`;
          ps.transform = `translate(${i ? geo.bx1 - 1 : geo.bx0 - e - 1}px,${geo.py - t / 2}px)`; });
      } else if (this._rocket) { this._rocket.style.opacity = 0; this._pans.forEach((pn) => { pn.style.opacity = 0; }); }
      if (fa > 0) { this._flow.step(dt, geo, fa); moving = true; } else this._flow.clear();
      if (this._journey && this._J) this._drawChart(this._J);
    }
    if (active && (moving || this._playing)) { this._raf = requestAnimationFrame(n => this._tick(n)); }
  }
}
if (!customElements.get('as-airbrakes')) customElements.define('as-airbrakes', ASAirbrakes);

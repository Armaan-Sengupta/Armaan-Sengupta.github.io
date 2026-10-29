/* <as-airbrakes> — Waterloo Rocketry (Borealis) airbrake cam-slot mechanism, Three.js.
 *
 * One servo turns a trilobed cam plate; three Archimedean slots (0.78 in of radial travel per 90 deg)
 * drive the shoulder-bolt/bearing followers of three sector panels that ride MGN linear rails on a
 * pocketed aluminium bulkhead. Geometry lives in ./geometry.js (shared with <as-flight-control>).
 *
 * Attributes / properties
 *   view="mechanism" | "top" | "airframe"   camera + airframe shell, smooth transition (default mechanism)
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
  airframe:  { az: -0.4, el: 0.16, d: 21, ty: 0.9, shell: 1 }
};
export const AIRBRAKE_DURATION = 9;
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
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
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
    const R = G.AIRFRAME_R, Ri = R - 0.1, y0 = -7, y1 = 8, w0 = this.Y.panel - 0.06, w1 = this.Y.panel + 0.31;
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
  }
  setExtension(f) {
    const k = G.kinematics(f);
    if (k.fraction === this.extension) return false;
    this.extension = k.fraction; this.kin = k;
    this.camGroup.rotation.y = k.rot;
    this.sliders.forEach(s => { s.position.x = k.travel; });
    return true;
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
    const { az, el, d, ty, shell } = this.cam, asp = this._aspect || 1.6;
    const dist = d * Math.max(1, 1.45 / asp); // keep the assembly in frame on tall/narrow hosts
    this.camera.position.set(Math.cos(el) * Math.cos(az) * dist, ty + Math.sin(el) * dist, -Math.cos(el) * Math.sin(az) * dist);
    this.camera.lookAt(0, ty, 0);
    this.shell.visible = shell > 0.01;
    this.mat.shell.opacity = shell; this.mat.shellCap.opacity = shell;
    this.mat.shell.depthWrite = this.mat.shellCap.depthWrite = shell > 0.98;
  }
  resize(w, h) { this._aspect = w / Math.max(1, h); this.renderer.setSize(Math.max(1, w), Math.max(1, h), false); this.camera.aspect = this._aspect; this.camera.updateProjectionMatrix(); }
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
      <div class="hud">CAM <b class="a">0.0°</b> &nbsp; TRAVEL <b class="t">0.0 mm</b></div>`;
    this._canvas = root.querySelector('canvas');
    try { this.r = new AirbrakeRenderer(this._canvas); }
    catch (e) { root.querySelector('.stage').innerHTML = '<div style="padding:24px;font:12px monospace;color:#999">WebGL unavailable</div>'; return; }
    this._hudA = root.querySelector('.a'); this._hudT = root.querySelector('.t');
    this._btn = root.querySelector('button'); this._range = root.querySelector('input');
    this._btn.addEventListener('click', () => this._playing ? this.pause() : this.play());
    this._range.addEventListener('input', () => { this.pause(); this._progress = null; this._target = this._ext = this._range.value / 1000; this._kick(); });
    this.r.setView(this.view, true);
    if (this.hasAttribute('progress')) this.progress = this.getAttribute('progress');
    else if (this.hasAttribute('extension')) this._target = this._ext = clamp(+this.getAttribute('extension') || 0);
    this._ro = new ResizeObserver(es => { const c = es[0].contentRect; this.r.resize(c.width, c.height); this._dirty = true; this._kick(); });
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
    if (n === 'view') { this.r.setView(v || 'mechanism', this._reduced?.matches); this._kick(); }
    else if (n === 'progress' && v !== null) this.progress = v;
    else if (n === 'extension' && v !== null) { this._progress = null; this._target = this._ext = clamp(+v || 0); this._dirty = true; this._kick(); }
  }
  setExtension(f) { this._progress = null; this._target = this._ext = clamp(+f || 0); this._dirty = true; this._kick(); }
  play() { if (this.time >= this.duration) this.time = 0; this._playing = true; if (this._btn) this._btn.textContent = 'PAUSE'; this._kick(); }
  pause() { this._playing = false; if (this._btn) this._btn.textContent = 'PLAY'; }
  seek(t) { this.time = clamp(+t || 0, 0, this.duration); this._progress = null; this._target = this._ext = airbrakeStateAt(this.time).extension; this._dirty = true; this._kick(); return this.time; }
  renderAt(t) { return this.seek(t); }
  _kick() { if (!this._raf && this._connected && this.r) { this._last = performance.now(); this._raf = requestAnimationFrame(n => this._tick(n)); } }
  _tick(now) {
    this._raf = 0; if (!this.r) return;
    const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now;
    const active = this._visible && !document.hidden;
    let moving = false;
    if (active) {
      const auto = this._playing && this._progress === null && !this._reduced.matches;
      if (auto) { this.time += dt; if (this.time > this.duration) { if (this.hasAttribute('loop')) this.time %= this.duration; else { this.time = this.duration; this.pause(); } } this._target = airbrakeStateAt(this.time).extension; moving = true; }
      if (this._progress !== null && !this._reduced.matches) { const k = 1 - Math.exp(-dt * 10); this._ext += (this._target - this._ext) * k; if (Math.abs(this._target - this._ext) > 1e-4) moving = true; else this._ext = this._target; }
      else this._ext = this._target;
      if (this.r.stepView(dt)) moving = true;
      if (this.r.setExtension(this._ext) || this._dirty || moving) {
        this.r.render(); this._dirty = false;
        const k = this.r.kin; this._hudA.textContent = (k.rot * 180 / Math.PI).toFixed(1) + '°'; this._hudT.textContent = (k.travel * 25.4).toFixed(1) + ' mm';
        if (this._range && document.activeElement !== this._range) this._range.value = String(Math.round(k.fraction * 1000));
      }
    }
    if (active && (moving || this._playing)) { this._raf = requestAnimationFrame(n => this._tick(n)); }
  }
}
if (!customElements.get('as-airbrakes')) customElements.define('as-airbrakes', ASAirbrakes);

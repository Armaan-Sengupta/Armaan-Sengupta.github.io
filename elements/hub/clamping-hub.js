/**
 * <as-clamping-hub> — Armaan's ultra-low-profile clamping shaft hub (sold by Studica), modelled from the
 * CAD renders / FEA screenshot: a four-lobed plate with mounting holes, a central bore, and two Z-arranged
 * cantilever clamp arms cut free by a slit + crescent slot. Two socket screws drive the arm pads toward the
 * shaft; the arms rotate about their flexure necks and close the bore. As load builds, the machined
 * aluminium fades into an FEA-style von Mises map (blue → red). Deflection is exaggerated so it reads.
 *
 * API
 *   progress  (property / attribute, 0..1)  When set, the element is scroll-scrubbed: 0 = unloaded aluminium,
 *             ~0.7+ = fully clamped with the stress map. Remove the attribute / set `progress = null` to
 *             return to the autoplay loop.
 *             While scrubbed the camera still drifts slowly so the card never looks frozen.
 *   Default (no progress): loops every 7.5 s (rest → tighten → hold → release).
 *   prefers-reduced-motion → still frame of the clamped state. Pauses offscreen / when document.hidden.
 *   Methods: play(), pause(). Event: 'rendererror' if WebGL is unavailable.
 */
import * as THREE from '../shared/vendor/three.module.min.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const TAU = Math.PI * 2, LOOP = 7.5;

/* ---------------- geometry (units: ~1 = 10 mm; plate spans ≈ 2.5) ---------------- */
const BORE = 0.23, G = 0.05, THICK = 0.72;
const HINGE = new THREE.Vector2(-0.45, 0.18);   // upper arm flexure neck; lower arm uses -HINGE
const THETA = 0.08;                            // exaggerated arm rotation at full grip (rad)
const SHAFT_R = BORE - 0.034;
const SCREW_X = 0.40, ARM_TOP = 0.37, SPOT = 0.12;

function arc(cx, cy, r, a0, a1, n) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r)); } return p; }
function line(a, b, n) { const p = []; for (let i = 0; i <= n; i++) p.push(new THREE.Vector2(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)); return p; }
function spline(pts, n) { return new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getSpacedPoints(n); }
function join(...lists) { const out = []; for (const l of lists) for (const p of l) { const q = out[out.length - 1]; if (!q || q.distanceTo(p) > 1e-4) out.push(p.clone()); } if (out.length > 1 && out[0].distanceTo(out[out.length - 1]) < 1e-4) out.pop(); return out; }

function outlinePoints() {
  const Lc = 0.98, lr = 0.29, Rc = 3.0, c45 = Math.SQRT1_2;
  const D = Lc * c45 + Math.sqrt(Lc * Lc * c45 * c45 - Lc * Lc + (Rc + lr) * (Rc + lr));
  const pts = [];
  for (let k = 0; k < 4; k++) {
    const phi = k * Math.PI / 2, L = new THREE.Vector2(Math.cos(phi) * Lc, Math.sin(phi) * Lc);
    const Cp = new THREE.Vector2(Math.cos(phi + Math.PI / 4) * D, Math.sin(phi + Math.PI / 4) * D);
    const Cm = new THREE.Vector2(Math.cos(phi - Math.PI / 4) * D, Math.sin(phi - Math.PI / 4) * D);
    const Tm = L.clone().add(Cm.clone().sub(L).setLength(lr)), Tp = L.clone().add(Cp.clone().sub(L).setLength(lr));
    let a0 = Math.atan2(Tm.y - L.y, Tm.x - L.x), a1 = Math.atan2(Tp.y - L.y, Tp.x - L.x);
    while (a1 < a0) a1 += TAU;
    pts.push(...arc(L.x, L.y, lr, a0, a1, 28));
    // concave flank to the next lobe
    const Ln = new THREE.Vector2(Math.cos(phi + Math.PI / 2) * Lc, Math.sin(phi + Math.PI / 2) * Lc);
    const Tn = Ln.clone().add(Cp.clone().sub(Ln).setLength(lr));
    let b0 = Math.atan2(Tp.y - Cp.y, Tp.x - Cp.x), b1 = Math.atan2(Tn.y - Cp.y, Tn.x - Cp.x);
    let d = b1 - b0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    pts.push(...arc(Cp.x, Cp.y, Rc, b0, b0 + d, 24).slice(1, -1));
  }
  // spot-faces where the two clamp screws enter the flanks (upper-right and its 180° image)
  const edgeAt = x => { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (a.y > 0 && b.y > 0 && (a.x - x) * (b.x - x) <= 0 && a.x !== b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); } return 0.85; };
  const yf = edgeAt(SCREW_X + 0.05);
  for (const p of pts) { const sg = p.x > 0 && p.y > 0 ? 1 : p.x < 0 && p.y < 0 ? -1 : 0; if (sg && Math.abs(sg * p.x - SCREW_X) < SPOT && sg * p.y > yf) p.y = sg * yf; }
  return join(pts);
}

// Upper half of the Z-shaped through-cut (slit + pad slot + crescent); the lower half is its 180° image.
function cutHalf() {
  const s = Math.sqrt(BORE * BORE - G * G);
  const capC = [-0.46, 0.375], capR = Math.hypot(0.04, 0.075);
  const a0 = Math.atan2(0.30 - capC[1], -0.42 - capC[0]), a1 = Math.atan2(0.45 - capC[1], -0.50 - capC[0]);
  return join(
    line([s, G], [0.56, G], 6),                              // slit, upper (pad underside)
    line([0.56, G], [0.56, ARM_TOP], 5),                     // pad end face
    line([0.56, ARM_TOP], [-0.05, ARM_TOP], 10),             // arm top
    spline([[-0.05, ARM_TOP], [-0.25, 0.35], [-0.42, 0.30]], 8),
    arcCap(capC, capR, a0, a1),
    spline([[-0.50, 0.45], [-0.25, 0.525], [0.1, 0.555], [0.45, 0.55], [0.70, 0.525]], 18), // crescent outer wall
    line([0.70, 0.525], [0.70, -G], 8),                       // outer wall of pad slot
    line([0.70, -G], [s, -G], 6)                             // slit, lower
  );
}
function arcCap(c, r, a0, a1) { // clockwise-or-ccw: go the long way round the left (outer) side
  let d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
  const dl = d > 0 ? d - TAU : d + TAU; // the arc through the far (left) side
  const mid = a0 + d / 2, midL = a0 + dl / 2;
  const use = Math.cos(midL) < Math.cos(mid) ? dl : d;
  return arc(c[0], c[1], r, a0, a0 + use, 10);
}
function cutPoints() {
  const half = cutHalf(), alpha = Math.asin(G / BORE);
  const lowerBore = arc(0, 0, BORE, -alpha, -Math.PI + alpha, 26);
  const upperBore = arc(0, 0, BORE, Math.PI - alpha, alpha, 26);
  const rot = half.map(p => new THREE.Vector2(-p.x, -p.y));
  return join(half, lowerBore, rot, upperBore);
}

// arm membership weight of a rest-position xy for the upper arm (lower arm: call with -x,-y)
function armWeight(x, y) {
  if (x < -0.49 || x > 0.62 || y < G * 0.5) return 0;
  const top = x > -0.05 ? ARM_TOP : 0.30 + (ARM_TOP - 0.30) * clamp((x + 0.42) / 0.37);
  if (y > top + 0.012) return 0;
  return smooth((x + 0.47) / 0.22);
}

function environment() {
  const faces = [];
  for (let i = 0; i < 6; i++) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 128);
    const top = i === 2, bottom = i === 3;
    g.addColorStop(0, top ? '#d9d9d6' : '#3a3b3d'); g.addColorStop(.35, top ? '#bdbdba' : '#8d8e8f'); g.addColorStop(.5, bottom ? '#151516' : '#c9c9c6'); g.addColorStop(.62, '#2a2b2d'); g.addColorStop(1, '#0d0d0e');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    if (!bottom) { c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(22 + i * 9, 18, 14, 60); }
    faces.push(cv);
  }
  const cube = new THREE.CubeTexture(faces); cube.colorSpace = THREE.SRGBColorSpace; cube.needsUpdate = true; return cube;
}
function brushed() {
  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 256; const c = cv.getContext('2d');
  for (let y = 0; y < 256; y++) { const q = Math.round(150 + 18 * Math.sin(y * 4.731) + 9 * Math.sin(y * 17.13) + 6 * Math.sin(y * 41.7)); c.fillStyle = `rgb(${q},${q},${q})`; c.fillRect(0, y, 8, 1); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); return t;
}

const STRESS_GLSL = /* glsl */`
uniform float uGrip; uniform float uMix; varying vec2 vRest;
float g2(vec2 p, vec2 c, float s){ vec2 d=p-c; return exp(-dot(d,d)/s); }
float armField(vec2 p){
  float inArm = smoothstep(-0.50,-0.40,p.x)*(1.0-smoothstep(0.58,0.62,p.x))*smoothstep(0.0,0.04,p.y)*(1.0-smoothstep(0.38,0.42,p.y));
  float along = clamp((p.x+0.45)/1.05,0.0,1.0);
  float fibre = abs(p.y-0.21)/0.16;
  float arm = inArm*(0.50 + 0.16*along + 0.10*fibre);
  float neck = 0.80*g2(p,vec2(-0.44,0.19),0.016) + 0.25*g2(p,vec2(-0.41,0.28),0.004) + 0.30*g2(p,vec2(-0.30,0.12),0.012);
  float pad = 0.20*g2(p,vec2(${SCREW_X.toFixed(2)},0.37),0.016)*inArm + 0.10*g2(p,vec2(0.05,0.23),0.010);
  float body = 0.06 + 0.30*exp(-length(p-vec2(-0.47,0.18))/0.17);
  return max(max(arm+pad, neck), body);
}
float stressAt(vec2 p){ return clamp(max(armField(p), armField(-p)), 0.0, 1.0); }
vec3 s2l(vec3 c){ return pow(c, vec3(2.2)); }
vec3 feaMap(float t){
  vec3 c0=vec3(.09,.18,.62), c1=vec3(.05,.60,.88), c2=vec3(.22,.80,.42), c3=vec3(.95,.86,.18), c4=vec3(.90,.24,.14);
  vec3 c = t<.25? mix(c0,c1,t/.25) : t<.5? mix(c1,c2,(t-.25)/.25) : t<.75? mix(c2,c3,(t-.5)/.25) : mix(c3,c4,(t-.75)/.25);
  return s2l(mix(c, vec3(dot(c,vec3(.3,.59,.11))), .2));
}`;

function hubMaterial(uniforms, roughnessMap) {
  const m = new THREE.MeshStandardMaterial({ color: 0xbfc3c6, metalness: 0.78, roughness: 0.36, roughnessMap, envMapIntensity: 1.25 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uGrip = uniforms.uGrip; sh.uniforms.uMix = uniforms.uMix;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aRest; varying vec2 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = aRest;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + STRESS_GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 feaC = feaMap(stressAt(vRest)*uGrip);\ndiffuseColor.rgb = mix(diffuseColor.rgb, feaC, uMix);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.55, uMix);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.08, uMix);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += feaC*0.12*uMix;');
  };
  return m;
}

function buildScrew(steel, dark) {
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  // axis +y; tip at y=0 (bears on the arm pad)
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.5, 20), steel); shank.position.y = 0.25; spin.add(shank);
  const thread = [];
  for (let i = 0; i <= 260; i++) { const u = i / 260, a = u * TAU * 13; thread.push(new THREE.Vector3(Math.cos(a) * 0.054, 0.02 + u * 0.42, Math.sin(a) * 0.054)); }
  spin.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(thread), 260, 0.007, 4, false), steel));
  const head = new THREE.Shape(); head.absarc(0, 0, 0.105, 0, TAU, false);
  const hex = new THREE.Path(); for (let i = 0; i < 6; i++) { const a = -i * TAU / 6; i ? hex.lineTo(Math.cos(a) * 0.048, Math.sin(a) * 0.048) : hex.moveTo(Math.cos(a) * 0.048, Math.sin(a) * 0.048); } hex.closePath(); head.holes.push(hex);
  const hg = new THREE.ExtrudeGeometry(head, { depth: 0.11, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 32 });
  hg.rotateX(-Math.PI / 2); const hm = new THREE.Mesh(hg, steel); hm.name = 'head'; spin.add(hm);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), dark); floor.rotation.x = -Math.PI / 2; floor.name = 'floor'; spin.add(floor);
  return { g, spin, head: hm, floor };
}

function buildHub(scene) {
  const uniforms = { uGrip: { value: 0 }, uMix: { value: 0 } };
  const rough = brushed();
  const shape = new THREE.Shape(outlinePoints());
  shape.holes.push(new THREE.Path(cutPoints()));
  for (let k = 0; k < 4; k++) { const h = new THREE.Path(), a = k * Math.PI / 2; h.absarc(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.1, 0, TAU, true); shape.holes.push(h); }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 40, steps: 1 });
  geo.translate(0, 0, -THICK / 2);
  const pos = geo.attributes.position, n = pos.count;
  const rest = new Float32Array(pos.array), nrest = new Float32Array(geo.attributes.normal.array);
  const aRest = new Float32Array(n * 2), wt = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = rest[i * 3], y = rest[i * 3 + 1]; aRest[i * 2] = x; aRest[i * 2 + 1] = y;
    const wu = armWeight(x, y), wl = armWeight(-x, -y); wt[i] = wu > 0 ? wu : -wl; // sign = which arm
  }
  geo.setAttribute('aRest', new THREE.BufferAttribute(aRest, 2));
  const mat = hubMaterial(uniforms, rough);
  const hub = new THREE.Mesh(geo, mat);

  const model = new THREE.Group(); scene.add(model); model.add(hub);
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3c40, metalness: 0.8, roughness: 0.32, envMapIntensity: 1.2 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x050506 });
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0xa4a8ac, metalness: 0.7, roughness: 0.3, roughnessMap: rough, envMapIntensity: 1.0 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(SHAFT_R, SHAFT_R, 2.6, 48), shaftMat); shaft.rotation.x = Math.PI / 2; shaft.position.z = -0.85; model.add(shaft);

  // screw heads sit just proud of the flank (sunk into a counterbore)
  let edgeY = 0; for (const p of outlinePoints()) if (p.x > 0 && p.y > 0 && Math.abs(p.x - SCREW_X) < SPOT * 0.8) edgeY = Math.max(edgeY, p.y);
  const screws = [buildScrew(steel, dark), buildScrew(steel, dark)];
  const headY = edgeY - ARM_TOP;
  for (const s of screws) { s.head.position.y = headY; s.floor.position.y = headY + 0.045; s.spin.children[0].scale.y = (headY) / 0.5; s.spin.children[0].position.y = headY / 2; model.add(s.g); }
  screws[0].g.position.set(SCREW_X, ARM_TOP, 0);
  screws[1].g.position.set(-SCREW_X, -ARM_TOP, 0); screws[1].g.rotation.z = Math.PI;

  return { model, hub, geo, rest, nrest, wt, uniforms, screws, shaft, disposables: [geo, mat, steel, dark, shaftMat, rough] };
}

function deform(parts, grip) {
  const { geo, rest, nrest, wt } = parts, pos = geo.attributes.position.array, nor = geo.attributes.normal.array;
  const th = -THETA * grip;
  for (let i = 0, n = wt.length; i < n; i++) {
    const w = wt[i], j = i * 3;
    if (w === 0) { if (pos[j] !== rest[j] || pos[j + 1] !== rest[j + 1]) { pos[j] = rest[j]; pos[j + 1] = rest[j + 1]; nor[j] = nrest[j]; nor[j + 1] = nrest[j + 1]; } continue; }
    const hx = w > 0 ? HINGE.x : -HINGE.x, hy = w > 0 ? HINGE.y : -HINGE.y, a = th * Math.abs(w), c = Math.cos(a), s = Math.sin(a);
    const x = rest[j] - hx, y = rest[j + 1] - hy;
    pos[j] = hx + x * c - y * s; pos[j + 1] = hy + x * s + y * c;
    const nx = nrest[j], ny = nrest[j + 1]; nor[j] = nx * c - ny * s; nor[j + 1] = nx * s + ny * c;
  }
  geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
  // pad displacement under the screw tip
  const x = SCREW_X - HINGE.x, y = ARM_TOP - HINGE.y, c = Math.cos(th), s = Math.sin(th);
  const dy = (HINGE.y + x * s + y * c) - ARM_TOP;
  parts.screws[0].g.position.y = ARM_TOP + dy; parts.screws[1].g.position.y = -ARM_TOP - dy;
  const turn = -grip * TAU * 1.25; parts.screws[0].spin.rotation.y = turn; parts.screws[1].spin.rotation.y = turn;
}

function stateAt(t) {
  t = ((t % LOOP) + LOOP) % LOOP;
  let grip = 0;
  if (t < 0.9) grip = 0; else if (t < 3.1) grip = smooth((t - 0.9) / 2.2); else if (t < 5.5) grip = 1; else if (t < 7.0) grip = 1 - smooth((t - 5.5) / 1.5);
  return { grip, mix: smooth(grip * 1.35), az: Math.sin(TAU * t / LOOP) };
}

const HUD = '<div class="hud"><div class="bar"></div><div class="lab"><span>0</span><span class="mx">193 MPa</span></div><div class="k">von Mises · deflection exaggerated</div></div>';

class ASClampingHub extends HTMLElement {
  static get observedAttributes() { return ['progress']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host{display:block;width:100%;height:100%;position:relative;contain:content}
      canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
      .hud{position:absolute;left:12px;bottom:10px;font:500 9.5px/1.3 "JetBrains Mono",ui-monospace,monospace;color:rgba(242,239,233,.55);letter-spacing:.04em;opacity:0;transition:opacity .2s;pointer-events:none}
      .bar{width:96px;height:4px;border-radius:2px;background:linear-gradient(90deg,#2a3cbf,#1997d6,#45c46d,#ecd23a,#dc4d2a);opacity:.85}
      .lab{display:flex;justify-content:space-between;width:96px;margin:3px 0 2px}
      .hud.sm .k{display:none} .hud.sm .bar,.hud.sm .lab{width:72px}
      .fb{position:absolute;inset:0;display:none;place-items:center;color:#888;font:12px Inter,sans-serif}
    </style><canvas aria-label="Clamping hub: two socket screws flex the cantilever arms onto the shaft; an FEA stress map appears as the clamp loads."></canvas>${HUD}<div class="fb">3D preview needs WebGL.</div>`;
    this._cv = this.shadowRoot.querySelector('canvas'); this._hud = this.shadowRoot.querySelector('.hud'); this._mx = this.shadowRoot.querySelector('.mx');
    this._t = 0; this._last = 0; this._playing = true; this._visible = false; this._progress = null;
    this._reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._tick = this._tick.bind(this);
  }
  get progress() { return this._progress; }
  set progress(v) { this._progress = v === null || v === undefined || v === '' || isNaN(+v) ? null : clamp(+v); this._dirty = true; if (!this._raf && this._visible) this._raf = requestAnimationFrame(this._tick); }
  attributeChangedCallback(n, o, v) { if (n === 'progress') this.progress = v; }
  connectedCallback() {
    if (!this._r) this._setup();
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this);
    this._io = new IntersectionObserver(([e]) => { this._visible = e.isIntersecting; this._kick(); }); this._io.observe(this);
    this._onVis = () => this._kick(); document.addEventListener('visibilitychange', this._onVis);
  }
  disconnectedCallback() { this._ro?.disconnect(); this._io?.disconnect(); document.removeEventListener('visibilitychange', this._onVis); cancelAnimationFrame(this._raf); this._raf = 0; }
  play() { this._playing = true; this._kick(); }
  pause() { this._playing = false; }
  _kick() { if (this._visible && !document.hidden && !this._raf) { this._last = 0; this._raf = requestAnimationFrame(this._tick); } }
  _setup() {
    try {
      const r = this._r = new THREE.WebGLRenderer({ canvas: this._cv, antialias: true, alpha: true });
      r.debug.checkShaderErrors = false; // ANGLE-D3D emits harmless constant-folding warnings
      r.setClearColor(0x000000, 0); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
      this._scene = new THREE.Scene(); this._env = environment(); this._scene.environment = this._env;
      this._cam = new THREE.PerspectiveCamera(26, 4 / 3, 0.1, 50);
      this._scene.add(new THREE.HemisphereLight(0xf4f2ee, 0x202124, 0.9));
      const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 4, 6); this._scene.add(key);
      const rim = new THREE.DirectionalLight(0xdfe6ee, 1.1); rim.position.set(5, -2, -3); this._scene.add(rim);
      this._parts = buildHub(this._scene);
      this._parts.model.rotation.z = -0.12;
    } catch (e) { this.shadowRoot.querySelector('.fb').style.display = 'grid'; this.dispatchEvent(new CustomEvent('rendererror', { detail: { message: e.message } })); }
  }
  _resize() {
    if (!this._r) return; const b = this.getBoundingClientRect(); const w = Math.max(1, b.width), h = Math.max(1, b.height);
    this._r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); this._r.setSize(w, h, false);
    this._hud.classList.toggle('sm', w < 380); this._cam.aspect = w / h; this._cam.updateProjectionMatrix(); this._fitDist = 6.9 * Math.max(1, 1.25 / (w / h)); this._dirty = true; this._render();
  }
  _tick(now) {
    this._raf = 0;
    if (!this._visible || document.hidden) return;
    const dt = this._last ? Math.min(0.05, (now - this._last) / 1000) : 0; this._last = now;
    const live = this._playing && !this._reduced;
    if (live) { this._t += dt; this._dirty = true; }
    if (this._dirty) this._render();
    if (live) this._raf = requestAnimationFrame(this._tick);
  }
  _render() {
    if (!this._r || !this._parts) return; this._dirty = false;
    let st;
    if (this._progress !== null) { const g = smooth(this._progress / 0.7); st = { grip: g, mix: smooth(g * 1.35), az: (this._progress - 0.5) * 0.8 + (this._reduced ? 0 : 0.35 * Math.sin(this._t * 0.45)) }; }
    else if (this._reduced) st = { grip: 1, mix: 1, az: 0.3 };
    else st = stateAt(this._t);
    deform(this._parts, st.grip);
    this._parts.uniforms.uGrip.value = st.grip; this._parts.uniforms.uMix.value = st.mix;
    this._hud.style.opacity = (st.mix * 0.95).toFixed(3); this._mx.textContent = `${Math.round(193 * st.grip)} MPa`;
    const az = 0.55 + 0.16 * st.az, el = 0.42, d = this._fitDist || 7.6;
    this._cam.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    this._cam.lookAt(0.08, 0.02, -0.2);
    this._r.render(this._scene, this._cam);
  }
}
if (!customElements.get('as-clamping-hub')) customElements.define('as-clamping-hub', ASClampingHub);
export { ASClampingHub };

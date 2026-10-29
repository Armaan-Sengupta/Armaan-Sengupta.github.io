/* <as-cybertruck-lighting> — Tesla vehicle-lighting work, as lighting-signature sequences that
 * run through the diagnostic states the firmware handled. Procedural Three.js vehicles (no
 * Tesla assets); all channel numbers, currents and step counts are illustrative, not firmware data.
 *
 * Attributes / properties
 *   view="semi|cybercab|cybertruck"   (default semi)
 *     semi       : exterior lighting bring-up (markers, clearance, tail, ID bar, turn + repeaters), then a
 *                  turn / brake function test. Headlights stay off.
 *     cybercab   : champagne-gold Cybercab. Front light bar wakes, then a current-sense self-test
 *                  sweeps the bar channel by channel; an open-load channel is caught at the 1 ms
 *                  ADC sample. Camera swings to the rear bar.
 *     cybertruck : headlamp leveling calibration. Both stepper motors home and step to aim;
 *                  first with the start-offset bug (L/R out of sync), then fixed (in sync).
 *   progress (0..1, optional)  scrubs the current view's timeline; remove / set null to loop.
 *   paused                     boolean attribute, freezes the clock.
 * Events: 'ready' (first frame), 'viewchange' {detail:{view}}.
 */
import * as THREE from '../shared/vendor/three.module.min.js';

const VIEWS = ['semi', 'cybercab', 'cybertruck'];
const DUR = { semi: 15, cybercab: 14, cybertruck: 13 };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const WHITE = new THREE.Color(1, .97, .93), AMBER = new THREE.Color(1, .62, .26), RED = new THREE.Color(1, .16, .1);
const ACC = '#d0745c';
// additive glow that leaves canvas alpha untouched (canvas is transparent over the page)
function addGlow(m, premult) { m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = premult ? THREE.OneFactor : THREE.SrcAlphaFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.transparent = true; m.depthWrite = false; return m; }


/* ---------------- environment ---------------- */
function studioEnv(renderer) {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 18, 40), new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
  room.material.color.setRGB(.06, .06, .065, THREE.LinearSRGBColorSpace); s.add(room);
  const panel = (w, h, p, r, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.material.color.setRGB(k, k, k * .98, THREE.LinearSRGBColorSpace); m.position.set(...p); m.rotation.set(...r); s.add(m); };
  panel(26, 12, [0, 8.8, 0], [Math.PI / 2, 0, 0], 1.1);            // long overhead strip
  panel(16, 9, [-19, 3, 0], [0, Math.PI / 2, 0], 1.3);
  panel(16, 9, [19, 3, 0], [0, -Math.PI / 2, 0], 1.0);
  panel(30, 1.2, [0, .7, 19], [0, Math.PI, 0], .9);                // horizon line, reads on flanks
  panel(30, 1.2, [0, .7, -19], [0, 0, 0], .5);
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(s, .03); pm.dispose(); return rt.texture;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.12, 'rgba(255,255,255,.55)'); gr.addColorStop(.4, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(.55, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}

/* ---------------- geometry helpers ---------------- */
// rings: array of arrays of [x,y,z] (equal length, closed loops). cls(i,j) -> material group for quad
function loft(rings, cls, { flat = false, capStart = true, capEnd = true, capCls = [0, 0] } = {}) {
  const M = rings[0].length, pos = [], groups = [[], [], [], []];
  rings.forEach(r => r.forEach(p => pos.push(p[0], p[1], p[2])));
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M, g = groups[cls(i, j)];
    g.push(a, b, c, b, d, c);
  }
  const cap = (ri, flip, gi) => { const r = rings[ri], cx = r.reduce((s, p) => s + p[0], 0) / M, cy = r.reduce((s, p) => s + p[1], 0) / M, cz = r.reduce((s, p) => s + p[2], 0) / M;
    const ci = pos.length / 3; pos.push(cx, cy, cz); for (let j = 0; j < M; j++) { const a = ri * M + j, b = ri * M + (j + 1) % M; flip ? groups[gi].push(ci, a, b) : groups[gi].push(ci, b, a); } };
  if (capStart) cap(0, false, capCls[0]); if (capEnd) cap(rings.length - 1, true, capCls[1]);
  let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const idx = []; let start = 0; groups.forEach((g, gi) => { idx.push(...g); if (g.length) geo.addGroup(start, g.length, gi); start += g.length; });
  geo.setIndex(idx);
  if (flat) { const gs = geo.groups.slice(); geo = geo.toNonIndexed(); geo.clearGroups(); gs.forEach(g => geo.addGroup(g.start, g.count, g.materialIndex)); }
  geo.computeVertexNormals(); return geo;
}
const se = (c, n) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
function curve1D(keys) { // monotone-ish smooth interpolation through [x,y] keys sorted by x
  return x => { if (x <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [x0, y0] = keys[i], [x1, y1] = keys[i + 1]; if (x <= x1) { const t = (x - x0) / (x1 - x0), s = t * t * (3 - 2 * t); return y0 + (y1 - y0) * s; } } return keys[keys.length - 1][1]; };
}
function arch(z, zc, R, yc) { const d = z - zc; return Math.abs(d) < R ? yc + Math.sqrt(R * R - d * d) : -1; }
function wheel(mats, r, w, coverStyle) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 48, 1, false), mats.tire); tire.rotation.z = Math.PI / 2; g.add(tire);
  const side = new THREE.Mesh(new THREE.TorusGeometry(r * .86, r * .13, 12, 48), mats.tire); side.rotation.y = Math.PI / 2; side.position.x = w / 2 - .02; g.add(side);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(r * .74, r * .76, .02, 48), coverStyle === 'body' ? mats.paint : mats.hub); cover.rotation.z = Math.PI / 2; cover.position.x = w / 2 + .002; g.add(cover);
  if (coverStyle === 'aero') for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.012, r * .62, r * .12), mats.trim); sp.position.set(w / 2 + .012, 0, 0); sp.rotation.x = k * Math.PI / 3; sp.translateY(r * .36); g.add(sp); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * .14, r * .14, .02, 24), mats.trim); cap.rotation.z = Math.PI / 2; cap.position.x = w / 2 + .014; g.add(cap);
  return g;
}

/* ---------------- light bars ---------------- */
const barVS = `attribute float side; attribute vec3 tang; attribute float u; uniform float uW; varying float vS; varying float vU;
void main(){ vU = u; vS = side; vec4 c = modelViewMatrix*vec4(position,1.); vec3 t = normalize((modelViewMatrix*vec4(tang,0.)).xyz);
 vec3 n = normalize(cross(t, normalize(-c.xyz))); c.xyz += n * side * uW + normalize(-c.xyz) * .06; gl_Position = projectionMatrix*c; }`;
const barFS = `uniform sampler2D uTex; uniform vec3 uCol; uniform float uGain; uniform float uCore; varying float vS; varying float vU;
void main(){ float I = texture2D(uTex, vec2(vU, .5)).r; float s = abs(vS);
 float core = exp(-s*s*uCore) ; float halo = exp(-s*s*9.) * .35 + exp(-s*s*2.) * .1;
 vec3 c = mix(uCol, vec3(1.), core*core*.45) * (core*1.2 + halo) * I * uGain; gl_FragColor = vec4(c, 1.); }`;
class LightBar {
  constructor(points, color, n, { width = .09, core = 60, lens = .006 } = {}) {
    this.n = n; this.data = new Uint8Array(n * 4); this.tex = new THREE.DataTexture(this.data, n, 1, THREE.RGBAFormat); this.tex.magFilter = THREE.LinearFilter; this.tex.minFilter = THREE.LinearFilter; this.tex.needsUpdate = true;
    this.vals = new Float32Array(n); this.group = new THREE.Group();
    const cv = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), S = 160, P = [], T = [], SD = [], U = [], I = [];
    for (let i = 0; i <= S; i++) { const u = i / S, p = cv.getPointAt(u), t = cv.getTangentAt(u); for (const sd of [-1, 1]) { P.push(p.x, p.y, p.z); T.push(t.x, t.y, t.z); SD.push(sd); U.push(u); } if (i < S) { const a = i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('tang', new THREE.Float32BufferAttribute(T, 3)); g.setAttribute('side', new THREE.Float32BufferAttribute(SD, 1)); g.setAttribute('u', new THREE.Float32BufferAttribute(U, 1)); g.setIndex(I);
    this.mat = addGlow(new THREE.ShaderMaterial({ vertexShader: barVS, fragmentShader: barFS, uniforms: { uTex: { value: this.tex }, uCol: { value: color.clone() }, uGain: { value: 1.8 }, uW: { value: width }, uCore: { value: core } } }), true);
    const m = new THREE.Mesh(g, this.mat); m.frustumCulled = false; m.renderOrder = 4; this.group.add(m);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: .15, metalness: .2 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(cv, 120, lens, 6, false), lensMat); this.group.add(tube); this.curve = cv;
  }
  set(fn) { for (let i = 0; i < this.n; i++) { const v = clamp(fn(i / (this.n - 1), i)); this.vals[i] = v; this.data[i * 4] = this.data[i * 4 + 1] = this.data[i * 4 + 2] = Math.round(v * 255); this.data[i * 4 + 3] = 255; } this.tex.needsUpdate = true; }
}
class Lamp { // small discrete lamp: emissive lens + camera-facing glow sprite
  constructor(pos, color, size, glowTex) {
    this.group = new THREE.Group(); this.group.position.set(...pos); this.color = color;
    this.lens = new THREE.Mesh(new THREE.SphereGeometry(size * .5, 16, 10), new THREE.MeshBasicMaterial({ color: 0x111111 })); this.group.add(this.lens);
    this.sprite = new THREE.Sprite(addGlow(new THREE.SpriteMaterial({ map: glowTex, color, opacity: 0 }), false));
    this.sprite.scale.setScalar(size * 9); this.group.add(this.sprite); this.size = size; this.v = 0;
  }
  set(v) { this.v = v; this.sprite.material.opacity = v; this.sprite.scale.setScalar(this.size * (5 + 5 * v)); this.lens.material.color.copy(this.color).multiplyScalar(.08 + v * .95); }
}

/* ---------------- vehicles (metres; +z forward, y up) ---------------- */
function mats(paintColor, opts = {}) {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: paintColor, metalness: opts.metal ?? .85, roughness: opts.rough ?? .3, clearcoat: opts.coat ?? .8, clearcoatRoughness: .12, envMapIntensity: opts.env ?? 1.3, flatShading: !!opts.flat }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x060708, metalness: .1, roughness: .04, clearcoat: 1, envMapIntensity: 1.6, flatShading: !!opts.flat }),
    trim: new THREE.MeshStandardMaterial({ color: 0x0c0c0d, metalness: .1, roughness: .7, flatShading: !!opts.flat }),
    tire: new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: .85, metalness: 0 }),
    hub: new THREE.MeshStandardMaterial({ color: 0x1c1d1f, roughness: .45, metalness: .5 })
  };
}
/* smooth vehicle section: right half bottom-centre -> top-centre, mirrored. Tags: 0 under, 1 well, 2 side, 3 greenhouse */
function halfSection(q) {
  const h = [], yb = q.yb, ya = Math.max(yb, q.ya), w = q.w, wl = q.well, g0 = 1 - q.inset;
  h.push([0, yb, 0], [w * .55, yb, 0], [w - wl, yb, 1], [w - wl, ya, 1], [w - .04, ya, 1]);
  for (let i = 0; i <= 5; i++) { const s2 = i / 5; h.push([w - .045 * Math.pow(1 - s2, 2), lerp(ya + .015, q.ys, s2), 2]); }
  for (let i = 0; i <= q.nU; i++) { const t = i / q.nU * Math.PI / 2; h.push([w * g0 * se(Math.cos(t), q.n), q.ys + (q.yt - q.ys) * se(Math.sin(t), q.n), 3]); }
  h[h.length - 1][0] = 0; return h;
}
function smoothBody(zs, paramsAt, clsFn, warp = (x, y, z) => z) {
  const rings = [], tags = [];
  for (const z of zs) {
    const q = paramsAt(z), half = halfSection(q), yc = (q.yb + q.yt) / 2, k = q.k ?? 1;
    const P = half.map(([x, y]) => [x * k, yc + (y - yc) * (q.ky ?? 1)]);
    const ring = [], tg = [];
    for (let i = 0; i < P.length; i++) { ring.push([P[i][0], P[i][1], z]); tg.push(half[i][2]); }
    for (let i = P.length - 2; i >= 1; i--) { ring.push([-P[i][0], P[i][1], z]); tg.push(half[i][2]); }
    rings.push(ring); tags.push(tg);
  }
  const warped = rings.map(r => r.map(([x, y, z]) => [x, y, warp(x, y, z)]));
  const geo = loft(warped, (i, j) => clsFn(zs[i], tags[i][j], rings[i][j], rings[i][(j + 1) % rings[i].length]));
  return { geo, rings, zs };
}
function surfZ(rings, zs, x, y, front) {
  for (let k = 0; k < zs.length; k++) { const i = front ? zs.length - 1 - k : k, r = rings[i]; let ins = false;
    for (let a = 0, b = r.length - 1; a < r.length; b = a++) { const [xa, ya] = r[a], [xb, yb] = r[b]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) ins = !ins; }
    if (ins) return zs[i]; }
  return front ? zs[zs.length - 1] : zs[0];
}
// faceted section loft shared by the Cybercab and Semi (same flat-shaded language as the Cybertruck)
// half section: [x, y] points from the bottom edge up to the roof centre line; mirrored for the left side
function facetBody(zs, halfAt, cls) {
  const rings = zs.map(z => { const h = halfAt(z); return [...h.map(([x, y]) => [x, y, z]), ...h.slice().reverse().map(([x, y]) => [-x, y, z])]; });
  const n = rings[0].length / 2;
  return loft(rings, (i, j) => cls((zs[i] + zs[i + 1]) / 2, j < n ? j : 2 * n - 2 - j, j === 2 * n - 1), { flat: true });
}
const archLift = (z, zc, r, lo, hi) => { const d = Math.abs(z - zc); return d < r ? hi : d < r + .3 ? lerp(hi, lo, (d - r) / .3) : lo; };
function sideLamps(g, glowTex, list) { return list.map(([x, y, z, col, size]) => { const l = new Lamp([x, y, z], col, size, glowTex); g.add(l.group); return l; }); }

function buildCybercab(glowTex) {
  const M = mats(new THREE.Color('#bfa575'), { metal: .82, rough: .42, coat: .3, env: 1.0, flat: true });
  const ZF = 2.17, ZR = -2.17, WB = 1.42, WR = .37;
  const roof = curve1D([[ZR, .93], [-2.0, 1.02], [-1.55, 1.16], [-.9, 1.33], [-.2, 1.41], [.4, 1.38], [.95, 1.18], [1.45, .97], [1.95, .87], [ZF, .8]]);
  const belt = curve1D([[ZR, .88], [-1.6, .96], [.9, .97], [1.6, .9], [ZF, .76]]);
  const half = curve1D([[ZR, .8], [-1.9, .93], [-1.3, .97], [1.2, .97], [1.85, .92], [ZF, .8]]);
  const zs = [ZR, -2.05, -1.86, -1.55, -1.06, -.6, -.2, .4, .95, 1.06, 1.45, 1.78, 1.95, 2.08, ZF];
  const geo = facetBody(zs, z => {
    const yb = Math.max(archLift(z, WB, .4, .26, .74), archLift(z, -WB, .4, .26, .74)), w = half(z), b = Math.min(belt(z), roof(z) - .04), t = roof(z);
    return [[w - .07, yb], [w, yb + .1], [w, b], [lerp(w, w * .66, .62), lerp(b, t, .72)], [w * .58, t]];
  }, (z, jj, bottom) => {
    if (bottom || jj === 0) return 2;
    if ((jj === 2 || jj === 3) && z > -1.5 && z < .95) return 1;      // side glass band
    if (jj === 3 && z >= .95 && z < 1.4) return 1;                     // windshield corners
    if (jj === 4 && z > -.45 && z < 1.42) return 1;                    // windshield + glass roof
    return 0;
  });
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, [M.paint, M.glass, M.trim]));
  for (const z of [WB, -WB]) for (const s2 of [-1, 1]) { const w = wheel(M, WR, .24, 'body'); w.position.set(s2 * .82, WR, z); if (s2 < 0) w.rotation.y = Math.PI; g.add(w); }
  const fpts = [], rpts = [];
  for (let i = 0; i <= 12; i++) { const x = lerp(-.74, .74, i / 12); fpts.push([x, .78, ZF + .006]); rpts.push([lerp(-.8, .8, i / 12), .9, ZR - .006]); }
  const front = new LightBar(fpts, WHITE, 64, { width: .05 }), rear = new LightBar(rpts, RED, 48, { width: .065 });
  g.add(front.group, rear.group);
  const turns = sideLamps(g, glowTex, [[-.86, .9, ZR - .02, AMBER, .07], [.86, .9, ZR - .02, AMBER, .07]]);
  const repeaters = sideLamps(g, glowTex, [[-.985, .9, 1.02, AMBER, .045], [.985, .9, 1.02, AMBER, .045]]);
  return { group: g, bars: { front, rear }, turns, repeaters, len: 4.34, M };
}

function buildSemi(glowTex) {
  const M = mats(new THREE.Color('#d9dbdc'), { metal: .25, rough: .45, coat: .6, env: .9, flat: true });
  const ZF = 3.1, ZC = -.75, WF = 2.05, R = .52;
  const roof = curve1D([[ZC, 3.5], [-.35, 3.7], [.5, 3.8], [1.3, 3.62], [2.8, 2.1], [3.0, 1.75], [ZF, 1.45]]);
  const zs = [ZC, ZC + .04, -.2, .9, 1.4, WF - .82, WF - .52, WF + .52, 2.85, 2.95, 3.04, ZF].sort((a, b) => a - b);
  const geo = facetBody(zs, z => {
    const yb = archLift(z, WF, .52, .55, 1.16), t = roof(z), b = Math.min(2.2, t - .06), w = 1.25 * (z < -.4 ? .94 : 1);
    return [[w - .1, yb], [w, yb + .14], [w, b], [w * .93, lerp(b, t, .55)], [w * .76, lerp(b, t, .9)], [w * .56, t]];
  }, (z, jj, bottom) => {
    if (bottom || jj === 0) return 2;
    if ((jj === 2 || jj === 3) && z > 1.3 && z < 2.6) return 1;         // door windows
    if (jj >= 3 && z > 1.42 && z < 2.84) return 1;                      // wraparound windshield
    return 0;
  });
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, [M.paint, M.glass, M.trim]));
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(1.0, .26, 3.0, 0, .86, -2.15, M.trim);                                   // frame rails
  box(1.9, .1, 1.2, 0, 1.2, -2.2, M.hub);                                      // fifth wheel deck
  for (const s of [-1, 1]) {
    box(.12, .62, 2.1, s * 1.17, .78, .25, M.paint);                           // side fairing / battery skirt
    box(.06, .62, 1.75, s * 1.13, .88, -1.8, M.trim);                           // skirt behind cab
    box(.9, .05, .5, s * .82, 1.18, -2.27, M.trim);                             // drive-axle fenders
  }
  box(2.3, .14, .08, 0, .98, -3.38, M.trim);                                   // rear light bracket
  for (const s of [-1, 1]) {
    const w = wheel(M, R, .32, 'aero'); w.position.set(s * 1.06, R, WF); if (s < 0) w.rotation.y = Math.PI; g.add(w);
    for (const z of [-1.62, -2.86]) { const d = wheel(M, R, .56, 'aero'); d.position.set(s * .95, R, z); if (s < 0) d.rotation.y = Math.PI; g.add(d); }
  }
  const fpts = [], rpts = [];
  for (let i = 0; i <= 12; i++) { const x = lerp(-1.1, 1.1, i / 12); fpts.push([x, 1.5, ZF + .01]); rpts.push([lerp(-.28, .28, i / 12), 1.0, -3.43]); }
  const front = new LightBar(fpts, WHITE, 64, { width: .06 }), rear = new LightBar(rpts, RED, 24, { width: .06 });
  g.add(front.group, rear.group);
  const tails = sideLamps(g, glowTex, [[-.98, .99, -3.44, RED, .09], [.98, .99, -3.44, RED, .09]]);
  const turns = sideLamps(g, glowTex, [[-1.12, .99, -3.44, AMBER, .08], [1.12, .99, -3.44, AMBER, .08]]);
  const repeaters = sideLamps(g, glowTex, [[-1.265, 1.75, 2.45, AMBER, .06], [1.265, 1.75, 2.45, AMBER, .06]]);
  const markers = sideLamps(g, glowTex, [...[-1, 1].flatMap(s => [[s * 1.25, 1.05, .9, AMBER, .045], [s * 1.25, 1.05, -.4, AMBER, .045], [s * 1.18, 1.05, -2.9, RED, .045]]),
    ...[-.5, -.25, 0, .25, .5].map(x => [x, 3.79, 1.25, AMBER, .04])]);
  return { group: g, bars: { front, rear }, tails, turns, repeaters, markers, len: 6.6, M };
}
function buildCybertruck(glowTex) {
  const M = mats(new THREE.Color('#c4c6c8'), { metal: .9, rough: .55, coat: 0, env: .7, flat: true });
  const ZF = 2.84, ZR = -2.84, WF = 1.89, WRr = -1.92, R = .445;
  const topY = z => z >= -.2 ? lerp(1.80, 1.05, (z + .2) / (ZF + .2)) : lerp(1.80, 1.22, (-.2 - z) / (-.2 - ZR));
  const archY = (z, zc) => { const d = Math.abs(z - zc); return d < .36 ? 1.0 : d < .7 ? lerp(1.0, .5, (d - .36) / .34) : -1; };
  const botY = z => Math.max(.5, archY(z, WF), archY(z, WRr));
  const zs = [ZR, ZR + .02];
  for (const zc of [WRr, WF]) zs.push(zc - .7, zc - .36, zc + .36, zc + .7);
  zs.push(-.2, 1.95, 2.56, ZF - .02, ZF); zs.sort((a, b) => a - b);
  const rings = zs.map(z => {
    const yt = topY(z), yb = botY(z), belt = Math.min(1.12, yt), hw = 1.0, hwt = lerp(hw, z > -1.0 ? .66 : .8, clamp((yt - belt) / .22)), rock = Math.max(yb + .06, .66);
    const h = [[.96, yb], [hw, yb + .04], [hw, Math.min(rock, belt - .01)], [hw, belt], [hwt, yt]];
    return [...h.map(([x, y]) => [x, y, z]), ...h.slice().reverse().map(([x, y]) => [-x, y, z])];
  });
  const geo = loft(rings, (i, j) => {
    const z = (zs[i] + zs[i + 1]) / 2, jj = j < 5 ? j : 9 - j;
    if (j === 9 || jj === 0 || jj === 1) return 2;          // bottom, rocker chamfer
    if (jj === 2) return 2;                                   // black lower cladding band
    if (jj === 4 && j === 4 && z > -.95 && z < 1.95) return 1; // roof / windshield glass
    if (jj === 3 && z > -.9 && z < 1.35) return 1;            // side glass
    return 0;
  }, { flat: true, capCls: [0, 0] });
  const body = new THREE.Mesh(geo, [M.paint, M.glass, M.trim]);
  const g = new THREE.Group(); g.add(body);
  // bumpers + arch flares
  const fb = new THREE.Mesh(new THREE.BoxGeometry(1.98, .3, .3), M.trim); fb.position.set(0, .56, ZF - .13); g.add(fb);
  const rb = new THREE.Mesh(new THREE.BoxGeometry(1.98, .3, .26), M.trim); rb.position.set(0, .6, ZR + .11); g.add(rb);
  for (const zc of [WF, WRr]) for (const s of [-1, 1]) {
    const sh = new THREE.Shape(); sh.moveTo(-.78, .44); sh.lineTo(-.4, 1.08); sh.lineTo(.4, 1.08); sh.lineTo(.78, .44); sh.lineTo(.7, .44); sh.lineTo(.35, 1.0); sh.lineTo(-.35, 1.0); sh.lineTo(-.7, .44);
    const fg = new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: false }); const f = new THREE.Mesh(fg, M.trim); f.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; f.position.set(s * 1.0, 0, zc); g.add(f);
    const w = wheel(M, R, .3, 'aero'); w.position.set(s * .86, R, zc); if (s < 0) w.rotation.y = Math.PI; g.add(w);
  }
  const fpts = [], rpts = []; for (let i = 0; i <= 12; i++) { const x = lerp(-.99, .99, i / 12); fpts.push([x, 1.05, ZF + .006]); rpts.push([x, 1.215, ZR - .006]); }
  const front = new LightBar(fpts, WHITE, 64, { width: .075 }), rear = new LightBar(rpts, RED, 48, { width: .085 });
  g.add(front.group, rear.group);
  // headlamp emitters at the outer ends of the bar
  const heads = [-1, 1].map(s => { const l = new Lamp([s * .8, 1.0, ZF + .01], WHITE, .05, glowTex); g.add(l.group); return l; });
  return { group: g, bars: { front, rear }, heads, len: 5.68, M };
}
/* ---------------- headlamp beams (cybertruck) ---------------- */
const beamVS = `varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vT; uniform float uLen;
void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); vT = clamp(position.z/uLen, 0., 1.);
 gl_Position = projectionMatrix*viewMatrix*w; }`;
const beamFS = `uniform float uI; varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vT;
void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = f * (1.-vT) * (1.-vT) * .05 * uI * smoothstep(0., .04, vT);
 gl_FragColor = vec4(vec3(1.,.97,.92)*a, 1.); }`;
const poolVS = `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const poolFS = `uniform vec3 uO[2]; uniform float uD[2]; uniform float uI[2]; varying vec3 vW;
void main(){ vec3 c = vec3(0.);
 for (int i = 0; i < 2; i++) { vec2 d = vW.xz - uO[i].xz; float r = length(d); float ang = atan(d.x, d.y);
   float spread = exp(-pow(ang/.24, 2.)); float cut = 1. - smoothstep(uD[i]-.18, uD[i]+.06, r); float near = smoothstep(.2, 1.4, r);
   float fall = 1. / (1. + .03*r*r); c += vec3(1.,.96,.9) * spread * cut * near * fall * uI[i] * .42;
   }
 gl_FragColor = vec4(c, 1.); }`;

/* illustrative channel groups for the Semi bring-up HUD (not firmware data) */
const SEMI_CH = ['SIDE MARKERS', 'REAR CLEARANCE', 'ROOF CLEARANCE', 'TAIL', 'REAR ID BAR', 'TURN L + REPEATER', 'TURN R + REPEATER'];

/* ---------------- element ---------------- */
const CSS = `:host{display:block;width:100%;height:100%;position:relative;contain:content}
.wrap{position:absolute;inset:0;overflow:hidden}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.gl{transition:opacity .35s ease}.hud{pointer-events:none}`;

class CybertruckLighting extends HTMLElement {
  static get observedAttributes() { return ['view', 'progress', 'paused']; }
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="wrap" role="img" aria-label="Tesla vehicle lighting signature and diagnostics sequence"><canvas class="gl"></canvas><canvas class="hud"></canvas></div>`;
    this._view = 'semi'; this._shown = null; this._progress = null; this._clock = 0; this._last = 0; this._visible = true;
    this._reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  get view() { return this._view; } set view(v) { this.setAttribute('view', v); }
  get progress() { return this._progress; }
  set progress(v) { this._progress = (v === null || v === undefined || v === '') ? null : clamp(+v || 0); this._kick(); }
  attributeChangedCallback(n, o, v) {
    if (n === 'view') { const nv = VIEWS.includes(v) ? v : 'semi'; if (nv !== this._view) { this._view = nv; this._clock = 0; this.dispatchEvent(new CustomEvent('viewchange', { detail: { view: nv } })); } }
    if (n === 'progress') this.progress = v;
    this._kick();
  }
  connectedCallback() {
    if (this._r) return;
    const av = this.getAttribute('view'); if (VIEWS.includes(av)) this._view = av;
    if (this.hasAttribute('progress')) this._progress = clamp(+this.getAttribute('progress') || 0);
    this._init();
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this);
    this._io = new IntersectionObserver(e => { this._visible = e[0].isIntersecting; this._last = 0; if (this._visible) this._kick(); }, { rootMargin: '120px' }); this._io.observe(this);
    this._onVis = () => { this._last = 0; this._kick(); }; document.addEventListener('visibilitychange', this._onVis);
    this._resize(); this._kick();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this._raf); this._raf = 0; this._ro?.disconnect(); this._io?.disconnect(); document.removeEventListener('visibilitychange', this._onVis);
    this._scene?.traverse(o => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach(m => { m.map?.dispose(); m.dispose(); }); });
    this._env?.dispose(); this._r?.dispose(); this._r = null;
  }
  _kick() { if (!this._r || this._raf) return; this._raf = requestAnimationFrame(t => this._frame(t)); }
  _init() {
    const cv = this.shadowRoot.querySelector('.gl'); this._gl = cv; this._hud = this.shadowRoot.querySelector('.hud'); this._hc = this._hud.getContext('2d');
    const r = this._r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    r.debug.checkShaderErrors = false; r.setClearColor(0, 0); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1; r.outputColorSpace = THREE.SRGBColorSpace;
    const sc = this._scene = new THREE.Scene(); this._env = studioEnv(r); sc.environment = this._env;
    this._cam = new THREE.PerspectiveCamera(28, 1, .05, 200);
    const key = new THREE.DirectionalLight(0xfff4e8, 1.4); key.position.set(5, 8, 6); sc.add(key);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 1.0); rim.position.set(-6, 4, -5); sc.add(rim);
    sc.add(new THREE.HemisphereLight(0x8a8f99, 0x050505, .25));
    const fc = document.createElement('canvas'); fc.width = fc.height = 256; const fg = fc.getContext('2d'), gr = fg.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(.35, '#bbb'); gr.addColorStop(1, '#000'); fg.fillStyle = gr; fg.fillRect(0, 0, 256, 256);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshLambertMaterial({ color: 0x0b0b0c, alphaMap: new THREE.CanvasTexture(fc), transparent: true, depthWrite: true }));
    floor.rotation.x = -Math.PI / 2; floor.renderOrder = -1; sc.add(floor);
    const glow = glowTexture(), shTex = shadowTexture();
    this._veh = { semi: buildSemi(glow), cybercab: buildCybercab(glow), cybertruck: buildCybertruck(glow) };
    this._spills = [];
    for (const k of VIEWS) { const v = this._veh[k];
      for (const [bk, col] of [['front', WHITE], ['rear', RED]]) { const bar = v.bars[bk], pts = bar.curve.getPoints(8), cz = pts.reduce((a, p) => a + p.z, 0) / pts.length;
        const sp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), addGlow(new THREE.MeshBasicMaterial({ map: glow, color: col.clone(), opacity: 0 }), false));
        sp.rotation.x = -Math.PI / 2; sp.position.set(0, .008, cz + Math.sign(cz) * .55); sp.scale.set(3.2, 1.6, 1); v.group.add(sp); this._spills.push({ sp, bar }); } const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .004; sh.scale.set(2.7, v.len * 1.2, 1); v.group.add(sh); v.group.visible = false; sc.add(v.group); }
    // cybertruck beams + pools
    const T = this._veh.cybertruck; this._beams = [-1, 1].map(s => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.9, 7, 40, 1, true), addGlow(new THREE.ShaderMaterial({ vertexShader: beamVS, fragmentShader: beamFS, side: THREE.DoubleSide, uniforms: { uI: { value: 0 }, uLen: { value: 7 } } }), true));
      cone.geometry.translate(0, -3.5, 0); cone.geometry.rotateX(-Math.PI / 2); cone.geometry.scale(1, .45, 1);
      const piv = new THREE.Group(); piv.position.set(s * .8, 1.0, 2.86); piv.add(cone); T.group.add(piv); return piv;
    });
    this._pool = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), addGlow(new THREE.ShaderMaterial({ vertexShader: poolVS, fragmentShader: poolFS,
      uniforms: { uO: { value: [new THREE.Vector3(-.8, 0, 2.9), new THREE.Vector3(.8, 0, 2.9)] }, uD: { value: [0, 0] }, uI: { value: [0, 0] } } }), true));
    this._pool.rotation.x = -Math.PI / 2; this._pool.position.set(0, .006, 8.5); T.group.add(this._pool);
    this._camPos = new THREE.Vector3(); this._camTgt = new THREE.Vector3(); this._snap = true;
  }
  _resize() {
    const w = Math.max(1, this.clientWidth), h = Math.max(1, this.clientHeight), d = Math.min(2, devicePixelRatio || 1);
    this._w = w; this._h = h; this._dpr = d; this._r.setPixelRatio(d); this._r.setSize(w, h, false);
    this._hud.width = Math.round(w * d); this._hud.height = Math.round(h * d); this._cam.aspect = w / h; this._cam.updateProjectionMatrix(); this._kick();
  }
  _t(v) { const T = DUR[v]; return this._progress !== null ? this._progress * T * .9999 : this._clock % T; }

  /* ---- sequences: each returns camera + sets lights + hud state ---- */
  // rear 3/4: tail bar wakes, current-sense self-test sweeps its channels (one open load caught at the 1 ms sample),
  // then brake and turn signals with the side repeaters; the front bar (headlights) stays off
  _cybercab(t) {
    const V = this._veh.cybercab, F = V.bars.front, R = V.bars.rear, N = 16, fault = 10;
    const wake = sm(.2, 1.4, t), test = t >= 1.6 && t < 7.6, ti = test ? Math.floor((t - 1.6) / .375) : (t >= 7.6 ? N : -1), tp = test ? ((t - 1.6) / .375) % 1 : 0;
    const brake = sm(8.0, 8.3, t) * (1 - sm(9.8, 10.1, t)) + sm(12.6, 12.9, t), blink = t > 10.2 && (t - 10.2) % .7 < .38 ? 1 : 0;
    F.set(() => 0);
    R.set((u) => {
      const seg = Math.min(N - 1, Math.floor(u * N)), d = Math.abs(u - .5) * 2, w = sm(d - .08, d, wake * 1.08);
      if (t < 1.6) return w * .5;
      if (seg === fault && t >= 1.6 + fault * .375) return 0;
      if (test) { if (seg === ti) return .55 + .45 * Math.sin(tp * Math.PI); return seg < ti ? .5 : .2; }
      return .5 + .5 * brake;
    });
    V.turns.forEach((l, i) => l.set(i === 1 ? blink : 0)); V.repeaters.forEach((l, i) => l.set(i === 1 ? blink : 0));
    this._hudState = { kind: 'cab', t, N, fault, ti, tp, test, brake, blink };
    const k = sm(10.0, 12.2, t), e = k * k * (3 - 2 * k);
    const a = lerp(Math.atan2(4.2, -4.6), Math.atan2(5.2, 1.6), e) + Math.sin(t * .3) * .03, rad = lerp(8.8, 8.0, e);
    return { pos: new THREE.Vector3(Math.sin(a) * rad, lerp(2.2, 1.8, e), Math.cos(a) * rad), tgt: new THREE.Vector3(0, .7, lerp(-.5, .3, e)) };
  }
  // Semi exterior lighting bring-up: channels come up group by group with a current-sense check,
  // then turn signals, repeaters and brake run as a function test. Headlights stay off.
  _semi(t) {
    const V = this._veh.semi, groups = SEMI_CH;
    const up = (g) => sm(1.0 + g * .9, 1.3 + g * .9, t);
    const blink = t > 9.4 && (t - 9.4) % .7 < .38 ? 1 : 0, brake = sm(12.2, 12.4, t) * (1 - sm(14.2, 14.5, t)), turnSide = t < 12 ? 1 : -1;
    V.bars.front.set(() => 0);
    V.markers.forEach((l, i) => l.set(up(i < 6 ? (l.color === RED ? 1 : 0) : 2) * .85));
    V.tails.forEach((l) => l.set(up(3) * (.45 + .55 * brake)));
    V.bars.rear.set(() => up(4) * .55);
    const tl = up(5) * (t < 9.4 ? 1 : 0), tr = up(6) * (t < 9.4 ? 1 : 0);
    const fn = (i) => (t < 9.4 ? (i ? tr : tl) * .9 : ((i ? 1 : -1) === turnSide || t > 13.2 ? blink : 0));
    V.turns.forEach((l, i) => l.set(fn(i))); V.repeaters.forEach((l, i) => l.set(fn(i)));
    const ci = Math.min(groups.length, Math.floor(clamp((t - 1.0) / .9, 0, groups.length)));
    this._hudState = { kind: 'semi', t, ci, blink, brake, func: t >= 9.4 };
    const k = sm(5.2, 9.0, t), e = k * k * (3 - 2 * k);
    const a = lerp(Math.atan2(7.5, 7.5), Math.atan2(7.2, -8.2), e) + Math.sin(t * .25) * .03, rad = lerp(15, 14.5, e) + 2 * Math.sin(Math.PI * e);
    return { pos: new THREE.Vector3(Math.sin(a) * rad, lerp(4.8, 4.2, e), Math.cos(a) * rad), tgt: new THREE.Vector3(0, 1.6, lerp(.6, -1.2, e)) };
  }
  _cybertruck(t) {
    const V = this._veh.cybertruck, F = V.bars.front, R = V.bars.rear;
    const cycle = t < 6.5 ? 0 : 1, lt = cycle ? t - 6.5 : t;              // two calibration runs
    const wake = sm(.15, 1.0, lt);
    F.set(u => { const d = Math.abs(u - .5) * 2; return sm(d - .08, d, wake * 1.08) * .9; });
    R.set(() => .55 * sm(.2, 1, lt));
    // stepper: home (drive to low stop) then step to aim. Bug: right side starts late.
    const off = cycle ? 0 : .75, home = (s) => sm(1.0 + s, 1.9 + s, lt), aim = (s) => sm(2.4 + s, 4.3 + s, lt);
    const pos = s => { const h = home(s), a = aim(s); return lerp(lerp(.62, 0, h), 1, a); };   // 0 = low stop, 1 = target
    const pl = pos(0), pr = pos(off), lampOn = sm(.9, 1.3, lt) * (1 - sm(5.9, 6.4, lt));
    const steps = p => Math.round(p * 1200);
    const dist = p => lerp(2.2, 7.2, p);
    this._beams.forEach((b, i) => { const p = i ? pr : pl; b.rotation.x = Math.atan(1.0 / dist(p)); b.children[0].material.uniforms.uI.value = lampOn; });
    V.heads.forEach((h, i) => h.set(lampOn * .9));
    const U = this._pool.material.uniforms; [pl, pr].forEach((p, i) => { U.uD.value[i] = dist(p); U.uI.value[i] = lampOn; });
    this._hudState = { kind: 'truck', cycle, l: steps(pl), r: steps(pr), pl, pr, lt, lampOn };
    const pos3 = new THREE.Vector3(8.2 + Math.sin(t * .3) * .3, 4.2, 11), tgt = new THREE.Vector3(-.2, .55, 2.0);
    return { pos: pos3, tgt, scale: 9 };
  }
  _frame(now) {
    this._raf = 0; if (!this._r) return;
    const dt = this._last ? Math.min(.05, (now - this._last) / 1000) : 0; this._last = now;
    const running = !this._reduced && !this.hasAttribute('paused'); if (running) this._clock += dt;
    if (this._reduced && this._progress === null) this._clock = { semi: 9, cybercab: 11, cybertruck: 11 }[this._view];
    // view swap with a short dip
    if (this._shown !== this._view) {
      if (this._shown && !this._dipping) { this._dipping = true; this._gl.style.opacity = 0; this._dipT = now; }
      if (!this._shown || now - this._dipT > 360) { for (const k of VIEWS) this._veh[k].group.visible = k === this._view; this._shown = this._view; this._snap = true; this._dipping = false; this._gl.style.opacity = 1; }
    }
    const v = this._shown, t = this._t(v), c = this['_' + v](t);
    const asp = this._w / this._h, fit = asp < 1.5 ? Math.min(2.4, Math.pow(1.5 / asp, 1.1)) : 1;
    const pos = c.pos.clone().sub(c.tgt).multiplyScalar(fit).add(c.tgt);
    if (this._snap || !dt) { this._camPos.copy(pos); this._camTgt.copy(c.tgt); this._snap = false; } else { const f = 1 - Math.exp(-6 * dt); this._camPos.lerp(pos, f); this._camTgt.lerp(c.tgt, f); }
    this._cam.position.copy(this._camPos); this._cam.lookAt(this._camTgt);
    for (const { sp, bar } of this._spills) { let m = 0; for (let i = 0; i < bar.n; i++) m += bar.vals[i]; sp.material.opacity = .32 * m / bar.n; }
    this._r.render(this._scene, this._cam); this._drawHud(v);
    if (!this._ready) { this._ready = true; this.dispatchEvent(new Event('ready')); }
    if (this._visible && !document.hidden && (running || this._dipping || dt === 0)) this._kick();
  }
  _drawHud(v) {
    const c = this._hc, d = this._dpr, W = this._w, H = this._h, S = this._hudState; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    const fs = W < 520 ? 9 : 10.5, pad = W < 520 ? 14 : 22, lh = fs * 1.7; c.font = `${fs}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
    const dim = 'rgba(242,239,233,.42)', mid = 'rgba(242,239,233,.7)', hi = 'rgba(242,239,233,.94)';
    const txt = (s, x, y, col = dim, al = 'left') => { c.fillStyle = col; c.textAlign = al; c.fillText(s, x, y); };
    if (!S) return;
    if (S.kind === 'cab') {
      const { t, N, fault, ti, tp, test } = S;
      const phase = t < 1.6 ? 'TAIL BAR WAKE' : test ? 'CURRENT-SENSE SELF-TEST' : t < 8 ? 'SELF-TEST COMPLETE' : t < 10.2 ? 'BRAKE' : 'TURN SIGNAL · SIDE REPEATER';
      txt(phase, pad, pad + fs, mid);
      txt('ADC SAMPLE  1 ms', pad, pad + fs + lh, dim);
      // channel strip
      const cw = Math.min(14, (W * .42) / N), y0 = H - pad - fs * 7.2;
      for (let i = 0; i < N; i++) {
        const x = pad + i * (cw + 3), done = ti > i || ti >= N, act = test && ti === i, isF = i === fault && (ti > fault || ti >= N || (act));
        c.strokeStyle = isF ? ACC : act ? hi : 'rgba(242,239,233,.22)'; c.lineWidth = 1; c.strokeRect(x + .5, y0 + .5, cw, cw * .7);
        if (done && !isF) { c.fillStyle = 'rgba(242,239,233,.55)'; c.fillRect(x + 2, y0 + 2, cw - 3, cw * .7 - 3); }
        if (act && !isF) { c.fillStyle = hi; c.fillRect(x + 2, y0 + 2, (cw - 3) * clamp(tp * 1.4), cw * .7 - 3); }
      }
      const cur = test ? ti : (t < 1.6 ? -1 : fault), isFault = cur === fault && (test || t >= 7.6);
      txt(cur >= 0 ? `CH ${String(cur + 1).padStart(2, '0')}` : 'CH --', pad, y0 - 8, mid);
      if (cur >= 0) txt(isFault ? 'OPEN LOAD · FLAGGED' : (test ? 'PASS' : ''), pad + fs * 6, y0 - 8, isFault ? ACC : hi);
      // trace: commanded current vs time; sample at 1 ms
      const bw = Math.min(260, W * .42), bh = fs * 4.2, bx = pad, by = H - pad - bh;
      c.strokeStyle = 'rgba(242,239,233,.14)'; c.strokeRect(bx + .5, by + .5, bw, bh);
      const thY = by + bh * .55; c.setLineDash([2, 3]); c.strokeStyle = 'rgba(242,239,233,.25)'; c.beginPath(); c.moveTo(bx, thY); c.lineTo(bx + bw, thY); c.stroke(); c.setLineDash([]);
      const sx = bx + bw * .3; c.strokeStyle = 'rgba(242,239,233,.35)'; c.beginPath(); c.moveTo(sx, by + 3); c.lineTo(sx, by + bh - 3); c.stroke();
      txt('1 ms', sx + 4, by + fs + 1, dim);
      if (cur >= 0) {
        const prog = test ? clamp(tp * 1.25) : 1; c.strokeStyle = isFault ? ACC : hi; c.lineWidth = 1.3; c.beginPath();
        for (let i = 0; i <= 80 * prog; i++) { const u = i / 80, x = bx + 4 + (bw - 8) * u, ms = u * 3.3; let yv;
          if (isFault) yv = .78 * Math.exp(-ms / .22) * (ms > .05 ? 1 : ms / .05); else yv = .82 * (1 - Math.exp(-ms / .12));
          const y = by + bh - 5 - (bh - 10) * yv; i ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke(); c.lineWidth = 1;
      }
      txt('SENSE', bx + bw, by - 6, dim, 'right');
      return;
    }
    if (S.kind === 'semi') {
      const { ci, func, blink, brake } = S;
      txt('TESLA SEMI · EXTERIOR LIGHTING BRING-UP', pad, pad + fs, mid);
      txt(func ? 'FUNCTION TEST · TURN / BRAKE' : 'CURRENT-SENSE CHECK PER CHANNEL', pad, pad + fs + lh, func ? hi : dim);
      const y0 = H - pad - lh * (SEMI_CH.length + 1);
      SEMI_CH.forEach((n, i) => { const done = i < ci, act = i === ci && !func; txt(n, pad, y0 + lh * i, done ? mid : act ? hi : 'rgba(242,239,233,.22)'); txt(done ? 'OK' : act ? '..' : '', pad + fs * 20, y0 + lh * i, done ? hi : dim); });
      if (func) txt('TURN ' + (blink ? 'ON ' : 'OFF') + '   BRAKE ' + (brake > .5 ? 'ON' : 'OFF'), pad, y0 + lh * SEMI_CH.length, blink ? '#f0a35a' : dim);
      return;
    }
    if (S.kind === 'truck') {
      const { cycle, l, r, pl, pr, lt } = S, delta = Math.abs(l - r);
      txt('HEADLAMP LEVELING · STEPPER CALIBRATION', pad, pad + fs, mid);
      txt(cycle ? 'SHARED START' : 'START OFFSET', pad, pad + fs + lh, cycle ? hi : ACC);
      const phase = lt < 1 ? 'WAKE' : lt < 2.3 ? 'HOMING' : lt < 5.2 ? 'STEPPING TO AIM' : 'AIMED';
      txt(phase, pad, pad + fs + lh * 2, dim);
      const gh = Math.min(110, H * .26), gx = pad + 4, gy = H - pad - gh - fs * 1.8;
      [['L', pl, l], ['R', pr, r]].forEach(([n, p, st], i) => { const x = gx + i * fs * 7; c.strokeStyle = 'rgba(242,239,233,.2)'; c.strokeRect(x + .5, gy + .5, 6, gh); c.fillStyle = hi; c.fillRect(x + 1.5, gy + gh * (1 - p), 4, gh * p); txt(n, x + 2, gy + gh + fs * 1.5, mid); txt(String(st).padStart(4, ' '), x + 12, gy + gh * (1 - p) + 4, mid); });
      txt('Δ STEPS', gx + fs * 15, gy + fs, dim); txt(String(delta), gx + fs * 15, gy + fs + lh, delta > 4 ? ACC : hi);
      txt(delta > 4 ? 'OUT OF SYNC' : (lt > 2 ? 'IN SYNC' : ''), gx + fs * 15, gy + fs + lh * 2, delta > 4 ? ACC : hi);
      return;
    }
  }
}
if (!customElements.get('as-cybertruck-lighting')) customElements.define('as-cybertruck-lighting', CybertruckLighting);
export { CybertruckLighting };

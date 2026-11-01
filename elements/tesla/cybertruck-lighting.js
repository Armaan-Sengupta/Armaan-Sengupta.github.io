/* <as-cybertruck-lighting> — Tesla vehicle-lighting work, as lighting-signature sequences that
 * run through the diagnostic states the firmware handled. Procedural Three.js vehicles (no
 * Tesla assets); all channel numbers, currents and step counts are illustrative, not firmware data.
 *
 * Attributes / properties
 *   view="semi|cybercab|cybertruck"   (default semi)
 *     semi       : exterior lighting bring-up (markers, clearance, tail, ID bar, turn + repeaters), then a
 *                  turn / brake function test. Headlights stay off.
 *     cybercab   : current-sense self-test per exterior light (the rear bar is one channel). A disconnected
 *                  turn lamp false-passes on residual filter-cap charge with the original sample time,
 *                  then is caught once the sample time is lengthened. Headlights stay off.
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
  const flat = !!opts.flat, off = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide };
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: paintColor, metalness: opts.metal ?? .85, roughness: opts.rough ?? .3, clearcoat: opts.coat ?? .8, clearcoatRoughness: .08, envMapIntensity: opts.env ?? 1.3, flatShading: flat, side: flat ? THREE.FrontSide : THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x040506, metalness: .3, roughness: .04, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.2, flatShading: flat, ...off }),
    trim: new THREE.MeshStandardMaterial({ color: 0x0e0e0f, metalness: .15, roughness: .7, flatShading: flat, ...off }),
    seam: new THREE.MeshBasicMaterial({ color: 0x040404, ...off, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: .88, metalness: 0, side: THREE.DoubleSide }),
    hub: new THREE.MeshPhysicalMaterial({ color: opts.hub ?? 0x6f7276, roughness: .3, metalness: .9, clearcoat: .6, envMapIntensity: 1.3, side: THREE.DoubleSide }),
    well: new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.DoubleSide })
  };
}
// rounded tyre (lathe) with a shallow aero cover dish and a dark inner face
function wheel(M, r, w, style) {
  const g = new THREE.Group(), q = .12 * r, prof = [new THREE.Vector2(r * .68, -w / 2)];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 12; prof.push(new THREE.Vector2(r - q + q * Math.cos(a), -w / 2 + q + q * Math.sin(a))); }
  for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 12; prof.push(new THREE.Vector2(r - q + q * Math.cos(a), w / 2 - q + q * Math.sin(a))); }
  prof.push(new THREE.Vector2(r * .68, w / 2));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), M.tire); tire.rotation.z = -Math.PI / 2; g.add(tire);
  const dish = [[0, .022], [r * .25, .02], [r * .5, .012], [r * .66, 0], [r * .69, -.012]].map(([a, b]) => new THREE.Vector2(a, b));
  const cover = new THREE.Mesh(new THREE.LatheGeometry(dish, 56), style === 'body' ? M.paint : M.hub); cover.rotation.z = -Math.PI / 2; cover.position.x = w / 2 - .01; g.add(cover);
  if (style === 'aero') for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.006, r * .3, r * .05), M.seam); sp.position.set(w / 2 + .008, 0, 0); sp.rotation.x = k * Math.PI / 3; sp.translateY(r * .45); g.add(sp); }
  const inner = new THREE.Mesh(new THREE.CircleGeometry(r * .7, 40), M.tire); inner.rotation.y = -Math.PI / 2; inner.position.x = -w / 2; g.add(inner);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * .1, r * .1, .02, 24), M.trim); cap.rotation.z = Math.PI / 2; cap.position.x = w / 2 + .012; g.add(cap);
  return g;
}
function curve1D(keys) { // monotone cubic (Fritsch-Carlson) through [x,y] keys sorted by x: smooth, no overshoot
  const n = keys.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]));
  for (let i = 0; i < n; i++) m.push(i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return x => { if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (x > keys[i + 1][0]) i++; const [x0, y0] = keys[i], [x1, y1] = keys[i + 1], h = x1 - x0, t = (x - x0) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * m[i + 1]; };
}
const archBot = (z, base, arches) => { let y = base; for (const [zc, yc, R] of arches) { const d = Math.abs(z - zc); if (d <= R) y = Math.max(y, yc + Math.sqrt(R * R - d * d)); } return y; };
function zSamples(z0, z1, extra = [], step = .05) {
  const s = new Set(), n = Math.ceil((z1 - z0) / step); for (let i = 0; i <= n; i++) s.add(+(z0 + (z1 - z0) * i / n).toFixed(4));
  extra.forEach(z => { if (z >= z0 && z <= z1) s.add(+z.toFixed(4)); }); return [...s].sort((a, b) => a - b);
}

/* Smooth bodies (Semi, Cybercab): a loft of vertical sections. At each z the body spans bot(z)..top(z) with half-width
   X(z, y) and rounded edges, so wheel arches are just bot(z) rising over each wheel. Glass, trim and seams are patches
   laid on the same surface in (z, k) coordinates, k running along the half section from the floor to the roof centre. */
const NB = 4, NCB = 4, NS = 10, NCT = 6, NR = 6, K = NB + NCB + NS + NCT + NR;
function halfAt(P, z) {
  const b = P.bot(z), T = P.top(z), h = Math.max(.02, T - b), rb = Math.min(P.rB, h * .3), rt = Math.min(P.rT(z), h * .45);
  const xb = Math.max(rb * 1.2, P.X(z, b + rb)), xt = Math.max(rt * 1.2, P.X(z, T - rt)), cr = P.crown ?? .03, o = [];
  for (let i = 0; i < NB; i++) o.push([(xb - rb) * i / (NB - 1), b]);
  for (let i = 1; i <= NCB; i++) { const a = -Math.PI / 2 + i * Math.PI / 2 / NCB; o.push([xb - rb + rb * Math.cos(a), b + rb + rb * Math.sin(a)]); }
  for (let i = 1; i <= NS; i++) { const y = lerp(b + rb, T - rt, i / NS); o.push([Math.max(rt, P.X(z, y)), y]); }
  for (let i = 1; i <= NCT; i++) { const a = i * Math.PI / 2 / NCT; o.push([xt - rt + rt * Math.cos(a), T - rt + rt * Math.sin(a)]); }
  for (let i = 1; i <= NR; i++) { const x = (xt - rt) * (1 - i / NR); o.push([x, T + cr * (1 - (x / (xt - rt)) ** 2)]); }
  return o;
}
const kAtY = (h, y) => { for (let k = 0; k < K - 1; k++) { const a = h[k][1], b = h[k + 1][1]; if (b > a && y >= a && y <= b) return k + (y - a) / (b - a); } return y < h[0][1] ? 0 : K - 1; };
function smoothBody(P) {
  const pos = [], idx = [], R = 2 * K - 2;
  const ring = z => { const h = halfAt(P, z); return [...h, ...h.slice(1, -1).reverse().map(([x, y]) => [-x, y])]; };
  P.zs.forEach(z => ring(z).forEach(([x, y]) => pos.push(x, y, z)));
  for (let i = 0; i < P.zs.length - 1; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + (j + 1) % R, c = a + R, d = b + R; idx.push(a, c, b, b, c, d); }
  for (const zi of [0, P.zs.length - 1]) {                              // flat end caps on their own vertices
    const z = P.zs[zi], r = ring(z), base = pos.length / 3, cy = r.reduce((s, p) => s + p[1], 0) / R;
    pos.push(0, cy, z); r.forEach(([x, y]) => pos.push(x, y, z));
    for (let j = 0; j < R; j++) idx.push(base, base + 1 + j, base + 1 + (j + 1) % R);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
}
// a patch on both sides of a smooth body: z0..z1, and kLo(z, h)..kHi(z, h) along the section
function patch(P, z0, z1, kLo, kHi, mat, { nz = 36, nk = 12, eps = .006 } = {}) {
  const pos = [], idx = [];
  for (const s of [-1, 1]) { const base = pos.length / 3;
    for (let i = 0; i <= nz; i++) { const z = lerp(z0, z1, i / nz), h = halfAt(P, z), lo = kLo(z, h), hi = Math.max(lo, kHi(z, h));
      for (let j = 0; j <= nk; j++) { const k = lerp(lo, hi, j / nk), k0 = Math.min(K - 2, Math.floor(k)), f = k - k0, [xa, ya] = h[k0], [xb, yb] = h[k0 + 1];
        const dx = xb - xa, dy = yb - ya, l = Math.hypot(dx, dy) || 1; pos.push(s * (lerp(xa, xb, f) + eps * dy / l), lerp(ya, yb, f) - eps * dx / l, z); } }
    for (let i = 0; i < nz; i++) for (let j = 0; j < nk; j++) { const a = base + i * (nk + 1) + j, b = a + 1, c = a + nk + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
const yBand = (ylo, yhi) => [(z, h) => kAtY(h, ylo), (z, h) => kAtY(h, yhi)];
// front-most (or rear-most) z where the body surface passes through (x, y)
function endZ(P, x, y, front) {
  const z0 = P.zs[0], z1 = P.zs[P.zs.length - 1]; let z = front ? z1 : z0; const st = front ? -.004 : .004;
  for (let i = 0; i < 1500; i++, z += st) if (y >= P.bot(z) && y <= P.top(z) + (P.crown ?? 0) && Math.abs(x) <= P.X(z, y)) return z;
  return z;
}
function wellLiner(g, M, zc, yc, R, len) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(R - .01, R - .01, len, 36, 1, true, 0, Math.PI), M.well); c.rotation.z = Math.PI / 2; c.position.set(0, yc, zc); g.add(c);
}
const sideLamps = (g, glowTex, list) => list.map(([x, y, z, col, size]) => { const l = new Lamp([x, y, z], col, size, glowTex); g.add(l.group); return l; });

function buildCybercab(glowTex) {
  const M = mats(new THREE.Color('#b59a6c'), { metal: .88, rough: .26, coat: .7, env: 1.25, hub: 0x8b8e92 });
  const ZF = 2.16, ZR = -2.14, WF = 1.40, WR = -1.42, RW = .36, RA = .44;
  const top = curve1D([[ZR, .99], [-1.95, 1.05], [-1.5, 1.19], [-.9, 1.34], [-.25, 1.42], [.35, 1.39], [.9, 1.24], [1.32, 1.0], [1.62, .9], [1.95, .83], [2.08, .76], [ZF, .6]]);
  const arches = [[WF, .36, RA], [WR, .36, RA]];
  const base = z => z > 1.9 ? lerp(.2, .32, (z - 1.9) / (ZF - 1.9)) : z < -1.82 ? lerp(.2, .46, (-1.82 - z) / (-1.82 - ZR)) : .2;
  const plan = curve1D([[ZR, .9], [-1.85, .965], [-1.2, .985], [1.0, .985], [1.75, .95], [2.05, .88], [ZF, .8]]);
  const belt = .9;
  const P = {
    zs: zSamples(ZR, ZF, [WF - RA, WF + RA, WR - RA, WR + RA, WF - RA - .004, WF + RA + .004, WR - RA - .004, WR + RA + .004, ZF - .01, ZF - .025, ZR + .01, ZR + .025], .04),
    bot: z => archBot(z, base(z), arches), top, crown: .035, rB: .07, rT: curve1D([[-2.14, .13], [-1.6, .26], [1.15, .26], [1.6, .13]]),
    X: (z, y) => { const w = plan(z), b = .2; return y < belt ? w * (1 - .07 * ((belt - y) / (belt - b)) ** 2) : w * lerp(1, .74, Math.min(1, (y - belt) / (1.42 - belt)) ** 1.3); }
  };
  const g = new THREE.Group(); g.add(new THREE.Mesh(smoothBody(P), M.paint));
  // one black glass canopy: windshield, roof and side glass, ending in a raked edge over the fastback
  g.add(patch(P, -1.05, 1.34, (z, h) => kAtY(h, z > 1.1 ? .99 : z < -.6 ? lerp(1.12, .93, (z + 1.05) / .45) : .93), () => K - 1, M.glass, { nz: 56 }));
  g.add(patch(P, -1.95, 2.0, ...yBand(.2, .3), M.trim, { nz: 50, nk: 4 }));                // black sills
  g.add(patch(P, 1.94, ZF, (z, h) => 0, (z, h) => kAtY(h, .42), M.trim, { nz: 8, nk: 8 })); // front lower
  for (const z of [1.08, -.5]) g.add(patch(P, z, z + .012, ...yBand(.31, .9), M.seam, { nz: 1, nk: 8 }));   // door seams
  for (const [zc] of arches) wellLiner(g, M, zc, .36, RA, 1.86);
  for (const z of [WF, WR]) for (const s of [-1, 1]) { const w = wheel(M, RW, .25, 'aero'); w.position.set(s * .8, RW, z); if (s < 0) w.rotation.y = Math.PI; g.add(w); }
  const fpts = [], rpts = [];
  for (let i = 0; i <= 14; i++) { const x = lerp(-.74, .74, i / 14), xr = lerp(-.84, .84, i / 14); fpts.push([x, .78, endZ(P, x, .78, true) + .008]); rpts.push([xr, .95, ZR - .008]); }
  const front = new LightBar(fpts, WHITE, 64, { width: .045 }), rear = new LightBar(rpts, RED, 48, { width: .06 });
  g.add(front.group, rear.group);
  const turns = sideLamps(g, glowTex, [[-.86, .89, ZR - .015, AMBER, .06], [.86, .89, ZR - .015, AMBER, .06]]);
  const ry = .8, rz = 1.0, rx = P.X(rz, ry) + .012;
  const repeaters = sideLamps(g, glowTex, [[-rx, ry, rz, AMBER, .04], [rx, ry, rz, AMBER, .04]]);
  return { group: g, bars: { front, rear }, turns, repeaters, len: 4.3, M };
}

function buildSemi(glowTex) {
  const M = mats(new THREE.Color('#e9eaea'), { metal: .15, rough: .28, coat: 1, env: 1.0, hub: 0x9a9da1 });
  const ZF = 3.16, ZC = -.95, WF = 2.05, R = .52, RA = .62;
  const top = curve1D([[ZC, 3.86], [-.5, 3.95], [.3, 3.97], [.85, 3.86], [1.3, 3.56], [1.65, 3.12], [2.05, 2.6], [2.45, 2.12], [2.8, 1.8], [3.0, 1.56], [3.11, 1.28], [ZF, .95]]);
  const base = z => z > 2.75 ? lerp(.42, .6, (z - 2.75) / (ZF - 2.75)) : .42;
  const plan = curve1D([[ZC, 1.2], [-.6, 1.25], [2.25, 1.25], [2.75, 1.19], [3.0, 1.1], [ZF, .98]]);
  const P = {
    zs: zSamples(ZC, ZF, [WF - RA, WF + RA, WF - RA - .004, WF + RA + .004, ZF - .01, ZF - .03, ZC + .01], .045),
    bot: z => archBot(z, base(z), [[WF, R, RA]]), top, crown: .05, rB: .08, rT: curve1D([[-.95, .3], [.6, .3], [1.5, .42]]),
    X: (z, y) => plan(z) * (y < 1.75 ? 1 : lerp(1, .8, Math.min(1, (y - 1.75) / 2.2) ** 1.25))
  };
  const g = new THREE.Group(); g.add(new THREE.Mesh(smoothBody(P), M.paint));
  g.add(patch(P, 1.4, 2.9, (z, h) => kAtY(h, 1.86), () => K - 1, M.glass, { nz: 64, nk: 18, eps: .014 }));            // wraparound windshield
  g.add(patch(P, .52, 1.26, ...yBand(1.98, 2.95), M.glass, { nz: 16, nk: 8 }));                   // door window
  g.add(patch(P, 2.6, ZF, () => 0, (z, h) => kAtY(h, .74), M.trim, { nz: 16, nk: 8 }));            // front lower bumper
  g.add(patch(P, ZC, 1.42, ...yBand(.42, .6), M.trim, { nz: 40, nk: 4 }));                       // skirt strip
  for (const z of [.42, 1.36]) g.add(patch(P, z, z + .014, ...yBand(.62, 3.1), M.seam, { nz: 1, nk: 10 }));
  wellLiner(g, M, WF, R, RA, 2.4);
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(1.0, .26, 2.9, 0, .86, -2.1, M.trim);                                    // frame rails
  box(1.9, .1, 1.2, 0, 1.2, -2.2, M.hub);                                      // fifth wheel deck
  box(2.2, .5, .1, 0, 1.15, -1.0, M.trim);                                     // cab back panel
  for (const s of [-1, 1]) {
    box(.95, .05, 2.05, s * .8, 1.2, -2.24, M.trim);                            // drive-axle fender tops
    box(.5, .55, .03, s * .9, .62, -3.38, M.trim);                              // mud flaps
    box(.05, .05, .32, s * 1.3, 2.45, 1.5, M.trim); box(.08, .42, .2, s * 1.42, 2.4, 1.34, M.paint);   // mirror arm and pod
  }
  box(2.3, .14, .08, 0, .98, -3.38, M.trim);                                   // rear light bracket
  for (const s of [-1, 1]) {
    const w = wheel(M, R, .32, 'aero'); w.position.set(s * 1.06, R, WF); if (s < 0) w.rotation.y = Math.PI; g.add(w);
    for (const z of [-1.62, -2.86]) { const d = wheel(M, R, .56, 'aero'); d.position.set(s * .95, R, z); if (s < 0) d.rotation.y = Math.PI; g.add(d); }
  }
  const fpts = [], rpts = [];
  for (let i = 0; i <= 14; i++) { const x = lerp(-1.0, 1.0, i / 14); fpts.push([x, 1.5, endZ(P, x, 1.5, true) + .01]); rpts.push([lerp(-.28, .28, i / 14), 1.0, -3.43]); }
  const front = new LightBar(fpts, WHITE, 64, { width: .06 }), rear = new LightBar(rpts, RED, 24, { width: .06 });
  g.add(front.group, rear.group);
  const tails = sideLamps(g, glowTex, [[-.98, .99, -3.44, RED, .09], [.98, .99, -3.44, RED, .09]]);
  const turns = sideLamps(g, glowTex, [[-1.12, .99, -3.44, AMBER, .08], [1.12, .99, -3.44, AMBER, .08]]);
  const rx = P.X(2.42, 1.7) + .012;
  const repeaters = sideLamps(g, glowTex, [[-rx, 1.7, 2.42, AMBER, .06], [rx, 1.7, 2.42, AMBER, .06]]);
  const mx = (z) => P.X(z, 1.05) + .012, ry = top(.95) + P.crown * .4 + .03;
  const markers = sideLamps(g, glowTex, [...[-1, 1].flatMap(s => [[s * mx(.9), 1.05, .9, AMBER, .045], [s * mx(-.4), 1.05, -.4, AMBER, .045], [s * 1.18, 1.05, -2.9, RED, .045]]),
    ...[-.5, -.25, 0, .25, .5].map(x => [x, ry, .95, AMBER, .04])]);
  return { group: g, bars: { front, rear }, tails, turns, repeaters, markers, len: 6.6, M };
}

/* Cybertruck: flat stainless panels. The lower body is a straight extrusion of the side profile (arches cut in);
   the greenhouse and tonneau sit on the belt line and lean inward linearly, so every panel stays planar. */
function extrude(outline, xOf) {
  const sh = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, curveSegments: 1 }), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getX(i), y = p.getY(i), t = p.getZ(i); p.setXYZ(i, xOf(t, y), y, z); }
  g.computeVertexNormals(); return g;
}
function fan(pts, mat) {   // convex polygon of [x, y, z]
  const pos = pts.flat(), idx = []; for (let i = 1; i < pts.length - 1; i++) idx.push(0, i, i + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return new THREE.Mesh(g, mat);
}
function buildCybertruck(glowTex) {
  const M = mats(new THREE.Color('#b9bcbf'), { metal: .95, rough: .38, coat: 0, env: .9, flat: true, hub: 0x2a2c2f });
  const ZF = 2.86, ZR = -2.84, WF = 1.89, WRr = -1.92, R = .445, BELT = 1.12, AP = [-.1, 1.87], NOSE = [ZF, 1.04], TAIL = [ZR, 1.30];
  const lineY = (z) => z >= AP[0] ? lerp(NOSE[1], AP[1], (NOSE[0] - z) / (NOSE[0] - AP[0])) : lerp(AP[1], TAIL[1], (AP[0] - z) / (AP[0] - TAIL[0]));
  const zBelt = NOSE[0] - (BELT - NOSE[1]) / (AP[1] - NOSE[1]) * (NOSE[0] - AP[0]);
  const xs = y => 1 - .3 * Math.max(0, y - BELT) / (AP[1] - BELT);           // greenhouse lean-in
  const archPts = zc => [[zc + .66, .44], [zc + .42, .98], [zc - .42, .98], [zc - .66, .44]];
  const lower = [[ZF - .02, .5], NOSE, [zBelt, BELT], [ZR, BELT], [ZR, .56], [ZR + .12, .44], ...archPts(WRr).reverse(), ...archPts(WF).reverse(), [ZF - .1, .44]];
  const upper = [[zBelt, BELT], AP, TAIL, [ZR, BELT]];
  const g = new THREE.Group();
  g.add(new THREE.Mesh(extrude(lower, (t) => 1 - 2 * t), M.paint));
  g.add(new THREE.Mesh(extrude(upper, (t, y) => (1 - 2 * t) * xs(y)), M.paint));
  // glass: windshield + roof on the front slope, rear glass behind the apex, and the side windows
  const topPt = (z, x, e = .008) => [x, lineY(z) + e, z];
  const ws = (z0, z1, inset) => fan([topPt(z0, -(xs(lineY(z0)) - inset)), topPt(z0, xs(lineY(z0)) - inset), topPt(z1, xs(lineY(z1)) - inset), topPt(z1, -(xs(lineY(z1)) - inset))], M.glass);
  g.add(ws(1.95, .02, .07), ws(-.16, -.72, .1));
  for (const s of [-1, 1]) {
    const sp = (z, y) => [s * (xs(y) + .006), y, z];
    g.add(fan([sp(-.86, 1.17), sp(1.98, 1.17), sp(-.04, lineY(-.04) - .08), sp(-.86, lineY(-.86) - .08)], M.glass));
    g.add(fan([sp(.34, 1.16), sp(.42, 1.16), sp(.42, lineY(.42) - .06), sp(.34, lineY(.34) - .06)], M.trim));           // B-pillar
    const lp = (z, y) => [s * 1.004, y, z];
    for (const [z0, z1] of [[ZR + .12, WRr - .66], [WRr + .66, WF - .66], [WF + .66, ZF - .1]]) {                   // black lower cladding
      const k = (.64 - .44) / (.98 - .44) * .24;
      g.add(fan([lp(z0, .44), lp(z1, .44), lp(z1 - (z1 === WRr - .66 || z1 === WF - .66 ? -k : 0), .64), lp(z0 + (z0 === WRr + .66 || z0 === WF + .66 ? -k : 0), .64)], M.trim));
    }
    for (const z of [1.86, .38, -.92]) g.add(fan([lp(z, .66), lp(z + .012, .66), lp(z + .012, BELT - .01), lp(z, BELT - .01)], M.seam));  // door seams
  }
  g.add(fan([[-.98, lineY(-.9) + .009, -.9], [.98, lineY(-.9) + .009, -.9], [.98, lineY(-.92) + .009, -.92], [-.98, lineY(-.92) + .009, -.92]].map(([x, y, z]) => [x * xs(y), y, z]), M.seam));   // tonneau seam
  // angular arch flares
  for (const zc of [WF, WRr]) for (const s of [-1, 1]) {
    const band = [[zc + .82, .42], [zc + .5, 1.1], [zc - .5, 1.1], [zc - .82, .42], [zc - .66, .42], [zc - .42, .98], [zc + .42, .98], [zc + .66, .42]];
    g.add(new THREE.Mesh(extrude(band, (t) => s * (1.0 + .045 * (1 - t))), M.trim));
    const w = wheel(M, R, .3, 'aero'); w.position.set(s * .86, R, zc); if (s < 0) w.rotation.y = Math.PI; g.add(w);
  }
  const fb = new THREE.Mesh(new THREE.BoxGeometry(2.0, .2, .1), M.trim); fb.position.set(0, .54, ZF - .04); g.add(fb);
  const rb = new THREE.Mesh(new THREE.BoxGeometry(2.0, .22, .1), M.trim); rb.position.set(0, .56, ZR + .03); g.add(rb);
  const fpts = [], rpts = []; for (let i = 0; i <= 12; i++) { const x = lerp(-.99, .99, i / 12); fpts.push([x, 1.03, ZF + .01]); rpts.push([x, 1.28, ZR - .008]); }
  const front = new LightBar(fpts, WHITE, 64, { width: .07 }), rear = new LightBar(rpts, RED, 48, { width: .08 });
  g.add(front.group, rear.group);
  const heads = [-1, 1].map(s => { const l = new Lamp([s * .8, 1.0, ZF + .012], WHITE, .05, glowTex); g.add(l.group); return l; });
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
const CAB_CH = ['REAR LIGHT BAR', 'TURN L', 'TURN R', 'REPEATER L', 'REPEATER R'], CAB_BAD = 2;   // TURN R disconnected
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
    if (n === 'view') { const nv = VIEWS.includes(v) ? v : 'semi'; if (nv !== this._view) { this._view = nv; this._clock = 0; this._visible = true; /* a view change only happens on screen */ this.dispatchEvent(new CustomEvent('viewchange', { detail: { view: nv } })); } }
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
  // Cybercab current-sense self-test, one channel per light (the rear bar is a single channel). Run 1 uses the
  // original ADC sample time: a disconnected turn lamp still reads residual charge on the filter capacitor and
  // false-passes. Run 2 samples after the capacitor has discharged and the open endpoint is caught. Then a
  // brake / turn function test. Headlights stay off.
  _cybercab(t) {
    const V = this._veh.cybercab, R = V.bars.rear, bad = CAB_BAD, n = CAB_CH.length, step = 1.0;
    const run = t < 1.6 ? -1 : t < 6.7 ? 0 : t < 11.8 ? 1 : 2, rt = run === 0 ? t - 1.6 : run === 1 ? t - 6.8 : -1;
    const ci = rt >= 0 ? Math.min(n - 1, Math.floor(rt / step)) : -1, cp = rt >= 0 ? clamp((rt - ci * step) / step) : 0;
    const on = (k) => (run < 2 && k === ci && cp < .65 && k !== bad ? 1 : 0);
    const blink = run === 2 && (t - 11.8) % .7 < .38 ? 1 : 0, brake = run === 2 ? sm(11.9, 12.1, t) : 0;
    V.bars.front.set(() => 0);
    const bar = Math.max(sm(.2, 1.2, t) * .45, on(0)) * (1 - .55 * on(0) * 0) + brake * .5;
    R.set(() => bar);                                                     // one LED channel: all or nothing
    V.turns.forEach((l, i) => l.set(i === 0 ? Math.max(on(1), blink) : on(2)));
    V.repeaters.forEach((l, i) => l.set(i === 0 ? Math.max(on(3), blink) : on(4)));
    this._hudState = { kind: 'cab', run, ci, cp };
    const e = sm(11.4, 13.4, t);
    const a = lerp(Math.atan2(4.6, -4.4), Math.atan2(-2.4, -6), e) + Math.sin(t * .3) * .03, rad = lerp(8.8, 8.4, e);
    return { pos: new THREE.Vector3(Math.sin(a) * rad, 2.1, Math.cos(a) * rad), tgt: new THREE.Vector3(0, .7, lerp(-.6, -.2, e)) };
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
    if (this._dipping || (this._visible && !document.hidden && (running || dt === 0))) this._kick();   // always finish a view swap
  }
  // one plain caption per view that says what is happening; the lights carry the rest
  _drawHud(v) {
    const c = this._hc, d = this._dpr, W = this._w, H = this._h, S = this._hudState; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    if (!S) return;
    let line = '';
    if (S.kind === 'semi') line = S.func ? 'Turn signal and brake test' : 'Bringing up each exterior light';
    else if (S.kind === 'cab') line = S.run === 0 ? 'Self-test with the original ADC sample time: the disconnected turn lamp still passes'
      : S.run === 1 ? 'Longer sample time: the disconnected lamp is caught' : S.run === 2 ? 'Brake and turn signal' : 'Rear light bar on';
    else if (S.kind === 'truck') line = S.cycle ? 'After the fix: both headlamps calibrate together' : 'Before the fix: left and right headlamps calibrate out of sync';
    const fs = W < 520 ? 12 : 13.5, pad = W < 520 ? 14 : 22;
    c.font = `400 ${fs}px Inter, system-ui, sans-serif`; c.textAlign = 'left'; c.fillStyle = 'rgba(242,239,233,.78)';
    c.fillText(line, pad, H - pad);
  }
}
if (!customElements.get('as-cybertruck-lighting')) customElements.define('as-cybertruck-lighting', CybertruckLighting);
export { CybertruckLighting };

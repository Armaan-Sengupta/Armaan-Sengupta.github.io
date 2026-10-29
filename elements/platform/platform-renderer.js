// Shared three.js scene for <as-parallel-manipulator>, <as-platform-hero> and <as-platform-sequence>.
//
// createPlatformRenderer(host, {pixelRatio, background}) -> api
//   api.ready                      Promise, resolves once the CAD link meshes are in
//   api.setState({pitch, roll, ballX, ballY, ballLift, led, explode})
//        pitch/roll  plate correction angles in degrees (controller.py convention, SPV4 IK)
//        ballX/Y     ball centre on the plate, metres, SPV4 plate frame (u/v axes); ballLift = height above contact
//        led         'white' | 'green' | 'off'        explode 0 (assembled) .. 1 (fully exploded, staggered)
//   api.setCamera(spec | name [, blendTo, t])   names: 'default' (150 % of the original framing), 'demo' (matches
//        site/media/stewart-demo.mp4), 'hero-start', 'hero-end'. Specs are plain objects (see CAMERAS).
//   api.resize(cssW, cssH), api.render(), api.pickPlate(clientX, clientY) -> {x, y, inside} | null,
//   api.videoToPlate(u, v) -> {x, y} (normalised demo-video pixel -> plate coords, via the 'demo' camera)
//
// Geometry: servo axes at r = 100 mm, 80 mm lower link (CAD arm-link-1), 100 mm upper chain (CAD arm-link-2 +
// sphere-joint arm connector + ball stud), platform joints on the 149.5 mm circumradius of the 259 mm triangle,
// joint plane 106 mm above the servo axes: the SPV4 constants. Colours are sampled from the hardware footage:
// matte black acrylic arms and plate, white PLA brackets and bearing spacers, black servos with blue labels, clear
// acrylic base, white LED diffuser band, orange-painted steel ball.
import * as THREE from '../shared/vendor/three.module.min.js';
import { SPV4, solvePlatform, toWorld } from './platform-kinematics.js';
import { BALL } from './platform-physics.js';

const assetBase = new URL('./assets/', import.meta.url);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;

export const HIP = 0.045;                 // servo axis height above the table
export const PUCK = Object.freeze({ bottom: 0.003, ledLow: 0.017, ledHigh: 0.025, top: 0.045, radius: 0.150 });
export const PLATE_TOP_Y = HIP + SPV4.platform_height * 0.01 + PUCK.top;   // world height of the plate surface at rest

// Camera presets. az/el in degrees (az 0 = camera on world +Z), dist in metres, fov in degrees for a reference
// aspect (refAspect); other aspects are covered like object-fit: cover. offset = where the target sits in NDC of the
// reference frame (implemented as a camera rotation, like a real camera aimed off-centre). roll in degrees.
export const CAMERAS = {
  // The original element's framing (pos .47,.40,.56 -> target y .125, vfov 31, zoom 1.5) magnified 1.5x.
  default: { target: [0, 0.168, 0], az: 40, el: 20.6, dist: 0.781, fovV: 31, zoom: 2.25, refAspect: 16 / 9, offset: [0, 0], roll: 0 },
  // Matched to site/media/stewart-demo.mp4 (1280x720, phone camera). Plate rim spans x 247..1032 px, plate top centre
  // at (641, 238) px, top ellipse ratio 0.24 (14 deg line of sight), image rolled 2.4 deg (right side low).
  demo: { target: [0, PLATE_TOP_Y, 0], az: 165, el: 13.56, dist: 0.6617, fovH: 41.5, refAspect: 16 / 9, offset: [-0.0071, 0.4229], roll: 2.8 },
  'hero-start': { target: [0, 0.29, 0], az: 30, el: 16, fitRadius: 0.40, fit: 'cover', fill: 0.95, fovV: 34, offset: [0, 0], roll: 0 },
  'hero-end': { target: [0, 0.135, 0], az: 38, el: 21, fitRadius: 0.20, fit: 'contain', fill: 0.80, fovV: 30, offset: [0, 0], roll: 0 },
};

// Resolve a spec for a given aspect into concrete numbers (so specs of different kinds blend cleanly).
export function resolveCamera(spec, aspect) {
  const ref = spec.refAspect || aspect;
  let tanH, tanV;
  if (spec.fovH != null) { tanH = Math.tan(spec.fovH * DEG / 2); tanV = tanH / ref; } else { tanV = Math.tan(spec.fovV * DEG / 2); tanH = tanV * ref; }
  const zoom = spec.zoom || 1; tanH /= zoom; tanV /= zoom;
  let visV, dist = spec.dist;
  if (spec.fitRadius != null) {
    visV = tanV; const visH = tanV * aspect, small = Math.min(visV, visH), large = Math.max(visV, visH);
    dist = spec.fitRadius / (spec.fill * (spec.fit === 'cover' ? Math.min(large, small * 2) : small));
    tanH = visH;
  } else visV = aspect >= ref ? tanH / aspect : tanV;   // cover the reference frame, like object-fit: cover
  const [ox, oy] = spec.offset || [0, 0];
  return { target: spec.target.slice(), az: spec.az, el: spec.el, dist, tanV: visV, yaw: Math.atan(ox * tanH), pitch: Math.atan(oy * tanV), roll: spec.roll || 0 };
}
export function blendResolved(a, b, t) {
  return { target: a.target.map((v, i) => lerp(v, b.target[i], t)), az: lerp(a.az, b.az, t), el: lerp(a.el, b.el, t), dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)), tanV: Math.exp(lerp(Math.log(a.tanV), Math.log(b.tanV), t)), yaw: lerp(a.yaw, b.yaw, t), pitch: lerp(a.pitch, b.pitch, t), roll: lerp(a.roll, b.roll, t) };
}
export function applyResolved(camera, r, aspect) {
  camera.fov = 2 * Math.atan(r.tanV) / DEG; camera.aspect = aspect; camera.zoom = 1;
  const az = r.az * DEG, el = r.el * DEG, T = new THREE.Vector3(...r.target);
  camera.position.set(T.x + r.dist * Math.sin(az) * Math.cos(el), T.y + r.dist * Math.sin(el), T.z + r.dist * Math.cos(az) * Math.cos(el));
  camera.up.set(0, 1, 0); camera.lookAt(T);
  camera.rotateY(r.yaw); camera.rotateX(-r.pitch); camera.rotateZ(r.roll * DEG);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  return camera;
}
export function applyCamera(camera, spec, aspect) { return applyResolved(camera, resolveCamera(spec, aspect), aspect); }

function makeBallTexture() {
  // Orange paint over a steel ball, worn through in patches (as in the demo footage).
  const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const m = document.createElement('canvas'); m.width = W; m.height = H; const gm = m.getContext('2d');
  g.fillStyle = '#c97a32'; g.fillRect(0, 0, W, H); gm.fillStyle = '#000'; gm.fillRect(0, 0, W, H);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 18; i++) {
    const x = rnd() * W, y = 20 + rnd() * (H - 40), r = 1.5 + rnd() * rnd() * 8;
    for (const [ctx, col] of [[g, '#a7a39c'], [gm, '#999']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r, rnd() * 3, 0, 7); ctx.fill(); }
  }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,25,10,${rnd() * 0.18})`; g.fillRect(rnd() * W, rnd() * H, 2, 2); }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const metal = new THREE.CanvasTexture(m);
  return { map, metal };
}

function makeEnvironment(renderer) {
  // A dim room: warm glow behind (as in the footage), soft key panel above-front. Used for reflections only.
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0b0a0a, side: THREE.BackSide })));
  const panel = (w, h, color, pos, look) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); p.position.set(...pos); p.lookAt(...look); env.add(p); };
  panel(3, 1.4, 0x8a8580, [0, 3.2, 1.2], [0, 0, 0]);
  panel(2, 2, 0x4a3426, [2.5, 1, -3], [0, 0, 0]);
  panel(1.5, 1, 0x3b3d42, [-3, 1.5, 1], [0, 0, 0]);
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(env, 0.02); pm.dispose();
  env.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return rt;
}

export function createPlatformRenderer(host, options = {}) {
  const canvas = host instanceof HTMLCanvasElement ? host : document.createElement('canvas');
  if (canvas !== host) host.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: !!options.preserveDrawingBuffer, powerPreference: 'high-performance' });
  const bg = new THREE.Color(options.background ?? 0x08080a);
  renderer.debug.checkShaderErrors = false; renderer.setClearColor(bg, 1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  let pixelRatio = options.pixelRatio ?? Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  const scene = new THREE.Scene(); scene.background = bg;
  const envRT = makeEnvironment(renderer); scene.environment = envRT.texture; scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.01, 20);

  scene.add(new THREE.HemisphereLight(0xdedad4, 0x141210, 0.55));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.6); key.position.set(-0.35, 0.9, 0.55); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc9a0, 0.9); rim.position.set(0.6, 0.45, -0.7); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xcfd8ff, 0.55); fill.position.set(0.5, 0.2, 0.9); scene.add(fill);

  const tex = makeBallTexture();
  const M = {
    acrylicBlack: new THREE.MeshPhysicalMaterial({ color: 0x2a2a2e, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25, flatShading: true }),
    plateBlack: new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.78, metalness: 0 }),
    plateTop: new THREE.MeshStandardMaterial({ color: 0x2a2a2c, roughness: 0.62, metalness: 0 }),
    clear: new THREE.MeshPhysicalMaterial({ color: 0x9fb0b4, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 }),
    clearEdge: new THREE.LineBasicMaterial({ color: 0x9fb1b6, transparent: true, opacity: 0.35 }),
    pla: new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.72, metalness: 0 }),
    servo: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.55, metalness: 0.05 }),
    label: new THREE.MeshStandardMaterial({ color: 0x2f4d80, roughness: 0.5, metalness: 0.1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb9b9b6, roughness: 0.3, metalness: 0.9 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x4a4a4c, roughness: 0.4, metalness: 0.8 }),
    sensor: new THREE.MeshStandardMaterial({ color: 0x8e9092, roughness: 0.35, metalness: 0.85 }),
    led: new THREE.MeshStandardMaterial({ color: 0xd8d5ce, roughness: 0.6, metalness: 0, emissive: 0x2a2826, emissiveIntensity: 1 }),
    ball: new THREE.MeshStandardMaterial({ map: tex.map, metalnessMap: tex.metal, metalness: 1, roughness: 0.38 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x0d0c0b, roughness: 0.9, metalness: 0 }),
  };
  const geoms = [];
  const G = (g) => { geoms.push(g); return g; };
  const mesh = (g, m, parent, pos, rot) => { const o = new THREE.Mesh(G(g), m); if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); parent.add(o); return o; };
  const cyl = (r, h, m, parent, pos, rot, seg = 32, open = false) => mesh(new THREE.CylinderGeometry(r, r, h, seg, 1, open), m, parent, pos, rot);
  const box = (sx, sy, sz, m, parent, pos, rot) => mesh(new THREE.BoxGeometry(sx, sy, sz), m, parent, pos, rot);
  const bolt = (parent, x, y, z, flip = 1, s = 1) => { const g = new THREE.Group(); g.position.set(x, y, z); if (flip < 0) g.rotation.x = Math.PI; parent.add(g); cyl(0.0028 * s, 0.0022 * s, M.darkSteel, g, [0, 0.0011 * s, 0], null, 16); cyl(0.0012 * s, 0.0004, M.servo, g, [0, 0.0023 * s, 0], null, 6); cyl(0.0014 * s, 0.010 * s, M.steel, g, [0, -0.005 * s, 0], null, 10); return g; };

  const root = new THREE.Group(); scene.add(root);
  const parts = [];   // {obj, off: Vector3, rot: Vector3 (euler rad), start}
  const part = (obj, off, start, rot = [0, 0, 0]) => { const p = { obj, off: new THREE.Vector3(...off), rot: new THREE.Vector3(...rot), start, base: null }; parts.push(p); return p; };


  // --- base: clear acrylic trefoil ---
  const baseGroup = new THREE.Group(); root.add(baseGroup);
  {
    const shape = new THREE.Shape(); const pts = [];
    for (let i = 0; i <= 180; i++) { const a = i / 180 * Math.PI * 2; let r = 0.07; for (const b of [90, 210, 330]) { const d = Math.atan2(Math.sin(a - b * DEG), Math.cos(a - b * DEG)); r = Math.max(r, 0.135 * Math.exp(-(d * d) / 0.09)); } pts.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a))); }
    shape.setFromPoints(pts);
    const g = G(new THREE.ExtrudeGeometry(shape, { depth: 0.005, bevelEnabled: false, curveSegments: 4 })); g.rotateX(-Math.PI / 2);
    const b = new THREE.Mesh(g, M.clear); baseGroup.add(b); b.renderOrder = 2;
    const e = new THREE.LineSegments(G(new THREE.EdgesGeometry(g, 30)), M.clearEdge); baseGroup.add(e);
    part(baseGroup, [0, -0.07, 0], 0.0);
  }

  // --- servos, brackets, horns (one set per chain, fixed in the base) ---
  const legs = [];
  for (const baseDeg of [90, 210, 330]) {
    const phi = baseDeg * DEG, radial = new THREE.Vector3(...toWorld([Math.cos(phi), Math.sin(phi), 0])), tangent = new THREE.Vector3(...toWorld([-Math.sin(phi), Math.cos(phi), 0]));
    const frame = new THREE.Matrix4().makeBasis(radial, new THREE.Vector3(0, 1, 0), radial.clone().cross(new THREE.Vector3(0, 1, 0)).negate());
    // local frame: X radial out, Y up, Z = tangent direction (X x Y)
    const zAxis = new THREE.Vector3().crossVectors(radial, new THREE.Vector3(0, 1, 0));
    frame.makeBasis(radial, new THREE.Vector3(0, 1, 0), zAxis);
    const servo = new THREE.Group(); servo.quaternion.setFromRotationMatrix(frame); servo.position.copy(radial).multiplyScalar(SPV4.l_base * 0.01).setY(HIP); root.add(servo);
    const sZ = zAxis.dot(tangent) > 0 ? 1 : -1;   // sign so +Z of servo frame == chain tangent
    // servo body lies on its side: shaft along Z, label facing radially out
    const body = new THREE.Group(); servo.add(body);
    box(0.020, 0.040, 0.036, M.servo, body, [0, -0.010, -sZ * 0.0265]);
    box(0.018, 0.054, 0.0025, M.servo, body, [0, -0.010, -sZ * 0.0125]);
    box(0.0006, 0.020, 0.022, M.label, body, [0.0103, -0.012, -sZ * 0.028]);
    cyl(0.0060, 0.004, M.servo, body, [0, 0, -sZ * 0.0065], [Math.PI / 2, 0, 0], 24);
    part(body, [0.20, -0.02, 0], 0.08, [0, 0, 0.2]);
    // white PLA cradle + truss
    const bracket = new THREE.Group(); servo.add(bracket);
    box(0.030, 0.012, 0.050, M.pla, bracket, [0, -HIP + 0.011, -sZ * 0.024]);
    box(0.004, 0.030, 0.050, M.pla, bracket, [-0.014, -HIP + 0.032, -sZ * 0.024]);
    box(0.026, 0.004, 0.004, M.pla, bracket, [0.0, -HIP + 0.030, -sZ * 0.0005]);
    part(bracket, [0.13, -0.05, 0], 0.04);
    // horn
    const horn = new THREE.Group(); servo.add(horn);
    cyl(0.0115, 0.003, M.pla, horn, [0, 0, -sZ * 0.0070], [Math.PI / 2, 0, 0], 32);
    part(horn, [0.27, 0.0, 0], 0.16);
    legs.push({ baseDeg, radial, tangent, sZ, servo, lower: null, upper: null });
  }

  // --- moving links (positions solved every frame from the IK) ---
  for (const leg of legs) {
    leg.lower = new THREE.Group(); leg.upper = new THREE.Group(); root.add(leg.lower, leg.upper);
    leg.lowerProxy = box(0.016, 0.080, 0.0045, M.acrylicBlack, leg.lower, [0, 0.040, -0.00325]);
    leg.upperProxy = box(0.016, 0.060, 0.0045, M.acrylicBlack, leg.upper, [0, 0.030, 0.00365]);
    // elbow: white bearing spacer + steel pin
    leg.spacer = new THREE.Group(); leg.upper.add(leg.spacer);
    cyl(0.0100, 0.0024, M.pla, leg.spacer, [0, 0, 0.0002], [Math.PI / 2, 0, 0], 32);
    cyl(0.0026, 0.0200, M.steel, leg.spacer, [0, 0, 0.001], [Math.PI / 2, 0, 0], 12);
    // ball stud + ball joint at the platform end (0.086..0.100 along the upper link)
    leg.stud = new THREE.Group(); leg.upper.add(leg.stud);
    cyl(0.0025, 0.016, M.steel, leg.stud, [0, 0.093, 0], null, 12);
    mesh(new THREE.SphereGeometry(0.0055, 20, 14), M.steel, leg.stud, [0, 0.100, 0]);
    part(leg.lower, [0, 0.05, 0], 0.24, [0, 0, 0.5]);
    part(leg.upper, [0, 0.10, 0], 0.34, [0, 0, -0.45]);
    leg.lowerPart = parts[parts.length - 2]; leg.upperPart = parts[parts.length - 1];
  }

  // --- platform (puck) in the plate frame: origin = joint plane centre, +Y = normal ---
  const plate = new THREE.Group(); root.add(plate);
  const a = SPV4.l / (2 * Math.cos(30 * DEG)) * 0.01;
  const attachLocal = [[0, 0, -a], [a * Math.cos(30 * DEG), 0, a * Math.sin(30 * DEG)], [-a * Math.cos(30 * DEG), 0, a * Math.sin(30 * DEG)]];
  {
    const attach = new THREE.Group(); plate.add(attach);
    const disk = cyl(0.147, 0.003, M.clear, attach, [0, 0.0055, 0], null, 96); disk.renderOrder = 2;
    attach.add(new THREE.LineSegments(G(new THREE.EdgesGeometry(disk.geometry, 30)), M.clearEdge)).position.y = 0.0055;
    for (const [x, , z] of attachLocal) { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = Math.atan2(x, z); attach.add(s); box(0.016, 0.0045, 0.020, M.servo, s, [0, 0.0018, 0]); cyl(0.0068, 0.004, M.steel, s, [0, -0.0005, 0], null, 20); }
    part(attach, [0, 0.085, 0], 0.46);
    // Forcen F/T sensor: fastened to the attach plate and to the top plate, 4 bolts each, in a square
    const sensor = new THREE.Group(); plate.add(sensor);
    cyl(0.034, 0.006, M.darkSteel, sensor, [0, 0.010, 0], null, 48);
    cyl(0.031, 0.010, M.sensor, sensor, [0, 0.018, 0], null, 48);
    cyl(0.034, 0.002, M.darkSteel, sensor, [0, 0.024, 0], null, 48);
    part(sensor, [0, 0.125, 0], 0.56);
    const lowerBolts = new THREE.Group(); plate.add(lowerBolts);
    for (const x of [-0.019, 0.019]) for (const z of [-0.019, 0.019]) bolt(lowerBolts, x, 0.004, z, -1, 0.9);
    part(lowerBolts, [0, -0.07, 0], 0.52);
    const skirt = new THREE.Group(); plate.add(skirt);
    cyl(PUCK.radius + 0.001, PUCK.ledLow - PUCK.bottom, M.plateBlack, skirt, [0, (PUCK.ledLow + PUCK.bottom) / 2, 0], null, 128, true);
    const ring = cyl(PUCK.radius + 0.0005, 0.003, M.plateBlack, skirt, [0, PUCK.bottom + 0.0015, 0], null, 128); ring.scale.set(1, 1, 1);
    part(skirt, [0, 0.165, 0], 0.62);
    const led = new THREE.Group(); plate.add(led);
    cyl(PUCK.radius + 0.003, PUCK.ledHigh - PUCK.ledLow, M.led, led, [0, (PUCK.ledHigh + PUCK.ledLow) / 2, 0], null, 128, true);
    part(led, [0, 0.195, 0], 0.68);
    const top = new THREE.Group(); plate.add(top);
    cyl(PUCK.radius, PUCK.top - PUCK.ledHigh, M.plateBlack, top, [0, (PUCK.top + PUCK.ledHigh) / 2, 0], null, 128, true);
    const face = mesh(new THREE.CircleGeometry(PUCK.radius, 128), M.plateTop, top, [0, PUCK.top, 0], [-Math.PI / 2, 0, 0]);
    const under = mesh(new THREE.CircleGeometry(PUCK.radius, 128), M.plateBlack, top, [0, PUCK.ledHigh, 0], [Math.PI / 2, 0, 0]);
    part(top, [0, 0.225, 0], 0.76);
    const topBolts = new THREE.Group(); plate.add(topBolts);
    for (const x of [-0.019, 0.019]) for (const z of [-0.019, 0.019]) bolt(topBolts, x, PUCK.top - 0.0021, z, 1, 0.85);
    part(topBolts, [0, 0.255, 0], 0.83);
    void face; void under;
  }
  // drop target: a subtle grey reticle lying on the top face under the cursor
  const target = new THREE.Group(); target.visible = false; plate.add(target);
  {
    const tm = new THREE.MeshBasicMaterial({ color: 0xbdbab4, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    const flat = (g, x = 0, z = 0, rz = 0) => { const o = new THREE.Mesh(G(g), tm); o.rotation.set(-Math.PI / 2, 0, rz); o.position.set(x, PUCK.top + 0.0006, z); o.renderOrder = 3; target.add(o); };
    flat(new THREE.RingGeometry(BALL.radius * 0.92, BALL.radius * 1.08, 48));
    flat(new THREE.CircleGeometry(BALL.radius * 0.12, 16));
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, r = BALL.radius * 1.5; flat(new THREE.PlaneGeometry(BALL.radius * 0.5, BALL.radius * 0.07), Math.cos(a) * r, Math.sin(a) * r, -a); }
  }
  function setTarget(x, y, on) { target.visible = !!on; if (on) target.position.set(x, 0, -y); return api; }
  const ballPivot = new THREE.Group(); plate.add(ballPivot);
  const ball = mesh(new THREE.SphereGeometry(BALL.radius, 48, 32), M.ball, ballPivot);
  part(ballPivot, [0, 0.20, 0], 0.88);

  // ---------------------------------------------------------------------------------------------------------------
  let state = { pitch: 0, roll: 0, ballX: 0, ballY: 0, ballLift: 0, led: 'white', explode: 0 };
  let pose = solvePlatform(0, 0), width = 640, height = 360, lastBall = null;
  const W = (p) => new THREE.Vector3(...toWorld(p)).setY(toWorld(p)[1] + HIP);
  const basis = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();

  function orient(group, A, B, tangent) {
    const y = B.clone().sub(A).normalize(), z = tangent.clone().addScaledVector(y, -tangent.dot(y)).normalize(), x = new THREE.Vector3().crossVectors(y, z);
    group.position.copy(A); group.quaternion.setFromRotationMatrix(basis.makeBasis(x, y, z));
  }
  function setLed(mode) {
    if (mode === 'green') { M.led.color.setHex(0xa9cdb2); M.led.emissive.setHex(0x2f8a4e); M.led.emissiveIntensity = 1.1; }
    else if (mode === 'off') { M.led.color.setHex(0x8c8a86); M.led.emissive.setHex(0x000000); }
    else { M.led.color.setHex(0xe4e2dd); M.led.emissive.setHex(0x6b6964); M.led.emissiveIntensity = 1; }
  }

  function setState(next = {}) {
    const prevLed = state.led; state = { ...state, ...next };
    if (state.led !== prevLed) setLed(state.led);
    const lim = SPV4.max_tilt;
    pose = solvePlatform(clamp(state.pitch || 0, -lim, lim), clamp(state.roll || 0, -lim, lim));
    // plate frame: X = u, Y = n, Z = -v  (SPV4 u,v,n right-handed)
    const U = new THREE.Vector3(...toWorld(pose.u)), N = new THREE.Vector3(...toWorld(pose.normal)), Z = new THREE.Vector3(...toWorld(pose.v)).negate();
    plate.position.copy(W(pose.center)); plate.quaternion.setFromRotationMatrix(basis.makeBasis(U, N, Z));
    pose.chains.forEach((c, i) => {
      const leg = legs[i], A = W(c.base), B = W(c.elbow), C = W(c.target), T = new THREE.Vector3(...toWorld(c.tangent));
      orient(leg.lower, A, B, T); orient(leg.upper, B, C, T);
    });
    // ball (child of plate) + rolling rotation from displacement
    const bx = state.ballX || 0, by = state.ballY || 0, lift = Math.max(0, state.ballLift || 0);
    ballPivot.position.set(bx, PUCK.top + BALL.radius + lift, -by);
    if (lastBall && lift === 0) {
      const dx = bx - lastBall[0], dz = -by + lastBall[1], d = Math.hypot(dx, dz);
      if (d > 1e-7 && d < 0.05) { tmpQ.setFromAxisAngle(new THREE.Vector3(dz / d, 0, -dx / d), d / BALL.radius); ball.quaternion.premultiply(tmpQ); }
    }
    lastBall = [bx, by];
    // explode (staggered assembly order): each part keeps its kinematic/rest pose and adds an offset expressed in its
    // parent's frame (world for links and base, servo frame for servo parts, plate frame for the puck parts)
    const e = clamp(state.explode || 0, 0, 1), s = 1 - e;
    for (const p of parts) {
      const w = 1 - smooth((s - p.start * 0.78) / 0.22);
      if (w <= 0) continue;
      if (p.leg) p.obj.position.addScaledVector(p.leg.radial, p.radialOff * w).add(new THREE.Vector3(0, p.off.y * w, 0));
      else p.obj.position.addScaledVector(p.off, w);
      if (p.rot.lengthSq()) { tmpE.set(p.rot.x * w, p.rot.y * w, p.rot.z * w); tmpQ.setFromEuler(tmpE); p.obj.quaternion.multiply(tmpQ); }
    }
    return api;
  }

  // Static parts get their rest pose restored before each update so the additive offsets never accumulate.
  for (const leg of legs) { leg.lowerPart.leg = leg; leg.lowerPart.radialOff = 0.34; leg.upperPart.leg = leg; leg.upperPart.radialOff = 0.40; }
  const staticParts = parts.filter((p) => !p.leg && p.obj !== ballPivot);
  for (const p of staticParts) p.rest = { pos: p.obj.position.clone(), quat: p.obj.quaternion.clone() };
  function setStateStatic(next) {
    for (const p of staticParts) { p.obj.position.copy(p.rest.pos); p.obj.quaternion.copy(p.rest.quat); }
    return setState(next);
  }

  // setCamera(spec|name) or setCamera(a, b, t): blend two specs (resolved for the current aspect)
  let camArgs = ['default'];
  const specOf = (x) => (typeof x === 'string' ? CAMERAS[x] : x);
  function updateCamera() {
    const asp = width / height, [a0, b0, t] = camArgs, ra = resolveCamera(specOf(a0), asp);
    applyResolved(camera, b0 != null ? blendResolved(ra, resolveCamera(specOf(b0), asp), clamp(t, 0, 1)) : ra, asp);
  }
  function setCamera(spec, to, t) { camArgs = [spec, to, t]; updateCamera(); return api; }
  function setCameraResolved(r) { camArgs = null; applyResolved(camera, r, width / height); return api; }
  function render() { renderer.render(scene, camera); return api; }
  function resize(w, h, dpr) {
    width = Math.max(1, Math.round(w)); height = Math.max(1, Math.round(h));
    if (dpr) { pixelRatio = dpr; renderer.setPixelRatio(dpr); }
    renderer.setSize(width, height, false); if (camArgs) updateCamera(); return api;
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), plane = new THREE.Plane();
  function pickPlate(clientX, clientY) {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return null;
    ndc.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    plate.updateMatrixWorld(true);
    const n = new THREE.Vector3(0, 1, 0).applyQuaternion(plate.quaternion), p0 = new THREE.Vector3(0, PUCK.top, 0).applyMatrix4(plate.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(n, p0);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    const local = plate.worldToLocal(hit.clone());
    return { x: local.x, y: -local.z, inside: Math.hypot(local.x, local.z) <= PUCK.radius };
  }
  // normalised demo-video pixel -> plate coordinates of a ball centre (plane at plate top + ball radius, level plate)
  const demoCam = new THREE.PerspectiveCamera();
  function videoToPlate(u, v) {
    applyCamera(demoCam, CAMERAS.demo, 16 / 9);
    ndc.set(u * 2 - 1, -(v * 2 - 1)); ray.setFromCamera(ndc, demoCam);
    plane.set(new THREE.Vector3(0, 1, 0), -(PLATE_TOP_Y + BALL.radius));
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return { x: hit.x, y: -hit.z };
  }

  const ready = Promise.all(['arm-link-1.json', 'arm-link-2.json', 'sphere-joint-arm-connector.json'].map(async (name) => {
    const r = await fetch(new URL(name, assetBase)); if (!r.ok) throw new Error('Missing CAD mesh ' + name); return r.json();
  })).then(([l1, l2, conn]) => {
    const geo = (src) => { const m = src.meshes[0], g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array.map((v) => v * 0.001), 3)); g.setIndex(m.index.array); g.computeVertexNormals(); return G(g); };
    const g1 = geo(l1), g2 = geo(l2), gc = geo(conn);
    for (const leg of legs) {
      leg.lower.remove(leg.lowerProxy); leg.upper.remove(leg.upperProxy);
      const m1 = new THREE.Mesh(g1, M.acrylicBlack); m1.position.z = -0.0055; leg.lower.add(m1);
      // arm-link-2: elbow bore at its y = 60 mm, connector holes at y = 0 / 10 -> flip so the bore sits on the elbow
      const m2 = new THREE.Mesh(g2, M.acrylicBlack); m2.rotation.z = Math.PI; m2.position.set(0, 0.060, 0.0014); leg.upper.add(m2);
      // sphere-joint arm connector: lower hole (y = 4 mm) on link-2's end hole, ball socket at 86 mm
      const mc = new THREE.Mesh(gc, M.acrylicBlack); mc.position.set(0, 0.056, 0); leg.upper.add(mc);
    }
    setStateStatic(state); return api;
  });

  const api = {
    canvas, renderer, scene, camera, ready, CAMERAS,
    setState: setStateStatic, setCamera, setCameraResolved, resolveCamera: (spec) => resolveCamera(specOf(spec), width / height), render, resize, pickPlate, videoToPlate, setTarget,
    getState: () => ({ ...state }), getKinematics: () => pose,
    setBackground(c) { bg.set(c); renderer.setClearColor(bg, 1); return api; },
    dispose() { renderer.dispose(); envRT.dispose(); geoms.forEach((g) => g.dispose()); Object.values(M).forEach((m) => m.dispose()); tex.map.dispose(); tex.metal.dispose(); },
  };
  setLed('white'); resize(width, height); setStateStatic(state);
  return api;
}

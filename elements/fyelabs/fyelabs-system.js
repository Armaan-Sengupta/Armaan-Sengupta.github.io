/* <as-fyelabs-system> — FYELABS rear-sensing unit for refuse trucks.
 *
 * A procedural Three.js model of the actuating LiDAR enclosure, built from the
 * sheet-metal drawings (body flat 362 x 170 mm, protective cover flat 375.7 x 182 mm,
 * 186 x 125 mm lids, 220 x 226 mm back plate, 30/60 degree bends) and the "Global Renders"
 * set. Black powder coat, as built. The ten 1-D LiDARs sit on a semicircular bracket behind
 * a 30 mm window band and together act as a 2-D LiDAR with no moving parts.
 *
 * Attributes / properties
 *   view="case|lidar|dust"   case  : protective cover raises and lowers, enclosure explodes
 *                                    and re-assembles.
 *                            lidar : cover open, the 10-beam arc ranging a person walking
 *                                    past a delineator post; returns accumulate as a cloud.
 *                            dust  : a dust plume crosses the beams. RAW returns from the
 *                                    dust trigger false detections; FILTERED rejects them
 *                                    while the person is still tracked.
 *   progress (0..1, optional) scrubs the current view's timeline instead of the clock.
 *                            Remove the attribute / set the property to null to resume.
 *   paused                   boolean attribute, freezes the clock.
 * Events: 'ready' (first frame drawn), 'viewchange' {detail:{view}}.
 * Sensor returns are simulated for illustration (no field data); dust filtering is drawn
 * as raw vs filtered outcome only, the five real filters are not reproduced.
 */
import * as THREE from '../shared/vendor/three.module.min.js';

const VIEWS = ['case', 'lidar', 'dust'];
const DUR = { case: 14, lidar: 16, dust: 12 };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
// additive glow that leaves canvas alpha untouched (canvas is transparent over the page)
function addGlow(m, premult) { m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = premult ? THREE.OneFactor : THREE.SrcAlphaFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor; m.transparent = true; m.depthWrite = false; return m; }
const ACCENT = new THREE.Color('#d0745c');
const WS = 5, RMAX = 17.5;            // world units per metre around the truck; display range 3.5 m

/* ---------- sheet-metal helpers (mm, plan = x/z, height = y) ---------- */
function filletPath(pts, R) {
  const pieces = []; let s = 0; let start = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], prev = pts[i - 1];
    const d1 = norm2([p[0] - prev[0], p[1] - prev[1]]);
    if (i === pts.length - 1) { const L = len2(start, p); pieces.push({ type: 'flat', a: start, b: p, d: d1, s0: s, s1: s + L }); s += L; break; }
    const nx = pts[i + 1], d2 = norm2([nx[0] - p[0], nx[1] - p[1]]);
    const cr = d1[0] * d2[1] - d1[1] * d2[0], dt = d1[0] * d2[0] + d1[1] * d2[1];
    const phi = Math.atan2(cr, dt), L = R * Math.tan(Math.abs(phi) / 2);
    const t1 = [p[0] - d1[0] * L, p[1] - d1[1] * L], t2 = [p[0] + d2[0] * L, p[1] + d2[1] * L];
    const fl = len2(start, t1); pieces.push({ type: 'flat', a: start, b: t1, d: d1, s0: s, s1: s + fl }); s += fl;
    const sg = Math.sign(phi), n1 = [-d1[1], d1[0]], c = [t1[0] + sg * R * n1[0], t1[1] + sg * R * n1[1]];
    const a0 = Math.atan2(t1[1] - c[1], t1[0] - c[0]), al = R * Math.abs(phi);
    pieces.push({ type: 'arc', c, r: R, a0, a1: a0 + phi, s0: s, s1: s + al }); s += al; start = t2;
  }
  return { pieces, length: s };
}
const len2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const norm2 = v => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; };
function offsetPoly(pts, d) { // offset an open polyline to its left by d (outward for our winding)
  const lines = [];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], t = norm2([b[0] - a[0], b[1] - a[1]]), n = [-t[1], t[0]]; lines.push({ p: [a[0] + n[0] * d, a[1] + n[1] * d], t }); }
  const out = [lines[0].p];
  for (let i = 0; i < lines.length - 1; i++) {
    const A = lines[i], B = lines[i + 1], den = A.t[0] * B.t[1] - A.t[1] * B.t[0];
    const u = ((B.p[0] - A.p[0]) * B.t[1] - (B.p[1] - A.p[1]) * B.t[0]) / den;
    out.push([A.p[0] + A.t[0] * u, A.p[1] + A.t[1] * u]);
  }
  const last = lines[lines.length - 1], l = len2(pts[pts.length - 2], pts[pts.length - 1]);
  out.push([last.p[0] + last.t[0] * l, last.p[1] + last.t[1] * l]);
  return out;
}
function rectPath(x0, y0, x1, y1, r = 0) {
  const p = new THREE.Path();
  if (!r) { p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.lineTo(x0, y0); return p; }
  p.moveTo(x0 + r, y0); p.absarc(x0 + r, y0 + r, r, -Math.PI / 2, -Math.PI, true); p.lineTo(x0, y1 - r);
  p.absarc(x0 + r, y1 - r, r, Math.PI, Math.PI / 2, true); p.lineTo(x1 - r, y1); p.absarc(x1 - r, y1 - r, r, Math.PI / 2, 0, true);
  p.lineTo(x1, y0 + r); p.absarc(x1 - r, y0 + r, r, 0, -Math.PI / 2, true); return p;
}
/* Build a bent sheet: path (plan), thickness t, bands [{y0,y1,s:[[a,b]]|null}], holes [{s0,s1,y0,y1,r}] */
function sheet(path, t, bands, holes, mat) {
  const g = new THREE.Group();
  for (const band of bands) {
    const ranges = band.s || [[-1e9, 1e9]];
    for (const pc of path.pieces) for (const [ra, rb] of ranges) {
      const a = Math.max(pc.s0, ra), b = Math.min(pc.s1, rb); if (b - a < 0.05) continue;
      if (pc.type === 'flat') {
        const u0 = a - pc.s0, u1 = b - pc.s0, sh = new THREE.Shape();
        sh.moveTo(u0, band.y0); sh.lineTo(u1, band.y0); sh.lineTo(u1, band.y1); sh.lineTo(u0, band.y1); sh.lineTo(u0, band.y0);
        for (const h of holes) if (h.s0 > a + .2 && h.s1 < b - .2 && h.y0 > band.y0 + .2 && h.y1 < band.y1 - .2) sh.holes.push(rectPath(h.s0 - pc.s0, h.y0, h.s1 - pc.s0, h.y1, h.r || 0));
        const geo = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false, curveSegments: 6 });
        const X = new THREE.Vector3(pc.d[0], 0, pc.d[1]), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(-pc.d[1], 0, pc.d[0]);
        const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(new THREE.Vector3(pc.a[0], 0, pc.a[1]).addScaledVector(Z, -t / 2));
        geo.applyMatrix4(m); g.add(new THREE.Mesh(geo, mat));
      } else {
        const k0 = (a - pc.s0) / (pc.s1 - pc.s0), k1 = (b - pc.s0) / (pc.s1 - pc.s0);
        const A0 = lerp(pc.a0, pc.a1, k0), A1 = lerp(pc.a0, pc.a1, k1), cw = A1 < A0;
        const ro = pc.r + t / 2, ri = Math.max(.01, pc.r - t / 2), sh = new THREE.Shape();
        sh.moveTo(pc.c[0] + Math.cos(A0) * ro, pc.c[1] + Math.sin(A0) * ro); sh.absarc(pc.c[0], pc.c[1], ro, A0, A1, cw);
        sh.lineTo(pc.c[0] + Math.cos(A1) * ri, pc.c[1] + Math.sin(A1) * ri); sh.absarc(pc.c[0], pc.c[1], ri, A1, A0, !cw);
        const geo = new THREE.ExtrudeGeometry(sh, { depth: band.y1 - band.y0, bevelEnabled: false, curveSegments: 10 });
        geo.rotateX(Math.PI / 2); geo.translate(0, band.y1, 0); g.add(new THREE.Mesh(geo, mat));
      }
    }
  }
  return g;
}
function pathAt(path, s) { // position + outward normal on a flat
  for (const pc of path.pieces) if (pc.type === 'flat' && s >= pc.s0 - .01 && s <= pc.s1 + .01) {
    const u = s - pc.s0; return { p: [pc.a[0] + pc.d[0] * u, pc.a[1] + pc.d[1] * u], n: [-pc.d[1], pc.d[0]], d: pc.d };
  }
  return null;
}
function outline(path, closeBack = true) { // plan outline incl. fillets, closed along the back (z = min)
  const pts = [];
  for (const pc of path.pieces) {
    if (pc.type === 'flat') { pts.push(pc.a, pc.b); }
    else for (let i = 0; i <= 8; i++) { const a = lerp(pc.a0, pc.a1, i / 8); pts.push([pc.c[0] + Math.cos(a) * pc.r, pc.c[1] + Math.sin(a) * pc.r]); }
  }
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]); if (closeBack) sh.lineTo(pts[0][0], pts[0][1]);
  return sh;
}
function plate(shape, t, y, mat, holes = []) { // horizontal plate in plan at height y (bottom face)
  for (const h of holes) shape.holes.push(h);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 16 });
  geo.rotateX(Math.PI / 2); geo.translate(0, y + t, 0); return new THREE.Mesh(geo, mat);
}
function circlePath(x, y, r) { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; }

/* ---------- soft studio environment for reflections ---------- */
function studioEnv(renderer) {
  const s = new THREE.Scene(), box = new THREE.BoxGeometry(1, 1, 1);
  const room = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x060607, side: THREE.BackSide })); room.scale.set(30, 16, 30); s.add(room); room.material.color.setRGB(.05, .05, .055, THREE.LinearSRGBColorSpace);
  const panel = (w, h, x, y, z, ry, rx, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * .97), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
  panel(16, 8, 0, 7.8, 0, 0, Math.PI / 2, 3.6);          // overhead softbox
  panel(5, 12, -14.5, 1, 4, Math.PI / 2, 0, 6);        // left strip
  panel(4, 12, 14.5, 2, 3, -Math.PI / 2, 0, 4.5);       // right strip
  panel(14, 5, 0, 1, 14.5, Math.PI, 0, 2.2);             // front fill
  panel(10, 2, 2, -1, -14.5, 0, 0, .6);                  // back kicker
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(s, .035); pm.dispose();
  return rt.texture;
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}

/* ---------- the enclosure ---------- */
const BODY_PTS = [[-93, 0], [-93, 44], [-47.2, 123.3], [47.2, 123.3], [93, 44], [93, 0]];
const WIN = [12.5, 42.5];               // lidar window band (mm above bottom)
const COVER_LOW = -7, COVER_HIGH = 44;   // cover bottom edge, sealed / open
const ARC_C = 16, ARC_R = 80;            // sensor arc centre (z) and radius
export const SENSOR_ANGLES = Array.from({ length: 10 }, (_, i) => (-81 + 18 * i) * DEG);

function buildCase() {
  const M = {
    coat: new THREE.MeshPhysicalMaterial({ color: 0x18181a, metalness: .3, roughness: .38, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 2.4 }),
    coatIn: new THREE.MeshStandardMaterial({ color: 0x0d0d0e, metalness: .2, roughness: .6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x111316, metalness: 0, roughness: .06, transparent: true, opacity: .28, envMapIntensity: 1.6, depthWrite: false }),
    sensor: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: .1, roughness: .55 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x050607, metalness: .2, roughness: .05, clearcoat: 1, envMapIntensity: 1.6 }),
    alu: new THREE.MeshStandardMaterial({ color: 0x55575b, metalness: .9, roughness: .38 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9a9ca0, metalness: 1, roughness: .3 }),
    pcb: new THREE.MeshStandardMaterial({ color: 0x1a2620, metalness: .1, roughness: .55 }),
    gold: new THREE.MeshStandardMaterial({ color: 0x8a7650, metalness: .7, roughness: .4 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0, roughness: .7 }),
    led: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  };
  const root = new THREE.Group(), parts = {};
  const T = 3;
  // body wrap
  const bodyPath = filletPath(BODY_PTS, 3), L = bodyPath.length, end = 28.1 * L / 362;
  const camH = [{ s0: 138 * L / 362, s1: 183 * L / 362, y0: 129, y1: 157 }, { s0: 190 * L / 362, s1: 217 * L / 362, y0: 143, y1: 158, r: 6 }];
  const sideSq = [{ s0: 90 * L / 362, s1: 116.7 * L / 362, y0: 109, y1: 135 }, { s0: L - 116.7 * L / 362, s1: L - 90 * L / 362, y0: 109, y1: 135 }];
  const slots = [{ s0: 16.5, s1: 26.5, y0: 62, y1: 104, r: 5 }, { s0: L - 26.5, s1: L - 16.5, y0: 62, y1: 104, r: 5 }];
  const body = sheet(bodyPath, T, [{ y0: 0, y1: WIN[0] }, { y0: WIN[0], y1: WIN[1], s: [[0, end], [L - end, L]] }, { y0: WIN[1], y1: 170 }], [...camH, ...sideSq, ...slots], M.coat);
  parts.body = body; root.add(body);
  // window glass (just inside the wrap)
  const glass = sheet(filletPath(offsetPoly(BODY_PTS, -3), 1), 1.5, [{ y0: WIN[0] - 1, y1: WIN[1] + 1 }], [], M.glass);
  glass.traverse(o => { if (o.isMesh) o.renderOrder = 3; }); body.add(glass);
  // camera module behind the front cut-outs
  const cam = new THREE.Group(), cA = pathAt(bodyPath, (camH[0].s0 + camH[0].s1) / 2);
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(52, 34, 1.6), M.pcb); cam.add(pcb);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 9, 28), M.steel); barrel.rotation.x = Math.PI / 2; barrel.position.z = 5; cam.add(barrel);
  const lensFace = new THREE.Mesh(new THREE.CircleGeometry(6, 28), M.lens); lensFace.position.z = 9.6; cam.add(lensFace);
  for (let i = 0; i < 6; i++) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3, 12), M.gold); cap.rotation.x = Math.PI / 2; cap.position.set(i < 3 ? -15 : 15, -7 + (i % 3) * 7, 2); cam.add(cap); }
  cam.position.set(cA.p[0], 143, cA.p[1] - 9); body.add(cam);
  const depthBox = new THREE.Mesh(new THREE.BoxGeometry(26, 14, 6), M.rubber), dA = pathAt(bodyPath, (camH[1].s0 + camH[1].s1) / 2);
  depthBox.position.set(dA.p[0], 150.5, dA.p[1] - 6); body.add(depthBox);
  // screws on the front face
  const screw = new THREE.CylinderGeometry(2.6, 2.6, 1.2, 14);
  const addScrew = (s, y) => { const q = pathAt(bodyPath, s); if (!q) return; const m = new THREE.Mesh(screw, M.steel); m.position.set(q.p[0] + q.n[0] * 2, y, q.p[1] + q.n[1] * 2); m.rotation.set(Math.PI / 2, 0, 0); m.lookAt(m.position.x + q.n[0], y, m.position.z + q.n[1]); m.rotateX(Math.PI / 2); body.add(m); };
  const S = L / 362;
  [[134, 161], [187, 161], [134, 125], [187, 125], [195, 162], [214, 162], [195, 139], [214, 139], [168, 100], [195, 100], [168, 72], [195, 72]].forEach(([s, y]) => addScrew(s * S, y));
  [[86, 139], [120, 139], [86, 105], [120, 105]].forEach(([s, y]) => { addScrew(s * S, y); addScrew(L - s * S, y); });
  const statusLed = new THREE.Mesh(new THREE.PlaneGeometry(5, 7), M.led), sl = pathAt(bodyPath, 181.5 * S);
  statusLed.position.set(sl.p[0], 86, sl.p[1] + 1.8); body.add(statusLed); parts.led = statusLed;
  // lids
  const topLid = plate(outline(filletPath(offsetPoly(BODY_PTS, 1.5), 3)), T, 170, M.coat, [circlePath(-38, 34, 11), circlePath(0, 34, 11), circlePath(38, 34, 11)]);
  const lidG = new THREE.Group(); lidG.add(topLid);
  for (const x of [-38, 0, 38]) { const g2 = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 1.4, 6), M.rubber); g2.position.set(x, 173.7, 34); lidG.add(g2); }
  parts.top = lidG; root.add(lidG);
  const botLid = new THREE.Group(); botLid.add(plate(outline(filletPath(offsetPoly(BODY_PTS, 1.5), 3)), T, -T, M.coat));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(13, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.rubber); dome.position.set(0, -T, 62); botLid.add(dome);
  for (const x of [-26, 26]) { const so = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 9, 12), M.rubber); so.position.set(x, -T - 4.5, 80); botLid.add(so); }
  parts.bottom = botLid; root.add(botLid);
  // back plate with edge mounting holes
  const bp = new THREE.Shape(); bp.moveTo(-110, -12); bp.lineTo(110, -12); bp.lineTo(110, 214); bp.lineTo(-110, 214); bp.lineTo(-110, -12);
  for (let i = 0; i < 8; i++) { const y = -2 + i * 29.5; bp.holes.push(circlePath(-102, y, 3.2)); bp.holes.push(circlePath(102, y, 3.2)); }
  const bpg = new THREE.ExtrudeGeometry(bp, { depth: T, bevelEnabled: false, curveSegments: 12 }); bpg.translate(0, 0, -T - 1.5);
  const back = new THREE.Mesh(bpg, M.coat); parts.back = back; root.add(back);
  // sensor bracket + 10 single-beam LiDARs
  const arr = new THREE.Group();
  const brShape = new THREE.Shape(); brShape.absarc(0, ARC_C, ARC_R - 14, -Math.PI / 2 * 0 - 0, Math.PI, false); brShape.absarc(0, ARC_C, ARC_R - 16, Math.PI, 0, true);
  const brg = new THREE.ExtrudeGeometry(brShape, { depth: 30, bevelEnabled: false, curveSegments: 40 }); brg.rotateX(Math.PI / 2); brg.translate(0, 44, 0);
  arr.add(new THREE.Mesh(brg, M.alu));
  const shelf = plate(outline(filletPath(offsetPoly(BODY_PTS, -5), 2)), 1.5, 5, M.alu); arr.add(shelf);
  parts.sensors = [];
  for (const a of SENSOR_ANGLES) {
    const sg = new THREE.Group(), box = new THREE.Mesh(new THREE.BoxGeometry(21, 28, 14), M.sensor); sg.add(box);
    for (const dy of [-6.5, 6.5]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 1.2, 20), M.rubber); ring.rotation.x = Math.PI / 2; ring.position.set(0, dy, 7.4); sg.add(ring); const ln = new THREE.Mesh(new THREE.CircleGeometry(3.8, 20), M.lens); ln.position.set(0, dy, 8.1); sg.add(ln); }
    const em = new THREE.Mesh(new THREE.CircleGeometry(1.1, 10), M.led.clone()); em.position.set(0, 6.5, 8.3); sg.add(em);
    sg.position.set(Math.sin(a) * (ARC_R - 7), (WIN[0] + WIN[1]) / 2, ARC_C + Math.cos(a) * (ARC_R - 7)); sg.rotation.y = a;
    sg.userData = { a, base: sg.position.clone(), em }; arr.add(sg); parts.sensors.push(sg);
  }
  parts.array = arr; root.add(arr);
  // protective cover (U-wrap + lid), outside the body by 6 mm
  const cPts = offsetPoly(BODY_PTS, 6.5), cPath = filletPath(cPts, 7), CL = cPath.length, k = CL / 375.72;
  const cHoles = [{ s0: 145.6 * k, s1: 229.4 * k, y0: 85, y1: 123.6 }, { s0: 160.4 * k, s1: 167.4 * k, y0: 44, y1: 51.4 }, { s0: 191 * k, s1: 224 * k, y0: 38, y1: 61 },
    { s0: 73 * k, s1: 107 * k, y0: 65, y1: 104 }, { s0: CL - 107 * k, s1: CL - 73 * k, y0: 65, y1: 104 }];
  const cover = new THREE.Group(); cover.add(sheet(cPath, T, [{ y0: 0, y1: 182 }], cHoles, M.coat));
  const cl = plate(outline(filletPath(offsetPoly(BODY_PTS, 8), 8.5)), T, 182, M.coat); cover.add(cl);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 3, 6), M.steel); nut.position.set(0, 186.5, 62); cover.add(nut);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 110, 16), M.steel); rod.position.set(0, 129, 62); cover.add(rod);
  parts.cover = cover; root.add(cover);
  root.scale.setScalar(.01);
  return { root, parts, M };
}

/* ---------- person (simple matte mannequin) ---------- */
function buildPerson() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: .8, metalness: 0, envMapIntensity: .5 });
  const g = new THREE.Group(), cap = (r, l) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), mat);
  const torso = cap(1.55, 4.2); torso.position.y = 12.3; torso.scale.z = .62; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 14), mat); head.position.y = 16.6; g.add(head);
  const legs = [], arms = [];
  for (const sd of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sd * .85, 9.4, 0); g.add(hip);
    const th = cap(.72, 3.6); th.position.y = -2.2; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -4.4; hip.add(knee);
    const sh = cap(.58, 3.6); sh.position.y = -2.2; knee.add(sh);
    legs.push({ hip, knee, sd });
    const shd = new THREE.Group(); shd.position.set(sd * 2.05, 14.9, 0); g.add(shd);
    const ua = cap(.48, 2.6); ua.position.y = -1.7; shd.add(ua);
    const el = new THREE.Group(); el.position.y = -3.3; shd.add(el);
    const fa = cap(.42, 2.5); fa.position.y = -1.6; el.add(fa); arms.push({ shd, el, sd });
  }
  g.userData = { legs, arms, torso };
  g.userData.pose = (ph, amp, crouch = 0) => {
    for (const l of legs) { const s = Math.sin(ph + (l.sd > 0 ? Math.PI : 0)); l.hip.rotation.x = s * .45 * amp - crouch * 1.2; l.knee.rotation.x = (Math.max(0, -Math.cos(ph + (l.sd > 0 ? Math.PI : 0))) * .7 * amp) + crouch * 2.0; }
    for (const a of arms) { const s = Math.sin(ph + (a.sd > 0 ? 0 : Math.PI)); a.shd.rotation.x = s * .35 * amp - crouch * .5; a.el.rotation.x = -.25 - crouch * .6; }
    g.position.y = (-crouch * 3.6 + Math.abs(Math.cos(ph)) * .15 * amp) * g.scale.y;
  };
  return g;
}

/* ---------- shaders ---------- */
const groundVS = `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const groundFS = `
uniform float uHit[10]; uniform float uAlert[10]; uniform vec3 uAccent; uniform float uOp; uniform float uOz; varying vec3 vW;
float line(float v, float w){ float d = abs(fract(v)-.5); float fw = fwidth(v); return 1.-smoothstep(w*fw, (w+1.)*fw, .5-d); }
void main(){
  vec2 p = vec2(vW.x, vW.z - uOz); float r = length(p); float th = atan(p.x, p.y);
  float fade = 1. - smoothstep(13., 22., r);
  float grid = max(line(vW.x/2.5+.5, .5), line(vW.z/2.5+.5, .5)) * .022;
  float rings = line(r/5.+.5, .7) * .075 * step(3., r) * step(p.y, 99.) * (p.y > -.2 ? 1. : .35);
  vec3 col = vec3(0.); float a = grid + rings;
  if (p.y > -.5 && abs(th) < 1.5708) {
    float k = (th + 1.5708) / .314159; float idx = floor(k);
    float edge = line(k+.5, .45) * .035 * step(1.2, r) * (1.-smoothstep(14., 18., r)); a += edge;
    for (int i = 0; i < 10; i++) { if (abs(float(i)-idx) < .5) { float h = uHit[i]; float al = uAlert[i];
      float inside = step(1.0, r) * (1. - smoothstep(h-.15, h+.05, r));
      col = mix(col, uAccent, clamp(al*inside, 0., 1.)); a += al * inside * .16 + al * (1.-smoothstep(.0,.2,abs(r-h))) * .5 * step(1.0, r); } }
  }
  gl_FragColor = vec4(mix(vec3(.95,.93,.9), uAccent, clamp(length(col),0.,1.)), a * fade * uOp);
}`;
const beamVS = `attribute vec3 bt; varying vec3 vB; void main(){ vB = bt; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const beamFS = `uniform float uTime; uniform float uOp; varying vec3 vB;
void main(){ float t = vB.x; float L = vB.y; float lat = vB.z;
  float core = 1. - smoothstep(.0, 1., abs(lat));
  float pulse = smoothstep(.86, 1., fract(t*L/3.2 - uTime*1.6)) * (1. - t*.6);
  float a = (.085*(1.-.7*t) + .09*pulse) * (.35 + .65*core) * uOp;
  gl_FragColor = vec4(vec3(.96,.94,.9) * a, 1.); }`;
const ptsVS = `attribute float birth; attribute float kind; uniform float uTime; uniform float uLife; uniform float uPx; varying float vA; varying float vK;
void main(){ float age = uTime - birth; vA = clamp(1. - age/uLife, 0., 1.); vA *= vA; vK = kind;
  vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
  float s = kind > 1.5 ? 1.1 : (kind > .5 ? 1.0 : 1.25); gl_PointSize = (age < 0. ? 0. : min(9. * uPx, s * uPx * (1.2 + 1.4*vA) * 60. / -mv.z)); }`;
const ptsFS = `uniform float uOp; uniform vec3 uAccent; varying float vA; varying float vK;
void main(){ vec2 c = gl_PointCoord - .5; float r = length(c); if (r > .5) discard;
  vec3 col = vec3(.97,.95,.91); float a = 1. - smoothstep(.36, .5, r);
  if (vK > 1.5) { a = (1. - smoothstep(.40,.5,r)) * smoothstep(.22,.32,r); col = vec3(.55,.54,.52); a *= .8; }
  else if (vK > .5) { col = vec3(.72,.66,.58); }
  gl_FragColor = vec4(col, a * vA * uOp); }`;

/* ---------- element ---------- */
const CSS = `:host{display:block;width:100%;height:100%;position:relative;contain:content;background:transparent}
.wrap{position:absolute;inset:0;overflow:hidden}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.hud{pointer-events:none}`;

class FyelabsSystem extends HTMLElement {
  static get observedAttributes() { return ['view', 'progress', 'paused']; }
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>${CSS}</style><div class="wrap" role="img" aria-label="FYELABS actuating LiDAR sensor enclosure"><canvas class="gl"></canvas><canvas class="hud"></canvas></div>`;
    this._view = 'case'; this._progress = null; this._clock = 0; this._last = 0; this._visible = true; this._ready = false;
    this._reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  get view() { return this._view; } set view(v) { this.setAttribute('view', v); }
  get progress() { return this._progress; }
  set progress(v) { if (v === null || v === undefined || v === '') { this._progress = null; } else this._progress = clamp(+v || 0); this._kick(); }
  attributeChangedCallback(n, o, v) {
    if (n === 'view') { const nv = VIEWS.includes(v) ? v : 'case'; if (nv !== this._view) { this._view = nv; this._clock = 0; this.dispatchEvent(new CustomEvent('viewchange', { detail: { view: nv } })); } }
    if (n === 'progress') this.progress = v;
    this._kick();
  }
  connectedCallback() {
    if (this._renderer) return;
    if (this.hasAttribute('view')) this._view = VIEWS.includes(this.getAttribute('view')) ? this.getAttribute('view') : 'case';
    if (this.hasAttribute('progress')) this._progress = clamp(+this.getAttribute('progress') || 0);
    this._init();
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this);
    this._io = new IntersectionObserver(e => { this._visible = e[0].isIntersecting; this._last = 0; if (this._visible) this._kick(); }, { rootMargin: '120px' }); this._io.observe(this);
    this._onVis = () => { this._last = 0; this._kick(); }; document.addEventListener('visibilitychange', this._onVis);
    this._resize(); this._snapToView(); this._kick();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this._raf); this._raf = 0; this._ro?.disconnect(); this._io?.disconnect(); document.removeEventListener('visibilitychange', this._onVis);
    this._scene?.traverse(o => { o.geometry?.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); });
    this._env?.dispose(); this._renderer?.dispose(); this._renderer = null;
  }
  _kick() { if (!this._renderer || this._raf) return; this._raf = requestAnimationFrame(t => this._frame(t)); }

  _init() {
    const cv = this.shadowRoot.querySelector('.gl'); this._hud = this.shadowRoot.querySelector('.hud'); this._hc = this._hud.getContext('2d');
    const r = this._renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.debug.checkShaderErrors = false; r.setClearColor(0x000000, 0); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15; r.outputColorSpace = THREE.SRGBColorSpace;
    const sc = this._scene = new THREE.Scene(); this._env = studioEnv(r); sc.environment = this._env;
    this._cam = new THREE.PerspectiveCamera(32, 1, .05, 400);
    const key = new THREE.DirectionalLight(0xfff6ea, 2.2); key.position.set(4, 7, 6); sc.add(key);
    const rim = new THREE.DirectionalLight(0xdfe6ff, 1.1); rim.position.set(-6, 3, -4); sc.add(rim);
    sc.add(new THREE.HemisphereLight(0x9aa0aa, 0x050505, .35));
    const p1 = new THREE.PointLight(0xfff3e6, 70, 0, 2); p1.position.set(3.2, 4.2, 4.6); sc.add(p1);
    const p2 = new THREE.PointLight(0xe8eeff, 40, 0, 2); p2.position.set(-4.2, 2.2, 3.4); sc.add(p2);
    const p3 = new THREE.PointLight(0xffffff, 25, 0, 2); p3.position.set(.5, 5.5, -2.5); sc.add(p3); this._lights = [p1, p2, p3];
    const C = this._case = buildCase(); sc.add(C.root);
    // world for lidar/dust (units: 1 = 100 mm)
    const GY = this._GY = -4.5;
    const groundMat = new THREE.ShaderMaterial({ vertexShader: groundVS, fragmentShader: groundFS, transparent: true, depthWrite: false,
      uniforms: { uHit: { value: new Array(10).fill(0) }, uAlert: { value: new Array(10).fill(0) }, uAccent: { value: ACCENT }, uOp: { value: 0 }, uOz: { value: ARC_C / 100 } } });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.set(0, GY, 20); sc.add(ground); this._ground = ground;
    const worldMat = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: .85, metalness: 0, transparent: true, opacity: 0 });
    const wallMat = worldMat.clone();
    const post = new THREE.Group(); const pm = worldMat.clone(); pm.color.set(0x2b2c30);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.21, .25, 5.5, 18), pm); pole.position.y = GY + 2.8; post.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.8, .9, .25, 24), pm); base.position.y = GY + .125; post.add(base);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.222, .232, .5, 18), new THREE.MeshStandardMaterial({ color: 0xb9b6ae, roughness: .4, transparent: true, opacity: 0 })); band.position.y = GY + 4.7; post.add(band);
    post.position.set(5, 0, 8.5); sc.add(post); this._post = post;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(40, 6, .5), wallMat); wallMat.color.set(0x111214); wallMat.roughness = 1; wallMat.envMapIntensity = .15; wall.position.set(0, GY + 3, 16.25); sc.add(wall); this._wall = wall;
    const person = this._person = buildPerson(); person.scale.setScalar(.5); person.traverse(o => { if (o.material) { o.material.transparent = true; } }); sc.add(person);
    this._worldMats = [worldMat, wallMat, pm, band.material, person.children[0].material];
    // beams
    const nb = 10, bg = new THREE.BufferGeometry(), bpos = new Float32Array(nb * 6 * 3), bbt = new Float32Array(nb * 6 * 3);
    bg.setAttribute('position', new THREE.BufferAttribute(bpos, 3)); bg.setAttribute('bt', new THREE.BufferAttribute(bbt, 3));
    this._beams = new THREE.Mesh(bg, addGlow(new THREE.ShaderMaterial({ vertexShader: beamVS, fragmentShader: beamFS, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 }, uOp: { value: 0 } } }), true));
    this._beams.frustumCulled = false; sc.add(this._beams);
    // returns cloud
    const NP = this._NP = 2400, pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3)); pg.setAttribute('birth', new THREE.BufferAttribute(new Float32Array(NP).fill(-99), 1)); pg.setAttribute('kind', new THREE.BufferAttribute(new Float32Array(NP), 1));
    this._pts = new THREE.Points(pg, new THREE.ShaderMaterial({ vertexShader: ptsVS, fragmentShader: ptsFS, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uLife: { value: 3.6 }, uPx: { value: 1 }, uOp: { value: 0 }, uAccent: { value: ACCENT } } }));
    this._pts.frustumCulled = false; this._pts.renderOrder = 5; sc.add(this._pts); this._pi = 0;
    // dust
    const ND = this._ND = 1800, dg = new THREE.BufferGeometry(); this._dust = new Float32Array(ND * 3); this._dustV = new Float32Array(ND * 4);
    dg.setAttribute('position', new THREE.BufferAttribute(this._dust, 3));
    this._dustPts = new THREE.Points(dg, new THREE.PointsMaterial({ map: dotTexture(), color: 0x8d867c, size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false }));
    this._dustPts.frustumCulled = false; sc.add(this._dustPts);
    for (let i = 0; i < ND; i++) this._respawn(i, true);
    // sim state
    this._sim = { t: 0, acc: 0, hits: new Array(10).fill(RMAX), alerts: new Array(10).fill(0), raw: 0, rej: 0, hist: [], filter: false };
    this._st = { cover: 0, explode: 0, world: 0, beams: 0, dust: 0 };
    this._camPos = new THREE.Vector3(); this._camTgt = new THREE.Vector3();
    this._sensorWorld = SENSOR_ANGLES.map(a => new THREE.Vector3(Math.sin(a) * (ARC_R - 7 + 7) / 100, (WIN[0] + WIN[1]) / 200, (ARC_C + Math.cos(a) * (ARC_R)) / 100));
    if (this._reduced) { for (let i = 0; i < 90; i++) this._simStep(1 / 30, 'dust', 8 + i / 30); }
  }
  _respawn(i, init) { // dust kicked up near the ground on the left, carried right through the fan
    const D = this._dust, V = this._dustV, j = i * 3, k = i * 4;
    D[j] = -9 + Math.random() * 2.5; D[j + 1] = this._GY + Math.random() * 2.2; D[j + 2] = 3.0 + Math.random() * 4.8;
    V[k] = 1.5 + Math.random() * 1.3; V[k + 1] = .45 + Math.random() * .9; V[k + 2] = (Math.random() - .35) * .7; V[k + 3] = init ? Math.random() * 9 : 0;
    if (init) { const a = V[k + 3]; D[j] += V[k] * a * (1 - Math.min(.5, a * .04)); D[j + 1] += V[k + 1] * a * .8; D[j + 2] += V[k + 2] * a; }
  }
  _resize() {
    const w = Math.max(1, this.clientWidth), h = Math.max(1, this.clientHeight), d = Math.min(2, devicePixelRatio || 1);
    this._w = w; this._h = h; this._dpr = d; this._renderer.setPixelRatio(d); this._renderer.setSize(w, h, false);
    this._hud.width = Math.round(w * d); this._hud.height = Math.round(h * d); this._cam.aspect = w / h; this._cam.updateProjectionMatrix();
    this._pts.material.uniforms.uPx.value = h * d / 600; this._kick();
  }
  _time(view) { const T = DUR[view]; return this._progress !== null ? this._progress * T * .9999 : (this._clock % T); }

  /* desired states per view */
  _caseTimeline(t) {
    const cover = sm(1.4, 3.4, t) * (1 - sm(11.2, 13.0, t));
    const explode = sm(4.8, 6.8, t) * (1 - sm(9.4, 11.0, t));
    return { cover, explode };
  }
  _camFor(view, t) {
    const asp = this._w / this._h, wide = asp < 1.3 ? Math.pow(1.3 / asp, 1.1) : 1;
    if (view === 'case') {
      const ex = this._st.explode, az = (22 + 9 * Math.sin(t * .45)) * DEG, el = (17 + 6 * ex) * DEG;
      const tgt = new THREE.Vector3(0, .9 + ex * .9, .35), dist = (7.6 + ex * 4.2) * Math.max(1, wide * .85) * (asp > 2.1 ? 1.08 : 1);
      return { tgt, pos: new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(tgt) };
    }
    const orbit = (tgt, dir, dist) => new THREE.Vector3(...dir).normalize().multiplyScalar(dist * Math.max(1, wide * .92)).add(tgt);
    if (view === 'lidar') {
      // slow push between a close look at the window band and the full 180 degree fan
      const u = t / DUR.lidar, k = sm(.2, .48, u) * (1 - sm(.84, 1, u));
      const close = { tgt: new THREE.Vector3(.2, .05, 1.5), pos: new THREE.Vector3(4.2, 2.3, 6.3) };
      const far = { tgt: new THREE.Vector3(.3, -3.6, 9.2) }; far.pos = orbit(far.tgt, [-.2, .86, -.5], 44);
      const e = k * k * (3 - 2 * k);
      return { tgt: close.tgt.clone().lerp(far.tgt, e), pos: close.pos.clone().lerp(far.pos, e) };
    }
    const tgt = new THREE.Vector3(-.4, -3.4, 8);
    return { tgt, pos: orbit(tgt, [-.3, .8, -.52], 39) };
  }
  _snapToView() { const t = this._time(this._view), c = this._camFor(this._view, t); this._camPos.copy(c.pos); this._camTgt.copy(c.tgt);
    const tg = this._targets(this._view, t); Object.assign(this._st, tg); }
  _targets(view, t) {
    if (view === 'case') { const c = this._caseTimeline(t); return { cover: c.cover, explode: c.explode, world: 0, beams: 0, dust: 0 }; }
    return { cover: 1, explode: 0, world: 1, beams: 1, dust: view === 'dust' ? 1 : 0 };
  }

  /* simulation of ranging, dust and filtering */
  _personAt(view, t) {
    if (view === 'dust') { return { x: -2 + Math.sin(t * .5) * .15, z: 11, face: Math.PI * .92, walk: Math.sin(t * .9) * .25, crouch: 0, idle: true }; }
    const T = DUR.lidar, ph = t / T * Math.PI * 2, x = 9.5 * Math.sin(ph), z = 9 + 3 * Math.cos(ph);
    const dx = 9.5 * Math.cos(ph), dz = -3 * Math.sin(ph);
    return { x, z, face: Math.atan2(dx, dz), walk: ph * 7, crouch: 0 };
  }
  _simStep(dt, view, t) {
    const S = this._sim; S.t += dt; const filt = view === 'dust' ? (t % DUR.dust) >= DUR.dust / 2 : true; S.filter = filt;
    // dust particles
    const D = this._dust, V = this._dustV, act = view === 'dust';
    for (let i = 0; i < this._ND; i++) {
      const j = i * 3, k = i * 4; V[k + 3] += dt; const age = V[k + 3];
      D[j] += V[k] * dt * (1 - Math.min(.5, age * .04)); D[j + 1] += V[k + 1] * dt * Math.max(0, 1 - age * .13) + Math.sin(age * 1.3 + i) * .004; D[j + 2] += V[k + 2] * dt + Math.sin(age * .7 + i * 1.7) * .006;
      if (D[j] > 12 || age > 9) this._respawn(i, false);
    }
    // spatial hash of dust near beam plane
    let grid = null;
    if (act) { grid = new Map(); for (let i = 0; i < this._ND; i++) { const j = i * 3; if (Math.abs(D[j + 1] - .27) > .8) continue; const key = Math.floor(D[j] / .6) + ',' + Math.floor(D[j + 2] / .6); grid.set(key, (grid.get(key) || 0) + 1); } }
    const P = this._personAt(view, t), pr = P.crouch > 0 ? 1.0 : .85;
    const g = this._pts.geometry, pos = g.attributes.position.array, birth = g.attributes.birth.array, kind = g.attributes.kind.array;
    let raw = 0, rej = 0;
    for (let b = 0; b < 10; b++) {
      const a = SENSOR_ANGLES[b], o = this._sensorWorld[b], dx = Math.sin(a), dz = Math.cos(a);
      let hit = RMAX, solid = false, flux = 0;
      // person (circle in plan)
      const px = P.x - o.x, pz = P.z - o.z, tc = px * dx + pz * dz; if (tc > 0) { const d2 = px * px + pz * pz - tc * tc; if (d2 < pr * pr) { const th = tc - Math.sqrt(pr * pr - d2); if (th < hit) { hit = th; solid = true; flux = .9; } } }
      // post
      const qx = this._post.position.x - o.x, qz = this._post.position.z - o.z, tq = qx * dx + qz * dz; if (tq > 0) { const d2 = qx * qx + qz * qz - tq * tq; if (d2 < .25 * .25) { const th = tq - Math.sqrt(.0625 - d2); if (th < hit) { hit = th; solid = true; flux = .75; } } }
      // wall
      if (dz > .05) { const tw = (16 - o.z) / dz; if (tw < hit) { hit = tw; solid = true; flux = .45; } }
      let dustHit = 0;
      if (act) { let tau = 0; for (let s = .8; s < hit; s += .3) { const x = o.x + dx * s, z = o.z + dz * s, n = grid.get(Math.floor(x / .6) + ',' + Math.floor(z / .6)) || 0; tau += n * .05; if (tau > 1 && Math.random() < .55) { dustHit = s + (Math.random() - .5) * .25; break; } } }
      const jit = (Math.random() - .5) * .07;
      const write = (d, kd) => { const i = this._pi = (this._pi + 1) % this._NP; pos[i * 3] = o.x + dx * d; pos[i * 3 + 1] = o.y + (Math.random() - .5) * .06; pos[i * 3 + 2] = o.z + dz * d; birth[i] = S.t; kind[i] = kd; };
      let shown = hit, alert = solid && hit < 12;
      if (dustHit) { raw++; if (filt) { rej++; write(dustHit, 2); } else { write(dustHit, 1); shown = dustHit; alert = true; } }
      if (solid && hit < RMAX - .5 && (!dustHit || filt)) write(hit + jit, 0);
      S.hits[b] = lerp(S.hits[b], shown, .6); S.alerts[b] = lerp(S.alerts[b], alert ? 1 : 0, .35);
      if (b === 4) { S.hist.push({ d: shown, f: dustHit && !filt ? .12 + Math.random() * .1 : flux * (1 - shown / 30) + Math.random() * .03, dust: !!dustHit }); if (S.hist.length > 180) S.hist.shift(); }
    }
    S.raw = lerp(S.raw, raw, .2); S.rej = lerp(S.rej, rej, .2);
    g.attributes.position.needsUpdate = g.attributes.birth.needsUpdate = g.attributes.kind.needsUpdate = true;
    this._dustPts.geometry.attributes.position.needsUpdate = true;
  }

  _frame(now) {
    this._raf = 0; if (!this._renderer) return;
    const dt = this._last ? Math.min(.05, (now - this._last) / 1000) : 0; this._last = now;
    const running = !this._reduced && !this.hasAttribute('paused');
    if (running) this._clock += dt;
    if (this._reduced && this._progress === null) this._clock = { case: 4.2, lidar: 5.5, dust: 10 }[this._view];
    const v = this._view, t = this._time(v);
    // states
    const tg = this._targets(v, t), st = this._st, rate = this._progress !== null ? 14 : 3.2, f = dt ? 1 - Math.exp(-rate * dt) : 1;
    for (const k in tg) { const fast = v === 'case' && (k === 'cover' || k === 'explode') ? 1 - Math.exp(-14 * dt) : f; st[k] = dt ? lerp(st[k], tg[k], fast) : tg[k]; }
    this._applyCase(t);
    // world
    const w = st.world; this._ground.material.uniforms.uOp.value = w; this._worldMats.forEach(m => { m.opacity = w; m.visible = w > .01; });
    this._ground.visible = this._person.visible = this._post.visible = this._wall.visible = w > .01;
    const P = this._personAt(v === 'case' ? 'lidar' : v, t); this._person.position.x = P.x; this._person.position.z = P.z; this._person.rotation.y = P.face; this._person.userData.pose(P.walk, P.idle ? .25 : 1, P.crouch); this._person.position.y += this._GY;
    // sim
    if (w > .01) {
      const S = this._sim; if (running || !this._simInit) { S.acc += running ? dt : 1 / 30; this._simInit = true; while (S.acc >= 1 / 30) { S.acc -= 1 / 30; this._simStep(1 / 30, v, t); } }
      const U = this._ground.material.uniforms; for (let i = 0; i < 10; i++) { U.uHit.value[i] = this._sim.hits[i]; U.uAlert.value[i] = this._sim.alerts[i] * w; }
    }
    this._updateBeams(st.beams);
    this._pts.material.uniforms.uTime.value = this._sim.t; this._pts.material.uniforms.uOp.value = st.beams; this._pts.visible = st.beams > .01;
    this._dustPts.material.opacity = .13 * st.dust; this._dustPts.visible = st.dust > .01;
    // camera
    const c = this._camFor(v, t), cf = dt ? 1 - Math.exp(-2.6 * dt) : 1; this._camPos.lerp(c.pos, cf); this._camTgt.lerp(c.tgt, cf);
    this._cam.position.copy(this._camPos); this._cam.lookAt(this._camTgt);
    this._renderer.render(this._scene, this._cam);
    this._drawHud(v, t);
    if (!this._ready) { this._ready = true; this.dispatchEvent(new Event('ready')); }
    if (this._visible && !document.hidden && (running || dt === 0 || Math.abs(this._camPos.distanceTo(c.pos)) > .01)) this._kick();
  }
  _applyCase(t) {
    const { parts } = this._case, st = this._st, ex = st.explode, e = ex * ex * (3 - 2 * ex);
    parts.cover.position.set(0, lerp(COVER_LOW, COVER_HIGH, st.cover) + e * 175, e * 12);
    parts.top.position.y = e * 92; parts.bottom.position.y = -e * 78; parts.back.position.z = -e * 85; parts.array.position.y = -e * 40;
    parts.sensors.forEach((s, i) => { const d = e * 14; s.position.set(s.userData.base.x + Math.sin(s.userData.a) * d, s.userData.base.y, s.userData.base.z + Math.cos(s.userData.a) * d); const em = s.userData.em; em.material.opacity = (st.beams * .9 + (1 - st.beams) * st.cover * (1 - e) * .5) * (.55 + .45 * Math.sin(this._clock * 6 + i * .7)); });
    parts.led.material.opacity = .55 * st.cover * (1 - e);
  }
  _updateBeams(op) {
    this._beams.visible = op > .01; this._beams.material.uniforms.uOp.value = op; this._beams.material.uniforms.uTime.value = this._sim.t;
    if (!this._beams.visible) return;
    const g = this._beams.geometry, P = g.attributes.position.array, B = g.attributes.bt.array, half = 1.0 * DEG;
    for (let b = 0; b < 10; b++) {
      const a = SENSOR_ANGLES[b], o = this._sensorWorld[b], L = Math.min(this._sim.hits[b], RMAX), w = Math.tan(half) * L + .03;
      const dx = Math.sin(a), dz = Math.cos(a), nx = dz, nz = -dx, ex = o.x + dx * L, ez = o.z + dz * L;
      const v = [[o.x + nx * .05, o.z + nz * .05, 0, -1], [o.x - nx * .05, o.z - nz * .05, 0, 1], [ex + nx * w, ez + nz * w, 1, -1], [ex - nx * w, ez - nz * w, 1, 1]];
      const tri = [0, 1, 2, 2, 1, 3];
      tri.forEach((vi, k) => { const q = (b * 6 + k) * 3; P[q] = v[vi][0]; P[q + 1] = o.y; P[q + 2] = v[vi][1]; B[q] = v[vi][2]; B[q + 1] = L; B[q + 2] = v[vi][3]; });
    }
    g.attributes.position.needsUpdate = g.attributes.bt.needsUpdate = true;
  }
  _drawHud(v, t) {
    const c = this._hc, d = this._dpr, W = this._w, H = this._h; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    const fs = W < 520 ? 9 : 10.5, pad = W < 520 ? 14 : 22; c.font = `${fs}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`; c.textBaseline = 'alphabetic';
    const dim = 'rgba(242,239,233,.42)', mid = 'rgba(242,239,233,.68)', hi = 'rgba(242,239,233,.92)', ac = '#d0745c';
    const txt = (s, x, y, col = dim, al = 'left') => { c.fillStyle = col; c.textAlign = al; c.fillText(s, x, y); };
    const st = this._st, lh = fs * 1.65;
    if (v === 'case') {
      const mm = lerp(0, COVER_HIGH - COVER_LOW, st.cover), state = st.explode > .5 ? 'EXPLODED' : st.cover > .95 ? 'OPEN · SENSING' : st.cover < .05 ? 'SEALED' : (this._caseDir(t) > 0 ? 'COVER RAISING' : 'COVER LOWERING');
      txt('PROTECTIVE COVER', pad, H - pad - lh * 2); txt(`${mm.toFixed(1).padStart(4, ' ')} mm`, pad, H - pad - lh, hi); txt(state, pad, H - pad, st.explode > .5 ? mid : (st.cover > .95 ? ac : mid));
      // travel gauge
      const gx = pad + fs * 11, gy0 = H - pad - lh * 2.6, gy1 = H - pad - 2; c.strokeStyle = 'rgba(242,239,233,.16)'; c.lineWidth = 1; c.beginPath(); c.moveTo(gx, gy0); c.lineTo(gx, gy1); c.stroke();
      const gy = lerp(gy1, gy0, st.cover); c.fillStyle = hi; c.fillRect(gx - 3, gy - 1, 6, 2);
      txt('BLACK POWDER-COAT · SHEET METAL', W - pad, H - pad, dim, 'right');
      return;
    }
    const S = this._sim;
    // readouts column
    const x0 = W - pad, y0 = pad + fs;
    txt('RANGE  m', x0, y0, dim, 'right');
    for (let i = 0; i < 10; i++) { const b = 9 - i, dm = S.hits[b] / WS, al = S.alerts[b] > .5; txt(`L${String(b + 1).padStart(2, '0')}  ${dm > RMAX / WS - .1 ? ' -- ' : dm.toFixed(2)}`, x0, y0 + lh * (i + 1.2), al ? ac : mid, 'right'); }
    txt('10 × 1-D LIDAR · 180° ARC', pad, pad + fs, mid);
    if (v === 'lidar') { txt('NO MOVING PARTS', pad, pad + fs + lh, dim); return; }
    const filt = S.filter;
    // strip chart beam 5: distance + flux
    const cw = Math.min(260, W * .38), ch = Math.min(70, H * .15), cx = pad, cy = H - pad - ch;
    c.strokeStyle = 'rgba(242,239,233,.12)'; c.lineWidth = 1; c.strokeRect(cx + .5, cy + .5, cw, ch);
    txt('L05  DISTANCE', cx, cy - 6, mid); txt('FLUX', cx + cw, cy - 6, dim, 'right');
    const hs = S.hist; if (hs.length > 2) {
      const draw = (fn, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); hs.forEach((p, i) => { const x = cx + cw * i / 179, y = cy + ch - 4 - (ch - 8) * fn(p); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); };
      draw(p => clamp(p.f * 1.1), 'rgba(242,239,233,.32)', 1); draw(p => clamp(p.d / RMAX), hi, 1.2);
    }
  }
  _caseDir(t) { return t < 7 ? 1 : -1; }
}
if (!customElements.get('as-fyelabs-system')) customElements.define('as-fyelabs-system', FyelabsSystem);
export { FyelabsSystem };

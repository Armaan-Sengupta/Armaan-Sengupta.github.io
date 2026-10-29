// Airbrake cam-slot geometry shared by <as-airbrakes> (3D) and <as-flight-control> (2D top view).
// Units: inches, plan view, x right / y up, angles CCW. Panel i travels along angle ALPHA[i].
// Source: the "Custom CAM slot" Desmos study in the 2024 Launch Canada presentation
// (pin starts at r = 1 in, extension a = 0.78 in per 90 deg of servo rotation, Archimedean slot),
// the "Spinning Plate" CAD (trilobed cam, hex bore) and the final-design renders/photos
// (sector panels on linear rails, pocketed bulkhead, shoulder-bolt + bearing followers).

export const TAU = Math.PI * 2;
export const PIN_R0 = 1.0;                 // follower radius when retracted (in)
export const LEAD = 0.78;                  // radial travel per 90 deg of cam rotation (in)
export const SLOT_SPAN = (120 * Math.PI) / 180; // angular length of each slot
export const MAX_ROT = (112 * Math.PI) / 180;   // full deployment (cam rotation)
export const MAX_TRAVEL = LEAD * MAX_ROT / (Math.PI / 2); // ≈ 0.97 in
export const SLOT_W = 0.32;                // slot width (bearing OD + clearance)
export const HEX_R = 0.25;                 // hex bore circumradius
export const AIRFRAME_R = 3.25;            // panel rim radius when retracted = airframe OD
export const BASE_R = 3.08;                // bulkhead radius
export const PANEL_HALF = (32 * Math.PI) / 180; // half-angle of a panel's rim arc
export const ALPHA = [0, TAU / 3, (2 * TAU) / 3];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** extension fraction 0..1 → cam rotation (rad), radial travel (in), follower radius (in) */
export function kinematics(f) {
  f = clamp(Number(f) || 0);
  const rot = f * MAX_ROT;
  const travel = LEAD * rot / (Math.PI / 2);
  return { fraction: f, rot, travel, pinR: PIN_R0 + travel };
}

/** slot centre-line point in the cam frame for slot i at slot parameter t (rad, 0..SLOT_SPAN) */
export function slotPoint(i, t) {
  const r = PIN_R0 + LEAD * t / (Math.PI / 2), a = ALPHA[i] - t;
  return [r * Math.cos(a), r * Math.sin(a)];
}

/** closed polygon outlining slot i in the cam frame (rounded ends) */
export function slotPolygon(i, n = 72, w = SLOT_W) {
  const L = [], R = [], h = w / 2;
  const pts = [];
  for (let j = 0; j <= n; j++) {
    const t = SLOT_SPAN * j / n, p = slotPoint(i, t);
    const e = 1e-4, q = slotPoint(i, t + e), p0 = slotPoint(i, t - e);
    let dx = q[0] - p0[0], dy = q[1] - p0[1]; const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    const nx = -dy, ny = dx;
    L.push([p[0] + nx * h, p[1] + ny * h]); R.push([p[0] - nx * h, p[1] - ny * h]);
    pts.push({ p, nx, ny });
  }
  const out = [...L];
  const end = pts[n], a0 = Math.atan2(end.ny, end.nx);
  for (let j = 1; j < 16; j++) { const a = a0 - Math.PI * j / 16; out.push([end.p[0] + Math.cos(a) * h, end.p[1] + Math.sin(a) * h]); }
  out.push(...R.reverse());
  const st = pts[0], b0 = Math.atan2(-st.ny, -st.nx);
  for (let j = 1; j < 16; j++) { const a = b0 - Math.PI * j / 16; out.push([st.p[0] + Math.cos(a) * h, st.p[1] + Math.sin(a) * h]); }
  return out;
}

/** trilobed cam outline: envelope of the three slots plus a margin, low-pass filtered (3-fold symmetric) */
let _cam = null;
export function camOutline(n = 360) {
  if (_cam && _cam.length === n) return _cam;
  const M = 720, req = new Float64Array(M), margin = SLOT_W / 2 + 0.26, base = 1.78;
  const discs = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j <= 60; j++) { const p = slotPoint(i, SLOT_SPAN * j / 60); discs.push([Math.hypot(p[0], p[1]), Math.atan2(p[1], p[0])]); }
  for (let k = 0; k < M; k++) {
    const psi = TAU * k / M; let r = base;
    for (const [rho, g] of discs) {
      const s = Math.sin(psi - g) * rho, c = Math.cos(psi - g) * rho, disc = margin * margin - s * s;
      if (disc >= 0) r = Math.max(r, c + Math.sqrt(disc));
    }
    req[k] = r;
  }
  // keep harmonics 0,3,6 → smooth organic lobes like the CAD
  const H = [0, 3, 6], A = [], B = [];
  for (const h of H) { let a = 0, b = 0; for (let k = 0; k < M; k++) { const p = TAU * k / M; a += req[k] * Math.cos(h * p); b += req[k] * Math.sin(h * p); } A.push(a * (h ? 2 : 1) / M); B.push(b * 2 / M); }
  const f = p => H.reduce((s, h, j) => s + A[j] * Math.cos(h * p) + (h ? B[j] * Math.sin(h * p) : 0), 0);
  let bias = 0; for (let k = 0; k < M; k++) bias = Math.max(bias, req[k] - f(TAU * k / M));
  _cam = [];
  for (let k = 0; k < n; k++) { const p = TAU * k / n, r = f(p) + bias * 0.7; _cam.push([r * Math.cos(p), r * Math.sin(p)]); }
  return _cam;
}

/** hexagonal bore (cam frame) */
export function hexPolygon(r = HEX_R) { const o = []; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; o.push([r * Math.cos(a), r * Math.sin(a)]); } return o; }

/** one brake panel in its own frame (travel along +x), retracted. Rim arc on the airframe radius,
 *  sides parallel to travel through the airframe slot, inner sides parallel to the 60 deg bisectors
 *  so neighbouring panels separate as they all move outward. */
export function panelPolygon(n = 40) {
  const R = AIRFRAME_R, b = PANEL_HALF, yw = R * Math.sin(b), t60 = Math.tan(Math.PI / 3), off = 0.1, x0 = 0.62;
  const x1 = (yw + off) / t60, y0 = x0 * t60 - off;
  const out = [];
  for (let j = 0; j <= n; j++) { const a = -b + 2 * b * j / n; out.push([R * Math.cos(a), R * Math.sin(a)]); }
  out.push([x1, yw], [x0, y0], [x0, -y0], [x1, -yw]);
  return out;
}

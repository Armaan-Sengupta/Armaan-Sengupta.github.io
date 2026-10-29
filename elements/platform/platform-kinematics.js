// Exact port of the 3YDP platform kinematics (StewartPlatform/Code/SPV4.py, class StewartPlatform),
// constructed exactly as controller.py / viz_spv4.py do: StewartPlatform(l=25.9, l_base=10, l_link1=8, l_link2=10)
// and inverse_kinematics(normal, [0, 0, platform_height=10.6]). Source units are cm and degrees; the SPV4 frame is
// Z-up with chain 1 at +Y (90 deg), chain 2 at 210 deg, chain 3 at 330 deg. Nothing here is re-derived: the
// platform-point basis (v = n x i, u = v x n), the per-chain closed-form angle solutions (the 90 deg special case and
// the radial formula for the other chains) and the link-direction conventions of _forward_chain*/_plot_chain are the
// Python formulas line for line. Results are returned in metres for the renderer.
const DEG = Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => mul(a, 1 / norm(a));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// controller.py main script: StewartPlatform(l=25.9, l_base=10, l_link1=8, l_link2=10), platform_height=10.6, max_tilt=14
export const SPV4 = Object.freeze({ l: 25.9, l_base: 10, l_link1: 8, l_link2: 10, platform_height: 10.6, max_tilt: 14 });
export const CM = 0.01;

// StewartPlatform._calculate_platform_points (cm)
export function calculatePlatformPoints(normal, S, g = SPV4) {
  const nrm = unit(normal);
  const v_hat = unit(cross(nrm, [1, 0, 0]));
  const a = g.l / (2 * Math.cos(30 * DEG));
  const u_hat = unit(cross(v_hat, nrm));
  const x1 = add(S, mul(v_hat, a));
  const x2 = add(add(S, mul(v_hat, -a * Math.sin(30 * DEG))), mul(u_hat, a * Math.cos(30 * DEG)));
  const x3 = add(add(S, mul(v_hat, -a * Math.sin(30 * DEG))), mul(u_hat, -a * Math.cos(30 * DEG)));
  return { x1, x2, x3, u_hat, v_hat, nrm, a };
}

// StewartPlatform._calc_angles_at_base (cm in, degrees out). The Python raises on |arg|>1; here the argument is
// clamped and `reachable` reports it so a render frame never throws.
export function calcAnglesAtBase(target, baseAngleDeg, g = SPV4) {
  const l1 = g.l_link1, l2 = g.l_link2, lb = g.l_base;
  let reachable = true, t1;
  const guard = (x) => { if (Math.abs(x) > 1) reachable = false; return clamp(x, -1, 1); };
  if (Math.abs(baseAngleDeg - 90) < 1) {
    const AA = l2 ** 2 - (lb - target[1]) ** 2 - l1 ** 2 - target[2] ** 2;
    const bb = 2 * (lb - target[1]) * l1, cc = 2 * target[2] * l1, denom = Math.sqrt(bb ** 2 + cc ** 2);
    t1 = Math.acos(guard(AA / denom)) - Math.acos(guard(bb / denom));
  } else {
    const y_tmp = Math.sqrt(target[0] ** 2 + target[1] ** 2), z_tmp = target[2];
    const AA = -(l2 ** 2 - (lb - y_tmp) ** 2 - l1 ** 2 - z_tmp ** 2);
    const bb = 2 * (lb - y_tmp) * l1, cc = 2 * z_tmp * l1, denom = Math.sqrt(bb ** 2 + cc ** 2);
    t1 = Math.asin(guard(AA / denom)) + Math.asin(guard(bb / denom));
  }
  const t2 = Math.asin(guard((target[2] - l1 * Math.sin(t1)) / l2));
  return { theta1: t1 / DEG, theta2: t2 / DEG, reachable };
}

// StewartPlatform.inverse_kinematics: chain 1 -> x1 at 90, chain 2 -> x3 at 210, chain 3 -> x2 at 330.
export function inverseKinematics(normal, center = [0, 0, SPV4.platform_height], g = SPV4) {
  const P = calculatePlatformPoints(normal, center, g);
  const c1 = calcAnglesAtBase(P.x1, 90, g), c2 = calcAnglesAtBase(P.x3, 210, g), c3 = calcAnglesAtBase(P.x2, 330, g);
  return { ...P, theta_11: c1.theta1, theta_12: c1.theta2, theta_21: c2.theta1, theta_22: c2.theta2, theta_31: c3.theta1, theta_32: c3.theta2, reachable: c1.reachable && c2.reachable && c3.reachable };
}

// controller.py step 5: normal from the PID pitch/roll corrections (degrees).
export function normalFromPitchRoll(pitchDeg, rollDeg) {
  const p = pitchDeg * DEG, r = rollDeg * DEG;
  return [Math.sin(r), Math.sin(p), Math.cos(p) * Math.cos(r)];
}

// Full chain geometry for rendering, in metres (SPV4 frame). Joint = servo-horn end of link 1, exactly as
// _forward_chain2/3 and _plot_chain place it: base + radial*l1*cos(theta1) + z*l1*sin(theta1). Link 2 runs from that
// elbow to the platform point. Its length is l2 to within 0.03 mm over the whole +-14 deg workspace (the Python IK
// solves chains 2/3 in the radial plane of the target); the renderer keeps both links rigid at their CAD lengths.
export function solvePlatform(pitchDeg = 0, rollDeg = 0, g = SPV4) {
  const ik = inverseKinematics(normalFromPitchRoll(pitchDeg, rollDeg), [0, 0, g.platform_height], g);
  const spec = [[90, ik.x1, ik.theta_11, ik.theta_12], [210, ik.x3, ik.theta_21, ik.theta_22], [330, ik.x2, ik.theta_31, ik.theta_32]];
  const chains = spec.map(([baseDeg, x, t1, t2]) => {
    const b = baseDeg * DEG, radial = [Math.cos(b), Math.sin(b), 0], tangent = [-Math.sin(b), Math.cos(b), 0];
    const base = mul(radial, g.l_base);
    const elbow = add(add(base, mul(radial, g.l_link1 * Math.cos(t1 * DEG))), [0, 0, g.l_link1 * Math.sin(t1 * DEG)]);
    return { baseDeg, radial, tangent, theta1: t1, theta2: t2, base: mul(base, CM), elbow: mul(elbow, CM), target: mul(x, CM), link2Error: Math.abs(norm(sub(x, elbow)) - g.l_link2) * CM };
  });
  return { normal: ik.nrm, u: ik.u_hat, v: ik.v_hat, center: [0, 0, g.platform_height * CM], radius: ik.a * CM, chains, reachable: ik.reachable, pitch: pitchDeg, roll: rollDeg };
}

// SPV4 (Z-up) -> three.js (Y-up). Chain 1 (+Y) maps to world -Z.
export const toWorld = (p) => [p[0], p[2], -p[1]];

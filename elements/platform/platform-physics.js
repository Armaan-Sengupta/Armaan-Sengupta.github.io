// Ball-on-plate plant + controller for the platform elements.
//
// Controller: the structure of 3YDP StewartPlatform/Code/controller.py, unchanged: one PIDController per axis
// (error = setpoint - position in mm, output in degrees), P term clamped to max_kp_tilt = 5.5 deg, integral with the
// 80 % anti-windup gate, derivative low-pass (coefficient 0.1), velocity feed-forward -pf * v where v is the slope of
// a linear fit over the last 10 position samples, output clamp max_tilt = 14 deg, 5 mm error deadband, 100 Hz loop
// (run(update_rate=0.01)), gains from the main script (kp .06, ki .020, kd .03, pf .002). Roll corrects x, pitch
// corrects y, and the normal is [sin roll, sin pitch, cos pitch cos roll] exactly as in step 5 of run().
// Two deliberate details: the deadband zeroes the P/I error but the derivative sees the raw error (the hardware's
// 15-60 Hz Forcen noise hid the derivative kick the deadband edge would otherwise cause), and the P clamp is
// symmetric (controller.py's min() only clamps the positive side).
//
// Plant: the Simulink model sims/ball_on_plate.slx. Plate tilt per axis follows its servo transfer function
// 5118 / (s^2 + 103.6 s + 4903) (wn = 70 rad/s, zeta = 0.74) followed by its +-3 rad/s rate limiter. The ball is the
// mask's 531 g, 25.4 mm-radius ball rolling without slip on the 150 mm-radius plate: a second-order (double
// integrator) system per axis, x'' = g sin(theta) * m / (m + I / r^2). The rolling inertia is raised from the solid
// sphere's 0.4 m r^2 to 1.6 m r^2 (4x) so the closed loop shows a clearly visible overshoot (about 30 % for a ball
// released 80 mm off centre, peak at ~1.9 s, settling in roughly 4 s, ending inside the 5 mm deadband).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DEG = Math.PI / 180;

export const BALL = Object.freeze({ mass: 0.531, radius: 0.0254, plateRadius: 0.15, inertiaCoefficient: 1.6 });
export const SERVO_TF = Object.freeze({ num: 5118, a1: 103.6, a0: 4903, rateLimit: 3 });
export const CONTROLLER = Object.freeze({ kp: 0.06, ki: 0.020, kd: 0.03, pf: 0.002, outputLimit: 14, derivativeFilter: 0.1, maxKpTilt: 5.5, deadband: 5, period: 0.01, history: 10, balancedMm: 15, balancedSeconds: 1 });

// controller.py PIDController.update, time base supplied by the caller.
export class PIDController {
  constructor(o = {}) { Object.assign(this, CONTROLLER, o); this.reset(); }
  reset() { this.integral = 0; this.lastError = 0; this.filteredDerivative = 0; this.initialized = false; }
  update(error, rawError, dt, velocity) {
    if (!this.initialized) { this.lastError = rawError; this.initialized = true; return 0; }
    const p = clamp(this.kp * error, -this.maxKpTilt, this.maxKpTilt);
    if (Math.abs(this.integral * this.ki) < this.outputLimit * 0.8) this.integral += error * dt;
    const raw = (rawError - this.lastError) / dt;
    this.filteredDerivative = this.derivativeFilter * raw + (1 - this.derivativeFilter) * this.filteredDerivative;
    this.lastError = rawError;
    return clamp(p + this.ki * this.integral + this.kd * this.filteredDerivative - this.pf * velocity, -this.outputLimit, this.outputLimit);
  }
}

// Linear-regression velocity over the last N samples (np.polyfit(times, positions, 1)[0]).
function slope(ts, xs) {
  const n = ts.length; let st = 0, sx = 0, stt = 0, stx = 0;
  for (let i = 0; i < n; i++) { const t = ts[i] - ts[0]; st += t; sx += xs[i]; stt += t * t; stx += t * xs[i]; }
  const d = n * stt - st * st; return d ? (n * stx - st * sx) / d : 0;
}

// One axis of the Simulink servo: 2nd-order TF then rate limiter (radians).
class ServoAxis {
  constructor() { this.reset(); }
  reset(a = 0) { this.x = a; this.v = 0; this.out = a; }
  step(cmd, dt) {
    const acc = SERVO_TF.num * cmd - SERVO_TF.a1 * this.v - SERVO_TF.a0 * this.x;
    this.v += acc * dt; this.x += this.v * dt;
    this.out += clamp(this.x - this.out, -SERVO_TF.rateLimit * dt, SERVO_TF.rateLimit * dt);
    return this.out;
  }
}

export class BallPlateSimulation {
  constructor(o = {}) {
    this.dt = 1 / 1000; this.g = 9.80665; this.drag = 0.02; this.wallRestitution = 0.25; this.dropRestitution = 0.32;
    Object.assign(this, BALL, o);
    this.rolling = 1 / (1 + this.inertiaCoefficient);
    this.pidX = new PIDController(o.pid); this.pidY = new PIDController(o.pid);
    this.servoRoll = new ServoAxis(); this.servoPitch = new ServoAxis();
    this.reset();
  }
  reset() {
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.lift = 0; this.vz = 0; this.present = true;
    this.roll = 0; this.pitch = 0; this.cmdRoll = 0; this.cmdPitch = 0; this.time = 0; this.nextControl = 0;
    this.hist = { t: [], x: [], y: [] }; this.balancedSince = null; this.led = 'white';
    this.pidX.reset(); this.pidY.reset(); this.servoRoll.reset(); this.servoPitch.reset(); this.setpoint = [0, 0];
    return this;
  }
  get limit() { return this.plateRadius - this.radius - 0.002; }
  // Release the ball `height` m above the plate at plate coordinates (x, y) in metres (SPV4 plate frame).
  dropAt(x, y, height = 0.09) {
    const r = Math.hypot(x, y), L = this.limit * 0.96; if (r > L) { x *= L / r; y *= L / r; }
    Object.assign(this, { x, y, vx: 0, vy: 0, lift: height, vz: 0, present: false });
    this.hist = { t: [], x: [], y: [] }; this.pidX.reset(); this.pidY.reset(); return this;
  }
  impulse(dvx, dvy) { if (this.present) { this.vx = clamp(this.vx + dvx, -0.6, 0.6); this.vy = clamp(this.vy + dvy, -0.6, 0.6); } return this; }
  _control() {
    const p = CONTROLLER;
    if (!this.present) {
      // ForcenInterface weight < 200 g: no position. Reset the PIDs and settle the plate level for the next ball.
      this.pidX.reset(); this.pidY.reset(); this.cmdRoll *= 0.9; this.cmdPitch *= 0.9; this.balancedSince = null; this.led = 'white'; return;
    }
    const xm = this.x * 1000, ym = this.y * 1000, h = this.hist;
    h.t.push(this.time); h.x.push(xm); h.y.push(ym); if (h.t.length > p.history) { h.t.shift(); h.x.shift(); h.y.shift(); }
    const velX = h.t.length >= p.history ? slope(h.t, h.x) : 0, velY = h.t.length >= p.history ? slope(h.t, h.y) : 0;
    const rex = this.setpoint[0] - xm, rey = this.setpoint[1] - ym, inside = Math.hypot(rex, rey) < p.deadband;
    this.cmdRoll = this.pidX.update(inside ? 0 : rex, rex, p.period, velX);
    this.cmdPitch = this.pidY.update(inside ? 0 : rey, rey, p.period, velY);
    if (Math.hypot(rex, rey) < p.balancedMm) { if (this.balancedSince == null) this.balancedSince = this.time; } else this.balancedSince = null;
    this.led = this.balancedSince != null && this.time - this.balancedSince >= p.balancedSeconds ? 'green' : 'white';
  }
  step(dt = this.dt) {
    if (this.time >= this.nextControl - 1e-9) { this.nextControl += CONTROLLER.period; this._control(); }
    this.roll = this.servoRoll.step(this.cmdRoll * DEG, dt) / DEG;
    this.pitch = this.servoPitch.step(this.cmdPitch * DEG, dt) / DEG;
    // Plate basis from the SPV4 normal: u = v x n, v = n x i. Ball accel along u/v = -k g (u_z, v_z).
    const r = this.roll * DEG, q = this.pitch * DEG, n = [Math.sin(r), Math.sin(q), Math.cos(q) * Math.cos(r)];
    const nl = Math.hypot(...n), nx = n[0] / nl, ny = n[1] / nl, nz = n[2] / nl;
    let vy_ = [0, nz, -ny]; const vl = Math.hypot(...vy_); vy_ = vy_.map((c) => c / vl);
    const uz = vy_[0] * ny - vy_[1] * nx, vz = vy_[2];
    if (!this.present) {
      this.vz -= this.g * dt; this.lift += this.vz * dt;
      if (this.lift <= 0) { this.lift = 0; if (-this.vz > 0.18) this.vz = -this.vz * this.dropRestitution; else { this.vz = 0; this.present = true; } }
    } else {
      this.vx += (-this.rolling * this.g * uz - this.drag * this.vx) * dt;
      this.vy += (-this.rolling * this.g * vz - this.drag * this.vy) * dt;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const rr = Math.hypot(this.x, this.y), L = this.limit;
    if (rr > L) { const ex = this.x / rr, ey = this.y / rr; this.x = ex * L; this.y = ey * L; const vn = this.vx * ex + this.vy * ey; if (vn > 0) { this.vx -= (1 + this.wallRestitution) * vn * ex; this.vy -= (1 + this.wallRestitution) * vn * ey; } }
    this.time += dt; return this;
  }
  advance(seconds) { const n = Math.round(seconds / this.dt); for (let i = 0; i < n; i++) this.step(); return this; }
  snapshot() { return { pitch: this.pitch, roll: this.roll, ballX: this.x, ballY: this.y, ballLift: this.lift, ballVX: this.vx, ballVY: this.vy, led: this.led, present: this.present }; }
}

// Replays a measured ball track (seconds, metres) through the same controller + servo model and returns the plate
// tilt history at 100 Hz. Used by the compare view so the model's plate moves like the real rig in the clip.
export function replayTrack(track) {
  const pidX = new PIDController(), pidY = new PIDController(), sr = new ServoAxis(), sp = new ServoAxis();
  const out = [], hist = { t: [], x: [], y: [] }, T = track[track.length - 1][0];
  let k = 0, cr = 0, cp = 0;
  for (let t = 0; t <= T + 1e-9; t += CONTROLLER.period) {
    while (k < track.length - 2 && track[k + 1][0] < t) k++;
    const a = track[k], b = track[Math.min(k + 1, track.length - 1)], f = b[0] > a[0] ? clamp((t - a[0]) / (b[0] - a[0]), 0, 1) : 0;
    const xm = (a[1] + (b[1] - a[1]) * f) * 1000, ym = (a[2] + (b[2] - a[2]) * f) * 1000;
    hist.t.push(t); hist.x.push(xm); hist.y.push(ym); if (hist.t.length > 10) { hist.t.shift(); hist.x.shift(); hist.y.shift(); }
    const vx = hist.t.length >= 10 ? slope(hist.t, hist.x) : 0, vy = hist.t.length >= 10 ? slope(hist.t, hist.y) : 0;
    const inside = Math.hypot(xm, ym) < CONTROLLER.deadband;
    cr = pidX.update(inside ? 0 : -xm, -xm, CONTROLLER.period, vx); cp = pidY.update(inside ? 0 : -ym, -ym, CONTROLLER.period, vy);
    let r = 0, p = 0; for (let i = 0; i < 10; i++) { r = sr.step(cr * DEG, CONTROLLER.period / 10); p = sp.step(cp * DEG, CONTROLLER.period / 10); }
    out.push([r / DEG, p / DEG]);
  }
  return out;
}

// Timeline for <as-platform-sequence>: 0.8-4.3 s the exploded parts assemble (same staggered build order as the
// hero), then the ball, hovering over an off-centre point, is released and balanced by the SAME controller.py PID +
// Simulink plant used by the live element (overshoot included). Pure function of time so the slider can scrub.
import { BallPlateSimulation } from '../platform/platform-physics.js';
export const PLATFORM_SEQUENCE_DURATION = 12;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
const DROP = [0.062, -0.048, 0.09], T0 = 4.6, STEP = 1 / 200;
const sim = new BallPlateSimulation(), samples = [];
sim.dropAt(...DROP); samples.push(sim.snapshot());
for (let t = 0; t < PLATFORM_SEQUENCE_DURATION - T0 + STEP; t += STEP) { sim.advance(STEP); samples.push(sim.snapshot()); }
export function platformSequenceState(seconds) {
  const t = clamp(Number(seconds) || 0, 0, PLATFORM_SEQUENCE_DURATION);
  const explode = 1 - ease((t - 0.8) / 3.5);
  if (t < T0) return { pitch: 0, roll: 0, ballX: DROP[0], ballY: DROP[1], ballLift: DROP[2], led: 'off', explode };
  const i = (t - T0) / STEP, lo = Math.min(Math.floor(i), samples.length - 1), hi = Math.min(lo + 1, samples.length - 1), f = i - Math.floor(i), a = samples[lo], b = samples[hi];
  const s = { explode: 0, led: a.led };
  for (const k of ['pitch', 'roll', 'ballX', 'ballY', 'ballLift']) s[k] = a[k] + (b[k] - a[k]) * f;
  return s;
}

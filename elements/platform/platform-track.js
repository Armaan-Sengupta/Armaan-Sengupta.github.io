// Ball track measured from site/media/stewart-demo.mp4 (assets/demo-track.json: ball centre in normalised video
// pixels at 15 Hz + whether the LED ring is green). It is projected onto the plate through the 'demo' camera, and the
// plate tilt is the controller.py PID + Simulink servo model replayed on that track, so the model follows the clip.
import { replayTrack, BALL } from './platform-physics.js';

export const DEMO_DURATION = 13.44;   // seconds, length of stewart-demo.mp4
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let raw = null;

export function loadDemoTrack(view) {
  if (!raw) raw = fetch(new URL('./assets/demo-track.json', import.meta.url)).then((r) => { if (!r.ok) throw new Error('demo track missing'); return r.json(); });
  return raw.then((d) => {
    const L = BALL.plateRadius - BALL.radius;
    const pts = d.samples.map(([t, u, v, g]) => { const p = view.videoToPlate(u, v) || { x: 0, y: 0 }; const r = Math.hypot(p.x, p.y); if (r > L) { p.x *= L / r; p.y *= L / r; } return [t, p.x, p.y, g]; });
    return { pts, tilt: replayTrack(pts) };
  });
}

export function demoTrackState(track, t) {
  if (!track) return { pitch: 0, roll: 0, ballX: 0, ballY: 0, ballLift: 0, led: 'white' };
  const p = track.pts; t = clamp(t, 0, p[p.length - 1][0]);
  let i = 0; while (i < p.length - 2 && p[i + 1][0] < t) i++;
  const a = p[i], b = p[i + 1] || a, f = b[0] > a[0] ? clamp((t - a[0]) / (b[0] - a[0]), 0, 1) : 0;
  const k = clamp(Math.round(t / 0.01), 0, track.tilt.length - 1), [roll, pitch] = track.tilt[k];
  return { ballX: a[1] + (b[1] - a[1]) * f, ballY: a[2] + (b[2] - a[2]) * f, ballLift: 0, roll, pitch, led: (f < 0.5 ? a[3] : b[3]) ? 'green' : 'white' };
}

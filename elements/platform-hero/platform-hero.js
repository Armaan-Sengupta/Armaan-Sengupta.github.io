/* <as-platform-hero> — scroll-driven assembly of the 3RRS ball-balancing platform (same scene as
 * <as-parallel-manipulator>: CAD links, SPV4 inverse kinematics, controller.py PID, Simulink servo + ball model).
 *
 * Size it 100vw x 100vh (it fills its box and follows resizes; the lead may shrink it later).
 *
 * progress (property + attribute, 0..1, set from page scroll)
 *   0      parts exploded, camera close: they fill the whole viewport
 *   0..1   parts assemble in build order (base, servos, horns, lower links, upper links, attach plate, bolts, Forcen
 *          sensor, LED ring, top plate, top bolts, ball) while the camera pulls back so the platform ends centred.
 *          Scrolling back reverses it smoothly (pure function of progress).
 *   1      assembled: the ball (hovering over an off-centre point) drops, lands, overshoots and is balanced back.
 *          From here it runs on time, not scroll. Click/tap the plate to drop the ball at that point. While idle it
 *          gives the ball a small nudge every ~10 s (attribute idle="still" disables).
 * camera="demo" (attribute)
 *   Real-vs-model compare view: the camera blends (0.9 s) to the exact framing of site/media/stewart-demo.mp4
 *   (stage aspect 16:9 = 1280x720 for a pixel match; other aspects are covered centrally like object-fit: cover) and
 *   the ball/plate follow the motion tracked from that clip. Time comes from el.syncVideo(videoElement) (follows its
 *   currentTime, looping/seeking included) or el.videoTime; unsynced it loops 13.44 s on its own. Removing the
 *   attribute blends back to the live view and the live simulation continues.
 * Events (bubbling, composed): 'assembled' (first time progress reaches 1), 'platform-ready', 'platform-error',
 *   'ball-drop' {detail:{x,y}}, 'balanced' (LED ring turns green, controller.py rule: within 15 mm for 1 s).
 * Methods: dropBall(x, y[, h]) (metres on the plate), syncVideo(video|null), reset().
 * prefers-reduced-motion: assembly still follows scroll; at 1 the ball is shown already balanced (no time motion).
 */
import { createPlatformRenderer, CAMERAS } from '../platform/platform-renderer.js';
import { BallPlateSimulation } from '../platform/platform-physics.js';
import { loadDemoTrack, demoTrackState, DEMO_DURATION } from '../platform/platform-track.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const DROP = [0.062, -0.048], DROP_H = 0.09;

class ASPlatformHero extends HTMLElement {
  static get observedAttributes() { return ['progress', 'camera']; }
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.sim = new BallPlateSimulation(); this._progress = 0; this._live = false; this._everAssembled = false; this._acc = 0; this._last = 0;
    this._visible = true; this._dirty = true; this._demoMix = 0; this._demoTarget = 0; this._videoTime = 0; this._video = null; this._track = null;
    this._frozen = null; this._lastInput = 0; this._lastNudge = 0; this._wasGreen = false;
    this._reduced = matchMedia('(prefers-reduced-motion: reduce)');
  }
  connectedCallback() {
    if (this._view) return;
    this.shadowRoot.innerHTML = `<style>:host{display:block;position:relative;width:100%;height:100%;background:#08080a;contain:strict}
      canvas{position:absolute;inset:0;display:block;width:100%;height:100%;touch-action:pan-y pan-x}</style>`;
    try { this._view = createPlatformRenderer(this.shadowRoot, { background: 0x08080a }); }
    catch (e) { this.dispatchEvent(new CustomEvent('platform-error', { detail: String(e?.message || e), bubbles: true, composed: true })); return; }
    this._canvas = this._view.canvas;
    if (this.hasAttribute('progress')) this._progress = clamp(Number(this.getAttribute('progress')) || 0, 0, 1);
    this._demoTarget = this._demoMix = this.getAttribute('camera') === 'demo' ? 1 : 0;
    if (this._demoTarget) this._ensureTrack();
    this._view.ready.then(() => { this._dirty = true; this._frame(performance.now()); this.dispatchEvent(new CustomEvent('platform-ready', { bubbles: true, composed: true })); })
      .catch((e) => this.dispatchEvent(new CustomEvent('platform-error', { detail: String(e?.message || e), bubbles: true, composed: true })));
    this._ro = new ResizeObserver(([e]) => { const r = e.contentRect; this._view.resize(r.width, r.height, Math.min(devicePixelRatio || 1, 2)); this._dirty = true; this._frame(performance.now()); });
    this._ro.observe(this);
    this._io = new IntersectionObserver(([e]) => { this._visible = e.isIntersecting; this._last = 0; }); this._io.observe(this);
    let down = null;
    this._canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });
    this._canvas.addEventListener('pointerup', (e) => {
      if (!down) return; const ok = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 600; down = null;
      if (!ok || !this._live || this._demoTarget) return;
      const p = this._view.pickPlate(e.clientX, e.clientY); if (p && p.inside) this.dropBall(p.x, p.y);
    });
    const loop = (now) => { this._raf = requestAnimationFrame(loop); this._frame(now); };
    this._raf = requestAnimationFrame(loop);
  }
  disconnectedCallback() { cancelAnimationFrame(this._raf); this._ro?.disconnect(); this._io?.disconnect(); this._view?.dispose(); this._view = null; }
  attributeChangedCallback(name, _o, v) {
    if (name === 'progress') this.progress = v;
    else if (name === 'camera') { this._demoTarget = v === 'demo' ? 1 : 0; if (this._demoTarget) this._ensureTrack(); this._dirty = true; }
  }
  get progress() { return this._progress; }
  set progress(v) {
    const p = clamp(Number(v) || 0, 0, 1); if (p === this._progress) return;
    this._progress = p; this._dirty = true;
    if (p >= 0.999 && !this._live) this._assemble();
    else if (p < 0.999 && this._live) { this._live = false; this._frozen = this.sim.snapshot(); }
  }
  get videoTime() { return this._videoTime; }
  set videoTime(t) { this._videoTime = clamp(Number(t) || 0, 0, DEMO_DURATION); this._dirty = true; }
  get state() { return this._composeState(); }
  syncVideo(video) { this._video = video || null; return this; }
  reset() { this.sim.reset(); this._dirty = true; return this; }
  dropBall(x, y, h = DROP_H) {
    this.sim.dropAt(x, y, h); this._lastInput = this.sim.time;
    if (this._reduced.matches) this.sim.advance(6);
    this.dispatchEvent(new CustomEvent('ball-drop', { detail: { x, y }, bubbles: true, composed: true })); this._dirty = true; return this;
  }
  _ensureTrack() { if (!this._trackP && this._view) this._trackP = loadDemoTrack(this._view).then((t) => { this._track = t; this._dirty = true; }).catch(() => {}); }
  _assemble() {
    this._live = true; this._frozen = null; this.sim.reset(); this.sim.dropAt(DROP[0], DROP[1], DROP_H);
    this._lastInput = 0; this._lastNudge = 0;
    if (this._reduced.matches) this.sim.advance(8);
    if (!this._everAssembled) { this._everAssembled = true; this.dispatchEvent(new CustomEvent('assembled', { bubbles: true, composed: true })); }
  }
  _composeState() {
    const p = this._progress, explode = 1 - ease(p / 0.86);
    const pre = { pitch: 0, roll: 0, ballX: DROP[0], ballY: DROP[1], ballLift: DROP_H, led: 'off' };
    let s;
    if (this._live) s = this.sim.snapshot();
    else if (this._frozen) { const k = ease((1 - p) / 0.1), f = this._frozen; s = { pitch: f.pitch * (1 - k), roll: f.roll * (1 - k), ballX: f.ballX + (pre.ballX - f.ballX) * k, ballY: f.ballY + (pre.ballY - f.ballY) * k, ballLift: f.ballLift + (pre.ballLift - f.ballLift) * k, led: k > 0.5 ? 'off' : f.led }; }
    else s = pre;
    if (this._demoMix > 0 && this._track) {
      const d = demoTrackState(this._track, this._videoTime), m = ease(this._demoMix);
      s = { pitch: s.pitch + (d.pitch - s.pitch) * m, roll: s.roll + (d.roll - s.roll) * m, ballX: s.ballX + (d.ballX - s.ballX) * m, ballY: s.ballY + (d.ballY - s.ballY) * m, ballLift: s.ballLift * (1 - m), led: m > 0.5 ? d.led : s.led };
    }
    return { ...s, explode };
  }
  _frame(now) {
    if (!this._view || !this._visible || document.hidden) { this._last = 0; return; }
    const dt = this._last ? Math.min((now - this._last) / 1000, 0.05) : 0; this._last = now;
    // demo camera blend
    if (this._demoMix !== this._demoTarget) { this._demoMix = this._demoTarget ? Math.min(1, this._demoMix + dt / 0.9) : Math.max(0, this._demoMix - dt / 0.9); if (this._reduced.matches) this._demoMix = this._demoTarget; this._dirty = true; }
    if (this._demoMix > 0) { this._videoTime = this._video ? this._video.currentTime : (this._reduced.matches ? this._videoTime : (this._videoTime + dt) % DEMO_DURATION); this._dirty = true; }
    if (this._live && !this._reduced.matches && this._demoMix < 1) {
      this._acc += dt; let n = 0; while (this._acc >= this.sim.dt && n < 80) { this.sim.step(); this._acc -= this.sim.dt; n++; } if (n >= 80) this._acc = 0;
      if (this.getAttribute('idle') !== 'still' && this.sim.present && this.sim.time - Math.max(this._lastInput, this._lastNudge) > 10) {
        this._lastNudge = this.sim.time; const a = this.sim.time * 2.3; this.sim.impulse(0.09 * Math.cos(a), 0.09 * Math.sin(a));
      }
      this._dirty = true;
    }
    if (!this._dirty) return;
    this._dirty = false;
    const t = easeInOut(this._progress);
    const live = this._view.resolveCamera(CAMERAS['hero-start']), end = this._view.resolveCamera(CAMERAS['hero-end']);
    const blend = (a, b, k) => ({ target: a.target.map((v, i) => v + (b.target[i] - v) * k), az: a.az + (b.az - a.az) * k, el: a.el + (b.el - a.el) * k, dist: Math.exp(Math.log(a.dist) + (Math.log(b.dist) - Math.log(a.dist)) * k), tanV: Math.exp(Math.log(a.tanV) + (Math.log(b.tanV) - Math.log(a.tanV)) * k), yaw: a.yaw + (b.yaw - a.yaw) * k, pitch: a.pitch + (b.pitch - a.pitch) * k, roll: a.roll + (b.roll - a.roll) * k });
    let cam = blend(live, end, t);
    if (this._demoMix > 0) cam = blend(cam, this._view.resolveCamera('demo'), easeInOut(this._demoMix));
    this._view.setCameraResolved(cam);
    const s = this._composeState();
    this._view.setState(s).render();
    if (s.led === 'green' && !this._wasGreen && this._live) this.dispatchEvent(new CustomEvent('balanced', { bubbles: true, composed: true }));
    this._wasGreen = s.led === 'green';
  }
}
if (!customElements.get('as-platform-hero')) customElements.define('as-platform-hero', ASPlatformHero);
export { ASPlatformHero };

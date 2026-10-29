/* <as-parallel-manipulator> — live 3RRS ball-balancing platform (three.js, original CAD links, SPV4 kinematics).
 *
 * Attributes
 *   view="interactive" (default)  Live simulation. Click/tap anywhere on the plate to drop the ball at that point; it
 *                                 lands, overshoots and is balanced back by the controller.py PID. Sweeping the cursor
 *                                 through the ball nudges it; arrow keys nudge, R resets, Space pauses.
 *   view="compare"                Camera, scale and background match site/media/stewart-demo.mp4 exactly (stage must be
 *                                 16:9 for a pixel match; other aspects are covered centrally like object-fit: cover).
 *                                 The ball follows the position tracked from that clip and the plate tilt is the same
 *                                 controller + servo model replayed on it, so the model moves with the real rig.
 *                                 Drive it with el.syncVideo(videoElement) (follows currentTime, incl. looping/seeking)
 *                                 or set el.videoTime (seconds); unsynced it runs its own 13.44 s loop.
 *   camera="default" | "demo"     Override the camera only (view="interactive" with camera="demo" = live sim in the
 *                                 video framing).
 *   controls="hidden"             Hide the small mono HUD.  autoplay="false"  Start paused.
 * Properties / methods
 *   ready (Promise), state, paused, videoTime, play(), pause(), reset(), dropBall(xMetres, yMetres[, heightMetres]),
 *   nudge(dvx, dvy), syncVideo(video|null)
 * Events (bubbling, composed)
 *   platform-ready, platform-error {detail: message}, ball-drop {detail: {x, y}}, balanced (LED ring turns green:
 *   ball within 15 mm for 1 s — the controller.py LED rule)
 */
import { createPlatformRenderer, CAMERAS } from './platform-renderer.js';
import { BallPlateSimulation } from './platform-physics.js';
import { loadDemoTrack, demoTrackState, DEMO_DURATION } from './platform-track.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class ASParallelManipulator extends HTMLElement {
  static get observedAttributes() { return ['view', 'camera', 'controls']; }
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.sim = new BallPlateSimulation(); this._paused = false; this._raf = 0; this._last = 0; this._acc = 0; this._visible = false;
    this._reduced = matchMedia('(prefers-reduced-motion: reduce)'); this._videoTime = 0; this._video = null; this._track = null; this._wasGreen = false; this._autoDropped = false;
  }
  connectedCallback() {
    if (this._view) return;
    this.shadowRoot.innerHTML = `<style>
      :host{display:block;position:relative;width:100%;height:100%;min-height:200px;background:#08080a;color:#f2efe9;contain:content}
      .vp{position:absolute;inset:0;outline:none;cursor:crosshair}
      .vp:focus-visible{box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}
      canvas{display:block;width:100%;height:100%;touch-action:pan-y pan-x}
      .hud{position:absolute;left:14px;bottom:12px;font:10px/1.6 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.06em;color:rgba(242,239,233,.55);pointer-events:none;text-transform:uppercase;white-space:pre}
      .hud b{font-weight:400;color:rgba(242,239,233,.8)}
      :host([controls="hidden"]) .hud,:host([view="compare"]) .hud{display:none}
      :host([view="compare"]) .vp{cursor:default}
      .msg{position:absolute;inset:0;display:grid;place-items:center;font:10px "JetBrains Mono",monospace;letter-spacing:.12em;color:rgba(242,239,233,.45);pointer-events:none}
    </style><div class="vp" tabindex="0" role="img" aria-label="Live model of a three-legged ball-balancing platform. Click or tap the plate to drop the ball; the controller balances it back to centre."><div class="msg">LOADING CAD</div></div><div class="hud"></div>`;
    const vp = this.shadowRoot.querySelector('.vp'); this._hud = this.shadowRoot.querySelector('.hud');
    try { this._view = createPlatformRenderer(vp, { background: 0x08080a }); }
    catch (e) { this._fail(e); return; }
    this._canvas = this._view.canvas; this._paused = this._reduced.matches || this.getAttribute('autoplay') === 'false';
    this._applyCamera();
    this._ready = this._view.ready.then(() => {
      this.shadowRoot.querySelector('.msg')?.remove(); this._draw();
      this.dispatchEvent(new CustomEvent('platform-ready', { bubbles: true, composed: true })); return this;
    });
    this._ready.catch((e) => this._fail(e));
    if (this._isCompare) this._loadTrack();
    this._ro = new ResizeObserver(([e]) => { const r = e.contentRect; this._view.resize(r.width, r.height, Math.min(devicePixelRatio || 1, 2)); this._draw(); });
    this._ro.observe(vp);
    this._io = new IntersectionObserver(([e]) => { this._visible = e.isIntersecting; this._last = 0; if (this._visible) this._maybeAutoDrop(); }); this._io.observe(this);
    this._onVis = () => { this._last = 0; }; document.addEventListener('visibilitychange', this._onVis);
    this._bindInput(vp);
    this._tick = (now) => {
      this._raf = requestAnimationFrame(this._tick);
      if (!this._visible || document.hidden || !this._view) { this._last = 0; return; }
      const dt = this._last ? Math.min((now - this._last) / 1000, 0.05) : 0; this._last = now;
      if (this._isCompare) { if (!this._video && !this._paused) this._videoTime = (this._videoTime + dt) % DEMO_DURATION; if (this._video) this._videoTime = this._video.currentTime; this._draw(); return; }
      if (this._paused) return;
      this._acc += dt; let n = 0; while (this._acc >= this.sim.dt && n < 80) { this.sim.step(); this._acc -= this.sim.dt; n++; } if (n >= 80) this._acc = 0;
      this._draw();
    };
    this._raf = requestAnimationFrame(this._tick);
  }
  disconnectedCallback() {
    cancelAnimationFrame(this._raf); this._ro?.disconnect(); this._io?.disconnect(); document.removeEventListener('visibilitychange', this._onVis);
    this._view?.dispose(); this._view = null;
  }
  attributeChangedCallback(name) { if (!this._view) return; if (name === 'view' || name === 'camera') { this._applyCamera(); if (this._isCompare) this._loadTrack(); this._draw(); } }
  get _isCompare() { return this.getAttribute('view') === 'compare'; }
  _applyCamera() { const cam = this.getAttribute('camera') || (this._isCompare ? 'demo' : 'default'); this._view.setCamera(CAMERAS[cam] ? cam : 'default'); }
  _loadTrack() { if (this._trackLoading) return; this._trackLoading = loadDemoTrack(this._view).then((t) => { this._track = t; this._draw(); }).catch(() => {}); }
  _fail(e) {
    const m = this.shadowRoot.querySelector('.msg'); if (m) { m.textContent = '3D PREVIEW UNAVAILABLE'; m.setAttribute('role', 'alert'); }
    this.dispatchEvent(new CustomEvent('platform-error', { detail: String(e?.message || e), bubbles: true, composed: true }));
  }
  _maybeAutoDrop() {
    if (this._autoDropped || this._isCompare || this._reduced.matches) return;
    this._autoDropped = true; this.dropBall(0.062, -0.048, 0.09, false);
  }
  _trackState(t) { return demoTrackState(this._track, t); }
  _draw() {
    if (!this._view) return;
    const s = this._isCompare ? this._trackState(this._videoTime) : this.sim.snapshot();
    this._view.setState({ ...s, explode: 0 }).render();
    if (!this._isCompare) {
      if (s.led === 'green' && !this._wasGreen) this.dispatchEvent(new CustomEvent('balanced', { bubbles: true, composed: true }));
      this._wasGreen = s.led === 'green';
      if (this._hud && this.getAttribute('controls') !== 'hidden') {
        const f = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).padStart(4, '0');
        this._hud.innerHTML = `ball <b>${f(s.ballX * 1000)} ${f(s.ballY * 1000)}</b> mm   tilt <b>${f(s.roll)}° ${f(s.pitch)}°</b>\n${this._paused ? 'paused · space to resume' : 'click the plate to drop the ball'}`;
      }
    }
  }
  _bindInput(vp) {
    let down = null, prev = null;
    this._canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });
    this._canvas.addEventListener('pointerup', (e) => {
      if (!down || this._isCompare) { down = null; return; }
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), held = performance.now() - down.t; down = null;
      if (moved > 8 || held > 600) return;
      const p = this._view.pickPlate(e.clientX, e.clientY); if (!p || !p.inside) return;
      this.dropBall(p.x, p.y);
    });
    this._canvas.addEventListener('pointermove', (e) => {
      if (this._isCompare || this._paused || e.pointerType === 'touch' || !this.sim.present) return;
      const p = this._view.pickPlate(e.clientX, e.clientY); const now = performance.now();
      if (p && prev) {
        const dt = clamp((now - prev.t) / 1000, 0.008, 0.1), dx = p.x - prev.x, dy = p.y - prev.y, d = Math.hypot(p.x - this.sim.x, p.y - this.sim.y), range = 0.045;
        if (d < range && Math.hypot(dx, dy) / dt > 0.02) { const k = 0.5 * (1 - d / range); this.sim.impulse(clamp(dx / dt * k, -0.25, 0.25), clamp(dy / dt * k, -0.25, 0.25)); }
      }
      prev = p ? { ...p, t: now } : null;
    }, { passive: true });
    this._canvas.addEventListener('pointerleave', () => { prev = null; }, { passive: true });
    vp.addEventListener('keydown', (e) => {
      if (this._isCompare) return;
      const k = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, 0.12], ArrowDown: [0, -0.12] }[e.key];
      if (k) { e.preventDefault(); this.nudge(...k); if (this._paused) this.play(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); this.reset(); }
      else if (e.key === ' ') { e.preventDefault(); this._paused ? this.play() : this.pause(); }
    });
  }
  // public API
  get ready() { return this._ready || Promise.resolve(this); }
  get state() { return this._isCompare ? this._trackState(this._videoTime) : this.sim.snapshot(); }
  get paused() { return this._paused; }
  get videoTime() { return this._videoTime; }
  set videoTime(t) { this._videoTime = clamp(Number(t) || 0, 0, DEMO_DURATION); this._draw(); }
  syncVideo(video) { this._video = video || null; return this; }
  play() { this._paused = false; this._last = 0; this._draw(); return this; }
  pause() { this._paused = true; this._draw(); return this; }
  reset() { this.sim.reset(); this._acc = 0; this._draw(); return this; }
  nudge(dvx, dvy) { this.sim.impulse(dvx, dvy); return this; }
  dropBall(x, y, h = 0.09, emit = true) {
    this.sim.dropAt(x, y, h);
    if (this._reduced.matches) this.sim.advance(6); else if (this._paused) this.play();
    if (emit) this.dispatchEvent(new CustomEvent('ball-drop', { detail: { x, y }, bubbles: true, composed: true }));
    this._draw(); return this;
  }
}
if (!customElements.get('as-parallel-manipulator')) customElements.define('as-parallel-manipulator', ASParallelManipulator);

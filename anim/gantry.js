// <as-gantry>: top view of a two-axis stepper gantry. Homes against
// interrupt-driven endstops, then follows UART position commands with
// trapezoidal velocity profiles. Click / tap to command a new target.
const MONO = '500 10px "JetBrains Mono", ui-monospace, monospace';

class Gantry extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:block;position:relative;width:100%;height:100%}canvas{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;touch-action:none}</style><canvas></canvas>';
    this.cv = root.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pos = [0.62, 0.55]; this.vel = [0, 0];
    this.queue = []; this.phase = 'home'; this.hit = [0, 0]; this.log = [];
    this.t = 0; this.idle = 0; this.running = false; this.visible = false;
  }
  connectedCallback() {
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.visible ? this.play() : this.pause(); }); this.io.observe(this);
    this.onVis = () => (document.hidden ? this.pause() : this.visible && this.play()); document.addEventListener('visibilitychange', this.onVis);
    this.cv.addEventListener('pointerdown', (e) => {
      const r = this.cv.getBoundingClientRect(), f = this.frame();
      const x = (e.clientX - r.left - f.x) / f.w, y = (e.clientY - r.top - f.y) / f.h;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      this.queue = [[x, y]]; this.say(`TX  G0 X${(x * 300).toFixed(0)} Y${(y * 200).toFixed(0)}`); this.idle = 0;
      if (this.reduce) { this.pos = [x, y]; this.render(); }
    });
    this.say('BOOT  STM32F4 · 2× A4988'); this.say('HOMING…');
  }
  disconnectedCallback() { this.ro.disconnect(); this.io.disconnect(); document.removeEventListener('visibilitychange', this.onVis); this.pause(); }
  play() { if (this.running || this.reduce) { this.render(); return; } this.running = true; this.last = performance.now(); const f = (t) => { if (!this.running) return; this.step(Math.min(0.033, (t - this.last) / 1000)); this.last = t; this.render(); requestAnimationFrame(f); }; requestAnimationFrame(f); }
  pause() { this.running = false; }
  resize() { const d = Math.min(devicePixelRatio || 1, 2); this.W = this.clientWidth; this.H = this.clientHeight; this.cv.width = this.W * d; this.cv.height = this.H * d; this.ctx.setTransform(d, 0, 0, d, 0, 0); this.render(); }
  say(s) { this.log.push(s); if (this.log.length > 4) this.log.shift(); }
  frame() { const pad = Math.max(22, this.W * 0.06), side = this.W > 520 ? this.W * 0.3 : 0; const w = this.W - pad * 2 - side, h = Math.min(this.H - pad * 2 - 24, w * 0.66); return { x: pad, y: (this.H - h) / 2 - 6, w, h, side }; }

  step(dt) {
    this.t += dt;
    if (this.phase === 'home') {
      // drive toward 0,0 until each endstop interrupt fires
      for (let i = 0; i < 2; i++) {
        if (this.pos[i] > 0) { this.pos[i] = Math.max(0, this.pos[i] - dt * 0.35); if (this.pos[i] === 0) { this.hit[i] = 1; this.say(`IRQ  EXTI${i ? '1' : '0'} → ${i ? 'Y' : 'X'} HOME`); } }
      }
      if (this.pos[0] === 0 && this.pos[1] === 0) { this.phase = 'run'; this.say('READY  UART 115200'); }
    } else {
      if (!this.target && this.queue.length) this.target = this.queue.shift();
      if (!this.target) {
        this.idle += dt;
        if (this.idle > 1.3) { const p = [0.1 + Math.random() * 0.8, 0.1 + Math.random() * 0.8]; this.queue.push(p); this.say(`TX  G0 X${(p[0] * 300).toFixed(0)} Y${(p[1] * 200).toFixed(0)}`); this.idle = 0; }
      } else {
        let done = true;
        for (let i = 0; i < 2; i++) {
          const e = this.target[i] - this.pos[i], amax = 1.6, vmax = 0.6;
          const vStop = Math.sqrt(2 * amax * Math.abs(e)); // decelerate in time
          const want = Math.sign(e) * Math.min(vmax, vStop);
          const dv = Math.max(-amax * dt, Math.min(amax * dt, want - this.vel[i]));
          this.vel[i] += dv; this.pos[i] += this.vel[i] * dt;
          if (Math.abs(e) > 0.002 || Math.abs(this.vel[i]) > 0.01) done = false;
        }
        if (done) { this.pos = [...this.target]; this.vel = [0, 0]; this.target = null; this.say('RX  OK'); this.idle = 0; }
      }
    }
    this.hit = this.hit.map((h) => Math.max(0, h - dt * 1.2));
  }

  render() {
    const c = this.ctx, W = this.W, H = this.H; if (!W) return;
    c.clearRect(0, 0, W, H);
    const f = this.frame(), px = f.x + this.pos[0] * f.w, py = f.y + this.pos[1] * f.h;
    // bed grid
    c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,0.05)'; c.beginPath();
    for (let i = 0; i <= 12; i++) { const x = Math.round(f.x + f.w * i / 12) + 0.5; c.moveTo(x, f.y); c.lineTo(x, f.y + f.h); }
    for (let j = 0; j <= 8; j++) { const y = Math.round(f.y + f.h * j / 8) + 0.5; c.moveTo(f.x, y); c.lineTo(f.x + f.w, y); }
    c.stroke();
    // frame + rails
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.strokeRect(f.x - 10.5, f.y - 10.5, f.w + 21, f.h + 21);
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(f.x - 10, f.y - 4); c.lineTo(f.x + f.w + 10, f.y - 4); c.moveTo(f.x - 10, f.y + f.h + 4); c.lineTo(f.x + f.w + 10, f.y + f.h + 4); c.stroke();
    // target crosshair
    if (this.target) {
      const tx = f.x + this.target[0] * f.w, ty = f.y + this.target[1] * f.h;
      c.setLineDash([2, 4]); c.strokeStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(tx, f.y); c.lineTo(tx, f.y + f.h); c.moveTo(f.x, ty); c.lineTo(f.x + f.w, ty); c.stroke(); c.setLineDash([]);
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(tx, ty, 7, 0, 7); c.stroke();
    }
    // Y gantry beam (spans X), carriage
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(f.x - 14, py - 7, f.w + 28, 14);
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.strokeRect(f.x - 14.5, py - 7.5, f.w + 29, 15);
    c.fillStyle = '#0b0b0b'; c.fillRect(px - 16, py - 13, 32, 26); c.strokeStyle = '#f2efe9'; c.strokeRect(px - 16.5, py - 13.5, 33, 27);
    c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 14; c.beginPath(); c.arc(px, py, 3, 0, 7); c.fill(); c.shadowBlur = 0;
    // endstops
    const es = [[f.x - 10, py, this.hit[0]], [px, f.y - 10, this.hit[1]]];
    es.forEach(([x, y, h]) => { c.fillStyle = `rgba(255,255,255,${0.25 + h * 0.75})`; if (h > 0) { c.shadowColor = '#fff'; c.shadowBlur = 16 * h; } c.fillRect(x - 3, y - 3, 6, 6); c.shadowBlur = 0; });
    // labels
    c.font = MONO; c.fillStyle = 'rgba(242,239,233,0.5)';
    c.fillText(`X ${(this.pos[0] * 300).toFixed(1).padStart(6)} mm`, f.x, f.y + f.h + 26);
    c.fillText(`Y ${(this.pos[1] * 200).toFixed(1).padStart(6)} mm`, f.x + 130, f.y + f.h + 26);
    c.fillText(this.phase === 'home' ? 'HOMING' : (this.target ? 'MOVING' : 'IDLE'), f.x + f.w - 50, f.y + f.h + 26);
    // UART console
    if (f.side) {
      const sx = W - f.side + 10, sy = f.y - 10;
      c.strokeStyle = 'rgba(255,255,255,0.1)'; c.strokeRect(sx + 0.5, sy + 0.5, f.side - 30, f.h + 20);
      c.fillStyle = 'rgba(242,239,233,0.35)'; c.fillText('UART · /dev/ttyACM0', sx + 12, sy + 20);
      this.log.forEach((l, i) => { c.fillStyle = `rgba(242,239,233,${0.35 + 0.65 * (i + 1) / this.log.length})`; c.fillText(l.slice(0, Math.floor((f.side - 50) / 6.2)), sx + 12, sy + 48 + i * 20); });
      // velocity bars
      const vy = sy + f.h - 30;
      ['VX', 'VY'].forEach((n, i) => { c.fillStyle = 'rgba(242,239,233,0.4)'; c.fillText(n, sx + 12, vy + i * 18 + 4); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(sx + 40, vy + i * 18 - 3, f.side - 90, 6); c.fillStyle = '#f2efe9'; const w = Math.min(1, Math.abs(this.vel[i]) / 0.6) * (f.side - 90); c.fillRect(sx + 40, vy + i * 18 - 3, w, 6); });
    }
  }
}
if (!customElements.get('as-gantry')) customElements.define('as-gantry', Gantry);

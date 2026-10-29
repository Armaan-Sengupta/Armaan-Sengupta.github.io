// Hero: a live PID loop. The pointer (or an automatic step pattern) sets the
// setpoint; a damped second-order plant follows it and is drawn like a scope.
export function initHero(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gains = { kp: 2.4, ki: 0.6, kd: 0.22 };
  const N = 900;                         // samples kept on screen
  const sp = new Float32Array(N), y = new Float32Array(N);
  let head = 0, W = 0, H = 0, dpr = 1;
  let x = 0, v = 0, integ = 0, prevErr = 0, target = 0;
  let pointerActive = false, lastPointer = 0, autoT = 0, autoLevel = 0.35;
  let running = false, visible = true, last = 0;

  const ro = { sp: document.getElementById('ro-sp'), y: document.getElementById('ro-y'), e: document.getElementById('ro-e') };

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ebTop = eyebrow ? eyebrow.getBoundingClientRect().top - canvas.getBoundingClientRect().top : H * 0.4;
    bandBot = Math.max(Math.max(84, H * 0.12) + 120, ebTop - 36);
    if (!running) draw();
  }

  // trace band lives in the upper ~60% of the hero so the type stays clear
  const eyebrow = document.querySelector('.intro .eyebrow');
  let bandBot = 0;
  const band = () => ({ top: Math.max(84, H * 0.12), bot: bandBot });
  const toY = (val) => { const b = band(); return b.top + (1 - (val + 1) / 2) * (b.bot - b.top); };

  function setFromPointer(clientY) {
    const r = canvas.getBoundingClientRect(), b = band();
    const t = ((clientY - r.top) - b.top) / (b.bot - b.top);
    target = Math.max(-0.95, Math.min(0.95, 1 - 2 * t));
    pointerActive = true; lastPointer = performance.now();
  }
  canvas.parentElement.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') setFromPointer(e.clientY); });
  canvas.parentElement.addEventListener('pointerdown', (e) => setFromPointer(e.clientY));

  function step(dt) {
    // automatic setpoint when idle: crisp steps between levels
    if (!pointerActive || performance.now() - lastPointer > 3500) {
      pointerActive = false;
      autoT += dt;
      if (autoT > 2.6) { autoT = 0; autoLevel = (Math.random() * 1.5 - 0.75); if (Math.abs(autoLevel - target) < 0.3) autoLevel = -autoLevel; }
      target = autoLevel;
    }
    const sub = 8, h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const err = target - x;
      integ = Math.max(-2, Math.min(2, integ + err * h));
      const der = (err - prevErr) / h; prevErr = err;
      let u = 14 * (gains.kp * err + gains.ki * integ + gains.kd * der * 0.12);
      u = Math.max(-40, Math.min(40, u));                // actuator saturation
      const a = u - 3.2 * v;                             // m=1, viscous damping
      v += a * h; x += v * h;
    }
    head = (head + 1) % N; sp[head] = target; y[head] = x;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const b = band(), headX = W * (W < 700 ? 0.86 : 0.74), dx = headX / (N - 1);

    // grid
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) { const yy = Math.round(b.top + (b.bot - b.top) * i / 4) + 0.5; ctx.moveTo(0, yy); ctx.lineTo(W, yy); }
    const step = Math.max(60, W / 16);
    for (let xx = headX % step; xx < W; xx += step) { ctx.moveTo(Math.round(xx) + 0.5, b.top); ctx.lineTo(Math.round(xx) + 0.5, b.bot); }
    ctx.stroke();
    // zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(0, toY(0)); ctx.lineTo(W, toY(0)); ctx.stroke();

    // error fill
    ctx.beginPath();
    for (let i = 0; i < N; i++) { const k = (head + 1 + i) % N; const px = i * dx; i ? ctx.lineTo(px, toY(y[k])) : ctx.moveTo(px, toY(y[k])); }
    for (let i = N - 1; i >= 0; i--) { const k = (head + 1 + i) % N; ctx.lineTo(i * dx, toY(sp[k])); }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, headX, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.07)');
    ctx.fillStyle = g; ctx.fill();

    // setpoint (dashed)
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath();
    for (let i = 0; i < N; i++) { const k = (head + 1 + i) % N; const px = i * dx, py = toY(sp[k]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.lineTo(W, toY(target)); ctx.stroke(); ctx.setLineDash([]);

    // output trace with fade-in from left
    const og = ctx.createLinearGradient(0, 0, headX, 0); og.addColorStop(0, 'rgba(242,239,233,0)'); og.addColorStop(0.35, 'rgba(242,239,233,0.55)'); og.addColorStop(1, 'rgba(242,239,233,1)');
    ctx.strokeStyle = og; ctx.lineWidth = 1.6; ctx.shadowColor = 'rgba(255,248,235,0.6)'; ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < N; i++) { const k = (head + 1 + i) % N; const px = i * dx, py = toY(y[k]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); ctx.shadowBlur = 0;

    // head marker + cursor line
    const hy = toY(y[head]);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(headX) + 0.5, b.top - 20); ctx.lineTo(Math.round(headX) + 0.5, b.bot + 20); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(headX, hy, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(headX, hy, 9, 0, Math.PI * 2); ctx.stroke();
    // setpoint target tick
    const ty = toY(target);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(headX + 14, ty); ctx.lineTo(headX + 26, ty); ctx.stroke();

    ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(242,239,233,0.45)';
    ctx.fillText('r(t)', headX + 32, ty + 3);
    ctx.fillText('y(t)', headX + 16, hy - 12);
    ctx.fillText('+1', 8, toY(1) - 6); ctx.fillText('−1', 8, toY(-1) + 14);

    if (ro.sp) { ro.sp.textContent = target.toFixed(3); ro.y.textContent = y[head].toFixed(3); ro.e.textContent = (target - y[head]).toFixed(3); }
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t;
    step(dt); // one sample per frame keeps the scroll speed steady
    draw();
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
  function stop() { running = false; }

  // prime history so the first frame already shows a response
  for (let i = 0; i < N; i++) step(1 / 60);

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  resize(); start();
  document.fonts && document.fonts.ready.then(resize);

  // gain knobs: drag horizontally or use arrow keys
  document.querySelectorAll('.knob').forEach((k) => {
    const key = k.dataset.k, out = k.querySelector('output');
    const range = { kp: [0.2, 8], ki: [0, 4], kd: [0, 2] }[key];
    k.tabIndex = 0; k.setAttribute('role', 'slider'); k.setAttribute('aria-valuemin', range[0]); k.setAttribute('aria-valuemax', range[1]);
    const set = (val) => { gains[key] = Math.max(range[0], Math.min(range[1], val)); out.textContent = gains[key].toFixed(2); k.setAttribute('aria-valuenow', gains[key].toFixed(2)); if (!running) draw(); };
    set(gains[key]);
    let sx = 0, sv = 0;
    k.addEventListener('pointerdown', (e) => { k.setPointerCapture(e.pointerId); sx = e.clientX; sv = gains[key]; e.preventDefault(); });
    k.addEventListener('pointermove', (e) => { if (k.hasPointerCapture(e.pointerId)) set(sv + (e.clientX - sx) * (range[1] - range[0]) / 300); });
    k.addEventListener('keydown', (e) => { const d = (range[1] - range[0]) / 40; if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(gains[key] + d); e.preventDefault(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(gains[key] - d); e.preventDefault(); } });
  });
}

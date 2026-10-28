import { initHero } from './hero.js';
import { cards, index, uses, skills } from './data.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── media manifest: which video loops exist ── */
let videos = new Map();
const manifestReady = fetch('media/manifest.json').then((r) => (r.ok ? r.json() : { videos: [] }))
  .then((m) => { videos = new Map((m.videos || []).map((v) => [v.id, v])); }).catch(() => {});

/* ── lazy loading of animation elements and video loops ── */
// clips rendered on white/grey backgrounds get a negative treatment to sit on black
const LIGHT = new Set(['radial-engine', 'stewart-trajectory', 'stewart-skeleton']);
const GREY = new Set(['stewart-sim']);
const loadedScripts = new Map();
function loadScript(src, classic) {
  if (!loadedScripts.has(src)) {
    loadedScripts.set(src, classic
      ? new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); })
      : import(`./${src}`));
  }
  return loadedScripts.get(src);
}

async function mountStage(stage) {
  if (stage.dataset.mounted) return;
  stage.dataset.mounted = '1';
  if (stage.dataset.el) {
    try {
      await loadScript(stage.dataset.src, 'classic' in stage.dataset);
      const el = document.createElement(stage.dataset.el);
      const attrs = JSON.parse(stage.dataset.attrs || '{}');
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      stage.prepend(el);
    } catch (e) { console.warn('element failed', stage.dataset.el, e); }
  } else if (stage.dataset.video !== undefined) {
    await manifestReady;
    const id = stage.dataset.video;
    if (videos.has(id)) {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'metadata', poster: `media/${id}.jpg`, src: `media/${id}.mp4` });
      const meta = videos.get(id);
      v.className = 'vid' + (LIGHT.has(id) ? ' light' : GREY.has(id) ? ' grey' : '') + (meta.h > meta.w && !stage.closest('.card') ? ' portrait' : '');
      v.setAttribute('aria-hidden', 'true');
      stage.prepend(v); videoIO.observe(v);
    } else if (stage.dataset.fallbackImg) {
      const img = new Image(); img.src = stage.dataset.fallbackImg; img.className = 'vid'; img.alt = ''; img.loading = 'lazy';
      stage.prepend(img);
    } else {
      const tab = stage.closest('.panel') && $(`[data-panel="${stage.closest('.panel').id}"]`);
      if (tab) tab.remove();
    }
  }
}
const videoIO = new IntersectionObserver((es) => es.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting && !reduce) v.play().catch(() => {}); else v.pause();
}), { threshold: 0.15 });

const stageIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting && !e.target.closest('.panel[hidden]')) { mountStage(e.target); stageIO.unobserve(e.target); }
}), { rootMargin: '400px 0px' });
const watchStages = (root = document) => $$('.stage[data-el], .stage[data-video]', root).forEach((s) => stageIO.observe(s));

/* ── tabs ── */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.tabs button'); if (!btn) return;
  const list = btn.parentElement;
  $$('button', list).forEach((b) => {
    const on = b === btn; b.setAttribute('aria-selected', on);
    const p = document.getElementById(b.dataset.panel); if (p) p.hidden = !on;
  });
  const panel = document.getElementById(btn.dataset.panel);
  $$('.stage', panel).forEach(mountStage);
});

/* ── nav ── */
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 40), { passive: true });
$('.menu').addEventListener('click', () => { const o = nav.classList.toggle('open'); $('.menu').setAttribute('aria-expanded', o); });
$$('.nav ul a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
const navIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) $$('.nav ul a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
}), { rootMargin: '-45% 0px -50% 0px' });
['experience', 'teams', 'projects', 'index', 'skills', 'contact'].forEach((id) => { const s = document.getElementById(id); if (s) navIO.observe(s); });

/* ── reveal + count-up ── */
const revealIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); revealIO.unobserve(e.target);
}), { rootMargin: '0px 0px -8% 0px' });
const observeReveal = (root = document) => $$('.rv', root).forEach((el) => revealIO.observe(el));

function countUp(el) {
  const to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  const fmt = (n) => pre + Math.round(n).toLocaleString('en-US') + suf;
  if (reduce) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 1400 + Math.min(to, 3000) * 0.15;
  const tick = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
const countIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); } }), { threshold: 0.6 });
$$('[data-count]').forEach((el) => countIO.observe(el));

/* ── project grid ── */
function mediaStage(m, cls = '') {
  if (m.video) return `<div class="${cls}" data-video="${m.video}" ${m.img ? `data-fallback-img="media/img/${m.img}"` : ''}></div>`;
  return `<div class="${cls}" data-el="${m.el}" data-src="${m.src}" ${m.classic ? 'data-classic' : ''} data-attrs='${JSON.stringify(m.attrs || {})}'></div>`;
}
const grid = $('#grid');
grid.innerHTML = cards.map((c, i) => `
  <button class="card w${c.w} rv" data-card="${c.id}" aria-haspopup="dialog">
    <div class="thumb">${mediaStage(c.media, 'stage-lite')}</div>
    <div class="body">
      <div class="k mono"><span>${c.kicker}</span><span>${String(i + 1).padStart(2, '0')}</span></div>
      <h4>${c.title}</h4>
      <p>${c.blurb}</p>
      <span class="more mono">Open →</span>
    </div>
  </button>`).join('');
// thumbs reuse the stage loader (class differs to avoid stage chrome)
$$('.stage-lite', grid).forEach((s) => s.classList.add('stage'));

/* ── drawer ── */
const drawer = $('#drawer'), drBody = $('#dr-body');
let lastFocus = null;
function openDrawer(id) {
  const c = cards.find((x) => x.id === id); if (!c) return;
  lastFocus = document.activeElement;
  drBody.innerHTML = `
    <span class="k mono">${c.kicker}</span>
    <h3 id="dr-title">${c.title}</h3>
    <div class="stage">${mediaStage(c.media).replace(/^<div class=""/, '<div')}</div>
    ${c.body.map((p) => `<p>${p}</p>`).join('')}
    <ul class="points">${c.points.map((p) => `<li>${p}</li>`).join('')}</ul>
    <div class="chips">${c.skills.map((s) => `<span class="chip">${s}</span>`).join('')}</div>
    ${c.links.length ? `<div class="links">${c.links.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join('')}</div>` : ''}
    ${c.gallery.length ? `<div class="gallery">${c.gallery.map((g) => `<img loading="lazy" src="media/img/${g}" alt="${c.title}" onerror="this.remove()">`).join('')}</div>` : ''}`;
  // drawer media: stage holds the element/video directly
  const st = $('.stage', drBody), inner = st.firstElementChild;
  Object.assign(st.dataset, inner.dataset); inner.remove();
  mountStage(st);
  drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  $('.close', drawer).focus();
}
function closeDrawer() {
  drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  setTimeout(() => { if (!drawer.classList.contains('open')) drBody.innerHTML = ''; }, 600);
  lastFocus && lastFocus.focus();
}
grid.addEventListener('click', (e) => { const c = e.target.closest('[data-card]'); if (c) openDrawer(c.dataset.card); });
drawer.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawer(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });

/* ── index ── */
$('#index-rows').innerHTML = index.map(([y, t, d, c, u]) => `
  <div class="row"><span class="y mono">${y}</span>${u ? `<a class="t" href="${u}" target="_blank" rel="noopener">${t} ↗</a>` : `<span class="t">${t}</span>`}<span class="d">${d}</span><span class="c mono">${c}</span></div>`).join('');

/* ── skills map ── */
const skRoot = $('#skills-root'), skCanvas = $('canvas', skRoot), skCtx = skCanvas.getContext('2d');
$('#sk-groups').innerHTML = Object.entries(skills).map(([g, items]) => `
  <div class="sk-group"><span class="mono">${g}</span><div class="sk-list">${Object.keys(items).map((s) => `<button class="sk" data-g="${g}">${s}</button>`).join('')}</div></div>`).join('');
$('#sk-uses').innerHTML = uses.map(([id, label]) => `<li data-u="${id}"><span>${label}</span><span>${document.getElementById(id) ? 'View ↓' : 'Open →'}</span></li>`).join('');
$$('#sk-uses li').forEach((li) => {
  const target = document.getElementById(li.dataset.u) || $(`[data-card="${li.dataset.u}"]`);
  if (target) { li.style.cursor = 'pointer'; li.addEventListener('click', () => (target.matches('[data-card]') ? openDrawer(li.dataset.u) : target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }))); }
});
let skActive = null, skAnim = 0, skRaf = 0;
function drawLinks() {
  const r = skRoot.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  skCanvas.width = r.width * d; skCanvas.height = r.height * d;
  skCtx.setTransform(d, 0, 0, d, 0, 0); skCtx.clearRect(0, 0, r.width, r.height);
  if (!skActive) return;
  const a = skActive.getBoundingClientRect(), ax = a.right - r.left, ay = a.top + a.height / 2 - r.top;
  const targets = $$('#sk-uses li.on');
  skCtx.lineWidth = 1;
  targets.forEach((li, i) => {
    const b = li.getBoundingClientRect(), bx = b.left - r.left - 6, by = b.top + b.height / 2 - r.top;
    const k = Math.min(1, Math.max(0, skAnim * 1.6 - i * 0.12));
    if (k <= 0) return;
    skCtx.strokeStyle = `rgba(242,239,233,${0.12 + 0.4 * k})`;
    skCtx.beginPath(); skCtx.moveTo(ax, ay);
    const mx = (ax + bx) / 2;
    // draw partial bezier by sampling
    const pts = 40, n = Math.floor(pts * k);
    for (let s = 1; s <= n; s++) {
      const t = s / pts, it = 1 - t;
      const x = it ** 3 * ax + 3 * it * it * t * mx + 3 * it * t * t * mx + t ** 3 * bx;
      const y = it ** 3 * ay + 3 * it * it * t * ay + 3 * it * t * t * by + t ** 3 * by;
      skCtx.lineTo(x, y);
    }
    skCtx.stroke();
    if (k >= 1) { skCtx.fillStyle = '#f2efe9'; skCtx.beginPath(); skCtx.arc(bx, by, 2.5, 0, 7); skCtx.fill(); }
  });
}
function setSkill(btn) {
  skActive = btn;
  skRoot.classList.toggle('idle', !btn);
  const g = btn && skills[btn.dataset.g][btn.textContent];
  $$('.sk').forEach((b) => { b.classList.toggle('on', b === btn); b.classList.toggle('dim', !!btn && b !== btn); });
  $$('#sk-uses li').forEach((li) => li.classList.toggle('on', !!g && g.includes(li.dataset.u)));
  cancelAnimationFrame(skRaf); skAnim = reduce ? 1 : 0;
  const t0 = performance.now();
  const tick = (t) => { skAnim = reduce ? 1 : Math.min(1, (t - t0) / 650); drawLinks(); if (skAnim < 1) skRaf = requestAnimationFrame(tick); };
  skRaf = requestAnimationFrame(tick);
}
$$('.sk').forEach((b) => {
  b.addEventListener('mouseenter', () => setSkill(b));
  b.addEventListener('focus', () => setSkill(b));
  b.addEventListener('click', () => setSkill(skActive === b ? null : b));
});
skRoot.addEventListener('mouseleave', () => setSkill(null));
addEventListener('resize', drawLinks);

/* ── boot ── */
initHero($('#hero-canvas'));
observeReveal();
watchStages();

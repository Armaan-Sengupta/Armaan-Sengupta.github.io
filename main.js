import { initHero } from './hero.js';
import { chapters, cards, details, uses, skills } from './data.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (t) => t * t * (3 - 2 * t);
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const allProjects = new Map([...chapters, ...cards].map((p) => [p.id, p]));

/* ── content.json: galleries and extra facts scraped from the original site ── */
let content = new Map();
const contentReady = fetch('content.json').then((r) => (r.ok ? r.json() : { projects: [] }))
  .then((j) => { content = new Map((j.projects || []).map((p) => [p.id, p])); }).catch(() => {});

/* ── loaders ── */
const scripts = new Map();
function loadScript(src, classic) {
  if (!scripts.has(src)) {
    scripts.set(src, classic
      ? new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); })
      : import(`./${src}`));
  }
  return scripts.get(src);
}
async function makeEl(spec) {
  await loadScript(spec.src, spec.classic);
  const el = document.createElement(spec.tag);
  for (const [k, v] of Object.entries(spec.attrs || {})) el.setAttribute(k, v);
  return el;
}
let lottieLib = null;
const getLottie = () => (lottieLib ||= loadScript('elements/shared/vendor/lottie_light.min.js', true).then(() => window.lottie));

// a lottie (or its pre-rendered scrub video) in a box; returns { seek(p) }
async function makeLottie(box, view, loop) {
  if (view.lottie && !view.scrub) {
    const lottie = await getLottie();
    const anim = lottie.loadAnimation({ container: box, renderer: 'svg', loop: !!loop, autoplay: !!loop && !reduce, path: view.lottie, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
    let ready = false, pending = null;
    anim.addEventListener('DOMLoaded', () => { ready = true; if (pending != null) seek(pending); });
    const seek = (p) => { if (!ready) { pending = p; return; } anim.goToAndStop(p * (anim.totalFrames - 1), true); };
    return { seek, play: () => loop && !reduce && anim.play(), pause: () => anim.pause() };
  }
  if (view.scrub) {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, playsInline: true, preload: 'auto', src: view.scrub, poster: view.scrub.replace(/.mp4$/, '.jpg') });
    v.className = 'fit'; box.append(v);
    let want = 0, busy = false;
    const go = () => { if (!v.duration) return; busy = true; v.currentTime = want * (v.duration - 0.05); };
    v.addEventListener('seeked', () => { busy = false; if (Math.abs(v.currentTime - want * (v.duration - 0.05)) > 0.04) go(); });
    v.addEventListener('loadedmetadata', go);
    return { seek: (p) => { want = p; if (!busy) go(); }, play() {}, pause() {} };
  }
  return { seek() {}, play() {}, pause() {} };
}
function makeVideo(src, { controls = false, loop = true } = {}) {
  const v = document.createElement('video');
  Object.assign(v, { muted: !controls, loop, playsInline: true, preload: controls ? 'none' : 'metadata', src, controls });
  v.poster = src.replace(/\.mp4$/, '.jpg');
  v.className = 'fit';
  return v;
}

/* ═════════════ chapters ═════════════ */
let VH = innerHeight;
const flows = { personal: $('[data-flow="personal"].flow'), professional: $('[data-flow="professional"].flow') };
const chapterState = [];

function buildChapter(ch) {
  const sec = document.createElement('section');
  sec.className = 'chapter' + (ch.hero ? ' hero' : '') + (ch.mono ? ' mono-ch' : '');
  sec.id = `ch-${ch.id}`;
  sec.setAttribute('aria-label', ch.title);
  const lens = ch.views.map((v) => v.len ?? 0.5);
  const total = lens.reduce((a, b) => a + b, 0);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0) / total);
  sec.innerHTML = `
    <div class="pin">
      <div class="ch-copy">
        <div class="meta mono"><span>${esc(ch.org)}</span><span>${esc(ch.dates)}</span></div>
        <h3>${esc(ch.title)}</h3>
        <p class="role">${esc(ch.role)}</p>
        <ul class="points">${ch.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="ch-actions">
          <button class="btn" data-open="${ch.id}">Details, media and videos <span aria-hidden="true">→</span></button>
          ${ch.more ? `<a class="btn ghost" href="${ch.more[1]}" target="_blank" rel="noopener">${esc(ch.more[0])} ↗</a>` : ''}
        </div>
      </div>
      <div class="ch-stage">
        <div class="frame"><div class="layers"></div><span class="hint mono"></span>${ch.hero ? `<button class="btn hero-more" data-open="${ch.id}">Details, media and videos <span aria-hidden="true">→</span></button>` : ''}</div>
        <div class="ch-tabs mono" role="tablist">${ch.views.map((v, i) => `<button role="tab" data-i="${i}" aria-selected="${i === 0}"><span>${esc(v.label)}</span><i><b></b></i></button>`).join('')}</div>
        ${ch.disclaimer ? `<p class="disclaimer mono">${esc(ch.disclaimer)}</p>` : ''}
      </div>
    </div>`;
  const st = { ch, sec, lens, total, starts, active: -1, mounted: false, els: new Map(), layers: [], applied: new Map(), visible: false };
  $$('.ch-tabs button', sec).forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.i, top = sec.offsetTop + flowTop();
    scrollTo({ top: top + starts[i] * total * VH + 4, behavior: reduce ? 'auto' : 'smooth' });
  }));
  chapterState.push(st);
  return sec;
}
const flowTop = () => $('#work').offsetTop;

async function mountChapter(st) {
  if (st.mounted) return; st.mounted = true;
  const host = $('.layers', st.sec);
  for (const [i, v] of st.ch.views.entries()) {
    let layer = null;
    if (v.el) {
      if (!st.els.has(v.el.tag)) {
        const el = document.createElement('div'); el.className = 'layer el-layer';
        host.append(el);
        st.els.set(v.el.tag, { layer: el, node: null, ready: makeEl(v.el).then((n) => { el.append(n); st.els.get(v.el.tag).node = n; return n; }).catch((e) => console.warn('element failed', v.el.tag, e)) });
      }
    }
    if (v.video || v.img || v.lottie || v.scrub || v.compare) {
      layer = document.createElement('div'); layer.className = 'layer' + (v.img || v.video ? ' media' : '') + (v.color ? ' color' : '');
      if (v.video) layer.append(makeVideo(v.video));
      if (v.img) { const im = new Image(); im.src = v.img; im.alt = `${st.ch.title}: ${v.label}`; im.className = 'fit'; im.loading = 'lazy'; layer.append(im); }
      if (v.lottie || v.scrub) { layer.classList.add('lottie'); layer.player = makeLottie(layer, v, !v.progress); }
      if (v.compare) { layer.classList.add('compare'); buildCompare(layer, v.compare); }
      host.append(layer);
    }
    st.layers[i] = layer;
  }
  st.active = -1; updateChapter(st, true);
}

function buildCompare(layer, src) {
  const vid = makeVideo(src); layer.append(vid);
  const handle = document.createElement('div'); handle.className = 'split'; handle.innerHTML = '<span class="mono">Model</span><i></i><span class="mono">Real</span>';
  layer.append(handle);
  let x = 0.5;
  const set = (k, free) => { x = free ? clamp(k) : clamp(k, 0.04, 0.96); vid.style.clipPath = `inset(0 0 0 ${x * 100}%)`; handle.style.left = `${x * 100}%`; handle.classList.toggle('away', x > 0.985); };
  set(0.5);
  layer.split = (k) => set(k, true);   // scroll-driven slide-in
  const move = (e) => { layer.userMoved = true; const r = layer.getBoundingClientRect(); set((e.clientX - r.left) / r.width); };
  handle.addEventListener('pointerdown', (e) => { handle.setPointerCapture(e.pointerId); e.preventDefault(); });
  handle.addEventListener('pointermove', (e) => { if (handle.hasPointerCapture(e.pointerId)) move(e); });
  layer.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !e.buttons && layer.classList.contains('follow')) move(e); });
  handle.tabIndex = 0; handle.setAttribute('role', 'slider'); handle.setAttribute('aria-label', 'Compare model and real video');
  handle.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') set(x - 0.05); if (e.key === 'ArrowRight') set(x + 0.05); });
}

function chapterProgress(st) {
  const top = st.sec.getBoundingClientRect().top;
  return clamp(-top / (st.total * VH));
}

function updateChapter(st, force) {
  const p = chapterProgress(st), { starts, ch } = st;
  let i = starts.length - 1; while (i > 0 && p < starts[i]) i--;
  const end = i + 1 < starts.length ? starts[i + 1] : 1;
  const local = clamp((p - starts[i]) / (end - starts[i] || 1));
  // tab bars
  $$('.ch-tabs button', st.sec).forEach((b, k) => {
    b.querySelector('b').style.transform = `scaleX(${k < i ? 1 : k === i ? local : 0})`;
  });
  if (i !== st.active || force) setView(st, i);
  if (!st.mounted) return;
  const v = ch.views[i];
  if (v.progress) {
    const val = v.progress === 'chapter' ? p : local;
    if (v.el) { const n = st.els.get(v.el.tag)?.node; if (n) n.progress = val; }
    if (v.lottie || v.scrub) st.layers[i]?.player?.then((pl) => pl.seek(val));
  }
  // full system demo: the model turns to the camera's angle first, then the real video slides in from the right;
  // after that the split is the reader's to drag
  if (v.compare) {
    const n = st.els.get(v.el.tag)?.node, layer = st.layers[i];
    if (n) n.demo = clamp(local / 0.4);
    st.sec.classList.toggle('demo-done', local >= 0.8);
    if (layer?.split) {
      if (local < 0.8) layer.userMoved = false;
      if (!layer.userMoved) layer.split(1 - 0.5 * smooth(clamp((local - 0.4) / 0.4)));
    }
  }
  if (ch.hero) st.sec.style.setProperty('--assemble', i === 0 ? local : 1);
}

function setView(st, i) {
  const prev = st.active; st.active = i;
  const v = st.ch.views[i];
  st.sec.dataset.view = v.id;
  st.sec.classList.toggle('after-first', i > 0);
  if (!v.compare) st.sec.classList.remove('demo-done');
  $$('.ch-tabs button', st.sec).forEach((b, k) => b.setAttribute('aria-selected', k === i));
  const hint = $('.hint', st.sec); hint.textContent = v.hint || ''; hint.classList.toggle('on', !!v.hint);
  if (!st.mounted) return;
  // element layers: visible if this view uses them; apply this view's attributes
  for (const [tag, e] of st.els) {
    const on = v.el && v.el.tag === tag;
    e.layer.classList.toggle('on', on);
    if (on) e.ready.then((n) => {
      if (!n || st.active !== i) return;
      const keys = st.applied.get(tag) || new Set();
      const want = v.el.attrs || {};
      keys.forEach((k) => { if (!(k in want)) n.removeAttribute(k); });
      for (const [k, val] of Object.entries(want)) if (n.getAttribute(k) !== val) n.setAttribute(k, val);
      st.applied.set(tag, new Set(Object.keys(want)));
      if (!v.progress && 'progress' in n && v.id !== 'assemble' && st.ch.hero) n.progress = 1;
      if (v.compare && n.syncVideo) n.syncVideo($('video', st.layers[i]));
      if (!v.compare && 'demo' in n) n.demo = null;
    });
  }
  st.layers.forEach((l, k) => {
    if (!l) return;
    const on = k === i; l.classList.toggle('on', on);
    if (!l.classList.contains('lottie')) $$('video', l).forEach((vid) => (on && st.visible && !reduce ? vid.play().catch(() => {}) : vid.pause()));
    l.player?.then((pl) => (on ? pl.play() : pl.pause()));
  });
  if (prev !== i) $('.frame', st.sec).classList.toggle('compare-on', !!v.compare);
}

const chapterIO = new IntersectionObserver((es) => es.forEach((e) => {
  const st = chapterState.find((s) => s.sec === e.target); if (!st) return;
  st.visible = e.isIntersecting;
  if (e.isIntersecting) { mountChapter(st); }
  setView(st, Math.max(0, st.active));
}), { rootMargin: '100% 0px' });

/* ═════════════ personal / professional flows ═════════════ */
const flowSwitch = $('#flow-switch'), veil = $('#flow-veil');
const flowState = { current: 'personal', seen: { personal: true, professional: false }, offsets: { personal: 0, professional: 0 }, auto: false };
function layout() {
  VH = innerHeight;
  chapterState.forEach((st) => { st.sec.style.height = `${Math.round((1 + st.total) * VH)}px`; });
}
function showFlow(name, { restore = true } = {}) {
  if (name === flowState.current) return;
  const top = flowTop();
  flowState.offsets[flowState.current] = clamp(scrollY - top, 0, flows[flowState.current].offsetHeight);
  const first = !flowState.seen[name];
  flows[flowState.current].hidden = true; flows[name].hidden = false;
  flowState.current = name; flowState.seen[name] = true;
  $$('button', flowSwitch).forEach((b) => b.setAttribute('aria-checked', b.dataset.flow === name));
  flowSwitch.dataset.flow = name;
  scrollTo({ top: top + (first || !restore ? 0 : flowState.offsets[name]), behavior: 'auto' });
  onScroll();
}
function swapWithVeil(name, opts) {
  veil.querySelector('span').textContent = name === 'professional' ? 'Next · Professional work' : 'Personal projects';
  veil.classList.add('on');
  setTimeout(() => { showFlow(name, opts); setTimeout(() => veil.classList.remove('on'), 120); }, reduce ? 0 : 320);
}
flowSwitch.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) swapWithVeil(b.dataset.flow); });
$$('[data-flow-link]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); const f = a.dataset.flowLink;
  if (f === flowState.current) scrollTo({ top: flowTop(), behavior: reduce ? 'auto' : 'smooth' }); else swapWithVeil(f, { restore: false });
}));

/* ═════════════ scroll loop ═════════════ */
let ticking = false, lastY = scrollY;
function onScroll() {
  ticking = false;
  const y = scrollY, top = flowTop(), h = flows[flowState.current].offsetHeight;
  chapterState.forEach((st) => { if (!st.sec.closest('.flow').hidden) updateChapter(st); });
  // the switch floats only while the chapters are on screen
  flowSwitch.classList.toggle('on', y > top - VH * 0.6 && y < top + h - VH * 0.9);
  // finished personal without ever looking at professional: continue there
  // only when the reader scrolled through the end, not when they jumped past it (nav links)
  const end = top + h - VH;
  if (flowState.current === 'personal' && !flowState.seen.professional && !flowState.auto && lastY > end - VH * 1.5 && lastY <= end + 4 && y > end + 4 && y < end + VH) {
    flowState.auto = true; swapWithVeil('professional');
  }
  $('#nav').classList.toggle('scrolled', y > 40);
  lastY = y;
  cardScrub();
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
let lastW = innerWidth;
addEventListener('resize', () => { if (innerWidth !== lastW || Math.abs(innerHeight - VH) > 120) { lastW = innerWidth; layout(); onScroll(); } drawLinks(); });

/* ═════════════ grid ═════════════ */
const grid = $('#grid'), scrubbers = [];
grid.innerHTML = cards.map((c) => `
  <a class="card" href="#${c.id}" data-open="${c.id}">
    <div class="thumb"></div>
    <div class="body">
      <div class="k mono"><span>${esc(c.kicker)}</span><span>Open →</span></div>
      <h4>${esc(c.title)}</h4>
      <p>${esc(c.blurb)}</p>
    </div>
  </a>`).join('');
const cardIO = new IntersectionObserver((es) => es.forEach(async (e) => {
  if (!e.isIntersecting) return; cardIO.unobserve(e.target);
  const c = cards.find((x) => x.id === e.target.dataset.open), box = $('.thumb', e.target), m = c.media;
  if (m.el) { const n = await makeEl(m.el).catch(() => null); if (n) { box.append(n); if (m.progress) scrubbers.push({ card: e.target, seek: (p) => { n.progress = p; } }); } }
  else if (m.lottie || m.scrub) { box.classList.add('lottie'); const pl = await makeLottie(box, m, false); scrubbers.push({ card: e.target, seek: pl.seek }); }
  else if (m.video) { const v = makeVideo(m.video); box.append(v); vidIO.observe(v); }
  else if (m.img) { const im = new Image(); im.src = m.img; im.alt = ''; im.className = 'fit'; box.append(im); }
  cardScrub();
}), { rootMargin: '300px 0px' });
$$('.card', grid).forEach((c) => cardIO.observe(c));
const vidIO = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting && !reduce ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: 0.2 });
function cardScrub() {
  scrubbers.forEach((s) => {
    const r = s.card.getBoundingClientRect();
    if (r.bottom < 0 || r.top > VH) return;
    s.seek(clamp((VH * 0.8 - r.top) / (VH * 0.8 + r.height * 0.5)));
  });
}

/* ═════════════ popup card ═════════════
   One template for every project: brief (text, points, skills, links), the headline media, up to four
   highlights at full size, a compact gallery that opens in the lightbox, documents, then the links again. */
const pop = $('#pop'), popBody = $('#pop-body'), lightbox = $('#lightbox');
let lastFocus = null, popId = null;
const ytThumb = (id) => `https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg`;
const isVid = (g) => ['video', 'youtube', 'vimeo'].includes(g.type);
const lbData = (g) => esc(JSON.stringify({ type: g.type || 'image', src: g.src, caption: g.caption || '' }));
const cap = (g) => (g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : '');
// full size, plays in place
function mediaBox(g, title) {
  if (g.type === 'video') return `<video controls playsinline preload="metadata" ${g.poster ? `poster="${g.poster}"` : ''} src="${g.src}"></video>`;
  if (g.type === 'youtube') return `<button class="yt" data-yt="${esc(g.src)}" aria-label="Play video${g.caption ? `: ${esc(g.caption)}` : ''}"><img loading="lazy" src="${ytThumb(g.src)}" alt=""><span class="play" aria-hidden="true"></span></button>`;
  if (g.type === 'vimeo') return `<iframe src="https://player.vimeo.com/video/${esc(g.src)}?dnt=1" title="${esc(g.caption || 'Video')}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  return `<button class="zoom" data-lb="${lbData(g)}"><img loading="lazy" src="${g.src}" alt="${esc(g.caption || title)}"></button>`;
}
// compact tile, opens in the lightbox
function tile(g, title) {
  const thumb = g.type === 'youtube' ? ytThumb(g.src) : g.type === 'video' ? g.poster : g.type === 'vimeo' ? '' : g.src;
  const media = thumb ? `<img loading="lazy" src="${thumb}" alt="${esc(g.caption || title)}">`
    : g.type === 'video' ? `<video muted playsinline preload="metadata" src="${g.src}#t=0.5"></video>` : '<span class="mono">Video</span>';
  return `<figure class="tile"><button data-lb="${lbData(g)}" aria-label="${esc(g.caption || 'Open media')}">${media}${isVid(g) ? '<span class="play" aria-hidden="true"></span>' : ''}</button>${cap(g)}</figure>`;
}
function openLightbox(g) {
  const box = $('.lb-media', lightbox);
  box.innerHTML = g.type === 'video' ? `<video controls autoplay playsinline src="${g.src}"></video>`
    : g.type === 'youtube' ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(g.src)}?autoplay=1&rel=0" title="Video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : g.type === 'vimeo' ? `<iframe src="https://player.vimeo.com/video/${esc(g.src)}?dnt=1&autoplay=1" title="Video" allow="autoplay; fullscreen" allowfullscreen></iframe>`
    : `<img src="${g.src}" alt="${esc(g.caption)}">`;
  $('.lb-cap', lightbox).textContent = g.caption || '';
  lightbox.hidden = false;
}
function closeLightbox() { lightbox.hidden = true; $('.lb-media', lightbox).innerHTML = ''; }
async function openPop(id, { push = true } = {}) {
  const p = allProjects.get(id); if (!p) return;
  await contentReady;
  const d = details[id] || {}, c = content.get(id) || {};
  lastFocus = lastFocus || document.activeElement; popId = id;
  const body = d.body || (c.summary ? [c.summary] : []);
  const points = p.points || c.bullets || [];
  const all = [...(d.gallery || []), ...(c.gallery || [])].filter((g, i, a) => a.findIndex((x) => x.src === g.src) === i);
  let links = [...(d.links || []), ...((c.links || []).map((l) => [l.label, l.href]))].filter((l, i, a) => a.findIndex((x) => x[1] === l[1]) === i);
  const docs = all.filter((g) => g.type === 'pdf');
  links.filter(([, u]) => /\.pdf$/i.test(u) && !docs.some((g) => g.src === u)).forEach(([t, u]) => docs.push({ type: 'pdf', src: u, caption: t }));
  links = links.filter(([, u]) => !/\.pdf$/i.test(u));
  let media = all.filter((g) => g.type !== 'pdf');
  const heroSrc = d.hero || media.find(isVid)?.src;
  const hero = media.find((g) => g.src === heroSrc) || (d.hero ? { type: 'youtube', src: d.hero } : null);
  media = media.filter((g) => g !== hero);
  const top = media.slice(0, 4), rest = media.slice(4);
  const linkRow = (cls) => (links.length ? `<div class="${cls}">${links.map(([t, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join('')}</div>` : '');
  popBody.innerHTML = `
    <header>
      <div class="meta mono"><span>${esc(p.org || p.kicker)}</span><span>${esc(p.dates || c.dates || '')}</span></div>
      <h3 id="pop-title">${esc(p.title)}</h3>
      ${p.role ? `<p class="role">${esc(p.role)}</p>` : ''}
    </header>
    <div class="pop-text">
      <div>${body.map((t) => `<p>${t}</p>`).join('')}</div>
      <aside>
        ${points.length ? `<ul class="points">${points.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${d.chips ? `<div class="chips">${d.chips.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}
        ${linkRow('links')}
      </aside>
    </div>
    <figure class="pop-hero"><div class="pop-stage">${hero ? mediaBox(hero, p.title) : ''}</div>${hero ? cap(hero) : ''}</figure>
    ${top.length ? `<div class="pop-top">${top.map((g) => `<figure><div class="box">${mediaBox(g, p.title)}</div>${cap(g)}</figure>`).join('')}</div>` : ''}
    ${rest.length ? `<h4 class="pop-h mono">More media · ${rest.length}</h4><div class="tiles">${rest.map((g) => tile(g, p.title)).join('')}</div>` : ''}
    ${docs.length ? `<div class="pop-docs">${docs.map((g) => `<a class="doc" href="${g.src}" target="_blank" rel="noopener"><span class="mono">PDF</span><b>${esc(g.caption || 'Report')}</b><span aria-hidden="true">↗</span></a>`).join('')}</div>` : ''}
    ${linkRow('pop-links')}`;
  if (!hero) {
    const stage = $('.pop-stage', popBody), lead = p.views ? p.views.find((v) => v.el && !v.compare) || p.views[0] : p.media;
    if (lead.el) makeEl(lead.el).then((n) => { stage.append(n); if ('progress' in n && lead.progress) n.progress = 1; }).catch(() => {});
    else if (lead.video) { const v = makeVideo(lead.video); stage.append(v); v.play().catch(() => {}); }
    else if (lead.img) { const im = new Image(); im.src = lead.img; im.className = 'fit'; im.alt = ''; stage.append(im); }
    else if (lead.lottie || lead.scrub) makeLottie(stage, { ...lead, loop: true }, true).then(() => { const v = $('video', stage); if (v) { v.loop = true; v.play().catch(() => {}); } });
  }
  pop.classList.add('open'); pop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('locked');
  $('.card-pop', pop).scrollTop = 0;
  $('.close', pop).focus({ preventScroll: true });
  if (push && location.hash !== `#${id}`) history.pushState({ pop: id }, '', `#${id}`);
}
function closePop({ push = true } = {}) {
  if (!popId) return; popId = null;
  pop.classList.remove('open'); pop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('locked');
  $$('video', popBody).forEach((v) => v.pause());
  setTimeout(() => { if (!popId) popBody.innerHTML = ''; }, 500);
  if (push && location.hash) history.pushState(null, '', location.pathname + location.search);
  lastFocus && lastFocus.focus({ preventScroll: true }); lastFocus = null;
}
document.addEventListener('click', (e) => {
  if (!lightbox.hidden) { if (e.target.closest('.close') || !e.target.closest('.lb-media > *')) closeLightbox(); return; }
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); lastFocus = o; openPop(o.dataset.open); return; }
  if (e.target.closest('[data-close]')) closePop();
  const yt = e.target.closest('.yt');
  if (yt) yt.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${yt.dataset.yt}?autoplay=1&rel=0" title="Video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  const lb = e.target.closest('[data-lb]');
  if (lb) { $$('video', popBody).forEach((v) => v.pause()); openLightbox(JSON.parse(lb.dataset.lb)); }
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!lightbox.hidden) closeLightbox(); else closePop();
});
function routeHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (allProjects.has(id)) openPop(id, { push: false }); else closePop({ push: false });
}
addEventListener('popstate', routeHash);
addEventListener('hashchange', routeHash);

/* ═════════════ skills map ═════════════ */
const skRoot = $('#skills-root'), skCanvas = $('canvas', skRoot), skCtx = skCanvas.getContext('2d');
$('#sk-groups').innerHTML = Object.entries(skills).map(([g, items]) => `
  <div class="sk-group"><span class="mono">${esc(g)}</span><div class="sk-list">${Object.keys(items).map((s) => `<button class="sk" data-g="${esc(g)}">${esc(s)}</button>`).join('')}</div></div>`).join('');
$('#sk-uses').innerHTML = uses.map(([id, label]) => `<li data-u="${id}"><button data-open="${id}"><span>${esc(label)}</span><span>Open →</span></button></li>`).join('');
let skActive = null, skAnim = 0, skRaf = 0;
function drawLinks() {
  const r = skRoot.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  skCanvas.width = r.width * d; skCanvas.height = r.height * d;
  skCtx.setTransform(d, 0, 0, d, 0, 0); skCtx.clearRect(0, 0, r.width, r.height);
  if (!skActive) return;
  const a = skActive.getBoundingClientRect(), ax = a.right - r.left, ay = a.top + a.height / 2 - r.top;
  skCtx.lineWidth = 1;
  $$('#sk-uses li.on').forEach((li, i) => {
    const b = li.getBoundingClientRect(), bx = b.left - r.left - 6, by = b.top + b.height / 2 - r.top;
    const k = clamp(skAnim * 1.6 - i * 0.12); if (k <= 0) return;
    skCtx.strokeStyle = `rgba(242,239,233,${0.12 + 0.4 * k})`;
    skCtx.beginPath(); skCtx.moveTo(ax, ay);
    const mx = (ax + bx) / 2, n = Math.floor(40 * k);
    for (let s = 1; s <= n; s++) {
      const t = s / 40, it = 1 - t;
      skCtx.lineTo(it ** 3 * ax + 3 * it * it * t * mx + 3 * it * t * t * mx + t ** 3 * bx, it ** 3 * ay + 3 * it * it * t * ay + 3 * it * t * t * by + t ** 3 * by);
    }
    skCtx.stroke();
    if (k >= 1) { skCtx.fillStyle = '#f2efe9'; skCtx.beginPath(); skCtx.arc(bx, by, 2.5, 0, 7); skCtx.fill(); }
  });
}
function setSkill(btn) {
  skActive = btn; skRoot.classList.toggle('idle', !btn);
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

/* ═════════════ boot ═════════════ */
for (const ch of chapters) flows[ch.flow].append(buildChapter(ch));
chapterState.forEach((st) => chapterIO.observe(st.sec));
layout();
initHero($('#hero-canvas'));
if (location.hash) routeHash();
onScroll();

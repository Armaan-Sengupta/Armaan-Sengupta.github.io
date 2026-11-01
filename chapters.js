// Pinned, scroll-driven project chapters, shared by the home page (main.js) and the plain project pages (/<project>/).
// A chapter is a section several viewports tall whose sticky stage shows one view at a time; scroll position picks
// the view and feeds progress to the view's element, lottie or scrub video.
import { chapters, cards, pagePath } from './data.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (t) => t * t * (3 - 2 * t);
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── loaders ── */
const scripts = new Map();
export function loadScript(src, classic) {
  if (!scripts.has(src)) {
    scripts.set(src, classic
      ? new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); })
      : import(`./${src}`));
  }
  return scripts.get(src);
}
export async function makeEl(spec) {
  await loadScript(spec.src, spec.classic);
  const el = document.createElement(spec.tag);
  for (const [k, v] of Object.entries(spec.attrs || {})) el.setAttribute(k, v);
  return el;
}
let lottieLib = null;
export const getLottie = () => (lottieLib ||= loadScript('elements/shared/vendor/lottie_light.min.js', true).then(() => window.lottie));

// a lottie (or its pre-rendered scrub video) in a box; returns { seek(p) }
export async function makeLottie(box, view, loop) {
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
export function makeVideo(src, { controls = false, loop = true } = {}) {
  const v = document.createElement('video');
  Object.assign(v, { muted: !controls, loop, playsInline: true, preload: controls ? 'none' : 'metadata', src, controls });
  v.poster = src.replace(/\.mp4$/, '.jpg');
  v.className = 'fit';
  return v;
}

/* ═════════════ chapters ═════════════ */
export let VH = innerHeight;
export const chapterState = [];

export function buildChapter(ch) {
  const sec = document.createElement('section');
  sec.className = 'chapter' + (ch.hero ? ' hero' : '') + (ch.mono ? ' mono-ch' : '');
  sec.id = `ch-${ch.id}`; sec.dataset.ch = ch.id;
  sec.setAttribute('aria-label', ch.title);
  const lens = ch.views.map((v) => v.len ?? 0.5);
  const total = lens.reduce((a, b) => a + b, 0);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0) / total);
  sec.innerHTML = `
    <div class="pin">
      <div class="ch-copy">
        <div class="meta mono"><span>${esc(ch.org || '')}</span><span>${esc(ch.dates || '')}</span></div>
        <h3>${ch.logo ? `<img class="logo" src="${ch.logo[0]}" alt="${esc(ch.title)}" style="height:${ch.logo[1]}em">` : esc(ch.title)}</h3>
        ${ch.role ? `<p class="role">${esc(ch.role)}</p>` : ''}
        <ul class="points">${ch.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="ch-actions">
          <a class="btn" href="${pagePath(ch.id)}" data-open="${ch.id}">Details <span aria-hidden="true">→</span></a>
          ${ch.more ? `<a class="btn ghost" href="${ch.more[1]}" target="_blank" rel="noopener">${esc(ch.more[0])} ↗</a>` : ''}
        </div>
      </div>
      <div class="ch-stage">
        <div class="frame"><div class="layers"></div><span class="hint mono"></span>${ch.hero ? `<a class="btn hero-more" href="${pagePath(ch.id)}" data-open="${ch.id}">Details <span aria-hidden="true">→</span></a>` : ''}</div>
        <div class="ch-tabs mono" role="tablist">${ch.views.map((v, i) => `<button role="tab" data-i="${i}" aria-selected="${i === 0}"><span>${esc(v.label)}</span><i><b></b></i></button>`).join('')}</div>
        ${ch.disclaimer ? `<p class="disclaimer mono">${esc(ch.disclaimer)}</p>` : ''}
      </div>
    </div>`;
  const st = { ch, sec, lens, total, starts, active: -1, mounted: false, els: new Map(), layers: [], applied: new Map(), visible: false };
  $$('.ch-tabs button', sec).forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.i, top = sec.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + starts[i] * total * VH + 4, behavior: reduce ? 'auto' : 'smooth' });
  }));
  chapterState.push(st);
  return sec;
}
const titleHTML = (ch) => (ch.logo ? `<img class="logo" src="${ch.logo[0]}" alt="${esc(ch.title)}" style="height:${ch.logo[1]}em">` : esc(ch.title));

// One thing on screen at a time: the project's name, then each visual full screen with a single caption,
// then the text. Consecutive views that share an element stay together as one beat so it can animate between them.
export function buildSequence(ch) {
  const wrap = document.createElement('section');
  wrap.className = 'seq' + (ch.mono ? ' mono-ch' : '');
  wrap.id = `ch-${ch.id}`; wrap.dataset.ch = ch.id; wrap.setAttribute('aria-label', ch.title);
  wrap.innerHTML = `
    <header class="seq-head">
      <div class="meta mono"><span>${esc([ch.org, ch.dates].filter(Boolean).join(' · '))}</span></div>
      <h3>${titleHTML(ch)}</h3>
      ${ch.role ? `<p class="role">${esc(ch.role)}</p>` : ''}
    </header>`;
  const groups = [];
  ch.views.forEach((v) => { const g = groups[groups.length - 1]; if (g && v.el && g[0].el && g[0].el.tag === v.el.tag) g.push(v); else groups.push([v]); });
  groups.forEach((views) => wrap.append(buildBeat({ ...ch, views })));
  const det = document.createElement('div'); det.className = 'seq-details';
  det.innerHTML = `
    <ul class="points">${ch.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <div class="ch-actions">
      <a class="btn" href="${pagePath(ch.id)}" data-open="${ch.id}">Details <span aria-hidden="true">→</span></a>
      ${ch.more ? `<a class="btn ghost" href="${ch.more[1]}" target="_blank" rel="noopener">${esc(ch.more[0])} ↗</a>` : ''}
    </div>`;
  wrap.append(det);
  return wrap;
}
export function buildHead(ch) {
  const head = document.createElement('header'); head.className = 'seq-head'; head.dataset.ch = ch.id;
  head.innerHTML = `
    <div class="meta mono"><span>${esc([ch.org, ch.dates].filter(Boolean).join(' · '))}</span></div>
    <h3>${titleHTML(ch)}</h3>
    ${ch.role ? `<p class="role">${esc(ch.role)}</p>` : ''}`;
  return head;
}
export function buildBeat(ch) {
  const sec = document.createElement('div');
  sec.className = 'chapter beat'; sec.dataset.ch = ch.id;
  const lens = ch.views.map((v) => v.len ?? 0.5);
  const total = lens.reduce((a, b) => a + b, 0);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0) / total);
  sec.innerHTML = `<div class="pin"><div class="ch-stage"><div class="frame"><div class="layers"></div><span class="hint mono"></span><p class="cap"></p></div></div></div>`;
  chapterState.push({ ch, sec, lens, total, starts, active: -1, mounted: false, els: new Map(), layers: [], applied: new Map(), visible: false });
  return sec;
}

export async function mountChapter(st) {
  if (st.mounted) return; st.mounted = true;
  const host = $('.layers', st.sec);
  for (const [i, v] of st.ch.views.entries()) {
    let layer = null;
    if (v.el) {
      if (!st.els.has(v.el.tag)) {
        const el = document.createElement('div'); el.className = 'layer el-layer';
        host.append(el);
        st.els.set(v.el.tag, { layer: el, node: null, ready: makeEl(v.el).then((n) => { el.append(n); st.els.get(v.el.tag).node = n; updateChapter(st); return n; }).catch((e) => console.warn('element failed', v.el.tag, e)) });
      }
    }
    if (v.video || v.img || v.swap || v.lottie || v.scrub || v.compare) {
      layer = document.createElement('div'); layer.className = 'layer' + (v.img || v.video || v.swap ? ' media' : '') + (v.color ? ' color' : '');
      if (v.video) {
        const vid = makeVideo(v.video, { loop: !v.once }); layer.append(vid);
        // the rocket from the scroll animation, back from apogee: the same full-size Borealis plunges nose-first down
        // the left of the screen, where the climb left it, as the launch clip ends
        if (v.fall) {
          const r = document.createElement('div'); r.className = 'fall-rocket'; r.setAttribute('aria-hidden', 'true');
          r.innerHTML = '<img src="elements/airbrakes/borealis.svg" alt="">';
          document.body.append(r);
          // it falls 5 s later than the clip's last moments: 3.5 s after the clip ends, if the reader is still here
          let timer = 0;
          vid.addEventListener('play', () => { clearTimeout(timer); r.classList.remove('go'); });
          vid.addEventListener('ended', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
              if (!st.visible || st.active !== i) return;
              r.classList.remove('go'); void r.offsetWidth; r.classList.add('go');
              document.documentElement.classList.add('rocket-fell');   // it only lands at the end of the page once it has fallen
            }, 3500);
          });
        }
        if (v.once) vid.addEventListener('timeupdate', () => { const b = $$('.ch-tabs b', st.sec)[i]; if (b && st.active === i && vid.duration) b.style.transform = `scaleX(${vid.currentTime / vid.duration})`; });
      }
      if (v.swap) v.swap.forEach((src, k) => { const im = new Image(); im.src = src; im.alt = `${st.ch.title}: ${v.label}${k ? ' (real)' : ' (render)'}`; im.className = 'fit' + (k ? ' swap-b' : ''); im.loading = 'lazy'; layer.append(im); });
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

export function updateChapter(st, force) {
  const p = chapterProgress(st), { starts, ch } = st;
  let i = starts.length - 1; while (i > 0 && p < starts[i]) i--;
  const end = i + 1 < starts.length ? starts[i + 1] : 1;
  const local = clamp((p - starts[i]) / (end - starts[i] || 1));
  // tab bars
  $$('.ch-tabs button', st.sec).forEach((b, k) => {
    if (k === i && ch.views[i].once) return;   // follows its video instead
    b.querySelector('b').style.transform = `scaleX(${k < i ? 1 : k === i ? local : 0})`;
  });
  if (ch.views[i].captions) { const cap = $('.cap', st.sec), c = ch.views[i].captions.filter(([, f]) => local >= f).pop(); if (cap && c && cap.textContent !== c[0]) cap.textContent = c[0]; }
  if (st.mounted && ch.views[i].swap) { const b = $('.swap-b', st.layers[i]); if (b) b.style.opacity = smooth(clamp((local - 0.3) / 0.4)); }
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
  const cap = $('.cap', st.sec); if (cap) cap.textContent = v.caption || (v.captions ? v.captions[0][0] : '');
  if (!st.mounted) return;
  // element layers: visible if this view uses them; apply this view's attributes
  for (const [tag, e] of st.els) {
    const on = !!(v.el && v.el.tag === tag);   // a bare undefined would make toggle() flip the class
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
    if (!l.classList.contains('lottie')) $$('video', l).forEach((vid) => {
      if (on && k !== prev && st.ch.views[k].once) vid.currentTime = 0;
      on && st.visible ? vid.play().catch(() => {}) : vid.pause();
    });
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


export function layoutChapters() {
  VH = innerHeight;
  chapterState.forEach((st) => { st.sec.style.height = `${Math.round((1 + st.total) * VH)}px`; });
}
// the nodes for one chapter as the home page lays it out; head: false leaves out the centred title header
export function buildProject(ch, { head = true } = {}) {
  if (ch.seq) { const s = buildSequence(ch); if (!head) s.querySelector('.seq-head')?.remove(); return [s]; }
  if (ch.intro) return [...(head ? [buildHead(ch)] : []), buildBeat({ ...ch, views: ch.views.slice(0, ch.intro) }), buildChapter({ ...ch, views: ch.views.slice(ch.intro) })];
  return [buildChapter(ch)];
}
export const observeChapters = () => chapterState.forEach((st) => chapterIO.observe(st.sec));

// A single project on its own page: its chapter (or, for a grid project with a live element, one full-screen beat),
// driven by this page's scroll. Returns false when the project has nothing live to show.
export function mountProject(host, id) {
  const ch = chapters.find((c) => c.id === id), card = cards.find((c) => c.id === id);
  let nodes = [];
  if (ch) nodes = buildProject(ch, { head: false });
  else if (card?.media && (card.media.el || card.media.lottie || card.media.scrub || card.media.video)) {
    const m = card.media;
    nodes = [buildBeat({ id, title: card.title, views: [{ id: 'live', label: card.title, ...m, progress: m.progress ? 'view' : undefined, len: m.progress ? 1.2 : 0.4 }] })];
  }
  if (!nodes.length) return false;
  host.append(...nodes);
  observeChapters(); layoutChapters();
  let ticking = false;
  const update = () => { ticking = false; chapterState.forEach((st) => updateChapter(st)); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  let lastW = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lastW || Math.abs(innerHeight - VH) > 120) { lastW = innerWidth; layoutChapters(); update(); } });
  update();
  return true;
}

import { initHero } from './hero.js';
import { chapters, cards, details, uses, skills, pagePath } from './data.js';
import { VH as _VH, chapterState, updateChapter, makeEl, makeLottie, makeVideo, buildProject, layoutChapters, observeChapters } from './chapters.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const allProjects = new Map([...cards, ...chapters].map((p) => [p.id, p]));   // a chapter's own entry wins over its grid card

/* ── content.json: galleries and extra facts scraped from the original site ── */
let content = new Map();
let story = {};
const storyReady = fetch('story.json').then((r) => (r.ok ? r.json() : {})).then((j) => { story = j; }).catch(() => {});
const contentReady = fetch('content.json').then((r) => (r.ok ? r.json() : { projects: [] }))
  .then((j) => { content = new Map((j.projects || []).map((p) => [p.id, p])); }).catch(() => {});

/* ── chapters live in chapters.js (shared with the project pages) ── */
let VH = _VH;
const flows = { personal: $('[data-flow="personal"].flow'), professional: $('[data-flow="professional"].flow') };
const flowTop = () => $('#work').offsetTop;

/* ═════════════ personal / professional flows ═════════════ */
const flowSwitch = $('#flow-switch'), veil = $('#flow-veil');
const flowState = { current: 'personal', seen: { personal: true, professional: false }, offsets: { personal: 0, professional: 0 }, auto: false };
function layout() { layoutChapters(); VH = innerHeight; }
function showFlow(name, { restore = true } = {}) {
  if (name === flowState.current) return;
  const top = flowTop();
  flowState.offsets[flowState.current] = clamp(scrollY - top, 0, flows[flowState.current].offsetHeight);
  const first = !flowState.seen[name];
  flows[flowState.current].hidden = true; flows[name].hidden = false;
  flowState.current = name; flowState.seen[name] = true; buildRail();
  $$('button', flowSwitch).forEach((b) => b.setAttribute('aria-checked', b.dataset.flow === name));
  flowSwitch.dataset.flow = name;
  scrollTo({ top: top + (first || !restore ? 0 : flowState.offsets[name]), behavior: 'auto' });
  onScroll();
}
// the switch stays in front, grows and slides its selection across while the page fades out under it;
// the other flow then rises in as the fade lifts
function swapWithVeil(name, opts) {
  if (name === flowState.current) return;
  $$('button', flowSwitch).forEach((b) => b.setAttribute('aria-checked', b.dataset.flow === name));
  flowSwitch.dataset.flow = name;
  flowSwitch.classList.add('swapping');
  veil.querySelector('span').textContent = '';
  veil.classList.add('on');
  setTimeout(() => {
    showFlow(name, opts);
    const f = flows[name]; f.classList.remove('flow-enter'); void f.offsetWidth; f.classList.add('flow-enter');
    setTimeout(() => veil.classList.remove('on'), reduce ? 0 : 250);
    setTimeout(() => flowSwitch.classList.remove('swapping'), reduce ? 0 : 900);
  }, reduce ? 0 : 1000);
}
flowSwitch.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) swapWithVeil(b.dataset.flow); });
$$('[data-flow-link]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); const f = a.dataset.flowLink;
  if (f === flowState.current) scrollTo({ top: flowTop(), behavior: reduce ? 'auto' : 'smooth' }); else swapWithVeil(f, { restore: false });
}));

/* ═════════════ scroll loop ═════════════ */
let ticking = false, lastY = scrollY;
/* ═════════════ where-you-are rail ═════════════
   A stack of short lines on the left, one per section, the current one brighter; hovering opens the names,
   clicking jumps there. Follows the current flow, then Projects, Skills and Volunteering. While open, a small
   Personal / Professional toggle changes which list it shows; the page only switches once an item is clicked. */
const rail = document.createElement('nav'); rail.className = 'rail'; rail.setAttribute('aria-label', 'Sections');
document.body.append(rail);
let railItems = [], railFlow = null;
function buildRail(show = flowState.current) {
  railFlow = show;
  railItems = [
    ...chapters.filter((c) => c.flow === show).map((c) => ({ label: c.title, flow: c.flow, el: () => $(`[data-ch="${c.id}"]`, flows[c.flow]) })),
    { label: 'Projects', el: () => $('#projects') }, { label: 'Skills', el: () => $('#skills') }, { label: 'Volunteering', el: () => $('#volunteering') }
  ];
  rail.innerHTML = `<div class="rail-flow">${['personal', 'professional'].map((f) => `<button data-f="${f}" class="${f === show ? 'on' : ''}">${f === 'personal' ? 'Personal' : 'Professional'}</button>`).join('')}</div>`
    + railItems.map((it, i) => `<button data-i="${i}"><i></i><span>${esc(it.label)}</span></button>`).join('');
  updateRail();
}
rail.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.f) { if (b.dataset.f !== railFlow) buildRail(b.dataset.f); return; }
  const it = railItems[+b.dataset.i];
  const jump = () => { const el = it.el(); if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 10, behavior: reduce ? 'auto' : 'smooth' }); };
  if (it.flow && it.flow !== flowState.current) { swapWithVeil(it.flow, { restore: false }); setTimeout(jump, reduce ? 0 : 1100); } else jump();
});
rail.addEventListener('mouseleave', () => { if (railFlow !== flowState.current) buildRail(); });
function updateRail() {
  let cur = -1;
  railItems.forEach((it, i) => { if (it.flow && it.flow !== flowState.current) return; const el = it.el(); if (el && el.getBoundingClientRect().top < VH * 0.45) cur = i; });
  rail.classList.toggle('on', cur >= 0);
  $$('button[data-i]', rail).forEach((b, i) => b.classList.toggle('cur', i === cur));
}

function onScroll() {
  ticking = false;
  updateRail();
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
  <a class="card" href="${pagePath(c.id)}" data-open="${c.id}">
    <div class="thumb"></div>
    <div class="body">
      ${c.date ? `<div class="k mono"><span>${esc(c.date)}</span></div>` : ''}
      <h3>${esc(c.title)}</h3>
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
const vidIO = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())), { threshold: 0.2 });
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
  await Promise.all([contentReady, storyReady]);
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
      <div class="meta mono"><span>${esc(p.org || p.kicker)}</span><span>${esc(p.dates || p.date || c.dates || '')}</span></div>
      <h2 id="pop-title">${esc(p.title)}</h2>
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
    ${story[id] ? `<div class="pop-story">${story[id].map(([h, ps, list, after]) => `<section><h3>${esc(h)}</h3>${ps.map((t) => `<p>${esc(t)}</p>`).join('')}${list ? `<ul class="points">${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${(after || []).map((t) => `<p>${esc(t)}</p>`).join('')}</section>`).join('')}</div>` : ''}
    ${rest.length ? `<div class="tiles">${rest.map((g) => tile(g, p.title)).join('')}</div>` : ''}
    ${docs.length ? `<div class="pop-docs">${docs.map((g) => `<a class="doc" href="${g.src}" target="_blank" rel="noopener"><span class="mono">PDF</span><b>${esc(g.caption || 'Report')}</b><span aria-hidden="true">↗</span></a>`).join('')}</div>` : ''}
    ${linkRow('pop-links')}`;
  if (!hero) {
    const stage = $('.pop-stage', popBody), lead = p.views ? p.views.find((v) => v.el && !v.compare) || p.views[0] : p.media;
    if (lead.el) makeEl(lead.el).then((n) => { stage.append(n); if ('progress' in n && lead.progress) n.progress = 1; }).catch(() => {});
    else if (lead.video) { const v = makeVideo(lead.video); stage.append(v); v.play().catch(() => {}); }
    else if (lead.img) { const im = new Image(); im.src = lead.img; im.className = 'fit'; im.alt = ''; stage.append(im); }
    else if (lead.lottie || lead.scrub) makeLottie(stage, { ...lead, loop: true }, true).then(() => { const v = $('video', stage); if (v) { v.loop = true; v.play().catch(() => {}); } });
  }
  pop.classList.add('open'); pop.setAttribute('aria-hidden', 'false'); pop.inert = false;
  document.documentElement.classList.add('locked');
  $('.card-pop', pop).scrollTop = 0;
  $('.close', pop).focus({ preventScroll: true });
  if (push && location.hash !== `#${id}`) history.pushState({ pop: id }, '', `#${id}`);
}
function closePop({ push = true } = {}) {
  if (!popId) return; popId = null;
  pop.classList.remove('open'); pop.setAttribute('aria-hidden', 'true'); pop.inert = true;
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
// section anchors from the old site and résumé links, mapped to project ids here
const LEGACY = { 'communication-protocol': 'measurement', 'stewart-platform': 'platform', 'segway-system-modeling': 'segway', hmi: 'fyelabs', visualizer: 'fyelabs' };
function routeHash() {
  let id = decodeURIComponent(location.hash.slice(1)); id = LEGACY[id] || id;
  if (id === 'personal' || id === 'professional') {   // #professional opens the work section on that flow
    closePop({ push: false });
    if (id !== flowState.current) swapWithVeil(id, { restore: false }); else scrollTo({ top: flowTop() });
    return;
  }
  if (allProjects.has(id)) openPop(id, { push: false }); else closePop({ push: false });
}
addEventListener('popstate', routeHash);
addEventListener('hashchange', routeHash);

/* ═════════════ skills map ═════════════ */
const skRoot = $('#skills-root'), skCanvas = $('canvas', skRoot), skCtx = skCanvas.getContext('2d');
$('#sk-groups').innerHTML = Object.entries(skills).map(([g, items]) => `
  <div class="sk-group"><span class="mono">${esc(g)}</span><div class="sk-list">${Object.keys(items).map((s) => `<button class="sk" data-g="${esc(g)}">${esc(s)}</button>`).join('')}</div></div>`).join('');
$('#sk-uses').innerHTML = uses.map(([id, label]) => `<li data-u="${id}"><button data-open="${id}"><span>${esc(label)}</span><span aria-hidden="true">→</span></button></li>`).join('');
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
// touch screens: no hover and no room for the lines, so a tap lists the skill's projects right under its group
const touchSkills = matchMedia('(hover: none), (max-width: 860px)');
const useLabel = new Map(uses);
if (touchSkills.matches) $('#sk-hint').textContent = 'Tap one to see where it was used.';
$$('.sk').forEach((b) => b.addEventListener('click', () => {
  if (!touchSkills.matches) return;
  const again = b.classList.contains('tapped');
  $$('.sk-tap').forEach((e) => e.remove()); $$('.sk.tapped').forEach((x) => x.classList.remove('tapped'));
  if (again) return;
  b.classList.add('tapped');
  const box = document.createElement('div'); box.className = 'sk-tap';
  box.innerHTML = skills[b.dataset.g][b.textContent].map((id) => `<button data-open="${id}">${esc(useLabel.get(id) || id)} <span aria-hidden="true">→</span></button>`).join('');
  b.closest('.sk-group').append(box);
}));

/* ═════════════ reduce motion ═════════════ */
{
  const on = document.documentElement.classList.contains('rm');
  $$('.motion-toggle').forEach((b) => {
    const label = on ? 'Turn motion back on' : 'Reduce motion';
    b.innerHTML = on
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    b.title = label; b.setAttribute('aria-label', label); b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', () => { try { if (!on) sessionStorage.setItem('motion', 'reduce'); } catch (e) {} location.reload(); });
  });
}

/* ═════════════ boot ═════════════ */
buildRail();
for (const ch of chapters) flows[ch.flow].append(...buildProject(ch));
observeChapters();
layout();
initHero($('#hero-canvas'));
if (location.hash) routeHash();
onScroll();

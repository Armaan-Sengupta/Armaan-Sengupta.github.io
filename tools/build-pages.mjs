// Builds a plain, crawlable page for every project at its own root path (pagePath in data.js), the redirects for
// every old address (the old Wix site's pages and the earlier /work/<id>/ pages), 404.html, sitemap.xml and the
// Cloudflare Bulk Redirect list, all from the same data the interactive site uses. The home page stays the
// interactive version; these pages exist so search engines and link previews see the actual content.
// It runs inside the build output folder; use tools/build.mjs, which copies the site there first.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

const ORIGIN = 'https://www.armaansengupta.ca';   // the host the old site was indexed under
const NAME = 'Armaan Sengupta';
const tmp = join(tmpdir(), `site-data-${process.pid}.mjs`);
copyFileSync('data.js', tmp);
const { chapters, cards, details, pagePath } = await import(pathToFileURL(tmp).href);
const story = JSON.parse(readFileSync('story.json', 'utf8'));
const content = new Map(JSON.parse(readFileSync('content.json', 'utf8')).projects.map((p) => [p.id, p]));
// A project's details as its popup on the home page shows them: data.js first, then the galleries and links
// gathered from the old site (content.json), without duplicates; the first video becomes the lead video.
function detailsFor(id) {
  const d = details[id] || {}, c = content.get(id) || {};
  const gallery = [...(d.gallery || []), ...(c.gallery || [])].filter((g, i, a) => a.findIndex((x) => x.src === g.src) === i);
  const links = [...(d.links || []), ...(c.links || []).map((l) => [l.label, l.href])].filter((l, i, a) => a.findIndex((x) => x[1] === l[1]) === i);
  const hero = d.hero || gallery.find((g) => g.type === 'youtube')?.src;
  // the old site's one-line summary stands in for a body only where there is no story to tell it already
  return { ...d, hero, body: d.body || (c.summary && !story[id] ? [c.summary] : []), gallery: gallery.filter((g) => !(g.type === 'youtube' && g.src === hero)), links };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = (src) => (/^https?:/.test(src) ? src : '/' + src.replace(/^\/+/, ''));
const full = (src) => (/^https?:/.test(src) ? src : ORIGIN + abs(src));
const clip = (s, n = 158) => { s = s.replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, c.lastIndexOf(' ')).replace(/[,;:·–-]$/, '') + '…'; };

// Height of a project's live section, in viewport heights, mirroring how chapters.js lays it out (each pinned
// section is 1 + the sum of its views' scroll lengths). Written into the page so the text below does not jump
// when the section mounts.
const sectionVH = (views) => 1 + views.reduce((s, v) => s + (v.len ?? 0.5), 0);
function liveVH(id) {
  const ch = chapters.find((c) => c.id === id), m = cards.find((c) => c.id === id)?.media;
  if (ch?.seq) {
    const groups = [];
    ch.views.forEach((v) => { const g = groups[groups.length - 1]; if (g && v.el && g[0].el && g[0].el.tag === v.el.tag) g.push(v); else groups.push([v]); });
    return groups.reduce((s, g) => s + sectionVH(g), 0);
  }
  if (ch?.intro) return sectionVH(ch.views.slice(0, ch.intro)) + sectionVH(ch.views.slice(ch.intro));
  if (ch) return sectionVH(ch.views);
  if (m && (m.el || m.lottie || m.scrub || m.video)) return 1 + (m.progress ? 1.2 : 0.4);
  return 0;
}

// one entry per id; a chapter wins over its grid card but borrows the card's blurb
const order = [...chapters.map((c) => c.id), ...cards.map((c) => c.id)].filter((id, i, a) => a.indexOf(id) === i);
const items = order.map((id) => {
  const ch = chapters.find((c) => c.id === id), cd = cards.find((c) => c.id === id), d = detailsFor(id);
  const pro = ch?.flow === 'professional';
  const meta = ch ? (pro ? [ch.role, ch.org, ch.dates] : [ch.role, ch.dates]) : [cd.kicker, cd.date];
  const summary = cd?.blurb || d.body?.[0] || ch?.points?.join('. ') || '';
  const img = (d.gallery || []).find((g) => g.type === 'image')?.src || cd?.media?.img || (d.gallery || []).find((g) => g.poster)?.poster || 'media/og.jpg';
  return { id, title: ch?.title || cd.title, pro, meta: meta.filter(Boolean), points: ch?.points || [], summary, d, story: story[id] || [], img };
});

const head = ({ title, desc, url, image, ld }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="/">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="author" content="${NAME}">
<meta name="theme-color" content="#08080a">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap"></noscript>
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/project.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<header class="top"><a class="brand" href="/"><span class="dot"></span>${NAME}</a><nav><a href="/#projects">All projects</a><a href="/#contact">Contact</a></nav></header>
`;
const foot = `<footer><a href="/">armaansengupta.ca</a><span>© ${new Date().getFullYear()} ${NAME}</span></footer>
<script>document.addEventListener('click', (e) => { const b = e.target.closest('.yt-play'); if (!b) return;
  b.outerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + b.dataset.yt + '?autoplay=1" title="' + b.getAttribute('aria-label').replace('Play the ', '') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'; });</script>
</body>
</html>
`;
const person = { '@type': 'Person', name: NAME, url: ORIGIN + '/' };

function media(g, title) {
  const cap = g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : '';
  if (g.type === 'image') return `<figure><img loading="lazy" src="${abs(g.src)}" alt="${esc(g.caption || title)}">${cap}</figure>`;
  if (g.type === 'video') return `<figure><video controls muted playsinline preload="none"${g.poster ? ` poster="${abs(g.poster)}"` : ''} src="${abs(g.src)}"></video>${cap}</figure>`;
  if (g.type === 'youtube') return `<figure><a class="yt" href="https://www.youtube.com/watch?v=${esc(g.src)}" target="_blank" rel="noopener"><img loading="lazy" src="https://i.ytimg.com/vi/${esc(g.src)}/hqdefault.jpg" alt="${esc(g.caption || title)} (YouTube)"><span>▶</span></a>${cap}</figure>`;
  if (g.type === 'pdf') return `<p class="doc"><a href="${abs(g.src)}" target="_blank" rel="noopener">${esc(g.caption || 'Document')} (PDF)</a></p>`;
  return '';
}

function page(it, i) {
  const url = ORIGIN + pagePath(it.id), d = it.d;
  const title = `${it.title}${it.pro ? ' · ' + it.meta[0].split(' · ')[0] : ''} · ${NAME}`;
  const desc = clip(it.summary);
  const prev = items[(i - 1 + items.length) % items.length], next = items[(i + 1) % items.length];
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CreativeWork', name: it.title, headline: it.title, description: desc, url, image: full(it.img), author: person, keywords: (d.chips || []).join(', ') || undefined },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Projects', item: ORIGIN + '/#projects' },
      { '@type': 'ListItem', position: 3, name: it.title, item: url }] }] };
  const body = [
    `<main class="wrap">`,
    `<p class="crumbs"><a href="/#projects">Projects</a> / ${esc(it.title)}</p>`,
    `<h1>${esc(it.title)}</h1>`,
    it.meta.length ? `<p class="meta">${it.meta.map(esc).join(' · ')}</p>` : '',
    `<p class="lede">${esc(it.summary)}</p>`,
    it.points.length ? `<ul class="points">${it.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : '',
    // the project's live, scroll-driven chapter from the home page, full width; removed if it has nothing live
    `</main>
<div class="live" id="live"${liveVH(it.id) ? ` style="min-height:${Math.round(liveVH(it.id) * 100)}vh"` : ''}></div>
<script type="module">import { mountProject } from '/chapters.js'; const h = document.getElementById('live'); if (!mountProject(h, '${it.id}')) h.remove();</script>
<main class="wrap rest">`,
    d.hero ? `<div class="video-hero"><button class="yt-play" data-yt="${esc(d.hero)}" aria-label="Play the ${esc(it.title)} video"><img src="https://i.ytimg.com/vi/${esc(d.hero)}/hqdefault.jpg" alt="" loading="lazy"><span aria-hidden="true">▶</span></button></div>` : '',
    ...(d.body || []).slice(it.summary === d.body?.[0] ? 1 : 0).map((p) => `<p>${esc(p)}</p>`),
    ...it.story.map(([h, ps, list, after]) => `<section><h2>${esc(h)}</h2>${(ps || []).map((p) => `<p>${esc(p)}</p>`).join('')}${list ? `<ul>${list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${(after || []).map((p) => `<p>${esc(p)}</p>`).join('')}</section>`),
    d.chips?.length ? `<ul class="chips" aria-label="Skills">${d.chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '',
    (d.gallery || []).length ? `<section class="gallery"><h2>Media</h2>${d.gallery.map((g) => media(g, it.title)).join('')}</section>` : '',
    `<p class="actions"><a class="btn" href="/#${it.id}">See it on the interactive site</a>${(d.links || []).map(([l, u]) => `<a class="btn ghost" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</p>`,
    `<nav class="pn"><a href="${pagePath(prev.id)}">← ${esc(prev.title)}</a><a href="${pagePath(next.id)}">${esc(next.title)} →</a></nav>`,
    `</main>`
  ].filter(Boolean).join('\n');
  writeFileSync(`${pagePath(it.id).slice(1)}.html`, head({ title, desc, url, image: full(it.img), ld }) + body + '\n' + foot);
}
items.forEach(page);

// The home page's chapters and cards are built by script, so its HTML alone linked to none of these pages. The grid
// starts out holding a plain link to each one, which main.js replaces with the real cards as soon as it runs.
const GRID = '<div class="grid" id="grid"></div>', home = readFileSync('index.html', 'utf8');
if (!home.includes(GRID)) throw new Error('index.html no longer has the empty grid to fill');
writeFileSync('index.html', home.replace(GRID, () => `<div class="grid" id="grid">${items.map((it) => `<a class="card" href="${pagePath(it.id)}"><div class="body"><h3>${esc(it.title)}</h3><p>${esc(clip(it.summary))}</p></div></a>`).join('')}</div>`));

/* ── redirects ──
   Every old address that is not a page itself: the old Wix site's pages (and the section anchors the résumé
   links into), and the earlier /work/<id>/ pages. Each gets a tiny page that redirects at once and names its
   target as canonical; 404.html catches other casings; the same table is written out as a Cloudflare Bulk
   Redirect list for true 301s if the domain ever moves behind Cloudflare. */
const P = pagePath;
const OLD = {
  ...Object.fromEntries(['home', 'under-construction', 'about-me', 'education', 'academic-achivment', 'certifications', 'copy-of-activities-and-honors', 'waterloo-class-list'].map((p) => [p, '/'])),
  'contact-me': '/#contact', experience: '/#professional', experiences: '/#professional',
  'first-year': P('gooseminator'), 'second-year': P('measurement'), 'third-year': P('platform'),
  ...Object.fromEntries(['projects', 'personal-projects', 'school-projects', 'grade-9', 'grade-10', 'grade-11'].map((p) => [p, '/#projects'])),
  skills: '/#skills', 'technlogical-skills': '/#skills',
  ...Object.fromEntries(['robotics', 'leadership', 'leadership-and-volunteering', 'clubs', 'gratitude-letters'].map((p) => [p, '/#volunteering'])),
  resume: '/media/Armaan_Sengupta_Resume.pdf',
  work: '/#projects',
  ...Object.fromEntries(items.map((it) => [`work/${it.id}`, P(it.id)]))
};
const pages = new Set(items.map((it) => P(it.id).slice(1)));
for (const k of Object.keys(OLD)) if (pages.has(k)) throw new Error(`old path ${k} is now a page`);
// section anchors from the old site, mapped to the project they described
const ANCHOR = { 'communication-protocol': P('measurement'), 'stewart-platform': P('platform'), 'segway-system-modeling': P('segway'), hmi: P('fyelabs'), visualizer: P('fyelabs') };
const redirectPage = (to) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${NAME}</title>
<link rel="canonical" href="${ORIGIN}${to}">
<meta http-equiv="refresh" content="0; url=${to}">
<script>var a=${JSON.stringify(ANCHOR)};location.replace(a[location.hash.slice(1)]||'${to}');</script>
<style>body{background:#08080a;color:#f2efe9;font:16px system-ui;padding:40px}a{color:inherit}</style>
</head><body><a href="${to}">Continue to armaansengupta.ca</a></body></html>
`;
// old Wix paths had no trailing slash, so they are <path>.html; the short-lived /work/ pages had one
for (const [from, to] of Object.entries(OLD)) {
  if (from === 'work' || from.startsWith('work/')) { mkdirSync(from, { recursive: true }); writeFileSync(`${from}/index.html`, redirectPage(to)); }
  else writeFileSync(`${from}.html`, redirectPage(to));
}

// 404: old addresses in any casing, with or without the trailing slash
const LOWER = { ...OLD, ...Object.fromEntries([...pages].map((p) => [p, `/${p}`])) };
writeFileSync('404.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Not found · ${NAME}</title>
<script>var M=${JSON.stringify(LOWER)},A=${JSON.stringify(ANCHOR)};
var p=location.pathname.toLowerCase().replace(/^\\/+|\\/+$/g,''),h=location.hash.slice(1);
if(M[p]!==undefined)location.replace(A[h]||M[p]);</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08080a;color:#f2efe9;font:16px Inter,system-ui,sans-serif;text-align:center}
h1{font-weight:500;font-size:28px;margin:0 0 12px}p{color:rgba(242,239,233,.6);margin:0 0 24px}a{color:#f2efe9}</style>
</head><body><div><h1>That page moved</h1><p>The site was rebuilt and this address no longer exists.</p><a href="/">Go to the homepage</a></div></body></html>
`);

// Cloudflare Bulk Redirect list (node tools/build-pages.mjs --csv <file>): source, target, status, preserve query,
// include subdomains, subpath matching, preserve path suffix
const csvAt = process.argv.indexOf('--csv');
if (csvAt > 0) writeFileSync(process.argv[csvAt + 1], Object.entries(OLD).flatMap(([from, to]) => [`www.armaansengupta.ca/${from}`, `www.armaansengupta.ca/${from}/`]
  .map((src) => `${src},${ORIGIN}${to},301,true,true,false,false`)).join('\n') + '\n');

// sitemap
const urls = ['/', ...items.map((it) => P(it.id)), '/media/Armaan_Sengupta_Resume.pdf'];
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`${items.length} project pages, ${Object.keys(OLD).length} redirects, sitemap with ${urls.length} urls`);

// Builds a plain, crawlable page for every project at /work/<id>/ (plus the /work/ index and sitemap.xml) from
// the same data the interactive site uses. The home page stays the interactive version; these exist so search
// engines and link previews see the actual content. Run from the site folder after editing data.js or story.json:
//   node tools/build-pages.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

const ORIGIN = 'https://armaansengupta.ca';
const NAME = 'Armaan Sengupta';
const tmp = join(tmpdir(), `site-data-${process.pid}.mjs`);
copyFileSync('data.js', tmp);
const { chapters, cards, details } = await import(pathToFileURL(tmp).href);
const story = JSON.parse(readFileSync('story.json', 'utf8'));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = (src) => (/^https?:/.test(src) ? src : '/' + src.replace(/^\/+/, ''));
const full = (src) => (/^https?:/.test(src) ? src : ORIGIN + abs(src));
const clip = (s, n = 158) => { s = s.replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, c.lastIndexOf(' ')).replace(/[,;:·–-]$/, '') + '…'; };

// one entry per id; a chapter wins over its grid card but borrows the card's blurb
const order = [...chapters.map((c) => c.id), ...cards.map((c) => c.id)].filter((id, i, a) => a.indexOf(id) === i);
const items = order.map((id) => {
  const ch = chapters.find((c) => c.id === id), cd = cards.find((c) => c.id === id), d = details[id] || {};
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
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/work/work.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<header class="top"><a class="brand" href="/"><span class="dot"></span>${NAME}</a><nav><a href="/#projects">All projects</a><a href="/#contact">Contact</a></nav></header>
`;
const foot = `<footer><a href="/">armaansengupta.ca</a><span>© ${new Date().getFullYear()} ${NAME}</span></footer>
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
  const url = `${ORIGIN}/work/${it.id}/`, d = it.d;
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
<div class="live" id="live"></div>
<script type="module">import { mountProject } from '/chapters.js'; const h = document.getElementById('live'); if (!mountProject(h, '${it.id}')) h.remove();</script>
<main class="wrap rest">`,
    d.hero ? `<div class="video-hero"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${esc(d.hero)}" title="${esc(it.title)} video" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>` : '',
    ...(d.body || []).slice(it.summary === d.body?.[0] ? 1 : 0).map((p) => `<p>${esc(p)}</p>`),
    ...it.story.map(([h, ps, list, after]) => `<section><h2>${esc(h)}</h2>${(ps || []).map((p) => `<p>${esc(p)}</p>`).join('')}${list ? `<ul>${list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${(after || []).map((p) => `<p>${esc(p)}</p>`).join('')}</section>`),
    d.chips?.length ? `<ul class="chips" aria-label="Skills">${d.chips.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '',
    (d.gallery || []).length ? `<section class="gallery"><h2>Media</h2>${d.gallery.map((g) => media(g, it.title)).join('')}</section>` : '',
    `<p class="actions"><a class="btn" href="/#${it.id}">See it on the interactive site</a>${(d.links || []).map(([l, u]) => `<a class="btn ghost" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('')}</p>`,
    `<nav class="pn"><a href="/work/${prev.id}/">← ${esc(prev.title)}</a><a href="/work/${next.id}/">${esc(next.title)} →</a></nav>`,
    `</main>`
  ].filter(Boolean).join('\n');
  mkdirSync(`work/${it.id}`, { recursive: true });
  writeFileSync(`work/${it.id}/index.html`, head({ title, desc, url, image: full(it.img), ld }) + body + '\n' + foot);
}
items.forEach(page);

// /work/ itself: the project list lives on the home page
writeFileSync('work/index.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Projects · ${NAME}</title>
<link rel="canonical" href="${ORIGIN}/#projects">
<meta http-equiv="refresh" content="0; url=/#projects">
<script>location.replace('/#projects');</script>
</head><body><a href="/#projects">Projects</a></body></html>
`);

// sitemap
const urls = ['/', ...items.map((it) => `/work/${it.id}/`), '/media/Armaan_Sengupta_Resume.pdf'];
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`${items.length} project pages, /work/ redirect, sitemap with ${urls.length} urls`);

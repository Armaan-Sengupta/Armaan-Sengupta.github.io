// Builds the deployable site into _site/: copies the source, generates the project pages, redirects, 404 and
// sitemap (tools/build-pages.mjs), then minifies the JavaScript and CSS. GitHub Actions runs this on every push to
// main (.github/workflows/pages.yml). To preview locally (from any folder):
//   node <site>/tools/build.mjs      (add --no-minify to keep readable output)
//   node <site>/tools/serve.mjs      then open http://localhost:8740
import { cpSync, rmSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)), OUT = join(ROOT, '_site');   // the site folder, wherever this is run from
// not published: build tooling, notes, repository files
const SKIP = new Set(['_site', 'tools', '.github', '.git', 'node_modules', 'README.md', '.gitignore', '.nojekyll']);

rmSync(OUT, { recursive: true, force: true });
for (const f of readdirSync(ROOT)) if (!SKIP.has(f)) cpSync(join(ROOT, f), join(OUT, f), { recursive: true });

process.chdir(OUT);
await import(new URL('./build-pages.mjs', import.meta.url).href);

if (!process.argv.includes('--no-minify')) {
  // each file on its own (no bundling), so module paths and import.meta.url stay exactly as written
  const files = [];
  const walk = (dir) => readdirSync(dir).forEach((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!p.includes(join('shared', 'vendor'))) walk(p); }
    else if (/\.(m?js|css)$/.test(f) && !/\.min\.js$/.test(f)) files.push(relative(OUT, p));
  });
  walk(OUT);
  execFileSync('npx', ['-y', 'esbuild@0.24.0', ...files, '--minify', '--outdir=.', '--outbase=.', '--allow-overwrite', '--log-level=warning'],
    { stdio: 'inherit', shell: process.platform === 'win32' });
  console.log(`minified ${files.length} files`);
}
console.log(`built ${relative(ROOT, OUT)}/`);

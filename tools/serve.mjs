// Local preview of the built site with GitHub Pages' URL rules: /x serves x.html, /x/ serves x/index.html,
// anything else gets 404.html. Run tools/build.mjs first, then:  node tools/serve.mjs [port]
import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname, normalize } from 'path';

const ROOT = join(process.cwd(), '_site'), PORT = +process.argv[2] || 8740;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.pdf': 'application/pdf', '.glb': 'model/gltf-binary', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const isFile = (p) => stat(p).then((s) => s.isFile(), () => false);

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  for (const p of [path, path + '.html', join(path, 'index.html')]) {
    const f = join(ROOT, p);
    if (f.startsWith(ROOT) && await isFile(f)) { res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); return res.end(await readFile(f)); }
  }
  res.writeHead(404, { 'content-type': TYPES['.html'] }); res.end(await readFile(join(ROOT, '404.html')));
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));

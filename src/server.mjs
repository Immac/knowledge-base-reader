import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSourceInfo, listArticles, getArticle } from './data-source.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 4173;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  import('node:fs').then(fs => {
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

function handleRequest(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;

  // API routes
  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.slice(4);

    if (apiPath === '/status') {
      const info = getSourceInfo();
      sendJSON(res, 200, { ok: true, ...info });
      return;
    }

    if (apiPath === '/articles') {
      const articles = listArticles();
      sendJSON(res, 200, { ok: true, articles });
      return;
    }

    if (apiPath.startsWith('/articles/')) {
      const slug = apiPath.slice(9); // "/articles/".length === 9
      const article = getArticle(slug);

      if (article) {
        sendJSON(res, 200, { ok: true, article });
      } else {
        sendJSON(res, 404, { ok: false, error: `Article not found: ${slug}` });
      }
      return;
    }

    sendJSON(res, 404, { ok: false, error: `Not found: ${pathname}` });
    return;
  }

  // Static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  sendFile(res, filePath);
}

const server = http.createServer(handleRequest);

server.listen(PORT, '127.0.0.1', () => {
  const info = getSourceInfo();
  console.log(`Wiki running at http://127.0.0.1:${PORT}/`);
  console.log(`Data source: ${info.path || 'none found'}`);
  console.log(`Articles: ${info.count}`);
});
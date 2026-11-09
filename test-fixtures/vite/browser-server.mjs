import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, 'dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.cjs': 'application/javascript', '.json': 'application/json', '.map': 'application/json' };

const server = createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><title>Browser regression fixture</title>');
      return;
    }
    let file = resolve(root, `.${pathname}`);
    if (!file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (statSync(file).isDirectory()) file = resolve(file, 'index.html');
    const content = readFileSync(file);
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.end(content);
  }
  catch {
    response.writeHead(404).end();
  }
});

server.listen(4173, '127.0.0.1');
process.on('SIGTERM', () => server.close());

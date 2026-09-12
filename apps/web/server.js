import { createServer } from 'http';
import { request } from 'https';
import { parse } from 'url';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import next from 'next';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certDir = join(__dirname, '../../certs');
const certFile = join(certDir, 'clinic.com.hk.crt');
const keyFile = join(certDir, 'clinic.com.hk.key');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, port: 3001, dir: __dirname });
const handle = app.getRequestHandler();

function proxyToBackend(req, res) {
  const proxyReq = request(
    {
      hostname: '127.0.0.1',
      port: 8000,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:8000' },
      rejectUnauthorized: false,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
  });
  req.pipe(proxyReq);
}

app.prepare().then(() => {
  createServer((req, res) => {
    if (req.url && req.url.startsWith('/api/')) {
      proxyToBackend(req, res);
      return;
    }
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3001, '0.0.0.0', () => {
    console.log('> Ready on http://0.0.0.0:3001');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Error: Port 3001 is already in use.');
    } else {
      console.error('Error: Server failed to start:', err.message);
    }
    process.exit(1);
  });
}).catch((err) => {
  console.error('Error: Failed to initialize Next.js:', err.message);
  process.exit(1);
});

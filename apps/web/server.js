import { createServer } from 'https';
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

if (!existsSync(certFile)) {
  console.error('Error: Certificate file not found at ' + certFile);
  console.error('Run: bash certs/generate.sh');
  process.exit(1);
}
if (!existsSync(keyFile)) {
  console.error('Error: Key file not found at ' + keyFile);
  console.error('Run: bash certs/generate.sh');
  process.exit(1);
}

let cert, key;
try {
  cert = readFileSync(certFile);
  key = readFileSync(keyFile);
} catch (err) {
  console.error('Error: Failed to read certificate or key files:', err.message);
  process.exit(1);
}

const options = { cert, key };

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
  createServer(options, (req, res) => {
    if (req.url && req.url.startsWith('/api/')) {
      proxyToBackend(req, res);
      return;
    }
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3001, '0.0.0.0', () => {
    console.log('> Ready on https://kilo.clinic.com.hk:3001');
    console.log('> Using certificate: ' + certFile);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Error: Port 3001 is already in use. Please stop the conflicting process.');
    } else {
      console.error('Error: HTTPS server failed to start:', err.message);
    }
    process.exit(1);
  });
}).catch((err) => {
  console.error('Error: Failed to initialize Next.js:', err.message);
  process.exit(1);
});

import { createServer } from 'https';
import { request } from 'https';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { request as httpRequest } from 'http';
import net from 'net';
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

/**
 * Proxy to Dify (HTTP, port 80).
 * opts:
 *   stripPrefix  - strip the leading /dify before forwarding
 *   rewriteHtml  - rewrite /_next/ -> /dify/_next/ in HTML bodies, so Dify's
 *                  assets do not collide with this app's own /_next/ namespace
 */
function proxyToDify(req, res, opts = {}) {
  const { stripPrefix, rewriteHtml } = opts;
  const targetPath = stripPrefix ? req.url.replace(/^\/dify/, '') : req.url;
  console.log(
    `[Dify Proxy] Forwarding: ${req.method} ${stripPrefix ? '(strip) ' : ''}${targetPath}`
  );
  // Drop accept-encoding: a compressed (gzip/br) HTML body can't be rewritten
  // textually, and these are local hops so compression buys nothing.
  const headers = { ...req.headers };
  delete headers['accept-encoding'];
  const proxyReq = httpRequest(
    {
      hostname: '10.0.1.75',
      port: 80,
      path: targetPath,
      method: req.method,
      headers: { ...headers, host: '10.0.1.75' },
      // Blocking chat can legitimately take minutes (schema + SQL + the final
      // LLM re-formatting large tables), so keep the ceiling generous.
      timeout: 420000,
    },
    (proxyRes) => {
      const ct = proxyRes.headers['content-type'] || '';
      if (rewriteHtml && ct.includes('text/html')) {
        // Streaming rewrite that mirrors the piped path's write cadence; the
        // buffered alternatives get mangled by the Tailscale funnel's HTTP/2
        // translation even when framing is identical. All rewrites are URL
        // strings in the page config / chunk refs:
        //   /_next/  -> /dify/_next/      (asset namespace)
        //   old-domain API prefixes -> /dify/... (so the webapp's xhr goes
        //   through this origin instead of the retired kilo.clinic.com.hk)
        const REPLACEMENTS = [
          ['/_next/', '/dify/_next/'],
          ['https://kilo.clinic.com.hk/api', '/dify/api'],
          ['https://kilo.clinic.com.hk/console/api', '/dify/console/api'],
          // Dify's webapp hardcodes ws://localhost for its realtime socket,
          // which points at the visitor's own machine and stalls the chat
          // bootstrap. Point it at this origin; /socket.io/ is upgraded by the
          // upgrade handler below.
          ['data-socket-url="ws://localhost"', 'data-socket-url="/socket.io"'],
        ];
        const MAX_KEYS = Math.max(...REPLACEMENTS.map(([k]) => k.length));
        const resHeaders = { ...proxyRes.headers };
        if (resHeaders['link']) {
          resHeaders['link'] = String(resHeaders['link']).replace(/https:\/\/kilo\.clinic\.com\.hk\/api/g, '/dify/api').replace(/\/_next\//g, '/dify/_next/');
        }
        res.writeHead(proxyRes.statusCode, resHeaders);
        let pending = Buffer.alloc(0);
        let safeLen = (p) => {
          let b = p.length - (MAX_KEYS - 1);
          if (b < 0) return 0;
          // 1) Never split a rewrite token: if the flushed tail is a proper
          //    prefix of any key, back off so the token stays whole. Only one
          //    token can straddle a boundary and none is a prefix of another.
          for (const [k] of REPLACEMENTS) {
            for (let plen = k.length - 1; plen >= 1; plen--) {
              if (b >= plen && Buffer.from(k.slice(0, plen), 'ascii').equals(p.subarray(b - plen, b))) {
                b -= plen;
              }
            }
          }
          // 2) Never split a multi-byte UTF-8 char (i18n string in the RSC
          //    payload): back off to the leading byte of a trailing char.
          let i = b;
          while (i > 0 && (p[i - 1] & 0xc0) === 0x80) i--; // step over continuations
          if (i > 0 && i < b) {
            const lead = p[i - 1];
            const width = (lead & 0xe0) === 0xc0 ? 2 : (lead & 0xf0) === 0xe0 ? 3 : (lead & 0xf8) === 0xf0 ? 4 : 1;
            if (i - 1 + width > b) b = i - 1;
          }
          return Math.max(0, b);
        };
        const rewrite = (s) => {
          for (const [from, to] of REPLACEMENTS) s = s.split(from).join(to);
          return s;
        };
        proxyRes.on('data', (chunk) => {
          pending = Buffer.concat([pending, chunk]);
          const b = safeLen(pending);
          if (b > 0) {
            res.write(rewrite(pending.subarray(0, b).toString('utf8')));
            pending = pending.subarray(b);
          }
        });
        proxyRes.on('end', () => {
          res.write(rewrite(pending.toString('utf8')));
          res.end();
        });
        return;
      }
      console.log(`[Dify Proxy] Response: ${proxyRes.statusCode} ${targetPath}`);
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', (err) => {
    console.error('Dify proxy error:', err.message);
    if (!res.writableEnded) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Dify proxy error', message: err.message }));
    }
  });
  proxyReq.on('timeout', () => {
    console.error('[Dify Proxy] Request timeout');
    proxyReq.destroy();
    if (!res.writableEnded) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Dify proxy timeout' }));
    }
  });
  req.pipe(proxyReq);
  req.on('error', (err) => {
    console.error('[Dify Proxy] Request pipe error:', err.message);
  });
}

app.prepare().then(() => {
  const upgradeHandler = app.getUpgradeHandler();
  const serverOptions = {
    key: readFileSync(keyFile),
    cert: readFileSync(certFile)
  };
  const server = createServer(serverOptions, (req, res) => {
    if (req.url && req.url.startsWith('/api/')) {
      proxyToBackend(req, res);
      return;
    }
    if (req.url && req.url.startsWith('/chat/')) {
      proxyToDify(req, res, { rewriteHtml: true });
      return;
    }
    if (req.url && req.url.startsWith('/socket.io/')) {
      // Dify realtime socket: polling transport is plain HTTP (not an
      // upgrade), so route it to Dify here; websocket transport is handled by
      // the upgrade handler below.
      proxyToDify(req, res);
      return;
    }
    if (req.url && req.url.startsWith('/dify/')) {
      proxyToDify(req, res, { stripPrefix: true });
      return;
    }
    if (req.url && (
      req.url.startsWith('/assets/') ||
      req.url.startsWith('/static/') ||
      req.url.startsWith('/fonts/') ||
      req.url.startsWith('/images/') ||
      req.url.startsWith('/manifest.json')
    )) {
      proxyToDify(req, res);
      return;
    }
    // Anything else (including /_next/ and /favicon.ico) hits this app's own
    // Next.js dev server, so our app's chunks are never routed to Dify.
    // WHATWG URL replaces legacy url.parse() (deprecated DEP0169, no longer
    // CVE-patched). Pass Next only pathname/query/hash as a plain object:
    // passing the full URL object (with hostname "localhost") makes Next's
    // dev host-check 308-redirect every funnel request to http://localhost.
    const u = new URL(req.url, 'http://localhost');
    const parsedUrl = {
      pathname: u.pathname,
      query: Object.fromEntries(u.searchParams),
      hash: u.hash,
    };
    handle(req, res, parsedUrl);
  });

  server.on('upgrade', (req, socket, head) => {
    // Dify's realtime socket (/socket.io/) belongs to the Dify stack, not this
    // app's HMR. Forward the raw upgraded stream to Dify's nginx, which routes
    // /socket.io/ to its api_websocket upstream. Everything else stays on this
    // app's own upgrade handler (HMR).
    if (req.url && req.url.startsWith('/socket.io/')) {
      const upstream = net.connect(80, '10.0.1.75', () => {
        const headers = { ...req.headers, host: '10.0.1.75' };
        const lines = [
          `${req.method} ${req.url} HTTP/1.1`,
          ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
          '',
          '',
        ];
        upstream.write(lines.join('\r\n'));
        if (head && head.length) upstream.write(head);
      });
      upstream.on('data', (d) => socket.write(d));
      socket.on('data', (d) => upstream.write(d));
      upstream.on('close', () => socket.destroy());
      socket.on('close', () => upstream.destroy());
      upstream.on('error', (err) => {
        console.error('[Dify Socket] proxy error:', err.message);
        socket.destroy();
      });
      socket.on('error', (err) => {
        console.error('[Dify Socket] client error:', err.message);
        upstream.destroy();
      });
      return;
    }
    upgradeHandler(req, socket, head);
  });

  server.listen(3001, '0.0.0.0', () => {
    console.log('> Ready on https://0.0.0.0:3001');
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
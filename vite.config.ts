import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { request as httpsRequest } from 'https'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'api-proxy',
      configureServer(server) {
        server.middlewares.use('/api', (req: IncomingMessage, res: ServerResponse) => {
          const podId = req.headers['x-pod-id'] as string;
          if (!podId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing x-pod-id header' }));
            return;
          }

          const targetHost = `${podId}-7860.proxy.runpod.net`;
          const targetPath = req.url || '/';

          // Collect request body
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

            const headers: Record<string, string> = {};
            for (const [key, value] of Object.entries(req.headers)) {
              if (key === 'x-pod-id' || key === 'host' || key === 'connection') continue;
              if (value) headers[key] = Array.isArray(value) ? value[0] : value;
            }
            headers['host'] = targetHost;

            const proxyReq = httpsRequest(
              {
                hostname: targetHost,
                port: 443,
                path: targetPath,
                method: req.method,
                headers,
              },
              (proxyRes) => {
                // Add CORS headers
                res.writeHead(proxyRes.statusCode || 500, {
                  ...proxyRes.headers,
                  'access-control-allow-origin': '*',
                  'access-control-allow-methods': '*',
                  'access-control-allow-headers': '*',
                });
                proxyRes.pipe(res);
              }
            );

            proxyReq.on('error', (err) => {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Proxy error: ${err.message}` }));
            });

            if (body) proxyReq.write(body);
            proxyReq.end();
          });
        });

        // Handle CORS preflight
        server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (req.method === 'OPTIONS' && req.url?.startsWith('/api')) {
            res.writeHead(204, {
              'access-control-allow-origin': '*',
              'access-control-allow-methods': '*',
              'access-control-allow-headers': '*',
              'access-control-max-age': '86400',
            });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
})

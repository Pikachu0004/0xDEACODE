import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type {ViteDevServer} from 'vite';
import {defineConfig, loadEnv} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const demoRoot = path.resolve(__dirname, 'Demo');

/** Serve `Demo/index.html` + local GLBs at `/Demo/*` during dev (folder lives at repo root, outside `public/`). */
/** Log API proxy target so `/api` 500 + text/plain (proxy ECONNREFUSED) is easy to diagnose. */
function apiProxyLogPlugin(apiTarget: string) {
  return {
    name: 'visiarise-api-proxy-log',
    configureServer() {
      // eslint-disable-next-line no-console
      console.log(`\n  \x1b[36m[VisiARise]\x1b[0m /api → ${apiTarget} (start backend: cd backend && npm run dev)\n`);
    },
  };
}

function demoFolderPlugin() {
  return {
    name: 'visiarise-demo-folder',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const u = req.url?.split('?')[0] ?? '';
        if (!u.startsWith('/Demo')) return next();
        const relRaw = u.slice('/Demo'.length).replace(/^\/+/, '') || 'index.html';
        let rel: string;
        try {
          rel = decodeURIComponent(relRaw);
        } catch {
          return next();
        }
        const candidate = path.resolve(demoRoot, rel);
        const demoResolved = path.resolve(demoRoot);
        const relToDemo = path.relative(demoResolved, candidate);
        if (relToDemo.startsWith('..') || path.isAbsolute(relToDemo)) return next();
        let stat: fs.Stats;
        try {
          stat = fs.statSync(candidate);
        } catch {
          return next();
        }
        if (!stat.isFile()) return next();
        const mime = candidate.endsWith('.html')
          ? 'text/html; charset=utf-8'
          : candidate.endsWith('.glb')
            ? 'model/gltf-binary'
            : 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        fs.createReadStream(candidate).pipe(res);
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  /**
   * Prefer `VITE_DEV_API_ORIGIN` (e.g. http://127.0.0.1:5001) — do not use generic `PORT` here;
   * root `.env` often sets PORT for the API server and it is easy to confuse with other tooling.
   */
  const apiTarget =
    env.VITE_DEV_API_ORIGIN ||
    `http://127.0.0.1:${env.VITE_BACKEND_PORT || '5001'}`;
  return {
    plugins: [apiProxyLogPlugin(apiTarget), demoFolderPlugin(), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      dedupe: ['three'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['three', '@react-three/fiber', '@react-three/drei'],
      // Including @google/model-viewer here can cause ERR_OPTIMIZE_DEPS_PROCESSING_ERROR → HTTP 504 on other deps.
      exclude: ['@google/model-viewer'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/three') ||
              id.includes('node_modules/@react-three') ||
              id.includes('node_modules/@google/model-viewer')
            ) {
              return 'three-vendor';
            }
            if (id.includes('node_modules/firebase')) return 'firebase';
            if (id.includes('node_modules/gsap')) return 'gsap';
          },
        },
      },
    },
    server: {
      port: 5173,
      /** Fail if 5173 is busy — avoids a second dev server on :5174 while the browser still uses :5173 (broken /api proxy). */
      strictPort: true,
      host: true,
      watch: {
        ignored: [path.resolve(__dirname, 'backend/**')],
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure(proxy) {
            proxy.on('error', (err: NodeJS.ErrnoException, _req, res) => {
              // eslint-disable-next-line no-console
              console.error(`[VisiARise] Proxy error /api → ${apiTarget}:`, err.message);
              if (res && !res.headersSent && 'writeHead' in res) {
                const r = res as import('http').ServerResponse;
                r.writeHead(502, {'Content-Type': 'application/json'});
                r.end(
                  JSON.stringify({
                    message: `API unreachable at ${apiTarget} (${err.code || err.message}). Is the backend running on that port?`,
                  })
                );
              }
            });
          },
        },
      },
    },
    preview: {
      host: true,
      /**
       * Vite 6+ blocks unknown `Host` headers (403). Railway public domains
       * (e.g. *.up.railway.app) are not in the default allowlist — required for SPA routes like /dashboard.
       */
      allowedHosts: true,
      /**
       * Vite merges `server.proxy` into preview by default. Without this, `vite preview` proxies `/api` to
       * `VITE_DEV_API_ORIGIN` / 127.0.0.1:5001 — nothing listens there in a deploy container → 502.
       * Production API calls must use `VITE_API_URL` (absolute backend URL); empty `proxy` lets non-API handling work.
       */
      proxy: {},
    },
  };
});

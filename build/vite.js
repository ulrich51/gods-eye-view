import { applicationHtmlPlugin } from './application-html.js';
import cesium from 'vite-plugin-cesium';

/** Build browser assets with explicit inputs; never load environment or providers. */
export function createBrowserViteConfig({
  plugins = [],
  publicDir,
  googleApiKey,
  cesiumToken,
  host = 'localhost',
  port = 4173,
  command,
  frameAncestors = [],
} = {}) {
  return {
    plugins: [cesium(), applicationHtmlPlugin(), ...plugins],
    ...(publicDir === undefined ? {} : { publicDir }),
    // A production build must not clean the dependency cache a running dev
    // server is still serving optimized module URLs from.
    ...(command === 'build' ? { cacheDir: 'node_modules/.vite-build' } : {}),
    optimizeDeps: {
      // First reached through the SDR worker or a dynamic import. Pre-bundle
      // them at startup so first use cannot invalidate already-transformed
      // URLs with Vite's "Outdated Optimize Dep" 504 response.
      include: [
        '@jtarrio/signals/demod/demodulator.js',
        '@jtarrio/signals/demod/modes.js',
        '@jtarrio/webrtlsdr/rtlsdr.js',
        'egm96-universal',
      ],
    },
    server: {
      host: host || 'localhost',
      port: parseInt(port, 10) || 4173,
      allowedHosts:
        host === '0.0.0.0' || host === '::'
          ? true
          : ['localhost', '127.0.0.1', '.local'],
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/ENVIRONMENT'],
      },
      // These headers protect the document containing Provider Settings
      // (clickjacking a user into pasting/submitting API keys via a
      // framed overlay). Deny-everything by default; frameAncestors is an
      // explicit opt-in allowlist for a trusted embedder you control (e.g.
      // a local dashboard on another port) — never a wildcard. X-Frame-
      // Options is dropped once an allowlist is set: it cannot express
      // "these specific origins", and a stale DENY would fight the CSP
      // directive instead of just being redundant with it.
      //
      // 'Cache-Control': 'no-store' is load-bearing, not cosmetic: verified
      // in practice that a 304 Not Modified response here drops BOTH
      // security headers entirely (Vite/connect strips them on the
      // conditional-GET fast path) — a browser that had already cached an
      // earlier response (e.g. the deny-all default, before an operator
      // configures an allowlist) keeps enforcing those stale headers
      // forever via revalidation, never seeing the new config. no-store
      // stops the browser from ever reusing a cached copy of this
      // security-sensitive document, in either direction.
      headers:
        frameAncestors.length > 0
          ? {
              'Content-Security-Policy': `frame-ancestors 'self' ${frameAncestors.join(' ')}`,
              'Cache-Control': 'no-store',
            }
          : {
              'X-Frame-Options': 'DENY',
              'Content-Security-Policy': "frame-ancestors 'none'",
              'Cache-Control': 'no-store',
            },
    },
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleApiKey),
      'import.meta.env.CESIUM_ION_TOKEN': JSON.stringify(cesiumToken),
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
}

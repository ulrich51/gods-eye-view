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
      headers:
        frameAncestors.length > 0
          ? {
              'Content-Security-Policy': `frame-ancestors 'self' ${frameAncestors.join(' ')}`,
            }
          : {
              'X-Frame-Options': 'DENY',
              'Content-Security-Policy': "frame-ancestors 'none'",
            },
    },
    define: {
      'import.meta.env.GOOGLE_MAPS_API_KEY': JSON.stringify(googleApiKey),
      'import.meta.env.CESIUM_ION_TOKEN': JSON.stringify(cesiumToken),
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
}

import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderPage } from './scripts/site-content.mjs';

const { tools } = JSON.parse(readFileSync(new URL('./tools.json', import.meta.url)));
const { dependencies } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

export default defineConfig(({ mode }) => ({
  appType: 'mpa',
  publicDir: '.generated/public',
  plugins: [{
    name: 'oh-tools-static-content',
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const path = context.path.replace(/index\.html$/, '');
        return renderPage(html, path, {
          noindex: mode !== 'production',
          ...(mode === 'staging' ? { assetOrigin: 'https://oh-tools-staging.otoolecf.workers.dev' } : {}),
        });
      },
    },
  }],
  // Older checkouts may still have per-tool node_modules directories.
  resolve: { dedupe: Object.keys(dependencies) },
  server: {
    port: 8000,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    outDir: mode === 'staging' ? 'dist-staging' : 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: [resolve('index.html'), ...tools.map(tool => resolve(`.${tool.path}index.html`))],
    },
  },
}));

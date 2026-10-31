# Oh! Tools

Browser-based utilities at https://oh-tools.net. Files and inputs are processed locally, without uploading them to our servers for processing. Libraries, fonts, and database extensions may download from external services; user-selected URLs and network queries also make requests to their destinations. Browser Bridge optionally uses a signaling service to establish peer-to-peer connections.

## Development

Use Node.js 22.12 or newer (see `.nvmrc`). Install dependencies once at the repository root:

```bash
npm ci
npm run dev
```

Open http://localhost:8000. Vite serves each tool at its existing directory URL, with cross-origin isolation headers for browser-side WebAssembly processing. Opening HTML files directly is not supported.

## Build And Test

```bash
npm run build
npm run preview
```

The production build is in `dist/`. Preview it at http://localhost:4173 using Cloudflare's local Workers runtime, including the committed `_headers` and `_redirects` rules.

```bash
npx playwright install chromium
npm test
npm run deploy:check
```

Browser tests build the site and start their own preview server. Stop an existing server on port 4173 before running them. Tests exercise the built tools, browser isolation, legacy URLs, and deployment boundaries.

## Build Structure

- One root `package.json` and lockfile own dependencies for all tools.
- Each tool has an HTML page and `main.js` module entry. Vite builds the pages listed in `tools.json`, sharing common bundles without loading every tool on every page.
- Public headings, the tool directory, guides, and related links are generated during the build. They remain readable without JavaScript; tool processing still runs in the browser. See [SEO.md](SEO.md) for metadata, preview indexing, and Search Console.
- `components/site.js` loads the shared navigation, footer, and tool descriptions.
- Module imports and CSS receive content-hashed URLs; manual `?v=` cache versions are unnecessary.
- `scripts/prepare-assets.mjs` prepares an explicit public-file allowlist in `.generated/public`. It keeps Emscripten's loader, pthread script, and WASM libraries together under versioned vendor URLs.
- DuckDB's JavaScript is bundled from the locked package. Its WASM binaries exceed Cloudflare's 25 MiB asset limit, so its worker/WASM URLs remain pinned to that package version on jsDelivr. DuckDB extensions can also download at runtime. This is not a fully offline application.
- PassHelp is imported from the locked npm dependency, using browser crypto for randomness.
- Build checks verify every registered page, asset sizes, and deployment boundaries. Source files, Worker config, development dependencies, and local environment files are not published.
- `.generated/`, `dist/`, and `node_modules/` are generated and ignored. Old per-tool `lib/` folders are no longer used.

## Deployment

`wrangler.jsonc` configures a Workers Static Assets site named `oh-tools`. Only `dist/` is uploaded. Browser Bridge's signaling Worker remains a separate deployment.

```bash
npm run deploy:check
npm run deploy
```

For forks, choose your own Worker name in `wrangler.jsonc`. See [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) for Git builds, Pages compatibility, and the production domain cutover.

### Browser Bridge Configuration

`oh-tools.net` automatically uses its production signaling endpoint. Localhost uses the mock server:

```bash
npm run dev:signaling
```

For another deployment, copy `.env.example` to `.env.local` and set `VITE_SIGNALING_URL` to your own signaling Worker URL, then rebuild. This is public browser configuration; never put secrets in `VITE_` variables. Without a configured endpoint, alternate hosts default to Direct Exchange and disable Simple Codes.

Use `browser-bridge/wrangler.example.toml` as the template for the ignored local signaling config. See [Browser Bridge setup](browser-bridge/README-OTP.md).

## Adding Tools

1. Create a kebab-case directory with `index.html`, `main.js`, and styles.
2. Import `../components/site.js` and your tool modules from `main.js`. Load it with `<script type="module" src="./main.js"></script>`.
3. Add `name`, `description`, `path` (starting and ending with `/`), and `status` to `tools.json`. Active tools appear on the homepage; all registered pages are built automatically.
4. Add a practical guide and related tool paths in `content/tool-guides.json`. Headings, credits, guides, links, and SEO metadata are rendered at build time.
5. Add package dependencies at the repository root and test the production build, desktop/mobile layouts, and both themes.
6. Keep processing client-side unless server behavior is explicitly documented.

## Browser Bridge Security Limitation

The current signaling helpers use Base64 encoding, not encryption. WebRTC data-channel transport is encrypted, but a signaling-service operator can decode connection metadata. Do not treat Simple Codes as end-to-end encrypted signaling. Replacing that protocol and improving KV consistency are separate backend changes.

## Donation And Contact Links

The hosted site's Ko-fi and contact links are in `components/otoolebox-footer.js`. Forks may replace or remove them.

## License

Project code is ISC; see `LICENSE`. Third-party dependencies retain their own licenses. Available installed dependency license/notice files are copied into `dist/licenses/` during asset preparation.

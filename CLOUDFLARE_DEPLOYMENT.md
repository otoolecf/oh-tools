# Cloudflare Deployment Guide

The site builds into `dist/` and can run on Workers Static Assets or Cloudflare Pages. Browser Bridge's signaling Worker is deployed separately. Building or running a deployment dry run does not change a hosted service.

## Current Hosted Site

The production Pages project is `oh-tools`, connected to
`otoolecf/oh-tools` on GitHub. Pushes to `main` build with Node.js 22,
`npm run build`, and publish only `dist/` to `oh-tools.net` and
`www.oh-tools.net`. Automatic Pages preview deployments are disabled; use
the explicit Workers staging deployment below for review.

`signaling.oh-tools.net`
targets the SQLite-backed `oh-tools-signaling` Worker. Its public custom domain,
bindings and migration are in `browser-bridge/wrangler.production.jsonc`;
`npm run deploy:signaling:production` deploys it explicitly. Site deployments
do not deploy the signaling Worker. See the [Browser Bridge setup guide](browser-bridge/README-OTP.md)
for local development and deployment instructions.

## Build And Preview

Use Node.js 22.12 or newer. From the repository root:

```bash
npm ci
npm run build
npm run preview
```

Open http://localhost:4173. This uses Wrangler's local runtime and applies the production headers, redirects, and directory URL handling. Check image-editor initialization, a video import/export, a data file in Data Workbench, and Browser Bridge.

```bash
npm run deploy:check
```

This rebuilds and validates an assets-only Workers deployment without uploading it. The root `wrangler.jsonc` has no account-specific IDs, custom-domain routes, or backend bindings.

## Workers Deployment

### Remote Staging

```bash
npm run deploy:staging
```

This builds `dist-staging/` and deploys the `staging` environment as
`oh-tools-staging` on its `workers.dev` URL. It has no custom-domain routes or
backend bindings. It does not replace the production Pages deployment or the
signaling Worker. Browser Bridge defaults to Direct Exchange on this hostname;
Simple Codes stays disabled unless a separate signaling URL is configured at
build time.

Staging HTML includes `noindex`, and its static-asset headers include
`X-Robots-Tag: noindex`. Crawling stays allowed so search engines can read that
rule. Production uses the separate `dist/` directory and remains indexable.
Use `npm run build:staging` for preview builds, and `npm run build` for production.
For Workers Builds previews, use `npm run build:staging` followed by
`npx wrangler deploy --env staging`. Do not use a production build on a public
preview hostname. `noindex` controls indexing; it does not restrict access.

### Production Deployment

1. Authenticate with `npx wrangler login`, or supply a Cloudflare API token through your shell/CI secret store.
2. Check the public Worker name in `wrangler.jsonc`; forks must choose their own name.
3. Run `npm run deploy`. Only the built `dist/` directory is uploaded.
4. Test the resulting Worker URL before adding your custom domain.

For Workers Builds production deployments, connect the Git repository, select Node.js 22, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. Configure preview builds separately as described above. Set `VITE_SIGNALING_URL` as a build variable only when that preview should use a dedicated signaling service.

An alternate hostname without `VITE_SIGNALING_URL` defaults to Browser Bridge Direct Exchange. Test Simple Codes on a preview only after explicitly configuring its signaling endpoint. Vite embeds this URL in the client bundle; changing it requires a rebuild.

## Pages Deployment

Connect your repository to a Pages project with these settings:

- Build command: `npm run build`.
- Build output directory: `dist` (not the repository root).
- Node.js: 22.
- Keep the committed `_headers` and `_redirects`; asset preparation copies them into the build output.

Test the deployment before connecting your custom domain. Disable automatic
preview builds unless they are configured to use the staging build and its
`noindex` headers.

## Browser Bridge Signaling Worker

From the repository root:

```bash
cp browser-bridge/wrangler.example.toml browser-bridge/wrangler.toml
npx wrangler deploy --dry-run --config browser-bridge/wrangler.toml
```

Choose a Worker name and a distinct rate-limiter namespace number in the ignored local config. The example declares the SQLite Durable Object migration and mandatory `RATE_LIMITER` binding. Missing/failing bindings return 503. Validate on staging, then deploy explicitly:

```bash
npm run deploy:signaling
```

The site deployment does not deploy or modify this Worker. The backend requires
SQLite Durable Objects and the rate-limiter binding. Never bind test harnesses
to a public deployment. Keep credentials in Wrangler secrets or CI settings,
never in a frontend variable or source file.

For a fork's frontend, copy `.env.example` to `.env.local`, set `VITE_SIGNALING_URL=https://your-signaling-worker.example`, and rebuild. The real `oh-tools.net` hostname automatically uses `https://signaling.oh-tools.net`; localhost uses http://localhost:3001.

## Asset Notes

- Every uploaded asset is checked against the Workers 25 MiB limit.
- DuckDB's larger WASM binaries and workers stay on its version-pinned CDN URLs. Its JavaScript API is bundled locally.
- Image-editor's versioned vendor files include the COEP header required by Emscripten pthread workers. Keep that rule when changing WASM library versions.
- `_headers` also provides the image/video page isolation headers and immutable caching for hashed bundles and versioned vendor files.
- Build output intentionally excludes source configs, environment files, documentation, and `node_modules`.

Source downloads under `/licenses/` accompany the compiled libraries. Builds fetch and checksum these archives into `.license-sources/` and split oversized archives into numbered parts for the 25 MiB asset limit. Keep these source assets available when deploying the matching library versions.

# Cloudflare Deployment Guide

The site builds into `dist/` and can run on Workers Static Assets or the existing Pages project. Browser Bridge's signaling Worker stays separate. No domain or existing production service is changed by building or running a deployment dry run.

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

### Production Candidate

1. Authenticate with `npx wrangler login`, or supply a Cloudflare API token through your shell/CI secret store.
2. Check the public Worker name in `wrangler.jsonc`; forks must choose their own name.
3. Run `npm run deploy`. Only the built `dist/` directory is uploaded.
4. Test the resulting Worker URL before adding `oh-tools.net` as a custom domain.

For Workers Builds production deployments, connect the Git repository, select Node.js 22, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. Configure preview builds separately as described above. Set `VITE_SIGNALING_URL` as a build variable only when that preview should use a dedicated signaling service.

An alternate hostname without `VITE_SIGNALING_URL` defaults to Browser Bridge Direct Exchange. Test Simple Codes on a preview only after explicitly configuring its signaling endpoint. Vite embeds this URL in the client bundle; changing it requires a rebuild.

## Existing Pages Project And Domain Cutover

The same `dist/` output works on Pages while the hosting migration is reviewed:

- Build command: `npm run build`.
- Build output directory: `dist` (not the repository root).
- Node.js: 22.
- Keep the committed `_headers` and `_redirects`; asset preparation copies them into the build output.

Validate the Worker deployment first, then move the custom domain from Pages to Workers in Cloudflare. Keep the Pages project available during the cutover so it can be restored if needed. The separate `signaling.oh-tools.net` service does not need to move. Do not delete the Pages project as part of an initial migration.

## Browser Bridge Signaling Worker

From the repository root:

```bash
cp browser-bridge/wrangler.example.toml browser-bridge/wrangler.toml
npx wrangler kv namespace create TEMP_STORAGE_KV --config browser-bridge/wrangler.toml
npx wrangler kv namespace create TEMP_STORAGE_KV --preview --config browser-bridge/wrangler.toml
```

Put the returned namespace IDs in the ignored local config. Configure the optional `RATE_LIMITER` binding for a public deployment, then deploy explicitly:

```bash
npm run deploy:signaling
```

The site deployment does not deploy or modify this Worker. Keep credentials in Wrangler secrets or CI settings, never in a frontend variable or source file.

For a fork's frontend, copy `.env.example` to `.env.local`, set `VITE_SIGNALING_URL=https://your-signaling-worker.example`, and rebuild. The real `oh-tools.net` hostname automatically uses `https://signaling.oh-tools.net`; localhost uses http://localhost:3001.

## Asset Notes

- Every uploaded asset is checked against the Workers 25 MiB limit.
- DuckDB's larger WASM binaries and workers stay on its version-pinned CDN URLs. Its JavaScript API is bundled locally.
- Image-editor's versioned vendor files include the COEP header required by Emscripten pthread workers. Keep that rule when changing WASM library versions.
- `_headers` also provides the image/video page isolation headers and immutable caching for hashed bundles and versioned vendor files.
- Build output intentionally excludes source configs, environment files, documentation, and `node_modules`.

# Contributing

Contributions are welcome. Use Node.js 22.12 or newer and run all commands from the repository root:

```bash
npm ci
npm run dev
```

Open http://localhost:8000. Before submitting changes:

```bash
npx playwright install chromium
npm test
npm run deploy:check
```

## Guidelines

- Keep tools browser-first; document any server-side behavior.
- Register tools in `tools.json`; each tool's `main.js` imports its dependencies and shared components.
- Add instructions, an example, limitations, and related tool paths in `content/tool-guides.json`. See `SEO.md` for generated public content and metadata.
- Install dependencies at the root. Do not add per-tool lockfiles or load scripts from `node_modules` URLs.
- Reuse shared components and `global.css`; test desktop/mobile and both themes.
- Use module imports so Vite can produce hashed bundles. WASM loaders needing stable sibling paths belong in the explicit asset preparation allowlist.
- Do not commit `.env.local`, `.dev.vars*`, real signaling deployment configs, `.generated/`, `dist/`, `dist-staging/`, or `node_modules/`.

The committed `wrangler.jsonc` contains public static-site settings. Account-specific signaling settings use a local `browser-bridge/wrangler.toml` created from the example. Set the public frontend endpoint through `VITE_SIGNALING_URL` in `.env.local` and rebuild.

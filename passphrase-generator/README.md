# Passphrase Generator

Generate memorable word combinations or random character sequences locally using [PassHelp](https://github.com/passhelp/passhelp) and the browser Web Crypto API.

Run `npm ci` and `npm run dev` at the repository root, then open http://localhost:8000/passphrase-generator/.

PassHelp is a locked root dependency imported by `script.js`, with no separate vendored browser bundle. Update it through the root package manifest and lockfile, then run the browser tests to check generation and copying. Its MIT license is included in the build's dependency notices.

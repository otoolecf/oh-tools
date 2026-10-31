import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { sitemap, siteOrigin } from './site-content.mjs';

const staging = process.argv.includes('--staging');

// Only this allowlist is published. Never copy the repository or node_modules wholesale.
const output = resolve('.generated/public');
await rm(output, { recursive: true, force: true });

async function copy(source, destination = source) {
  const target = resolve(output, destination);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(source), target);
}

for (const file of ['_headers', '_redirects', 'tools.json', 'kofi_symbol.svg', 'og-image.png', 'favicon.svg', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png']) {
  await copy(file);
}

await writeFile(resolve(output, 'sitemap.xml'), sitemap());
await writeFile(resolve(output, 'robots.txt'), `User-agent: *\nAllow: /\n${staging ? '' : `\nSitemap: ${siteOrigin}/sitemap.xml\n`}`);
if (staging) {
  const headers = await readFile('_headers', 'utf8');
  await writeFile(resolve(output, '_headers'), `${headers}\n# Preview builds must stay out of search results.\n/*\n  X-Robots-Tag: noindex\n`);
}

// Emscripten's loader starts pthread workers from its own script URL. Keep the
// loader and its dynamic libraries together instead of bundling the loader.
for (const file of ['vips.js', 'vips.wasm', 'vips-heif.wasm', 'vips-resvg.wasm']) {
  await copy(`node_modules/wasm-vips/lib/${file}`, `vendor/wasm-vips-0.0.14/${file}`);
}
await copy('node_modules/heic-to/dist/iife/heic-to.js', 'vendor/heic-to-1.2.1/heic-to.js');

// Include license files for installed runtime dependencies, including transitive
// packages. These are generated from the same locked versions as the build.
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
for (const [directory, info] of Object.entries(lock.packages)) {
  if (!directory || info.dev) continue;
  const files = await readdir(directory);
  for (const file of files.filter(name => /^(licen[cs]e|copying|notice|third-party-notices)(\.|$)/i.test(name))) {
    await copy(`${directory}/${file}`, `licenses/${info.name || directory.split('node_modules/').at(-1)}/${file}`);
  }
}

await copy('LICENSE', 'licenses/oh-tools/LICENSE');
await copy('brand/INTER-LICENSE.txt', 'licenses/brand/INTER-LICENSE.txt');
await copy('brand/LUCIDE-LICENSE.txt', 'licenses/brand/LUCIDE-LICENSE.txt');

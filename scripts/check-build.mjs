import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pagePaths, siteOrigin } from './site-content.mjs';

const { tools } = JSON.parse(await readFile('tools.json', 'utf8'));
const staging = process.argv.includes('--staging');
const output = staging ? 'dist-staging' : 'dist';
const sitemap = await readFile(`${output}/sitemap.xml`, 'utf8');
assert.equal([...sitemap.matchAll(/<loc>/g)].length, pagePaths.length);
assert.doesNotMatch(sitemap, /lastmod|priority|changefreq/);
for (const path of pagePaths) {
  const html = await readFile(`${output}${path}index.html`, 'utf8');
  assert.match(html, /type="module"/);
  assert.doesNotMatch(html, /node_modules|\?v=|cdn\.jsdelivr\.net/);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `Expected one static heading: ${path}`);
  assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1, `Expected one canonical: ${path}`);
  assert(html.includes(`rel="canonical" href="${siteOrigin}${path}"`));
  assert(html.includes(`name="robots" content="${staging ? 'noindex, follow' : 'index, follow'}"`));
  assert(html.includes(`property="og:url" content="${siteOrigin}${path}"`));
  assert(html.includes('property="og:image"'));
  const socialOrigin = staging ? 'https://oh-tools-staging.otoolecf.workers.dev' : siteOrigin;
  assert(html.includes(`property="og:image" content="${socialOrigin}/og-image.png"`));
  assert(html.includes(`name="twitter:image" content="${socialOrigin}/og-image.png"`));
  assert(html.includes('rel="icon" href="/favicon.svg" type="image/svg+xml"'));
  assert(html.includes('rel="apple-touch-icon" href="/apple-touch-icon.png"'));
  assert(sitemap.includes(`<loc>${siteOrigin}${path}</loc>`), `Missing sitemap entry: ${path}`);
  if (path !== '/') {
    assert(html.includes('class="tool-guide"'), `Missing static guide: ${path}`);
    assert(html.includes('aria-label="Related tools"'));
  }
}
const home = await readFile(`${output}/index.html`, 'utf8');
for (const tool of tools) assert(home.includes(`href="${tool.path}" class="tool-link">Open ${tool.name}</a>`));
const headers = await readFile(`${output}/_headers`, 'utf8');
assert.equal(/X-Robots-Tag: noindex/.test(headers), staging, 'Indexing headers must match the build target');
const robots = await readFile(`${output}/robots.txt`, 'utf8');
assert.match(robots, /Allow: \//); // Crawlers must be able to see staging's noindex.
assert.equal(robots.includes('Sitemap:'), !staging);
const preview = await readFile(`${output}/og-image.png`);
assert.equal(preview.subarray(1, 4).toString(), 'PNG');
assert.equal(preview.readUInt32BE(16), 1200);
assert.equal(preview.readUInt32BE(20), 630);
for (const [file, size] of [['favicon-16x16.png', 16], ['favicon-32x32.png', 32], ['apple-touch-icon.png', 180]]) {
  const icon = await readFile(`${output}/${file}`);
  assert.equal(icon.subarray(1, 4).toString(), 'PNG');
  assert.equal(icon.readUInt32BE(16), size);
  assert.equal(icon.readUInt32BE(20), size);
}

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      assert(!['node_modules', '.git', 'scripts', 'tests'].includes(entry.name), `Unexpected directory: ${path}`);
      await check(path);
    } else {
      assert((await stat(path)).size <= 25 * 1024 * 1024, `Exceeds Cloudflare's 25 MiB asset limit: ${path}`);
      assert(!/^(package(?:-lock)?\.json|wrangler\..*|\.env.*|\.dev\.vars.*|cloudflare-worker\.js|config\.js)$/.test(entry.name), `Unexpected deployment file: ${path}`);
    }
  }
}
await check(output);
console.log(`Build checked: ${staging ? 'staging' : 'production'} SEO, homepage, ${tools.length} tools, asset sizes, and deployment file boundaries.`);

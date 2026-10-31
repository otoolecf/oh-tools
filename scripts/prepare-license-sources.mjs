import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// Source downloads are release assets, never part of startup processing. Cache
// locally for repeat builds; fail closed on a missing or changed upstream file.
export async function prepareLicenseSources(output) {
  const manifest = JSON.parse(await readFile('third-party/sources.json', 'utf8'));
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  for (const [name, version] of Object.entries(manifest.packages)) {
    if (pkg.dependencies[name] !== version) throw new Error(`Update the source manifest for ${name}.`);
  }
  const cache = resolve('.license-sources');
  const target = resolve(output, 'licenses/sources');
  await Promise.all([mkdir(cache, { recursive: true }), mkdir(target, { recursive: true })]);
  const hash = data => createHash('sha256').update(data).digest('hex');
  const records = [];
  // Serial bounded downloads keep memory use predictable, including on CI.
  for (const item of manifest.archives) {
    const path = resolve(cache, item.name);
    let data;
    try { data = await readFile(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!data || hash(data) !== item.sha256) {
      const response = await fetch(item.url, { signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new Error(`Source download failed (${response.status}): ${item.name}`);
      data = Buffer.from(await response.arrayBuffer());
      if (hash(data) !== item.sha256) throw new Error(`Source checksum changed: ${item.name}`);
      await writeFile(path, data);
    }
    if (data.byteLength !== item.bytes) throw new Error(`Source size mismatch: ${item.name}`);
    const parts = [];
    const limit = 20 * 1024 * 1024;
    for (let offset = 0; offset < data.length; offset += limit) {
      const name = data.length > limit ? `${item.name}.part-${String(parts.length + 1).padStart(3, '0')}` : item.name;
      await writeFile(resolve(target, name), data.subarray(offset, offset + limit));
      parts.push(name);
    }
    records.push({ ...item, parts });
  }
  await copyFile('third-party/rebuild-vips.sh', resolve(target, 'rebuild-vips.sh'));
  await writeFile(resolve(target, 'manifest.json'), JSON.stringify({ ...manifest, archives: records }, null, 2));
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  await writeFile(resolve(output, 'licenses/index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Third-party licenses and source — Oh! Tools</title><style>body{font:16px/1.6 system-ui;max-width:1000px;margin:40px auto;padding:24px}td,th{padding:8px;text-align:left;border-bottom:1px solid #ddd}code,a{overflow-wrap:anywhere}</style><h1>Licenses and source</h1><p>Oh! Tools' original code is ISC. Third-party components retain their own licenses. The included HEIC converter and VIPS codecs include LGPL libraries; ExifReader and Mediabunny use MPL-2.0.</p><p><a href="/licenses/THIRD_PARTY_NOTICES.md">Notices, exact versions, source and rebuild instructions</a> · <a href="/licenses/GPL-3.0.txt">GPL-3.0</a> · <a href="/licenses/LGPL-3.0.txt">LGPL-3.0</a></p><p>Source downloads are hosted here alongside the compiled assets. For an archive split into parts, concatenate its numbered parts in order to recover the original filename. Verify the recovered archive using its SHA-256 below. Use the supplied source and build instructions to rebuild or replace the libraries in a local copy of the application.</p><table><tr><th>Component</th><th>Source</th><th>SHA-256 of complete archive</th></tr>${records.map(item => `<tr><td>${escape(item.group)}</td><td>${item.parts.map(name => `<a href="/licenses/sources/${escape(name)}">${escape(name)}</a>`).join('<br>')}</td><td><code>${item.sha256}</code></td></tr>`).join('')}</table><p><a href="/licenses/sources/manifest.json">Source manifest</a> · <a href="/licenses/sources/rebuild-vips.sh">VIPS build recipe with local verified downloads</a></p></html>`);
}

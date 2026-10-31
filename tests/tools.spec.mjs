import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const { tools } = JSON.parse(readFileSync('tools.json', 'utf8'));

test('all tools have working entries, shared navigation, and mobile theme controls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.tool-card')).toHaveCount(tools.length);
  for (const tool of tools) {
    await page.goto(tool.path);
    await expect(page.locator('tool-hero h1')).toHaveText(tool.name);
    await expect(page.locator('otoolebox-header a.nav-brand')).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('otoolebox-header #themeToggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(errors).toEqual([]);
});

test('repair and format JSON using bundled libraries', async ({ page }) => {
  await page.goto('/json-utilities/');
  await page.locator('#jsonEditor').fill("{name: 'test',}");
  await page.locator('#cleanBtn').click();
  await expect.poll(async () => JSON.parse(await page.locator('#jsonEditor').inputValue())).toEqual({ name: 'test' });
  await page.locator('#validateBtn').click();
  await expect(page.locator('#messageContent')).toContainText(/valid/i);
});

test('generate a legacy MD5 hash using the bundled fallback', async ({ page }) => {
  await page.goto('/hash-generator/');
  await page.locator('#inputText').fill('hello');
  await page.locator('#algorithmSelect').selectOption('MD5');
  await page.locator('#generateBtn').click();
  await expect(page.locator('#resultsContainer')).toContainText('5d41402abc4b2a76b9719d911017c592');
});

for (const bits of [224, 256, 384, 512]) {
  test(`SHA3-${bits} matches standard vectors for text and binary input`, async ({ page }) => {
    await page.goto('/hash-generator/');
    await page.locator('#algorithmSelect').selectOption(`SHA3-${bits}`);
    for (const { input, hex } of [
      { input: 'abc', hex: false },
      { input: 'Hello, 世界', hex: false },
      { input: '0061ff', hex: true },
    ]) {
      const data = Buffer.from(input, hex ? 'hex' : 'utf8');
      const expected = createHash(`sha3-${bits}`).update(data).digest('hex');
      await page.locator('#treatAsHex').setChecked(hex);
      await page.locator('#inputText').fill(input);
      await page.locator('#generateBtn').click();
      await expect(page.locator('.hash-value')).toHaveText(expected);
    }
  });
}

test('compare text using the bundled diff package', async ({ page }) => {
  await page.goto('/diff-utilities/');
  await page.locator('#text1').fill('before');
  await page.locator('#text2').fill('after');
  await page.locator('#compareText').click();
  await expect(page.locator('#textDiffResult')).toContainText('before');
  await expect(page.locator('#textDiffResult')).toContainText('after');
});

for (const { tab, left, right, button, result, before, after } of [
  { tab: 'json', left: 'json1', right: 'json2', button: 'compareJSON', result: 'jsonDiffResult', before: '{"a":1}', after: '{"a":2}' },
  { tab: 'css', left: 'css1', right: 'css2', button: 'compareCSS', result: 'cssDiffResult', before: 'a {color:red}', after: 'a {color:blue}' },
  { tab: 'array', left: 'array1', right: 'array2', button: 'compareArray', result: 'arrayDiffResult', before: '[1,2]', after: '[1,3]' },
]) {
  test(`compare ${tab} using the bundled diff package`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/diff-utilities/');
    await page.locator(`[data-tab="${tab}"]`).click();
    await page.locator(`#${left}`).fill(before);
    await page.locator(`#${right}`).fill(after);
    await page.locator(`#${button}`).click();
    await expect(page.locator(`#${result}`)).not.toBeEmpty();
    await expect(page.locator(`#${result} .json-error`)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('generate a barcode and download its PNG', async ({ page }) => {
  await page.goto('/barcode-generator/');
  await page.locator('#barcodeData').fill('build-test');
  await page.locator('#barcodeType').selectOption('qrcode');
  await page.locator('#generateBtn').click();
  await expect.poll(() => page.locator('#barcodeCanvas').evaluate(canvas => canvas.width)).toBeGreaterThan(0);
  const download = page.waitForEvent('download');
  await page.locator('#saveBtn').click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test('UUID and passphrase inline copy handlers still work after module conversion', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/uuid-generator/');
  await page.locator('#generateBtn').click();
  await expect(page.locator('#uuidResults')).toContainText(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}/);
  await page.locator('#uuidResults button').first().click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/[0-9a-f-]{36}/);
  await page.goto('/passphrase-generator/');
  await page.locator('#generateBtn').click();
  await expect(page.locator('.passphrase-item')).toHaveCount(1);
  await page.locator('.btn-copy-individual').click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).length).toBeGreaterThan(5);
});

test('image editor initializes threaded WASM, loads SVG, and exports PNG', async ({ page }) => {
  await page.goto('/image-editor/');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await expect(page.locator('#initialUploadBtn')).toHaveText('Choose Image');
  await expect(page.locator('#initialUploadBtn')).toBeEnabled();
  await page.locator('#fileInput').setInputFiles({
    name: 'sample.svg', mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="red"/></svg>'),
  });
  await expect(page.locator('#previewImage')).toHaveAttribute('src', /^blob:/);
  await page.locator('[data-tab="export"]').click();
  await page.locator('export-operator label[for="formatPng"]').click();
  const download = page.waitForEvent('download');
  await page.locator('export-operator #downloadBtn').click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test('Data Workbench initializes the bundled DuckDB API and imports CSV', async ({ page, context }) => {
  // Exercise the real locked engine without making CI depend on CDN uptime.
  // The separate live-site audit checks actual external asset downloads.
  await context.route('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@*/dist/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1);
    if (!/^duckdb-(?:(?:browser-(?:mvp|eh|coi)(?:\.pthread)?\.worker\.js)|(?:(?:mvp|eh|coi)\.wasm))$/.test(name)) {
      return route.continue();
    }
    await route.fulfill({
      path: resolve('node_modules/@duckdb/duckdb-wasm/dist', name),
      contentType: name.endsWith('.wasm') ? 'application/wasm' : 'application/javascript',
      headers: { 'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin' },
    });
  });
  await page.goto('/data-workbench/');
  await expect.poll(() => page.evaluate(() => Boolean(window.duckDBManager?.isInitialized)), { timeout: 45_000 }).toBe(true);
  await page.locator('bdw-file-drop #fileInput').setInputFiles({
    name: 'sample.csv', mimeType: 'text/csv', buffer: Buffer.from('name,value\nalpha,1\nbeta,2\n'),
  });
  await expect(page.locator('#dataPreview')).toContainText('alpha');
  await expect(page.locator('#dataPreview')).toContainText('beta');
  const result = await page.evaluate(() => window.duckDBManager.executeSQL('SELECT 42 AS answer'));
  expect(JSON.stringify(result)).toContain('42');
  await page.locator('#mainContent .tab-btn').filter({ hasText: 'SQL Console' }).click();
  await page.locator('#sqlTab #sqlTextarea').fill('SELECT * FROM nonexistent_regression_table');
  await page.locator('#sqlTab #executeBtn').click();
  await expect(page.locator('#sqlTab #queryInfo')).toContainText('Couldn’t run that query:');
  await expect(page.locator('#sqlTab #queryInfo')).toContainText('nonexistent_regression_table');
  await expect(page.locator('#sqlTab #queryInfo')).not.toContainText('undefined rows');
});

test('video import and export use the bundled media engine', async ({ page }) => {
  await page.goto('/video-trimmer/');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  // Generate a small real video using the browser rather than a large binary fixture.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const done = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? 'red' : 'blue'; ctx.fillRect(0, 0, 64, 64);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    recorder.stop(); await done; stream.getTracks().forEach(track => track.stop());
    return [...new Uint8Array(await new Blob(chunks).arrayBuffer())];
  });
  await page.locator('vt-file-drop #fileInput').setInputFiles({ name: 'sample.webm', mimeType: 'video/webm', buffer: Buffer.from(bytes) });
  await expect(page.locator('vt-info-panel')).toContainText('sample.webm');
  await page.locator('vt-convert-panel #containerSelect').selectOption('webm');
  const size = await page.evaluate(async () => {
    const app = document.querySelector('vt-app');
    const output = await app.engine.exportVideo({ outputFormat: 'webm', videoCodec: 'copy', audioCodec: 'copy' }, () => {});
    return output.blob.size;
  });
  expect(size).toBeGreaterThan(100);
});

test('Browser Bridge uses local signaling and keeps QR generation available', async ({ page, request }) => {
  await page.goto('/browser-bridge/');
  await page.waitForFunction(() => Boolean(window.closedLoop));
  expect(await page.evaluate(() => window.closedLoop.otpServerUrl)).toBe('http://localhost:3001');
  await expect(page.locator('#otp-mode')).toBeEnabled();
  await page.evaluate(() => window.closedLoop.generateQRCodeFromUrl('https://example.com/#offer=test'));
  await expect.poll(() => page.locator('#qr-canvas').evaluate(canvas => canvas.width)).toBeGreaterThan(0);
  const code = '123456';
  const payload = { encryptedData: 'non-sensitive-test-payload', type: 'offer' };
  const stored = await request.post(`http://localhost:3001/temp/${code}`, { data: payload });
  expect(stored.ok()).toBe(true);
  const retrieved = await request.get(`http://localhost:3001/temp/${code}`);
  expect(await retrieved.json()).toMatchObject(payload);
});

test('unconfigured alternate hosts default to Direct Exchange', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  // Serve the actual built bytes on an alternate origin without touching production.
  await context.route('http://fork.test/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const response = await context.request.get(`${baseURL}${path}`);
    await route.fulfill({ response });
  });
  const page = await context.newPage();
  await page.goto('http://fork.test/browser-bridge/');
  await expect(page.locator('#direct-mode')).toBeChecked();
  await expect(page.locator('#otp-mode')).toBeDisabled();
  await context.unrouteAll({ behavior: 'ignoreErrors' });
  await context.close();
});

test('production host retains its existing signaling endpoint', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  // Intercept every request: this test never contacts the production service.
  await context.route('https://oh-tools.net/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const response = await context.request.get(`${baseURL}${path}`);
    await route.fulfill({ response });
  });
  const page = await context.newPage();
  await page.goto('https://oh-tools.net/browser-bridge/');
  await expect(page.locator('#otp-mode')).toBeChecked();
  expect(await page.evaluate(() => window.closedLoop.otpServerUrl)).toBe('https://signaling.oh-tools.net');
  await context.unrouteAll({ behavior: 'ignoreErrors' });
  await context.close();
});

test('directory URLs, legacy redirects, caching, and private-file boundaries', async ({ request }) => {
  for (const tool of tools) {
    const response = await request.get(tool.path.slice(0, -1), { maxRedirects: 0 });
    expect([301, 307, 308]).toContain(response.status());
    expect(response.headers().location).toBe(tool.path);
  }
  for (const [old, current] of [['closed-loop', 'browser-bridge'], ['duckdb-browser', 'data-workbench']]) {
    const response = await request.get(`/${old}/`, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(`/${current}/`);
  }
  for (const path of ['/package.json', '/.env.local', '/wrangler.jsonc', '/README.md', '/browser-bridge/cloudflare-worker.js', '/node_modules/diff/package.json', '/missing-page/']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  const wasm = await request.get('/vendor/wasm-vips-0.0.14/vips.wasm');
  expect(wasm.headers()['content-type']).toContain('application/wasm');
  expect(wasm.headers()['cache-control']).toContain('immutable');
  const worker = await request.get('/vendor/wasm-vips-0.0.14/vips.js');
  expect(worker.headers()['cross-origin-embedder-policy']).toBe('require-corp');
});

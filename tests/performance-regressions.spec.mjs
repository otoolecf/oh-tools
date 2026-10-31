import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

test('image worker supports chained edits, alpha blending, encoders, and reset', async ({ page }) => {
  const errors = [];
  const workers = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('worker', worker => workers.push(worker.url()));
  page.on('request', request => requests.push(request.url()));
  await page.goto('/image-editor/');
  await expect(page.locator('#uploadStatus')).toContainText('Ready. Choose an image');
  expect(await page.evaluate(() => typeof window.Vips)).toBe('undefined');
  expect(workers.some(url => url.endsWith('/image-editor/engine-worker.js'))).toBe(true);
  expect(requests.some(url => /heic-to/.test(url))).toBe(false);
  await page.locator('#fileInput').setInputFiles({
    name: 'alpha.svg', mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="red" fill-opacity=".6"/><circle cx="32" cy="24" r="15" fill="blue"/></svg>'),
  });
  await expect(page.locator('#previewImage')).toHaveAttribute('src', /^blob:/);
  const output = await page.evaluate(async () => {
    const operator = document.getElementById('resizeOperator');
    const { vips, currentImage } = operator;
    const edited = await currentImage.resize(.5).extractArea(0, 0, 24, 20).flip('horizontal').rot('d90').gaussblur(1).sharpen();
    const tint = document.getElementById('tintGrayscaleOperator');
    const blended = await tint.applyTintFallback(edited, 30, 160, 90, .5);
    const pixels = await blended.getpoint(0, 0);
    const encoded = {};
    for (const ext of ['png', 'jpg', 'webp', 'tiff']) {
      const buffer = await blended.writeToBuffer(`.${ext}`);
      const decoded = await vips.loadImage(buffer);
      encoded[ext] = { size: buffer.length, width: decoded.width, height: decoded.height };
    }
    return { width: blended.width, height: blended.height, alpha: blended.hasAlpha(), pixels, encoded };
  });
  expect(output).toMatchObject({ width: 20, height: 24, alpha: true });
  expect(output.pixels).toHaveLength(4);
  for (const encoded of Object.values(output.encoded)) {
    expect(encoded.size).toBeGreaterThan(50);
    expect(encoded).toMatchObject({ width: 20, height: 24 });
  }
  await page.locator('[data-tab="resize"]').click();
  await page.locator('resize-operator #resizeWidth').fill('32');
  await page.locator('resize-operator #resizeHeight').fill('24');
  await page.locator('resize-operator #applyResizeBtn').click();
  await expect.poll(() => page.locator('resize-operator').evaluate(op => op.currentImage?.width)).toBe(32);
  await page.locator('#resetBtn').click();
  await expect.poll(() => page.locator('resize-operator').evaluate(op => op.currentImage?.width)).toBe(64);
  expect(errors).toEqual([]);
});

test('database waits for slow startup and loads format extensions only when needed', async ({ page, context }) => {
  test.setTimeout(90_000);
  let releaseWasm;
  let requestedWasm;
  const gate = new Promise(resolve => { releaseWasm = resolve; });
  const requested = new Promise(resolve => { requestedWasm = resolve; });
  const extensions = [];
  page.on('request', request => {
    if (/\.duckdb_extension/.test(request.url())) extensions.push(request.url());
  });
  await context.route('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@*/dist/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1);
    if (!/^duckdb-.*\.(wasm|js)$/.test(name)) return route.continue();
    if (name.endsWith('.wasm')) { requestedWasm(); await gate; }
    await route.fulfill({
      path: resolve('node_modules/@duckdb/duckdb-wasm/dist', name),
      contentType: name.endsWith('.wasm') ? 'application/wasm' : 'application/javascript',
      headers: { 'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin' },
    });
  });
  await page.goto('/data-workbench/');
  await requested;
  // The former UI gave up after ten seconds, even while the engine was loading.
  await page.waitForTimeout(10_500);
  await expect(page.locator('#chooseFilesBtn')).toBeDisabled();
  await expect(page.locator('.database-preparation')).not.toContainText(/failed|couldn.t/i);
  releaseWasm();
  await expect(page.locator('#chooseFilesBtn')).toBeEnabled({ timeout: 45_000 });
  expect(extensions).toEqual([]);
  const results = await page.evaluate(async () => {
    const manager = window.duckDBManager;
    const results = [];
    for (const extension of ['json', 'parquet', 'xlsx']) {
      const exported = await manager.exportToFile("SELECT 'alpha' AS name, 42 AS value", `roundtrip.${extension}`, { array: true });
      if (!exported.success) throw new Error(exported.error);
      await document.querySelector('bdw-app').handleDirectURLFile({ fileName: exported.fileName });
      const direct = await manager.executeSQL('SELECT name, value FROM input_data');
      if (!direct.success || direct.rowCount !== 1) throw new Error(`Direct ${extension} read failed: ${direct.error || direct.rowCount}`);
      const file = new File([exported.buffer], `imported.${extension}`);
      const loaded = await manager.autoDetectAndLoad(file);
      const queried = await manager.executeSQL(`SELECT name, value FROM ${loaded.tableName}`);
      results.push({ extension, success: queried.success, data: queried.data?.map(row => ({ name: row.name, value: Number(row.value) })) });
    }
    return results;
  });
  expect(results).toEqual(['json', 'parquet', 'xlsx'].map(extension => ({ extension, success: true, data: [{ name: 'alpha', value: 42 }] })));
  expect(extensions.some(url => /json\.duckdb_extension/.test(url))).toBe(true);
  expect(extensions.some(url => /parquet\.duckdb_extension/.test(url))).toBe(true);
  expect(extensions.some(url => /excel\.duckdb_extension/.test(url))).toBe(true);
  expect(extensions.some(url => /fts\.duckdb_extension/.test(url))).toBe(false);
});

test('database download failures keep imports disabled and show an error', async ({ page, context }) => {
  await context.route('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@*/dist/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1);
    if (name.endsWith('.wasm')) return route.fulfill({ status: 503, body: 'Unavailable', headers: { 'Access-Control-Allow-Origin': '*' } });
    await route.fulfill({ path: resolve('node_modules/@duckdb/duckdb-wasm/dist', name), contentType: 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto('/data-workbench/');
  await expect(page.locator('.database-preparation')).toContainText(/couldn.t|failed/i);
  await expect(page.locator('#chooseFilesBtn')).toBeDisabled();
  expect(await page.evaluate(() => window.duckDBManager.isInitialized)).toBe(false);
});

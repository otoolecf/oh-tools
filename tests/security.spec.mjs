import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

const markup = '<img src=x onerror=window.__auditInjected=1>';

test('data files, schema, previews, and copy actions treat input as text; SQL history is tab-only', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@*/dist/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').at(-1);
    await route.fulfill({ path: resolve('node_modules/@duckdb/duckdb-wasm/dist', name),
      contentType: name.endsWith('.wasm') ? 'application/wasm' : 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.addInitScript(() => localStorage.setItem('bdw-sql-history', '["SET s3_secret_access_key=\'OLD_PRIVATE_VALUE\'"]'));
  await page.goto('/data-workbench/');
  await expect(page.locator('#chooseFilesBtn')).toBeEnabled({ timeout: 45_000 });
  expect(await page.evaluate(() => localStorage.getItem('bdw-sql-history'))).toBeNull();
  const hostileValue = "');window.__auditInjected=1;//";
  const filename = `${markup} quote's.csv`;
  const header = `${markup} "quoted"`;
  await page.locator('bdw-file-drop #fileInput').setInputFiles({ name: filename, mimeType: 'text/csv', buffer: Buffer.from(`"${header.replaceAll('"', '""')}",value\n"${hostileValue}",1\n`) });
  await expect(page.locator('#dataPreview .column-title').first()).toHaveText(header);
  await expect(page.locator('bdw-file-drop #fileList')).toContainText(filename);
  await expect(page.locator('bdw-schema-card')).toContainText(header);
  await page.locator('#dataPreview .copy-btn').first().evaluate(button => button.click());
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(hostileValue);
  expect(await page.locator('#dataPreview [onclick]').count()).toBe(0);
  await page.locator('bdw-sql-console').first().evaluate(op => {
    op.addToHistory('SELECT 42');
    for (const query of ["SET s3_secret_access_key='PRIVATE'", "SELECT 'private value'", "SELECT * FROM read_csv('https://example.com/?sig=private')", 'SELECT $$private$$', 'SELECT 1 -- private']) op.addToHistory(query);
  });
  expect(await page.locator('bdw-sql-console').first().evaluate(op => op.queryHistory)).toEqual(['SELECT 42']);
  expect(await page.evaluate(() => localStorage.getItem('bdw-sql-history'))).toBeNull();
  expect(await page.evaluate(() => window.__auditInjected)).toBeUndefined();
  expect(await page.locator('bdw-app img').count()).toBe(0);
  await page.locator('bdw-sql-console #clearHistoryBtn').first().evaluate(button => button.click());
  expect(await page.locator('bdw-sql-console').first().evaluate(op => op.queryHistory)).toEqual([]);
});

test('image metadata renders text and safe links without interpreting HTML', async ({ page }) => {
  await page.goto('/image-editor/');
  await expect(page.locator('#initialUploadBtn')).toBeEnabled();
  await page.locator('#fileInput').setInputFiles('tests/fixtures/security-metadata.jpg');
  await expect(page.locator('#previewImage')).toHaveAttribute('src', /^blob:/);
  await page.locator('[data-tab="metadata"]').click();
  await expect(page.locator('metadata-operator')).toContainText('window.__auditImageMetadata=1');
  expect(await page.evaluate(() => window.__auditImageMetadata)).toBeUndefined();
  expect(await page.locator('metadata-operator img').count()).toBe(0);
  await page.locator('metadata-operator').evaluate(op => {
    op.metadata.extended = { audit: { link: 'https://example.com/" onmouseover="window.__auditInjected=1', value: 'javascript:alert(1)' } };
    op.updateMetadataDisplay();
  });
  expect(await page.locator('metadata-operator [onmouseover]').count()).toBe(0);
  expect(await page.locator('metadata-operator a[href^="javascript:"]').count()).toBe(0);
});

test('peer messages and file controls cannot inject markup or event handlers', async ({ page }) => {
  await page.goto('/browser-bridge/');
  await page.waitForFunction(() => Boolean(window.closedLoop));
  await page.evaluate(markup => {
    const bridge = window.closedLoop;
    bridge.communicationSection.style.display = 'block';
    bridge.handleMessage(JSON.stringify({ kind: 'text', content: markup, timestamp: Date.now() }));
    bridge.handleMessage(JSON.stringify({ kind: 'file-start', transferId: "');window.__auditInjected=1;//", name: `${markup}.txt`, size: 0, type: 'text/plain' }));
    bridge.addFileMessage('received', `${markup}.txt`, 3, new Date(), 'YWJj', 'text/plain');
    bridge.handleMessage(new ArrayBuffer(2));
  }, markup);
  await expect(page.locator('.clipboard-text').first()).toHaveText(markup);
  await expect(page.locator('.transfer-name')).toHaveText(`${markup}.txt`);
  await expect(page.locator('.file-name').first()).toHaveText(`${markup}.txt`);
  const download = page.waitForEvent('download');
  await page.locator('.file-actions button').first().click();
  expect((await download).suggestedFilename()).toContain('.txt');
  expect(await page.locator('.transfer-item [onclick], .message-item [onclick]').count()).toBe(0);
  expect(await page.evaluate(() => window.__auditInjected)).toBeUndefined();
});

test('video names, invalid hash input, and diff parse errors stay inert', async ({ page }) => {
  await page.goto('/video-trimmer/');
  await page.locator('vt-info-panel').evaluate((panel, markup) => panel.setMetadata({ fileName: `${markup}.webm`, fileSize: 32, containerFormat: 'webm', videoCodec: 'vp8', displayWidth: 32, displayHeight: 32, duration: 1_000_000, keyframeCount: 1, avgKeyframeInterval: 0 }), markup);
  await expect(page.locator('vt-info-panel')).toContainText(`${markup}.webm`);
  expect(await page.locator('vt-info-panel img').count()).toBe(0);
  await page.goto('/hash-generator/');
  await page.locator('#algorithmSelect').selectOption('HMAC-SHA-256');
  await page.locator('#verifyMode').check();
  await page.locator('#secretKey').fill('TEST_ONLY_KEY');
  await page.locator('#inputText').fill('audit');
  await page.locator('#expectedHash').fill('<img src=x onerror=window._h=1>');
  await page.locator('#generateBtn').click();
  await expect(page.locator('#resultsContainer')).toContainText('<img src=x onerror=window._h=1>');
  expect(await page.locator('#resultsContainer img').count()).toBe(0);
  expect(await page.evaluate(() => window._h)).toBeUndefined();
  await page.goto('/diff-utilities/');
  await page.locator('[data-tab="json"]').click();
  await page.locator('#json1').fill('<svg/onload=_d=1>');
  await page.locator('#json2').fill('{}');
  await page.locator('#compareJSON').click();
  expect(await page.locator('#jsonDiffResult svg').count()).toBe(0);
});

const signaling = 'http://localhost:3002/temp/';
const headers = { 'CF-Connecting-IP': '192.0.2.1' };
const data = { encryptedData: 'VEVTVF9PTkxZX1BBWUxPQUQ=', type: 'offer' };

test('signaling requires functioning rate limits and bounds untrusted records', async ({ request }) => {
  for (const [mode, status] of [['missing', 503], ['error', 503], ['deny', 429]]) {
    expect((await request.get(`${signaling}987650`, { headers: { ...headers, 'X-Audit-Limiter': mode } })).status()).toBe(status);
  }
  for (const invalid of [{ encryptedData: {}, type: 'offer' }, { ...data, type: 'arbitrary' }, { ...data, encryptedData: 'x'.repeat(33 * 1024) }]) {
    const response = await request.post(`${signaling}987651`, { headers, data: invalid });
    expect([400, 413]).toContain(response.status());
  }
});

test('signaling atomically creates and consumes records under concurrent requests', async ({ request }) => {
  const code = `${signaling}${Math.floor(100000 + Math.random() * 800000)}`;
  const creates = await Promise.all(Array.from({ length: 4 }, () => request.post(code, { headers, data })));
  expect(creates.map(r => r.status()).sort()).toEqual([200, 409, 409, 409]);
  const reads = await Promise.all(Array.from({ length: 6 }, () => request.get(code, { headers })));
  expect(reads.filter(r => r.status() === 200)).toHaveLength(1);
  expect(reads.filter(r => r.status() === 404)).toHaveLength(5);
  expect(await reads.find(r => r.status() === 200).json()).toMatchObject(data);
  expect(reads[0].headers()['cache-control']).toBe('no-store');
  expect((await request.post(code, { headers, data })).status()).toBe(409);
  await request.post(code.replace('/temp/', '/test-expire/'));
  expect((await request.get(code, { headers })).status()).toBe(404);
  expect((await request.post(code, { headers, data })).status()).toBe(200);
});

test('legacy digests and HMAC still match independent vectors after removing CryptoJS', async ({ page }) => {
  const { createHash, createHmac } = await import('node:crypto');
  await page.goto('/hash-generator/');
  for (const [algorithm, nodeAlgorithm] of [['MD5', 'md5'], ['RIPEMD160', 'ripemd160']]) {
    await page.locator('#algorithmSelect').selectOption(algorithm);
    for (const [input, hex] of [['Hello, 世界', false], ['00ff6180', true]]) {
      await page.locator('#treatAsHex').setChecked(hex);
      await page.locator('#inputText').fill(input);
      await page.locator('#generateBtn').click();
      await expect(page.locator('.hash-value')).toHaveText(createHash(nodeAlgorithm).update(Buffer.from(input, hex ? 'hex' : 'utf8')).digest('hex'));
    }
  }
  await page.locator('#algorithmSelect').selectOption('HMAC-SHA-256');
  await page.locator('#treatAsHex').uncheck();
  await page.locator('#secretKey').fill('vector-key');
  await page.locator('#inputText').fill('vector-message');
  const hmac = createHmac('sha256', 'vector-key').update('vector-message').digest('hex');
  await page.locator('#generateBtn').click();
  await expect(page.locator('.hash-value')).toHaveText(hmac);
  await page.locator('#verifyMode').check();
  await page.locator('#expectedHash').fill(hmac);
  await page.locator('#generateBtn').click();
  await expect(page.locator('.verification-status')).toHaveText(/^\W*VALID$/);
  await page.locator('#expectedHash').fill('00'.repeat(32));
  await page.locator('#generateBtn').click();
  await expect(page.locator('.verification-status')).toHaveText(/^\W*INVALID$/);
});

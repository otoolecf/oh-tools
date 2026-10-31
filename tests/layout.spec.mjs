import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const { tools } = JSON.parse(readFileSync('tools.json', 'utf8'));

for (const width of [320, 390]) {
  test(`public pages and controls fit a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ['/', '/about/', ...tools.map(tool => tool.path)]) {
      await page.goto(path);
      await expect(page.locator('otoolebox-header a.nav-brand')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width + 1);
      if (path !== '/') {
        await expect(page.locator('otoolebox-header .current-tool')).toBeHidden();
        await expect(page.locator('otoolebox-header .nav-link').first()).toHaveText('All Tools');
      }
    }
    await page.goto('/barcode-generator/');
    await page.locator('#barcodeType').selectOption('qrcode');
    await page.locator('#barcodeData').fill('https://example.com/');
    await page.locator('#generateBtn').click();
    await expect.poll(() => page.locator('#barcodeCanvas').evaluate(canvas => canvas.width)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.goto('/diff-utilities/');
    for (const tab of await page.locator('.tab-button').all()) {
      const box = await tab.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await tab.click();
      await expect(tab).toHaveClass(/active/);
    }
  });
}

test('tool buttons grow and shrink together as labels wrap', async ({ page }) => {
  await page.goto('/');
  const heights = () => page.locator('.tool-link').evaluateAll(links => links.map(link => link.getBoundingClientRect().height));
  const allEqual = async () => {
    const values = await heights();
    return Math.max(...values) - Math.min(...values) < 1;
  };
  for (const width of [1440, 800, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(allEqual).toBe(true);
  }
  const before = (await heights())[0];
  const label = page.locator('.tool-link-label').first();
  const original = await label.textContent();
  await label.evaluate(element => { element.textContent = 'A deliberately much longer tool label that wraps onto several lines'; });
  await expect.poll(async () => Math.min(...await heights())).toBeGreaterThan(before);
  await expect.poll(allEqual).toBe(true);
  await label.evaluate((element, text) => { element.textContent = text; }, original);
  await expect.poll(async () => Math.max(...await heights())).toBeLessThanOrEqual(before);
});

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pagePaths } from '../scripts/site-content.mjs';

const { tools } = JSON.parse(readFileSync('tools.json', 'utf8'));

test('public content and tool discovery work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.tool-card')).toHaveCount(tools.length);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Oh! Tools');
  expect(JSON.parse(await page.locator('#site-name-schema').textContent())).toEqual({
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Oh! Tools', url: 'https://oh-tools.net/',
  });
  for (const tool of tools) {
    await expect(page.getByRole('link', { name: `Open ${tool.name}`, exact: true })).toHaveAttribute('href', tool.path);
    await page.goto(tool.path);
    await expect(page.locator('otoolebox-header a.nav-brand')).toBeVisible();
    if (tool.path === '/video-trimmer/') await expect(page.locator('vt-file-drop #pickBtn')).toBeVisible();
    if (tool.path === '/data-workbench/') await expect(page.locator('bdw-file-drop #chooseFilesBtn')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tool.name);
    await expect(page.locator('.tool-description')).toHaveText(tool.description);
    await expect(page.locator('.tool-guide')).toBeVisible();
    await expect(page.locator('main > .tool-guide')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Related tools' }).getByRole('link')).toHaveCount(3);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://oh-tools.net${tool.path}`);
    await page.goto('/');
  }
  await page.goto('/about/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('About Oh! Tools');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Why I Built This', 'Why “Oh! Tools”?', 'How it works']);
  await expect(page.locator('#how-it-works + p')).toContainText('they don’t process your files');
  await context.close();
});

test('static content stays present when the old directory fetch is unavailable', async ({ page }) => {
  let directoryRequests = 0;
  await page.route('**/tools.json', route => { directoryRequests++; return route.abort(); });
  await page.goto('/');
  await expect(page.locator('.tool-card')).toHaveCount(tools.length);
  await page.getByRole('link', { name: 'Open JSON Utilities', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('JSON Utilities');
  await page.locator('#jsonEditor').fill('{name: "Ada",}');
  await page.locator('#cleanBtn').click();
  await expect.poll(async () => JSON.parse(await page.locator('#jsonEditor').inputValue())).toEqual({ name: 'Ada' });
  expect(directoryRequests).toBe(0);
});

test('production metadata, complete sitemap, and social preview are served', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(pagePaths.length);
  for (const path of pagePaths) {
    expect(xml).toContain(`<loc>https://oh-tools.net${path}</loc>`);
    const response = await request.get(path);
    expect(response.headers()['x-robots-tag']).toBeUndefined();
    expect(await response.text()).toContain('name="robots" content="index, follow"');
  }
  const image = await request.get('/og-image.png');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
});

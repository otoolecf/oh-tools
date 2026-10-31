import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { favicon, punctuationDrawing } from '../components/brand.mjs';

// Authoring only: generated images are committed and copied by the build.
// Run: node scripts/render-social-preview.mjs
const font = (await readFile('brand/inter-variable.woff2')).toString('base64');
const fontFace = `@font-face { font-family: "Oh Tools Inter"; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; }`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>${fontFace}</style>`);
  await page.evaluate(() => document.fonts.load('750 96px "Oh Tools Inter"'));
  const ohWidth = await page.evaluate(() => {
    const context = document.createElement('canvas').getContext('2d');
    context.font = '750 96px "Oh Tools Inter"';
    context.letterSpacing = '-5.28px';
    return context.measureText('Oh').width;
  });
  const punctuationX = 96 + ohWidth + 9.6;
  const toolsX = punctuationX + 32.64 + 4.8 + 21.12;
  const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <title>Oh! Tools. Handy tools for everyday annoyances.</title>
  <style>${fontFace}</style>
  <rect width="1200" height="630" fill="#f8fafc"/>
  <rect x="48" y="48" width="1104" height="534" rx="24" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
  <g font-family="Oh Tools Inter, Inter, Arial, sans-serif" fill="#475569">
    <g font-size="96" font-weight="750" letter-spacing="-5.28">
      <text x="96" y="232">Oh</text>
      <text x="${toolsX}" y="232">Tools</text>
    </g>
    <g color="#475569" transform="translate(${punctuationX} 158) scale(.96) rotate(-14 17 43)">${punctuationDrawing('#ffffff')}</g>
    <text x="98" y="307" font-size="38">Handy tools for everyday annoyances.</text>
    <g font-size="25">
      <text x="98" y="391">Images. Video. JSON. Data. A few other things.</text>
      <text x="98" y="434">Free tools. Files processed in your browser.</text>
    </g>
    <text x="98" y="523" font-size="25" fill="#64748b">oh-tools.net</text>
  </g>
</svg>`;
  await writeFile('social-preview.svg', social);
  await page.setContent(`<style>html,body{margin:0;width:1200px;height:630px;overflow:hidden}</style>${social}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'og-image.png' });

  await writeFile('favicon.svg', favicon({ adaptive: true }));
  const frames = [];
  for (const size of [16, 32, 48, 180]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:${size === 180 ? '#ffffff' : 'transparent'}}svg{display:block;width:100%;height:100%}</style>${favicon()}`);
    const png = await page.screenshot({ omitBackground: size !== 180 });
    if (size === 180) await writeFile('apple-touch-icon.png', png);
    else {
      frames.push({ size, png });
      if (size !== 48) await writeFile(`favicon-${size}x${size}.png`, png);
    }
  }
  // ICO directory entries can contain PNG frames, preserving transparency.
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile('favicon.ico', Buffer.concat([header, ...frames.map(frame => frame.png)]));
  console.log('Rendered social preview, adaptive SVG favicon, PNG/ICO fallbacks, and touch icon.');
} finally {
  await browser.close();
}

import { readFileSync } from 'node:fs';
import { brandStyles, wordmark } from '../components/brand.mjs';
import { headerTemplate } from '../components/header-template.mjs';
import { videoAppMarkup, videoFileDropMarkup } from '../video-trimmer/initial-markup.mjs';
import { dataAppMarkup, dataFileDropMarkup } from '../data-workbench/initial-markup.mjs';

export const siteOrigin = 'https://oh-tools.net';
export const siteName = 'Oh! Tools';
export const { tools } = JSON.parse(readFileSync(new URL('../tools.json', import.meta.url), 'utf8'));
const guides = JSON.parse(readFileSync(new URL('../content/tool-guides.json', import.meta.url), 'utf8'));
export const pagePaths = ['/', '/about/', ...tools.filter(tool => tool.status === 'active').map(tool => tool.path)];

const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function toolHero(tool) {
  const libraries = tool.poweredBy.map(lib => `<a href="${escape(lib.url)}" target="_blank" rel="noopener noreferrer">${escape(lib.name)}</a>`).join(', ');
  return `<tool-hero data-tool-path="${tool.path}">
    <section class="tool-hero-content" aria-labelledby="tool-title">
      <h1 id="tool-title">${escape(tool.name)}</h1>
      <p class="tool-description">${escape(tool.description)}</p>
      <div class="tool-hero-extra">
        <p class="tool-powered-by">Built with ${libraries}.</p>
        ${tool.heroExtra || ''}
      </div>
    </section>
  </tool-hero>`;
}

function toolGuide(tool) {
  const guide = guides[tool.path];
  if (!guide) throw new Error(`Missing guide for ${tool.path}`);
  const related = guide.related.map(path => {
    const match = tools.find(item => item.path === path);
    if (!match || match.path === tool.path) throw new Error(`Invalid related tool: ${path}`);
    return `<a href="${match.path}">${escape(match.name)}</a>`;
  });
  return `<section class="tool-guide" aria-labelledby="guide-title">
    <h2 id="guide-title">${escape(guide.title)}</h2>
    <p>${escape(guide.intro)}</p>
    <ol>${guide.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol>
    <h3>${escape(guide.example.title)}</h3>
    <p>${escape(guide.example.description)}</p>
    ${guide.example.code ? `<pre><code>${escape(guide.example.code)}</code></pre>` : ''}
    <h3>What to know before you start</h3>
    ${guide.notes.map(note => `<p>${escape(note)}</p>`).join('')}
    <nav aria-label="Related tools"><strong>Also handy:</strong> ${related.join(' · ')}. <a href="/">All tools</a></nav>
  </section>`;
}

export function renderPage(html, path, { noindex = false, assetOrigin = siteOrigin } = {}) {
  if (!pagePaths.includes(path)) return html;
  const currentTool = tools.find(tool => tool.path === path);
  html = html.replace(/(<otoolebox-header\b[^>]*>)[\s\S]*?(<\/otoolebox-header>)/,
    (_, open, close) => `${open}<template shadowrootmode="open">${headerTemplate({ currentPath: path, currentTool: currentTool?.name })}</template>${close}`);
  if (path === '/video-trimmer/') {
    const initial = videoAppMarkup().replace('<vt-file-drop></vt-file-drop>', `<vt-file-drop>${videoFileDropMarkup()}</vt-file-drop>`);
    html = html.replace(/<vt-app\b[^>]*>[\s\S]*?<\/vt-app>/, `<vt-app class="vt-app is-empty">${initial}</vt-app>`);
  }
  if (path === '/data-workbench/') {
    const initial = dataAppMarkup().replace('<bdw-file-drop></bdw-file-drop>', `<bdw-file-drop>${dataFileDropMarkup()}</bdw-file-drop>`);
    html = html.replace(/<bdw-app\b[^>]*>[\s\S]*?<\/bdw-app>/, `<bdw-app>${initial}</bdw-app>`);
  }
  // These tags have one source of truth for every page and build mode.
  html = html.replace(/\s*<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, '')
    .replace(/\s*<meta\b(?=[^>]*(?:name|property)=["'](?:robots|og:url|og:type|og:site_name|og:image(?::(?:width|height|alt))?|twitter:card|twitter:image(?::alt)?)["'])[^>]*>/gi, '')
    .replace(/\s*<script\b[^>]*\bid=["']site-name-schema["'][^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace('</head>', `
    <link rel="preload" href="/brand/inter-variable.woff2" as="font" type="font/woff2" crossorigin />
    <script>try{document.documentElement.dataset.theme=localStorage.getItem('theme')||'light'}catch{}</script>
    <script type="module" src="/components/otoolebox-header.js"></script>
    <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
    <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
    <link rel="canonical" href="${siteOrigin}${path}" />
    <meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}" />
    <meta property="og:url" content="${siteOrigin}${path}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:image" content="${assetOrigin}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Oh! Tools. Handy tools for everyday annoyances." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${assetOrigin}/og-image.png" />
    <meta name="twitter:image:alt" content="Oh! Tools. Handy tools for everyday annoyances." />
    ${path === '/' ? `<script type="application/ld+json" id="site-name-schema">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: siteName, url: `${siteOrigin}/` })}</script>` : ''}
    ${path === '/' || path === '/about/' ? `<style>${brandStyles}</style>` : ''}
  </head>`);
  if (path === '/') {
    const cards = tools.filter(tool => tool.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .map(tool => `<div class="tool-card">
      <h2>${escape(tool.name)}</h2>
      <p>${escape(tool.description)}</p>
      <a href="${tool.path}" class="tool-link"><span class="tool-link-label">Open ${escape(tool.name)}</span></a>
    </div>`).join('\n');
    return html.replace('<!-- site-wordmark -->', wordmark())
      .replace(/(<div\b[^>]*id="toolsGrid"[^>]*>)[\s\S]*?(<\/div>)/, (_, open, close) => `${open}${cards}${close}`);
  }
  if (path === '/about/') return html.replace('<!-- site-wordmark -->', wordmark());
  const tool = tools.find(tool => tool.path === path);
  return html.replace(/<tool-hero\b[^>]*>[\s\S]*?<\/tool-hero>/, () => toolHero(tool))
    .replace('</main>', () => `${toolGuide(tool)}\n</main>`);
}

export function sitemap() {
  // Omit lastmod until we have a reliable per-page change date.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pagePaths.map(path => `  <url><loc>${siteOrigin}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
}

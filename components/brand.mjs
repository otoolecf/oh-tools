// Wrench and settings drawings from Lucide (ISC). See brand/LUCIDE-LICENSE.txt.
// This geometry is shared by the site, favicon, and social image generator.
const wrench = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>';
const gear = '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>';

export function punctuationDrawing(paper = 'var(--brand-paper, var(--card-bg))') {
  // The approved wrench fits a 34 × 52 viewport, with centered SVG aspect ratio.
  return `<g fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <g transform="translate(17 26) rotate(-45) scale(1.4166667) translate(-12 -12)" stroke-width="2.2">${wrench}</g>
    <g transform="translate(17 73) scale(1.0833333) translate(-12 -12)" stroke-width="1.8">${gear}<circle cx="12" cy="12" r="3" fill="${paper}"/></g>
  </g>`;
}

export const brandStyles = `
  .brand-wordmark { display: inline-flex; align-items: center; white-space: nowrap; font-family: Inter, Arial, sans-serif; font-weight: 750; letter-spacing: -.055em; line-height: 1; color: var(--brand-ink, #475569); }
  .brand-punctuation { display: inline-block; flex: 0 0 auto; width: .34em; height: .86em; margin: 0 .05em 0 .1em; transform: rotate(-14deg); overflow: visible; }
  .brand-tools { margin-left: .22em; }
`;

export function wordmark() {
  return `<span class="brand-wordmark" role="img" aria-label="Oh! Tools"><span aria-hidden="true">Oh</span><svg xmlns="http://www.w3.org/2000/svg" class="brand-punctuation" viewBox="0 0 34 86" aria-hidden="true">${punctuationDrawing()}</svg><span class="brand-tools" aria-hidden="true">Tools</span></span>`;
}

export function favicon({ adaptive = false, paper = '#ffffff' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <title>Oh! Tools</title>
  <style>:root { color: #475569; --brand-paper: ${paper}; }${adaptive ? '@media (prefers-color-scheme: dark) { :root { color: #cbd5e1; --brand-paper: #0f172a; } }' : ''}</style>
  <g transform="translate(21.12 4.48) scale(.64) rotate(-14 17 43)">${punctuationDrawing('var(--brand-paper)')}</g>
</svg>`;
}

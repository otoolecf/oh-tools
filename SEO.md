# Search and public page content

The Vite HTML transform in `scripts/site-content.mjs` generates the homepage
directory and each tool's heading, description, library credits, guide, and
related links. This runs during the build (and in Vite development), not on a
processing server. User inputs and files are not involved in generating pages.

- `tools.json` supplies names, descriptions, paths, and library credits.
- `content/tool-guides.json` supplies examples, instructions, limitations, and
  related tool paths. Add a guide when registering a new tool.
- The public origin is `siteOrigin` in `scripts/site-content.mjs`. Forks should
  replace it before publishing to their own domain.
- Sitemap and robots files are generated into the build's public assets.
  The sitemap includes active tools and omits `lastmod` until there is a reliable
  per-page modification date. Do not replace dates with every deployment time.
- Canonical URLs, Open Graph URLs, robots directives, and social preview image
  tags come from the same build transform. Titles and descriptions stay in each
  page's HTML source.
- `components/brand.mjs` defines the shared wordmark and wrench/gear geometry.
- Run `node scripts/render-social-preview.mjs` to regenerate `social-preview.svg`, `og-image.png` (1200×630), and the favicon/touch assets. It uses the bundled Inter font; the generated social SVG embeds the font and needs no external resources.
- Staging social metadata points to staging's image; canonical URLs remain on the production domain.
  Deploys publish the generated images without requiring a browser.

Production (`npm run build`) writes indexable pages to `dist/`. Staging
(`npm run build:staging`) writes to `dist-staging/` with HTML `noindex` and an
`X-Robots-Tag: noindex` header. Both modes allow crawling; blocking crawling
would prevent search engines from seeing the indexing directive. Staging still
points canonical URLs at production and does not advertise a sitemap in robots.

`scripts/check-build.mjs` checks both modes during their builds, including
static headings, canonical URLs, the full sitemap, indexing directives, the
social image, and deployment file boundaries. Browser tests also exercise the
public content with JavaScript disabled and with `/tools.json` unavailable.

## Search Console

Use the existing `oh-tools.net` Domain property in Google Search Console.
DNS ownership verification and search reports require no visitor tracking
script. Keep its existing verification records intact.

After publishing these changes to production:

1. Check `https://oh-tools.net/sitemap.xml` and submit that URL under Sitemaps if
   it is not already submitted. Do not submit the staging sitemap.
2. Use URL Inspection on the homepage and representative tools; check Google's
   rendered content, selected canonical, and indexing eligibility.
3. Record the report dates, indexed pages, impressions, clicks, CTR, and queries.
   Review changes after Google has recrawled the updated production pages.
4. Check mobile Core Web Vitals when field data is available. Lab measurements
   help diagnose loading issues but are not real-user data or ranking forecasts.

The connected property was accessible during this work, but the overview
reported that performance, indexing, and experience data were still processing.
No traffic or ranking improvement can be inferred from those pending reports.
The production sitemap was already submitted successfully, last read October
30, 2026, with 10 discovered pages. The new build adds Video Trimmer as the
eleventh page (homepage plus ten tools); that entry will reach Google after
production publication and a subsequent sitemap fetch.
The Core Web Vitals report separately confirms insufficient usage data for
both mobile and desktop over its last 90 days.

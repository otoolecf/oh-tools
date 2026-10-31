# Search and public page content

The Vite HTML transform in `scripts/site-content.mjs` generates the homepage
directory and each tool's heading, description, library credits, guide, and
related links. This runs during the build (and in Vite development), not on a
processing server. User inputs and files are not involved in generating pages.

- `tools.json` supplies names, descriptions, paths, and library credits.
- `about/index.html` holds the project story and processing/network details.
  It is linked from the shared header.
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
- The homepage includes `WebSite` JSON-LD with the preferred name `Oh! Tools`
  and canonical home URL. Every page includes `og:site_name`. These are static
  metadata and do not load tracking scripts or send visitor data.
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

The build also renders the shared header using declarative shadow DOM and the
initial Video Trimmer/Data Workbench import panels. Their custom elements
enhance that markup rather than replacing it during startup. All pages reuse
the local Inter font, preloaded by the HTML transform.

The Image Editor initializes VIPS and performs its image pipelines in a browser
worker. Its HEIC converter loads only after an HEIC/HEIF file is selected.
Data Workbench downloads its core engine at startup and prepares JSON, Parquet,
and Excel extensions when their formats are used; SQL can load other extensions
through DuckDB. These changes keep file processing on the visitor's device.

See the [baseline mobile audit](docs/performance-audit-2026-10-31.md) and
[implementation and repeat audit](docs/performance-improvements-2026-10-31.md).

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
30, 2026, with 10 discovered pages. The build includes Video Trimmer and an
About page, for 12 pages total (homepage, About, and ten tools). Those entries
will reach Google after production publication and a subsequent sitemap fetch.
The Core Web Vitals report separately confirms insufficient usage data for
both mobile and desktop over its last 90 days.

# Mobile performance audit — October 31, 2026

The site-name metadata is implemented and deployed to staging. The mobile audit
found two primary performance issues: Image Editor's expensive startup on the
main thread, and layout shifts when the shared header and tool interfaces mount.
Database startup is also substantially slower than its initial paint suggests.
No performance refactors were made during this audit.

## Target and method

- Target: `https://oh-tools-staging.otoolecf.workers.dev/` and its Image Editor,
  Video Trimmer, and Data Workbench pages.
- Deployment: `999dae1b-04eb-4197-bb6c-ade47481327c`.
- Lighthouse 13.6.0, Headless Chrome 156, mobile emulation at 412 × 823,
  device scale factor 1.75, with a fresh browser profile/storage reset per run.
- Three serial cold-load runs per page. Lighthouse used simulated throttling:
  150 ms network RTT, 1,638.4 Kbps throughput, and 4× CPU slowdown.
- Performance and automated accessibility categories were collected. First-run
  traces and network logs were saved for each page.
- An additional single startup check per page used DevTools-applied throttling:
  562.5 ms request latency, 1,474.56 Kbps download, 675 Kbps upload, 4× main-thread
  CPU slowdown, and disabled browser cache. These readiness measurements use a
  different throttling method from the Lighthouse simulated metrics.
- All requests in the four first-run Lighthouse network logs succeeded. The
  startup checks reached their readiness conditions without page errors.

The Chrome DevTools MCP connector was unavailable, so Lighthouse CLI and a
Playwright/DevTools startup probe were used instead. These are lab measurements,
not results from a physical phone or real visitors. This audit does not measure
field INP, field Core Web Vitals percentiles, or import/export throughput after
loading a file. TBT is a lab blocking metric, not a measurement of INP.

[Machine-readable measurements](performance/2026-10-31/results.json) include
every run, settings, readiness conditions/results, and layout-shift entries.
Raw Lighthouse HTML/JSON reports and trace files are retained with the audit's
chat artifacts rather than committed as large generated files.

## Lighthouse results

Values are medians of three runs. Transfer sizes are compressed network bytes
in decimal MB. LCP is largest contentful paint; TBT is total blocking time; CLS
is cumulative layout shift.

| Page | Performance / 100 | FCP | LCP | TBT | Median CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage | 96 | 1.77 s | 1.77 s | 2 ms | 0.000 | 0.42 MB |
| Image Editor | 64 | 1.09 s | 1.09 s | 6,622 ms | 0.143 | 4.86 MB |
| Video Trimmer | 82 | 0.80 s | 0.80 s | 31 ms | 0.378 | 0.48 MB |
| Data Workbench | 98 | 1.05 s | 1.05 s | 13 ms | 0.000 | 6.69 MB |

Medians alone hide important variation:

- Homepage: performance 96–99; LCP 1.76–1.80 s; CLS 0 in every run.
- Image Editor: performance 41–65; LCP 0.83–4.11 s; TBT 6.06–6.67 s;
  CLS 0.143 in every run. Its low median LCP does not mean the editor is ready.
- Video Trimmer: performance 82–100; CLS was 0, 0.378, and 0.378.
- Data Workbench: performance 76–100; CLS was 1.000, 0, and 0. The high median
  score does not establish consistently stable loading.

Using Google's published good thresholds as lab reference points, all median
LCP values are within 2.5 seconds. Image Editor and Video Trimmer exceed the
0.1 CLS threshold, and Data Workbench had one severe shift. These observations
are not a field Core Web Vitals pass or fail; field evaluation also requires INP
and sufficient real-user measurements.

## Time until the tool is ready

These are single exploratory runs under the additional DevTools-applied mobile
profile, not medians or physical-phone guarantees. Measurement starts at
navigation and ends at the stated condition.

| Page | Ready after | Readiness condition |
| --- | ---: | --- |
| Homepage | 1.43 s | Shared header mounted and all ten tool links present |
| Image Editor | 32.01 s | VIPS initialization completed, the ready status appeared, and image selection was enabled |
| Video Trimmer | 2.07 s | Video engine created and file-selection control present |
| Data Workbench | 40.72 s | Database manager reports initialized, including its eager extension loading |

For comparison, the same startup probes saw Image Editor paint at 1.46 s and
Data Workbench at 1.32 s. The visible page and the processing engine have very
different readiness times. No image, video, or dataset was uploaded or processed
as part of these startup measurements.

## Prioritized findings

### 1. Image Editor startup blocks the main thread — high priority

The three Lighthouse runs consistently report more than six seconds of TBT.
In run 2, script evaluation attributed to `vips.js` accounts for about 6.94 s of
CPU time under Lighthouse's mobile model. The editor initializes VIPS and its
HEIF/SVG plugins immediately on page load.

The page also loads `vips.js` and `heic-to.js` as classic parser-blocking scripts.
The HEIC converter transfers about 588 KB (2.52 MB decoded), although no HEIC
file has been selected. Lighthouse run 2 estimates 2.85 s of potential paint
savings associated with deferring that script. This is a modeled opportunity,
not a measured improvement, and it will not by itself eliminate VIPS CPU cost.

Recommended next implementation:

- Coordinate vendor loading asynchronously so the shared navigation and initial
  interface can mount without waiting for the converter scripts.
- Load the HEIC converter when required by file selection/format detection,
  retaining HEIC support and handling readiness explicitly.
- Profile VIPS startup in the saved trace and move expensive initialization/work
  away from the main thread where the library permits it. Validate with another
  mobile audit rather than assuming that adding `defer` fixes CPU blocking.

Source: [vendor script tags](../image-editor/index.html),
[initializeLibraries](../image-editor/script.js).

### 2. Reserve space before custom elements mount — high priority

The shared header starts as an empty custom element. In the saved traces it
later occupies approximately 117 px at the audited mobile width, moving the
main container from y=0 to y=117. Tool components also insert their initial
panels after JavaScript runs, moving the previously visible guide content.

Video Trimmer's separate startup probe reproduced CLS 0.378 with no recent user
input. Its sources included the main container moving down by 117 px and the
guide section being pushed out of the initial viewport. Image Editor's probe
reproduced CLS 0.143. Data Workbench's first Lighthouse trace captures a much
larger combined shift during mounting; its other runs painted after mounting
and did not score a shift.

Recommended next implementation:

- Give the shared header a stable initial footprint at each responsive layout,
  or render its initial navigation markup at build time and enhance it locally.
- Reserve initial tool-panel space or render the empty import interface during
  the build. Keep the explanatory guide from appearing in space that the app
  will immediately occupy.

Source: [header component](../components/otoolebox-header.js),
[video app mounting](../video-trimmer/components/vt-app.js),
[database app mounting](../data-workbench/components/bdw-app.js).

### 3. Data Workbench downloads the engine and four extensions up front — medium priority

The page transfers about 6.69 MB before any user data is selected. The database
WASM alone transfers about 4.99 MB and expands to 33.50 MB. Parquet, JSON, Excel,
and FTS extension downloads add about 1.11 MB. The manager sets `isInitialized`
only after attempting all of them, even for a user who wants to open a CSV.

Recommended next implementation: retain worker-based database execution, load
format/query-specific extensions when needed, and give users accurate loading
and failure feedback. The core WASM download remains a real cost of local SQL;
delaying it until the first query would move the waiting time rather than
necessarily reduce it.

Source: [database initialization and extension loading](../data-workbench/duckdb-manager.js).

### 4. Homepage has an avoidable external font stylesheet dependency — lower priority

The homepage is already healthy on median LCP and CLS. Its Google Fonts CSS
request is nevertheless render-blocking; Lighthouse run 1 estimates about
850 ms of potential LCP/FCP savings. The page already downloads a locally hosted
Inter variable font for the wordmark, plus the Google-hosted body font.

Recommended next implementation: evaluate reusing the local Inter font for the
body and removing the external stylesheet request. Recheck typography and font
swap behavior across pages before deploying that change.

No blanket caching or compression change is recommended. The captured responses
for the shared JavaScript and VIPS WASM use compression and
`Cache-Control: public, max-age=31536000, immutable`. Video Trimmer and Data
Workbench's unused-JavaScript diagnostics estimate **0 ms** of paint savings;
their media/database code is used after interaction and should not be removed
based on an empty-page coverage report.

## Accessibility observations

Automated accessibility scores were 96 (home), 94 (Image Editor), 98 (Video
Trimmer), and 95 (Data Workbench). These are automated findings, not a complete
WCAG assessment.

- Homepage tagline: contrast 3.13:1 at 16 px, below 4.5:1. Its `opacity: 0.8`
  lightens the text; review removing that opacity.
- Image Editor: visually disabled tabs are flagged for 1.93:1 contrast. Review
  proper native disabled/ARIA semantics as well as their visual state; inactive
  controls have different WCAG treatment from active controls.
- Data Workbench: the mobile notice is 3.67:1 and ready-status text is 2.3:1.
- The three tool pages have heading-order findings, such as an H1 followed
  directly by the Video Trimmer import panel's H3.

## Site-name metadata and validation

- `og:site_name` is `Oh! Tools` on all 12 generated pages.
- Homepage-only `WebSite` JSON-LD declares `name: "Oh! Tools"` and
  `url: "https://oh-tools.net/"`.
- Build checks validate uniqueness, JSON parsing, required values, sitemap
  coverage, and production/staging indexing directives.
- All three SEO browser tests pass, including static content and metadata with
  JavaScript disabled. Remote checks confirmed the metadata on the homepage,
  About, and all three audited tools.
- Staging remains `noindex`; production was not deployed. The metadata does not
  load tracking scripts or transmit visitors' files.

## Reproduction

Install a compatible Chrome and Node.js, then run each target three times
serially with Lighthouse 13.6.0. Set `CHROME_PATH` if Chrome is not auto-detected.
Create the output directory before running:

```sh
npx --yes lighthouse@13.6.0 https://oh-tools-staging.otoolecf.workers.dev/image-editor/ \
  --form-factor=mobile --throttling-method=simulate \
  --only-categories=performance,accessibility \
  --output=json --output=html --output-path=reports/image-editor-1 \
  --chrome-flags=--headless --no-enable-error-reporting \
  --max-wait-for-load=90000 --save-assets
```

Keep browser storage reset enabled and avoid concurrent audits. Record the
deployment version and report settings; numbers will vary with the machine,
network, CDN state, browser version, and timing of first paint.

References: [Google site-name metadata](https://developers.google.com/search/docs/appearance/site-names),
[Lighthouse workflows](https://developer.chrome.com/docs/lighthouse/overview/),
[Core Web Vitals and lab/field distinctions](https://web.dev/articles/vitals).

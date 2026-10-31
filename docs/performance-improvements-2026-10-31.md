# Mobile performance improvements — October 31, 2026

Implemented and deployed to staging at
`https://oh-tools-staging.otoolecf.workers.dev/`, version
`47ea7f5f-bc4f-4263-83a1-5670acac8694`. Production was not deployed.

## Changes

- Render the shared header during the build using declarative shadow DOM.
  The header component keeps the existing markup and attaches theme controls.
  An early theme script applies the saved theme before first paint.
- Render initial Video Trimmer and Data Workbench import panels during the
  build. Their custom elements keep those panels during initialization.
- Initialize VIPS and execute Image Editor pipelines in a browser worker.
  Lazy image proxies let the existing operators build pipelines; resolved
  metadata and encoded previews cross the worker boundary. Native images are
  released when their proxies are collected, and the worker is terminated
  when leaving the page. Editing controls wait for an operation to complete.
- Import the locked HEIC converter only for selected HEIC/HEIF files. This
  converter decodes in its own worker and uses a browser canvas for PNG
  encoding; that canvas step still runs on the main thread. Other VIPS pixel
  operations and initialization run in the image worker.
- Initialize DuckDB once, then load and verify format-specific extensions on
  demand for both local-file and URL import paths and exports. Raw SQL retains
  DuckDB's extension loading behavior. The core database download remains
  necessary for local SQL.
- Show actual database download/startup progress and keep controls disabled
  until ready. Remove the old ten-second UI deadline. Catch worker errors and
  unhandled worker rejections so failed downloads show an error instead of
  leaving the page permanently loading; terminate failed workers.
- Reuse the local Inter variable font throughout the site and remove external
  Google Fonts stylesheets. Preload the same hashed font used by the CSS.
- Fix the audited tagline/status/mobile-notice contrast and initial heading
  hierarchy. Image tabs use native disabled controls before an image is ready.

The build produces static HTML and assets. User files, image pixels, database
queries, and editing operations still run in the browser. These changes add no
file-processing server, tracking, or real-user metrics collection. Existing
remote-URL/extension requests and Browser Bridge behavior remain as documented
on the About page and in Browser Bridge.

## Validation

- All 29 Playwright tests passed, including the full existing tool suite,
  mobile layout, metadata/indexing checks, and public content without JavaScript.
- New regression coverage checks chained worker image operations, alpha tint
  blending, PNG/JPEG/WebP/TIFF encoding and decoding, UI resize/reset, delayed
  database initialization, failure reporting, lazy extensions, and real
  JSON/Parquet/Excel import/export round trips.
- Remote staging checks imported the libheif project's `examples/example.heic`
  (1280 × 854), then exercised rotation, flip, manual/smart crop, blur, sharpen,
  tint, sepia, vintage, warm/cool, contrast, grayscale, and Canny edge detection.
  The test image was downloaded temporarily for QA and is not published.
- Remote JSON, Parquet, and Excel round trips returned the expected values.
  A raw-SQL full-text index/search check also autoloaded FTS on first use and
  returned a positive match score.
  No page errors occurred in those checks. Mobile light/dark rendering was
  inspected, and worker isolation headers were verified.
- Both production and staging builds passed their build checks. Staging
  continues to return HTML `noindex` plus `X-Robots-Tag: noindex`.

## Repeat audit

The repeat audit used the same Lighthouse 13.6.0 / Headless Chrome 156 mobile
settings as the [baseline](performance-audit-2026-10-31.md): 412 × 823 viewport,
fresh browser storage per run, simulated 150 ms RTT / 1,638.4 Kbps throughput,
and 4× CPU slowdown. Three runs per page were executed serially without
concurrent browser tests. Raw HTML/JSON reports, first-run traces/network logs,
and screenshots are retained in this chat's `performance-after-2026-10-31`
artifacts. [All sanitized measurements](performance/2026-10-31/after.json)
include the exact settings and each run.

Values below are medians. Transfer sizes are compressed decimal MB.

| Page | Performance before → after | LCP before → after | TBT before → after | CLS before → after | Transfer before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Homepage | 96 → 100 | 1.77 → 0.84 s | 2 → 0 ms | 0 → 0 | 0.42 → 0.37 MB |
| Image Editor | 64 → 100 | 1.09 → 0.81 s | 6,622 → 28 ms | 0.143 → 0 | 4.86 → 4.28 MB |
| Video Trimmer | 82 → 100 | 0.80 → 0.80 s | 31 → 47 ms | 0.378 → 0 | 0.48 → 0.48 MB |
| Data Workbench | 98 → 100 | 1.05 → 1.05 s | 13 → 13 ms | 0 → 0 | 6.69 → 5.59 MB |

All 12 runs scored 100 in both performance and automated accessibility, with no
Lighthouse warnings. The automated accessibility findings from the baseline
were absent; this is not a complete manual accessibility assessment.

The largest individual CLS was 0.0020 (Image Editor run 3); all other runs had
zero CLS. Image Editor TBT ranged 11–85 ms, versus 6,064–6,665 ms previously.
Video Trimmer's 16 ms median TBT increase is small compared with its removed
layout shift. Data Workbench's severe baseline 1.000 CLS outlier did not recur.
All first-run network audit entries succeeded. Image Editor did not request
the HEIC converter on startup; Data Workbench requested no format extensions
before a file/query required them. The homepage made no Google Fonts requests.

Image Editor saves approximately 0.58 MB (12%) on initial load, and Data
Workbench saves 1.10 MB (16%). The larger local-processing engines still need
to download and initialize; a good paint score does not mean they are ready
to process a file.

### Throttled startup probes

The separate startup probes use the baseline's applied DevTools profile:
562.5 ms latency, 1,474.56 Kbps download, 675 Kbps upload, 4× main-thread CPU
slowdown, disabled browser cache, and three seconds of observation after each
readiness condition. These are single exploratory samples, not medians.

| Page | Ready before → after | Condition |
| --- | ---: | --- |
| Homepage | 1.43 → 0.67 s | Header shadow root and ten tool links present |
| Image Editor | 32.01 → 26.62 s | Image engine ready and file selection enabled |
| Video Trimmer | 2.07 → 2.56 s | Engine created and import control present |
| Data Workbench | 40.72 → 31.80 s | Database initialized |

All probes reached readiness without page errors. Observed startup CLS was
0 on the homepage, 0.0020 on Image Editor, 0.0024 on Video Trimmer, and 0.0062
on Data Workbench. The tools still require sizable engine downloads on this
slow network profile. The homepage's markup-readiness condition can precede
first paint; it is not a substitute for LCP. Video readiness varied upward by
about half a second in this single sample while its startup layout stabilized.

The profile throttles the main thread rather than all browser worker CPU.
Moving VIPS into a worker therefore changes the CPU that this probe throttles;
the measured readiness change is not a physical-phone speedup estimate.

Lab LCP/CLS/TBT and automated scores do not establish field Core Web Vitals.
This work does not measure real-user INP, field percentiles, or large-file
processing throughput. No analytics or real-user monitoring was added.

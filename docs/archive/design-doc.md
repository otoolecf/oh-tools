> Historical proposal, not current implementation or setup instructions.
> See [the current architecture](../architecture.md), [README](../../README.md), and
> [security policy](../../SECURITY.md) for supported behavior and build commands.

Browser Data Workbench (DuckDB‑WASM)

Lightweight, in‑browser “BI workbench” focused on format conversion, schema insight, quick stats, and SQL over local/remote files. Runs entirely client‑side with DuckDB‑WASM.

⸻

Goals
• Zero‑install: everything in the browser; user drops files or pastes pre‑signed URLs.
• Friendly builders for common tasks (CSV/JSON/Parquet conversions, quick profiling).
• Power user mode: a full SQL editor that runs directly on DuckDB‑WASM.
• Format bridge: CSV ⇄ JSON (NDJSON & array) ⇄ Parquet.
• Handles messy data: irregular CSV dialects, nested JSON, mixed types.

Non‑Goals
• Long‑running background jobs or server‑side compute.
• Full dashboarding/OLAP cube builder (keep it lightweight).

⸻

High‑Level Architecture

UI (Vanilla JS + Web Components)
• Pure HTML/CSS/JS app. No framework required.
• Page shells are standard HTML; richer areas use Custom Elements for encapsulation.
• Zero‑SQL by default: on load/import we auto‑detect type, create views, run DESCRIBE, compute quick stats, and show results. Users can peek at the generated SQL via a “Show SQL” dropdown.
• Result panes: table grid, schema card, JSON tree, stats panel.

Worker + DuckDB‑WASM
• Dedicated Web Worker hosts DuckDB‑WASM to avoid blocking UI.
• Persistent storage via OPFS (Origin Private File System) when supported; fallback to in‑memory FS.
• Optional extensions loaded on demand (e.g., json, encodings).

I/O Adapters
• Local files: File/Blob → virtual FS.
• Remote: HTTPS (incl. pre‑signed S3 URLs) fetched with fetch() and registered as files; optional range‑friendly Parquet access.
• Export: write to virtual FS, offer download; optional PUT to pre‑signed S3 from JS.

Security
• All processing local to the browser unless user fetches a remote URL.
• No secrets stored; pre‑signed URLs are short‑lived and user‑supplied.

⸻

Data Model & Temporary Tables
• Each import step can create a temp view (e.g., v_input) and an optional materialized table (e.g., input_tbl) in the in‑browser DB.
• Conversions use SELECT from views and COPY ... TO to write files.

Zero‑SQL Default Experience & Auto Pipeline 1. Upload/URL → detect type via MIME/extension/content sniffing. 2. Auto‑load
• CSV → read_csv('file', auto_detect=true) (or with chosen dialect if overridden).
• NDJSON/JSON Array → read_json('file', format='auto').
• Parquet → read_parquet('file').
Creates v_input and a materialized input_tbl if needed for repeated ops. 3. Auto‑inspect
• Run DESCRIBE SELECT \* FROM v_input; → Schema Card.
• If CSV: run sniff_csv('file') → Dialect Card.
• If JSON cols exist: probe keys/types → JSON Tree. 4. Auto‑stats
• Generate summaries (row count, null counts, COUNT(DISTINCT) for strings, numeric SUM/AVG/MIN/MAX) against v_input. 5. Optional filters
• WHERE builder composes predicates; grid updates; SQL shown on demand. 6. Export buttons
• Choices generate COPY statements; show effective SQL and options; write to OPFS and expose Download (optional Upload to pre‑signed S3). 7. Advanced
• SQL console available for complex queries; can bind results back into the UI.

⸻

Core Use Cases & How We Implement Them

1. CSV ⇄ CSV (dialect transforms & encoding)

UI controls: delimiter (,, |, \t, custom), quote char, escape, header on/off, null string, line ending, quote policy (auto / quote all / quote none), encoding (UTF‑8 default; opt‑in via extension), output compression (none/gzip/zstd).

Read

-- Auto dialect, or force with options
FROM read_csv('in.csv', auto_detect = true);
-- Example forcing dialect
FROM read_csv('in.csv', auto_detect=false, delim='|', quote='"', escape='"', header=true);

Write

-- Comma → pipe, with header
COPY (SELECT \* FROM input_tbl)
TO 'out.tbl' (FORMAT CSV, DELIMITER '|', HEADER true);

-- Quote-all helper: app will expand FORCE_QUOTE to all columns
-- e.g., FORCE_QUOTE = ['col1','col2',...]

Encoding
• Default to UTF‑8. If source is UTF‑16 LE or Windows‑1252 etc., app offers: 1. JS transcode: use TextDecoder('utf-16le' | 'windows-1252') → UTF‑8 Blob before import; or 2. DuckDB encodings extension: LOAD encodings; FROM read_csv('file.csv', encoding='cp1252');

2. JSON ⇄ CSV (array & NDJSON)

Read

-- NDJSON (JSON Lines)
FROM read_json('in.json', format='newline_delimited');
-- JSON array
FROM read_json('in_array.json', format='array');
-- Auto
FROM read_json('in.json', format='auto');

Write

-- Table → NDJSON (default)
COPY (SELECT _ FROM src) TO 'out.json' (FORMAT JSON);
-- Table → single JSON array
COPY (SELECT _ FROM src) TO 'out_array.json' (FORMAT JSON, ARRAY true);
-- Table → CSV
COPY (SELECT \* FROM src) TO 'out.csv' (FORMAT CSV, HEADER true, DELIMITER ',');

JSON Lines ⇄ CSV round‑trip is just read_json(..., format='newline_delimited') → COPY ... (FORMAT CSV) and vice‑versa using (FORMAT JSON [, ARRAY]).

3. Inspect headers & data types (CSV) / keys & types (JSON)

CSV

-- Peek detected dialect & types (used to prefill builder controls)
FROM sniff_csv('file.csv');

-- After reading
DESCRIBE SELECT \* FROM read_csv('file.csv');

JSON

-- Inspect inferred schema from JSON
DESCRIBE SELECT \* FROM read_json('file.json', format='auto');

-- For raw JSON strings in a column "payload"
SELECT typeof(payload::JSON) AS t, json_type(payload::JSON) AS jt
FROM tbl LIMIT 5;

4. Quick stats (counts, sums, uniques)

-- Row count
SELECT COUNT(_) AS rows FROM src;
-- Numeric summaries (builder will generate per numeric column)
SELECT SUM(amount) AS sum_amount, AVG(amount) AS avg_amount, MIN(amount), MAX(amount) FROM src;
-- Unique counts for strings
SELECT COUNT(DISTINCT customer_id) AS uniq_customers FROM src;
-- Per‑column null counts (template emits one per col)
SELECT COUNT(_) - COUNT(colname) AS nulls FROM src;

5. Parquet I/O

-- Read
FROM read_parquet('file.parquet');
-- Write
COPY (SELECT _ FROM src) TO 'out.parquet' (FORMAT PARQUET /_, COMPRESSION zstd \*/);

6. Queries (basic to advanced)
   • Builder for simple SELECT ... WHERE ... ORDER BY ... LIMIT ... with live SQL preview.
   • SQL editor with history & examples (joins, CTEs, window functions).

Examples:

-- Filter and projection
SELECT id, name, price FROM src WHERE price > 100 ORDER BY price DESC LIMIT 100;

-- Join CSV + Parquet by key
WITH a AS (FROM read_csv('a.csv')),
b AS (FROM read_parquet('b.parquet'))
SELECT \* FROM a JOIN b USING (id);

7. Nested JSON and mixed types
   • Cast strings to JSON for operators ->/->>:

SELECT payload::JSON->>'user.id' AS user_id,
payload::JSON->>'items[0].sku' AS first_sku
FROM tbl;

    •	Explode arrays/objects

-- Turn JSON array into rows
SELECT unnest(payload::JSON->'items') AS item FROM tbl;

-- Or traverse as a table
FROM json_each(payload::JSON, '$.items');

    •	Normalize to a flat table with STRUCT/LIST handling, and CAST to precise types.

⸻

UI Design

Home
• Drag‑and‑drop zone + file picker + URL input (with CORS/range hints). Shows detected type and size.
• Toggles: Persist to OPFS and Load Extensions (json, optional encodings).

Inspect (auto)
• On file load: auto‑read based on MIME/extension → create v_input view.
• Schema Card (from DESCRIBE), Dialect Card for CSV (delimiter, quote, header), JSON Tree explorer for JSON‑typed columns (paths, arrays, scalar samples).
• Show SQL dropdown displays the exact statements used.

Stats (auto)
• Auto‑computed basics over v_input: row count, null counts per column, COUNT(DISTINCT) for likely IDs/strings, SUM/AVG/MIN/MAX for numerics, sample distributions.
• Buttons to recompute with larger sample or full table.

Filter & Select (Builder)
• WHERE builder: pick column, operator (=, !=, >, >=, <, <=, LIKE, IN) and value; AND/OR chaining.
• Column picker for projection; sort & limit controls.
• Live preview grid; Show SQL reveals the generated query.

Convert / Export (Buttons)
• Format buttons: CSV, JSON Lines, JSON Array, Parquet.
• For CSV: delimiter/quote/header/quote‑all/encoding; for JSON: NDJSON vs Array; for Parquet: compression.
• Export runs COPY ... TO and offers Download; optional Upload for pre‑signed S3 PUT/POST.

SQL Console (Advanced)
• Full text area with history. Executes arbitrary SQL against current DB.
• Can save results as a temp view or export directly.

⸻

Browser & Performance Notes (opt‑in by the user)
• Parquet over HTTP(S): when reading via HTTPS URL, DuckDB can use HTTP range requests to fetch only needed row groups/columns. Best for large remote files.
• CSV over HTTP(S): generally fully downloaded; prefer Parquet for big remote workloads.
• OPFS: enable to let DuckDB spill to disk and persist databases across sessions; smoother for multi‑GB manipulations (subject to browser quotas).
• Extensions: load encodings to read non‑UTF‑8 CSVs in‑engine; json is typically auto‑loaded.
• Workers: DuckDB runs in a dedicated Worker; heavy operations won’t freeze the UI.

Implementation stance: we’ll document these optimizations and provide toggles, but expect the user to provision CORS/range support on their endpoints or to provide pre‑signed URLs.

⸻

S3/Remote Patterns (WASM‑friendly)
• Read: use HTTPS (e.g., CloudFront or pre‑signed S3 GET). Register the response as a file (or let DuckDB stream Parquet via ranged reads).
• Write: COPY ... TO 'file.ext' in the virtual FS → expose a Download button and/or perform a JS upload to a pre‑signed S3 PUT/POST.
• Views over remote: allow creating views referencing HTTPS URLs; works best with Parquet.

⸻

Error Handling & “Messy Data”
• CSV builder surfaces sniffer results; user can override delimiter/quote/header.
• Provide rejects workflow for partial loads and a panel to inspect faulty lines.
• Encoding helper warns on invalid byte sequences and offers transcode.

⸻

Example End‑to‑End Flows

A) Comma CSV → Pipe CSV (quote all fields) 1. Load data.csv → preview schema. 2. Convert: target CSV, delimiter |, header true, Quote Policy: All. 3. App resolves column list and emits:

COPY (SELECT \* FROM v_input)
TO 'data_pipe.csv' (FORMAT CSV, DELIMITER '|', HEADER true, FORCE_QUOTE=['col1','col2', ...]);

B) JSON Lines → CSV

CREATE TEMP VIEW v AS FROM read_json('events.ndjson', format='newline_delimited');
COPY (SELECT \* FROM v) TO 'events.csv' (FORMAT CSV, HEADER true);

C) CSV (UTF‑16 LE) → UTF‑8 CSV
• User selects Encoding: UTF‑16 LE; app transcodes in JS to UTF‑8 Blob then imports.
• (If encodings loaded) alternative:

LOAD encodings;
CREATE TEMP VIEW v AS FROM read_csv('win.csv', encoding='utf-16le');
COPY (SELECT \* FROM v) TO 'utf8.csv' (FORMAT CSV, HEADER true);

D) Nested JSON field inside CSV

-- Assume column payload contains JSON text
WITH t AS (
SELECT \*, payload::JSON AS j FROM read_csv('with_json.csv')
)
SELECT j->>'id' AS id, unnest(j->'items') AS item
FROM t;

E) Parquet → NDJSON (one object per line)

COPY (SELECT \* FROM read_parquet('big.parquet'))
TO 'out.ndjson' (FORMAT JSON);

⸻

Components & APIs

Worker API
• initDuckDB({ useOPFS, extensions })
• registerFile({ name, blob }) / registerURL({ name, url, headers? })
• sql(query: string): { arrow|table|blob }
• copyToFile(query, fileName, options) → returns FileHandle

Web Components (sketch)
• <bdw-app>: bootstraps worker, manages panels via hash routing.
• <bdw-file-drop>: drag/drop + picker + URL input; emits file-added/url-added.
• <bdw-schema-card>: renders DESCRIBE output.
• <bdw-json-tree>: explores JSON columns (path view, counts, sample values).
• <bdw-stats-panel>: quick stats; recompute controls (sample/all rows).
• <bdw-filter-builder>: WHERE builder + projection/sort/limit, emits SQL.
• <bdw-grid>: result table (virtualized rows for large sets).
• <bdw-export-panel>: CSV/NDJSON/JSON‑Array/Parquet buttons + options + Download/Upload.
• <bdw-sql-console>: advanced editor with history and examples.

⸻

Testing Plan
• Unit tests for SQL generation from builder inputs.
• Golden tests: feed sample files (messy CSVs, nested JSON, wide Parquet) and assert outputs (row counts, schemas, hash of exported artifacts).
• Cross‑browser (Chromium, Firefox, Safari) and OPFS on/off.

⸻

Risks & Mitigations
• Encoding edge cases → ship JS transcode fallback; document encodings extension.
• Large remote CSVs → advise Parquet or local download; show progress & cancellation.
• Nested/heterogeneous JSON → provide guided extract + json_each/unnest templates.
• Browser storage quotas → detect and warn when OPFS quotas are approached.

⸻

Milestones 1. MVP (Vanilla JS + Web Components): File ingest, auto inspect & stats, WHERE builder, Export buttons, OPFS toggle, SQL console basic. 2. V2: Pre‑signed URL flows, quote‑all helper, rejects viewer, JSON Tree drill‑downs, larger sample controls, progress & cancellation. 3. V3: Saved projects in OPFS, extension toggles UI (encodings), remote upload UI, saved filters/queries.

⸻

Appendix: SQL Snippets Library (for the app)
• Unique counts by column (generated per string col):

SELECT 'colname' AS column, COUNT(DISTINCT colname) AS n_unique FROM src;

    •	Null counts per column (emits UNION ALL across cols):

SELECT 'colname' AS column, COUNT(\*) - COUNT(colname) AS nulls FROM src
UNION ALL ...

    •	Type coercion template (builder emits casts):

SELECT CAST(col1 AS INTEGER) AS col1, CAST(col2 AS TIMESTAMP) AS col2, \* EXCLUDE (col1, col2)
FROM src;

    •	Flatten list to rows:

SELECT id, unnest(items) AS item FROM src;

    •	Traverse JSON as rows:

FROM json_each(payload::JSON, '$.items');

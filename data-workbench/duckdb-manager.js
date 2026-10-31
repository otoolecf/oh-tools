import { sqlLiteral, sqlIdentifier } from './sql.js';
// DuckDB Manager - bundled JavaScript with version-pinned oversized WASM assets
class DuckDBManager extends EventTarget {
  constructor() {
    super();
    this.db = null;
    this.conn = null;
    this.worker = null;
    this.isInitialized = false;
    this.duckdb = null; // Store the DuckDB module reference
    this.extensionLoads = new Map();
    this.initialization = null;
  }

  init() {
    if (this.isInitialized) return Promise.resolve({ success: true });
    if (!this.initialization) {
      this.initialization = this.initialize().then(result => {
        if (!result.success) this.initialization = null;
        return result;
      });
    }
    return this.initialization;
  }

  async initialize() {
    let workerUrl;
    try {


      // Load the locked package only when Data Workbench initializes.
      this.duckdb = await import(
        "@duckdb/duckdb-wasm"
      );


      // WASM files exceed Workers Static Assets' 25 MiB limit. The package
      // supplies CDN URLs pinned to its own version; never use a floating URL.
      const JSDELIVR_BUNDLES = this.duckdb.getJsDelivrBundles();

      // Select a bundle based on browser checks
      const DUCKDB_CONFIG = await this.duckdb.selectBundle(JSDELIVR_BUNDLES);
      //   const DUCKDB_CONFIG = JSDELIVR_BUNDLES.mvp;


      // Create logger
      const logger = new this.duckdb.ConsoleLogger(
        this.duckdb.LogLevel.WARNING
      );

      // Create worker URL using blob (JSDelivr pattern)
      workerUrl = URL.createObjectURL(
        new Blob([`
          self.addEventListener('unhandledrejection', event => {
            event.preventDefault();
            self.postMessage({ type: 'oh-tools-worker-error', error: event.reason?.message || String(event.reason) });
          });
          importScripts(${JSON.stringify(DUCKDB_CONFIG.mainWorker)});
        `], {
          type: "text/javascript",
        })
      );

      // Create worker and database
      this.worker = new Worker(workerUrl);

      // A worker compile/download failure can leave this package's instantiate
      // promise pending. Surface the worker error without imposing a deadline
      // on a slow but healthy download.
      let onWorkerError;
      let onWorkerMessage;
      const workerFailed = new Promise((_, reject) => {
        onWorkerError = event => {
          event.preventDefault();
          reject(new Error(event.message || 'The database worker could not start.'));
        };
        onWorkerMessage = event => {
          if (event.data?.type !== 'oh-tools-worker-error') return;
          event.stopImmediatePropagation();
          reject(new Error(event.data.error));
        };
        this.worker.addEventListener('error', onWorkerError);
        this.worker.addEventListener('message', onWorkerMessage);
      });
      this.db = new this.duckdb.AsyncDuckDB(logger, this.worker);
      try {
        await Promise.race([
          this.db.instantiate(
            DUCKDB_CONFIG.mainModule,
            DUCKDB_CONFIG.pthreadWorker,
            progress => {
              const percent = progress.bytesTotal > 0 ? Math.min(99, Math.floor(100 * progress.bytesLoaded / progress.bytesTotal)) : null;
              const message = percent === null ? 'Downloading the database…' : `Downloading the database… ${percent}%`;
              this.dispatchEvent(new CustomEvent('progress', { detail: message }));
            }
          ),
          workerFailed,
        ]);
      } finally {
        this.worker.removeEventListener('error', onWorkerError);
        this.worker.removeEventListener('message', onWorkerMessage);
      }

      this.dispatchEvent(new CustomEvent('progress', { detail: 'Starting the database…' }));

      // Create connection
      this.conn = await this.db.connect();

      // Set custom extension repository for nightly builds
      //   await this.conn.query(
      //     "SET custom_extension_repository = 'http://nightly-extensions.duckdb.org';"
      //   );

      this.isInitialized = true;
      return { success: true, message: "DuckDB initialized successfully" };
    } catch (error) {
      console.error("DuckDB initialization failed:");
      this.worker?.terminate();
      this.worker = null;
      this.db = null;
      this.conn = null;
      return { success: false, error: error.message };
    } finally {
      if (workerUrl) URL.revokeObjectURL(workerUrl);
    }
  }

  async ensureExtension(name) {
    if (!['json', 'parquet', 'excel', 'fts'].includes(name)) throw new Error('Unknown database extension.');
    if (!this.extensionLoads.has(name)) {
      const loading = (async () => {
        await this.conn.query(`INSTALL ${name};`);
        await this.conn.query(`LOAD ${name};`);
        await this.verifyExtension(name);
      })().catch(error => {
        this.extensionLoads.delete(name);
        throw new Error(`Couldn’t prepare ${name} support: ${error.message}`);
      });
      this.extensionLoads.set(name, loading);
    }
    await this.extensionLoads.get(name);
  }

  async prepareFormat(extension) {
    const name = { json: 'json', jsonl: 'json', ndjson: 'json', parquet: 'parquet', xlsx: 'excel' }[extension];
    if (name) await this.ensureExtension(name);
  }

  async verifyExtension(ext) {
    try {
      switch (ext) {
        case "excel":
          const fns = await this.conn.query(
            " SELECT 1 FROM duckdb_functions() WHERE function_name IN ('read_xlsx','write_xlsx') LIMIT 1"
          );
          if (fns.numRows === 0) throw new Error("read_xlsx not found");
          break;
        case "json":
          const jsonResult = await this.conn.query(
            "SELECT 1 FROM duckdb_functions() WHERE function_name = 'read_json' LIMIT 1;"
          );
          if (jsonResult.numRows === 0)
            throw new Error("read_json function not found");
          break;
        case "parquet":
          const parquetResult = await this.conn.query(
            "SELECT 1 FROM duckdb_functions() WHERE function_name = 'read_parquet' LIMIT 1;"
          );
          if (parquetResult.numRows === 0)
            throw new Error("read_parquet function not found");
          break;
        case "fts":
          // FTS verification can be skipped as it's less critical for file reading
          break;
      }
    } catch (error) {
      throw new Error(`Extension ${ext} verification failed: ${error.message}`);
    }
  }

  async registerFile(name, file) {
    try {
      if (!this.db) throw new Error("DuckDB not initialized");

      // Use registerFileHandle for better file compatibility
      await this.db.registerFileHandle(
        name,
        file,
        this.duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
        true
      );

      return { success: true, message: `File ${name} registered` };
    } catch (error) {
      console.error("registerFileHandle failed, falling back to registerFileBuffer:");
      // Fallback to the old method if registerFileHandle fails
      try {
        const buffer = await file.arrayBuffer();
        await this.db.registerFileBuffer(name, new Uint8Array(buffer));

        return { success: true, message: `File ${name} registered` };
      } catch (bufferError) {
        return { success: false, error: bufferError.message };
      }
    }
  }

  async registerFileURL(name, url) {
    try {
      if (!this.db) throw new Error("DuckDB not initialized");

      // Use registerFileURL for efficient streaming of remote files
      await this.db.registerFileURL(
        name,
        url,
        this.duckdb.DuckDBDataProtocol.HTTP,
        false
      );

      return { success: true, message: `File ${name} registered from URL` };
    } catch (error) {
      console.error("registerFileURL failed:");
      return { success: false, error: error.message };
    }
  }

  async executeSQL(query) {
    try {
      if (!this.conn) throw new Error("DuckDB connection not established");

      const result = await this.conn.query(query);
      return {
        success: true,
        data: result.toArray(),
        schema: result.schema,
        rowCount: result.numRows,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async describe(tableName) {
    try {
      const result = await this.executeSQL(
        `DESCRIBE SELECT * FROM ${sqlIdentifier(tableName)};`
      );
      if (result.success) {
        return {
          success: true,
          schema: result.data,
        };
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async exportToFile(query, fileName, options = {}) {
    try {
      if (!this.conn) throw new Error("DuckDB connection not established");

      // Build COPY statement based on file extension and options
      let copyQuery = `COPY (${query}) TO ${sqlLiteral(fileName)}`;

      const ext = fileName.split(".").pop().toLowerCase();
      await this.prepareFormat(ext);
      const formatOptions = [];

      switch (ext) {
        case "csv":
          formatOptions.push("FORMAT CSV");
          if (options.header !== false) formatOptions.push("HEADER true");
          if (options.delimiter)
            formatOptions.push(`DELIMITER ${sqlLiteral(options.delimiter)}`);
          break;
        case "json":
          formatOptions.push("FORMAT JSON");
          if (options.array) formatOptions.push("ARRAY true");
          break;
        case "parquet":
          formatOptions.push("FORMAT PARQUET");
          if (options.compression)
            formatOptions.push(`COMPRESSION ${sqlLiteral(options.compression)}`);
          break;
        case "xlsx":
          formatOptions.push("FORMAT xlsx");
          if (options.header !== false) formatOptions.push("HEADER true");
          if (options.sheetName) formatOptions.push(`SHEET ${sqlLiteral(options.sheetName)}`);
          break;
      }

      if (formatOptions.length > 0) {
        copyQuery += ` WITH (${formatOptions.join(", ")})`;
      }

      await this.conn.query(copyQuery);

      // Get the exported file
      let fileBuffer = await this.db.copyFileToBuffer(fileName);

      // Fix Excel file if it has corrupted header
      if (ext === 'xlsx') {
        const expectedHeader = [80, 75, 3, 4]; // ZIP file signature (xlsx is a ZIP)
        const actualHeader = [...fileBuffer.slice(0,4)];
        const offsetHeader = [...fileBuffer.slice(1,5)]; // Check if ZIP signature is offset by 1 byte

        if (actualHeader.join(',') === expectedHeader.join(',')) {

        } else if (offsetHeader.join(',') === expectedHeader.join(',')) {

          fileBuffer = fileBuffer.slice(1); // Remove the first corrupted byte

        } else {
          console.warn("Tool operation failed.");
        }
      }

      return { success: true, buffer: fileBuffer, fileName };
    } catch (error) {
      console.error("Export error details:");
      return { success: false, error: error.message };
    }
  }

  async close() {
    try {
      if (this.conn) {
        await this.conn.close();
        this.conn = null;
      }
      if (this.db) {
        await this.db.terminate();
        this.db = null;
      }
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      this.isInitialized = false;
      this.initialization = null;
      this.extensionLoads.clear();
      return { success: true, message: "DuckDB closed successfully" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convenience methods for common operations
  async autoDetectAndLoad(file, options = {}) {
    if (!this.isInitialized) throw new Error('The database is still getting ready.');

    const originalFileName = file.name;
    const extension = originalFileName.split(".").pop().toLowerCase();
    await this.prepareFormat(extension);
    const ignoreErrors = options.ignoreErrors || false;

    // Create unique filename to avoid DuckDB caching issues when settings change
    const timestamp = Date.now();
    const fileName = ignoreErrors ?
      `${originalFileName}_ignore_${timestamp}` :
      `${originalFileName}_${timestamp}`;

    // Register the file with unique name
    const registerResult = await this.registerFile(fileName, file);
    if (!registerResult.success) {
      throw new Error(registerResult.error);
    }

    // Create appropriate view based on file type
    let viewQuery = "";
    let tableName = "input_data";

    switch (extension) {
      case "csv":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${sqlIdentifier(tableName)} AS FROM read_csv(${sqlLiteral(fileName)}, auto_detect=true${ignoreErrors ? ', ignore_errors=true' : ''})`;
        break;
      case "json":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${sqlIdentifier(tableName)} AS FROM read_json(${sqlLiteral(fileName)}, format='auto'${ignoreErrors ? ', ignore_errors=true' : ''})`;
        break;
      case "jsonl":
      case "ndjson":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${sqlIdentifier(tableName)} AS FROM read_json(${sqlLiteral(fileName)}, format='newline_delimited'${ignoreErrors ? ', ignore_errors=true' : ''})`;
        break;
      case "parquet":
        // Parquet doesn't support ignore_errors flag
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${sqlIdentifier(tableName)} AS FROM read_parquet(${sqlLiteral(fileName)})`;
        break;
      case "xlsx":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${sqlIdentifier(tableName)} AS FROM read_xlsx(${sqlLiteral(fileName)}${ignoreErrors ? ', ignore_errors=true' : ''})`;
        break;
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }

    const result = await this.executeSQL(viewQuery);

    if (!result.success) {
      throw new Error(result.error);
    }

    return { tableName, fileName: originalFileName, extension, usedIgnoreErrors: ignoreErrors };
  }

  async cleanupOldFiles() {
    // This would ideally clean up old registered files, but DuckDB-WASM
    // doesn't provide a direct way to unregister files. The files will be
    // cleaned up when the database connection is closed/reset.

  }

  async getTableInfo(tableName) {
    // Get schema
    const schema = await this.describe(tableName);

    // Get basic stats
    const statsResult = await this.executeSQL(`
            SELECT
                COUNT(*) as row_count
            FROM ${sqlIdentifier(tableName)}
        `);

    // Get distinct count separately (DISTINCT * is not supported)
    let distinctResult;
    try {
      distinctResult = await this.executeSQL(`
                SELECT COUNT(*) as distinct_rows
                FROM (SELECT DISTINCT COLUMNS(*) FROM ${sqlIdentifier(tableName)})
            `);
    } catch (error) {
      // Fallback: just use row count if distinct fails
      console.warn("Could not calculate distinct rows:");
      distinctResult = {
        success: true,
        data: [{ distinct_rows: statsResult.data[0]?.row_count || 0 }],
      };
    }

    // Get sample data
    const sampleResult = await this.executeSQL(`
            SELECT * FROM ${sqlIdentifier(tableName)} LIMIT 100
        `);

    // Combine stats with safety checks
    const statsData = statsResult.success ? (statsResult.data[0] || {}) : {};
    const distinctData = distinctResult.success ? (distinctResult.data[0] || {}) : {};

    const combinedStats = {
      ...statsData,
      ...distinctData,
    };

    return {
      schema: schema.success ? schema.schema : [],
      stats: combinedStats,
      sample: sampleResult.success ? sampleResult.data : [],
      sampleSchema: sampleResult.success ? sampleResult.schema : null,
    };
  }
}

// Create global instance immediately

const duckDBManager = new DuckDBManager();
window.duckDBManager = duckDBManager;

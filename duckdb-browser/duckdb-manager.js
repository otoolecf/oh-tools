// DuckDB Manager - Direct CDN import
class DuckDBManager {
  constructor() {
    this.db = null;
    this.conn = null;
    this.worker = null;
    this.isInitialized = false;
    this.duckdb = null; // Store the DuckDB module reference
    this.extensionsLoaded = false;
  }

  async init(options = {}) {
    try {
      console.log("Initializing DuckDB with JSDelivr CDN...");

      // Import DuckDB directly from JSDelivr CDN
      this.duckdb = await import(
        "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.1-dev266.0/+esm"
      );
      console.log("DuckDB module loaded successfully");

      // Use JSDelivr bundles
      const JSDELIVR_BUNDLES = this.duckdb.getJsDelivrBundles();

      // Select a bundle based on browser checks
      const DUCKDB_CONFIG = await this.duckdb.selectBundle(JSDELIVR_BUNDLES);
      //   const DUCKDB_CONFIG = JSDELIVR_BUNDLES.mvp;

      console.log("DuckDB config selected:", DUCKDB_CONFIG);

      // Create logger
      const logger = new this.duckdb.ConsoleLogger(
        this.duckdb.LogLevel.WARNING
      );

      // Create worker URL using blob (JSDelivr pattern)
      const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${DUCKDB_CONFIG.mainWorker}");`], {
          type: "text/javascript",
        })
      );

      // Create worker and database
      this.worker = new Worker(worker_url);
      this.db = new this.duckdb.AsyncDuckDB(logger, this.worker);

      // Instantiate the database
      await this.db.instantiate(
        DUCKDB_CONFIG.mainModule,
        DUCKDB_CONFIG.pthreadWorker
      );

      // Clean up the blob URL
      URL.revokeObjectURL(worker_url);

      // Create connection
      this.conn = await this.db.connect();

      // Set custom extension repository for nightly builds
      //   await this.conn.query(
      //     "SET custom_extension_repository = 'http://nightly-extensions.duckdb.org';"
      //   );

      // Load core extensions
      await this.loadExtensions();

      this.isInitialized = true;
      return { success: true, message: "DuckDB initialized successfully" };
    } catch (error) {
      console.error("DuckDB initialization failed:", error);
      return { success: false, error: error.message };
    }
  }

  async loadExtensions() {
    // First check what extensions are available
    console.log("Checking available extensions...");
    try {
      const availableResult = await this.conn.query(
        `SELECT * FROM duckdb_extensions()`
      );
      console.log("Available extensions:", availableResult.toArray());
    } catch (error) {
      console.warn("Could not query available extensions:", error);
    }

    const coreExtensions = ["fts", "json", "parquet"]; // Remove excel for now
    const loadedExtensions = [];

    for (const ext of coreExtensions) {
      try {
        console.log(`Installing extension: ${ext}`);
        await this.conn.query(`INSTALL ${ext};`);
        console.log(`Loading extension: ${ext}`);
        await this.conn.query(`LOAD ${ext};`);

        // Verify the extension is actually loaded by testing a function
        await this.verifyExtension(ext);

        loadedExtensions.push(ext);
        console.log(`Successfully installed and loaded extension: ${ext}`);
      } catch (error) {
        console.warn(`Failed to install/load extension ${ext}:`, error);
      }
    }

    // Try to load excel extension separately with better error handling
    try {
      console.log("Attempting to install excel extension...");
      await this.conn.query("INSTALL excel;");
      await this.conn.query("LOAD excel;");
      await this.verifyExtension("excel");
      loadedExtensions.push("excel");
      console.log("Excel extension loaded successfully");
    } catch (error) {
      console.warn(
        "Excel extension not available in this DuckDB build:",
        error.message
      );
      console.log("Excel files will need alternative handling");
    }

    this.extensionsLoaded = true;
    console.log(
      `Extensions loaded successfully: ${loadedExtensions.join(", ")}`
    );
    return loadedExtensions;
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
      console.log(`File ${name} registered using BROWSER_FILEREADER protocol`);
      return { success: true, message: `File ${name} registered` };
    } catch (error) {
      console.error(
        "registerFileHandle failed, falling back to registerFileBuffer:",
        error
      );
      // Fallback to the old method if registerFileHandle fails
      try {
        const buffer = await file.arrayBuffer();
        await this.db.registerFileBuffer(name, new Uint8Array(buffer));
        console.log(
          `File ${name} registered using registerFileBuffer fallback`
        );
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
      console.log(
        `File ${name} registered from URL using HTTP protocol: ${url}`
      );
      return { success: true, message: `File ${name} registered from URL` };
    } catch (error) {
      console.error("registerFileURL failed:", error);
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
        `DESCRIBE SELECT * FROM ${tableName};`
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
      let copyQuery = `COPY (${query}) TO '${fileName}'`;

      const ext = fileName.split(".").pop().toLowerCase();
      const formatOptions = [];

      switch (ext) {
        case "csv":
          formatOptions.push("FORMAT CSV");
          if (options.header !== false) formatOptions.push("HEADER true");
          if (options.delimiter)
            formatOptions.push(`DELIMITER '${options.delimiter}'`);
          break;
        case "json":
          formatOptions.push("FORMAT JSON");
          if (options.array) formatOptions.push("ARRAY true");
          break;
        case "parquet":
          formatOptions.push("FORMAT PARQUET");
          if (options.compression)
            formatOptions.push(`COMPRESSION ${options.compression}`);
          break;
        case "xlsx":
          formatOptions.push("FORMAT xlsx");
          if (options.header !== false) formatOptions.push("HEADER true");
          if (options.sheetName) formatOptions.push(`SHEET '${options.sheetName}'`);
          break;
      }

      if (formatOptions.length > 0) {
        copyQuery += ` WITH (${formatOptions.join(", ")})`;
      }

      console.log(`Executing COPY query: ${copyQuery}`);
      await this.conn.query(copyQuery);

      // Get the exported file
      let fileBuffer = await this.db.copyFileToBuffer(fileName);
      
      // Fix Excel file if it has corrupted header
      if (ext === 'xlsx') {
        const expectedHeader = [80, 75, 3, 4]; // ZIP file signature (xlsx is a ZIP)
        const actualHeader = [...fileBuffer.slice(0,4)];
        const offsetHeader = [...fileBuffer.slice(1,5)]; // Check if ZIP signature is offset by 1 byte
        
        if (actualHeader.join(',') === expectedHeader.join(',')) {
          console.log('Excel file has correct ZIP magic header');
        } else if (offsetHeader.join(',') === expectedHeader.join(',')) {
          console.log('Excel file has corrupted header - removing extra prefix byte');
          fileBuffer = fileBuffer.slice(1); // Remove the first corrupted byte
          console.log(`Fixed Excel buffer length: ${fileBuffer.length}`);
        } else {
          console.warn(`Excel file has unexpected header. Expected: [${expectedHeader}], Got: [${actualHeader}]`);
        }
      }
      
      return { success: true, buffer: fileBuffer, fileName };
    } catch (error) {
      console.error("Export error details:", error);
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
      return { success: true, message: "DuckDB closed successfully" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Convenience methods for common operations
  async autoDetectAndLoad(file) {
    // Ensure extensions are loaded before attempting to use them
    if (!this.extensionsLoaded) {
      throw new Error(
        "Extensions not yet loaded. Please wait for DuckDB initialization to complete."
      );
    }

    const fileName = file.name;
    const extension = fileName.split(".").pop().toLowerCase();

    // Register the file
    const registerResult = await this.registerFile(fileName, file);
    if (!registerResult.success) {
      throw new Error(registerResult.error);
    }

    // Create appropriate view based on file type
    let viewQuery = "";
    let tableName = "input_data";

    switch (extension) {
      case "csv":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_csv('${fileName}', auto_detect=true)`;
        break;
      case "json":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_json('${fileName}', format='auto')`;
        break;
      case "jsonl":
      case "ndjson":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_json('${fileName}', format='newline_delimited')`;
        break;
      case "parquet":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_parquet('${fileName}')`;
        break;
      case "xlsx":
        viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_xlsx('${fileName}')`;
        break;
      case "xls":
        throw new Error(".xls is not supported; please convert to .xlsx");
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }

    const result = await this.executeSQL(viewQuery);
    if (!result.success) {
      throw new Error(result.error);
    }

    return { tableName, fileName, extension };
  }

  async getTableInfo(tableName) {
    // Get schema
    const schema = await this.describe(tableName);

    // Get basic stats
    const statsResult = await this.executeSQL(`
            SELECT 
                COUNT(*) as row_count
            FROM ${tableName}
        `);

    // Get distinct count separately (DISTINCT * is not supported)
    let distinctResult;
    try {
      distinctResult = await this.executeSQL(`
                SELECT COUNT(*) as distinct_rows 
                FROM (SELECT DISTINCT COLUMNS(*) FROM ${tableName})
            `);
    } catch (error) {
      // Fallback: just use row count if distinct fails
      console.warn("Could not calculate distinct rows:", error);
      distinctResult = {
        success: true,
        data: [{ distinct_rows: statsResult.data[0]?.row_count || 0 }],
      };
    }

    // Get sample data
    const sampleResult = await this.executeSQL(`
            SELECT * FROM ${tableName} LIMIT 100
        `);

    // Combine stats
    const combinedStats = {
      ...statsResult.data[0],
      ...distinctResult.data[0],
    };

    return {
      schema: schema.schema,
      stats: combinedStats,
      sample: sampleResult.data,
      sampleSchema: sampleResult.schema,
    };
  }
}

// Create global instance immediately
console.log("Creating DuckDB Manager (ES Module version)...");
const duckDBManager = new DuckDBManager();
window.duckDBManager = duckDBManager;
console.log(
  "DuckDB Manager created and assigned to window:",
  window.duckDBManager
);

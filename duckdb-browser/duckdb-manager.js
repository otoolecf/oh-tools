// DuckDB Manager - Direct CDN import
class DuckDBManager {
    constructor() {
        this.db = null;
        this.conn = null;
        this.worker = null;
        this.isInitialized = false;
        this.duckdb = null; // Store the DuckDB module reference
    }

    async init(options = {}) {
        try {
            console.log('Initializing DuckDB with JSDelivr CDN...');
            
            // Import DuckDB directly from JSDelivr CDN
            this.duckdb = await import('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.1-dev132.0/+esm');
            console.log('DuckDB module loaded successfully');

            // Use JSDelivr bundles
            const JSDELIVR_BUNDLES = this.duckdb.getJsDelivrBundles();
            
            // Select a bundle based on browser checks
            const DUCKDB_CONFIG = await this.duckdb.selectBundle(JSDELIVR_BUNDLES);

            console.log('DuckDB config selected:', DUCKDB_CONFIG);

            // Create logger
            const logger = new this.duckdb.ConsoleLogger(this.duckdb.LogLevel.WARNING);
            
            // Create worker URL using blob (JSDelivr pattern)
            const worker_url = URL.createObjectURL(
                new Blob([`importScripts("${DUCKDB_CONFIG.mainWorker}");`], {type: 'text/javascript'})
            );
            
            // Create worker and database
            this.worker = new Worker(worker_url);
            this.db = new this.duckdb.AsyncDuckDB(logger, this.worker);
            
            // Instantiate the database
            await this.db.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);
            
            // Clean up the blob URL
            URL.revokeObjectURL(worker_url);
            
            // Create connection
            this.conn = await this.db.connect();
            
            // Load core extensions
            const coreExtensions = ['excel', 'fts', 'json', 'parquet'];
            
            for (const ext of coreExtensions) {
                try {
                    console.log(`Installing extension: ${ext}`);
                    await this.conn.query(`INSTALL ${ext};`);
                    console.log(`Loading extension: ${ext}`);
                    await this.conn.query(`LOAD ${ext};`);
                    console.log(`Successfully installed and loaded extension: ${ext}`);
                } catch (error) {
                    console.warn(`Failed to install/load extension ${ext}:`, error);
                }
            }
            
            this.isInitialized = true;
            return { success: true, message: 'DuckDB initialized successfully' };
            
        } catch (error) {
            console.error('DuckDB initialization failed:', error);
            return { success: false, error: error.message };
        }
    }

    async registerFile(name, file) {
        try {
            if (!this.db) throw new Error('DuckDB not initialized');
            
            // Use registerFileHandle for better file compatibility
            await this.db.registerFileHandle(name, file, this.duckdb.DuckDBDataProtocol.BROWSER_FILEREADER, true);
            console.log(`File ${name} registered using BROWSER_FILEREADER protocol`);
            return { success: true, message: `File ${name} registered` };
        } catch (error) {
            console.error('registerFileHandle failed, falling back to registerFileBuffer:', error);
            // Fallback to the old method if registerFileHandle fails
            try {
                const buffer = await file.arrayBuffer();
                await this.db.registerFileBuffer(name, new Uint8Array(buffer));
                console.log(`File ${name} registered using registerFileBuffer fallback`);
                return { success: true, message: `File ${name} registered` };
            } catch (bufferError) {
                return { success: false, error: bufferError.message };
            }
        }
    }

    async registerFileURL(name, url) {
        try {
            if (!this.db) throw new Error('DuckDB not initialized');
            
            // Use registerFileURL for efficient streaming of remote files
            await this.db.registerFileURL(name, url, this.duckdb.DuckDBDataProtocol.HTTP, false);
            console.log(`File ${name} registered from URL using HTTP protocol: ${url}`);
            return { success: true, message: `File ${name} registered from URL` };
        } catch (error) {
            console.error('registerFileURL failed:', error);
            return { success: false, error: error.message };
        }
    }

    async executeSQL(query) {
        try {
            if (!this.conn) throw new Error('DuckDB connection not established');
            
            const result = await this.conn.query(query);
            return { 
                success: true, 
                data: result.toArray(), 
                schema: result.schema,
                rowCount: result.numRows
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async describe(tableName) {
        try {
            const result = await this.executeSQL(`DESCRIBE SELECT * FROM ${tableName};`);
            if (result.success) {
                return {
                    success: true,
                    schema: result.data
                };
            }
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async exportToFile(query, fileName, options = {}) {
        try {
            if (!this.conn) throw new Error('DuckDB connection not established');
            
            // Build COPY statement based on file extension and options
            let copyQuery = `COPY (${query}) TO '${fileName}'`;
            
            const ext = fileName.split('.').pop().toLowerCase();
            const formatOptions = [];
            
            switch (ext) {
                case 'csv':
                    formatOptions.push('FORMAT CSV');
                    if (options.header !== false) formatOptions.push('HEADER true');
                    if (options.delimiter) formatOptions.push(`DELIMITER '${options.delimiter}'`);
                    break;
                case 'json':
                    formatOptions.push('FORMAT JSON');
                    if (options.array) formatOptions.push('ARRAY true');
                    break;
                case 'parquet':
                    formatOptions.push('FORMAT PARQUET');
                    if (options.compression) formatOptions.push(`COMPRESSION ${options.compression}`);
                    break;
            }
            
            if (formatOptions.length > 0) {
                copyQuery += ` (${formatOptions.join(', ')})`;
            }
            
            await this.conn.query(copyQuery);
            
            // Get the exported file
            const fileBuffer = await this.db.copyFileToBuffer(fileName);
            return { success: true, buffer: fileBuffer, fileName };
        } catch (error) {
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
                await this.worker.terminate();
                this.worker = null;
            }
            this.isInitialized = false;
            return { success: true, message: 'DuckDB closed successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Convenience methods for common operations
    async autoDetectAndLoad(file) {
        const fileName = file.name;
        const extension = fileName.split('.').pop().toLowerCase();
        
        // Register the file
        const registerResult = await this.registerFile(fileName, file);
        if (!registerResult.success) {
            throw new Error(registerResult.error);
        }
        
        // Create appropriate view based on file type
        let viewQuery = '';
        let tableName = 'input_data';
        
        switch (extension) {
            case 'csv':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_csv('${fileName}', auto_detect=true)`;
                break;
            case 'json':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_json('${fileName}', format='auto')`;
                break;
            case 'jsonl':
            case 'ndjson':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_json('${fileName}', format='newline_delimited')`;
                break;
            case 'parquet':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_parquet('${fileName}')`;
                break;
            case 'xlsx':
            case 'xls':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM st_read('${fileName}')`;
                break;
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
            console.warn('Could not calculate distinct rows:', error);
            distinctResult = { success: true, data: [{ distinct_rows: statsResult.data[0]?.row_count || 0 }] };
        }
        
        // Get sample data
        const sampleResult = await this.executeSQL(`
            SELECT * FROM ${tableName} LIMIT 100
        `);
        
        // Combine stats
        const combinedStats = {
            ...statsResult.data[0],
            ...distinctResult.data[0]
        };
        
        return {
            schema: schema.schema,
            stats: combinedStats,
            sample: sampleResult.data,
            sampleSchema: sampleResult.schema
        };
    }
}

// Create global instance immediately
console.log('Creating DuckDB Manager (ES Module version)...');
const duckDBManager = new DuckDBManager();
window.duckDBManager = duckDBManager;
console.log('DuckDB Manager created and assigned to window:', window.duckDBManager);
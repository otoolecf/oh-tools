// DuckDB Manager - Direct CDN import
class DuckDBManager {
    constructor() {
        this.db = null;
        this.conn = null;
        this.worker = null;
        this.isInitialized = false;
    }

    async init(options = {}) {
        try {
            console.log('Initializing DuckDB with JSDelivr CDN...');
            
            // Import DuckDB directly from JSDelivr CDN
            const duckdb = await import('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.1-dev132.0/+esm');
            console.log('DuckDB module loaded successfully');

            // Use JSDelivr bundles
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            
            // Select a bundle based on browser checks
            const DUCKDB_CONFIG = await duckdb.selectBundle(JSDELIVR_BUNDLES);

            console.log('DuckDB config selected:', DUCKDB_CONFIG);

            // Create logger
            const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
            
            // Create worker URL using blob (JSDelivr pattern)
            const worker_url = URL.createObjectURL(
                new Blob([`importScripts("${DUCKDB_CONFIG.mainWorker}");`], {type: 'text/javascript'})
            );
            
            // Create worker and database
            this.worker = new Worker(worker_url);
            this.db = new duckdb.AsyncDuckDB(logger, this.worker);
            
            // Instantiate the database
            await this.db.instantiate(DUCKDB_CONFIG.mainModule, DUCKDB_CONFIG.pthreadWorker);
            
            // Clean up the blob URL
            URL.revokeObjectURL(worker_url);
            
            // Create connection
            this.conn = await this.db.connect();
            
            // Load community extensions
            const communityExtensions = ['zipfs'];
            
            for (const ext of communityExtensions) {
                try {
                    await this.conn.query(`INSTALL ${ext} FROM community;`);
                    await this.conn.query(`LOAD ${ext};`);
                    console.log(`Loaded community extension: ${ext}`);
                } catch (error) {
                    console.warn(`Failed to load community extension ${ext}:`, error);
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
            
            const buffer = await file.arrayBuffer();
            await this.db.registerFileBuffer(name, new Uint8Array(buffer));
            return { success: true, message: `File ${name} registered` };
        } catch (error) {
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
            case 'zip':
                // For ZIP files, we need special handling
                return this.handleZipFile(fileName);
            default:
                throw new Error(`Unsupported file type: ${extension}`);
        }
        
        const result = await this.executeSQL(viewQuery);
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return { tableName, fileName, extension };
    }

    async handleZipFile(zipFileName) {
        try {
            // Check if zipfs extension is loaded
            const extensionCheck = await this.executeSQL("SELECT extension_name FROM duckdb_extensions() WHERE loaded = true AND extension_name = 'zipfs'");
            if (!extensionCheck.success || extensionCheck.data.length === 0) {
                throw new Error('ZIP file support not available. The zipfs extension failed to load.');
            }

            // First, let's try to list the contents of the ZIP file using read_blob
            let listResult;
            try {
                listResult = await this.executeSQL(`
                    SELECT file FROM glob('${zipFileName}/*.csv')
                    UNION ALL
                    SELECT file FROM glob('${zipFileName}/*.json')
                    UNION ALL
                    SELECT file FROM glob('${zipFileName}/*.jsonl')
                    UNION ALL
                    SELECT file FROM glob('${zipFileName}/*.parquet')
                    LIMIT 100
                `);
            } catch (error) {
                // If that fails, try the zip:// protocol
                try {
                    listResult = await this.executeSQL(`
                        SELECT file FROM glob('zip://${zipFileName}/*.csv')
                        UNION ALL
                        SELECT file FROM glob('zip://${zipFileName}/*.json')
                        UNION ALL
                        SELECT file FROM glob('zip://${zipFileName}/*.jsonl')
                        UNION ALL
                        SELECT file FROM glob('zip://${zipFileName}/*.parquet')
                        LIMIT 100
                    `);
                } catch (zipError) {
                    console.error('Both glob methods failed:', error, zipError);
                    throw new Error('Unable to read ZIP file contents. The file may be corrupted or contain unsupported file types.');
                }
            }
            
            if (!listResult.success || listResult.data.length === 0) {
                throw new Error('No supported data files (CSV, JSON, JSONL, Parquet) found in ZIP archive');
            }
            
            // Find the first data file in the ZIP (CSV, JSON, Parquet)
            const dataFiles = listResult.data.filter(row => {
                const fileName = row.file || row.name || Object.values(row)[0];
                return fileName && (
                    fileName.endsWith('.csv') || 
                    fileName.endsWith('.json') || 
                    fileName.endsWith('.jsonl') ||
                    fileName.endsWith('.ndjson') ||
                    fileName.endsWith('.parquet')
                );
            });
            
            if (dataFiles.length === 0) {
                throw new Error('No supported data files found in ZIP archive');
            }
            
            // Use the first data file found
            const firstFile = dataFiles[0];
            const firstFileName = firstFile.file || firstFile.name || Object.values(firstFile)[0];
            const fileExtension = firstFileName.split('.').pop().toLowerCase();
            
            // Create view based on the file type inside the ZIP
            let viewQuery = '';
            let tableName = 'input_data';
            const zipPath = `zip://${zipFileName}/${firstFileName}`;
            
            switch (fileExtension) {
                case 'csv':
                    viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_csv('${zipPath}', auto_detect=true)`;
                    break;
                case 'json':
                    viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_json('${zipPath}', format='auto')`;
                    break;
                case 'jsonl':
                case 'ndjson':
                    viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_json('${zipPath}', format='newline_delimited')`;
                    break;
                case 'parquet':
                    viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_parquet('${zipPath}')`;
                    break;
            }
            
            const result = await this.executeSQL(viewQuery);
            if (!result.success) {
                throw new Error(result.error);
            }
            
            return { 
                tableName, 
                fileName: zipFileName, 
                extension: 'zip',
                innerFile: firstFileName,
                innerExtension: fileExtension,
                availableFiles: dataFiles.length,
                zipContents: listResult.data
            };
            
        } catch (error) {
            console.error('Error handling ZIP file:', error);
            throw new Error(`Failed to process ZIP file: ${error.message}`);
        }
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
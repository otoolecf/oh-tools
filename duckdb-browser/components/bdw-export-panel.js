// Export Panel Component for Browser Data Workbench

class BDWExportPanel extends HTMLElement {
    constructor() {
        super();
        this.selectedFormat = 'csv';
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="exportContent">
                <div class="export-options" id="formatOptions">
                    <button class="format-btn active" data-format="csv" onclick="this.parentElement.parentElement.parentElement.__selectFormat('csv')">
                        CSV
                    </button>
                    <button class="format-btn" data-format="json" onclick="this.parentElement.parentElement.parentElement.__selectFormat('json')">
                        JSON
                    </button>
                    <button class="format-btn" data-format="parquet" onclick="this.parentElement.parentElement.parentElement.__selectFormat('parquet')">
                        Parquet
                    </button>
                    <button class="format-btn" data-format="excel" onclick="this.parentElement.parentElement.parentElement.__selectFormat('excel')">
                        Excel
                    </button>
                </div>

                <div id="exportSettings"></div>

                <div style="margin-top: 1rem;">
                    <div class="setting-group" style="margin-bottom: 1rem;">
                        <label>Export Data Source</label>
                        <select id="dataSource">
                            <option value="full">Full File/Table</option>
                            <option value="query">Current Query Results</option>
                        </select>
                        <small id="dataSourceHelp" style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 0.25rem; display: block;">
                            Export the entire loaded dataset
                        </small>
                    </div>
                    
                    <div class="filename-input-group" style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                        <input type="text" 
                               id="fileNameInput" 
                               class="url-input" 
                               placeholder="export" 
                               style="flex: 1; border-top-right-radius: 0; border-bottom-right-radius: 0; border-right: none;">
                        <span id="fileExtension" style="
                            background: var(--input-bg); 
                            border: 1px solid var(--border-color); 
                            border-left: none;
                            border-top-right-radius: 4px;
                            border-bottom-right-radius: 4px;
                            padding: 0.5rem 0.75rem;
                            color: var(--text-secondary);
                            font-family: monospace;
                        ">.csv</span>
                    </div>
                    
                    <button class="btn btn-primary" 
                            onclick="this.parentElement.parentElement.parentElement.__startExport()" 
                            style="width: 100%; margin-bottom: 0.5rem;">
                        Export Data
                    </button>
                    
                    <button class="btn" 
                            onclick="this.parentElement.parentElement.parentElement.__showPreview()" 
                            style="width: 100%;">
                        Preview Export
                    </button>
                </div>
            </div>
        `;

        // Make methods available to inline handlers
        this.__selectFormat = (format) => this.selectFormat(format);
        this.__startExport = () => this.startExport();
        this.__showPreview = () => this.showPreview();
        this.__updateDataSource = () => this.updateDataSource();

        this.updateSettings();
        this.updateFileExtension();
        
        // Add event listener for data source change
        const dataSourceSelect = this.querySelector('#dataSource');
        if (dataSourceSelect) {
            dataSourceSelect.addEventListener('change', () => this.updateDataSource());
        }
        
        // Initialize data source help text
        this.updateDataSource();
    }

    selectFormat(format) {
        this.selectedFormat = format;
        
        // Update active button
        this.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.querySelector(`[data-format="${format}"]`).classList.add('active');
        
        // Update file extension display
        this.updateFileExtension();
        
        // Update settings panel
        this.updateSettings();
    }

    updateFileExtension() {
        const extension = this.getFileExtension(this.selectedFormat);
        const extensionSpan = this.querySelector('#fileExtension');
        if (extensionSpan) {
            extensionSpan.textContent = `.${extension}`;
        }
    }

    updateDataSource() {
        const dataSource = this.querySelector('#dataSource').value;
        const helpText = this.querySelector('#dataSourceHelp');
        
        if (dataSource === 'full') {
            helpText.textContent = 'Export the entire loaded dataset';
        } else {
            helpText.textContent = 'Export results from the current SQL query in the console';
        }
    }

    updateSettings() {
        const settingsDiv = this.querySelector('#exportSettings');
        let html = `<div class="export-settings active">`;

        switch (this.selectedFormat) {
            case 'csv':
                html += `
                    <div class="setting-group">
                        <label>Delimiter</label>
                        <select id="csvDelimiter">
                            <option value=",">Comma (,)</option>
                            <option value=";">Semicolon (;)</option>
                            <option value="|">Pipe (|)</option>
                            <option value="\\t">Tab (\\t)</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="csvHeader" checked> Include Header Row
                        </label>
                    </div>
                    <div class="setting-group">
                        <label>Quote Policy</label>
                        <select id="csvQuoting">
                            <option value="auto">Auto (as needed)</option>
                            <option value="all">Quote All Fields</option>
                            <option value="none">Never Quote</option>
                        </select>
                    </div>
                `;
                break;

            case 'json':
                html += `
                    <div class="setting-group">
                        <label>JSON Format</label>
                        <select id="jsonFormat">
                            <option value="lines">JSON Lines (NDJSON)</option>
                            <option value="array">JSON Array</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="jsonPretty"> Pretty Print (Formatted)
                        </label>
                    </div>
                `;
                break;

            case 'parquet':
                html += `
                    <div class="setting-group">
                        <label>Compression</label>
                        <select id="parquetCompression">
                            <option value="snappy">Snappy (Recommended)</option>
                            <option value="gzip">GZIP</option>
                            <option value="zstd">ZSTD</option>
                            <option value="uncompressed">Uncompressed</option>
                        </select>
                    </div>
                `;
                break;

            case 'excel':
                html += `
                    <div class="setting-group">
                        <label>Sheet Name</label>
                        <input type="text" id="excelSheetName" value="Sheet1" placeholder="Sheet1">
                    </div>
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="excelHeader" checked> Include Header Row
                        </label>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">
                        Note: Excel export requires conversion through CSV format
                    </p>
                `;
                break;
        }

        html += '</div>';
        settingsDiv.innerHTML = html;
    }

    async startExport() {
        try {
            const app = this.closest('bdw-app');
            console.log('Export: app found:', !!app, 'currentTable:', app?.currentTable);
            if (!app || !app.currentTable) {
                alert('No data available to export');
                return;
            }

            const fileName = this.getFileName();
            const options = this.getExportOptions();
            const dataSource = this.querySelector('#dataSource').value;

            let query;
            if (dataSource === 'query') {
                // Get the current query from the SQL console
                // Try to get the SQL console from the main content area first (when data is loaded)
                let sqlConsole = app.querySelector('#sqlTab bdw-sql-console');
                if (!sqlConsole) {
                    // Fallback to standalone SQL console (when no data is loaded)
                    sqlConsole = app.querySelector('#standaloneSQL bdw-sql-console');
                }
                console.log('SQL Console found:', !!sqlConsole);
                console.log('All SQL consoles in app:', app.querySelectorAll('bdw-sql-console').length);
                if (sqlConsole) {
                    query = sqlConsole.getCurrentQuery();
                    console.log('Current query from SQL console:', query);
                    if (!query || query.trim() === '') {
                        alert('No query available to export. Please:\n1. Go to the SQL Console tab\n2. Type a query (e.g., SELECT * FROM input_data WHERE column > 100)\n3. Come back to export the results');
                        return;
                    }
                    // Remove trailing semicolon if present (DuckDB COPY doesn't like it)
                    query = query.trim().replace(/;+$/, '');
                } else {
                    alert('SQL Console not found. Cannot export query results.');
                    return;
                }
            } else {
                // Export full table
                query = `SELECT * FROM ${app.currentTable}`;
            }

            // Emit export request event
            const event = new CustomEvent('export-request', {
                detail: {
                    format: this.selectedFormat,
                    fileName: fileName,
                    query: query,
                    options: options,
                    dataSource: dataSource
                },
                bubbles: true
            });

            this.dispatchEvent(event);

        } catch (error) {
            console.error('Export error:', error);
            alert(`Export failed: ${error.message}`);
        }
    }

    async showPreview() {
        try {
            const app = this.closest('bdw-app');
            console.log('Preview: app found:', !!app, 'currentTable:', app?.currentTable);
            if (!app || !app.currentTable) {
                alert('No data available to preview');
                return;
            }

            const dataSource = this.querySelector('#dataSource').value;
            let query;
            
            if (dataSource === 'query') {
                // Get the current query from the SQL console
                // Try to get the SQL console from the main content area first (when data is loaded)
                let sqlConsole = app.querySelector('#sqlTab bdw-sql-console');
                if (!sqlConsole) {
                    // Fallback to standalone SQL console (when no data is loaded)
                    sqlConsole = app.querySelector('#standaloneSQL bdw-sql-console');
                }
                if (sqlConsole) {
                    const fullQuery = sqlConsole.getCurrentQuery();
                    if (!fullQuery || fullQuery.trim() === '') {
                        alert('No query available to preview. Please run a query in the SQL Console first.');
                        return;
                    }
                    // Remove trailing semicolon if present and limit the query results for preview
                    const cleanQuery = fullQuery.trim().replace(/;+$/, '');
                    query = `SELECT * FROM (${cleanQuery}) LIMIT 10`;
                } else {
                    alert('SQL Console not found. Cannot preview query results.');
                    return;
                }
            } else {
                // Preview full table (limited to 10 rows)
                query = `SELECT * FROM ${app.currentTable} LIMIT 10`;
            }

            // Get a sample of the data
            const result = await window.duckDBManager.executeSQL(query);

            const options = this.getExportOptions();
            const previewData = this.formatPreviewData(result.data, options);
            
            this.showPreviewModal(previewData);

        } catch (error) {
            console.error('Preview error:', error);
            alert(`Preview failed: ${error.message}`);
        }
    }

    formatPreviewData(data, options) {
        switch (this.selectedFormat) {
            case 'csv':
                return this.formatCSVPreview(data, options);
            case 'json':
                return this.formatJSONPreview(data, options);
            case 'parquet':
                return 'Parquet preview not available (binary format)';
            case 'excel':
                return this.formatCSVPreview(data, options) + '\n\n(Will be converted to Excel format)';
            default:
                return JSON.stringify(data, null, 2);
        }
    }

    formatCSVPreview(data, options) {
        if (!data || data.length === 0) return '';
        
        const delimiter = options.delimiter || ',';
        const includeHeader = options.header !== false;
        
        let lines = [];
        
        if (includeHeader) {
            const headers = Object.keys(data[0]);
            lines.push(headers.join(delimiter));
        }
        
        data.forEach(row => {
            const values = Object.values(row).map(value => {
                if (value === null || value === undefined) return '';
                let str = String(value);
                
                // Simple quoting logic for preview
                if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
                    str = '"' + str.replace(/"/g, '""') + '"';
                }
                
                return str;
            });
            lines.push(values.join(delimiter));
        });
        
        return lines.join('\n');
    }

    formatJSONPreview(data, options) {
        if (!data || data.length === 0) return '';
        
        if (options.array) {
            return JSON.stringify(data, null, options.pretty ? 2 : 0);
        } else {
            // JSON Lines format
            return data.map(row => JSON.stringify(row, null, options.pretty ? 2 : 0)).join('\n');
        }
    }

    showPreviewModal(previewText) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;

        modal.innerHTML = `
            <div style="
                background: var(--panel-bg);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                max-width: 80vw;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
            ">
                <div style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Export Preview (${this.selectedFormat.toUpperCase()})</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                <div style="
                    flex: 1;
                    padding: 1rem;
                    overflow: auto;
                    font-family: monospace;
                    font-size: 0.9rem;
                    line-height: 1.4;
                    white-space: pre-wrap;
                    background: var(--input-bg);
                    margin: 1rem;
                    border-radius: 4px;
                    border: 1px solid var(--border-color);
                ">${previewText}</div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    getFileName() {
        const input = this.querySelector('#fileNameInput');
        let fileName = input.value.trim();
        
        // Strip any extension the user might have typed
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot > 0) {
            fileName = fileName.substring(0, lastDot);
        }
        
        if (!fileName) {
            fileName = 'export';
        }
        
        // Always add the correct extension based on format
        const extension = this.getFileExtension(this.selectedFormat);
        return `${fileName}.${extension}`;
    }

    getFileExtension(format) {
        const extensions = {
            csv: 'csv',
            json: 'json',
            parquet: 'parquet',
            excel: 'xlsx'
        };
        return extensions[format] || 'txt';
    }

    getExportOptions() {
        const options = {};

        switch (this.selectedFormat) {
            case 'csv':
                const delimiter = this.querySelector('#csvDelimiter')?.value || ',';
                options.delimiter = delimiter === '\\t' ? '\t' : delimiter;
                options.header = this.querySelector('#csvHeader')?.checked !== false;
                options.quoting = this.querySelector('#csvQuoting')?.value || 'auto';
                break;

            case 'json':
                const jsonFormat = this.querySelector('#jsonFormat')?.value || 'lines';
                options.array = jsonFormat === 'array';
                options.pretty = this.querySelector('#jsonPretty')?.checked || false;
                break;

            case 'parquet':
                options.compression = this.querySelector('#parquetCompression')?.value || 'snappy';
                break;

            case 'excel':
                options.sheetName = this.querySelector('#excelSheetName')?.value || 'Sheet1';
                options.header = this.querySelector('#excelHeader')?.checked !== false;
                break;
        }

        return options;
    }
}

customElements.define('bdw-export-panel', BDWExportPanel);
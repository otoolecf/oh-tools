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
                        📄 CSV
                    </button>
                    <button class="format-btn" data-format="json" onclick="this.parentElement.parentElement.parentElement.__selectFormat('json')">
                        📋 JSON
                    </button>
                    <button class="format-btn" data-format="parquet" onclick="this.parentElement.parentElement.parentElement.__selectFormat('parquet')">
                        🗃️ Parquet
                    </button>
                    <button class="format-btn" data-format="excel" onclick="this.parentElement.parentElement.parentElement.__selectFormat('excel')">
                        📊 Excel
                    </button>
                </div>

                <div id="exportSettings"></div>

                <div style="margin-top: 1rem;">
                    <input type="text" 
                           id="fileNameInput" 
                           class="url-input" 
                           placeholder="export.csv" 
                           style="width: 100%; margin-bottom: 0.5rem;">
                    
                    <button class="btn btn-primary" 
                            onclick="this.parentElement.parentElement.parentElement.__startExport()" 
                            style="width: 100%; margin-bottom: 0.5rem;">
                        💾 Export Data
                    </button>
                    
                    <button class="btn" 
                            onclick="this.parentElement.parentElement.parentElement.__showPreview()" 
                            style="width: 100%;">
                        👁️ Preview Export
                    </button>
                </div>
            </div>
        `;

        // Make methods available to inline handlers
        this.__selectFormat = (format) => this.selectFormat(format);
        this.__startExport = () => this.startExport();
        this.__showPreview = () => this.showPreview();

        this.updateSettings();
    }

    selectFormat(format) {
        this.selectedFormat = format;
        
        // Update active button
        this.querySelectorAll('.format-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        this.querySelector(`[data-format="${format}"]`).classList.add('active');
        
        // Update filename placeholder
        const fileNameInput = this.querySelector('#fileNameInput');
        const extension = this.getFileExtension(format);
        fileNameInput.placeholder = `export.${extension}`;
        
        // Update settings panel
        this.updateSettings();
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
                        ⚠️ Excel export requires conversion through CSV format
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
            if (!app || !app.currentTable) {
                alert('No data available to export');
                return;
            }

            const fileName = this.getFileName();
            const options = this.getExportOptions();

            // Emit export request event
            const event = new CustomEvent('export-request', {
                detail: {
                    format: this.selectedFormat,
                    fileName: fileName,
                    query: `SELECT * FROM ${app.currentTable}`,
                    options: options
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
            if (!app || !app.currentTable) {
                alert('No data available to preview');
                return;
            }

            // Get a sample of the data (first 10 rows)
            const result = await window.duckDBManager.executeSQL(`
                SELECT * FROM ${app.currentTable} LIMIT 10
            `);

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
        
        if (!fileName) {
            const extension = this.getFileExtension(this.selectedFormat);
            fileName = `export.${extension}`;
        }
        
        // Ensure correct extension
        const expectedExt = this.getFileExtension(this.selectedFormat);
        if (!fileName.endsWith(`.${expectedExt}`)) {
            const lastDot = fileName.lastIndexOf('.');
            if (lastDot > 0) {
                fileName = fileName.substring(0, lastDot);
            }
            fileName += `.${expectedExt}`;
        }
        
        return fileName;
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
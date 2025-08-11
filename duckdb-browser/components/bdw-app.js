// Main Browser Data Workbench Application Component

class BDWApp extends HTMLElement {
    constructor() {
        super();
        this.currentData = null;
        this.currentTable = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="bdw-app">
                <!-- File Import Section -->
                <div class="panel">
                    <h3>📁 Import Data</h3>
                    <bdw-file-drop></bdw-file-drop>
                </div>

                <!-- Main Content Area -->
                <div id="mainContent" style="display: none;">
                    <div class="panels-container">
                        <!-- Left Panel: Data Preview and Controls -->
                        <div class="main-panel">
                            <div class="panel">
                                <h3>📊 Data Preview</h3>
                                <div id="dataPreview" class="data-grid">
                                    <!-- Data will be displayed here -->
                                </div>
                            </div>
                            
                            <div class="panel">
                                <h3>⚙️ Operations</h3>
                                <bdw-export-panel></bdw-export-panel>
                            </div>
                        </div>

                        <!-- Right Panel: Schema and Stats -->
                        <div class="side-panel">
                            <bdw-schema-card></bdw-schema-card>
                            <bdw-stats-panel></bdw-stats-panel>
                        </div>
                    </div>

                    <!-- SQL Console (Collapsible) -->
                    <div class="panel">
                        <h3 style="cursor: pointer;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                            🔧 SQL Console <small style="color: var(--text-secondary);">(click to toggle)</small>
                        </h3>
                        <div style="display: none;">
                            <bdw-sql-console></bdw-sql-console>
                        </div>
                    </div>
                </div>

                <!-- Status Messages -->
                <div id="statusArea"></div>
            </div>
        `;

        this.setupEventListeners();
        this.initializeDuckDB();
    }

    setupEventListeners() {
        // Listen for file drop events
        this.addEventListener('file-imported', (event) => {
            this.handleFileImport(event.detail);
        });

        // Listen for SQL execution events
        this.addEventListener('sql-execute', (event) => {
            this.executeSQL(event.detail.query);
        });

        // Listen for export events
        this.addEventListener('export-request', (event) => {
            this.handleExport(event.detail);
        });
    }

    async initializeDuckDB() {
        try {
            this.showStatus('Initializing DuckDB...', 'info');
            
            // Wait for DuckDB manager to be available
            let retries = 0;
            while (!window.duckDBManager && retries < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            
            if (!window.duckDBManager) {
                throw new Error('DuckDB Manager not available after waiting');
            }

            await window.duckDBManager.init({
                useOPFS: true,
                extensions: ['json', 'parquet']  // Load common extensions
            });

            this.showStatus('DuckDB initialized successfully', 'success');
            
        } catch (error) {
            console.error('DuckDB initialization failed:', error);
            this.showStatus(`Failed to initialize DuckDB: ${error.message}`, 'error');
        }
    }

    async handleFileImport(fileData) {
        try {
            this.showStatus(`Processing ${fileData.fileName}...`, 'info');

            // Auto-detect and load the file
            const result = await window.duckDBManager.autoDetectAndLoad(fileData.file);
            this.currentTable = result.tableName;

            // Get table information
            const tableInfo = await window.duckDBManager.getTableInfo(result.tableName);

            // Show the main content
            document.getElementById('mainContent').style.display = 'block';

            // Update components with the data
            this.updateDataPreview(tableInfo.sample, tableInfo.sampleSchema);
            this.updateSchema(tableInfo.schema);
            this.updateStats(tableInfo.stats);

            // Store current data info
            this.currentData = {
                ...result,
                ...tableInfo
            };

            // Create success message based on file type
            let successMessage = `Successfully loaded ${fileData.fileName} (${tableInfo.stats.row_count} rows)`;
            
            if (result.extension === 'zip') {
                successMessage = `Successfully loaded ${result.innerFile} from ${fileData.fileName} (${tableInfo.stats.row_count} rows)`;
                if (result.availableFiles > 1) {
                    successMessage += ` - ${result.availableFiles} data files found in archive`;
                }
            }

            this.showStatus(successMessage, 'success');

        } catch (error) {
            console.error('File import failed:', error);
            this.showStatus(`Failed to import file: ${error.message}`, 'error');
        }
    }

    updateDataPreview(data, schema) {
        const previewElement = document.getElementById('dataPreview');
        
        if (!data || data.length === 0) {
            previewElement.innerHTML = '<p>No data to display</p>';
            return;
        }

        // Create table
        let html = '<table><thead><tr>';
        
        // Create headers from schema
        if (schema && schema.fields) {
            schema.fields.forEach(field => {
                html += `<th>${field.name}</th>`;
            });
        } else {
            // Fallback: use keys from first row
            Object.keys(data[0]).forEach(key => {
                html += `<th>${key}</th>`;
            });
        }
        
        html += '</tr></thead><tbody>';

        // Add data rows (limit to first 100 for performance)
        const displayData = data.slice(0, 100);
        displayData.forEach(row => {
            html += '<tr>';
            Object.values(row).forEach(value => {
                let displayValue = value;
                if (value === null || value === undefined) {
                    displayValue = '<em style="color: var(--text-secondary);">null</em>';
                } else if (typeof value === 'string' && value.length > 50) {
                    displayValue = value.substring(0, 47) + '...';
                }
                html += `<td>${displayValue}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        
        if (data.length > 100) {
            html += `<p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">
                Showing first 100 rows of ${data.length} total rows
            </p>`;
        }

        previewElement.innerHTML = html;
    }

    updateSchema(schema) {
        const schemaCard = this.querySelector('bdw-schema-card');
        if (schemaCard) {
            schemaCard.updateSchema(schema);
        }
    }

    updateStats(stats) {
        const statsPanel = this.querySelector('bdw-stats-panel');
        if (statsPanel) {
            statsPanel.updateStats(stats);
        }
    }

    async executeSQL(query) {
        try {
            this.showStatus('Executing SQL query...', 'info');
            
            const result = await window.duckDBManager.executeSQL(query);
            
            // Update preview with query results
            this.updateDataPreview(result.data, result.schema);
            
            this.showStatus(`Query executed successfully (${result.rowCount} rows)`, 'success');
            
        } catch (error) {
            console.error('SQL execution failed:', error);
            this.showStatus(`SQL execution failed: ${error.message}`, 'error');
        }
    }

    async handleExport(exportOptions) {
        try {
            this.showStatus(`Exporting to ${exportOptions.format.toUpperCase()}...`, 'info');
            
            const query = exportOptions.query || `SELECT * FROM ${this.currentTable}`;
            const fileName = exportOptions.fileName || `export.${exportOptions.format}`;
            
            const result = await window.duckDBManager.exportToFile(query, fileName, exportOptions.options);
            
            // Create download link
            const blob = new Blob([result.buffer], { type: this.getContentType(exportOptions.format) });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showStatus(`Successfully exported to ${fileName}`, 'success');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showStatus(`Export failed: ${error.message}`, 'error');
        }
    }

    getContentType(format) {
        const types = {
            csv: 'text/csv',
            json: 'application/json',
            parquet: 'application/octet-stream',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        return types[format] || 'application/octet-stream';
    }

    showStatus(message, type = 'info') {
        const statusArea = document.getElementById('statusArea');
        
        // Remove any existing status
        const existingStatus = statusArea.querySelector('.status-message');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Add new status
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message status-${type}`;
        statusDiv.textContent = message;
        statusArea.appendChild(statusDiv);

        // Auto-remove success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.remove();
                }
            }, 5000);
        }
    }
}

customElements.define('bdw-app', BDWApp);
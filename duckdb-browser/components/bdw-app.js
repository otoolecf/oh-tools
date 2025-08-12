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
                <!-- Mobile Notice -->
                <div class="mobile-notice">
                    📱 For best experience, use a tablet or larger screen
                </div>
                
                <!-- File Import Section -->
                <div class="panel">
                    <h3>Import Data</h3>
                    <bdw-file-drop></bdw-file-drop>
                    <div style="margin-top: 1rem; text-align: center;">
                        <button class="btn" id="showFullInterface" onclick="this.closest('bdw-app').showFullInterface()">
                            Show Full Interface (No Data)
                        </button>
                    </div>
                </div>
                
                <!-- Standalone SQL Console -->
                <div class="panel" id="standaloneSQL" style="display: none;">
                    <h3>SQL Console</h3>
                    <div class="sql-warning" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 0.75rem; margin-bottom: 1rem; border-radius: 6px; color: var(--text-secondary); font-size: 0.9rem;">
                        <strong>Note:</strong> No data file loaded. The table <code>input_data</code> does not exist. Load a file above or test with queries like <code>SELECT 1 as test</code>.
                    </div>
                    <bdw-sql-console></bdw-sql-console>
                </div>

                <!-- Main Content Area -->
                <div id="mainContent" style="display: none;">
                    <div class="main-content-panel">
                        <div class="panel">
                            <!-- Tab Navigation -->
                            <div class="tab-nav">
                                <button class="tab-btn active" onclick="this.closest('bdw-app').switchTab('data')">Data Preview</button>
                                <button class="tab-btn" onclick="this.closest('bdw-app').switchTab('schema')">Schema</button>
                                <button class="tab-btn" onclick="this.closest('bdw-app').switchTab('stats')">Statistics</button>
                                <button class="tab-btn" onclick="this.closest('bdw-app').switchTab('sql')">SQL Console</button>
                                <div class="tab-actions">
                                    <button class="btn btn-primary" onclick="this.closest('bdw-app').openExportModal()">Export Data</button>
                                </div>
                            </div>
                            
                            <!-- Tab Content -->
                            <div class="tab-content">
                                <div id="dataTab" class="tab-panel active">
                                    <div class="data-grid-container">
                                        <div id="dataPreview" class="data-grid">
                                            <!-- Data will be displayed here -->
                                        </div>
                                        <div class="data-grid-resize-handle" title="Drag to resize data grid">
                                            <div class="resize-grip"></div>
                                        </div>
                                        <div class="data-grid-controls">
                                            <button class="resize-reset-btn" title="Reset to default height">⟲ Reset Height</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div id="schemaTab" class="tab-panel">
                                    <bdw-schema-card></bdw-schema-card>
                                </div>
                                
                                <div id="statsTab" class="tab-panel">
                                    <bdw-stats-panel></bdw-stats-panel>
                                </div>
                                
                                <div id="sqlTab" class="tab-panel">
                                    <bdw-sql-console></bdw-sql-console>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Status Messages -->
                <div id="statusArea"></div>
            </div>
        `;

        this.setupEventListeners();
        this.setupDataGridResizer();
        this.initializeDuckDB();
    }

    setupEventListeners() {
        // Listen for file drop events
        this.addEventListener('file-imported', (event) => {
            this.handleFileImport(event.detail);
        });

        // Listen for SQL execution events
        this.addEventListener('sql-execute', (event) => {
            this.handleSQLResults(event.detail.query, event.detail.result);
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
            // Clean up any existing data before starting new import
            await this.cleanupBeforeImport();
            
            this.showStatus(`Processing ${fileData.fileName}...`, 'info');

            let result;
            
            // Handle direct URL registrations vs file uploads
            if (fileData.isDirect) {
                // For direct URL registrations, file is already registered, just create a view
                result = await this.handleDirectURLFile(fileData);
            } else {
                // For uploaded files or fetched URLs, use autoDetectAndLoad with ignore errors option
                result = await window.duckDBManager.autoDetectAndLoad(fileData.file, { 
                    ignoreErrors: fileData.ignoreErrors || false 
                });
            }
            
            this.currentTable = result.tableName;
            console.log('Setting currentTable to:', this.currentTable);

            // Get table information - this might also fail with parse errors
            const tableInfo = await window.duckDBManager.getTableInfo(result.tableName);

            // Show the main content and hide standalone SQL
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('standaloneSQL').style.display = 'none';

            // Update components with the data
            this.updateDataPreview(tableInfo.sample, tableInfo.sampleSchema, tableInfo.stats);
            this.updateSchema(tableInfo.schema);
            this.updateStats(tableInfo.stats);

            // Store current data info
            this.currentData = {
                ...result,
                ...tableInfo
            };

            // Create success message based on file type
            let successMessage = `Successfully loaded ${fileData.fileName} (${tableInfo.stats.row_count} rows)`;
            if (result.usedIgnoreErrors) {
                successMessage += ' (errors ignored)';
            }

            this.showStatus(successMessage, 'success');

        } catch (error) {
            console.error('File import failed:', error);
            this.showStatus(`Failed to import file: ${error.message}`, 'error');
            
            // Clean up any partial state on error
            await this.cleanupFailedImport();
        }
    }

    updateDataPreview(data, schema, stats = null, isQueryResult = false) {
        const previewElement = document.getElementById('dataPreview');
        
        if (!data || data.length === 0) {
            previewElement.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <p style="margin: 0 0 1rem 0; font-size: 1.1rem;">No data to display</p>
                    <div style="background: var(--input-bg); padding: 1rem; border-radius: 6px; border-left: 3px solid var(--warning-color);">
                        <p style="margin: 0 0 0.5rem 0;"><strong>Possible issues:</strong></p>
                        <ul style="text-align: left; margin: 0; padding-left: 1.2rem;">
                            <li>File may contain parse errors or formatting issues</li>
                            <li>Data might be empty or in an unexpected format</li>
                            <li>File encoding may not be compatible</li>
                        </ul>
                        <p style="margin: 1rem 0 0 0; font-size: 0.9rem;">
                            <strong>Try:</strong> Re-upload with "<strong>Ignore parse errors</strong>" checkbox enabled, or check browser console for details.
                        </p>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';

        // Different handling for SQL query results vs file previews
        const totalRows = stats?.row_count || this.currentData?.stats?.row_count || data.length;
        
        if (isQueryResult) {
            // For SQL query results: show all data, simple row count
            html += `
                <div style="background: var(--input-bg); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border-left: 3px solid var(--success-color);">
                    <div style="font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.25rem;">
                        <strong>Query Results:</strong> ${this.formatNumber(totalRows)} rows returned
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        Use <strong>Export Data</strong> to download these results, or run another query in the <strong>SQL Console</strong> tab.
                    </div>
                </div>
            `;
        } else {
            // For file previews: limit to 100 rows, show range
            const displayCount = Math.min(data.length, 100);
            html += `
                <div style="background: var(--input-bg); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border-left: 3px solid var(--info-color);">
                    <div style="font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.25rem;">
                        <strong>Data Preview:</strong> Showing rows 1-${displayCount} of ${this.formatNumber(totalRows)} total rows
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        Use the <strong>SQL Console</strong> tab for custom queries, filtering, and analysis. Use <strong>Export Data</strong> to download specific results.
                    </div>
                </div>
            `;
        }

        // Create table
        html += '<table><thead><tr>';
        
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

        // Add data rows - limit only for file previews, not query results
        const displayData = isQueryResult ? data : data.slice(0, 100);
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
        
        // Add footer with additional context (only for file previews with more data)
        if (!isQueryResult && (data.length > 100 || totalRows > Math.min(data.length, 100))) {
            html += `
                <div style="text-align: center; color: var(--text-secondary); margin-top: 1rem; padding: 0.75rem; background: var(--input-bg); border-radius: 4px;">
                    <div style="margin-bottom: 0.5rem;">Preview limited to first 100 rows for performance</div>
                    <div style="font-size: 0.8rem;">
                        To view specific rows, use SQL queries like: 
                        <code style="background: var(--panel-bg); padding: 0.2rem 0.4rem; border-radius: 2px;">SELECT * FROM input_data LIMIT 500</code> or 
                        <code style="background: var(--panel-bg); padding: 0.2rem 0.4rem; border-radius: 2px;">SELECT * FROM input_data WHERE column_name = 'value'</code>
                    </div>
                </div>
            `;
        }

        previewElement.innerHTML = html;
    }

    formatNumber(value, decimals = 0) {
        if (value === null || value === undefined) return 'N/A';
        
        // Handle BigInt by converting to Number
        let num;
        if (typeof value === 'bigint') {
            num = Number(value);
        } else {
            num = Number(value);
        }
        
        if (isNaN(num)) return 'N/A';
        
        if (decimals > 0) {
            return num.toFixed(decimals);
        }
        
        // Format large numbers with commas
        return num.toLocaleString();
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

    handleSQLResults(query, result) {
        try {
            // Update preview with query results - use actual result count for SQL queries
            const queryStats = { row_count: result.rowCount };
            this.updateDataPreview(result.data, result.schema, queryStats, true); // true = isQueryResult
            
            // Switch to data tab to show results
            this.switchTab('data');
            
            this.showStatus(`Query executed successfully (${result.rowCount} rows)`, 'success');
            
        } catch (error) {
            console.error('SQL result handling failed:', error);
            this.showStatus(`Failed to display SQL results: ${error.message}`, 'error');
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

    async handleDirectURLFile(fileData) {
        const fileName = fileData.fileName; // For direct URLs, we use the registered filename as-is
        const extension = fileData.fileType || fileName.split('.').pop().toLowerCase();
        const ignoreErrors = fileData.ignoreErrors || false;
        
        // For direct URLs, we can't change the filename since it's already registered
        // So we create the view with different parameters instead
        
        // Create appropriate view based on file type for directly registered URL
        let viewQuery = '';
        let tableName = 'input_data';
        
        switch (extension) {
            case 'csv':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_csv('${fileName}', auto_detect=true${ignoreErrors ? ', ignore_errors=true' : ''})`;
                break;
            case 'json':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_json('${fileName}', format='auto'${ignoreErrors ? ', ignore_errors=true' : ''})`;
                break;
            case 'jsonl':
            case 'ndjson':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_json('${fileName}', format='newline_delimited'${ignoreErrors ? ', ignore_errors=true' : ''})`;
                break;
            case 'parquet':
                // Parquet doesn't support ignore_errors flag
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_parquet('${fileName}')`;
                break;
            case 'xlsx':
            case 'xls':
                viewQuery = `CREATE OR REPLACE TEMP VIEW ${tableName} AS FROM read_excel('${fileName}'${ignoreErrors ? ', ignore_errors=true' : ''})`;
                break;
            default:
                throw new Error(`Unsupported file type: ${extension}`);
        }
        
        const result = await window.duckDBManager.executeSQL(viewQuery);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        return { tableName, fileName: fileData.fileName, extension, usedIgnoreErrors: ignoreErrors };
    }


    showFullInterface() {
        // Show the main content without loading data
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('standaloneSQL').style.display = 'none';
        
        // Update the data preview with a message about no data
        this.updateDataPreview([], [], { row_count: 0 }, false);
        
        // Switch to SQL tab
        this.switchTab('sql');
        
        // Hide the show full interface button since we're now showing it
        document.getElementById('showFullInterface').style.display = 'none';
        
        this.showStatus('Full interface shown. No data loaded - use SQL Console to test queries.', 'info');
    }

    switchTab(tabName) {
        // Update tab buttons
        const tabBtns = this.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => btn.classList.remove('active'));
        
        const activeBtn = Array.from(tabBtns).find(btn => 
            btn.textContent.toLowerCase().includes(tabName.toLowerCase())
        );
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update tab panels
        const tabPanels = this.querySelectorAll('.tab-panel');
        tabPanels.forEach(panel => panel.classList.remove('active'));
        
        const targetPanel = this.querySelector(`#${tabName}Tab`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }
    
    openExportModal() {
        if (!this.currentTable) {
            this.showStatus('No data loaded to export', 'error');
            return;
        }
        
        // Create modal if it doesn't exist
        let modal = document.getElementById('exportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'exportModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Export Data</h3>
                        <button class="modal-close" onclick="this.closest('.modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <bdw-export-panel></bdw-export-panel>
                    </div>
                </div>
            `;
            this.appendChild(modal);
        }
        
        modal.style.display = 'block';
        
        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        // Close modal with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    setupDataGridResizer() {
        const resizeHandle = this.querySelector('.data-grid-resize-handle');
        const dataGridContainer = this.querySelector('.data-grid-container');
        const dataGrid = this.querySelector('#dataPreview');
        const resetBtn = this.querySelector('.resize-reset-btn');
        
        if (!resizeHandle || !dataGridContainer || !dataGrid) return;
        
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;
        const defaultHeight = '400px';
        
        // Set default height
        dataGridContainer.style.height = defaultHeight;
        
        // Reset button functionality
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dataGridContainer.style.height = defaultHeight;
                // Clear saved height from localStorage
                localStorage.removeItem('dataGridHeight');
            });
        }
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = dataGridContainer.offsetHeight;
            
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            dataGridContainer.classList.add('resizing');
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const deltaY = e.clientY - startY;
            let newHeight = startHeight + deltaY;
            
            // Enforce reasonable minimum and maximum heights
            const minHeight = 200;
            const maxHeight = Math.max(window.innerHeight * 0.9, 600); // 90% of viewport or 600px minimum
            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
            
            dataGridContainer.style.height = `${newHeight}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                dataGridContainer.classList.remove('resizing');
                
                // Save height to localStorage
                localStorage.setItem('dataGridHeight', dataGridContainer.style.height);
            }
        });
        
        // Touch support for mobile
        resizeHandle.addEventListener('touchstart', (e) => {
            isResizing = true;
            startY = e.touches[0].clientY;
            startHeight = dataGridContainer.offsetHeight;
            
            dataGridContainer.classList.add('resizing');
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isResizing) return;
            
            const deltaY = e.touches[0].clientY - startY;
            let newHeight = startHeight + deltaY;
            
            // Enforce reasonable minimum and maximum heights
            const minHeight = 200;
            const maxHeight = Math.max(window.innerHeight * 0.9, 600); // 90% of viewport or 600px minimum
            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
            
            dataGridContainer.style.height = `${newHeight}px`;
        });
        
        document.addEventListener('touchend', () => {
            if (isResizing) {
                isResizing = false;
                dataGridContainer.classList.remove('resizing');
                
                // Save height to localStorage
                localStorage.setItem('dataGridHeight', dataGridContainer.style.height);
            }
        });
        
        // Load saved height
        const savedHeight = localStorage.getItem('dataGridHeight');
        if (savedHeight) {
            dataGridContainer.style.height = savedHeight;
        }
    }
    
    async cleanupBeforeImport() {
        // Clean up any existing database objects before new import
        if (window.duckDBManager && window.duckDBManager.conn) {
            try {
                await window.duckDBManager.executeSQL('DROP VIEW IF EXISTS input_data');
                await window.duckDBManager.executeSQL('DROP TABLE IF EXISTS input_data');
                console.log('Cleaned up existing database objects');
            } catch (e) {
                console.debug('Pre-import cleanup completed (some objects may not have existed)');
            }
        }
        
        // Reset current references
        this.currentTable = null;
        this.currentData = null;
    }
    
    async cleanupFailedImport() {
        // Reset current table reference
        this.currentTable = null;
        this.currentData = null;
        
        // Hide main content if no successful import
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('standaloneSQL').style.display = 'none';
        
        // Clear any displayed data
        const dataPreview = document.getElementById('dataPreview');
        if (dataPreview) {
            dataPreview.innerHTML = '';
        }
        
        // Reset schema and stats components
        const schemaCard = this.querySelector('bdw-schema-card');
        if (schemaCard && typeof schemaCard.reset === 'function') {
            schemaCard.reset();
        }
        
        const statsPanel = this.querySelector('bdw-stats-panel');
        if (statsPanel && typeof statsPanel.reset === 'function') {
            statsPanel.reset();
        }
        
        // Aggressively clean up any database state
        if (window.duckDBManager && window.duckDBManager.conn) {
            try {
                // Drop the main view
                await window.duckDBManager.executeSQL('DROP VIEW IF EXISTS input_data');
                
                // Also try to drop any tables that might have been created
                await window.duckDBManager.executeSQL('DROP TABLE IF EXISTS input_data');
                
                // Clear any temporary objects that might exist
                const cleanupQueries = [
                    'DROP VIEW IF EXISTS input_data',
                    'DROP TABLE IF EXISTS input_data', 
                    'DROP SCHEMA IF EXISTS temp CASCADE'
                ];
                
                for (const query of cleanupQueries) {
                    try {
                        await window.duckDBManager.executeSQL(query);
                    } catch (e) {
                        // Individual cleanup failures are okay
                    }
                }
                
            } catch (e) {
                // Ignore cleanup errors
                console.debug('Database cleanup failed (this is usually okay):', e);
            }
        }
        
        // Clear file list in the file drop component
        const fileDropComponent = this.querySelector('bdw-file-drop');
        if (fileDropComponent && typeof fileDropComponent.clearFileList === 'function') {
            fileDropComponent.clearFileList();
        }
        
        console.log('Cleaned up failed import state');
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
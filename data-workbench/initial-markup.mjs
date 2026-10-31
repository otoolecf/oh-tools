export const dataAppMarkup = () => `
            <div class="bdw-app">
                <!-- Mobile Notice -->
                <div class="mobile-notice">
                    For best experience, use a tablet or larger screen
                </div>

                <!-- File Import Section -->
                <div class="panel">
                    <h2>Import Data</h2>
                    <bdw-file-drop></bdw-file-drop>
                    <div style="margin-top: 1rem; text-align: center;">
                        <button class="btn" id="showFullInterface" onclick="this.closest('bdw-app').showFullInterface()">
                            Show Full Interface (No Data)
                        </button>
                    </div>
                </div>

                <!-- Standalone SQL Console -->
                <div class="panel" id="standaloneSQL" style="display: none;">
                    <h2>SQL Console</h2>
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
                                            <button class="resize-reset-btn" title="Reset to default height" onclick="this.closest('bdw-app').resetDataGridHeight()">⟲ Reset Height</button>
                                            <button class="column-reset-btn" title="Reset all columns to default width" onclick="this.closest('bdw-app').resetColumnWidths()">⟲ Reset Columns</button>
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

export const dataFileDropMarkup = (acceptedTypes = ['.csv', '.json', '.jsonl', '.ndjson', '.parquet', '.xlsx']) => `
            <div class="file-drop-zone" id="dropZone">
                <div class="drop-text">
                    <strong>Choose a data file or paste a URL.</strong><br>
                    You can also drop files here.<br>
                    <small>Supports: CSV, JSON, JSONL, Parquet, Excel</small>
                </div>

                <p class="database-preparation" role="status">Getting the database ready…</p>
                <div class="drop-actions">
                    <button class="btn btn-primary" id="chooseFilesBtn" onclick="this.nextElementSibling.click()" disabled>
                        Choose Files
                    </button>
                    <input type="file" id="fileInput" accept="${acceptedTypes.join(',')}" multiple disabled>

                    <button class="btn" id="loadUrlBtn" onclick="document.getElementById('urlInput').focus()" disabled>
                        Load from URL
                    </button>
                </div>

                <div class="url-input-group">
                    <input type="url"
                           id="urlInput"
                           class="url-input"
                           placeholder="https://example.com/data.csv"
                           disabled>
                    <button class="btn" id="loadBtn" onclick="this.parentElement.parentElement.parentElement.__loadFromURL()" disabled>
                        Load
                    </button>
                </div>

                <div class="file-options" style="margin-top: 1rem; padding: 0.75rem; background: var(--input-bg); border-radius: 6px;">
                    <label class="ignore-errors-checkbox">
                        <input type="checkbox" id="ignoreErrors">
                        <span class="checkmark"></span>
                        Ignore parse errors (recommended for files with data quality issues)
                    </label>
                    <div class="option-help" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                        When enabled, DuckDB will skip problematic rows and load valid data. Useful for CSV files with inconsistent formatting or Excel files with mixed data types.
                    </div>
                </div>

                <div class="url-info" style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-secondary); border-radius: 4px; font-size: 0.85rem; color: var(--text-secondary);">
                    <div style="margin-bottom: 0.5rem;">
                        <strong>CORS Notice:</strong> Some URLs may fail due to cross-origin restrictions. Services like HuggingFace, AWS S3, and Google Cloud Storage typically work well. GitHub raw files and many other services block cross-origin requests.
                    </div>
                    <div>
                        <strong>For authenticated URLs:</strong> Open the full interface and use the SQL Console to set up credentials first (e.g., <code>SET s3_access_key_id='...';</code>). Check the DuckDB documentation for specific authentication settings for your cloud provider.
                    </div>
                </div>
            </div>

            <div id="fileList" style="margin-top: 1rem;"></div>
        `;

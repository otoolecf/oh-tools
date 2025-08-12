// Statistics Panel Component for Browser Data Workbench

class BDWStatsPanel extends HTMLElement {
    constructor() {
        super();
        this.stats = null;
        this.detailedStats = null; // Cache for detailed stats
        this.partialDetailedStats = null; // Temporary storage for partial results during analysis
        this.isAnalyzing = false; // Track if analysis is running
        this.abortController = null; // For stopping analysis
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="panel">
                <h3>Statistics</h3>
                <div id="statsContent">
                    <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">
                        Import a file to see statistics
                    </p>
                </div>
            </div>
        `;
    }

    updateStats(stats) {
        this.stats = stats;
        this.renderStats();
    }

    renderStats() {
        const content = this.querySelector('#statsContent');
        
        if (!this.stats) {
            content.innerHTML = '<p style="color: var(--text-secondary);">No statistics available</p>';
            return;
        }

        let html = '';

        // Basic Stats Section (always shown at top)
        html += '<div class="basic-stats-section">';
        html += '<h4 style="margin: 0 0 1rem 0; color: var(--primary-color);">Basic Statistics</h4>';
        html += '<div class="stats-grid">';

        // Row count
        if (this.stats.row_count !== undefined) {
            html += `
                <div class="stat-item">
                    <span class="stat-value">${this.formatNumber(this.stats.row_count)}</span>
                    <div class="stat-label">Rows</div>
                </div>
            `;
        }

        // Unique rows (if available)
        if (this.stats.distinct_rows !== undefined) {
            html += `
                <div class="stat-item">
                    <span class="stat-value">${this.formatNumber(this.stats.distinct_rows)}</span>
                    <div class="stat-label">Unique Rows</div>
                </div>
            `;
        }

        // Add more statistics as they become available
        if (this.stats.column_count !== undefined) {
            html += `
                <div class="stat-item">
                    <span class="stat-value">${this.stats.column_count}</span>
                    <div class="stat-label">Columns</div>
                </div>
            `;
        }

        // Duplicate percentage
        if (this.stats.row_count && this.stats.distinct_rows) {
            const rowCount = Number(this.stats.row_count);
            const distinctRows = Number(this.stats.distinct_rows);
            const duplicatePercentage = ((rowCount - distinctRows) / rowCount * 100).toFixed(1);
            html += `
                <div class="stat-item">
                    <span class="stat-value">${duplicatePercentage}%</span>
                    <div class="stat-label">Duplicates</div>
                </div>
            `;
        }

        html += '</div>';

        // Action buttons
        html += `
            <div style="margin-top: 1rem;">
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    ${this.detailedStats ? 
                        '<button class="btn detailed-stats-btn" style="flex: 1;">Show Detailed Analysis</button>' :
                        '<button class="btn detailed-stats-btn" style="flex: 1;">Run Detailed Analysis</button>'
                    }
                    <button class="btn refresh-stats-btn" style="flex: 1;">Refresh</button>
                </div>
                <div class="stats-button-description">
                    <strong>Detailed Analysis:</strong> Analyzes each column individually to show data ranges, null counts, unique values, and type-specific statistics. ${this.detailedStats ? 'Already calculated - click to view.' : 'Click to start analysis.'}
                </div>
            </div>
        `;
        html += '</div>'; // End basic-stats-section

        // Show detailed stats underneath if they exist
        if (this.detailedStats) {
            html += this.renderDetailedStatsSection();
        }

        content.innerHTML = html;

        // Add event listeners to buttons
        const detailedBtn = content.querySelector('.detailed-stats-btn');
        const refreshBtn = content.querySelector('.refresh-stats-btn');
        
        if (detailedBtn) {
            detailedBtn.onclick = () => {
                if (this.detailedStats) {
                    // Just scroll to detailed section
                    const detailedSection = content.querySelector('.detailed-stats-section');
                    if (detailedSection) {
                        detailedSection.scrollIntoView({ behavior: 'smooth' });
                    }
                } else {
                    this.generateDetailedStats();
                }
            };
        }
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshStats();
        }
    }

    renderDetailedStatsSection() {
        if (!this.detailedStats) return '';
        
        let html = '<div class="detailed-stats-section" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">';
        html += '<h4 style="margin: 0 0 1rem 0; color: var(--primary-color);">Detailed Column Analysis</h4>';
        
        // Check if these are partial results (analysis was stopped)
        if (this.wasAnalysisStopped) {
            html += '<div style="background: var(--warning-color); color: white; padding: 0.5rem 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.9rem;">Partial results shown (analysis was stopped)</div>';
        }
        
        this.detailedStats.forEach(stats => {
            html += `
                <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--input-bg); border-radius: 4px; border-left: 3px solid var(--primary-color);">
                    <h5 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">${stats.name}</h5>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        <span class="type-badge ${this.getTypeBadgeClass(stats.type)}">${stats.type}</span>
                        <div style="margin-top: 0.5rem;">
                            ${stats.error ? 
                                `<div style="color: var(--error-color);">Error: ${stats.errorMessage}</div>` :
                                this.formatColumnDetails(stats)
                            }
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    formatColumnDetails(stats) {
        let details = `<div>Unique: ${this.formatNumber(stats.uniqueCount)} | Nulls: ${this.formatNumber(stats.nullCount)}</div>`;
        
        if (stats.min !== undefined) {
            details += `
                <div>Range: ${this.formatNumber(stats.min)} - ${this.formatNumber(stats.max)}</div>
                <div>Avg: ${this.formatNumber(stats.avg, 2)} | Median: ${this.formatNumber(stats.median, 2)}</div>
            `;
        } else if (stats.minLength !== undefined) {
            details += `
                <div>Length: ${this.formatNumber(stats.minLength)} - ${this.formatNumber(stats.maxLength)} chars (avg: ${this.formatNumber(stats.avgLength, 1)})</div>
            `;
        }
        
        return details;
    }

    async generateDetailedStats() {
        try {
            // Check if analysis is already running
            if (this.isAnalyzing) {
                this.stopAnalysis();
                return;
            }

            // Get the current table from the parent app
            const app = this.closest('bdw-app');
            if (!app || !app.currentTable) {
                alert('No table available for analysis');
                return;
            }

            const tableName = app.currentTable;
            this.isAnalyzing = true;
            this.abortController = new AbortController();
            this.partialDetailedStats = []; // Initialize partial results storage
            
            // Keep basic stats at top, show progress underneath
            this.renderStatsWithProgress();

            // Generate column-level statistics in batches
            await this.getColumnStatisticsBatched(tableName);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Analysis stopped by user');
            } else {
                console.error('Error generating detailed stats:', error);
                this.showError(`Failed to generate detailed statistics: ${error.message}`);
            }
        } finally {
            this.isAnalyzing = false;
            this.abortController = null;
        }
    }

    stopAnalysis() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.isAnalyzing = false;
        
        // Partial results are already preserved in this.partialDetailedStats
        // If we have any, make them the current detailedStats
        if (this.partialDetailedStats && this.partialDetailedStats.length > 0) {
            this.detailedStats = [...this.partialDetailedStats];
            this.wasAnalysisStopped = true; // Flag to show partial results warning
            this.partialDetailedStats = null; // Clear temp storage
        }
        
        this.renderStats(); // Go back to basic view with partial results preserved
    }

    renderStatsWithProgress() {
        const content = this.querySelector('#statsContent');
        
        // Update the detailed button to show "Stop Analysis"
        const detailedBtn = content.querySelector('.detailed-stats-btn');
        if (detailedBtn) {
            detailedBtn.textContent = 'Stop Analysis';
            detailedBtn.style.background = 'var(--error-color)';
        }
        
        // Add progress section
        const progressHtml = `
            <div class="detailed-stats-section" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <h4 style="margin: 0 0 1rem 0; color: var(--primary-color);">Detailed Column Analysis</h4>
                <div class="stats-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">Analyzing columns... (0 of ? complete)</div>
                </div>
                <div class="stats-results"></div>
            </div>
        `;
        
        content.insertAdjacentHTML('beforeend', progressHtml);
    }

    async getColumnStatisticsBatched(tableName) {
        const manager = window.duckDBManager;
        const content = this.querySelector('#statsContent');
        const progressFill = content.querySelector('.progress-fill');
        const progressText = content.querySelector('.progress-text');
        const resultsContainer = content.querySelector('.stats-results');

        try {
            // First, get the schema to know how many columns we have
            const schemaResult = await manager.executeSQL(`DESCRIBE SELECT * FROM ${tableName}`);
            const columns = schemaResult.data;
            const totalColumns = columns.length;

            // Update progress text with total count
            progressText.textContent = `Analyzing columns... (0 of ${totalColumns} complete)`;

            // Process columns in batches of 3 to balance speed and responsiveness
            const batchSize = 3;
            let processedCount = 0;
            const detailedResults = [];

            for (let i = 0; i < columns.length; i += batchSize) {
                // Check if analysis was aborted
                if (this.abortController?.signal.aborted) {
                    throw new Error('Analysis aborted');
                }

                const batch = columns.slice(i, i + batchSize);
                
                // Process this batch
                const batchPromises = batch.map(column => this.getColumnStats(tableName, column));
                const batchResults = await Promise.allSettled(batchPromises);

                // Add results as they complete
                batchResults.forEach((result, index) => {
                    const column = batch[index];
                    processedCount++;

                    let statsResult;
                    if (result.status === 'fulfilled') {
                        statsResult = result.value;
                        this.addColumnStatsToDisplay(resultsContainer, result.value);
                    } else {
                        // Add error placeholder for failed column
                        statsResult = {
                            name: column.column_name,
                            type: column.column_type,
                            error: true,
                            errorMessage: result.reason?.message || 'Analysis failed'
                        };
                        this.addColumnStatsToDisplay(resultsContainer, statsResult);
                    }
                    
                    detailedResults.push(statsResult);
                    // Also add to partial results for stop functionality
                    if (this.partialDetailedStats) {
                        this.partialDetailedStats.push(statsResult);
                    }

                    // Update progress
                    const progressPercent = (processedCount / totalColumns) * 100;
                    progressFill.style.width = `${progressPercent}%`;
                    progressText.textContent = `Analyzing columns... (${processedCount} of ${totalColumns} complete)`;
                });

                // Small delay to keep UI responsive and allow for abort checks
                if (i + batchSize < columns.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Cache the results for future use
            this.detailedStats = detailedResults;
            this.wasAnalysisStopped = false; // Clear the stopped flag for complete analysis
            this.partialDetailedStats = null; // Clear temp storage

            // Complete - go back to basic view with detailed stats shown
            this.renderStats();

        } catch (error) {
            if (error.message === 'Analysis aborted') {
                throw new Error('AbortError');
            }
            console.error('Error in batched column statistics:', error);
            throw error;
        }
    }

    async getColumnStats(tableName, columnInfo) {
        const manager = window.duckDBManager;
        const columnName = columnInfo.column_name;
        const columnType = columnInfo.column_type.toUpperCase();

        let stats = {
            name: columnName,
            type: columnType,
            nullCount: 0,
            uniqueCount: 0
        };

        try {
            // Get null count and unique count
            const basicStatsResult = await manager.executeSQL(`
                SELECT 
                    COUNT(*) - COUNT("${columnName}") as null_count,
                    COUNT(DISTINCT "${columnName}") as unique_count
                FROM ${tableName}
            `);

            if (basicStatsResult.data.length > 0) {
                stats.nullCount = basicStatsResult.data[0].null_count;
                stats.uniqueCount = basicStatsResult.data[0].unique_count;
            }

            // Type-specific statistics
            if (columnType.includes('INTEGER') || columnType.includes('DOUBLE') || columnType.includes('FLOAT') || columnType.includes('DECIMAL')) {
                const numericStatsResult = await manager.executeSQL(`
                    SELECT 
                        MIN("${columnName}") as min_val,
                        MAX("${columnName}") as max_val,
                        AVG("${columnName}") as avg_val,
                        MEDIAN("${columnName}") as median_val
                    FROM ${tableName}
                    WHERE "${columnName}" IS NOT NULL
                `);

                if (numericStatsResult.data.length > 0) {
                    const numStats = numericStatsResult.data[0];
                    stats.min = numStats.min_val;
                    stats.max = numStats.max_val;
                    stats.avg = numStats.avg_val;
                    stats.median = numStats.median_val;
                }
            } else if (columnType.includes('VARCHAR') || columnType.includes('TEXT') || columnType.includes('STRING')) {
                const stringStatsResult = await manager.executeSQL(`
                    SELECT 
                        MIN(LENGTH("${columnName}")) as min_length,
                        MAX(LENGTH("${columnName}")) as max_length,
                        AVG(LENGTH("${columnName}")) as avg_length
                    FROM ${tableName}
                    WHERE "${columnName}" IS NOT NULL
                `);

                if (stringStatsResult.data.length > 0) {
                    const strStats = stringStatsResult.data[0];
                    stats.minLength = strStats.min_length;
                    stats.maxLength = strStats.max_length;
                    stats.avgLength = strStats.avg_length;
                }
            }

            return stats;

        } catch (error) {
            console.warn(`Error getting stats for column ${columnName}:`, error);
            stats.error = true;
            stats.errorMessage = error.message;
            return stats;
        }
    }

    addColumnStatsToDisplay(container, stats) {
        const columnDiv = document.createElement('div');
        columnDiv.style.cssText = 'margin-bottom: 1rem; padding: 0.75rem; background: var(--input-bg); border-radius: 4px; border-left: 3px solid var(--primary-color);';

        if (stats.error) {
            columnDiv.innerHTML = `
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--error-color);">
                    ${stats.name} (Analysis Failed)
                </h4>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                    <span class="type-badge ${this.getTypeBadgeClass(stats.type)}">${stats.type}</span>
                    <div style="margin-top: 0.5rem; color: var(--error-color);">
                        Error: ${stats.errorMessage}
                    </div>
                </div>
            `;
        } else {
            let detailsHtml = `<div>Unique: ${this.formatNumber(stats.uniqueCount)} | Nulls: ${this.formatNumber(stats.nullCount)}</div>`;

            // Add type-specific stats
            if (stats.min !== undefined) {
                detailsHtml += `
                    <div>Range: ${this.formatNumber(stats.min)} - ${this.formatNumber(stats.max)}</div>
                    <div>Avg: ${this.formatNumber(stats.avg, 2)} | Median: ${this.formatNumber(stats.median, 2)}</div>
                `;
            } else if (stats.minLength !== undefined) {
                detailsHtml += `
                    <div>Length: ${this.formatNumber(stats.minLength)} - ${this.formatNumber(stats.maxLength)} chars (avg: ${this.formatNumber(stats.avgLength, 1)})</div>
                `;
            }

            columnDiv.innerHTML = `
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">${stats.name}</h4>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                    <span class="type-badge ${this.getTypeBadgeClass(stats.type)}">${stats.type}</span>
                    <div style="margin-top: 0.5rem;">
                        ${detailsHtml}
                    </div>
                </div>
            `;
        }

        container.appendChild(columnDiv);
    }

    async getColumnStatistics(tableName) {
        const manager = window.duckDBManager;
        const results = {};

        try {
            // Get basic info about all columns
            const schemaResult = await manager.executeSQL(`
                DESCRIBE SELECT * FROM ${tableName}
            `);

            const columns = schemaResult.data;
            
            for (const column of columns) {
                const columnName = column.column_name;
                const columnType = column.column_type.toUpperCase();
                
                let stats = {
                    name: columnName,
                    type: columnType,
                    nullCount: 0,
                    uniqueCount: 0
                };

                try {
                    // Get null count and unique count
                    const basicStatsResult = await manager.executeSQL(`
                        SELECT 
                            COUNT(*) - COUNT("${columnName}") as null_count,
                            COUNT(DISTINCT "${columnName}") as unique_count
                        FROM ${tableName}
                    `);

                    if (basicStatsResult.data.length > 0) {
                        stats.nullCount = basicStatsResult.data[0].null_count;
                        stats.uniqueCount = basicStatsResult.data[0].unique_count;
                    }

                    // Type-specific statistics
                    if (columnType.includes('INTEGER') || columnType.includes('DOUBLE') || columnType.includes('FLOAT')) {
                        const numericStatsResult = await manager.executeSQL(`
                            SELECT 
                                MIN("${columnName}") as min_val,
                                MAX("${columnName}") as max_val,
                                AVG("${columnName}") as avg_val,
                                MEDIAN("${columnName}") as median_val
                            FROM ${tableName}
                            WHERE "${columnName}" IS NOT NULL
                        `);

                        if (numericStatsResult.data.length > 0) {
                            const numStats = numericStatsResult.data[0];
                            stats.min = numStats.min_val;
                            stats.max = numStats.max_val;
                            stats.avg = numStats.avg_val;
                            stats.median = numStats.median_val;
                        }
                    } else if (columnType.includes('VARCHAR') || columnType.includes('TEXT')) {
                        // String statistics
                        const stringStatsResult = await manager.executeSQL(`
                            SELECT 
                                MIN(LENGTH("${columnName}")) as min_length,
                                MAX(LENGTH("${columnName}")) as max_length,
                                AVG(LENGTH("${columnName}")) as avg_length
                            FROM ${tableName}
                            WHERE "${columnName}" IS NOT NULL
                        `);

                        if (stringStatsResult.data.length > 0) {
                            const strStats = stringStatsResult.data[0];
                            stats.minLength = strStats.min_length;
                            stats.maxLength = strStats.max_length;
                            stats.avgLength = strStats.avg_length;
                        }
                    }

                    results[columnName] = stats;

                } catch (columnError) {
                    console.warn(`Error getting stats for column ${columnName}:`, columnError);
                    results[columnName] = stats; // Still include basic info
                }
            }

            return results;

        } catch (error) {
            console.error('Error getting column statistics:', error);
            throw error;
        }
    }

    renderDetailedStats(columnStats) {
        const content = this.querySelector('#statsContent');
        
        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        
        Object.values(columnStats).forEach(stats => {
            html += `
                <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--input-bg); border-radius: 4px; border-left: 3px solid var(--primary-color);">
                    <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">${stats.name}</h4>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        <span class="type-badge ${this.getTypeBadgeClass(stats.type)}">${stats.type}</span>
                        <div style="margin-top: 0.5rem;">
                            <div>Unique: ${this.formatNumber(stats.uniqueCount)} | Nulls: ${this.formatNumber(stats.nullCount)}</div>
            `;

            // Add type-specific stats
            if (stats.min !== undefined) {
                html += `
                    <div>Range: ${this.formatNumber(stats.min)} - ${this.formatNumber(stats.max)}</div>
                    <div>Avg: ${this.formatNumber(stats.avg, 2)} | Median: ${this.formatNumber(stats.median, 2)}</div>
                `;
            } else if (stats.minLength !== undefined) {
                html += `
                    <div>Length: ${this.formatNumber(stats.minLength)} - ${this.formatNumber(stats.maxLength)} chars (avg: ${this.formatNumber(stats.avgLength, 1)})</div>
                `;
            }

            html += `
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Add back button
        html += `
            <div style="margin-top: 1rem; text-align: center;">
                <button class="btn back-stats-btn" style="width: 100%;">
                    ← Back to Basic Stats
                </button>
            </div>
        `;

        content.innerHTML = html;

        // Add event listener to back button
        const backBtn = content.querySelector('.back-stats-btn');
        if (backBtn) {
            backBtn.onclick = () => this.renderStats();
        }
    }

    async refreshStats() {
        try {
            const app = this.closest('bdw-app');
            if (!app || !app.currentTable) {
                return;
            }

            const content = this.querySelector('#statsContent');
            content.innerHTML = '<div class="loading"><div class="spinner"></div>Refreshing statistics...</div>';

            // Clear cached detailed stats
            this.detailedStats = null;
            this.partialDetailedStats = null;

            // Get fresh stats
            const tableInfo = await window.duckDBManager.getTableInfo(app.currentTable);
            this.updateStats(tableInfo.stats);

        } catch (error) {
            console.error('Error refreshing stats:', error);
            this.showError(`Failed to refresh statistics: ${error.message}`);
        }
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

    getTypeBadgeClass(type) {
        const typeUpper = type.toUpperCase();
        
        if (typeUpper.includes('VARCHAR') || typeUpper.includes('TEXT')) return 'type-varchar';
        if (typeUpper.includes('INTEGER') || typeUpper.includes('BIGINT')) return 'type-integer';
        if (typeUpper.includes('DOUBLE') || typeUpper.includes('FLOAT')) return 'type-double';
        if (typeUpper.includes('BOOLEAN')) return 'type-boolean';
        if (typeUpper.includes('TIMESTAMP') || typeUpper.includes('DATE')) return 'type-timestamp';
        
        return 'type-varchar';
    }

    showError(message) {
        const content = this.querySelector('#statsContent');
        content.innerHTML = `
            <div style="color: var(--error-color); text-align: center; padding: 1rem;">
                Error: ${message}
                <div style="margin-top: 0.5rem;">
                    <button class="btn error-retry-btn">
                        Try Again
                    </button>
                </div>
            </div>
        `;
        
        // Add event listener to retry button
        const retryBtn = content.querySelector('.error-retry-btn');
        if (retryBtn) {
            retryBtn.onclick = () => this.refreshStats();
        }
    }
}

customElements.define('bdw-stats-panel', BDWStatsPanel);
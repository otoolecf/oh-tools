// Statistics Panel Component for Browser Data Workbench

class BDWStatsPanel extends HTMLElement {
    constructor() {
        super();
        this.stats = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="panel">
                <h3>📈 Statistics</h3>
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

        let html = '<div class="stats-grid">';

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
            const duplicatePercentage = ((this.stats.row_count - this.stats.distinct_rows) / this.stats.row_count * 100).toFixed(1);
            html += `
                <div class="stat-item">
                    <span class="stat-value">${duplicatePercentage}%</span>
                    <div class="stat-label">Duplicates</div>
                </div>
            `;
        }

        html += '</div>';

        // Add action buttons for more detailed analysis
        html += `
            <div style="margin-top: 1rem;">
                <button class="btn" onclick="this.parentElement.parentElement.parentElement.__generateDetailedStats()" style="width: 100%; margin-bottom: 0.5rem;">
                    📊 Detailed Analysis
                </button>
                <button class="btn" onclick="this.parentElement.parentElement.parentElement.__refreshStats()" style="width: 100%;">
                    🔄 Refresh Stats
                </button>
            </div>
        `;

        content.innerHTML = html;

        // Make methods available to inline onclick handlers
        content.parentElement.parentElement.__generateDetailedStats = () => this.generateDetailedStats();
        content.parentElement.parentElement.__refreshStats = () => this.refreshStats();
    }

    async generateDetailedStats() {
        try {
            // Get the current table from the parent app
            const app = this.closest('bdw-app');
            if (!app || !app.currentTable) {
                alert('No table available for analysis');
                return;
            }

            const tableName = app.currentTable;
            
            // Show loading state
            const content = this.querySelector('#statsContent');
            content.innerHTML = '<div class="loading"><div class="spinner"></div>Generating detailed statistics...</div>';

            // Generate column-level statistics
            const columnStats = await this.getColumnStatistics(tableName);
            
            // Update display with detailed stats
            this.renderDetailedStats(columnStats);

        } catch (error) {
            console.error('Error generating detailed stats:', error);
            this.showError(`Failed to generate detailed statistics: ${error.message}`);
        }
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
                    <div>Length: ${stats.minLength} - ${stats.maxLength} chars (avg: ${this.formatNumber(stats.avgLength, 1)})</div>
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
                <button class="btn" onclick="this.parentElement.parentElement.parentElement.__showBasicStats()" style="width: 100%;">
                    ← Back to Basic Stats
                </button>
            </div>
        `;

        content.innerHTML = html;

        // Make method available
        content.parentElement.parentElement.__showBasicStats = () => this.renderStats();
    }

    async refreshStats() {
        try {
            const app = this.closest('bdw-app');
            if (!app || !app.currentTable) {
                return;
            }

            const content = this.querySelector('#statsContent');
            content.innerHTML = '<div class="loading"><div class="spinner"></div>Refreshing statistics...</div>';

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
        
        const num = Number(value);
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
                ❌ ${message}
                <div style="margin-top: 0.5rem;">
                    <button class="btn" onclick="this.parentElement.parentElement.parentElement.__refreshStats()">
                        Try Again
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('bdw-stats-panel', BDWStatsPanel);
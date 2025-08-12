// SQL Console Component for Browser Data Workbench

class BDWSQLConsole extends HTMLElement {
    constructor() {
        super();
        this.queryHistory = JSON.parse(localStorage.getItem('bdw-sql-history') || '[]');
        this.historyIndex = -1;
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="sqlConsoleContent" style="display: flex; flex-direction: column; height: 100%;">
                <div style="margin-bottom: 1rem; flex: 1; display: flex; flex-direction: column;">
                    <textarea id="sqlTextarea" 
                              class="sql-textarea" 
                              placeholder="Enter SQL query here... (e.g., SELECT * FROM input_data LIMIT 10)"
                              rows="8"></textarea>
                </div>
                
                <div class="sql-actions">
                    <div>
                        <button class="btn btn-primary" id="executeBtn">
                            Execute Query
                        </button>
                        <button class="btn" id="clearBtn">
                            Clear
                        </button>
                        <button class="btn" id="examplesBtn">
                            Examples
                        </button>
                    </div>
                    <div class="sql-info">
                        <span id="queryInfo">Ready</span>
                    </div>
                </div>


                <div id="exampleQueries" style="display: none; margin-top: 1rem;">
                    <h4>Example Queries:</h4>
                    <div class="examples-grid" style="display: grid; gap: 0.5rem; margin-top: 0.5rem;">
                        <!-- Examples will be populated here -->
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        this.populateExamples();
    }

    setupEventListeners() {
        const textarea = this.querySelector('#sqlTextarea');
        const executeBtn = this.querySelector('#executeBtn');
        const clearBtn = this.querySelector('#clearBtn');
        const examplesBtn = this.querySelector('#examplesBtn');
        
        // Button event listeners
        if (executeBtn) {
            executeBtn.addEventListener('click', () => this.executeSQL());
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSQL());
        }
        if (examplesBtn) {
            examplesBtn.addEventListener('click', () => this.toggleExamples());
        }
        
        // Keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to execute
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.executeSQL();
            }
            
            // Arrow keys for history navigation
            if (e.key === 'ArrowUp' && e.ctrlKey) {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown' && e.ctrlKey) {
                e.preventDefault();
                this.navigateHistory(1);
            }
            
            // Tab for basic indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 2;
            }
        });

        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
        });
    }

    populateExamples() {
        const examplesGrid = this.querySelector('.examples-grid');
        
        const examples = [
            {
                title: 'View All Data',
                query: 'SELECT * FROM input_data LIMIT 100;',
                description: 'Show first 100 rows of imported data'
            },
            {
                title: 'Row Count',
                query: 'SELECT COUNT(*) as total_rows FROM input_data;',
                description: 'Count total number of rows'
            },
            {
                title: 'Unique Values',
                query: 'SELECT column_name, COUNT(*) as count\nFROM input_data\nGROUP BY column_name\nORDER BY count DESC;',
                description: 'Count unique values in a column'
            },
            {
                title: 'Filter Data',
                query: 'SELECT *\nFROM input_data\nWHERE column_name > 100\nORDER BY column_name DESC;',
                description: 'Filter and sort data'
            },
            {
                title: 'Aggregate Stats',
                query: 'SELECT \n  MIN(numeric_column) as min_val,\n  MAX(numeric_column) as max_val,\n  AVG(numeric_column) as avg_val\nFROM input_data;',
                description: 'Basic statistics for numeric columns'
            },
            {
                title: 'Missing Values',
                query: 'SELECT \n  COUNT(*) as total_rows,\n  COUNT(column_name) as non_null_rows,\n  COUNT(*) - COUNT(column_name) as null_rows\nFROM input_data;',
                description: 'Count null values in a column'
            },
        ];

        examples.forEach(example => {
            const exampleDiv = document.createElement('div');
            exampleDiv.className = 'example-item';
            exampleDiv.style.cssText = `
                padding: 0.75rem;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--input-bg);
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            exampleDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 0.25rem;">${example.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${example.description}</div>
                <code style="font-size: 0.8rem; background: var(--panel-bg); padding: 0.25rem; border-radius: 2px; display: block;">${example.query}</code>
            `;
            
            exampleDiv.addEventListener('click', () => {
                this.setQuery(example.query);
            });
            
            exampleDiv.addEventListener('mouseenter', () => {
                exampleDiv.style.borderColor = 'var(--primary-color)';
            });
            
            exampleDiv.addEventListener('mouseleave', () => {
                exampleDiv.style.borderColor = 'var(--border-color)';
            });
            
            examplesGrid.appendChild(exampleDiv);
        });
    }

    async executeSQL() {
        const textarea = this.querySelector('#sqlTextarea');
        const query = textarea.value.trim();
        
        if (!query) {
            this.showInfo('Please enter a SQL query');
            return;
        }

        try {
            this.showInfo('Executing query...');
            
            // Add to history
            this.addToHistory(query);
            
            // Execute SQL query
            const result = await window.duckDBManager.executeSQL(query);
            
            // Emit SQL execute event with results
            const event = new CustomEvent('sql-execute', {
                detail: { 
                    query: query,
                    result: result
                },
                bubbles: true
            });
            
            this.dispatchEvent(event);
            
            this.showInfo(`Query executed successfully (${result.rowCount} rows) - Results shown in Data Preview tab`);
            
        } catch (error) {
            console.error('SQL execution error:', error);
            this.showError(`Query failed: ${error.message}`);
        }
    }


    exportResults(query) {
        // Emit export request with custom query
        const event = new CustomEvent('export-request', {
            detail: {
                format: 'csv',
                fileName: 'query_results.csv',
                query: query,
                options: { header: true }
            },
            bubbles: true
        });
        
        this.dispatchEvent(event);
    }

    clearSQL() {
        const textarea = this.querySelector('#sqlTextarea');
        textarea.value = '';
        textarea.style.height = 'auto';
        
        this.showInfo('Ready');
    }

    setQuery(query) {
        const textarea = this.querySelector('#sqlTextarea');
        textarea.value = query;
        textarea.focus();
        
        // Auto-resize
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
        
        // Hide examples
        const examplesDiv = this.querySelector('#exampleQueries');
        examplesDiv.style.display = 'none';
    }

    toggleExamples() {
        const examplesDiv = this.querySelector('#exampleQueries');
        examplesDiv.style.display = examplesDiv.style.display === 'none' ? 'block' : 'none';
    }

    addToHistory(query) {
        // Remove if already exists
        const existingIndex = this.queryHistory.indexOf(query);
        if (existingIndex > -1) {
            this.queryHistory.splice(existingIndex, 1);
        }
        
        // Add to beginning
        this.queryHistory.unshift(query);
        
        // Limit history size
        if (this.queryHistory.length > 50) {
            this.queryHistory = this.queryHistory.slice(0, 50);
        }
        
        // Save to localStorage
        localStorage.setItem('bdw-sql-history', JSON.stringify(this.queryHistory));
        
        this.historyIndex = -1;
    }

    navigateHistory(direction) {
        if (this.queryHistory.length === 0) return;
        
        this.historyIndex += direction;
        
        if (this.historyIndex < -1) {
            this.historyIndex = -1;
            return;
        }
        
        if (this.historyIndex >= this.queryHistory.length) {
            this.historyIndex = this.queryHistory.length - 1;
        }
        
        const textarea = this.querySelector('#sqlTextarea');
        
        if (this.historyIndex === -1) {
            textarea.value = '';
        } else {
            textarea.value = this.queryHistory[this.historyIndex];
        }
        
        // Auto-resize
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
    }

    showInfo(message) {
        const infoElement = this.querySelector('#queryInfo');
        infoElement.textContent = message;
        infoElement.style.color = 'var(--text-secondary)';
    }

    showError(message) {
        const infoElement = this.querySelector('#queryInfo');
        infoElement.textContent = message;
        infoElement.style.color = 'var(--error-color)';
    }

    getCurrentQuery() {
        const textarea = this.querySelector('#sqlTextarea');
        const query = textarea ? textarea.value.trim() : '';
        console.log('getCurrentQuery called - textarea found:', !!textarea, 'query length:', query.length, 'query:', query);
        if (textarea) {
            console.log('Textarea value raw:', JSON.stringify(textarea.value));
            console.log('Parent element:', textarea.parentElement?.tagName);
        }
        return query;
    }
}

customElements.define('bdw-sql-console', BDWSQLConsole);
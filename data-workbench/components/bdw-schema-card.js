// Schema Display Component for Browser Data Workbench

class BDWSchemaCard extends HTMLElement {
    constructor() {
        super();
        this.schema = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="panel">
                <h3>Schema</h3>
                <div id="schemaContent">
                    <p style="color: var(--text-secondary); text-align: center; padding: 2rem;">
                        Import a file to see its schema
                    </p>
                </div>
            </div>
        `;
    }

    updateSchema(schema) {
        this.schema = schema;
        this.renderSchema();
    }

    renderSchema() {
        const content = this.querySelector('#schemaContent');
        
        if (!this.schema || !this.schema.length) {
            content.innerHTML = '<p style="color: var(--text-secondary);">No schema information available</p>';
            return;
        }

        let html = `
            <div class="schema-summary" style="margin-bottom: 1rem; padding: 0.75rem; background: var(--input-bg); border-radius: 4px;">
                <strong>${this.schema.length}</strong> columns
            </div>
            
            <table class="schema-table">
                <thead>
                    <tr>
                        <th>Column</th>
                        <th>Type</th>
                        <th>Nullable</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.schema.forEach(column => {
            const typeBadgeClass = this.getTypeBadgeClass(column.column_type);
            html += `
                <tr>
                    <td><strong>${column.column_name}</strong></td>
                    <td><span class="type-badge ${typeBadgeClass}">${column.column_type}</span></td>
                    <td>${column.null === 'YES' ? 'Yes' : 'No'}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';

        content.innerHTML = html;
    }

    getTypeBadgeClass(type) {
        const typeUpper = type.toUpperCase();
        
        if (typeUpper.includes('VARCHAR') || typeUpper.includes('TEXT') || typeUpper.includes('STRING')) {
            return 'type-varchar';
        }
        if (typeUpper.includes('INTEGER') || typeUpper.includes('BIGINT') || typeUpper.includes('SMALLINT')) {
            return 'type-integer';
        }
        if (typeUpper.includes('DOUBLE') || typeUpper.includes('FLOAT') || typeUpper.includes('REAL') || typeUpper.includes('DECIMAL')) {
            return 'type-double';
        }
        if (typeUpper.includes('BOOLEAN') || typeUpper.includes('BOOL')) {
            return 'type-boolean';
        }
        if (typeUpper.includes('TIMESTAMP') || typeUpper.includes('DATE') || typeUpper.includes('TIME')) {
            return 'type-timestamp';
        }
        
        return 'type-varchar'; // default
    }

    // Method to export schema information
    getSchemaInfo() {
        if (!this.schema) return null;
        
        return {
            columnCount: this.schema.length,
            columns: this.schema.map(col => ({
                name: col.column_name,
                type: col.column_type,
                nullable: col.null === 'YES'
            })),
            types: this.getTypeDistribution()
        };
    }

    getTypeDistribution() {
        if (!this.schema) return {};
        
        const distribution = {};
        this.schema.forEach(col => {
            const baseType = this.getBaseType(col.column_type);
            distribution[baseType] = (distribution[baseType] || 0) + 1;
        });
        
        return distribution;
    }

    getBaseType(type) {
        const typeUpper = type.toUpperCase();
        
        if (typeUpper.includes('VARCHAR') || typeUpper.includes('TEXT')) return 'TEXT';
        if (typeUpper.includes('INTEGER') || typeUpper.includes('BIGINT')) return 'INTEGER';
        if (typeUpper.includes('DOUBLE') || typeUpper.includes('FLOAT')) return 'NUMERIC';
        if (typeUpper.includes('BOOLEAN')) return 'BOOLEAN';
        if (typeUpper.includes('TIMESTAMP') || typeUpper.includes('DATE')) return 'DATETIME';
        
        return 'OTHER';
    }
}

customElements.define('bdw-schema-card', BDWSchemaCard);
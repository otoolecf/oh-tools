export const sqlLiteral = value => `'${String(value).replace(/'/g, "''")}'`;
export const sqlIdentifier = value => `"${String(value).replace(/"/g, '""')}"`;

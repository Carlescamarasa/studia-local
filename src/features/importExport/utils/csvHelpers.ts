/**
 * Helper para parsear CSV con punto y coma o coma como separador
 */
export const parseCSV = (text: string): Record<string, string>[] => {
    const lines: string[] = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Detectar separador (punto y coma o coma)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    // Parsear headers (quitar comillas si existen)
    const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));

    // Parsear filas
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parsear valores (manejar comillas correctamente)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim()); // Último valor

        // Limpiar comillas de los valores
        const cleanedValues = values.map(v => v.replace(/^"|"$/g, ''));

        if (cleanedValues.length === headers.length) {
            const row: Record<string, string> = {};
            headers.forEach((header, idx) => {
                row[header] = cleanedValues[idx];
            });
            rows.push(row);
        }
    }

    return rows;
};

/**
 * Helper para generar CSV
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const generateCSV = (headers: string[], rows: Record<string, any>[]): string => {
    const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headerRow = headers.map(escapeCSV).join(';');
    const dataRows = rows.map(row => headers.map(h => escapeCSV(row[h])).join(';'));
    return [headerRow, ...dataRows].join('\n');
};

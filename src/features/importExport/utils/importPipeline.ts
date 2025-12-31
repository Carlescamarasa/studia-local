import { parseCSV } from './csvHelpers';

/**
 * Executes the full import pipeline: Parse -> Validate -> Resolve Deps -> Diff
 * Returns a detailed report to be used by the Review Panel.
 */
export async function runImportPipeline(dataset: any, rawData: string, format: string, existingData: any[] = []): Promise<any> {
    const report: { rows: any[]; summary: any; dependencies: Record<string, any> } = {
        rows: [],
        summary: { total: 0, valid: 0, errors: 0, warnings: 0, changes: { created: 0, updated: 0, skipped: 0 } },
        dependencies: {}
    };

    // 1. PARSE
    // -----------------------------------------------------------------------
    let parsedRows = [];
    try {
        parsedRows = format === 'csv' ? parseCSV(rawData) : JSON.parse(rawData);
        if (!Array.isArray(parsedRows)) throw new Error("Format invalid: Expected an array");
    } catch (e: any) {
        throw new Error(`Error parsing file: ${e.message}`);
    }

    report.summary.total = parsedRows.length;

    // 2. VALIDATE & IDENTIFY UPDATES
    // -----------------------------------------------------------------------
    const upsertKey = dataset.import?.upsertKey;
    const dependencies = dataset.import?.dependencies || {};

    // Initialize dependency map
    Object.keys(dependencies).forEach((key: string) => {
        report.dependencies[key] = {
            targetDataset: dependencies[key],
            status: 'pending', // pending, resolved, partial
            matches: {} // inputVal -> { resolved: [...], missing: [...] }
        };
    });

    for (const [index, row] of parsedRows.entries()) {
        const rowId = `row-${index}`;
        const rowReport: any = {
            id: rowId,
            original: row,
            data: { ...row }, // clone for mutations
            errors: [],
            warnings: [],
            status: 'valid', // valid, error, warning
            action: 'create', // create, update, skip
            dependencyStatus: {} // key -> 'resolved' | 'missing' | 'ambiguous'
        };

        // Basic Validation
        if (dataset.import?.csvHeaders) {
            // Check required fields (heuristic: upsertKey + first 2 headers usually required)
            // Or better: check what the handler throws on.
            // For now, simple check:
            if (upsertKey && !row[upsertKey]) {
                // If strictly required. For CSV often one key is enough.
                // Assuming 'nombre' is always required if 'code' missing? Let's rely on basic check
                if (!row['nombre']) {
                    rowReport.errors.push("Campo obligatorio 'nombre' faltante.");
                }
            }
        }

        // Determine Action (Create/Update)
        if (upsertKey && row[upsertKey]) {
            // Check existence in DB (passed as existingData usually full list)
            // This requires the caller to pass the *target* dataset existing data
            // For now we assume existingData is the specific entity list.
            const match = existingData.find((e: any) =>
                String(e[upsertKey] || '').toLowerCase() === String(row[upsertKey] || '').toLowerCase()
            );
            if (match) {
                rowReport.action = 'update';
                rowReport.data.id = match.id; // Link to existing ID
            }
        }

        // 3. RESOLVE DEPENDENCIES (Preliminary)
        // -------------------------------------------------------------------
        for (const [field, targetDsId] of Object.entries(dependencies)) {
            const rawValue = row[field];
            if (!rawValue) continue; // Optional dependency or empty

            const resolver = dataset.import?.resolvers?.[field];
            if (resolver) {
                try {
                    // Resolve!
                    const result = await resolver(rawValue);

                    rowReport.data[field] = result; // Store resolved object

                    // Track status
                    if (result.missing && result.missing.length > 0) {
                        rowReport.warnings.push(`Referencias no encontradas en '${field}': ${result.missing.join(', ')}`);
                        rowReport.dependencyStatus[field] = 'partial';
                    } else {
                        rowReport.dependencyStatus[field] = 'resolved';
                    }

                    // Cache resolution for bulk fix UI (optimization for later)
                    // report.dependencies[field].matches[rawValue] = result; 

                } catch (e: any) {
                    rowReport.errors.push(`Error resolviendo '${field}': ${e.message}`);
                }
            }
        }

        // Finalize Row Status
        if (rowReport.errors.length > 0) rowReport.status = 'error';
        else if (rowReport.warnings.length > 0) rowReport.status = 'warning';

        report.rows.push(rowReport);
    }

    // 4. SUMMARY
    // -----------------------------------------------------------------------
    report.summary.valid = report.rows.filter((r: any) => r.status !== 'error').length;
    report.summary.errors = report.rows.filter((r: any) => r.status === 'error').length;
    report.summary.warnings = report.rows.filter((r: any) => r.status === 'warning').length;

    report.summary.changes.created = report.rows.filter((r: any) => r.status !== 'error' && r.action === 'create').length;
    report.summary.changes.updated = report.rows.filter((r: any) => r.status !== 'error' && r.action === 'update').length;

    return report;
}

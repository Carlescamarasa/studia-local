/**
 * Helper para generar un ID único (compatible con formato local)
 */
export function generateId(prefix: string = 'item'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

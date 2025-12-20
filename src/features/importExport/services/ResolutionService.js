import { localDataClient } from "@/api/localDataClient";

/**
 * Normaliza texto para comparación (trim, lowercase)
 */
function normalize(str) {
    if (!str) return '';
    return String(str).trim().toLowerCase();
}

/**
 * ResolutionService
 * Centraliza la lógica para resolver IDs y dependencias durante la importación.
 */
export const ResolutionService = {

    // --- CACHING (Optional for per-session speedup) ---
    _cache: {
        users: null,
        piezas: null,
        bloques: null,
        planes: null
    },

    async _getUsers() {
        if (!this._cache.users) this._cache.users = await localDataClient.entities.User.list();
        return this._cache.users;
    },
    async _getPiezas() {
        if (!this._cache.piezas) this._cache.piezas = await localDataClient.entities.Pieza.list();
        return this._cache.piezas;
    },
    async _getBloques() {
        if (!this._cache.bloques) this._cache.bloques = await localDataClient.entities.Bloque.list();
        return this._cache.bloques;
    },

    // --- RESOLVERS ---

    /**
     * Resuelve ID de usuario por Email o Nombre aproximado
     */
    async resolveUser(input) {
        if (!input) return null;
        const search = normalize(input);
        const users = await this._getUsers();

        // 1. Exact email match
        let found = users.find(u => normalize(u.email) === search);

        // 2. Name approximation (if unique?) - Riskier, maybe skipping for now or return suggestions
        // For import strictness, usually Email is king.

        return found ? { id: found.id, label: found.nombreCompleto || found.email } : null;
    },

    /**
     * Resuelve ID de pieza por Nombre
     */
    async resolvePiece(input) {
        if (!input) return null;
        const search = normalize(input);
        const piezas = await this._getPiezas();

        const found = piezas.find(p => normalize(p.nombre) === search);
        return found ? { id: found.id, label: found.nombre } : null;
    },

    /**
     * Resuelve Bloques (Ejercicios) por Código o Nombre
     * Retorna objeto con { resolved: [], missing: [] } para listas
     */
    async resolveExercises(inputs) {
        const codes = Array.isArray(inputs) ? inputs : [inputs];
        const result = { resolved: [], missing: [] };
        const bloques = await this._getBloques();

        for (const code of codes) {
            const search = normalize(code);
            const found = bloques.find(b =>
                normalize(b.code) === search ||
                normalize(b.nombre) === search // Fallback for lax inputs
            );

            if (found) {
                // Return structure needed for persistence (snapshot usually)
                result.resolved.push({
                    id: found.id,
                    code: found.code,
                    nombre: found.nombre,
                    mediaLinks: found.mediaLinks || []
                });
            } else {
                result.missing.push(code);
            }
        }
        return result;
    }
};

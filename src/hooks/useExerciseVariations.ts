import { Bloque, Variation } from "@/features/shared/types/domain";

/**
 * useExerciseVariations
 * 
 * Lógica para la gestión de variaciones de ejercicios (Logic Engine).
 * Permite filtrar variaciones válidas por nivel y seleccionar aleatoriamente para modos de repaso.
 */

/**
 * Filtra las variaciones disponibles de un bloque basándose en el nivel técnico del usuario.
 * @param {Bloque} bloque - El objeto ejercicio completo (con propiedad variations)
 * @param {number} userLevel - Nivel técnico del usuario (1-100)
 * @returns {Variation[]|null} Array de variaciones válidas o null si no hay ninguna apta (Fallback a Full Mode).
 */
export function getValidVariations(bloque: Bloque, userLevel: number): Variation[] | null {
    // Si no hay variaciones definidas, retorno inmediato (Full Mode)
    if (!bloque || !bloque.variations || !Array.isArray(bloque.variations) || bloque.variations.length === 0) {
        return null;
    }

    // Filtrar por nivel mínimo requerido
    // Asumimos que variation.min_level es el campo correcto según el schema
    const valid = bloque.variations.filter((v: Variation & { minLevel?: number; min_level?: number }) => {
        const minLevel = v.min_level || v.minLevel || 0;
        return minLevel <= userLevel;
    });

    // Si tras filtrar no queda ninguna buena, devolvemos null para forzar el modo completo (Safety Fallback)
    if (valid.length === 0) {
        return null;
    }

    return valid;
}

/**
 * Selecciona una variación aleatoria de un pool de variaciones válidas.
 * Usado para el "Modo Repaso" (Review Mode).
 * @param {Variation[]} validVariations - Array de variaciones pre-validado
 * @returns {Variation|null} La variación seleccionada o null.
 */
export function pickRandomVariation(validVariations: Variation[]): Variation | null {
    if (!validVariations || !Array.isArray(validVariations) || validVariations.length === 0) {
        return null;
    }

    // Selección 100% aleatoria (Uniform distribution)
    const randomIndex = Math.floor(Math.random() * validVariations.length);
    return validVariations[randomIndex];
}

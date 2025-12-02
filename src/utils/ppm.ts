/**
 * Utilidades para la gestión de BPMs y unidades musicales.
 */

/**
 * Normaliza un BPM a negras.
 * 
 * Factores de conversión:
 * - negra: 1
 * - blanca: 2 (1 blanca = 2 negras) -> BPM * 2
 * - blancaConPuntillo: 3 (1 blanca. = 3 negras) -> BPM * 3
 * - corchea: 0.5 (1 corchea = 0.5 negras) -> BPM * 0.5
 * 
 * Ejemplo:
 * - 60 BPM (blanca) = 120 BPM (negra)
 * - 120 BPM (corchea) = 60 BPM (negra)
 * 
 * @param bpm - Valor de BPM original
 * @param unidad - Unidad musical del BPM
 * @returns BPM normalizado a negras
 */
export function getPPMNormalizado(
    bpm: number,
    unidad: 'negra' | 'blanca' | 'blancaConPuntillo' | 'corchea'
): number {
    switch (unidad) {
        case 'negra':
            return bpm;
        case 'blanca':
            return bpm * 2;
        case 'blancaConPuntillo':
            return bpm * 3;
        case 'corchea':
            return bpm * 0.5;
        default:
            return bpm;
    }
}

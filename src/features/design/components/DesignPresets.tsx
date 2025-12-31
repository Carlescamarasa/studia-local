/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Sistema de Presets Personalizados del Design System
 * Permite guardar, cargar y gestionar configuraciones visuales personalizadas
 * 
 * NOTA: Los presets base (como 'studia') están definidos en BasePresets.ts
 * Este archivo solo gestiona presets personalizados guardados en localStorage
 */

const CUSTOM_PRESETS_KEY = 'studia.design.customPresets.v1';

/**
 * Obtener todos los presets personalizados disponibles
 * (Los presets base se obtienen desde BasePresets.ts)
 */
export function getAllPresets() {
  try {
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const custom = customRaw ? JSON.parse(customRaw) : {};
    return custom;
  } catch {
    return {};
  }
}

/**
 * Guardar un preset personalizado
 */
export function saveCustomPreset(id: string, name: string, description: string, config: any) {
  try {
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const custom = customRaw ? JSON.parse(customRaw) : {};

    custom[id] = { name, description, config };
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(custom));

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Eliminar un preset personalizado
 */
export function deleteCustomPreset(id: string) {
  try {
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const custom = customRaw ? JSON.parse(customRaw) : {};

    delete custom[id];
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(custom));

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Verificar si un preset es built-in (no se puede eliminar)
 * NOTA: Los presets base están en BasePresets.ts, no aquí
 * Esta función siempre devuelve false porque aquí solo hay presets personalizados
 */
export function isBuiltInPreset(_id: string) {
  // Los presets base están en BasePresets.ts, no aquí
  // Todos los presets aquí son personalizados y se pueden eliminar
  return false;
}

/**
 * Exportar todos los presets personalizados como JSON
 */
export function exportCustomPresets() {
  try {
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    return customRaw || '{}';
  } catch {
    return '{}';
  }
}

/**
 * Importar presets desde JSON
 */
export function importCustomPresets(json: string) {
  try {
    const imported = JSON.parse(json);

    // Validar estructura básica
    if (typeof imported !== 'object') {
      throw new Error('Formato inválido');
    }

    // Merge con presets existentes
    const customRaw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const existing = customRaw ? JSON.parse(customRaw) : {};

    const merged = { ...existing, ...imported };
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(merged));

    return { success: true, count: Object.keys(imported).length };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
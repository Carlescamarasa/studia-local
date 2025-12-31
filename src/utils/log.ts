/**
 * Logger centralizado para producción
 * 
 * - log.debug() y log.info() solo loguean en desarrollo
 * - log.error() siempre loguea (importante para producción)
 * - log.warn() solo loguea en desarrollo (para advertencias no críticas)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
 
/**
 * Utility for categorized console logging using emojis
 */
const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Logger centralizado
 */
export const log = {
  /**
   * Debug - Solo en desarrollo
   * @param {...any} args - Argumentos a loguear
   */
  debug: (...args: any[]) => {
    if (!isProduction && isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * Info - Solo en desarrollo
   * @param {...any} args - Argumentos a loguear
   */
  info: (...args: any[]) => {
    if (!isProduction && isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warn - Solo en desarrollo (advertencias no críticas)
   * @param {...any} args - Argumentos a loguear
   */
  warn: (...args: any[]) => {
    if (!isProduction && isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Error - Siempre loguea (incluso en producción)
   * @param {...any} args - Argumentos a loguear
   */
  error: (...args: any[]) => {
    // En producción, podrías enviar a un servicio de tracking de errores aquí
    console.error('[ERROR]', ...args);
  },
};

// Exportar por defecto también
export default log;


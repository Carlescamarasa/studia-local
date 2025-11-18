/**
 * Cliente de datos unificado
 * 
 * Proporciona una API compatible con localDataClient pero que usa
 * DataProvider internamente. Esto permite migración gradual sin romper
 * código existente.
 * 
 * Uso:
 *   import { dataClient } from '@/api/dataClient';
 *   const piezas = await dataClient.entities.Pieza.list();
 */

import { useDataEntities } from '@/providers/DataProvider';

/**
 * Hook que proporciona dataClient compatible con localDataClient
 * 
 * Este hook debe usarse dentro de componentes React que estén dentro de DataProvider.
 * Para uso fuera de componentes, usar useData() directamente.
 */
export function useDataClient() {
  const entities = useDataEntities();
  
  return {
    entities,
    // Mantener compatibilidad con localDataClient.auth si es necesario
    auth: {
      me: async () => {
        // Esta funcionalidad debe venir de AuthProvider
        // Por ahora, retornamos null para mantener compatibilidad
        return null;
      },
      getCurrentUser: () => {
        return null;
      },
    },
  };
}

/**
 * Versión estática para uso fuera de componentes
 * 
 * NOTA: Esta versión siempre usa localDataClient por compatibilidad.
 * Para usar DataProvider, usar useDataClient() dentro de componentes.
 */
import { localDataClient } from './localDataClient';

export const dataClient = localDataClient;


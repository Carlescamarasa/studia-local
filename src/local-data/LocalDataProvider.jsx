import React, { createContext, useContext, useState, useEffect } from 'react';
import { localUsers } from './localUsers';
import { setLocalDataRef } from '@/api/localDataClient';
import { loadFromStorage, bootstrapFromSnapshot } from '@/data/localStorageClient';
import { rebuildAllLocalData } from './rebuildLocalData';

const LocalDataContext = createContext(null);

export function LocalDataProvider({ children }) {
  const [data, setData] = useState({
    asignaciones: [],
    bloques: [],
    feedbacksSemanal: [],
    piezas: [],
    planes: [],
    registrosBloque: [],
    registrosSesion: [],
    usuarios: localUsers,
    loading: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Intentar cargar desde la nueva estructura unificada en localStorage
        let stored = loadFromStorage();

        // 2. Si no existe STORAGE_KEY, inicializar usando rebuildLocalData como seed
        if (!stored) {
          await rebuildAllLocalData({ limpiarExistente: false });

          const legacySnapshot = {
            asignaciones: JSON.parse(localStorage.getItem('local_asignaciones') || '[]'),
            bloques: JSON.parse(localStorage.getItem('local_bloques') || '[]'),
            feedbacksSemanal: JSON.parse(localStorage.getItem('local_feedbacksSemanal') || '[]'),
            piezas: JSON.parse(localStorage.getItem('local_piezas') || '[]'),
            planes: JSON.parse(localStorage.getItem('local_planes') || '[]'),
            registrosBloque: JSON.parse(localStorage.getItem('local_registrosBloque') || '[]'),
            registrosSesion: JSON.parse(localStorage.getItem('local_registrosSesion') || '[]'),
            usuarios: localUsers,
          };

          stored = bootstrapFromSnapshot(legacySnapshot);
        }

        const loadedData = {
          asignaciones: stored.asignaciones || [],
          bloques: stored.bloques || [],
          feedbacksSemanal: stored.feedbacksSemanal || [],
          piezas: stored.piezas || [],
          planes: stored.planes || [],
          registrosBloque: stored.registrosBloque || [],
          registrosSesion: stored.registrosSesion || [],
          usuarios: stored.usuarios?.length ? stored.usuarios : localUsers,
          loading: false,
        };

        // Inyectar datos en localDataClient para que localDataClient.entities funcione
        setLocalDataRef(loadedData);
        setData(loadedData);
      } catch (error) {
        console.error('Error cargando datos locales:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    loadData();
  }, []);

  const getUsuarioById = (id) => {
    return data.usuarios.find(u => u.id === id);
  };

  const getAsignaciones = () => data.asignaciones;
  const getBloques = () => data.bloques;
  const getFeedbacksSemanal = () => data.feedbacksSemanal;
  const getPiezas = () => data.piezas;
  const getPlanes = () => data.planes;
  const getRegistrosBloque = () => data.registrosBloque;
  const getRegistrosSesion = () => data.registrosSesion;
  const getUsuarios = () => data.usuarios;

  return (
    <LocalDataContext.Provider value={{
      ...data,
      getUsuarioById,
      getAsignaciones,
      getBloques,
      getFeedbacksSemanal,
      getPiezas,
      getPlanes,
      getRegistrosBloque,
      getRegistrosSesion,
      getUsuarios,
    }}>
      {children}
    </LocalDataContext.Provider>
  );
}

export function useLocalData() {
  const context = useContext(LocalDataContext);
  if (!context) {
    throw new Error('useLocalData debe usarse dentro de LocalDataProvider');
  }
  return context;
}
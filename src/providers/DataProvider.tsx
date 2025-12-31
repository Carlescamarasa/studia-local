/**
 * DataProvider unificado
 * 
 * Proporciona acceso a datos desde localStorage o Supabase según VITE_DATA_SOURCE.
 * Mantiene compatibilidad con LocalDataProvider durante la transición.
 */

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { AppDataAPI } from '@/api/appDataAPI';
import { createLocalDataAPI } from '@/api/localDataAPI';
import { createRemoteDataAPI } from '@/api/remoteDataAPI';

const DataContext = createContext<AppDataAPI | null>(null);

/**
 * DataProvider que selecciona la implementación según VITE_DATA_SOURCE
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const dataSource = import.meta.env.VITE_DATA_SOURCE || 'local';

  const api = useMemo(() => {
    if (dataSource === 'remote') {
      return createRemoteDataAPI();
    } else {
      return createLocalDataAPI();
    }
  }, [dataSource]);

  return (
    <DataContext.Provider value={api}>
      {children}
    </DataContext.Provider>
  );
}

/**
 * Hook para acceder a la API de datos
 */
export function useData(): AppDataAPI {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe usarse dentro de DataProvider');
  }
  return context;
}

/**
 * Hook de compatibilidad que expone la API como entities (similar a localDataClient)
 * Esto permite migración gradual sin romper código existente
 */
export function useDataEntities() {
  const api = useData();

  return useMemo(() => ({
    User: {
      list: api.usuarios.list,
      get: api.usuarios.get,
      filter: api.usuarios.filter,
      create: api.usuarios.create,
      update: api.usuarios.update,
      delete: api.usuarios.delete,
    },
    Pieza: {
      list: api.piezas.list,
      get: api.piezas.get,
      filter: api.piezas.filter,
      create: api.piezas.create,
      update: api.piezas.update,
      delete: api.piezas.delete,
    },
    Bloque: {
      list: api.bloques.list,
      get: api.bloques.get,
      filter: api.bloques.filter,
      create: api.bloques.create,
      update: api.bloques.update,
      delete: api.bloques.delete,
    },
    Plan: {
      list: api.planes.list,
      get: api.planes.get,
      filter: api.planes.filter,
      create: api.planes.create,
      update: api.planes.update,
      delete: api.planes.delete,
    },
    Asignacion: {
      list: api.asignaciones.list,
      get: api.asignaciones.get,
      filter: api.asignaciones.filter,
      create: api.asignaciones.create,
      update: api.asignaciones.update,
      delete: api.asignaciones.delete,
    },
    RegistroSesion: {
      list: api.registrosSesion.list,
      get: api.registrosSesion.get,
      filter: api.registrosSesion.filter,
      create: api.registrosSesion.create,
      update: api.registrosSesion.update,
      delete: api.registrosSesion.delete,
    },
    RegistroBloque: {
      list: api.registrosBloque.list,
      get: api.registrosBloque.get,
      filter: api.registrosBloque.filter,
      create: api.registrosBloque.create,
      update: api.registrosBloque.update,
      delete: api.registrosBloque.delete,
    },
    FeedbackSemanal: {
      list: api.feedbacksSemanal.list,
      get: api.feedbacksSemanal.get,
      filter: api.feedbacksSemanal.filter,
      create: api.feedbacksSemanal.create,
      update: api.feedbacksSemanal.update,
      delete: api.feedbacksSemanal.delete,
    },
  }), [api]);
}


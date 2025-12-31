/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { localUsers } from './localUsers';
import { setLocalDataRef } from '@/api/localDataClient';
import { loadFromStorage, bootstrapFromSnapshot, saveToStorage, StorageData } from '@/data/localStorageClient';
import { rebuildAllLocalData } from './rebuildLocalData';
import { supabase } from '@/lib/supabaseClient';
import {
  Asignacion,
  Bloque,
  FeedbackSemanal,
  Pieza,
  Plan,
  RegistroBloque,
  RegistroSesion,
  EventoCalendario,
  Usuario
} from '@/types/data.types';

interface LocalDataContextType {
  asignaciones: Asignacion[];
  bloques: Bloque[];
  feedbacksSemanal: FeedbackSemanal[];
  piezas: Pieza[];
  planes: Plan[];
  registrosBloque: RegistroBloque[];
  registrosSesion: RegistroSesion[];
  eventosCalendario: EventoCalendario[];
  usuarios: Usuario[];
  loading: boolean;
  getUsuarioById: (id: string) => Usuario | undefined;
  getAsignaciones: () => Asignacion[];
  getBloques: () => Bloque[];
  getFeedbacksSemanal: () => FeedbackSemanal[];
  getPiezas: () => Pieza[];
  getPlanes: () => Plan[];
  getRegistrosBloque: () => RegistroBloque[];
  getRegistrosSesion: () => RegistroSesion[];
  getUsuarios: () => Usuario[];
}

const LocalDataContext = createContext<LocalDataContextType | null>(null);

/**
 * Normaliza un usuario asegurando que tenga nombreCompleto
 */
function normalizeUser(user: any): Usuario {
  if (!user) return user;

  // Si ya tiene nombreCompleto, retornar tal cual
  if (user.nombreCompleto && user.nombreCompleto.trim()) {
    return user as Usuario;
  }

  // Intentar generar nombreCompleto desde otros campos
  let nombreCompleto = null;

  if (user.full_name && user.full_name.trim()) {
    nombreCompleto = user.full_name.trim();
  } else if (user.first_name || user.last_name) {
    nombreCompleto = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  } else if (user.email) {
    const emailStr = String(user.email);
    if (emailStr.includes('@')) {
      const parteLocal = emailStr.split('@')[0];
      // Evitar IDs tipo Mongo/ObjectId (24 hex) u otros ids crudos
      const isLikelyId = /^[a-f0-9]{24}$/i.test(parteLocal) || /^u_[a-z0-9_]+$/i.test(parteLocal);
      if (parteLocal && !isLikelyId) {
        // Formatear email: "nombre.apellido" o "nombre" de forma más legible
        nombreCompleto = parteLocal
          .replace(/[._+-]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim() || emailStr;
      } else {
        // Si la parte local parece un ID, usar el email completo
        nombreCompleto = emailStr;
      }
    } else {
      nombreCompleto = emailStr;
    }
  } else {
    // Último recurso: generar nombre genérico
    nombreCompleto = `Usuario ${user.id || 'Nuevo'}`;
  }

  // Asegurar que full_name tenga valor - priorizar el existente, luego nombreCompleto generado
  const finalFullName = (user.full_name && user.full_name.trim()) || (nombreCompleto && nombreCompleto.trim()) || '';

  return {
    ...user,
    nombreCompleto: nombreCompleto,
    full_name: finalFullName, // full_name es la fuente de verdad
  } as Usuario;
}

/**
 * Migra usuarios para asegurar que todos tengan nombreCompleto
 */
function migrateUsers(usuarios: any[]) {
  if (!Array.isArray(usuarios)) {
    return { usuarios: (usuarios || []) as Usuario[], needsUpdate: false };
  }

  const normalized = usuarios.map(normalizeUser);
  const needsUpdate = normalized.some((u, i) => {
    const original = usuarios[i];
    return u.nombreCompleto !== original?.nombreCompleto ||
      u.full_name !== original?.full_name;
  });

  return { usuarios: normalized, needsUpdate };
}

export function LocalDataProvider({ children }: { children: React.ReactNode }) {
  const disableLocalData = import.meta.env.VITE_DISABLE_LOCAL_DATA === 'true';

  const [data, setData] = useState<Omit<LocalDataContextType, 'getUsuarioById' | 'getAsignaciones' | 'getBloques' | 'getFeedbacksSemanal' | 'getPiezas' | 'getPlanes' | 'getRegistrosBloque' | 'getRegistrosSesion' | 'getUsuarios'>>({
    asignaciones: [],
    bloques: [],
    feedbacksSemanal: [],
    piezas: [],
    planes: [],
    registrosBloque: [],
    registrosSesion: [],
    eventosCalendario: [],
    usuarios: disableLocalData ? [] : (localUsers as unknown as Usuario[]),
    loading: !disableLocalData,
  });

  useEffect(() => {
    const loadData = async () => {
      // If local data is disabled, use empty structure and rely on Supabase
      if (disableLocalData) {
        console.log('[LocalDataProvider] Local data disabled - using Supabase only');
        const emptyData = {
          asignaciones: [],
          bloques: [],
          feedbacksSemanal: [],
          piezas: [],
          planes: [],
          registrosBloque: [],
          registrosSesion: [],
          eventosCalendario: [],
          usuarios: [],
          loading: false,
        };
        setLocalDataRef(emptyData);
        setData(emptyData);
        return;
      }
      try {
        // Verificar si hay sesión de Supabase - si hay, no ejecutar rebuildAllLocalData
        const { data: { session } } = await supabase.auth.getSession();
        const hasSupabaseSession = !!session;

        // 1. Intentar cargar desde la nueva estructura unificada en localStorage
        let stored: StorageData | null = loadFromStorage();

        // 2. Si no existe STORAGE_KEY y NO hay sesión de Supabase, inicializar usando rebuildLocalData como seed
        // (Solo en modo local, no cuando hay autenticación de Supabase)
        if (!stored && !hasSupabaseSession) {
          await rebuildAllLocalData({ limpiarExistente: false });

          const legacySnapshot = {
            asignaciones: JSON.parse(localStorage.getItem('local_asignaciones') || '[]'),
            bloques: JSON.parse(localStorage.getItem('local_bloques') || '[]'),
            feedbacksSemanal: JSON.parse(localStorage.getItem('local_feedbacksSemanal') || '[]'),
            piezas: JSON.parse(localStorage.getItem('local_piezas') || '[]'),
            planes: JSON.parse(localStorage.getItem('local_planes') || '[]'),
            registrosBloque: JSON.parse(localStorage.getItem('local_registrosBloque') || '[]'),
            registrosSesion: JSON.parse(localStorage.getItem('local_registrosSesion') || '[]'),
            eventosCalendario: JSON.parse(localStorage.getItem('local_eventosCalendario') || '[]'),
            usuarios: localUsers,
          };

          stored = bootstrapFromSnapshot(legacySnapshot);
        } else if (!stored && hasSupabaseSession) {
          // Si hay sesión de Supabase pero no hay datos locales, usar estructura vacía
          stored = {
            version: 1, // Default version
            asignaciones: [],
            bloques: [],
            feedbacksSemanal: [],
            piezas: [],
            planes: [],
            registrosBloque: [],
            registrosSesion: [],
            eventosCalendario: [],
            usuarios: localUsers,
            evaluacionesTecnicas: []
          } as StorageData;
        }

        if (!stored) {
          stored = {
            version: 1,
            asignaciones: [],
            bloques: [],
            feedbacksSemanal: [],
            piezas: [],
            planes: [],
            registrosBloque: [],
            registrosSesion: [],
            eventosCalendario: [],
            usuarios: localUsers,
            evaluacionesTecnicas: []
          } as StorageData;
        }

        // Normalizar usuarios asegurando que todos tengan nombreCompleto
        const usuarios = (stored.usuarios?.length ? stored.usuarios : localUsers) as any[];
        const { usuarios: normalizedUsuarios, needsUpdate } = migrateUsers(usuarios);

        // Si hubo cambios, guardar de vuelta en localStorage
        if (needsUpdate && stored) {
          // @ts-ignore
          saveToStorage({ usuarios: normalizedUsuarios });
        }

        const loadedData = {
          asignaciones: (stored.asignaciones || []) as Asignacion[],
          bloques: (stored.bloques || []) as Bloque[],
          feedbacksSemanal: (stored.feedbacksSemanal || []) as FeedbackSemanal[],
          piezas: (stored.piezas || []) as Pieza[],
          planes: (stored.planes || []) as Plan[],
          registrosBloque: (stored.registrosBloque || []) as RegistroBloque[],
          registrosSesion: (stored.registrosSesion || []) as RegistroSesion[],
          eventosCalendario: (stored.eventosCalendario || []) as EventoCalendario[],
          usuarios: normalizedUsuarios,
          loading: false,
        };

        // Inyectar datos en localDataClient para que localDataClient.entities funcione
        setLocalDataRef(loadedData as any);
        setData(loadedData);
      } catch (error) {
        console.error('Error cargando datos locales:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    loadData();
  }, [disableLocalData]);

  const getUsuarioById = (id: string) => {
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
import React, { createContext, useContext, useState, useEffect } from 'react';
import { localUsers } from './localUsers';
import { setLocalDataRef } from '@/api/localDataClient';

// Importar CSV como texto
import AsignacionCSV from './Asignacion_export.csv?raw';
import BloqueCSV from './Bloque_export.csv?raw';
import FeedbackSemanalCSV from './FeedbackSemanal_export.csv?raw';
import PiezaCSV from './Pieza_export.csv?raw';
import PlanCSV from './Plan_export.csv?raw';
import RegistroBloqueCSV from './RegistroBloque_export.csv?raw';
import RegistroSesionCSV from './RegistroSesion_export.csv?raw';

const LocalDataContext = createContext(null);

// Función para parsear CSV
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const row = {};
    headers.forEach((header, idx) => {
      let value = values[idx] || '';
      // Intentar parsear JSON si parece ser JSON
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Si falla, dejar como string
        }
      }
      row[header] = value;
    });
    rows.push(row);
  }
  
  return rows;
}

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
    try {
      const asignaciones = parseCSV(AsignacionCSV);
      const bloques = parseCSV(BloqueCSV);
      const feedbacksSemanal = parseCSV(FeedbackSemanalCSV);
      const piezas = parseCSV(PiezaCSV);
      const planes = parseCSV(PlanCSV);
      const registrosBloque = parseCSV(RegistroBloqueCSV);
      const registrosSesion = parseCSV(RegistroSesionCSV);

      const loadedData = {
        asignaciones,
        bloques,
        feedbacksSemanal,
        piezas,
        planes,
        registrosBloque,
        registrosSesion,
        usuarios: localUsers,
        loading: false,
      };

      setData(loadedData);
      
      // Inyectar datos en localDataClient para que base44.entities funcione
      setLocalDataRef(loadedData);
    } catch (error) {
      console.error('Error cargando datos locales:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
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

import React, { useState, useRef } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ds";
import { FileDown, Users, Target, Layers, Calendar, Activity, Shield, Upload, Music, BookOpen, AlertTriangle, CheckCircle2, X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { displayName, calcularOffsetSemanas, calcularTiempoSesion, useEffectiveUser } from "../components/utils/helpers";
import { Alert, AlertDescription } from "@/components/ds";
import { createPortal } from "react-dom";
import PageHeader from "@/components/ds/PageHeader";
import Tabs from "@/components/ds/Tabs";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

const pad2 = (n) => String(n).padStart(2, "0");
const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startOfMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

// Helper para parsear CSV con punto y coma como separador
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Detectar separador (punto y coma o coma)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';

  // Parsear headers (quitar comillas si existen)
  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));

  // Parsear filas
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parsear valores (manejar comillas correctamente)
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Último valor

    // Limpiar comillas de los valores
    const cleanedValues = values.map(v => v.replace(/^"|"$/g, ''));

    if (cleanedValues.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = cleanedValues[idx];
      });
      rows.push(row);
    }
  }

  return rows;
};

// Helper para generar CSV
const generateCSV = (headers, rows) => {
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCSV).join(';');
  const dataRows = rows.map(row => headers.map(h => escapeCSV(row[h])).join(';'));
  return [headerRow, ...dataRows].join('\n');
};

export default function ImportExportPage({ embedded = false }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('importar'); // ⭐ Cambiado: Importar primero
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState(null);
  const [importFormat, setImportFormat] = useState('json'); // 'json' | 'csv'
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);

  const effectiveUser = useEffectiveUser();

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list('-created_at'),
  });

  const { data: bloques = [] } = useQuery({
    queryKey: ['bloques'],
    queryFn: () => localDataClient.entities.Bloque.list(),
  });

  const { data: piezas = [] } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => localDataClient.entities.Pieza.list(),
  });

  const { data: planes = [] } = useQuery({
    queryKey: ['planes'],
    queryFn: () => localDataClient.entities.Plan.list(),
  });

  const { data: registrosSesion = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => localDataClient.entities.RegistroSesion.list('-inicioISO'),
  });

  const { data: registrosBloques = [] } = useQuery({
    queryKey: ['registrosBloques'],
    queryFn: () => localDataClient.entities.RegistroBloque.list('-inicioISO'),
  });

  // Descargar CSV de ejemplo para Ejercicios
  const descargarEjemploEjercicios = () => {
    const headers = ['code', 'nombre', 'tipo', 'duracion_objetivo_seg'];
    const rows = [
      { code: 'CA-001', nombre: 'Calentamiento básico', tipo: 'CA', duracion_objetivo_seg: '300' },
      { code: 'TC-001', nombre: 'Escalas mayores', tipo: 'TC', duracion_objetivo_seg: '600' },
      { code: 'FM-001', nombre: 'Fragmento musical 1', tipo: 'FM', duracion_objetivo_seg: '900' },
    ];
    const csv = generateCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ejemplo-ejercicios.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('✅ CSV de ejemplo descargado');
  };

  // Descargar CSV de ejemplo para Piezas
  const descargarEjemploPiezas = () => {
    const headers = ['code', 'nombre', 'nivel', 'ejercicios'];
    const rows = [
      { code: 'PIEZA-001', nombre: 'Estudio en Do Mayor', nivel: 'intermedio', ejercicios: 'CA-001,TC-001,FM-001' },
      { code: 'PIEZA-002', nombre: 'Sonata en Sol Menor', nivel: 'avanzado', ejercicios: 'CA-001,TC-002,FM-002' },
    ];
    const csv = generateCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ejemplo-piezas.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('✅ CSV de ejemplo descargado');
  };

  // Importación con CSV para Ejercicios
  const importarEjerciciosCSV = async (data) => {
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    // Rastrear códigos generados durante esta importación para evitar duplicados
    const codigosGenerados = new Map(); // tipo -> Set de códigos generados

    // Función para generar código considerando los ya generados en este lote
    const generateCodeConRastreo = (tipo) => {
      // Obtener códigos existentes en BD y los generados en este lote
      const ejerciciosDeTipo = bloques.filter(e => e.code?.startsWith(`${tipo}-`));
      const codigosEnLote = codigosGenerados.get(tipo) || new Set();

      // Encontrar el máximo número entre BD y lote actual
      let maxNum = 0;

      // Buscar en BD
      ejerciciosDeTipo.forEach(e => {
        const match = e.code.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          if (num > maxNum) maxNum = num;
        }
      });

      // Buscar en códigos generados en este lote
      codigosEnLote.forEach(code => {
        const match = code.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          if (num > maxNum) maxNum = num;
        }
      });

      // Generar nuevo código
      const nuevoCode = `${tipo}-${String(maxNum + 1).padStart(4, '0')}`;

      // Registrar en el lote
      if (!codigosGenerados.has(tipo)) {
        codigosGenerados.set(tipo, new Set());
      }
      codigosGenerados.get(tipo).add(nuevoCode);

      return nuevoCode;
    };

    for (const row of data) {
      try {
        // Ignorar columnas 'id' si existen (no usar IDs externos)
        const { id, code, nombre, tipo, duracion_objetivo_seg, instrucciones, indicadorLogro, mediaLinks } = row;

        if (!nombre || !tipo) {
          results.errors.push(`Fila ${data.indexOf(row) + 1}: Faltan campos obligatorios (nombre, tipo)`);
          continue;
        }

        // Validar tipo
        const tiposValidos = ['CA', 'CB', 'TC', 'FM', 'VC', 'AD'];
        const tipoNormalizado = tipo.toUpperCase();
        if (!tiposValidos.includes(tipoNormalizado)) {
          results.errors.push(`${nombre || `Fila ${data.indexOf(row) + 1}`}: Tipo "${tipo}" no válido. Debe ser uno de: ${tiposValidos.join(', ')}`);
          continue;
        }

        // Generar código automáticamente si no se proporciona
        let codeFinal = code?.trim();
        if (!codeFinal) {
          codeFinal = generateCodeConRastreo(tipoNormalizado);
        } else {
          // Si se proporciona un código, también registrarlo para evitar duplicados
          if (codeFinal.startsWith(`${tipoNormalizado}-`)) {
            if (!codigosGenerados.has(tipoNormalizado)) {
              codigosGenerados.set(tipoNormalizado, new Set());
            }
            codigosGenerados.get(tipoNormalizado).add(codeFinal);
          }
        }

        // Parsear mediaLinks (separados por |)
        let mediaLinksArray = [];
        if (mediaLinks) {
          mediaLinksArray = mediaLinks.split('|')
            .map(url => url.trim())
            .filter(url => url.length > 0);
        }

        // Buscar si ya existe un ejercicio con ese code
        const existe = bloques.find(b => b.code === codeFinal);

        if (existe) {
          // Si existe, actualizar
          await localDataClient.entities.Bloque.update(existe.id, {
            nombre,
            tipo: tipoNormalizado,
            duracionSeg: parseInt(duracion_objetivo_seg || '0', 10) || 0,
            instrucciones: instrucciones || existe.instrucciones || '',
            indicadorLogro: indicadorLogro || existe.indicadorLogro || '',
            mediaLinks: mediaLinksArray.length > 0 ? mediaLinksArray : (existe.mediaLinks || []),
          });
          results.updated++;
        } else {
          // Si no existe, crear nuevo
          await localDataClient.entities.Bloque.create({
            code: codeFinal,
            nombre,
            tipo: tipoNormalizado,
            duracionSeg: parseInt(duracion_objetivo_seg || '0', 10) || 0,
            instrucciones: instrucciones || '',
            indicadorLogro: indicadorLogro || '',
            materialesRequeridos: [],
            mediaLinks: mediaLinksArray,
            elementosOrdenados: [],
            profesorId: effectiveUser.id,
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push(`${row.nombre || row.code || `Fila ${data.indexOf(row) + 1}`}: ${error.message}`);
      }
    }

    return results;
  };

  // Importación con CSV para Piezas
  const importarPiezasCSV = async (data) => {
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const row of data) {
      try {
        // Ignorar columnas 'id' si existen (no usar IDs externos)
        const { id, code, nombre, nivel, ejercicios } = row;

        if (!nombre) {
          results.errors.push(`Fila ${data.indexOf(row) + 1}: Falta campo obligatorio (nombre)`);
          continue;
        }

        // Validar nivel
        const nivelesValidos = ['principiante', 'intermedio', 'avanzado'];
        const nivelNormalizado = nivel ? nivel.toLowerCase() : 'principiante';
        if (!nivelesValidos.includes(nivelNormalizado)) {
          results.errors.push(`${nombre}: Nivel "${nivel}" no válido. Debe ser uno de: ${nivelesValidos.join(', ')}`);
          continue;
        }

        // Resolver ejercicios por code si se proporcionan
        let elementos = [];
        if (ejercicios) {
          const codesEjercicios = ejercicios.split(',').map(c => c.trim()).filter(Boolean);
          const ejerciciosEncontrados = [];
          const ejerciciosNoEncontrados = [];

          for (const codeEjercicio of codesEjercicios) {
            const ejercicio = bloques.find(b => b.code === codeEjercicio);
            if (ejercicio) {
              ejerciciosEncontrados.push(ejercicio);
              // Agregar el ejercicio como elemento de la pieza
              elementos.push({
                nombre: ejercicio.nombre,
                mediaLinks: ejercicio.mediaLinks || [],
              });
            } else {
              ejerciciosNoEncontrados.push(codeEjercicio);
            }
          }

          if (ejerciciosNoEncontrados.length > 0) {
            results.errors.push(`${nombre}: Ejercicios no encontrados: ${ejerciciosNoEncontrados.join(', ')}`);
          }
        }

        // Buscar pieza existente por code (si se proporciona) o por nombre
        let piezaExistente = null;
        if (code) {
          // Buscar por code si existe en algún campo o metadata (por ahora usar nombre como fallback)
          piezaExistente = piezas.find(p => p.nombre === code || p.nombre === nombre);
        } else {
          piezaExistente = piezas.find(p => p.nombre === nombre);
        }

        if (piezaExistente) {
          // Si existe, actualizar
          await localDataClient.entities.Pieza.update(piezaExistente.id, {
            nombre,
            nivel: nivelNormalizado,
            elementos: elementos.length > 0 ? elementos : piezaExistente.elementos,
          });
          results.updated++;
        } else {
          // Si no existe, crear nuevo
          await localDataClient.entities.Pieza.create({
            nombre,
            descripcion: '',
            nivel: nivelNormalizado,
            tiempoObjetivoSeg: 0,
            elementos: elementos,
            profesorId: effectiveUser.id,
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push(`${row.nombre || `Fila ${data.indexOf(row) + 1}`}: ${error.message}`);
      }
    }

    return results;
  };

  const importMutation = useMutation({
    mutationFn: async ({ type, data, format }) => {
      if (format === 'csv') {
        // Importación CSV
        if (type === 'ejercicios') {
          return await importarEjerciciosCSV(data);
        } else if (type === 'piezas') {
          return await importarPiezasCSV(data);
        }
      } else {
        // Importación JSON (lógica existente)
        if (type === 'piezas') {
          const results = { created: 0, updated: 0, errors: [] };
          for (const item of data) {
            try {
              // Ignorar 'id' si viene en el JSON
              const { id, ...itemData } = item;
              await localDataClient.entities.Pieza.create({
                nombre: itemData.nombre,
                descripcion: itemData.descripcion || '',
                nivel: itemData.nivel || 'principiante',
                tiempoObjetivoSeg: itemData.tiempoObjetivoSeg || 0,
                elementos: itemData.elementos || [],
                profesorId: effectiveUser.id,
              });
              results.created++;
            } catch (error) {
              results.errors.push(`${item.nombre}: ${error.message}`);
            }
          }
          return results;
        } else if (type === 'bloques' || type === 'ejercicios') {
          const results = { created: 0, updated: 0, skipped: 0, errors: [] };
          for (const item of data) {
            try {
              // Ignorar 'id' si viene en el JSON
              const { id, code, ...itemData } = item;

              const exists = bloques.some(b => b.code === code);
              if (exists) {
                results.skipped++;
                continue;
              }

              await localDataClient.entities.Bloque.create({
                nombre: itemData.nombre || item.nombre,
                code: code,
                tipo: itemData.tipo || item.tipo,
                duracionSeg: itemData.duracionSeg || item.duracionSeg || 0,
                instrucciones: itemData.instrucciones || '',
                indicadorLogro: itemData.indicadorLogro || '',
                materialesRequeridos: itemData.materialesRequeridos || [],
                media: itemData.media || {},
                elementosOrdenados: itemData.elementosOrdenados || [],
                profesorId: effectiveUser.id,
              });
              results.created++;
            } catch (error) {
              results.errors.push(`${item.code || item.nombre}: ${error.message}`);
            }
          }
          return results;
        } else if (type === 'planes') {
          const results = { created: 0, updated: 0, errors: [] };
          for (const item of data) {
            try {
              let piezaId = item.piezaId;

              if (item.piezaNombre) {
                const pieza = piezas.find(p => p.nombre === item.piezaNombre);
                if (pieza) {
                  piezaId = pieza.id;
                } else {
                  results.errors.push(`${item.nombre}: Pieza "${item.piezaNombre}" no encontrada`);
                  continue;
                }
              }

              const semanasResueltas = (item.semanas || []).map(semana => ({
                ...semana,
                sesiones: (semana.sesiones || []).map(sesion => ({
                  ...sesion,
                  bloques: (sesion.bloques || []).map(bloque => {
                    if (typeof bloque === 'string') {
                      const bloqueEncontrado = bloques.find(b => b.code === bloque);
                      if (bloqueEncontrado) {
                        return {
                          nombre: bloqueEncontrado.nombre,
                          code: bloqueEncontrado.code,
                          tipo: bloqueEncontrado.tipo,
                          duracionSeg: bloqueEncontrado.duracionSeg,
                          instrucciones: bloqueEncontrado.instrucciones,
                          indicadorLogro: bloqueEncontrado.indicadorLogro,
                          materialesRequeridos: bloqueEncontrado.materialesRequeridos || [],
                          media: bloqueEncontrado.media || {},
                          elementosOrdenados: bloqueEncontrado.elementosOrdenados || [],
                        };
                      }
                      return null;
                    }
                    return bloque;
                  }).filter(Boolean)
                }))
              }));

              await localDataClient.entities.Plan.create({
                nombre: item.nombre,
                focoGeneral: item.focoGeneral || 'GEN',
                objetivoSemanalPorDefecto: item.objetivoSemanalPorDefecto || '',
                piezaId: piezaId,
                semanas: semanasResueltas,
                profesorId: effectiveUser.id,
              });
              results.created++;
            } catch (error) {
              results.errors.push(`${item.nombre}: ${error.message}`);
            }
          }
          return results;
        }
      }
    },
    onSuccess: (results) => {
      setImportResults(results);
      queryClient.invalidateQueries({ queryKey: ['piezas'] });
      queryClient.invalidateQueries({ queryKey: ['bloques'] });
      queryClient.invalidateQueries({ queryKey: ['planes'] });

      const total = (results.created || 0) + (results.updated || 0);
      if (total > 0) {
        toast.success(`✅ Importación completada: ${results.created || 0} creados${results.updated ? `, ${results.updated} actualizados` : ''}`);
      }
    },
    onError: (error) => {
      toast.error(`❌ Error al importar: ${error.message}`);
    },
  });

  const handleImport = async () => {
    if (!importFile) {
      toast.error('❌ Selecciona un archivo');
      return;
    }

    try {
      const text = await importFile.text();
      let data;

      if (importFormat === 'csv') {
        data = parseCSV(text);
        if (data.length === 0) {
          toast.error('❌ El archivo CSV está vacío o no tiene formato válido');
          return;
        }
      } else {
        data = JSON.parse(text);
        if (!Array.isArray(data)) {
          toast.error('❌ El archivo debe contener un array de objetos');
          return;
        }
      }

      // Determinar el tipo real (ejercicios vs bloques)
      const realType = importType === 'ejercicios' ? 'ejercicios' : importType;

      importMutation.mutate({ type: realType, data, format: importFormat });
    } catch (error) {
      toast.error(`❌ Error al leer el archivo: ${error.message}`);
    }
  };

  // Handlers para drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const extension = file.name.split('.').pop().toLowerCase();
      if (extension === 'csv') {
        setImportFormat('csv');
        setImportFile(file);
      } else if (extension === 'json') {
        setImportFormat('json');
        setImportFile(file);
      } else {
        toast.error('❌ Solo se aceptan archivos CSV o JSON');
      }
    }
  };

  // Funciones de exportación (sin cambios)
  const exportarJSON = (type) => {
    let data, filename;

    if (type === 'piezas') {
      data = piezas.map(p => ({
        nombre: p.nombre,
        descripcion: p.descripcion,
        nivel: p.nivel,
        tiempoObjetivoSeg: p.tiempoObjetivoSeg,
        elementos: p.elementos,
      }));
      filename = `piezas-${formatLocalDate(new Date())}.json`;
    } else if (type === 'bloques' || type === 'ejercicios') {
      data = bloques.map(b => ({
        nombre: b.nombre,
        code: b.code,
        tipo: b.tipo,
        duracionSeg: b.duracionSeg,
        instrucciones: b.instrucciones,
        indicadorLogro: b.indicadorLogro,
        materialesRequeridos: b.materialesRequeridos,
        media: b.media,
        elementosOrdenados: b.elementosOrdenados,
      }));
      filename = `ejercicios-${formatLocalDate(new Date())}.json`;
    } else if (type === 'planes') {
      data = planes.map(p => {
        const pieza = piezas.find(pz => pz.id === p.piezaId);
        return {
          nombre: p.nombre,
          focoGeneral: p.focoGeneral,
          objetivoSemanalPorDefecto: p.objetivoSemanalPorDefecto,
          piezaNombre: pieza?.nombre || null,
          piezaId: p.piezaId,
          semanas: p.semanas,
        };
      });
      filename = `planes-${formatLocalDate(new Date())}.json`;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    toast.success(`✅ ${filename} exportado`);
  };

  const exportarUsuarios = () => {
    const headers = ["ID", "Nombre Completo", "Email", "Rol", "Profesor Asignado", "Nivel", "Teléfono", "Fecha Registro"];
    const rows = usuarios.map(u => {
      const profesor = usuarios.find(p => p.id === u.profesorAsignadoId);
      const roleLabels = { ADMIN: 'Administrador', PROF: 'Profesor', ESTU: 'Estudiante' };
      return [
        u.id,
        displayName(u),
        u.email || '',
        roleLabels[u.rolPersonalizado] || 'Estudiante',
        profesor ? displayName(profesor) : '',
        u.nivel || '',
        u.telefono || '',
        u.created_date ? new Date(u.created_date).toLocaleDateString('es-ES') : '',
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell)}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios-${formatLocalDate(new Date())}.csv`;
    link.click();
    toast.success("✅ Usuarios exportados");
  };

  const exportarAsignaciones = () => {
    const headers = ["ID", "Alumno", "Email", "Pieza", "Plan", "Fecha Inicio", "Estado", "Profesor", "Semanas"];
    const rows = asignaciones.map(a => {
      const alumno = usuarios.find(u => u.id === a.alumnoId);
      const profesor = usuarios.find(u => u.id === a.profesorId);
      return [
        a.id,
        displayName(alumno),
        alumno?.email || '',
        a.piezaSnapshot?.nombre || '',
        a.plan?.nombre || '',
        a.semanaInicioISO || '',
        a.estado || '',
        displayName(profesor),
        a.plan?.semanas?.length || 0,
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell)}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asignaciones-${formatLocalDate(new Date())}.csv`;
    link.click();
    toast.success("✅ Asignaciones exportadas");
  };

  const exportarEjercicios = () => {
    const headers = ["code", "nombre", "tipo", "duracion_objetivo_seg"];
    const rows = bloques.map(b => ({
      code: b.code || '',
      nombre: b.nombre || '',
      tipo: b.tipo || '',
      duracion_objetivo_seg: b.duracionSeg || 0,
    }));
    const csv = generateCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ejercicios-${formatLocalDate(new Date())}.csv`;
    link.click();
    toast.success("✅ Ejercicios exportados");
  };

  const exportarAgenda = () => {
    const hoy = new Date();
    const lunes = startOfMonday(hoy);
    const semanaActual = formatLocalDate(lunes);

    const estudiantesBase = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
    const headers = ["Alumno", "Email", "Pieza", "Plan", "Semana", "Sesiones", "Tiempo(min)"];
    const rows = estudiantesBase.map(est => {
      const asignacionesEstudiante = asignaciones.filter(a =>
        a.alumnoId === est.id &&
        (a.estado === 'publicada' || a.estado === 'en_curso')
      );
      const asignacion = asignacionesEstudiante.find(a => {
        const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActual);
        return offset >= 0 && offset < (a.plan?.semanas?.length || 0);
      });
      const semanaDelPlan = asignacion ?
        asignacion.plan?.semanas?.[calcularOffsetSemanas(asignacion.semanaInicioISO, semanaActual)] :
        null;
      const tiempoTotal = semanaDelPlan?.sesiones?.reduce((sum, s) => sum + calcularTiempoSesion(s), 0) || 0;

      return [
        displayName(est),
        est.email || '',
        asignacion?.piezaSnapshot?.nombre || 'Sin asignación',
        asignacion?.plan?.nombre || '',
        semanaDelPlan?.nombre || '',
        semanaDelPlan?.sesiones?.length || 0,
        Math.floor(tiempoTotal / 60)
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell)}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agenda-${semanaActual}.csv`;
    link.click();
    toast.success("✅ Agenda exportada");
  };

  const exportarEstadisticas = () => {
    const headers = [
      "Fecha", "Alumno", "Profesor", "Pieza", "Plan", "Semana", "Sesión",
      "Real(s)", "Objetivo(s)", "Completados", "Omitidos", "Calificación", "Notas"
    ];

    const rows = registrosSesion.map(r => {
      const alumno = usuarios.find(u => u.id === r.alumnoId);
      const profesor = usuarios.find(u => u.id === r.profesorAsignadoId);
      const fecha = r.inicioISO ? new Date(r.inicioISO).toLocaleDateString('es-ES') : '';

      return [
        fecha,
        displayName(alumno),
        displayName(profesor),
        r.piezaNombre || '',
        r.planNombre || '',
        r.semanaNombre || (r.semanaIdx !== undefined ? `Semana ${r.semanaIdx + 1}` : ''),
        r.sesionNombre || (r.sesionIdx !== undefined ? `Sesión ${r.sesionIdx + 1}` : ''),
        r.duracionRealSeg || 0,
        r.duracionObjetivoSeg || 0,
        r.bloquesCompletados || 0,
        r.bloquesOmitidos || 0,
        r.calificacion !== undefined && r.calificacion !== null ? r.calificacion : '',
        (r.notas || '').replace(/"/g, '""').replace(/\n/g, ' ')
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell)}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registros-sesion-${formatLocalDate(new Date())}.csv`;
    link.click();
    toast.success("✅ Registros exportados");
  };

  const exportarBloquesDetallado = () => {
    const headers = ["Fecha", "Alumno", "Profesor", "Tipo", "Código", "Nombre", "Real(s)", "Objetivo(s)", "Estado"];

    const rows = registrosBloques.map(b => {
      const registro = registrosSesion.find(r => r.id === b.registroSesionId);
      const alumno = usuarios.find(u => u.id === b.alumnoId);
      const profesor = usuarios.find(u => u.id === registro?.profesorAsignadoId);
      const fecha = b.inicioISO ? new Date(b.inicioISO).toLocaleDateString('es-ES') : '';

      return [
        fecha,
        displayName(alumno),
        displayName(profesor),
        b.tipo || '',
        b.code || '',
        b.nombre || '',
        b.duracionRealSeg || 0,
        b.duracionObjetivoSeg || 0,
        b.estado || '',
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell)}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registros-bloques-${formatLocalDate(new Date())}.csv`;
    link.click();
    toast.success("✅ Registros de bloques exportados");
  };

  if (effectiveUser?.rolPersonalizado !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[var(--color-surface-muted)] flex items-center justify-center p-6">
        <Card className="max-w-md rounded-2xl border-[var(--color-border-default)] shadow-sm">
          <CardContent className="pt-6 text-center text-[var(--color-text-primary)]">
            <Shield className="w-16 h-16 mx-auto mb-4 text-[var(--color-danger)]" />
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2 font-headings">Acceso Restringido</h2>
            <p className="text-[var(--color-text-secondary)]">Solo los administradores pueden acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && (
        <PageHeader
          icon={FileDown}
          title="Importar y Exportar"
          subtitle="Gestiona backups de tus piezas, ejercicios y planes"
        />
      )}

      <div className={embedded ? "" : "studia-section"}>
        <Card className="app-card">
          <CardContent className="pt-6 text-[var(--color-text-primary)]">
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex justify-center">
                <Tabs
                  value={activeTab}
                  onChange={setActiveTab}
                  variant="segmented"
                  items={[
                    { value: 'importar', label: 'Importar', icon: Upload }, // ⭐ Primero Importar
                    { value: 'exportar', label: 'Exportar', icon: FileDown },
                  ]}
                />
              </div>

              {/* TAB: IMPORTAR */}
              {activeTab === 'importar' && (
                <div className="space-y-6">
                  {/* Sección: Ejercicios */}
                  <Card className="app-card border-2 border-[var(--color-border-default)]">
                    <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                      <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-[var(--color-primary)]" />
                        <CardTitle className="text-base font-semibold">Ejercicios</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Importa ejercicios desde un archivo CSV. El campo <code className="px-1.5 py-0.5 bg-[var(--color-surface-muted)] rounded text-xs font-mono">code</code> actúa como identificador lógico para actualizar ejercicios existentes.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={descargarEjemploEjercicios}
                          className={`${componentStyles.buttons.outline} text-xs h-9 px-3`}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Descargar CSV de ejemplo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImportType('ejercicios');
                            setImportFormat('csv');
                            setShowImportModal(true);
                            setImportResults(null);
                            setImportFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className={`${componentStyles.buttons.outline} text-xs h-9 px-3 flex-1 sm:flex-initial`}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir CSV
                        </Button>
                      </div>

                      <Alert className="rounded-xl border-[var(--color-info)] bg-[var(--color-info)]/10">
                        <AlertTriangle className="h-4 w-4 text-[var(--color-info)]" />
                        <AlertDescription className="text-xs">
                          <strong>Formato CSV:</strong> <code className="font-mono">code;nombre;tipo;duracion_objetivo_seg</code>
                          <br />
                          <strong>Importante:</strong> No hace falta incluir IDs en el CSV. El campo <code className="font-mono">code</code> se usa para identificar y actualizar ejercicios existentes. Si un ejercicio con el mismo <code className="font-mono">code</code> ya existe, se actualizará; si no, se creará uno nuevo.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  {/* Sección: Piezas */}
                  <Card className="app-card border-2 border-[var(--color-border-default)]">
                    <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                      <div className="flex items-center gap-3">
                        <Music className="w-5 h-5 text-[var(--color-primary)]" />
                        <CardTitle className="text-base font-semibold">Piezas</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        Importa piezas desde un archivo CSV. El campo <code className="px-1.5 py-0.5 bg-[var(--color-surface-muted)] rounded text-xs font-mono">code</code> permite identificar piezas existentes, y <code className="px-1.5 py-0.5 bg-[var(--color-surface-muted)] rounded text-xs font-mono">ejercicios</code> es una lista de codes de ejercicios separados por comas.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={descargarEjemploPiezas}
                          className={`${componentStyles.buttons.outline} text-xs h-9 px-3`}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Descargar CSV de ejemplo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImportType('piezas');
                            setImportFormat('csv');
                            setShowImportModal(true);
                            setImportResults(null);
                            setImportFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className={`${componentStyles.buttons.outline} text-xs h-9 px-3 flex-1 sm:flex-initial`}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Subir CSV
                        </Button>
                      </div>

                      <Alert className="rounded-xl border-[var(--color-info)] bg-[var(--color-info)]/10">
                        <AlertTriangle className="h-4 w-4 text-[var(--color-info)]" />
                        <AlertDescription className="text-xs">
                          <strong>Formato CSV:</strong> <code className="font-mono">code;nombre;nivel;ejercicios</code>
                          <br />
                          <strong>Ejemplo de ejercicios:</strong> <code className="font-mono">CA-001,TC-001,FM-001</code>
                          <br />
                          <strong>Importante:</strong> No hace falta incluir IDs en el CSV. El campo <code className="font-mono">code</code> se usa para identificar piezas existentes. Los ejercicios se resuelven por su <code className="font-mono">code</code>. Si algún ejercicio no existe, se mostrará un error.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  {/* Sección: Importar JSON (legacy) */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Importación avanzada (JSON)
                    </h3>
                    <div className={componentStyles.layout.grid3}>
                      <Card className={`${componentStyles.containers.cardBase} hover:shadow-md transition-shadow`}>
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                          <div className="flex items-center gap-3">
                            <Music className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className={componentStyles.typography.cardTitle}>Piezas</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-ui">
                          <p className={componentStyles.typography.bodyText + " text-xs"}>
                            Importa piezas desde archivo JSON.
                          </p>
                          <Button
                            onClick={() => {
                              setImportType('piezas');
                              setImportFormat('json');
                              setShowImportModal(true);
                              setImportResults(null);
                              setImportFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            variant="outline"
                            className={`w-full h-9 ${componentStyles.buttons.outline} border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)]`}
                            size="sm"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar JSON
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className={`${componentStyles.containers.cardBase} hover:shadow-md transition-shadow`}>
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className={componentStyles.typography.cardTitle}>Ejercicios</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-ui">
                          <p className={componentStyles.typography.bodyText + " text-xs"}>
                            Importa ejercicios desde archivo JSON.
                          </p>
                          <Button
                            onClick={() => {
                              setImportType('bloques');
                              setImportFormat('json');
                              setShowImportModal(true);
                              setImportResults(null);
                              setImportFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            variant="outline"
                            className={`w-full h-9 ${componentStyles.buttons.outline} border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)]`}
                            size="sm"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar JSON
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className={`${componentStyles.containers.cardBase} hover:shadow-md transition-shadow`}>
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className={componentStyles.typography.cardTitle}>Planes</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-ui">
                          <p className={componentStyles.typography.bodyText + " text-xs"}>
                            Importa planes con resolución automática de IDs.
                          </p>
                          <Button
                            onClick={() => {
                              setImportType('planes');
                              setImportFormat('json');
                              setShowImportModal(true);
                              setImportResults(null);
                              setImportFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            variant="outline"
                            className={`w-full h-9 ${componentStyles.buttons.outline} border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-text-inverse)]`}
                            size="sm"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar JSON
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: EXPORTAR */}
              {activeTab === 'exportar' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 font-headings">
                      <Music className="w-5 h-5 text-[var(--color-primary)]" />
                      Biblioteca (JSON)
                    </h2>
                    <div className={componentStyles.layout.grid3}>
                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                          <div className="flex items-center gap-3">
                            <Music className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className="text-base">Piezas</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-[var(--color-text-primary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Exporta piezas musicales con elementos multimedia.
                          </p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{piezas.length}</Badge>
                          </div>
                          <Button
                            onClick={() => exportarJSON('piezas')}
                            className={`w-full h-9 ${componentStyles.buttons.primary}`}
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar JSON
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className="text-base">Ejercicios</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-[var(--color-text-primary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Exporta bloques y ejercicios del catálogo.
                          </p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{bloques.length}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => exportarJSON('ejercicios')}
                              className={`flex-1 h-9 ${componentStyles.buttons.primary}`}
                              size="sm"
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              JSON
                            </Button>
                            <Button
                              onClick={exportarEjercicios}
                              className={`flex-1 h-9 ${componentStyles.buttons.outline}`}
                              size="sm"
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              CSV
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className="text-base">Planes</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-[var(--color-text-primary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Exporta planes con semanas, sesiones y ejercicios.
                          </p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{planes.length}</Badge>
                          </div>
                          <Button
                            onClick={() => exportarJSON('planes')}
                            className={`w-full h-9 ${componentStyles.buttons.primary}`}
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar JSON
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 font-headings">
                      <FileDown className="w-5 h-5 text-[var(--color-primary)]" />
                      Datos y Estadísticas (CSV)
                    </h2>
                    <div className={componentStyles.layout.grid3}>
                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className="text-base">Usuarios</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-[var(--color-text-primary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Lista completa con roles y perfiles.
                          </p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{usuarios.length}</Badge>
                          </div>
                          <Button
                            onClick={exportarUsuarios}
                            className={`w-full h-9 ${componentStyles.buttons.primary}`}
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                          <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className="text-base">Asignaciones</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-[var(--color-text-primary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Asignaciones con piezas y planes.
                          </p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{asignaciones.length}</Badge>
                          </div>
                          <Button
                            onClick={exportarAsignaciones}
                            className={`w-full h-9 ${componentStyles.buttons.primary}`}
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className="text-base">Agenda</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-[var(--color-text-primary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Agenda de la semana actual por estudiante.
                          </p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">
                              {usuarios.filter(u => u.rolPersonalizado === 'ESTU').length}
                            </Badge>
                          </div>
                          <Button
                            onClick={exportarAgenda}
                            className={`w-full h-9 ${componentStyles.buttons.primary}`}
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                          <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className="text-base">Sesiones</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-[var(--color-text-primary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Detalle de ejercicios ejecutados.
                          </p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{registrosSesion.length}</Badge>
                          </div>
                          <Button
                            onClick={exportarEstadisticas}
                            className={`w-full h-9 ${componentStyles.buttons.primary}`}
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-[var(--color-primary)]" />
                            <CardTitle className="text-base">Bloques</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-[var(--color-text-primary)]">
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Detalle de ejercicios ejecutados.
                          </p>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{registrosBloques.length}</Badge>
                          </div>
                          <Button
                            onClick={exportarBloquesDetallado}
                            className={`w-full h-9 ${componentStyles.buttons.primary}`}
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de importación */}
      {showImportModal && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowImportModal(false)} />
          <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none p-4">
            <Card className="w-full max-w-2xl pointer-events-auto rounded-2xl shadow-card max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b border-[var(--color-border-default)] bg-card sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6 text-[var(--color-primary)]" />
                    <CardTitle className="text-[var(--color-primary)]">
                      Importar {importType === 'piezas' ? 'Piezas' : importType === 'ejercicios' || importType === 'bloques' ? 'Ejercicios' : 'Planes'} ({importFormat.toUpperCase()})
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowImportModal(false)} className="text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-xl touch-manipulation" aria-label="Cerrar modal">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-[var(--color-text-primary)]">
                {!importResults ? (
                  <>
                    <Alert className={`rounded-xl ${componentStyles.containers.panelBase} border-[var(--color-info)] bg-[var(--color-info)]/10`}>
                      <AlertTriangle className="h-4 w-4 text-[var(--color-info)]" />
                      <AlertDescription className={`${componentStyles.typography.bodyText} text-xs`}>
                        {importFormat === 'csv' && importType === 'ejercicios' && 'Formato CSV: code;nombre;tipo;duracion_objetivo_seg'}
                        {importFormat === 'csv' && importType === 'piezas' && 'Formato CSV: code;nombre;nivel;ejercicios (separados por comas)'}
                        {importFormat === 'json' && importType === 'piezas' && 'Array de objetos con: nombre, nivel, elementos, etc.'}
                        {importFormat === 'json' && (importType === 'bloques' || importType === 'ejercicios') && 'Array de ejercicios con: code (único), nombre, tipo, duracionSeg, etc.'}
                        {importFormat === 'json' && importType === 'planes' && 'Array de planes con: nombre, piezaNombre o piezaId, semanas (con sesiones y bloques por código).'}
                      </AlertDescription>
                    </Alert>

                    {/* Dropzone */}
                    <div
                      ref={dropzoneRef}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                        importFile ? "border-[var(--color-success)] bg-[var(--color-success)]/10" : "border-[var(--color-border-default)] bg-[var(--color-surface-muted)]/50 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                      )}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)]" />
                      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                        {importFile ? importFile.name : 'Arrastra un archivo aquí o haz clic para seleccionar'}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                        Formato: {importFormat.toUpperCase()} (máx. 10MB)
                      </p>
                      <Input
                        ref={fileInputRef}
                        id="importFile"
                        type="file"
                        accept={importFormat === 'csv' ? '.csv' : '.json'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const extension = file.name.split('.').pop().toLowerCase();
                            if (extension === 'csv') {
                              setImportFormat('csv');
                            } else if (extension === 'json') {
                              setImportFormat('json');
                            }
                            setImportFile(file);
                          }
                        }}
                        className={`hidden`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs h-9"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Seleccionar archivo
                      </Button>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowImportModal(false)} className={`flex-1 ${componentStyles.buttons.outline}`}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleImport}
                        loading={importMutation.isPending}
                        loadingText="Importando..."
                        disabled={!importFile}
                        className={`flex-1 ${componentStyles.buttons.primary}`}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Importar
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Alert className={`rounded-xl ${componentStyles.containers.panelBase} ${importResults.errors.length > 0 ? 'border-[var(--color-warning)] bg-[var(--color-warning)]/10' : 'border-[var(--color-success)] bg-[var(--color-success)]/10'}`}>
                      {importResults.errors.length > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                      )}
                      <AlertDescription className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {importResults.created > 0 && (
                            <Badge className={componentStyles.status.badgeSuccess}>
                              ✅ {importResults.created} creados
                            </Badge>
                          )}
                          {importResults.updated > 0 && (
                            <Badge className={componentStyles.status.badgeInfo}>
                              🔄 {importResults.updated} actualizados
                            </Badge>
                          )}
                          {importResults.skipped > 0 && (
                            <Badge className={componentStyles.status.badgeInfo}>
                              ⏭️ {importResults.skipped} omitidos
                            </Badge>
                          )}
                          {importResults.errors.length > 0 && (
                            <Badge className={componentStyles.status.badgeDanger}>
                              ❌ {importResults.errors.length} errores
                            </Badge>
                          )}
                        </div>

                        {importResults.errors.length > 0 && (
                          <div className="mt-3 max-h-48 overflow-y-auto border border-[var(--color-border-default)] rounded-xl p-2 bg-[var(--color-surface-elevated)] text-xs space-y-1">
                            {importResults.errors.map((err, idx) => (
                              <div key={idx} className={`${componentStyles.typography.smallMetaText} text-[var(--color-danger)]`}>• {err}</div>
                            ))}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>

                    <Button onClick={() => { setShowImportModal(false); setImportFile(null); setImportResults(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className={`w-full ${componentStyles.buttons.primary}`}>
                      Cerrar
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}


import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ds";
import { FileDown, Users, Target, Layers, Calendar, Activity, Shield, Upload, Music, BookOpen, AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { displayName, calcularOffsetSemanas, calcularTiempoSesion } from "../components/utils/helpers";
import { Alert, AlertDescription } from "@/components/ds";
import { createPortal } from "react-dom";
import PageHeader from "@/components/ds/PageHeader";
import Tabs from "@/components/ds/Tabs";

const pad2 = (n) => String(n).padStart(2, "0");
const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const parseLocalDate = (s) => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const startOfMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

export default function ImportExportPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('exportar');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.Asignacion.list('-created_date'),
  });

  const { data: bloques = [] } = useQuery({
    queryKey: ['bloques'],
    queryFn: () => base44.entities.Bloque.list(),
  });

  const { data: piezas = [] } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => base44.entities.Pieza.list(),
  });

  const { data: planes = [] } = useQuery({
    queryKey: ['planes'],
    queryFn: () => base44.entities.Plan.list(),
  });

  const { data: registrosSesion = [] } = useQuery({
    queryKey: ['registrosSesion'],
    queryFn: () => base44.entities.RegistroSesion.list('-inicioISO'),
  });

  const { data: registrosBloques = [] } = useQuery({
    queryKey: ['registrosBloques'],
    queryFn: () => base44.entities.RegistroBloque.list('-inicioISO'),
  });

  const importMutation = useMutation({
    mutationFn: async ({ type, data }) => {
      if (type === 'piezas') {
        const results = { created: 0, errors: [] };
        for (const item of data) {
          try {
            await base44.entities.Pieza.create({
              nombre: item.nombre,
              descripcion: item.descripcion || '',
              nivel: item.nivel || 'principiante',
              tiempoObjetivoSeg: item.tiempoObjetivoSeg || 0,
              elementos: item.elementos || [],
              profesorId: currentUser.id,
            });
            results.created++;
          } catch (error) {
            results.errors.push(`${item.nombre}: ${error.message}`);
          }
        }
        return results;
      } else if (type === 'bloques') {
        const results = { created: 0, skipped: 0, errors: [] };
        for (const item of data) {
          try {
            const exists = bloques.some(b => b.code === item.code);
            if (exists) {
              results.skipped++;
              continue;
            }
            await base44.entities.Bloque.create({
              nombre: item.nombre,
              code: item.code,
              tipo: item.tipo,
              duracionSeg: item.duracionSeg || 0,
              instrucciones: item.instrucciones || '',
              indicadorLogro: item.indicadorLogro || '',
              materialesRequeridos: item.materialesRequeridos || [],
              media: item.media || {},
              elementosOrdenados: item.elementosOrdenados || [],
              profesorId: currentUser.id,
            });
            results.created++;
          } catch (error) {
            results.errors.push(`${item.code}: ${error.message}`);
          }
        }
        return results;
      } else if (type === 'planes') {
        const results = { created: 0, errors: [] };
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

            await base44.entities.Plan.create({
              nombre: item.nombre,
              focoGeneral: item.focoGeneral || 'GEN',
              objetivoSemanalPorDefecto: item.objetivoSemanalPorDefecto || '',
              piezaId: piezaId,
              semanas: semanasResueltas,
              profesorId: currentUser.id,
            });
            results.created++;
          } catch (error) {
            results.errors.push(`${item.nombre}: ${error.message}`);
          }
        }
        return results;
      }
    },
    onSuccess: (results) => {
      setImportResults(results);
      queryClient.invalidateQueries({ queryKey: ['piezas'] });
      queryClient.invalidateQueries({ queryKey: ['bloques'] });
      queryClient.invalidateQueries({ queryKey: ['planes'] });
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
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        toast.error('❌ El archivo debe contener un array de objetos');
        return;
      }

      importMutation.mutate({ type: importType, data });
    } catch (error) {
      toast.error(`❌ Error al leer el archivo: ${error.message}`);
    }
  };

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
    } else if (type === 'bloques') {
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
    const headers = ["Código", "Nombre", "Tipo", "Duración(s)", "Profesor", "Indicador", "Materiales"];
    const rows = bloques.map(b => {
      const profesor = usuarios.find(u => u.id === b.profesorId);
      return [
        b.code || '',
        b.nombre || '',
        b.tipo || '',
        b.duracionSeg || 0,
        displayName(profesor),
        b.indicadorLogro || '',
        (b.materialesRequeridos || []).join('; '),
      ];
    });
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell)}"`).join(',')).join('\n');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
          <p className="text-muted">Cargando...</p>
        </div>
      </div>
    );
  }

  if (currentUser?.rolPersonalizado !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md rounded-2xl border-red-200 shadow-sm">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-ui mb-2">Acceso Restringido</h2>
            <p className="text-muted">Solo los administradores pueden acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        icon={FileDown}
        title="Importar y Exportar"
        subtitle="Gestiona datos del sistema"
      />

      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
        <Card className="app-card">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Tabs con SegmentedTabs */}
              <div className="flex justify-center">
                <Tabs
                  value={activeTab}
                  onChange={setActiveTab}
                  variant="segmented"
                  items={[
                    { value: 'exportar', label: 'Exportar', icon: FileDown },
                    { value: 'importar', label: 'Importar', icon: Upload },
                  ]}
                />
              </div>

              {/* TAB: EXPORTAR */}
              {activeTab === 'exportar' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-ui mb-4 flex items-center gap-2">
                      <Music className="w-5 h-5 text-brand-500" />
                      Plantillas (JSON)
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Music className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Piezas</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Exporta piezas musicales con elementos multimedia.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{piezas.length}</Badge>
                          </div>
                          <Button 
                            onClick={() => exportarJSON('piezas')} 
                            className="w-full h-9 rounded-xl btn-primary"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar JSON
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Ejercicios</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Exporta bloques y ejercicios del catálogo.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{bloques.length}</Badge>
                          </div>
                          <Button 
                            onClick={() => exportarJSON('bloques')} 
                            className="w-full h-9 rounded-xl btn-primary"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar JSON
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Planes</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Exporta planes con semanas, sesiones y ejercicios.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Total:</span>
                            <Badge variant="outline" className="rounded-full">{planes.length}</Badge>
                          </div>
                          <Button 
                            onClick={() => exportarJSON('planes')} 
                            className="w-full h-9 rounded-xl btn-primary"
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
                    <h2 className="text-lg font-bold text-ui mb-4 flex items-center gap-2">
                      <FileDown className="w-5 h-5 text-brand-500" />
                      Datos y Estadísticas (CSV)
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Usuarios</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Lista completa con roles y perfiles.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Registros:</span>
                            <Badge variant="outline" className="rounded-full">{usuarios.length}</Badge>
                          </div>
                          <Button 
                            onClick={exportarUsuarios} 
                            className="w-full h-9 rounded-xl btn-primary"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Target className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Asignaciones</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Asignaciones con piezas y planes.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Registros:</span>
                            <Badge variant="outline" className="rounded-full">{asignaciones.length}</Badge>
                          </div>
                          <Button 
                            onClick={exportarAsignaciones} 
                            className="w-full h-9 rounded-xl btn-primary"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Agenda</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Agenda de la semana actual por estudiante.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Semana:</span>
                            <Badge variant="outline" className="rounded-full">Actual</Badge>
                          </div>
                          <Button 
                            onClick={exportarAgenda} 
                            className="w-full h-9 rounded-xl btn-primary"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Sesiones</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Historial de sesiones completadas.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Registros:</span>
                            <Badge variant="outline" className="rounded-full">{registrosSesion.length}</Badge>
                          </div>
                          <Button 
                            onClick={exportarEstadisticas} 
                            className="w-full h-9 rounded-xl btn-primary"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Bloques</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Detalle de ejercicios ejecutados.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Registros:</span>
                            <Badge variant="outline" className="rounded-full">{registrosBloques.length}</Badge>
                          </div>
                          <Button 
                            onClick={exportarBloquesDetallado} 
                            className="w-full h-9 rounded-xl btn-primary"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Ejercicios (CSV)</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Catálogo de ejercicios en formato tabular.
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span>Registros:</span>
                            <Badge variant="outline" className="rounded-full">{bloques.length}</Badge>
                          </div>
                          <Button 
                            onClick={exportarEjercicios} 
                            className="w-full h-9 rounded-xl btn-primary"
                            size="sm"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Alert className="rounded-2xl border-blue-200 bg-blue-50">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-slate-700 space-y-1">
                      <p className="font-semibold text-ui">Información sobre exportación</p>
                      <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                        <li><strong>JSON:</strong> Formato completo ideal para respaldo y migración de plantillas</li>
                        <li><strong>CSV:</strong> Compatible con Excel/Google Sheets para análisis</li>
                        <li><strong>Nombres:</strong> Se usa nombre completo (no username) en todas las exportaciones</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* TAB: IMPORTAR */}
              {activeTab === 'importar' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-ui mb-4 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-brand-500" />
                      Plantillas (JSON)
                    </h2>
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Music className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Piezas</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Importa piezas desde archivo JSON.
                          </p>
                          <Button 
                            onClick={() => { setImportType('piezas'); setShowImportModal(true); setImportResults(null); }}
                            variant="outline"
                            className="w-full h-9 rounded-xl border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white"
                            size="sm"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar JSON
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Ejercicios</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Importa ejercicios desde archivo JSON.
                          </p>
                          <Button 
                            onClick={() => { setImportType('bloques'); setShowImportModal(true); setImportResults(null); }}
                            variant="outline"
                            className="w-full h-9 rounded-xl border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white"
                            size="sm"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar JSON
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="app-card hover:shadow-md transition-shadow">
                        <CardHeader className="border-b border-ui bg-slate-50">
                          <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-brand-500" />
                            <CardTitle className="text-base">Planes</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <p className="text-sm text-muted">
                            Importa planes con resolución automática de IDs.
                          </p>
                          <Button 
                            onClick={() => { setImportType('planes'); setShowImportModal(true); setImportResults(null); }}
                            variant="outline"
                            className="w-full h-9 rounded-xl border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white"
                            size="sm"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar JSON
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Alert className="rounded-2xl border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    <AlertDescription className="text-sm text-slate-700 space-y-1">
                      <p className="font-semibold text-ui">Importante sobre importación</p>
                      <ul className="list-disc list-inside space-y-1 text-xs mt-2">
                        <li><strong>Ejercicios:</strong> Códigos duplicados se omiten automáticamente</li>
                        <li><strong>Planes:</strong> Resuelve piezas por nombre (campo "piezaNombre") y ejercicios por código</li>
                        <li><strong>No soportado:</strong> Importación de usuarios (usa invitaciones)</li>
                        <li><strong>Propiedad:</strong> Todo se asigna al profesor/admin que importa</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {showImportModal && createPortal(
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowImportModal(false)} />
          <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none p-4">
            <Card className="w-full max-w-2xl pointer-events-auto rounded-2xl shadow-card">
              <CardHeader className="border-b border-ui bg-brand-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="w-6 h-6" />
                    <CardTitle className="text-white">
                      Importar {importType === 'piezas' ? 'Piezas' : importType === 'bloques' ? 'Ejercicios' : 'Planes'}
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowImportModal(false)} className="text-white hover:bg-white/20 h-9 w-9 rounded-xl" aria-label="Cerrar modal">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {!importResults ? (
                  <>
                    <Alert className="rounded-xl border-blue-200 bg-blue-50">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-900">
                        {importType === 'piezas' && 'Array de objetos con: nombre, nivel, elementos, etc.'}
                        {importType === 'bloques' && 'Array de ejercicios con: code (único), nombre, tipo, duracionSeg, etc.'}
                        {importType === 'planes' && 'Array de planes con: nombre, piezaNombre o piezaId, semanas (con sesiones y bloques por código).'}
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label htmlFor="importFile">Archivo JSON</Label>
                      <Input
                        id="importFile"
                        type="file"
                        accept=".json"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        className="mt-2 h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowImportModal(false)} className="flex-1 h-10 rounded-xl">
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleImport} 
                        disabled={!importFile || importMutation.isPending}
                        className="flex-1 h-10 rounded-xl btn-primary"
                      >
                        {importMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Importar
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Alert className={`rounded-xl ${importResults.errors.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                      {importResults.errors.length > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-amber-700" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      <AlertDescription className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {importResults.created > 0 && (
                            <Badge className="rounded-full bg-green-600 text-white">
                              ✅ {importResults.created} creados
                            </Badge>
                          )}
                          {importResults.skipped > 0 && (
                            <Badge className="rounded-full bg-blue-600 text-white">
                              ⏭️ {importResults.skipped} omitidos
                            </Badge>
                          )}
                          {importResults.errors.length > 0 && (
                            <Badge className="rounded-full bg-red-600 text-white">
                              ❌ {importResults.errors.length} errores
                            </Badge>
                          )}
                        </div>
                        
                        {importResults.errors.length > 0 && (
                          <div className="mt-3 max-h-48 overflow-y-auto border border-ui rounded-xl p-2 bg-white text-xs space-y-1">
                            {importResults.errors.map((err, idx) => (
                              <div key={idx} className="text-red-700">• {err}</div>
                            ))}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>

                    <Button onClick={() => { setShowImportModal(false); setImportFile(null); setImportResults(null); }} className="w-full h-10 rounded-xl btn-primary">
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

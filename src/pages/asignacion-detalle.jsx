
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
// Updated Card, Badge, Alert paths from @/components/ui to @/components/ds
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ds";
import { Alert, AlertDescription } from "@/components/ds";
import {
  ArrowLeft, Target, User, Music, BookOpen, Calendar,
  Settings, ChevronDown, ChevronRight, Clock,
  Edit, XCircle, Shield, Save, X, // Existing icons
  Eye, CheckCircle2, Layers, PlayCircle, MessageSquare // New icons from outline
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
// Preserving all helper functions and components used in the original file
import { getNombreVisible, formatLocalDate, parseLocalDate, startOfMonday } from "../components/utils/helpers";
import { calcularTiempoSesion } from "../components/study/sessionSequence";
import SessionContentView from "../components/study/SessionContentView";
import PageHeader from "@/components/ds/PageHeader";

export default function AsignacionDetallePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedSemanas, setExpandedSemanas] = useState(new Set([0]));
  const [expandedSesiones, setExpandedSesiones] = useState(new Set());
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editData, setEditData] = useState(null);
  
  const urlParams = new URLSearchParams(window.location.search);
  const asignacionId = urlParams.get('id');

  const currentUser = getCurrentUser();

  const { data: asignacion, isLoading } = useQuery({
    queryKey: ['asignacion', asignacionId],
    queryFn: async () => {
      const result = await base44.entities.Asignacion.list();
      return result.find(a => a.id === asignacionId);
    },
    enabled: !!asignacionId,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: piezas = [] } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => base44.entities.Pieza.list(),
  });

  const cerrarMutation = useMutation({
    mutationFn: () => base44.entities.Asignacion.update(asignacionId, { estado: 'cerrada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignacion', asignacionId] });
      toast.success('✅ Asignación cerrada');
    },
  });

  const publicarMutation = useMutation({
    mutationFn: () => base44.entities.Asignacion.update(asignacionId, { estado: 'publicada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignacion', asignacionId] });
      toast.success('✅ Asignación publicada');
    },
  });

  const editarMutation = useMutation({
    mutationFn: async (data) => {
      if (data.piezaId && data.piezaId !== asignacion.piezaId) {
        const pieza = piezas.find(p => p.id === data.piezaId);
        if (pieza) {
          data.piezaSnapshot = {
            nombre: pieza.nombre,
            descripcion: pieza.descripcion || '',
            nivel: pieza.nivel,
            tiempoObjetivoSeg: pieza.tiempoObjetivoSeg || 0,
            elementos: pieza.elementos || [],
          };
        }
      }
      
      return base44.entities.Asignacion.update(asignacionId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignacion', asignacionId] });
      toast.success('✅ Cambios guardados');
      setShowEditDrawer(false);
    },
  });

  const calcularLunesSemanaISO = (fecha) => {
    const date = parseLocalDate(fecha);
    return formatLocalDate(startOfMonday(date));
  };

  const handleEditarInformacion = () => {
    setEditData({
      piezaId: asignacion.piezaId,
      fechaSeleccionada: asignacion.semanaInicioISO,
      foco: asignacion.foco || 'GEN',
      notas: asignacion.notas || '',
    });
    setShowEditDrawer(true);
  };

  const handleGuardarEdicion = () => {
    if (!editData.piezaId) {
      toast.error('❌ Debes seleccionar una pieza');
      return;
    }
    if (!editData.fechaSeleccionada) {
      toast.error('❌ Debes seleccionar una fecha');
      return;
    }

    if (editData.piezaId !== asignacion.piezaId) {
      if (!window.confirm('Cambiar pieza actualizará el material de FM. ¿Continuar?')) {
        return;
      }
    }

    const dataToSave = {
      piezaId: editData.piezaId,
      semanaInicioISO: calcularLunesSemanaISO(editData.fechaSeleccionada),
      foco: editData.foco || 'GEN',
      notas: editData.notas || null,
    };

    editarMutation.mutate(dataToSave);
  };

  const toggleSemana = (index) => {
    const newExpanded = new Set(expandedSemanas);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSemanas(newExpanded);
  };

  const toggleSesion = (semanaIndex, sesionIndex) => {
    const key = `${semanaIndex}-${sesionIndex}`;
    const newExpanded = new Set(expandedSesiones);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSesiones(newExpanded);
  };

  const focoLabels = {
    GEN: 'General',
    LIG: 'Ligaduras',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Afinación',
  };

  const focoColors = {
    GEN: 'bg-slate-100 text-slate-800 border-slate-200',
    LIG: 'bg-blue-100 text-blue-800 border-blue-200',
    RIT: 'bg-purple-100 text-purple-800 border-purple-200',
    ART: 'bg-green-100 text-green-800 border-green-200',
    'S&A': 'bg-brand-100 text-brand-800 border-brand-200',
  };

  const estadoColors = {
    borrador: 'bg-slate-100 text-slate-800',
    publicada: 'bg-green-100 text-green-800',
    en_curso: 'bg-blue-100 text-blue-800',
    cerrada: 'bg-amber-100 text-amber-800',
  };

  const estadoLabels = {
    borrador: 'Borrador',
    publicada: 'Publicada',
    en_curso: 'En Curso',
    cerrada: 'Cerrada',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-ui/80">Cargando asignación...</p>
        </div>
      </div>
    );
  }

  if (!asignacion) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="max-w-md app-card">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-red-500" />
            <div>
              <h2 className="font-semibold text-lg text-ui mb-2">Asignación No Encontrada</h2>
              <p className="text-ui/80">No tienes acceso a esta asignación o no existe.</p>
              <Button onClick={() => navigate(createPageUrl('asignaciones'))} className="mt-4 btn-primary h-10 rounded-xl shadow-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Asignaciones
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
  const isCerrada = asignacion.estado === 'cerrada';
  const isBorrador = asignacion.estado === 'borrador';
  const isAdminOrProf = currentUser?.rolPersonalizado === 'ADMIN' || currentUser?.rolPersonalizado === 'PROF';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Target}
        title="Detalle de Asignación"
        subtitle={`Estudiante: ${getNombreVisible(alumno)}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => navigate(createPageUrl('asignaciones'))} className="h-10 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            {isAdminOrProf && (
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl(`adaptar-asignacion?id=${asignacionId}`))}
                className="h-10 rounded-xl"
              >
                <Edit className="w-4 h-4 mr-2" />
                Adaptar plan
              </Button>
            )}
            {isBorrador && (
              <Button 
                onClick={() => publicarMutation.mutate()}
                disabled={publicarMutation.isPending}
                className="btn-primary h-10 rounded-xl shadow-sm"
              >
                Publicar
              </Button>
            )}
            {!isCerrada && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm('¿Cerrar esta asignación?')) {
                    cerrarMutation.mutate();
                  }
                }}
                disabled={cerrarMutation.isPending}
                className="h-10 rounded-xl"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cerrar
              </Button>
            )}
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-8 mt-4">
        <Badge className={`rounded-full ${estadoColors[asignacion.estado]}`}>
          {estadoLabels[asignacion.estado]}
        </Badge>
      </div>

      <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-6">
        <Card className="app-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Información General</CardTitle>
            {isAdminOrProf && (
              <Button variant="outline" size="sm" onClick={handleEditarInformacion} className="h-9 rounded-xl">
                <Edit className="w-4 h-4 mr-2" />
                Editar información
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="icon-tile">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-ui/80">Estudiante</p>
                  <p className="font-medium text-ui">{getNombreVisible(alumno)}</p>
                  <p className="text-sm text-ui/80">{alumno?.email}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="icon-tile">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-ui/80">Pieza</p>
                  <p className="font-medium text-ui">{asignacion.piezaSnapshot?.nombre}</p>
                  <p className="text-sm text-ui/80">
                    {asignacion.piezaSnapshot?.nivel} • {asignacion.piezaSnapshot?.elementos?.length || 0} elementos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="icon-tile">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-ui/80">Plan</p>
                  <p className="font-medium text-ui">{asignacion.plan?.nombre}</p>
                  <p className="text-sm text-ui/80">
                    {asignacion.plan?.semanas?.length || 0} semanas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="icon-tile">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-ui/80">Semana de Inicio</p>
                  <p className="font-medium text-ui">
                    {parseLocalDate(asignacion.semanaInicioISO).toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {asignacion.foco && (
                <div className="flex items-start gap-3">
                  <div className="icon-tile">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-ui/80">Foco</p>
                    <Badge className={`rounded-full ${focoColors[asignacion.foco]}`}>
                      {focoLabels[asignacion.foco]}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {asignacion.notas && (
              <div className="pt-4 border-t border-ui">
                <p className="text-sm text-ui/80 mb-2">Notas del Profesor</p>
                <p className="text-ui whitespace-pre-wrap">{asignacion.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader>
            <CardTitle>Plan de Estudio ({asignacion.plan?.semanas?.length || 0} semanas)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {asignacion.plan?.semanas?.map((semana, semanaIndex) => (
              <Card 
                key={semanaIndex}
                className="app-panel cursor-pointer hover:shadow-md transition-all"
                onClick={() => toggleSemana(semanaIndex)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <div className="pt-1">
                      {expandedSemanas.has(semanaIndex) ? (
                        <ChevronDown className="w-5 h-5 text-ui" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-ui" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-ui">{semana.nombre}</h3>
                        <Badge className={`rounded-full ${focoColors[semana.foco]}`}>
                          {focoLabels[semana.foco]}
                        </Badge>
                        <span className="text-sm text-ui/80">
                          ({semana.sesiones?.length || 0} sesiones)
                        </span>
                      </div>

                      {expandedSemanas.has(semanaIndex) && (
                        <div className="ml-4 mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                          {semana.objetivo && (
                            <p className="text-sm text-ui/80 italic">"{semana.objetivo}"</p>
                          )}

                          {semana.sesiones && semana.sesiones.length > 0 && (
                            <div className="space-y-2">
                              {semana.sesiones.map((sesion, sesionIndex) => {
                                const sesionKey = `${semanaIndex}-${sesionIndex}`;
                                const isExpanded = expandedSesiones.has(sesionKey);
                                const tiempoTotal = calcularTiempoSesion(sesion);
                                const tiempoMinutos = Math.floor(tiempoTotal / 60);
                                const tiempoSegundos = tiempoTotal % 60;
                                
                                return (
                                  <Card 
                                    key={sesionIndex}
                                    className="app-panel cursor-pointer hover:shadow-md transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSesion(semanaIndex, sesionIndex);
                                    }}
                                  >
                                    <CardContent className="pt-3 pb-3">
                                      <div className="flex items-start gap-2">
                                        <div className="pt-1">
                                          {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-ui" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 text-ui" />
                                          )}
                                        </div>
                                        
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm text-ui">{sesion.nombre}</span>
                                            <Badge 
                                              variant="outline" 
                                              className={`rounded-full text-xs ${
                                                tiempoTotal > 0 ? 'bg-green-50 border-green-300 text-green-800' : 'bg-slate-50'
                                              }`}
                                            >
                                              ⏱ {tiempoMinutos}:{String(tiempoSegundos).padStart(2, '0')} min
                                            </Badge>
                                            <Badge className={`rounded-full ${focoColors[sesion.foco]}`} variant="outline">
                                              {focoLabels[sesion.foco]}
                                            </Badge>
                                          </div>

                                          {isExpanded && (
                                            <div className="ml-6 mt-2" onClick={(e) => e.stopPropagation()}>
                                              <SessionContentView sesion={sesion} />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Drawer de edición */}
      {showEditDrawer && editData && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowEditDrawer(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-none overflow-hidden">
            <div 
              className="bg-card w-full max-w-2xl h-full shadow-card flex flex-col animate-in slide-in-from-right pointer-events-auto rounded-l-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-ui px-6 py-4 flex items-center justify-between bg-brand-500">
                <div className="flex items-center gap-3 text-white">
                  <Edit className="w-6 h-6" />
                  <h2 className="text-xl font-bold">Editar Información</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowEditDrawer(false)} className="text-white hover:bg-white/20 h-9 w-9 rounded-xl" aria-label="Cerrar drawer">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <Label htmlFor="pieza">Pieza *</Label>
                  <Select value={editData.piezaId} onValueChange={(v) => setEditData({ ...editData, piezaId: v })}>
                    <SelectTrigger className="h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]">
                      <SelectValue placeholder="Selecciona una pieza" />
                    </SelectTrigger>
                    <SelectContent className="z-[120]" position="popper">
                      {piezas.map((pieza) => (
                        <SelectItem key={pieza.id} value={pieza.id}>
                          {pieza.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fecha">Fecha de inicio (cualquier día) *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={editData.fechaSeleccionada}
                    onChange={(e) => setEditData({ ...editData, fechaSeleccionada: e.target.value })}
                    className="h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]"
                  />
                  {editData.fechaSeleccionada && (
                    <Alert className="mt-2 rounded-xl border-blue-200 bg-blue-50">
                      <AlertDescription className="text-xs text-blue-800">
                        Se guardará la semana ISO del Lunes{' '}
                        {parseLocalDate(calcularLunesSemanaISO(editData.fechaSeleccionada)).toLocaleDateString('es-ES')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label htmlFor="foco">Foco</Label>
                  <Select value={editData.foco} onValueChange={(v) => setEditData({ ...editData, foco: v })}>
                    <SelectTrigger className="h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]">
                      <SelectValue placeholder="Selecciona un foco" />
                    </SelectTrigger>
                    <SelectContent className="z-[120]" position="popper">
                      {Object.entries(focoLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notas">Notas del profesor</Label>
                  <Textarea
                    id="notas"
                    value={editData.notas}
                    onChange={(e) => setEditData({ ...editData, notas: e.target.value })}
                    placeholder="Comentarios, instrucciones..."
                    rows={4}
                    className="rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))] resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-ui px-6 py-4 bg-muted">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowEditDrawer(false)} className="flex-1 h-10 rounded-xl">
                    Cancelar
                  </Button>
                  <Button onClick={handleGuardarEdicion} disabled={editarMutation.isPending} className="flex-1 btn-primary h-10 rounded-xl shadow-sm">
                    <Save className="w-4 h-4 mr-2" />
                    {editarMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                <p className="text-xs text-center text-ui/80 mt-2">
                  Ctrl/⌘+. : cerrar • Ctrl/⌘+Intro : guardar
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

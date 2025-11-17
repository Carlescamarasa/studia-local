
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
import { componentStyles } from "@/design/componentStyles";

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
    GEN: componentStyles.status.badgeDefault,
    LIG: componentStyles.status.badgeInfo,
    RIT: componentStyles.status.badgeDefault, // Usar default para púrpura
    ART: componentStyles.status.badgeSuccess,
    'S&A': componentStyles.status.badgeDefault, // Usar default para brand
  };

  const estadoColors = {
    borrador: componentStyles.status.badgeDefault,
    publicada: componentStyles.status.badgeSuccess,
    en_curso: componentStyles.status.badgeInfo,
    cerrada: componentStyles.status.badgeWarning,
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
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Cargando asignación...</p>
        </div>
      </div>
    );
  }

  if (!asignacion) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className={`max-w-md ${componentStyles.containers.cardBase}`}>
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className={`w-16 h-16 mx-auto ${componentStyles.empty.emptyIcon} text-[var(--color-danger)]`} />
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-[var(--color-text-primary)] mb-2">Asignación No Encontrada</h2>
              <p className="text-sm md:text-base text-[var(--color-text-primary)]">No tienes acceso a esta asignación o no existe.</p>
              <Button onClick={() => navigate(-1)} className={`mt-4 ${componentStyles.buttons.primary}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
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
          <div className="flex gap-2 flex-wrap items-center">
            <Badge className={`rounded-full ${estadoColors[asignacion.estado]}`}>
              {estadoLabels[asignacion.estado]}
            </Badge>
            <Button variant="ghost" onClick={() => navigate(-1)} className={componentStyles.buttons.ghost}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            {isAdminOrProf && (
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl(`adaptar-asignacion?id=${asignacionId}`))}
                className={componentStyles.buttons.outline}
              >
                <Edit className="w-4 h-4 mr-2" />
                Adaptar plan
              </Button>
            )}
            {isBorrador && (
              <Button 
                onClick={() => publicarMutation.mutate()}
                disabled={publicarMutation.isPending}
                className={componentStyles.buttons.primary}
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
                className={componentStyles.buttons.outline}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cerrar
              </Button>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[var(--color-text-primary)]">Información General</CardTitle>
            {isAdminOrProf && (
              <Button variant="outline" size="sm" onClick={handleEditarInformacion} className={componentStyles.buttons.outline}>
                <Edit className="w-4 h-4 mr-2" />
                Editar Asignación
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <div className={componentStyles.empty.emptyIcon}>
                  <User className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Estudiante</p>
                  <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">{getNombreVisible(alumno)}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{alumno?.email}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className={componentStyles.empty.emptyIcon}>
                  <Music className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Pieza</p>
                  <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">{asignacion.piezaSnapshot?.nombre}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {asignacion.piezaSnapshot?.nivel} • {asignacion.piezaSnapshot?.elementos?.length || 0} elementos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className={componentStyles.empty.emptyIcon}>
                  <BookOpen className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Plan</p>
                  <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">{asignacion.plan?.nombre}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {asignacion.plan?.semanas?.length || 0} semanas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className={componentStyles.empty.emptyIcon}>
                  <Calendar className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">Semana de Inicio</p>
                  <p className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">
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
                <div className="flex items-start gap-2">
                  <div className={componentStyles.empty.emptyIcon}>
                    <Settings className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Foco</p>
                    <Badge className={focoColors[asignacion.foco]}>
                      {focoLabels[asignacion.foco]}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {asignacion.notas && (
              <div className="pt-3 border-t border-[var(--color-border-default)]">
                <p className="text-xs text-[var(--color-text-secondary)] mb-1.5">Notas del Profesor</p>
                <p className="text-sm md:text-base text-[var(--color-text-primary)]">{asignacion.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle className="text-[var(--color-text-primary)]">Plan de Estudio ({asignacion.plan?.semanas?.length || 0} semanas)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {asignacion.plan?.semanas?.map((semana, semanaIndex) => (
              <Card 
                key={semanaIndex}
                className={`${componentStyles.containers.panelBase} cursor-pointer hover:shadow-md transition-all`}
                onClick={() => toggleSemana(semanaIndex)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="pt-1">
                      {expandedSemanas.has(semanaIndex) ? (
                        <ChevronDown className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-[var(--color-text-primary)]">{semana.nombre}</h3>
                        <Badge className={`rounded-full ${focoColors[semana.foco]}`}>
                          {focoLabels[semana.foco]}
                        </Badge>
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          ({semana.sesiones?.length || 0} sesiones)
                        </span>
                      </div>

                      {expandedSemanas.has(semanaIndex) && (
                        <div className="ml-4 mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          {semana.objetivo && (
                            <p className="text-sm text-[var(--color-text-secondary)] italic">"{semana.objetivo}"</p>
                          )}

                          {semana.sesiones && semana.sesiones.length > 0 && (
                            <div className="space-y-1.5">
                              {semana.sesiones.map((sesion, sesionIndex) => {
                                const sesionKey = `${semanaIndex}-${sesionIndex}`;
                                const isExpanded = expandedSesiones.has(sesionKey);
                                const tiempoTotal = calcularTiempoSesion(sesion);
                                const tiempoMinutos = Math.floor(tiempoTotal / 60);
                                const tiempoSegundos = tiempoTotal % 60;
                                
                                return (
                                  <Card 
                                    key={sesionIndex}
                                    className={`${componentStyles.containers.panelBase} cursor-pointer hover:shadow-md transition-all`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSesion(semanaIndex, sesionIndex);
                                    }}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-start gap-2">
                                        <div className="pt-1">
                                          {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                          )}
                                        </div>
                                        
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">{sesion.nombre}</span>
                                            <Badge 
                                              variant="outline" 
                                              className={tiempoTotal > 0 ? componentStyles.status.badgeSuccess : componentStyles.status.badgeDefault}
                                            >
                                              ⏱ {tiempoMinutos}:{String(tiempoSegundos).padStart(2, '0')} min
                                            </Badge>
                                            <Badge className={focoColors[sesion.foco]} variant="outline">
                                              {focoLabels[sesion.foco]}
                                            </Badge>
                                          </div>

                                          {isExpanded && (
                                            <div className="ml-6 mt-1.5" onClick={(e) => e.stopPropagation()}>
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
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowEditDrawer(false)} />
          <div className="fixed inset-0 z-[100] flex items-center justify-end pointer-events-none overflow-hidden">
            <div 
              className="bg-[var(--color-surface-elevated)] w-full max-w-2xl h-full shadow-card flex flex-col animate-in slide-in-from-right pointer-events-auto rounded-l-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-[var(--color-border-default)] px-4 py-3 flex items-center justify-between bg-[var(--color-primary)]">
                <div className="flex items-center gap-3 text-[var(--color-text-inverse)]">
                  <Edit className="w-6 h-6 text-[var(--color-text-inverse)]" />
                  <h2 className="text-xl font-bold text-[var(--color-text-inverse)]">Editar Asignación</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowEditDrawer(false)} className="text-[var(--color-text-inverse)] hover:bg-[var(--color-text-inverse)]/20 h-9 w-9 rounded-xl" aria-label="Cerrar drawer">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <Label htmlFor="pieza" className="text-[var(--color-text-primary)]">Pieza *</Label>
                  <Select 
                    value={editData.piezaId} 
                    onValueChange={(v) => setEditData({ ...editData, piezaId: v })}
                    modal={false}
                  >
                    <SelectTrigger id="pieza" className={`w-full ${componentStyles.controls.selectDefault}`}>
                      <SelectValue placeholder="Selecciona una pieza" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      align="start" 
                      sideOffset={4}
                      className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      {piezas.length === 0 ? (
                        <div className="p-2 text-sm text-[var(--color-text-secondary)]">No hay piezas</div>
                      ) : (
                        piezas.map((pieza) => (
                          <SelectItem key={pieza.id} value={pieza.id}>
                            {pieza.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fecha" className="text-[var(--color-text-primary)]">Fecha de inicio (cualquier día) *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={editData.fechaSeleccionada}
                    onChange={(e) => setEditData({ ...editData, fechaSeleccionada: e.target.value })}
                    className={componentStyles.controls.inputDefault}
                  />
                  {editData.fechaSeleccionada && (
                    <Alert className={`mt-2 ${componentStyles.containers.panelBase} border-[var(--color-info)] bg-[var(--color-info)]/10`}>
                      <AlertDescription className="text-xs text-[var(--color-info)]">
                        Se guardará la semana ISO del Lunes{' '}
                        {parseLocalDate(calcularLunesSemanaISO(editData.fechaSeleccionada)).toLocaleDateString('es-ES')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label htmlFor="foco" className="text-[var(--color-text-primary)]">Foco</Label>
                  <Select 
                    value={editData.foco} 
                    onValueChange={(v) => setEditData({ ...editData, foco: v })}
                    modal={false}
                  >
                    <SelectTrigger id="foco" className={`w-full ${componentStyles.controls.selectDefault}`}>
                      <SelectValue placeholder="Selecciona un foco" />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      align="start" 
                      sideOffset={4}
                      className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      {Object.entries(focoLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notas" className="text-[var(--color-text-primary)]">Notas del profesor</Label>
                  <Textarea
                    id="notas"
                    value={editData.notas}
                    onChange={(e) => setEditData({ ...editData, notas: e.target.value })}
                    placeholder="Comentarios, instrucciones..."
                    rows={4}
                    className={`${componentStyles.controls.inputDefault} resize-none`}
                  />
                </div>
              </div>

              <div className="border-t border-[var(--color-border-default)] px-4 py-3 bg-[var(--color-surface-muted)]">
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowEditDrawer(false)} className={`flex-1 ${componentStyles.buttons.outline}`}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGuardarEdicion} disabled={editarMutation.isPending} className={`flex-1 ${componentStyles.buttons.primary}`}>
                    <Save className="w-4 h-4 mr-2" />
                    {editarMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] text-center mt-1.5">
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

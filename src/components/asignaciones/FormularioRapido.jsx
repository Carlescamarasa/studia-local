
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Users, Music, BookOpen, Calendar, Settings, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { displayName, formatLocalDate, parseLocalDate, startOfMonday } from "@/components/utils/helpers";
import { createPortal } from "react-dom";

export default function FormularioRapido({ onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    estudiantesIds: [],
    piezaId: '',
    planId: '',
    fechaSeleccionada: '',
    semanaInicioISO: '',
    foco: 'GEN',
    notas: '',
    publicarAhora: false,
    adaptarPlanAhora: true,
  });
  const [searchAlumno, setSearchAlumno] = useState('');

  const normalizar = (s = '') => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

  const currentUser = getCurrentUser();

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.rolPersonalizado === 'ESTU');
    },
  });

  const estudiantesFiltrados = estudiantes.filter(u => {
    if (!searchAlumno.trim()) return true;
    const term = normalizar(searchAlumno);
    return normalizar(displayName(u)).includes(term) || normalizar(u.email || '').includes(term);
  });

  const { data: piezas = [] } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => base44.entities.Pieza.list(),
  });

  const { data: planes = [] } = useQuery({
    queryKey: ['planes'],
    queryFn: () => base44.entities.Plan.list(),
  });

  const crearAsignacionesMutation = useMutation({
    mutationFn: async (data) => {
      const pieza = piezas.find(p => p.id === data.piezaId);
      const plan = planes.find(p => p.id === data.planId);
      
      if (!pieza || !plan) {
        throw new Error('Pieza o Plan no encontrados');
      }

      const planCopy = JSON.parse(JSON.stringify(plan));
      const piezaSnapshot = {
        nombre: pieza.nombre,
        descripcion: pieza.descripcion || '',
        nivel: pieza.nivel,
        tiempoObjetivoSeg: pieza.tiempoObjetivoSeg || 0,
        elementos: pieza.elementos || [],
      };

      const asignaciones = data.estudiantesIds.map(alumnoId => ({
        alumnoId,
        piezaId: data.piezaId,
        semanaInicioISO: data.semanaInicioISO,
        estado: data.adaptarPlanAhora ? 'borrador' : (data.publicarAhora ? 'publicada' : 'borrador'),
        foco: data.foco || 'GEN',
        notas: data.notas || null,
        plan: planCopy,
        piezaSnapshot,
        profesorId: currentUser?.id,
      }));

      const results = [];
      for (const asignacion of asignaciones) {
        try {
          const result = await base44.entities.Asignacion.create(asignacion);
          results.push(result);
        } catch (error) {
          const alumno = estudiantes.find(e => e.id === asignacion.alumnoId);
          toast.error(`❌ No se pudo crear la asignación para ${displayName(alumno)}`);
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      
      if (results.length === 0) {
        toast.error('No se pudo crear ninguna asignación');
        return;
      }

      if (formData.adaptarPlanAhora && results.length === 1) {
        toast.success('✅ Asignación creada en borrador');
        navigate(createPageUrl(`adaptar-asignacion?id=${results[0].id}`));
      } else if (results.length === 1) {
        toast.success('✅ Asignación creada');
        navigate(createPageUrl(`asignacion-detalle?id=${results[0].id}`));
      } else {
        toast.success(`✅ Se crearon ${results.length} asignaciones`);
        onClose();
      }
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    },
  });

  const calcularLunesSemanaISO = (fecha) => {
    const date = parseLocalDate(fecha);
    return formatLocalDate(startOfMonday(date));
  };

  const getDomingoSemana = (lunes) => {
    const date = parseLocalDate(lunes);
    date.setDate(date.getDate() + 6);
    return formatLocalDate(date);
  };

  const toggleEstudiante = (id) => {
    if (formData.estudiantesIds.includes(id)) {
      setFormData({
        ...formData,
        estudiantesIds: formData.estudiantesIds.filter(eId => eId !== id)
      });
    } else {
      setFormData({
        ...formData,
        estudiantesIds: [...formData.estudiantesIds, id]
      });
    }
  };

  const handleCrear = () => {
    if (formData.estudiantesIds.length === 0) {
      toast.error('Selecciona al menos un estudiante');
      return;
    }
    if (!formData.piezaId) {
      toast.error('Selecciona una pieza');
      return;
    }
    if (!formData.planId) {
      toast.error('Selecciona un plan');
      return;
    }
    if (!formData.fechaSeleccionada) {
      toast.error('Selecciona una fecha de inicio');
      return;
    }

    crearAsignacionesMutation.mutate(formData);
  };

  useEffect(() => {
    if (formData.fechaSeleccionada) {
      const lunes = calcularLunesSemanaISO(formData.fechaSeleccionada);
      setFormData(prev => ({ ...prev, semanaInicioISO: lunes }));
    }
  }, [formData.fechaSeleccionada]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCrear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, onClose, handleCrear]);

  const piezaSeleccionada = piezas.find(p => p.id === formData.piezaId);
  const planSeleccionado = planes.find(p => p.id === formData.planId);

  const focoLabels = {
    GEN: 'General',
    LIG: 'Ligaduras',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Afinación',
  };

  const modalContent = (
    <>
      <div className="fixed inset-0 bg-black/40 z-[80]" onClick={onClose} />
      
      <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
        <Card className="w-full max-w-6xl pointer-events-auto my-8 max-h-[92vh] overflow-y-auto app-card">
          <CardHeader className="border-b bg-brand-500 text-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6" />
                <CardTitle className="text-xl">Nueva Asignación</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-xl">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="app-panel">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-700" />
                    <CardTitle className="text-base">Estudiante(s)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    value={searchAlumno}
                    onChange={(e) => setSearchAlumno(e.target.value)}
                    placeholder="Buscar estudiante por nombre o email..."
                    className="mb-3 focus-brand"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-ui app-panel p-2">
                    {estudiantesFiltrados.length === 0 ? (
                      <p className="text-sm text-muted text-center py-4">
                        {searchAlumno ? 'No se encontraron estudiantes' : 'No hay estudiantes'}
                      </p>
                    ) : (
                      estudiantesFiltrados.map((estudiante) => (
                        <div
                          key={estudiante.id}
                          className={`flex items-center gap-2 p-2 cursor-pointer transition-all app-panel ${
                            formData.estudiantesIds.includes(estudiante.id)
                              ? 'bg-brand-50 border-brand-400'
                              : 'hover:bg-muted hover:shadow-sm'
                          }`}
                          onClick={() => toggleEstudiante(estudiante.id)}
                        >
                          <Checkbox checked={formData.estudiantesIds.includes(estudiante.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-ui">{displayName(estudiante)}</p>
                            <p className="text-xs text-muted truncate">{estudiante.email}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {formData.estudiantesIds.length > 0 && (
                    <p className="text-xs text-muted">
                      {formData.estudiantesIds.length} seleccionado(s)
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="app-panel">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-brand-700" />
                    <CardTitle className="text-base">Pieza</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={formData.piezaId} 
                    onValueChange={(v) => setFormData({ ...formData, piezaId: v })}
                    modal={false}
                  >
                    <SelectTrigger id="pieza" className="w-full focus-brand">
                      <SelectValue placeholder="Selecciona una pieza..." />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      align="start" 
                      sideOffset={4}
                      className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      {piezas.length === 0 ? (
                        <div className="p-2 text-sm text-muted">No hay piezas</div>
                      ) : (
                        piezas.map((pieza) => (
                          <SelectItem key={pieza.id} value={pieza.id}>
                            {pieza.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {piezaSeleccionada && (
                    <div className="mt-2 text-xs text-muted">
                      <p><strong>Nivel:</strong> {piezaSeleccionada.nivel}</p>
                      <p><strong>Elementos:</strong> {piezaSeleccionada.elementos?.length || 0}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="app-panel">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-brand-700" />
                    <CardTitle className="text-base">Plan</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={formData.planId} 
                    onValueChange={(v) => setFormData({ ...formData, planId: v })}
                    modal={false}
                  >
                    <SelectTrigger id="plan" className="w-full focus-brand">
                      <SelectValue placeholder="Selecciona un plan..." />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      side="bottom" 
                      align="start" 
                      sideOffset={4}
                      className="z-[120] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                    >
                      {planes.length === 0 ? (
                        <div className="p-2 text-sm text-muted">No hay planes</div>
                      ) : (
                        planes.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {planSeleccionado && (
                    <div className="mt-2 text-xs text-muted">
                      <p><strong>Semanas:</strong> {planSeleccionado.semanas?.length || 0}</p>
                      {planSeleccionado.focoGeneral && (
                        <p><strong>Foco:</strong> {focoLabels[planSeleccionado.focoGeneral]}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="app-panel">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-700" />
                    <CardTitle className="text-base">Fecha de inicio</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    type="date"
                    value={formData.fechaSeleccionada}
                    onChange={(e) => setFormData({ ...formData, fechaSeleccionada: e.target.value })}
                    className="focus-brand"
                  />
                  {formData.fechaSeleccionada && formData.semanaInicioISO && (
                    <Alert className="border-blue-200 bg-blue-50 app-panel">
                      <AlertDescription className="text-xs text-blue-800">
                        <strong>Elegido:</strong> {parseLocalDate(formData.fechaSeleccionada).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        <br />
                        <strong>Semana ISO:</strong> Lunes {parseLocalDate(formData.semanaInicioISO).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - Domingo {parseLocalDate(getDomingoSemana(formData.semanaInicioISO)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="app-panel">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-700" />
                  <CardTitle className="text-base">Opciones</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="foco">Foco</Label>
                  <Select 
                    value={formData.foco} 
                    onValueChange={(v) => setFormData({ ...formData, foco: v })}
                    modal={false}
                  >
                    <SelectTrigger id="foco" className="w-full focus-brand">
                      <SelectValue placeholder="Selecciona foco..." />
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
                  <p className="text-xs text-muted mt-1">Por defecto: General</p>
                </div>

                <div>
                  <Label htmlFor="notas">Notas del estudiante (opcional)</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Instrucciones o comentarios..."
                    rows={3}
                    className="focus-brand"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-ui app-panel hover:bg-muted hover:shadow-sm transition-all">
                  <div className="flex-1">
                    <Label htmlFor="publicar" className="font-medium">Publicar ahora</Label>
                    <p className="text-xs text-muted">Si está desactivado, se guardará como borrador</p>
                  </div>
                  <Switch
                    id="publicar"
                    checked={formData.publicarAhora}
                    onCheckedChange={(checked) => setFormData({ ...formData, publicarAhora: checked, adaptarPlanAhora: false })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border border-ui app-panel bg-blue-50">
                  <div className="flex-1">
                    <Label htmlFor="adaptar" className="font-medium">Adaptar plan ahora (recomendado)</Label>
                    <p className="text-xs text-muted">Crear en borrador y abrir editor para adaptar el plan</p>
                  </div>
                  <Switch
                    id="adaptar"
                    checked={formData.adaptarPlanAhora}
                    onCheckedChange={(checked) => setFormData({ ...formData, adaptarPlanAhora: checked, publicarAhora: false })}
                    disabled={formData.estudiantesIds.length > 1}
                  />
                </div>
                {formData.estudiantesIds.length > 1 && (
                  <p className="text-xs text-amber-700">
                    Solo puedes adaptar el plan si seleccionas un único estudiante
                  </p>
                )}
              </CardContent>
            </Card>

            {formData.estudiantesIds.length > 0 && formData.piezaId && formData.planId && formData.fechaSeleccionada && (
              <Alert className="border-brand-200 bg-brand-50 app-panel">
                <AlertDescription className="text-brand-800">
                  <strong>Resumen:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>{formData.estudiantesIds.length} estudiante(s)</li>
                    <li>Pieza: {piezaSeleccionada?.nombre}</li>
                    <li>Plan: {planSeleccionado?.nombre} ({planSeleccionado?.semanas?.length || 0} semanas)</li>
                    <li>Inicio: {formData.semanaInicioISO && parseLocalDate(formData.semanaInicioISO).toLocaleDateString('es-ES')}</li>
                    <li>Foco: {focoLabels[formData.foco]}</li>
                    <li>Estado: {formData.publicarAhora ? 'Publicada' : 'Borrador'}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <div className="border-t border-ui px-6 py-4 bg-muted sticky bottom-0">
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                Cancelar
              </Button>
              <div className="flex gap-2">
                {formData.adaptarPlanAhora ? (
                  <Button
                    onClick={handleCrear}
                    disabled={crearAsignacionesMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                  >
                    {crearAsignacionesMutation.isPending ? 'Creando...' : 'Crear y adaptar'}
                  </Button>
                ) : formData.publicarAhora ? (
                  <Button
                    onClick={handleCrear}
                    disabled={crearAsignacionesMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 rounded-xl shadow-sm"
                  >
                    {crearAsignacionesMutation.isPending ? 'Creando...' : 'Crear y publicar'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCrear}
                    disabled={crearAsignacionesMutation.isPending}
                    className="btn-primary rounded-xl shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {crearAsignacionesMutation.isPending ? 'Guardando...' : 'Guardar borrador'}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-center text-muted mt-2">
              Ctrl/⌘+Intro : acción principal • Ctrl/⌘+. : cancelar
            </p>
          </div>
        </Card>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}


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
import { X, ChevronRight, ChevronLeft, Check, Search, Calendar, Users, Music, BookOpen, Settings, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatLocalDate, parseLocalDate, startOfMonday, displayName } from "@/components/utils/helpers";

export default function CrearAsignacionWizard({ onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    estudiantesIds: [],
    piezaId: '',
    planId: '',
    fechaSeleccionada: '',
    semanaInicioISO: '',
    foco: 'GEN',
    notas: '',
    publicarAlTerminar: false,
  });
  const [searchEstudiante, setSearchEstudiante] = useState('');
  const [searchPieza, setSearchPieza] = useState('');
  const [searchPlan, setSearchPlan] = useState('');

  const currentUser = getCurrentUser();

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.rolPersonalizado === 'ESTU');
    },
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
        estado: data.publicarAlTerminar ? 'publicada' : 'borrador',
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
          toast.error(`❌ No se pudo crear la asignación para ${alumno?.full_name}`);
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      
      if (results.length === 1) {
        toast.success('✅ Asignación creada');
        navigate(createPageUrl(`asignacion-detalle?id=${results[0].id}`));
      } else if (results.length > 1) {
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

  useEffect(() => {
    if (formData.fechaSeleccionada) {
      const lunes = calcularLunesSemanaISO(formData.fechaSeleccionada);
      setFormData(prev => ({ ...prev, semanaInicioISO: lunes }));
    }
  }, [formData.fechaSeleccionada]);

  const filteredEstudiantes = estudiantes.filter(e =>
    displayName(e).toLowerCase().includes(searchEstudiante.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchEstudiante.toLowerCase())
  );

  const filteredPiezas = piezas.filter(p =>
    p.nombre?.toLowerCase().includes(searchPieza.toLowerCase())
  );

  const filteredPlanes = planes.filter(p =>
    p.nombre?.toLowerCase().includes(searchPlan.toLowerCase())
  );

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

  const canProceed = () => {
    switch(step) {
      case 1: return formData.estudiantesIds.length > 0;
      case 2: return !!formData.piezaId;
      case 3: return !!formData.planId;
      case 4: return !!formData.fechaSeleccionada;
      case 5: return true;
      default: return false;
    }
  };

  const handleFinalizar = () => {
    crearAsignacionesMutation.mutate(formData);
  };

  const piezaSeleccionada = piezas.find(p => p.id === formData.piezaId);
  const planSeleccionado = planes.find(p => p.id === formData.planId);

  const steps = [
    { num: 1, label: 'Estudiantes', icon: Users },
    { num: 2, label: 'Pieza', icon: Music },
    { num: 3, label: 'Plan', icon: BookOpen },
    { num: 4, label: 'Calendario', icon: Calendar },
    { num: 5, label: 'Opciones', icon: Settings },
  ];

  const focoLabels = {
    GEN: 'General',
    LIG: 'Ligaduras',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Afinación',
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto app-card shadow-card">
          <CardHeader className="border-b border-ui bg-brand-500 text-white rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6" />
                <CardTitle className="text-xl">Nueva Asignación</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-9 w-9 rounded-xl" aria-label="Cerrar wizard">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {steps.map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className={`flex items-center gap-2 ${step === s.num ? 'text-white' : step > s.num ? 'text-white' : 'text-white/50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      step === s.num ? 'bg-white text-brand-600' : step > s.num ? 'bg-white/80 text-brand-600' : 'bg-white/20'
                    }`}>
                      {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <span className="text-sm hidden md:inline">{s.label}</span>
                  </div>
                  {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-white/50" />}
                </React.Fragment>
              ))}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-ui">
                    <Users className="w-5 h-5 text-brand-600" />
                    Selecciona Estudiantes
                  </h2>
                  <p className="text-sm text-muted mb-4">
                    Se creará una asignación individual para cada estudiante seleccionado
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchEstudiante}
                    onChange={(e) => setSearchEstudiante(e.target.value)}
                    className="pl-10 h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]"
                    aria-label="Buscar estudiantes"
                  />
                </div>

                {formData.estudiantesIds.length > 0 && (
                  <Alert className="rounded-xl border-blue-200 bg-blue-50">
                    <AlertDescription className="text-blue-800">
                      <strong>{formData.estudiantesIds.length} estudiante(s) seleccionado(s)</strong>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {filteredEstudiantes.length === 0 ? (
                    <p className="col-span-2 text-center text-muted py-8">
                      No se encontraron estudiantes
                    </p>
                  ) : (
                    filteredEstudiantes.map((estudiante) => (
                      <Card
                        key={estudiante.id}
                        className={`cursor-pointer transition-all app-panel ${
                          formData.estudiantesIds.includes(estudiante.id)
                            ? 'border-brand-300 bg-brand-50 shadow-sm'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleEstudiante(estudiante.id)}
                      >
                        <CardContent className="pt-4 flex items-center gap-3">
                          <Checkbox checked={formData.estudiantesIds.includes(estudiante.id)} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-ui">{displayName(estudiante)}</p>
                            <p className="text-sm text-muted truncate">{estudiante.email}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-ui">
                    <Music className="w-5 h-5 text-brand-600" />
                    Selecciona una Pieza
                  </h2>
                  <p className="text-sm text-muted mb-4">
                    Elige la pieza musical que se trabajará
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    placeholder="Buscar piezas..."
                    value={searchPieza}
                    onChange={(e) => setSearchPieza(e.target.value)}
                    className="pl-10 h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]"
                    aria-label="Buscar piezas"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {filteredPiezas.length === 0 ? (
                    <p className="col-span-2 text-center text-muted py-8">
                      No se encontraron piezas
                    </p>
                  ) : (
                    filteredPiezas.map((pieza) => (
                      <Card
                        key={pieza.id}
                        className={`cursor-pointer transition-all app-panel ${
                          formData.piezaId === pieza.id
                            ? 'border-brand-300 bg-brand-50 shadow-sm'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setFormData({ ...formData, piezaId: pieza.id })}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-ui">{pieza.nombre}</h4>
                            <Badge variant="outline" className="rounded-full">{pieza.nivel}</Badge>
                          </div>
                          {pieza.descripcion && (
                            <p className="text-sm text-muted line-clamp-2 mb-2">
                              {pieza.descripcion}
                            </p>
                          )}
                          <p className="text-xs text-muted">
                            {pieza.elementos?.length || 0} elementos
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {piezaSeleccionada && (
                  <Alert className="rounded-xl border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      ✅ Pieza seleccionada: <strong>{piezaSeleccionada.nombre}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-ui">
                    <BookOpen className="w-5 h-5 text-brand-600" />
                    Selecciona un Plan
                  </h2>
                  <p className="text-sm text-muted mb-4">
                    Elige el plan de estudio a seguir (puedes elegir cualquier plan)
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    placeholder="Buscar planes..."
                    value={searchPlan}
                    onChange={(e) => setSearchPlan(e.target.value)}
                    className="pl-10 h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]"
                    aria-label="Buscar planes"
                  />
                </div>

                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {filteredPlanes.length === 0 ? (
                    <p className="text-center text-muted py-8">
                      No hay planes (cambia filtros)
                    </p>
                  ) : (
                    filteredPlanes.map((plan) => (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all app-panel ${
                          formData.planId === plan.id
                            ? 'border-brand-300 bg-brand-50 shadow-sm'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setFormData({ ...formData, planId: plan.id })}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold mb-2 text-ui">{plan.nombre}</h4>
                              <div className="flex flex-wrap gap-2">
                                {plan.focoGeneral && (
                                  <Badge variant="outline" className="rounded-full">{focoLabels[plan.focoGeneral]}</Badge>
                                )}
                                <Badge variant="secondary" className="rounded-full">
                                  {plan.semanas?.length || 0} semanas
                                </Badge>
                              </div>
                              {plan.objetivoSemanalPorDefecto && (
                                <p className="text-sm text-muted mt-2 line-clamp-2">
                                  {plan.objetivoSemanalPorDefecto}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {planSeleccionado && (
                  <Alert className="rounded-xl border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      ✅ Plan seleccionado: <strong>{planSeleccionado.nombre}</strong> ({planSeleccionado.semanas?.length || 0} semanas)
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-ui">
                    <Calendar className="w-5 h-5 text-brand-600" />
                    Selecciona la Semana de Inicio
                  </h2>
                  <p className="text-sm text-muted mb-4">
                    Elige cualquier día; se guardará el lunes de esa semana ISO
                  </p>
                </div>

                <div>
                  <Label htmlFor="fecha">Fecha (cualquier día de la semana)</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fechaSeleccionada}
                    onChange={(e) => setFormData({ ...formData, fechaSeleccionada: e.target.value })}
                    className="max-w-md h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]"
                  />
                </div>

                {formData.fechaSeleccionada && formData.semanaInicioISO && (
                  <Alert className="rounded-xl border-blue-200 bg-blue-50 max-w-md">
                    <AlertDescription className="text-blue-800">
                      <strong>Fecha elegida:</strong> {parseLocalDate(formData.fechaSeleccionada).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      <br />
                      <strong>Semana ISO guardada:</strong> Del lunes {parseLocalDate(formData.semanaInicioISO).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} al domingo {parseLocalDate(getDomingoSemana(formData.semanaInicioISO)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                      <br />
                      {planSeleccionado && (
                        <span className="text-sm">
                          El plan durará {planSeleccionado.semanas?.length || 0} semanas
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-ui">
                    <Settings className="w-5 h-5 text-brand-600" />
                    Opciones Adicionales
                  </h2>
                  <p className="text-sm text-muted mb-4">
                    Configura opciones finales de la asignación
                  </p>
                </div>

                <div>
                  <Label htmlFor="foco">Foco Específico</Label>
                  <Select value={formData.foco} onValueChange={(v) => setFormData({ ...formData, foco: v })}>
                    <SelectTrigger className="h-10 rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]" aria-label="Seleccionar foco">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[120]" position="popper">
                      {Object.entries(focoLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted mt-1">Por defecto: General</p>
                </div>

                <div>
                  <Label htmlFor="notas">Notas para el Estudiante (Opcional)</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Instrucciones adicionales o notas..."
                    rows={4}
                    className="rounded-xl border-ui focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))] resize-none"
                  />
                </div>

                <div className="flex items-center space-x-2 p-4 border border-ui rounded-xl app-panel">
                  <Checkbox
                    id="publicar"
                    checked={formData.publicarAlTerminar}
                    onCheckedChange={(checked) => setFormData({ ...formData, publicarAlTerminar: checked })}
                  />
                  <div className="flex-1">
                    <Label htmlFor="publicar" className="cursor-pointer font-medium text-ui">
                      Publicar al terminar
                    </Label>
                    <p className="text-sm text-muted">
                      Si no se marca, las asignaciones se crearán como borradores
                    </p>
                  </div>
                </div>

                <Alert className="rounded-xl border-brand-200 bg-brand-50">
                  <AlertDescription className="text-brand-800">
                    <strong>Resumen:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>{formData.estudiantesIds.length} estudiante(s)</li>
                      <li>Pieza: {piezaSeleccionada?.nombre}</li>
                      <li>Plan: {planSeleccionado?.nombre} ({planSeleccionado?.semanas?.length || 0} semanas)</li>
                      <li>Inicio: {formData.semanaInicioISO && parseLocalDate(formData.semanaInicioISO).toLocaleDateString('es-ES')}</li>
                      <li>Foco: {focoLabels[formData.foco]}</li>
                      <li>Estado: {formData.publicarAlTerminar ? 'Publicada' : 'Borrador'}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>

          <div className="border-t border-ui px-6 py-4 bg-muted rounded-b-2xl">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => step === 1 ? onClose() : setStep(step - 1)}
                disabled={crearAsignacionesMutation.isPending}
                className="h-10 rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {step === 1 ? 'Cancelar' : 'Anterior'}
              </Button>

              {step < 5 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="btn-primary h-10 rounded-xl shadow-sm"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalizar}
                  disabled={crearAsignacionesMutation.isPending}
                  className="btn-primary h-10 rounded-xl shadow-sm"
                >
                  {crearAsignacionesMutation.isPending ? (
                    'Creando...'
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Crear Asignaciones
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

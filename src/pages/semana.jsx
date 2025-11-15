import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ds/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ds";
import { Badge } from "@/components/ds";
import { Alert, AlertDescription } from "@/components/ds";
import {
  Music, Calendar, Target, PlayCircle, MessageSquare,
  Layers,
  ChevronLeft, ChevronRight, Home, Clock, CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { calcularLunesSemanaISO, calcularOffsetSemanas, calcularTiempoSesion } from "../components/utils/helpers";
import { displayName } from "@/components/utils/helpers";
import WeekNavigator from "../components/common/WeekNavigator";
import RequireRole from "@/components/auth/RequireRole";

// --- Helpers de fechas locales ---
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

function SemanaPageContent() {
  const navigate = useNavigate();
  const [semanaActualISO, setSemanaActualISO] = useState(() => {
    return calcularLunesSemanaISO(new Date());
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.Asignacion.list(),
  });

  const { data: feedbacksSemanal = [] } = useQuery({
    queryKey: ['feedbacksSemanal'],
    queryFn: () => base44.entities.FeedbackSemanal.list('-created_date'),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const simulatingUser = sessionStorage.getItem('simulatingUser') ? 
    JSON.parse(sessionStorage.getItem('simulatingUser')) : null;
  
  const userIdActual = simulatingUser?.id || currentUser?.id;

  const asignacionActiva = asignaciones.find(a => {
    if (a.alumnoId !== userIdActual) return false;
    if (a.estado !== 'publicada' && a.estado !== 'en_curso') return false;
    const offset = calcularOffsetSemanas(a.semanaInicioISO, semanaActualISO);
    return offset >= 0 && offset < (a.plan?.semanas?.length || 0);
  });

  const semanaIdx = asignacionActiva ? 
    calcularOffsetSemanas(asignacionActiva.semanaInicioISO, semanaActualISO) : 0;

  const semanaDelPlan = asignacionActiva?.plan?.semanas?.[semanaIdx];

  const feedbackSemana = feedbacksSemanal.find(f => 
    f.alumnoId === userIdActual && f.semanaInicioISO === semanaActualISO
  );

  const cambiarSemana = (direccion) => {
    const base = parseLocalDate(semanaActualISO);
    base.setDate(base.getDate() + (direccion * 7));
    const lunes = startOfMonday(base);
    const nextISO = formatLocalDate(lunes);
    if (nextISO !== semanaActualISO) setSemanaActualISO(nextISO);
  };

  const irSemanaActual = () => {
    const lunes = startOfMonday(new Date());
    setSemanaActualISO(formatLocalDate(lunes));
  };

  const focoLabels = {
    GEN: 'General',
    LIG: 'Ligaduras',
    RIT: 'Ritmo',
    ART: 'Articulación',
    'S&A': 'Sonido y Afinación',
  };

  const focoColors = {
    GEN: 'bg-gray-100 text-gray-800',
    LIG: 'bg-blue-100 text-blue-800',
    RIT: 'bg-purple-100 text-purple-800',
    ART: 'bg-green-100 text-green-800',
    'S&A': 'bg-brand-100 text-brand-800',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b sticky top-0 z-10 shadow-card">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-tile">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-ui">Mi Semana</h1>
              <p className="text-sm text-muted hidden md:block">Resumen y planificación semanal</p>
            </div>
          </div>

          <WeekNavigator 
            mondayISO={semanaActualISO}
            onPrev={() => cambiarSemana(-1)}
            onNext={() => cambiarSemana(1)}
            onToday={irSemanaActual}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {!asignacionActiva || !semanaDelPlan ? (
          <Card className="border-dashed border-2">
            <CardContent className="text-center py-16">
              <Target className="w-20 h-20 mx-auto mb-4 icon-empty" />
              <h2 className="text-xl font-semibold text-ui mb-2">
                No tienes asignación esta semana
              </h2>
              <p className="text-sm text-muted mb-4">
                Consulta con tu profesor para obtener un plan de estudio
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(createPageUrl('hoy'))}
                className="h-10 rounded-xl shadow-sm focus-brand"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Ir a Estudiar Ahora
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-2 border-brand-200">
              <CardHeader>
                <div className="flex items-start md:items-center justify-between gap-3 flex-col md:flex-row">
                  <CardTitle className="text-lg md:text-xl">{semanaDelPlan.nombre}</CardTitle>
                  <Badge className={focoColors[semanaDelPlan.foco]}>
                    {focoLabels[semanaDelPlan.foco]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <Music className="w-5 h-5 text-[hsl(var(--brand-600))] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted text-xs">Pieza</p>
                    <p className="font-semibold text-ui break-words">{asignacionActiva.piezaSnapshot?.nombre}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 text-sm">
                  <Target className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-muted text-xs">Plan</p>
                    <p className="font-semibold text-ui break-words">{asignacionActiva.plan?.nombre}</p>
                  </div>
                </div>

                {semanaDelPlan.objetivo && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted mb-1">🎯 Objetivo de la semana</p>
                    <p className="text-sm md::text-base text-ui italic break-words">"{semanaDelPlan.objetivo}"</p>
                  </div>
                )}

                {feedbackSemana && feedbackSemana.notaProfesor && (
                  <div className="pt-3 border-t bg-blue-50 -mx-6 px-6 py-4 -mb-6">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      <p className="text-sm font-semibold text-blue-900">Feedback del profesor</p>
                    </div>
                    <p className="text-sm text-ui italic border-l-2 border-blue-300 pl-3 break-words">
                      "{feedbackSemana.notaProfesor}"
                    </p>
                    <p className="text-xs text-muted mt-2">
                      {(() => {
                        const prof = usuarios.find(u => u.id === feedbackSemana.profesorId);
                        return `Por ${displayName(prof)}`;
                      })()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Sesiones ({semanaDelPlan.sesiones?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {semanaDelPlan.sesiones && semanaDelPlan.sesiones.length > 0 ? (
                  semanaDelPlan.sesiones.map((sesion, idx) => {
                    const tiempoTotal = calcularTiempoSesion(sesion);
                    const minutos = Math.floor(tiempoTotal / 60);
                    const segundos = tiempoTotal % 60;
                    
                    return (
                      <Card key={idx} className="border-blue-200 bg-blue-50/30">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-start gap-2 flex-wrap">
                              <PlayCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                              <span className="font-semibold text-sm md:text-base flex-1 break-words">{sesion.nombre}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-800">
                                ⏱ {minutos}:{String(segundos).padStart(2, '0')} min
                              </Badge>
                              <Badge className={focoColors[sesion.foco]} variant="outline">
                                {focoLabels[sesion.foco]}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-muted">
                              <Layers className="w-3 h-3 shrink-0" />
                              <span>
                                {sesion.bloques?.length || 0} ejercicios
                                {sesion.rondas && sesion.rondas.length > 0 && `, ${sesion.rondas.length} rondas`}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <p className="text-center text-muted py-8 text-sm">No hay sesiones planificadas</p>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
              <Button
                variant="primary"
                onClick={() => navigate(createPageUrl('hoy'))}
                size="lg"
                className="w-full md:w-auto h-12 rounded-xl shadow-sm focus-brand"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                Ir a Estudiar Ahora
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SemanaPage() {
  return (
    <RequireRole anyOf={['ESTU']}>
      <SemanaPageContent />
    </RequireRole>
  );
}
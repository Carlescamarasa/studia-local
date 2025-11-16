
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ds";
import { Input } from "@/components/ui/input";
import {
  Target, Eye, Edit, Copy, Trash2, FileDown, Search, X, Plus, RotateCcw, XCircle, User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import RequireRole from "@/components/auth/RequireRole";
import UnifiedTable from "@/components/tables/UnifiedTable";
import FormularioRapido from "@/components/asignaciones/FormularioRapido";
import { getNombreVisible, formatLocalDate, parseLocalDate } from "../components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

export default function AsignacionesPage() {
  return (
    <RequireRole anyOf={['PROF', 'ADMIN']}>
      <AsignacionesPageContent />
    </RequireRole>
  );
}

function AsignacionesPageContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const currentUser = getCurrentUser();

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => base44.entities.Asignacion.list('-created_date'),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const cerrarMutation = useMutation({
    mutationFn: (id) => base44.entities.Asignacion.update(id, { estado: 'cerrada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación cerrada');
    },
  });

  const reabrirMutation = useMutation({
    mutationFn: (id) => base44.entities.Asignacion.update(id, { estado: 'publicada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación reabierta');
    },
  });

  const publicarMutation = useMutation({
    mutationFn: (id) => base44.entities.Asignacion.update(id, { estado: 'publicada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación publicada');
    },
  });

  const duplicarMutation = useMutation({
    mutationFn: async (asignacion) => {
      const newData = {
        alumnoId: asignacion.alumnoId,
        piezaId: asignacion.piezaId,
        semanaInicioISO: formatLocalDate(new Date()),
        estado: 'borrador',
        foco: asignacion.foco,
        notas: asignacion.notas,
        plan: JSON.parse(JSON.stringify(asignacion.plan)),
        piezaSnapshot: JSON.parse(JSON.stringify(asignacion.piezaSnapshot)),
        profesorId: currentUser.id,
      };
      return base44.entities.Asignacion.create(newData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación duplicada como borrador');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => base44.entities.Asignacion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación eliminada');
    },
  });

  const simularAlumno = (alumnoId) => {
    const alumno = usuarios.find(u => u.id === alumnoId);
    if (!alumno) return;

    sessionStorage.setItem('originalUser', JSON.stringify(currentUser));
    sessionStorage.setItem('simulatingUser', JSON.stringify(alumno));
    sessionStorage.setItem('originalPath', window.location.pathname);

    navigate(createPageUrl('hoy'), { replace: true });
    window.location.reload();
  };

  const exportarCSV = () => {
    const headers = ['Estudiante', 'Pieza', 'Plan', 'Inicio', 'Estado', 'Semanas'];
    const rows = asignacionesFiltradas.map(a => {
      const alumno = usuarios.find(u => u.id === a.alumnoId);
      return [
        getNombreVisible(alumno),
        a.piezaSnapshot?.nombre || '',
        a.plan?.nombre || '',
        a.semanaInicioISO,
        a.estado,
        a.plan?.semanas?.length || 0,
      ];
    });

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asignaciones_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  let asignacionesFiltradas = asignaciones;

  if (currentUser?.rolPersonalizado === 'PROF') {
    asignacionesFiltradas = asignacionesFiltradas.filter(a => a.profesorId === currentUser.id);
  }

  if (estadoFilter !== 'all') {
    asignacionesFiltradas = asignacionesFiltradas.filter(a => a.estado === estadoFilter);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    asignacionesFiltradas = asignacionesFiltradas.filter(a => {
      const alumno = usuarios.find(u => u.id === a.alumnoId);
      const nombreAlumno = getNombreVisible(alumno).toLowerCase();
      const pieza = (a.piezaSnapshot?.nombre || '').toLowerCase();
      return nombreAlumno.includes(term) || pieza.includes(term);
    });
  }

  const estadoLabels = {
    borrador: 'Borrador',
    publicada: 'Publicada',
    en_curso: 'En Curso',
    cerrada: 'Cerrada',
  };

  const estadoColors = {
    borrador: componentStyles.status.badgeDefault,
    publicada: componentStyles.status.badgeSuccess,
    en_curso: componentStyles.status.badgeInfo,
    cerrada: componentStyles.status.badgeWarning,
  };

  const columns = [
    {
      key: 'alumno',
      label: 'Estudiante',
      render: (a) => {
        const alumno = usuarios.find(u => u.id === a.alumnoId);
        return (
          <div>
            <p className="font-medium text-sm">{getNombreVisible(alumno)}</p>
          <p className="text-xs text-ui/80">{alumno?.email}</p>
          </div>
        );
      },
    },
    {
      key: 'pieza',
      label: 'Pieza',
      render: (a) => (
        <div>
          <p className="font-medium text-sm">{a.piezaSnapshot?.nombre}</p>
          <p className="text-xs text-ui/80">{a.piezaSnapshot?.nivel}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (a) => (
        <div>
          <p className="text-sm">{a.plan?.nombre}</p>
          <p className="text-xs text-ui/80">{a.plan?.semanas?.length || 0} semanas</p>
        </div>
      ),
    },
    {
      key: 'inicio',
      label: 'Inicio',
      render: (a) => (
        <p className="text-sm">{parseLocalDate(a.semanaInicioISO).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (a) => (
        <Badge className={`rounded-full ${estadoColors[a.estado]}`}>
          {estadoLabels[a.estado]}
        </Badge>
      ),
    },
  ];

  const isAdminOrProf = currentUser?.rolPersonalizado === 'ADMIN' || currentUser?.rolPersonalizado === 'PROF';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Target}
        title="Asignaciones"
        subtitle="Gestiona las asignaciones de tus estudiantes"
        actions={
          <Button onClick={() => setShowForm(!showForm)} className={componentStyles.buttons.primary}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva
          </Button>
        }
        filters={
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui/80" />
              <Input
                placeholder="Buscar estudiante o pieza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-9 pr-9 ${componentStyles.controls.inputDefault} focus-brand`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ui/80 hover:text-ui"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className={`w-40 ${componentStyles.controls.selectDefault}`}>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="borrador">Borradores</SelectItem>
                <SelectItem value="publicada">Publicadas</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="cerrada">Cerradas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={exportarCSV}
              className={componentStyles.buttons.outline}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:px-8 space-y-4">
        {showForm && (
          <Card className={componentStyles.containers.cardBase}>
            <CardContent className="pt-6">
              <FormularioRapido onClose={() => setShowForm(false)} />
            </CardContent>
          </Card>
        )}

        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle className="text-lg">
              {asignacionesFiltradas.length} asignaciones
              {estadoFilter !== 'all' && ` (${estadoLabels[estadoFilter]})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedTable
              columns={columns}
              data={asignacionesFiltradas}
              getRowActions={(a) => {
                const actions = [
                  {
                    id: 'view',
                    label: 'Ver detalle',
                    onClick: () => navigate(createPageUrl(`asignacion-detalle?id=${a.id}`)),
                  },
                  {
                    id: 'edit',
                    label: 'Adaptar plan',
                    onClick: () => navigate(createPageUrl(`adaptar-asignacion?id=${a.id}`)),
                  },
                ];

                if (a.estado === 'borrador') {
                  actions.push({
                    id: 'publish',
                    label: 'Publicar',
                    onClick: () => {
                      if (window.confirm('¿Publicar esta asignación?')) {
                        publicarMutation.mutate(a.id);
                      }
                    },
                  });
                }

                actions.push({
                  id: 'duplicate',
                  label: 'Duplicar',
                  onClick: () => {
                    if (window.confirm('¿Duplicar esta asignación como borrador?')) {
                      duplicarMutation.mutate(a);
                    }
                  },
                });

                if (a.estado === 'cerrada') {
                  actions.push({
                    id: 'reopen',
                    label: 'Reabrir',
                    onClick: () => {
                      if (window.confirm('¿Reabrir esta asignación?')) {
                        reabrirMutation.mutate(a.id);
                      }
                    },
                  });
                } else {
                  actions.push({
                    id: 'close',
                    label: 'Cerrar',
                    onClick: () => {
                      if (window.confirm('¿Cerrar esta asignación?')) {
                        cerrarMutation.mutate(a.id);
                      }
                    },
                  });
                }

                if (isAdminOrProf && a.alumnoId) {
                  const alumno = usuarios.find(u => u.id === a.alumnoId);
                  if (alumno) {
                    actions.push({
                      id: 'impersonate',
                      label: 'Ver como alumno',
                      onClick: () => {
                        sessionStorage.setItem('originalUser', JSON.stringify(currentUser));
                        sessionStorage.setItem('simulatingUser', JSON.stringify(alumno));
                        sessionStorage.setItem('originalPath', window.location.pathname);
                        navigate(createPageUrl('hoy'), { replace: true });
                        window.location.reload();
                      },
                    });
                  }
                }

                actions.push({
                  id: 'delete',
                  label: 'Eliminar',
                  destructive: true,
                  onClick: () => {
                    if (window.confirm('¿Eliminar permanentemente esta asignación?')) {
                      eliminarMutation.mutate(a.id);
                    }
                  },
                });

                return actions;
              }}
              onRowClick={(a) => navigate(createPageUrl(`asignacion-detalle?id=${a.id}`))}
              emptyMessage="No hay asignaciones"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

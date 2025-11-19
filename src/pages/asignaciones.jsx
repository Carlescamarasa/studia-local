
import React, { useState, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { getNombreVisible, formatLocalDate, parseLocalDate, useEffectiveUser, resolveUserIdActual } from "../components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelect from "@/components/ui/MultiSelect";
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
  const [profesoresFilter, setProfesoresFilter] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const effectiveUser = useEffectiveUser();

  const { data: asignacionesRaw = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list('-created_at'),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => localDataClient.entities.User.list(),
  });

  // Resolver ID de usuario actual de la BD (UUID en Supabase, string en local)
  // Usar useMemo para recalcular cuando usuarios cambie
  const userIdActual = useMemo(() => {
    return resolveUserIdActual(effectiveUser, usuarios);
  }, [effectiveUser, usuarios]);

  const asignaciones = useMemo(() => asignacionesRaw, [asignacionesRaw]);


  const cerrarMutation = useMutation({
    mutationFn: (id) => localDataClient.entities.Asignacion.update(id, { estado: 'cerrada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación cerrada');
    },
  });

  const reabrirMutation = useMutation({
    mutationFn: (id) => localDataClient.entities.Asignacion.update(id, { estado: 'publicada' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación reabierta');
    },
  });

  const publicarMutation = useMutation({
    mutationFn: (id) => localDataClient.entities.Asignacion.update(id, { estado: 'publicada' }),
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
        profesorId: userIdActual || effectiveUser.id,
      };
      return localDataClient.entities.Asignacion.create(newData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación duplicada como borrador');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => localDataClient.entities.Asignacion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Asignación eliminada');
    },
  });

  const exportarCSV = () => {
    const headers = ['Estudiante', 'Profesor', 'Pieza', 'Plan', 'Inicio', 'Estado', 'Semanas'];
    const rows = asignacionesFinales.map(a => {
      const alumno = usuarios.find(u => u.id === a.alumnoId);
      const profesor = usuarios.find(u => u.id === a.profesorId);
      return [
        getNombreVisible(alumno),
        getNombreVisible(profesor),
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

  // Todos los profesores pueden ver todas las asignaciones (no se filtra por profesor)
  // Solo se filtran por estado y búsqueda
  const asignacionesFiltradas = useMemo(() => {
    return asignaciones;
  }, [asignaciones]);

  // Obtener lista de profesores únicos de las asignaciones
  // Estrategia: obtener profesores de dos fuentes:
  // 1. IDs únicos de profesores en las asignaciones
  // 2. Todos los usuarios con rol PROF en la lista de usuarios
  // Esto asegura que siempre haya profesores disponibles incluso si hay desincronización de IDs
  const profesoresDisponibles = useMemo(() => {
    // Obtener IDs únicos de profesores en asignaciones
    const profesorIdsEnAsignaciones = [...new Set(asignacionesFiltradas.map(a => a.profesorId).filter(Boolean))];
    
    // Obtener todos los profesores de la lista de usuarios
    const todosLosProfesores = usuarios.filter(u => u.rolPersonalizado === 'PROF');
    
    // Crear un Set con todos los IDs únicos (de asignaciones + usuarios PROF)
    const todosLosIds = new Set([
      ...profesorIdsEnAsignaciones,
      ...todosLosProfesores.map(p => p.id).filter(Boolean)
    ]);
    
    // Mapear cada ID a un objeto { value, label }
    const profesoresMap = new Map();
    
    todosLosIds.forEach(id => {
      // Buscar el usuario en la lista
      const profesor = usuarios.find(u => u.id === id);
      if (profesor) {
        profesoresMap.set(id, {
          value: id,
          label: getNombreVisible(profesor),
        });
      }
    });
    
    // Convertir a array y ordenar alfabéticamente
    const profesores = Array.from(profesoresMap.values())
      .sort((a, b) => a.label.localeCompare(b.label));
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[asignaciones.jsx] Profesores disponibles:', {
        totalAsignaciones: asignacionesFiltradas.length,
        profesorIdsEnAsignaciones,
        totalProfesoresEnBD: todosLosProfesores.length,
        profesoresEnBD: todosLosProfesores.map(p => ({ id: p.id, nombre: getNombreVisible(p) })),
        totalProfesoresDisponibles: profesores.length,
        profesores: profesores.map(p => ({ id: p.value, nombre: p.label })),
      });
    }
    
    return profesores;
  }, [asignacionesFiltradas, usuarios]);

  // Aplicar filtros adicionales (estado, búsqueda y profesores)
  const asignacionesFinales = useMemo(() => {
    let resultado = asignacionesFiltradas;

    if (estadoFilter !== 'all') {
      resultado = resultado.filter(a => a.estado === estadoFilter);
    }

    if (profesoresFilter.length > 0) {
      resultado = resultado.filter(a => profesoresFilter.includes(a.profesorId));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(a => {
        const alumno = usuarios.find(u => u.id === a.alumnoId);
        const nombreAlumno = getNombreVisible(alumno).toLowerCase();
        const pieza = (a.piezaSnapshot?.nombre || '').toLowerCase();
        return nombreAlumno.includes(term) || pieza.includes(term);
      });
    }

    return resultado;
  }, [asignacionesFiltradas, estadoFilter, profesoresFilter, searchTerm, usuarios]);

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
      key: 'profesor',
      label: 'Profesor',
      render: (a) => {
        const profesor = usuarios.find(u => u.id === a.profesorId);
        return (
          <div>
            <p className="font-medium text-sm">{getNombreVisible(profesor)}</p>
            {profesor?.email && (
              <p className="text-xs text-ui/80">{profesor.email}</p>
            )}
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
      render: (a) => {
        if (!a.semanaInicioISO) {
          return <p className="text-sm text-ui/60">-</p>;
        }
        try {
          return <p className="text-sm">{parseLocalDate(a.semanaInicioISO).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>;
        } catch (error) {
          return <p className="text-sm text-ui/60">-</p>;
        }
      },
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

  const isAdminOrProf = effectiveUser?.rolPersonalizado === 'ADMIN' || effectiveUser?.rolPersonalizado === 'PROF';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Target}
        title="Asignaciones"
        subtitle="Gestiona las asignaciones de tus estudiantes"
        filters={
          <>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui/80" />
              <Input
                placeholder="Buscar estudiante o pieza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-9 ${componentStyles.controls.inputDefault}`}
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
              <SelectTrigger className={`w-full md:w-48 ${componentStyles.controls.selectDefault}`}>
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

            <MultiSelect
              label={profesoresFilter.length === 0 ? "Profesor (TODOS)" : "Profesor"}
              items={profesoresDisponibles}
              value={profesoresFilter}
              onChange={setProfesoresFilter}
            />
          </>
        }
        actions={
          <Button onClick={() => setShowForm(!showForm)} className={`w-full md:w-auto ${componentStyles.buttons.primary}`}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva
          </Button>
        }
      />

      <div className={`${componentStyles.layout.page} space-y-4`}>
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
              {asignacionesFinales.length} asignaciones
              {estadoFilter !== 'all' && ` (${estadoLabels[estadoFilter]})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedTable
              columns={columns}
              data={asignacionesFinales}
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
              emptyIcon={Target}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

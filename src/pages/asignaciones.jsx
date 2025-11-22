
import React, { useState, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ds";
import { Input } from "@/components/ui/input";
import {
  Target, Eye, Edit, Copy, Trash2, FileDown, Search, X, Plus, RotateCcw, XCircle, User, Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import RequireRole from "@/components/auth/RequireRole";
import UnifiedTable from "@/components/tables/UnifiedTable";
import FormularioRapido from "@/components/asignaciones/FormularioRapido";
import StudentSearchBar from "@/components/asignaciones/StudentSearchBar";
import { getNombreVisible, displayNameById, formatLocalDate, parseLocalDate, useEffectiveUser, resolveUserIdActual } from "../components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelect from "@/components/ui/MultiSelect";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  const [showAsignarProfesorDialog, setShowAsignarProfesorDialog] = useState(false);
  const [showAsignarEstudianteDialog, setShowAsignarEstudianteDialog] = useState(false);
  const [asignacionParaAsignar, setAsignacionParaAsignar] = useState(null);
  const [idsParaAsignar, setIdsParaAsignar] = useState(null);
  const [tipoAsignacion, setTipoAsignacion] = useState(null); // 'profesor' o 'estudiante'
  const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState('');

  const effectiveUser = useEffectiveUser();

  const { data: asignacionesRaw = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: () => localDataClient.entities.Asignacion.list('-created_at'),
  });

  // Query para obtener TODOS los usuarios (necesarios para otras partes del componente)
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

  const eliminarBulkMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => localDataClient.entities.Asignacion.delete(id)));
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success(`✅ ${ids.length} asignación${ids.length > 1 ? 'es' : ''} eliminada${ids.length > 1 ? 's' : ''}`);
    },
  });

  const cerrarBulkMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => localDataClient.entities.Asignacion.update(id, { estado: 'cerrada' })));
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success(`✅ ${ids.length} asignación${ids.length > 1 ? 'es' : ''} cerrada${ids.length > 1 ? 's' : ''}`);
    },
  });

  const duplicarBulkMutation = useMutation({
    mutationFn: async (ids) => {
      const asignacionesParaDuplicar = asignacionesFinales.filter(a => ids.includes(a.id));
      await Promise.all(asignacionesParaDuplicar.map(a => {
        const newData = {
          alumnoId: a.alumnoId,
          piezaId: a.piezaId,
          semanaInicioISO: formatLocalDate(new Date()),
          estado: 'borrador',
          foco: a.foco,
          notas: a.notas,
          plan: JSON.parse(JSON.stringify(a.plan)),
          piezaSnapshot: JSON.parse(JSON.stringify(a.piezaSnapshot)),
          profesorId: userIdActual || effectiveUser.id,
        };
        return localDataClient.entities.Asignacion.create(newData);
      }));
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success(`✅ ${ids.length} asignación${ids.length > 1 ? 'es' : ''} duplicada${ids.length > 1 ? 's' : ''}`);
    },
  });

  const asignarProfesorMutation = useMutation({
    mutationFn: async ({ id, profesorId }) => {
      return localDataClient.entities.Asignacion.update(id, { profesorId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Profesor asignado correctamente');
      setShowAsignarProfesorDialog(false);
      setAsignacionParaAsignar(null);
      setIdsParaAsignar(null);
      setProfesorSeleccionado('');
    },
  });

  const asignarProfesorBulkMutation = useMutation({
    mutationFn: async ({ ids, profesorId }) => {
      await Promise.all(ids.map(id => localDataClient.entities.Asignacion.update(id, { profesorId })));
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success(`✅ ${ids.length} asignación${ids.length > 1 ? 'es' : ''} asignada${ids.length > 1 ? 's' : ''} al profesor`);
      setShowAsignarProfesorDialog(false);
      setAsignacionParaAsignar(null);
      setIdsParaAsignar(null);
      setProfesorSeleccionado('');
    },
  });

  const asignarEstudianteMutation = useMutation({
    mutationFn: async ({ id, alumnoId }) => {
      return localDataClient.entities.Asignacion.update(id, { alumnoId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success('✅ Estudiante asignado correctamente');
      setShowAsignarEstudianteDialog(false);
      setAsignacionParaAsignar(null);
      setIdsParaAsignar(null);
      setEstudianteSeleccionado('');
    },
  });

  const asignarEstudianteBulkMutation = useMutation({
    mutationFn: async ({ ids, alumnoId }) => {
      await Promise.all(ids.map(id => localDataClient.entities.Asignacion.update(id, { alumnoId })));
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
      toast.success(`✅ ${ids.length} asignación${ids.length > 1 ? 'es' : ''} asignada${ids.length > 1 ? 's' : ''} al estudiante`);
      setShowAsignarEstudianteDialog(false);
      setAsignacionParaAsignar(null);
      setIdsParaAsignar(null);
      setEstudianteSeleccionado('');
    },
  });

  const handleAsignarProfesor = () => {
    if (!profesorSeleccionado) {
      toast.error('❌ Debes seleccionar un profesor');
      return;
    }

    if (idsParaAsignar) {
      asignarProfesorBulkMutation.mutate({ ids: idsParaAsignar, profesorId: profesorSeleccionado });
    } else if (asignacionParaAsignar) {
      asignarProfesorMutation.mutate({ id: asignacionParaAsignar, profesorId: profesorSeleccionado });
    }
  };

  const handleAsignarEstudiante = () => {
    if (!estudianteSeleccionado) {
      toast.error('❌ Debes seleccionar un estudiante');
      return;
    }

    if (idsParaAsignar) {
      asignarEstudianteBulkMutation.mutate({ ids: idsParaAsignar, alumnoId: estudianteSeleccionado });
    } else if (asignacionParaAsignar) {
      asignarEstudianteMutation.mutate({ id: asignacionParaAsignar, alumnoId: estudianteSeleccionado });
    }
  };

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

  // Obtener lista de estudiantes disponibles (TODOS los estudiantes para el modal de cambiar estudiante)
  // Query: SELECT * FROM profiles WHERE role = 'ESTU'
  const estudiantesDisponibles = useMemo(() => {
    const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');
    const result = estudiantes
      .map(e => ({
        value: e.id,
        label: `${getNombreVisible(e)}${e.email ? ` (${e.email})` : ''}`.trim(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    
    if (process.env.NODE_ENV === 'development' && usuarios.length > 0) {
      console.log('[Modal Cambiar Estudiante] SELECT * FROM profiles WHERE role = \'ESTU\' →', result.length, 'estudiantes');
    }
    
    return result;
  }, [usuarios]);

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
        // Si no se encuentra el usuario, intentar obtener nombre por ID usando displayNameById
        const nombreAlumno = alumno 
          ? getNombreVisible(alumno) 
          : (a.alumnoId ? displayNameById(a.alumnoId) : 'Sin nombre');
        return (
          <div>
            <p className="font-medium text-sm">{nombreAlumno}</p>
            <p className="text-xs text-ui/80">{alumno?.email || ''}</p>
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

      <div className={`${componentStyles.layout.page} space-y-6`}>
        {showForm && (
          <FormularioRapido 
            onClose={() => setShowForm(false)}
          />
        )}

        <Card className={componentStyles.containers.cardBase}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {asignacionesFinales.length} asignacion{asignacionesFinales.length !== 1 ? 'es' : ''}
                {estadoFilter !== 'all' && (
                  <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
                    ({estadoLabels[estadoFilter]})
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <UnifiedTable
              columns={columns}
              data={asignacionesFinales}
              selectable={true}
              paginated={true}
              defaultPageSize={10}
              keyField="id"
              bulkActions={[
                {
                  id: 'assign-profesor',
                  label: 'Cambiar profesor',
                  icon: User,
                  onClick: (ids) => {
                    setIdsParaAsignar(ids);
                    setAsignacionParaAsignar(null);
                    setTipoAsignacion('profesor');
                    setProfesorSeleccionado('');
                    setShowAsignarProfesorDialog(true);
                  },
                },
                {
                  id: 'assign-estudiante',
                  label: 'Cambiar estudiante',
                  icon: Users,
                  onClick: (ids) => {
                    setIdsParaAsignar(ids);
                    setAsignacionParaAsignar(null);
                    setTipoAsignacion('estudiante');
                    setEstudianteSeleccionado('');
                    setShowAsignarEstudianteDialog(true);
                  },
                },
                {
                  id: 'duplicate',
                  label: 'Duplicar',
                  icon: Copy,
                  onClick: (ids) => {
                    if (window.confirm(`¿Duplicar ${ids.length} asignación${ids.length > 1 ? 'es' : ''} como borradores?`)) {
                      duplicarBulkMutation.mutate(ids);
                    }
                  },
                },
                {
                  id: 'close',
                  label: 'Cerrar',
                  icon: XCircle,
                  onClick: (ids) => {
                    if (window.confirm(`¿Cerrar ${ids.length} asignación${ids.length > 1 ? 'es' : ''}?`)) {
                      cerrarBulkMutation.mutate(ids);
                    }
                  },
                },
                {
                  id: 'delete',
                  label: 'Eliminar',
                  icon: Trash2,
                  onClick: (ids) => {
                    if (window.confirm(`¿Eliminar permanentemente ${ids.length} asignación${ids.length > 1 ? 'es' : ''}?`)) {
                      eliminarBulkMutation.mutate(ids);
                    }
                  },
                },
                {
                  id: 'export',
                  label: 'Exportar CSV',
                  icon: FileDown,
                  onClick: (ids) => {
                    const asignacionesSeleccionadas = asignacionesFinales.filter(a => ids.includes(a.id));
                    const headers = ['Estudiante', 'Profesor', 'Pieza', 'Plan', 'Inicio', 'Estado', 'Semanas'];
                    const rows = asignacionesSeleccionadas.map(a => {
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
                    toast.success(`✅ ${ids.length} asignación${ids.length > 1 ? 'es' : ''} exportada${ids.length > 1 ? 's' : ''}`);
                  },
                },
              ]}
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
                  {
                    id: 'assign-profesor',
                    label: 'Cambiar profesor',
                    icon: <User className="w-4 h-4" />,
                    onClick: () => {
                      setAsignacionParaAsignar(a.id);
                      setIdsParaAsignar(null);
                      setTipoAsignacion('profesor');
                      setProfesorSeleccionado(a.profesorId || '');
                      setShowAsignarProfesorDialog(true);
                    },
                  },
                  {
                    id: 'assign-estudiante',
                    label: 'Cambiar estudiante',
                    icon: <Users className="w-4 h-4" />,
                    onClick: () => {
                      setAsignacionParaAsignar(a.id);
                      setIdsParaAsignar(null);
                      setTipoAsignacion('estudiante');
                      setEstudianteSeleccionado(a.alumnoId || '');
                      setShowAsignarEstudianteDialog(true);
                    },
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

      <Dialog open={showAsignarProfesorDialog} onOpenChange={setShowAsignarProfesorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {idsParaAsignar ? `Cambiar profesor de ${idsParaAsignar.length} asignación${idsParaAsignar.length > 1 ? 'es' : ''}` : 'Cambiar profesor'}
            </DialogTitle>
            <DialogDescription>
              Selecciona el profesor al que quieres asignar {idsParaAsignar ? 'estas asignaciones' : 'esta asignación'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="profesor-select">Profesor</Label>
              <Select value={profesorSeleccionado} onValueChange={setProfesorSeleccionado}>
                <SelectTrigger id="profesor-select" className={`w-full ${componentStyles.controls.selectDefault}`}>
                  <SelectValue placeholder="Selecciona un profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profesoresDisponibles.map((profesor) => (
                    <SelectItem key={profesor.value} value={profesor.value}>
                      {profesor.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAsignarProfesorDialog(false);
                setAsignacionParaAsignar(null);
                setIdsParaAsignar(null);
                setProfesorSeleccionado('');
              }}
              className={componentStyles.buttons.outline}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAsignarProfesor}
              disabled={asignarProfesorMutation.isPending || asignarProfesorBulkMutation.isPending || !profesorSeleccionado}
              className={componentStyles.buttons.primary}
            >
              {asignarProfesorMutation.isPending || asignarProfesorBulkMutation.isPending ? 'Asignando...' : 'Cambiar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAsignarEstudianteDialog} onOpenChange={setShowAsignarEstudianteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {idsParaAsignar ? `Cambiar estudiante de ${idsParaAsignar.length} asignación${idsParaAsignar.length > 1 ? 'es' : ''}` : 'Cambiar estudiante'}
            </DialogTitle>
            <DialogDescription>
              Selecciona el estudiante al que quieres asignar {idsParaAsignar ? 'estas asignaciones' : 'esta asignación'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="estudiante-select">Estudiante</Label>
              <StudentSearchBar
                items={estudiantesDisponibles}
                value={estudianteSeleccionado ? [estudianteSeleccionado] : []}
                onChange={(vals) => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[asignaciones.jsx] Modal cambiar estudiante - onChange:', { vals, selected: vals.length > 0 ? vals[0] : '' });
                  }
                  setEstudianteSeleccionado(vals.length > 0 ? vals[0] : '');
                }}
                placeholder="Buscar estudiante por nombre..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAsignarEstudianteDialog(false);
                setAsignacionParaAsignar(null);
                setIdsParaAsignar(null);
                setEstudianteSeleccionado('');
              }}
              className={componentStyles.buttons.outline}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAsignarEstudiante}
              disabled={asignarEstudianteMutation.isPending || asignarEstudianteBulkMutation.isPending || !estudianteSeleccionado}
              className={componentStyles.buttons.primary}
            >
              {asignarEstudianteMutation.isPending || asignarEstudianteBulkMutation.isPending ? 'Asignando...' : 'Cambiar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, X, FileDown, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RequireRole from "@/components/auth/RequireRole";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { getNombreVisible, useEffectiveUser } from "../components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import PerfilModal from "@/components/common/PerfilModal";
import { CreateUserModal } from "@/pages/auth/components/CreateUserModal";
import FormField from "@/components/ds/FormField";
import { InviteUserModal } from "@/pages/auth/components/InviteUserModal";
import { useUserActions } from "@/pages/auth/hooks/useUserActions";
import { Mail, KeyRound, UserPlus as UserPlusIcon, User, Target, Send, Eye, BarChart3, Pause, Play, MoreVertical, Users as UsersIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import MultiSelect from "@/components/ui/MultiSelect";

function UsuariosPageContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [profesorFilter, setProfesorFilter] = useState('all');
  const [nivelFilter, setNivelFilter] = useState('all');
  const [profesorAsignadoFilter, setProfesorAsignadoFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isInviteUserModalOpen, setIsInviteUserModalOpen] = useState(false);
  const [isAssignProfesorDialogOpen, setIsAssignProfesorDialogOpen] = useState(false);
  const [userForAssignProfesor, setUserForAssignProfesor] = useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
  const [isBulkAssignProfesorDialogOpen, setIsBulkAssignProfesorDialogOpen] = useState(false);
  const [isBulkAssignAlumnosDialogOpen, setIsBulkAssignAlumnosDialogOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [profesorSeleccionadoBulk, setProfesorSeleccionadoBulk] = useState('');
  const [estudiantesSeleccionadosBulk, setEstudiantesSeleccionadosBulk] = useState([]);
  const [profesorParaAsignarAlumnos, setProfesorParaAsignarAlumnos] = useState(null);

  const effectiveUser = useEffectiveUser();
  const { sendMagicLink, sendResetPassword, resendInvitation, isLoading: isActionLoading } = useUserActions();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const users = await localDataClient.entities.User.list();
      return users;
    },
    staleTime: 0, // No usar caché, siempre obtener datos frescos
    cacheTime: 0, // No mantener en caché
  });

  // Invalidar query al montar el componente para asegurar datos frescos
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

  // Handler para cuando se crea un usuario exitosamente
  const handleUserCreated = () => {
    // Invalidar queries para refrescar la lista
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['profesores'] });
  };

  // Mutation para asignar profesor (individual)
  const assignProfesorMutation = useMutation({
    mutationFn: async ({ userId, profesorId }) => {
      return localDataClient.entities.User.update(userId, {
        profesorAsignadoId: profesorId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Profesor asignado correctamente');
      setIsAssignProfesorDialogOpen(false);
      setUserForAssignProfesor(null);
      setProfesorSeleccionado('');
    },
    onError: (error) => {
      toast.error(error.message || 'Error al asignar profesor');
    },
  });

  // Mutation para asignar profesor (masivo)
  const assignProfesorBulkMutation = useMutation({
    mutationFn: async ({ userIds, profesorId }) => {
      await Promise.all(userIds.map(userId => 
        localDataClient.entities.User.update(userId, {
          profesorAsignadoId: profesorId || null,
        })
      ));
    },
    onSuccess: (_, { userIds }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`✅ ${userIds.length} estudiante${userIds.length > 1 ? 's' : ''} asignado${userIds.length > 1 ? 's' : ''} correctamente`);
      setIsBulkAssignProfesorDialogOpen(false);
      setBulkSelectedIds([]);
      setProfesorSeleccionadoBulk('');
    },
    onError: (error) => {
      toast.error(error.message || 'Error al asignar profesor');
    },
  });

  // Mutation para asignar alumnos a profesor (masivo)
  const assignAlumnosToProfesorMutation = useMutation({
    mutationFn: async ({ profesorId, alumnoIds }) => {
      await Promise.all(alumnoIds.map(alumnoId => 
        localDataClient.entities.User.update(alumnoId, {
          profesorAsignadoId: profesorId,
        })
      ));
    },
    onSuccess: (_, { alumnoIds }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`✅ ${alumnoIds.length} estudiante${alumnoIds.length > 1 ? 's' : ''} asignado${alumnoIds.length > 1 ? 's' : ''} correctamente`);
      setIsBulkAssignAlumnosDialogOpen(false);
      setProfesorParaAsignarAlumnos(null);
      setEstudiantesSeleccionadosBulk([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al asignar estudiantes');
    },
  });

  // Mutation para pausar/reanudar usuario
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }) => {
      return localDataClient.entities.User.update(userId, {
        isActive: isActive,
      });
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`✅ Usuario ${isActive ? 'activado' : 'pausado'} correctamente`);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al cambiar estado del usuario');
    },
  });

  // Mutation para pausar/reanudar usuarios (masivo)
  const toggleActiveBulkMutation = useMutation({
    mutationFn: async ({ userIds, isActive }) => {
      await Promise.all(userIds.map(userId => 
        localDataClient.entities.User.update(userId, {
          isActive: isActive,
        })
      ));
    },
    onSuccess: (_, { userIds, isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`✅ ${userIds.length} usuario${userIds.length > 1 ? 's' : ''} ${isActive ? 'activado' : 'pausado'}${userIds.length > 1 ? 's' : ''} correctamente`);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al cambiar estado de los usuarios');
    },
  });

  // Mutation para enviar magic link masivo
  const sendMagicLinkBulkMutation = useMutation({
    mutationFn: async ({ userIds, emails }) => {
      await Promise.all(emails.map((email, idx) => 
        sendMagicLink(userIds[idx], email)
      ));
    },
    onSuccess: (_, { userIds }) => {
      toast.success(`✅ Enlace mágico enviado a ${userIds.length} usuario${userIds.length > 1 ? 's' : ''}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al enviar enlaces mágicos');
    },
  });

  // Mutation para enviar reset password masivo
  const sendResetPasswordBulkMutation = useMutation({
    mutationFn: async ({ userIds, emails }) => {
      await Promise.all(emails.map((email, idx) => 
        sendResetPassword(userIds[idx], email)
      ));
    },
    onSuccess: (_, { userIds }) => {
      toast.success(`✅ Email de recuperación enviado a ${userIds.length} usuario${userIds.length > 1 ? 's' : ''}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al enviar emails de recuperación');
    },
  });

  const handleAssignProfesor = () => {
    if (!profesorSeleccionado) {
      toast.error('Debes seleccionar un profesor');
      return;
    }

    if (userForAssignProfesor) {
      assignProfesorMutation.mutate({
        userId: userForAssignProfesor.id,
        profesorId: profesorSeleccionado === 'none' ? null : profesorSeleccionado,
      });
    }
  };

  const exportarCSV = () => {
    const headers = ['Nombre', 'Email', 'Rol', 'Profesor Asignado'];
    const rows = usuariosFiltrados.map(u => {
      const profe = usuarios.find(p => p.id === u.profesorAsignadoId);
      return [
        getNombreVisible(u),
        u.email,
        roleLabels[u.rolPersonalizado] || 'Estudiante',
        profe ? getNombreVisible(profe) : '',
      ];
    });

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  let usuariosFiltrados = usuarios;

  if (roleFilter !== 'all') {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.rolPersonalizado === roleFilter);
  }

  if (profesorFilter !== 'all') {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.profesorAsignadoId === profesorFilter);
  }

  if (nivelFilter !== 'all') {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.nivel === nivelFilter);
  }

  if (profesorAsignadoFilter !== 'all') {
    if (profesorAsignadoFilter === 'with') {
      usuariosFiltrados = usuariosFiltrados.filter(u => u.profesorAsignadoId !== null && u.profesorAsignadoId !== undefined);
    } else if (profesorAsignadoFilter === 'without') {
      usuariosFiltrados = usuariosFiltrados.filter(u => !u.profesorAsignadoId);
    }
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    usuariosFiltrados = usuariosFiltrados.filter(u => {
      const nombre = getNombreVisible(u).toLowerCase();
      const email = (u.email || '').toLowerCase();
      return nombre.includes(term) || email.includes(term);
    });
  }

  const profesores = usuarios.filter(u => u.rolPersonalizado === 'PROF');

  const roleLabels = {
    ADMIN: 'Administrador',
    PROF: 'Profesor',
    ESTU: 'Estudiante',
  };

  const roleVariants = {
    ADMIN: 'danger',
    PROF: 'info',
    ESTU: 'success',
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Usuario',
      render: (u) => {
        const isActive = u.isActive !== false && u.is_active !== false;
        return (
          <div className={!isActive ? 'opacity-60' : ''}>
            <p className="font-medium text-sm">{getNombreVisible(u)}</p>
            <p className="text-xs text-ui/80">{u.email}</p>
          </div>
        );
      },
    },
    {
      key: 'rol',
      label: 'Rol',
      render: (u) => {
        return (
          <Badge variant={roleVariants[u.rolPersonalizado] || roleVariants.ESTU}>
            {roleLabels[u.rolPersonalizado] || 'Estudiante'}
          </Badge>
        );
      },
    },
    {
      key: 'profesor',
      label: 'Profesor',
      render: (u) => {
        const profe = usuarios.find(p => p.id === u.profesorAsignadoId);
        return profe ? (
          <p className="text-sm">{getNombreVisible(profe)}</p>
        ) : (
          <span className="text-xs text-ui/80">-</span>
        );
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (u) => {
        const isActive = u.isActive !== false && u.is_active !== false;
        return (
          <Badge variant={isActive ? 'success' : 'default'}>
            {isActive ? 'Activo' : 'Pausado'}
          </Badge>
        );
      },
    },
  ];

  const isAdminOrProf = effectiveUser?.rolPersonalizado === 'ADMIN' || effectiveUser?.rolPersonalizado === 'PROF';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Users}
        title="Usuarios"
        subtitle="Gestiona usuarios del sistema"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => setIsInviteUserModalOpen(true)}
              variant="outline"
              className={componentStyles.buttons.secondary}
            >
              <Send className="w-4 h-4 mr-2" />
              Invitar usuario
            </Button>
            <Button
              onClick={() => setIsCreateUserModalOpen(true)}
              className={componentStyles.buttons.primary}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Crear usuario
            </Button>
          </div>
        }
        filters={
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui/80" />
              <Input
                placeholder="Buscar usuario..."
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
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className={`w-40 ${componentStyles.controls.selectDefault}`}>
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="ADMIN">Administradores</SelectItem>
                <SelectItem value="PROF">Profesores</SelectItem>
                <SelectItem value="ESTU">Estudiantes</SelectItem>
              </SelectContent>
            </Select>

            {roleFilter === 'ESTU' && profesores.length > 0 && (
              <Select value={profesorFilter} onValueChange={setProfesorFilter}>
                <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                  <SelectValue placeholder="Profesor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los profesores</SelectItem>
                  {profesores.map(p => (
                    <SelectItem key={p.id} value={p.id}>{getNombreVisible(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {roleFilter === 'ESTU' && (
              <Select value={nivelFilter} onValueChange={setNivelFilter}>
                <SelectTrigger className={`w-40 ${componentStyles.controls.selectDefault}`}>
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  <SelectItem value="principiante">Principiante</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzado">Avanzado</SelectItem>
                  <SelectItem value="profesional">Profesional</SelectItem>
                </SelectContent>
              </Select>
            )}

            {roleFilter === 'ESTU' && (
              <Select value={profesorAsignadoFilter} onValueChange={setProfesorAsignadoFilter}>
                <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                  <SelectValue placeholder="Profesor asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Con profesor</SelectItem>
                  <SelectItem value="without">Sin profesor</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      <div className={componentStyles.layout.page}>
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle className="text-lg">{usuariosFiltrados.length} usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedTable
              columns={columns}
              data={usuariosFiltrados}
              selectable={true}
              bulkActions={[
                {
                  id: 'assign_profesor_bulk',
                  label: 'Asignar profesor',
                  icon: User,
                  onClick: (ids) => {
                    const usuariosSeleccionados = usuariosFiltrados.filter(u => ids.includes(u.id));
                    const usuariosESTU = usuariosSeleccionados.filter(u => u.rolPersonalizado === 'ESTU');
                    if (usuariosESTU.length > 0) {
                      setBulkSelectedIds(usuariosESTU.map(u => u.id));
                      setProfesorSeleccionadoBulk('');
                      setIsBulkAssignProfesorDialogOpen(true);
                    } else {
                      toast.error('Solo puedes asignar profesor a estudiantes');
                    }
                  },
                },
                {
                  id: 'send_magic_link_bulk',
                  label: 'Enviar enlace mágico',
                  icon: Mail,
                  onClick: (ids) => {
                    const usuariosSeleccionados = usuariosFiltrados.filter(u => ids.includes(u.id));
                    const usuariosConEmail = usuariosSeleccionados.filter(u => u.email);
                    if (usuariosConEmail.length > 0) {
                      const userIds = usuariosConEmail.map(u => u.id);
                      const emails = usuariosConEmail.map(u => u.email);
                      sendMagicLinkBulkMutation.mutate({ userIds, emails });
                    } else {
                      toast.error('Los usuarios seleccionados no tienen email');
                    }
                  },
                },
                {
                  id: 'send_reset_password_bulk',
                  label: 'Enviar reset password',
                  icon: KeyRound,
                  onClick: (ids) => {
                    const usuariosSeleccionados = usuariosFiltrados.filter(u => ids.includes(u.id));
                    const usuariosConEmail = usuariosSeleccionados.filter(u => u.email);
                    if (usuariosConEmail.length > 0) {
                      const userIds = usuariosConEmail.map(u => u.id);
                      const emails = usuariosConEmail.map(u => u.email);
                      sendResetPasswordBulkMutation.mutate({ userIds, emails });
                    } else {
                      toast.error('Los usuarios seleccionados no tienen email');
                    }
                  },
                },
                {
                  id: 'pause_bulk',
                  label: 'Pausar acceso',
                  icon: Pause,
                  onClick: (ids) => {
                    const usuariosSeleccionados = usuariosFiltrados.filter(u => ids.includes(u.id));
                    const usuariosActivos = usuariosSeleccionados.filter(u => (u.isActive !== false && u.is_active !== false));
                    if (usuariosActivos.length > 0) {
                      const userIds = usuariosActivos.map(u => u.id);
                      toggleActiveBulkMutation.mutate({ userIds, isActive: false });
                    } else {
                      toast.error('No hay usuarios activos seleccionados');
                    }
                  },
                },
                {
                  id: 'resume_bulk',
                  label: 'Reanudar acceso',
                  icon: Play,
                  onClick: (ids) => {
                    const usuariosSeleccionados = usuariosFiltrados.filter(u => ids.includes(u.id));
                    const usuariosPausados = usuariosSeleccionados.filter(u => (u.isActive === false || u.is_active === false));
                    if (usuariosPausados.length > 0) {
                      const userIds = usuariosPausados.map(u => u.id);
                      toggleActiveBulkMutation.mutate({ userIds, isActive: true });
                    } else {
                      toast.error('No hay usuarios pausados seleccionados');
                    }
                  },
                },
                {
                  id: 'export',
                  label: 'Exportar CSV',
                  icon: FileDown,
                  onClick: (ids) => {
                    const usuariosSeleccionados = usuariosFiltrados.filter(u => ids.includes(u.id));
                    const headers = ['Nombre', 'Email', 'Rol', 'Profesor Asignado', 'Estado'];
                    const rows = usuariosSeleccionados.map(u => {
                      const profe = usuarios.find(p => p.id === u.profesorAsignadoId);
                      const isActive = u.isActive !== false && u.is_active !== false;
                      return [
                        getNombreVisible(u),
                        u.email,
                        roleLabels[u.rolPersonalizado] || 'Estudiante',
                        profe ? getNombreVisible(profe) : '',
                        isActive ? 'Activo' : 'Pausado',
                      ];
                    });
                    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                    toast.success(`✅ ${ids.length} usuario${ids.length > 1 ? 's' : ''} exportado${ids.length > 1 ? 's' : ''}`);
                  },
                },
              ]}
              getRowActions={(u) => {
                const actions = [
                  {
                    id: 'edit',
                    label: 'Editar perfil',
                    onClick: () => {
                      setSelectedUserId(u.id);
                      setIsPerfilModalOpen(true);
                    },
                  },
                ];

                // Añadir acciones de email solo para usuarios con email
                if (u.email) {
                  actions.push(
                    {
                      id: 'reset_password',
                      label: 'Enviar recuperación de contraseña',
                      icon: <KeyRound className="w-4 h-4" />,
                      onClick: async () => {
                        try {
                          await sendResetPassword(u.id, u.email);
                        } catch (error) {
                          // Error ya manejado en el hook
                        }
                      },
                    },
                    {
                      id: 'magic_link',
                      label: 'Enviar enlace mágico (excepcional)',
                      icon: <Mail className="w-4 h-4" />,
                      onClick: async () => {
                        try {
                          await sendMagicLink(u.id, u.email);
                        } catch (error) {
                          // Error ya manejado en el hook
                        }
                      },
                    }
                  );
                }

                // Acciones para estudiantes
                if (u.rolPersonalizado === 'ESTU') {
                  actions.push(
                    {
                      id: 'assign_profesor',
                      label: 'Asignar / cambiar profesor',
                      icon: <User className="w-4 h-4" />,
                      onClick: () => {
                        setUserForAssignProfesor(u);
                        setProfesorSeleccionado(u.profesorAsignadoId || '');
                        setIsAssignProfesorDialogOpen(true);
                      },
                    },
                    {
                      id: 'create_asignacion',
                      label: 'Crear nueva asignación',
                      icon: <Target className="w-4 h-4" />,
                      onClick: () => {
                        navigate(createPageUrl(`asignaciones?estudianteId=${u.id}`));
                      },
                    },
                    {
                      id: 'view_asignaciones',
                      label: 'Ver asignaciones',
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => {
                        navigate(createPageUrl(`asignaciones?alumno_id=${u.id}`));
                      },
                    },
                    {
                      id: 'view_estadisticas',
                      label: 'Ver estadísticas',
                      icon: <BarChart3 className="w-4 h-4" />,
                      onClick: () => {
                        navigate(createPageUrl(`estadisticas?alumno_id=${u.id}`));
                      },
                    }
                  );
                }

                // Acciones para profesores
                if (u.rolPersonalizado === 'PROF') {
                  actions.push(
                    {
                      id: 'assign_alumnos',
                      label: 'Asignar alumnos',
                      icon: <UsersIcon className="w-4 h-4" />,
                      onClick: () => {
                        setProfesorParaAsignarAlumnos(u);
                        setEstudiantesSeleccionadosBulk([]);
                        setIsBulkAssignAlumnosDialogOpen(true);
                      },
                    },
                    {
                      id: 'view_estudiantes',
                      label: 'Ver estudiantes asignados',
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => {
                        navigate(createPageUrl(`estudiantes?profesor_id=${u.id}`));
                      },
                    },
                    {
                      id: 'view_estadisticas',
                      label: 'Ver estadísticas de sus alumnos',
                      icon: <BarChart3 className="w-4 h-4" />,
                      onClick: () => {
                        navigate(createPageUrl(`estadisticas?profesor_id=${u.id}`));
                      },
                    }
                  );
                }

                // Acción para pausar/reanudar acceso (todos los roles)
                const isActive = u.isActive !== false && u.is_active !== false;
                actions.push({
                  id: 'toggle_active',
                  label: isActive ? 'Pausar acceso' : 'Reanudar acceso',
                  icon: isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />,
                  onClick: () => {
                    toggleActiveMutation.mutate({ 
                      userId: u.id, 
                      isActive: !isActive 
                    });
                  },
                });

                return actions;
              }}
              onRowClick={(u) => {
                setSelectedUserId(u.id);
                setIsPerfilModalOpen(true);
              }}
              emptyMessage="No hay usuarios"
              emptyIcon={Users}
            />
          </CardContent>
        </Card>
      </div>

      <PerfilModal
        open={isPerfilModalOpen}
        onOpenChange={(open) => {
          setIsPerfilModalOpen(open);
          if (!open) {
            setSelectedUserId(null);
          }
        }}
        userId={selectedUserId}
      />

      <CreateUserModal
        open={isCreateUserModalOpen}
        onOpenChange={setIsCreateUserModalOpen}
        onSuccess={handleUserCreated}
      />

      <InviteUserModal
        open={isInviteUserModalOpen}
        onOpenChange={setIsInviteUserModalOpen}
        onSuccess={handleUserCreated}
      />

      {/* Dialog para asignar profesor */}
      <Dialog open={isAssignProfesorDialogOpen} onOpenChange={setIsAssignProfesorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar profesor</DialogTitle>
            <DialogDescription>
              Selecciona un profesor para {userForAssignProfesor ? (getNombreVisible(userForAssignProfesor) || userForAssignProfesor.email) : 'este estudiante'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FormField label="Profesor">
              <Select
                value={profesorSeleccionado || undefined}
                onValueChange={(value) => setProfesorSeleccionado(value === 'none' ? '' : value)}
                disabled={assignProfesorMutation.isPending}
              >
                <SelectTrigger className={componentStyles.controls.selectDefault}>
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {profesores.map(prof => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {getNombreVisible(prof)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignProfesorDialogOpen(false)}
              disabled={assignProfesorMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignProfesor}
              className={componentStyles.buttons.primary}
              loading={assignProfesorMutation.isPending}
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para asignar profesor masivo */}
      <Dialog open={isBulkAssignProfesorDialogOpen} onOpenChange={setIsBulkAssignProfesorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar profesor</DialogTitle>
            <DialogDescription>
              Selecciona un profesor para asignar a {bulkSelectedIds.length} estudiante{bulkSelectedIds.length > 1 ? 's' : ''} seleccionado{bulkSelectedIds.length > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FormField label="Profesor">
              <Select
                value={profesorSeleccionadoBulk || undefined}
                onValueChange={(value) => setProfesorSeleccionadoBulk(value === 'none' ? '' : value)}
                disabled={assignProfesorBulkMutation.isPending}
              >
                <SelectTrigger className={componentStyles.controls.selectDefault}>
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {profesores.map(prof => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {getNombreVisible(prof)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBulkAssignProfesorDialogOpen(false);
                setBulkSelectedIds([]);
                setProfesorSeleccionadoBulk('');
              }}
              disabled={assignProfesorBulkMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!profesorSeleccionadoBulk) {
                  toast.error('Debes seleccionar un profesor');
                  return;
                }
                assignProfesorBulkMutation.mutate({ 
                  userIds: bulkSelectedIds, 
                  profesorId: profesorSeleccionadoBulk === 'none' ? null : profesorSeleccionadoBulk 
                });
              }}
              className={componentStyles.buttons.primary}
              loading={assignProfesorBulkMutation.isPending}
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para asignar alumnos a profesor */}
      <Dialog open={isBulkAssignAlumnosDialogOpen} onOpenChange={setIsBulkAssignAlumnosDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar alumnos</DialogTitle>
            <DialogDescription>
              Selecciona los estudiantes que quieres asignar a {profesorParaAsignarAlumnos ? (getNombreVisible(profesorParaAsignarAlumnos) || profesorParaAsignarAlumnos.email) : 'este profesor'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FormField label="Estudiantes">
              <MultiSelect
                items={usuarios
                  .filter(u => u.rolPersonalizado === 'ESTU')
                  .map(e => ({
                    value: e.id,
                    label: `${getNombreVisible(e)}${e.email ? ` (${e.email})` : ''}`.trim(),
                  }))}
                value={estudiantesSeleccionadosBulk}
                onChange={setEstudiantesSeleccionadosBulk}
                placeholder="Buscar estudiantes..."
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBulkAssignAlumnosDialogOpen(false);
                setProfesorParaAsignarAlumnos(null);
                setEstudiantesSeleccionadosBulk([]);
              }}
              disabled={assignAlumnosToProfesorMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!profesorParaAsignarAlumnos) {
                  toast.error('Error: no hay profesor seleccionado');
                  return;
                }
                if (estudiantesSeleccionadosBulk.length === 0) {
                  toast.error('Debes seleccionar al menos un estudiante');
                  return;
                }
                assignAlumnosToProfesorMutation.mutate({ 
                  profesorId: profesorParaAsignarAlumnos.id, 
                  alumnoIds: estudiantesSeleccionadosBulk 
                });
              }}
              className={componentStyles.buttons.primary}
              loading={assignAlumnosToProfesorMutation.isPending}
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <RequireRole anyOf={['ADMIN']}>
      <UsuariosPageContent />
    </RequireRole>
  );
}
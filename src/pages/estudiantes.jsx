import React, { useState, useEffect, useMemo } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { getNombreVisible, useEffectiveUser, resolveUserIdActual } from "../components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import PerfilModal from "@/components/common/PerfilModal";
import { useUserActions } from "@/pages/auth/hooks/useUserActions";
import { Mail, KeyRound, UserPlus as UserPlusIcon } from "lucide-react";

function EstudiantesPageContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [nivelFilter, setNivelFilter] = useState('all');
  const [showAllStudents, setShowAllStudents] = useState(false); // Por defecto solo mis estudiantes
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);

  const effectiveUser = useEffectiveUser();
  const { sendMagicLink, sendResetPassword, resendInvitation } = useUserActions();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const users = await localDataClient.entities.User.list();
      return users;
    },
    staleTime: 0,
    cacheTime: 0,
  });

  const { data: asignaciones = [] } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: async () => {
      const asignaciones = await localDataClient.entities.Asignacion.list();
      return asignaciones;
    },
    staleTime: 0,
    cacheTime: 0,
  });

  // Invalidar query al montar el componente
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
  }, [queryClient]);

  // Resolver ID de usuario actual (puede ser UUID de Supabase o ID de BD)
  const userIdActual = useMemo(() => {
    return resolveUserIdActual(effectiveUser, usuarios);
  }, [effectiveUser, usuarios]);

  // Filtrar estudiantes del profesor actual
  // Incluir estudiantes que tienen:
  // 1. profesorAsignadoId === userIdActual
  // 2. O que tienen asignaciones con profesorId === userIdActual
  const misEstudiantes = useMemo(() => {
    if (!userIdActual) return [];
    
    // Obtener IDs de estudiantes que tienen asignaciones con este profesor
    const estudiantesIdsDeAsignaciones = new Set(
      asignaciones
        .filter(a => a.profesorId === userIdActual)
        .map(a => a.alumnoId)
    );
    
    // Filtrar estudiantes
    return usuarios.filter(u => {
      if (u.rolPersonalizado !== 'ESTU') return false;
      
      // Incluir si tiene profesorAsignadoId o si tiene asignaciones
      return u.profesorAsignadoId === userIdActual || estudiantesIdsDeAsignaciones.has(u.id);
    });
  }, [usuarios, asignaciones, userIdActual]);

  // Todos los estudiantes (sin filtrar por profesor)
  const todosLosEstudiantes = useMemo(() => {
    return usuarios.filter(u => u.rolPersonalizado === 'ESTU');
  }, [usuarios]);

  // Crear mapa de profesores para obtener nombres rápidamente
  const profesoresMap = useMemo(() => {
    const map = new Map();
    usuarios
      .filter(u => u.rolPersonalizado === 'PROF' || u.rolPersonalizado === 'ADMIN')
      .forEach(prof => {
        map.set(prof.id, getNombreVisible(prof));
      });
    return map;
  }, [usuarios]);

  // Aplicar filtros adicionales
  // Si showAllStudents es true, usar todosLosEstudiantes, sino usar misEstudiantes
  let estudiantesFiltrados = showAllStudents ? todosLosEstudiantes : misEstudiantes;

  if (nivelFilter !== 'all') {
    estudiantesFiltrados = estudiantesFiltrados.filter(u => u.nivel === nivelFilter);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    estudiantesFiltrados = estudiantesFiltrados.filter(u => {
      const nombre = getNombreVisible(u).toLowerCase();
      const email = (u.email || '').toLowerCase();
      return nombre.includes(term) || email.includes(term);
    });
  }

  const columns = [
    {
      key: 'nombre',
      label: 'Estudiante',
      render: (u) => (
        <div>
          <p className="font-medium text-sm">{getNombreVisible(u)}</p>
          <p className="text-xs text-ui/80">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'profesor',
      label: 'Profesor',
      render: (u) => {
        const profesorId = u.profesorAsignadoId;
        if (!profesorId) {
          return <span className="text-xs text-ui/80">-</span>;
        }
        const profesorNombre = profesoresMap.get(profesorId);
        return (
          <span className="text-sm text-[var(--color-text-primary)]">
            {profesorNombre || '-'}
          </span>
        );
      },
      sortValue: (u) => {
        const profesorId = u.profesorAsignadoId;
        if (!profesorId) return '';
        return profesoresMap.get(profesorId) || '';
      },
    },
    {
      key: 'nivel',
      label: 'Nivel',
      render: (u) => {
        const nivelLabels = {
          principiante: 'Principiante',
          intermedio: 'Intermedio',
          avanzado: 'Avanzado',
          profesional: 'Profesional',
        };
        return u.nivel ? (
          <Badge variant="info">{nivelLabels[u.nivel] || u.nivel}</Badge>
        ) : (
          <span className="text-xs text-ui/80">-</span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Users}
        title="Mis Estudiantes"
        subtitle="Gestiona y visualiza información de tus estudiantes"
        filters={
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui/80" />
              <Input
                placeholder="Buscar estudiante..."
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

            <Button
              variant={showAllStudents ? "outline" : "default"}
              onClick={() => setShowAllStudents(!showAllStudents)}
              className={showAllStudents ? componentStyles.buttons.secondary : componentStyles.buttons.primary}
            >
              {showAllStudents ? "Mis estudiantes" : "Ver todos"}
            </Button>
          </div>
        }
      />

      <div className={componentStyles.layout.page}>
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle className="text-lg">{estudiantesFiltrados.length} estudiante{estudiantesFiltrados.length !== 1 ? 's' : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedTable
              columns={columns}
              data={estudiantesFiltrados}
              selectable={true}
              bulkActions={[
                {
                  label: 'Enviar enlace mágico',
                  icon: Mail,
                  onClick: async (selectedIds) => {
                    console.log('[BulkAction] IDs seleccionados:', selectedIds);
                    console.log('[BulkAction] Estudiantes filtrados:', estudiantesFiltrados.map(u => ({ id: u.id, email: u.email })));
                    
                    const estudiantesSeleccionados = estudiantesFiltrados.filter(u => selectedIds.includes(u.id));
                    console.log('[BulkAction] Estudiantes encontrados:', estudiantesSeleccionados.map(u => ({ id: u.id, email: u.email })));
                    
                    const conEmail = estudiantesSeleccionados.filter(u => u.email);
                    
                    if (conEmail.length === 0) {
                      toast.error('Ninguno de los estudiantes seleccionados tiene email');
                      return;
                    }

                    let successCount = 0;
                    let errorCount = 0;

                    for (const estudiante of conEmail) {
                      try {
                        console.log('[BulkAction] Enviando magic link a:', { id: estudiante.id, email: estudiante.email });
                        await sendMagicLink(estudiante.id, estudiante.email);
                        successCount++;
                      } catch (error) {
                        console.error('[BulkAction] Error enviando magic link:', error);
                        errorCount++;
                      }
                    }

                    if (successCount > 0) {
                      toast.success(`${successCount} enlace${successCount !== 1 ? 's' : ''} mágico${successCount !== 1 ? 's' : ''} enviado${successCount !== 1 ? 's' : ''}`);
                    }
                    if (errorCount > 0) {
                      toast.error(`${errorCount} error${errorCount !== 1 ? 'es' : ''} al enviar`);
                    }
                  },
                },
                {
                  label: 'Enviar recuperación de contraseña',
                  icon: KeyRound,
                  onClick: async (selectedIds) => {
                    console.log('[BulkAction] IDs seleccionados:', selectedIds);
                    console.log('[BulkAction] Estudiantes filtrados:', estudiantesFiltrados.map(u => ({ id: u.id, email: u.email })));
                    
                    const estudiantesSeleccionados = estudiantesFiltrados.filter(u => selectedIds.includes(u.id));
                    console.log('[BulkAction] Estudiantes encontrados:', estudiantesSeleccionados.map(u => ({ id: u.id, email: u.email })));
                    
                    const conEmail = estudiantesSeleccionados.filter(u => u.email);
                    
                    if (conEmail.length === 0) {
                      toast.error('Ninguno de los estudiantes seleccionados tiene email');
                      return;
                    }

                    let successCount = 0;
                    let errorCount = 0;

                    for (const estudiante of conEmail) {
                      try {
                        console.log('[BulkAction] Enviando reset password a:', { id: estudiante.id, email: estudiante.email });
                        await sendResetPassword(estudiante.id, estudiante.email);
                        successCount++;
                      } catch (error) {
                        console.error('[BulkAction] Error enviando reset password:', error);
                        errorCount++;
                      }
                    }

                    if (successCount > 0) {
                      toast.success(`${successCount} email${successCount !== 1 ? 's' : ''} de recuperación enviado${successCount !== 1 ? 's' : ''}`);
                    }
                    if (errorCount > 0) {
                      toast.error(`${errorCount} error${errorCount !== 1 ? 'es' : ''} al enviar`);
                    }
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
                // Estas acciones coinciden con las bulk actions disponibles
                if (u.email) {
                  actions.push(
                    {
                      id: 'magic_link',
                      label: 'Enviar enlace mágico',
                      icon: Mail,
                      onClick: async () => {
                        try {
                          await sendMagicLink(u.id, u.email);
                          toast.success('Enlace mágico enviado correctamente');
                        } catch (error) {
                          // Error ya manejado en el hook
                        }
                      },
                    },
                    {
                      id: 'reset_password',
                      label: 'Enviar recuperación de contraseña',
                      icon: KeyRound,
                      onClick: async () => {
                        try {
                          await sendResetPassword(u.id, u.email);
                          toast.success('Email de recuperación enviado correctamente');
                        } catch (error) {
                          // Error ya manejado en el hook
                        }
                      },
                    },
                    {
                      id: 'resend_invitation',
                      label: 'Reenviar invitación',
                      icon: UserPlusIcon,
                      onClick: async () => {
                        try {
                          await resendInvitation(u.id, u.email);
                        } catch (error) {
                          // Error ya manejado en el hook
                        }
                      },
                    }
                  );
                }

                return actions;
              }}
              onRowClick={(u) => {
                setSelectedUserId(u.id);
                setIsPerfilModalOpen(true);
              }}
              emptyMessage={showAllStudents ? "No hay estudiantes" : "No tienes estudiantes asignados"}
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
    </div>
  );
}

export default function EstudiantesPage() {
  return (
    <RequireRole anyOf={['PROF', 'ADMIN']}>
      <EstudiantesPageContent />
    </RequireRole>
  );
}

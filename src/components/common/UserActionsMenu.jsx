/**
 * UserActionsMenu - Dropdown menu with user actions based on role permissions
 * 
 * Actions available per role:
 * - Editar perfil: ADMIN, PROF
 * - Enviar recuperación contraseña: ADMIN only
 * - Enviar enlace mágico: ADMIN only  
 * - Asignar/cambiar profesor: ADMIN only (for students)
 * - Crear nueva asignación: ADMIN, PROF
 * - Preparar estudiante: ADMIN, PROF
 * - Ver estadísticas: ADMIN, PROF
 * - Pausar acceso: ADMIN only
 * - Eliminar usuario: ADMIN only
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { MoreVertical, Pencil, KeyRound, Mail, User, Target, Eye, BarChart3, Pause, Play, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { localDataClient } from "@/api/localDataClient";
import { setProfileActive } from "@/api/remoteDataAPI";
import { sendPasswordResetAdmin } from "@/api/userAdmin";
import { useUserActions } from "@/features/auth/hooks/useUserActions";
import { getNombreVisible } from "@/components/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { ROUTES, toProgreso } from "@/lib/routes";
import PerfilModal from "@/components/common/PerfilModal";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function UserActionsMenu({ user, usuarios = [], onRefresh, compact = false }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const effectiveUser = useEffectiveUser();
    const { sendMagicLink } = useUserActions();

    const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAssignProfesorDialogOpen, setIsAssignProfesorDialogOpen] = useState(false);
    const [profesorSeleccionado, setProfesorSeleccionado] = useState(user?.profesorAsignadoId || '');

    const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
    const isProf = effectiveUser?.rolPersonalizado === 'PROF';
    const isStudent = user?.rolPersonalizado === 'ESTU';
    const isActive = user?.isActive !== false && user?.is_active !== false;

    // Profesores disponibles para asignar
    const profesores = usuarios.filter(u => u.rolPersonalizado === 'PROF');

    // Mutations
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ userId, isActive }) => {
            await setProfileActive(userId, isActive);
            return { success: true };
        },
        onSuccess: (_, { isActive }) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success(`✅ Usuario ${isActive ? 'activado' : 'pausado'} correctamente`);
            onRefresh?.();
        },
        onError: (error) => toast.error(error.message),
    });

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
            onRefresh?.();
        },
        onError: (error) => toast.error(error.message),
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('No hay sesión activa');

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
                },
                body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar usuario');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Usuario eliminado correctamente');
            setIsDeleteDialogOpen(false);
            onRefresh?.();
        },
        onError: (error) => toast.error(error.message),
    });

    // Build actions list based on permissions
    const actions = [];

    // Editar perfil - ADMIN and PROF
    if (isAdmin || isProf) {
        actions.push({
            id: 'edit',
            label: 'Editar perfil',
            icon: <Pencil className="w-4 h-4" />,
            onClick: () => setIsPerfilModalOpen(true),
        });
    }

    // Email actions - ADMIN only
    if (isAdmin && user?.email) {
        actions.push({
            id: 'reset_password',
            label: 'Enviar recuperación de contraseña',
            icon: <KeyRound className="w-4 h-4" />,
            onClick: async () => {
                try {
                    await sendPasswordResetAdmin(user.email);
                    toast.success('Email de recuperación enviado');
                } catch (error) {
                    toast.error(error.message);
                }
            },
        });

        actions.push({
            id: 'magic_link',
            label: 'Enviar enlace mágico (excepcional)',
            icon: <Mail className="w-4 h-4" />,
            onClick: async () => {
                try {
                    await sendMagicLink(user.id, user.email);
                } catch (error) {
                    // Error handled in hook
                }
            },
        });
    }

    // Student-specific actions
    if (isStudent) {
        // Asignar profesor - ADMIN only
        if (isAdmin) {
            actions.push({
                id: 'assign_profesor',
                label: 'Asignar / cambiar profesor',
                icon: <User className="w-4 h-4" />,
                onClick: () => {
                    setProfesorSeleccionado(user.profesorAsignadoId || '');
                    setIsAssignProfesorDialogOpen(true);
                },
            });
        }

        // Crear asignación - ADMIN and PROF
        if (isAdmin || isProf) {
            actions.push({
                id: 'create_asignacion',
                label: 'Crear nueva asignación',
                icon: <Target className="w-4 h-4" />,
                onClick: () => {
                    navigate(`${ROUTES.CUADERNO}?tab=asignaciones&action=new&alumnoId=${user.id}`);
                },
            });

            actions.push({
                id: 'view_asignaciones',
                label: 'Ver asignaciones',
                icon: <BookOpen className="w-4 h-4" />,
                onClick: () => {
                    navigate(`${ROUTES.CUADERNO}?tab=asignaciones&alumnoId=${user.id}`);
                },
            });

            actions.push({
                id: 'preparar',
                label: 'Preparar estudiante',
                icon: <Eye className="w-4 h-4" />,
                onClick: () => {
                    // Include parameter to pre-select the student
                    navigate(`${ROUTES.CUADERNO}?tab=estudiantes&alumnoId=${user.id}`);
                },
            });

            actions.push({
                id: 'view_estadisticas',
                label: 'Ver estadísticas',
                icon: <BarChart3 className="w-4 h-4" />,
                onClick: () => {
                    navigate(`${toProgreso('resumen')}&students=${user.id}`);
                },
            });
        }
    }

    // Pausar/reanudar acceso - ADMIN only
    if (isAdmin) {
        actions.push({
            id: 'toggle_active',
            label: isActive ? 'Pausar acceso' : 'Reanudar acceso',
            icon: isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />,
            onClick: () => {
                toggleActiveMutation.mutate({ userId: user.id, isActive: !isActive });
            },
        });
    }

    // Eliminar usuario - ADMIN only (not self)
    if (isAdmin && user.id !== effectiveUser?.id) {
        actions.push({
            id: 'delete_user',
            label: 'Eliminar usuario',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setIsDeleteDialogOpen(true),
        });
    }

    if (actions.length === 0) return null;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="btn-ghost h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-xl focus-brand min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 touch-manipulation"
                        aria-label="Abrir menú de acciones"
                        title="Más opciones"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[200]">
                    {actions.map((action, index) => (
                        <DropdownMenuItem
                            key={action.id || index}
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className="cursor-pointer focus-brand"
                        >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Perfil Modal */}
            <PerfilModal
                open={isPerfilModalOpen}
                onOpenChange={setIsPerfilModalOpen}
                userId={user?.id}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente a {getNombreVisible(user)}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Assign Profesor Dialog */}
            <Dialog open={isAssignProfesorDialogOpen} onOpenChange={setIsAssignProfesorDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Asignar profesor a {getNombreVisible(user)}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="profesor-select">Profesor</Label>
                        <Select value={profesorSeleccionado} onValueChange={setProfesorSeleccionado}>
                            <SelectTrigger id="profesor-select" className="mt-2">
                                <SelectValue placeholder="Selecciona un profesor..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin profesor</SelectItem>
                                {profesores.map((prof) => (
                                    <SelectItem key={prof.id} value={prof.id}>
                                        {getNombreVisible(prof)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignProfesorDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                assignProfesorMutation.mutate({
                                    userId: user.id,
                                    profesorId: profesorSeleccionado === 'none' ? null : profesorSeleccionado,
                                });
                            }}
                        >
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

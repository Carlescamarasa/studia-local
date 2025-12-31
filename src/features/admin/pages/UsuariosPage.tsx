/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from "react";
import { Users, Search, X, FileDown, UserPlus, Send, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { useUsers } from "@/features/shared/hooks/useUsers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { useUserActions } from "@/features/auth/hooks/useUserActions";
import { inviteUserByEmail, sendPasswordResetAdmin } from "@/api/userAdmin";
import { createPageUrl } from "@/utils";
import { componentStyles } from "@/design/componentStyles";
import { getNombreVisible } from "@/features/shared/utils/helpers";

import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import RequireRole from "@/features/auth/components/RequireRole";
import PerfilModal from "@/features/shared/components/common/PerfilModal";
import { CreateUserModal } from "@/features/auth/components/CreateUserModal";
import { InviteUserModal } from "@/features/auth/components/InviteUserModal";

import { userService, User } from "../services/userService";
import UserTable from "../components/UserTable";
import UserModals from "../components/UserModals";

/**
 * UsuariosPage - Core user management orchestrator
 */
export default function UsuariosPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { effectiveRole, realRole, realUserId, startImpersonation } = useEffectiveUser();
    const { sendMagicLink } = useUserActions();

    // -- STATE --
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [estadoFilter, setEstadoFilter] = useState('all');

    // Modals & Dialogs State
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [isInviteUserModalOpen, setIsInviteUserModalOpen] = useState(false);

    const [modalsState, setModalsState] = useState({
        assignProfesor: { open: false, user: null as User | null, bulkIds: [] as string[] },
        assignAlumnos: { open: false, profesor: null as User | null },
        deleteUser: { open: false, users: [] as User[] }
    });

    // -- DATA FETCHING --
    const { data: usuarios = [], isLoading } = useUsers();

    // -- MUTATIONS --
    const refreshData = () => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['profesores'] });
    };

    const toggleActiveMutation = useMutation({
        mutationFn: ({ userId, isActive }: { userId: string, isActive: boolean }) =>
            userService.setUserActive(userId, isActive),
        onSuccess: (_, { isActive }) => {
            refreshData();
            toast.success(`Usuario ${isActive ? 'activado' : 'pausado'} correctamente`);
        },
        onError: (error: any) => toast.error(error.message || 'Error al cambiar estado')
    });

    // -- HELPERS --
    const handleAssignProfesor = async (userIds: string[], profesorId: string | null) => {
        try {
            await userService.bulkAssignProfesor(userIds, profesorId);
            refreshData();
            toast.success(`${userIds.length} estudiante(s) asignado(s) correctamente`);
        } catch (error: any) {
            toast.error(error.message || 'Error al asignar profesor');
        }
    };

    const handleAssignAlumnos = async (profesorId: string, alumnoIds: string[]) => {
        try {
            await userService.bulkAssignProfesor(alumnoIds, profesorId);
            refreshData();
            toast.success(`${alumnoIds.length} estudiante(s) asignado(s) correctamente`);
        } catch (error: any) {
            toast.error(error.message || 'Error al asignar estudiantes');
        }
    };

    const handleDeleteUsers = async (userIds: string[]) => {
        try {
            await userService.bulkDeleteUsers(userIds);
            refreshData();
            toast.success(`${userIds.length} usuario(s) eliminado(s) correctamente`);
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar usuario(s)');
        }
    };

    const handleBulkExport = (ids: string[]) => {
        const selectedUsers = usuarios.filter((u: any) => ids.includes(u.id));
        const headers = ['Nombre', 'Email', 'Rol', 'Estado'];
        const rows = selectedUsers.map((u: any) => [
            getNombreVisible(u),
            u.email,
            u.rolPersonalizado || u.role || 'ESTU',
            (u.isActive !== false && u.is_active !== false) ? 'Activo' : 'Pausado'
        ]);

        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Exportados ${ids.length} usuarios`);
    };

    // -- FILTERING LOGIC --
    const filteredUsers = useMemo(() => {
        return (usuarios as User[]).filter(u => {
            const role = u.rolPersonalizado || u.role || 'ESTU';
            const isActive = u.isActive !== false && u.is_active !== false;

            // Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const name = getNombreVisible(u).toLowerCase();
                const email = (u.email || '').toLowerCase();
                if (!name.includes(term) && !email.includes(term)) return false;
            }

            // Filters
            if (roleFilter !== 'all' && role !== roleFilter) return false;

            if (estadoFilter !== 'all') {
                if (estadoFilter === 'activo' && !isActive) return false;
                if (estadoFilter === 'bloqueado' && isActive) return false;
                if (estadoFilter === 'invitacion_pendiente' && (u.isActive !== null && u.isActive !== undefined)) return false;
            }

            return true;
        });
    }, [usuarios, searchTerm, roleFilter, estadoFilter]);

    return (
        <RequireRole anyOf={['ADMIN']}>
            <div className="min-h-screen bg-background">
                <PageHeader
                    icon={Users}
                    title="Usuarios"
                    subtitle="Gestiona alumnos, profesores y admins"
                />

                <div className="studia-section">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center mb-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Input
                                placeholder="Buscar usuario…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={componentStyles.controls.inputDefault}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="h-9 w-[110px] text-xs rounded-xl">
                                    <SelectValue placeholder="Rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Rol</SelectItem>
                                    <SelectItem value="ESTU">Alumno</SelectItem>
                                    <SelectItem value="PROF">Profesor</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                                <SelectTrigger className="h-9 w-[130px] text-xs rounded-xl">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Estado</SelectItem>
                                    <SelectItem value="activo">Activo</SelectItem>
                                    <SelectItem value="invitacion_pendiente">Pendiente</SelectItem>
                                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                onClick={() => setIsInviteUserModalOpen(true)}
                                variant="outline"
                                size="sm"
                                className={componentStyles.buttons?.outline}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Invitar
                            </Button>
                            <Button
                                onClick={() => setIsCreateUserModalOpen(true)}
                                variant="primary"
                                size="sm"
                                className={componentStyles.buttons?.primary}
                            >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Crear
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <Card className={`${componentStyles.containers.cardBase} compact-card shadow-sm border-border/50`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold">{filteredUsers.length} usuarios encontrados</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <UserTable
                                users={filteredUsers}
                                realUserId={realUserId}
                                realRole={realRole}
                                onEdit={(u) => {
                                    setSelectedUserId(u.id);
                                    setIsPerfilModalOpen(true);
                                }}
                                onAssignProfesor={(u) => setModalsState(prev => ({
                                    ...prev,
                                    assignProfesor: { open: true, user: u, bulkIds: [] }
                                }))}
                                onAssignAlumnos={(u) => setModalsState(prev => ({
                                    ...prev,
                                    assignAlumnos: { open: true, profesor: u }
                                }))}
                                onDelete={(u) => setModalsState(prev => ({
                                    ...prev,
                                    deleteUser: { open: true, users: Array.isArray(u) ? u : [u] }
                                }))}
                                onImpersonate={(u) => {
                                    const name = getNombreVisible(u);
                                    startImpersonation(u.id, u.role || 'ESTU', name, u.email);
                                    toast.success(`Ahora ves como ${name}`);
                                }}
                                onNavigate={(path) => navigate(createPageUrl(path))}
                                toggleActiveMutation={toggleActiveMutation}
                                bulkActions={{
                                    onBulkAssignProfesor: (ids) => setModalsState(prev => ({
                                        ...prev,
                                        assignProfesor: { open: true, user: null, bulkIds: ids }
                                    })),
                                    onBulkSendMagicLink: async (ids) => {
                                        const usersWithEmail = filteredUsers.filter(u => ids.includes(u.id) && u.email);
                                        await Promise.allSettled(usersWithEmail.map(u => sendMagicLink(u.id, u.email)));
                                        toast.success('Enlaces mágicos procesados');
                                    },
                                    onBulkSendResetPassword: async (ids) => {
                                        const emails = filteredUsers.filter(u => ids.includes(u.id) && u.email).map(u => u.email);
                                        await userService.bulkSendPasswordReset(emails);
                                        toast.success('Emails de recuperación enviados');
                                    },
                                    onBulkToggleActive: async (ids, active) => {
                                        await userService.bulkSetUserActive(ids, active);
                                        refreshData();
                                        toast.success('Acceso de usuarios actualizado');
                                    },
                                    onBulkExport: handleBulkExport
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Modals */}
                <PerfilModal
                    open={isPerfilModalOpen}
                    onOpenChange={setIsPerfilModalOpen}
                    userId={selectedUserId as any}
                />

                <CreateUserModal
                    open={isCreateUserModalOpen}
                    onOpenChange={setIsCreateUserModalOpen}
                    onSuccess={refreshData}
                />

                <InviteUserModal
                    open={isInviteUserModalOpen}
                    onOpenChange={setIsInviteUserModalOpen}
                    onSuccess={refreshData}
                />

                <UserModals
                    users={usuarios as User[]}
                    assignProfesorState={{
                        open: modalsState.assignProfesor.open,
                        setOpen: (open) => setModalsState(prev => ({ ...prev, assignProfesor: { ...prev.assignProfesor, open } })),
                        user: modalsState.assignProfesor.user,
                        bulkIds: modalsState.assignProfesor.bulkIds
                    }}
                    onAssignProfesor={handleAssignProfesor}
                    assignAlumnosState={{
                        open: modalsState.assignAlumnos.open,
                        setOpen: (open) => setModalsState(prev => ({ ...prev, assignAlumnos: { ...prev.assignAlumnos, open } })),
                        profesor: modalsState.assignAlumnos.profesor
                    }}
                    onAssignAlumnos={handleAssignAlumnos}
                    deleteUserState={{
                        open: modalsState.deleteUser.open,
                        setOpen: (open) => setModalsState(prev => ({ ...prev, deleteUser: { ...prev.deleteUser, open } })),
                        users: modalsState.deleteUser.users
                    }}
                    onDeleteUsers={handleDeleteUsers}
                />
            </div>
        </RequireRole>
    );
}

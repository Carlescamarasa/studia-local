import React from 'react';
import { Badge } from "@/features/shared/components/ds";
import UnifiedTable from "@/features/shared/components/tables/UnifiedTable";
import { User, UserRole, userService } from '../services/userService';
import { getNombreVisible } from "@/features/shared/utils/helpers";
import { Pencil, Send, KeyRound, Mail, User as UserIcon, Target, Eye, BarChart3, Pause, Play, Trash2, UserCheck, Users as UsersIcon } from "lucide-react";
import { toast } from 'sonner';

interface UserTableProps {
    users: User[];
    realUserId: string | null;
    realRole: string | null;
    onEdit: (user: User) => void;
    onAssignProfesor: (user: User) => void;
    onAssignAlumnos: (user: User) => void;
    onDelete: (user: User | User[]) => void;
    onImpersonate: (user: User) => void;
    onNavigate: (path: string) => void;
    toggleActiveMutation: any; // Simplified for now
    bulkActions: {
        onBulkAssignProfesor: (ids: string[]) => void;
        onBulkSendMagicLink: (ids: string[]) => void;
        onBulkSendResetPassword: (ids: string[]) => void;
        onBulkToggleActive: (ids: string[], active: boolean) => void;
        onBulkExport: (ids: string[]) => void;
    };
}

const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    PROF: 'Profesor',
    ESTU: 'Estudiante',
};

const roleVariants: Record<string, any> = {
    ADMIN: 'outline',
    PROF: 'outline',
    ESTU: 'outline',
};

export default function UserTable({
    users,
    realUserId,
    realRole,
    onEdit,
    onAssignProfesor,
    onAssignAlumnos,
    onDelete,
    onImpersonate,
    onNavigate,
    toggleActiveMutation,
    bulkActions
}: UserTableProps) {

    const columns = [
        {
            key: 'nombre',
            label: 'Usuario',
            sortable: true,
            sortValue: (u: User) => getNombreVisible(u).toLowerCase(),
            render: (u: User) => {
                const isActive = u.isActive !== false && u.is_active !== false;
                return (
                    <div className={!isActive ? 'opacity-60' : ''}>
                        <p className="font-medium text-sm text-[var(--color-text-primary)]">{getNombreVisible(u)}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{u.email}</p>
                    </div>
                );
            },
        },
        {
            key: 'rol',
            label: 'Rol',
            sortable: true,
            sortValue: (u: User) => u.rolPersonalizado || u.role || 'ESTU',
            render: (u: User) => {
                const role = u.rolPersonalizado || u.role || 'ESTU';
                const assignedProfeName = u.profesorAsignadoId
                    ? getNombreVisible(users.find(p => p.id === u.profesorAsignadoId))
                    : null;

                return (
                    <div>
                        <Badge variant={roleVariants[role] || 'outline'}>
                            {roleLabels[role] || 'Estudiante'}
                        </Badge>
                        {assignedProfeName && (
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                {assignedProfeName}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'estado',
            label: 'Estado',
            sortable: true,
            sortValue: (u: User) => (u.isActive !== false && u.is_active !== false) ? 'a' : 'z',
            render: (u: User) => {
                const isActive = u.isActive !== false && u.is_active !== false;
                return (
                    <Badge variant={isActive ? 'success' : 'default'}>
                        {isActive ? 'Activo' : 'Pausado'}
                    </Badge>
                );
            },
        },
    ];

    return (
        <UnifiedTable
            columns={columns}
            data={users}
            selectable={true}
            // @ts-ignore - UnifiedTable props type mismatch
            bulkActions={[
                {
                    id: 'assign_profesor_bulk',
                    label: 'Asignar profesor',
                    icon: UserIcon,
                    onClick: (ids: string[]) => {
                        const selectedUsers = users.filter((u: User) => ids.includes(u.id));
                        const students = selectedUsers.filter((u: User) => (u.rolPersonalizado || u.role) === 'ESTU');
                        if (students.length > 0) {
                            bulkActions.onBulkAssignProfesor(students.map((u: User) => u.id));
                        } else {
                            toast.error('Solo puedes asignar profesor a estudiantes');
                        }
                    },
                },
                {
                    id: 'send_magic_link_bulk',
                    label: 'Enviar enlace mágico',
                    icon: Mail,
                    onClick: bulkActions.onBulkSendMagicLink,
                },
                {
                    id: 'send_reset_password_bulk',
                    label: 'Enviar reset password',
                    icon: KeyRound,
                    onClick: bulkActions.onBulkSendResetPassword,
                },
                {
                    id: 'pause_bulk',
                    label: 'Pausar acceso',
                    icon: Pause,
                    onClick: (ids: string[]) => bulkActions.onBulkToggleActive(ids, false),
                },
                {
                    id: 'resume_bulk',
                    label: 'Reanudar acceso',
                    icon: Play,
                    onClick: (ids: string[]) => bulkActions.onBulkToggleActive(ids, true),
                },
                {
                    id: 'export',
                    label: 'Exportar CSV',
                    // @ts-ignore - UnifiedTable icon type mismatch
                    icon: FileDownIcon,
                    onClick: bulkActions.onBulkExport,
                },
                ...(realRole === 'ADMIN' ? [{
                    id: 'delete_bulk',
                    label: 'Eliminar usuarios',
                    icon: Trash2,
                    onClick: (ids: string[]) => {
                        const toDelete = users.filter(u => ids.includes(u.id) && u.id !== realUserId);
                        if (toDelete.length > 0) {
                            onDelete(toDelete);
                        } else if (ids.length > 0) {
                            toast.error('No puedes eliminar tu propia cuenta');
                        }
                    },
                }] : []),
            ]}
            // @ts-ignore - UnifiedTable props type mismatch
            getRowActions={(u: User) => {
                const role = u.rolPersonalizado || u.role || 'ESTU';
                const isActive = u.isActive !== false && u.is_active !== false;

                const actions: any[] = [
                    {
                        id: 'edit',
                        label: 'Editar perfil',
                        icon: <Pencil className="w-4 h-4" />,
                        onClick: () => onEdit(u),
                    },
                ];

                if (u.email) {
                    if (!isActive) {
                        actions.push({
                            id: 'invite',
                            label: 'Enviar invitación',
                            icon: <Send className="w-4 h-4" />,
                            onClick: () => {/* Logic in page */ },
                        });
                    }

                    actions.push(
                        {
                            id: 'reset_password',
                            label: 'Enviar recuperación de contraseña',
                            icon: <KeyRound className="w-4 h-4" />,
                            onClick: () => {/* Logic in page */ },
                        },
                        {
                            id: 'magic_link',
                            label: 'Enviar enlace mágico',
                            icon: <Mail className="w-4 h-4" />,
                            onClick: () => {/* Logic in page */ },
                        }
                    );
                }

                if (role === 'ESTU') {
                    actions.push(
                        {
                            id: 'assign_profesor',
                            label: 'Asignar / cambiar profesor',
                            icon: <UserIcon className="w-4 h-4" />,
                            onClick: () => onAssignProfesor(u),
                        },
                        {
                            id: 'view_asignaciones',
                            label: 'Ver asignaciones',
                            icon: <Eye className="w-4 h-4" />,
                            onClick: () => onNavigate(`asignaciones?alumno_id=${u.id}`),
                        },
                        {
                            id: 'view_estadisticas',
                            label: 'Ver estadísticas',
                            icon: <BarChart3 className="w-4 h-4" />,
                            onClick: () => onNavigate(`estadisticas?alumno_id=${u.id}`),
                        }
                    );
                }

                if (role === 'PROF') {
                    actions.push(
                        {
                            id: 'assign_alumnos',
                            label: 'Asignar alumnos',
                            icon: <UsersIcon className="w-4 h-4" />,
                            onClick: () => onAssignAlumnos(u),
                        },
                        {
                            id: 'view_estadisticas_alumnos',
                            label: 'Ver estadísticas de sus alumnos',
                            icon: <BarChart3 className="w-4 h-4" />,
                            onClick: () => onNavigate(`estadisticas?profesor_id=${u.id}`),
                        }
                    );
                }

                actions.push({
                    id: 'toggle_active',
                    label: isActive ? 'Pausar acceso' : 'Reanudar acceso',
                    icon: isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />,
                    onClick: () => toggleActiveMutation.mutate({ userId: u.id, isActive: !isActive }),
                });

                if (realRole === 'ADMIN' && u.id !== realUserId) {
                    actions.push({
                        id: 'delete_user',
                        label: 'Eliminar usuario',
                        icon: <Trash2 className="w-4 h-4" />,
                        onClick: () => onDelete(u),
                    });

                    actions.push({
                        id: 'impersonate',
                        label: 'Ver como...',
                        icon: <UserCheck className="w-4 h-4" />,
                        onClick: () => onImpersonate(u),
                    });
                }

                return actions;
            }}
            onRowClick={onEdit}
            emptyMessage="No hay usuarios"
            emptyIcon={UserIcon}
        />
    );
}

function FileDownIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
    )
}

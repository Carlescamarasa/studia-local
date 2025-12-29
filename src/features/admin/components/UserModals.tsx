import React, { useState, useEffect } from 'react';
import { Button } from "@/features/shared/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/features/shared/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/features/shared/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import MultiSelect from "@/features/shared/components/ui/MultiSelect";
import { FormField } from "@/features/shared/components/ds/FormField";
import { componentStyles } from "@/design/componentStyles";
import { getNombreVisible } from "@/features/shared/utils/helpers";
import { User, userService } from '../services/userService';
import { toast } from 'sonner';

interface UserModalsProps {
    users: User[];
    // Assign Professor
    assignProfesorState: {
        open: boolean;
        setOpen: (open: boolean) => void;
        user: User | null;
        bulkIds: string[];
    };
    onAssignProfesor: (userIds: string[], profesorId: string | null) => Promise<void>;

    // Assign Students to Profesor
    assignAlumnosState: {
        open: boolean;
        setOpen: (open: boolean) => void;
        profesor: User | null;
    };
    onAssignAlumnos: (profesorId: string, alumnoIds: string[]) => Promise<void>;

    // Delete User
    deleteUserState: {
        open: boolean;
        setOpen: (open: boolean) => void;
        users: User[];
    };
    onDeleteUsers: (userIds: string[]) => Promise<void>;
}

export default function UserModals({
    users,
    assignProfesorState,
    onAssignProfesor,
    assignAlumnosState,
    onAssignAlumnos,
    deleteUserState,
    onDeleteUsers
}: UserModalsProps) {
    const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
    const [estudiantesSeleccionados, setEstudiantesSeleccionados] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const profesores = users.filter(u => (u.rolPersonalizado || u.role) === 'PROF');

    // Reset internal states when modals open/change
    useEffect(() => {
        if (assignProfesorState.open && assignProfesorState.user) {
            setProfesorSeleccionado(assignProfesorState.user.profesorAsignadoId || 'none');
        } else if (assignProfesorState.open && assignProfesorState.bulkIds.length > 0) {
            setProfesorSeleccionado('none');
        }
    }, [assignProfesorState.open, assignProfesorState.user, assignProfesorState.bulkIds]);

    const handleAssignProfesorSubmit = async () => {
        setIsActionLoading(true);
        try {
            const userIds = assignProfesorState.user
                ? [assignProfesorState.user.id]
                : assignProfesorState.bulkIds;

            await onAssignProfesor(userIds, profesorSeleccionado === 'none' ? null : profesorSeleccionado);
            assignProfesorState.setOpen(false);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAssignAlumnosSubmit = async () => {
        if (!assignAlumnosState.profesor) return;
        setIsActionLoading(true);
        try {
            await onAssignAlumnos(assignAlumnosState.profesor.id, estudiantesSeleccionados);
            assignAlumnosState.setOpen(false);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeleteSubmit = async () => {
        setIsActionLoading(true);
        try {
            await onDeleteUsers(deleteUserState.users.map(u => u.id));
            deleteUserState.setOpen(false);
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <>
            {/* Dialog para asignar profesor */}
            <Dialog open={assignProfesorState.open} onOpenChange={assignProfesorState.setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Asignar profesor</DialogTitle>
                        <DialogDescription>
                            {assignProfesorState.user
                                ? `Selecciona un profesor para ${getNombreVisible(assignProfesorState.user)}.`
                                : `Selecciona un profesor para asignar a ${assignProfesorState.bulkIds.length} estudiantes.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* @ts-ignore */}
                        <FormField label="Profesor">
                            <Select
                                value={profesorSeleccionado}
                                onValueChange={setProfesorSeleccionado}
                                disabled={isActionLoading}
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
                            onClick={() => assignProfesorState.setOpen(false)}
                            disabled={isActionLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAssignProfesorSubmit}
                            className={componentStyles.buttons?.primary || ''}
                            disabled={isActionLoading}
                        >
                            {isActionLoading ? 'Asignando...' : 'Asignar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog para asignar alumnos a profesor */}
            <Dialog open={assignAlumnosState.open} onOpenChange={assignAlumnosState.setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Asignar alumnos</DialogTitle>
                        <DialogDescription>
                            Selecciona los estudiantes para {assignAlumnosState.profesor ? getNombreVisible(assignAlumnosState.profesor) : 'este profesor'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* @ts-ignore */}
                        <FormField label="Estudiantes">
                            {/* @ts-ignore */}
                            <MultiSelect
                                items={users
                                    .filter(u => (u.rolPersonalizado || u.role) === 'ESTU')
                                    .map(e => ({
                                        value: e.id,
                                        label: `${getNombreVisible(e)}${e.email ? ` (${e.email})` : ''}`.trim(),
                                    }))}
                                // @ts-ignore
                                value={estudiantesSeleccionados}
                                onChange={setEstudiantesSeleccionados}
                                placeholder="Buscar estudiantes..."
                            />
                        </FormField>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => assignAlumnosState.setOpen(false)}
                            disabled={isActionLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAssignAlumnosSubmit}
                            className={componentStyles.buttons?.primary || ''}
                            disabled={isActionLoading || estudiantesSeleccionados.length === 0}
                        >
                            {isActionLoading ? 'Asignando...' : 'Asignar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de confirmación para eliminar */}
            {/* @ts-ignore - AlertDialog components from JSX mismatch */}
            <AlertDialog open={deleteUserState.open} onOpenChange={deleteUserState.setOpen}>
                {/* @ts-ignore */}
                <AlertDialogContent>
                    {/* @ts-ignore */}
                    <AlertDialogHeader>
                        {/* @ts-ignore */}
                        <AlertDialogTitle>
                            {deleteUserState.users.length > 1
                                ? `¿Eliminar ${deleteUserState.users.length} usuarios?`
                                : '¿Eliminar usuario?'}
                        </AlertDialogTitle>
                        {/* @ts-ignore */}
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán permanentemente:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                {deleteUserState.users.slice(0, 5).map((u) => (
                                    <li key={u.id}>
                                        <strong>{getNombreVisible(u) || u.email}</strong>
                                    </li>
                                ))}
                                {deleteUserState.users.length > 5 && (
                                    <li className="text-muted-foreground">... y {deleteUserState.users.length - 5} más</li>
                                )}
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {/* @ts-ignore */}
                    <AlertDialogFooter>
                        {/* @ts-ignore */}
                        <AlertDialogCancel
                            onClick={() => deleteUserState.setOpen(false)}
                            disabled={isActionLoading}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        {/* @ts-ignore */}
                        <AlertDialogAction
                            onClick={(e: React.MouseEvent) => {
                                e.preventDefault();
                                handleDeleteSubmit();
                            }}
                            disabled={isActionLoading}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isActionLoading ? 'Eliminando...' : 'Eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

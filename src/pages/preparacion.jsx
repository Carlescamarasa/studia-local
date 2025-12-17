/**
 * Preparación - CRM de alumnos para profesores
 * 
 * Vista tipo CRM para PROF/ADMIN:
 * - Lista de alumnos (búsqueda + orden)
 * - Panel detalle con asignación activa
 * - Acciones: crear/editar/publicar/pausar
 * - "Ver progreso" navega a /progreso?tab=resumen&students=<id>
 * - NO incluye "Abrir Agenda"
 */

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { getNombreVisible, useEffectiveUser, resolveUserIdActual, displayName } from "@/components/utils/helpers";
import { Card, CardContent, CardHeader, CardTitle, Badge, EmptyState, PageHeader } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Input } from "@/components/ui/input";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import RequireRole from "@/components/auth/RequireRole";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseLocalDate } from "@/components/estadisticas/utils";
import AsignacionesTab from "@/components/preparacion/AsignacionesTab";
import { ROUTES, toProgreso } from "@/lib/routes";
import UserActionsMenu from "@/components/common/UserActionsMenu";

// Icons
import {
    Users, Search, X, Target, Eye, Edit, Play, Pause, Copy,
    Plus, ChevronRight, Clock, CheckCircle, AlertCircle, User, List, LayoutList
} from "lucide-react";

// TABS configuration to avoid hardcoding
const TABS = [
    { id: 'estudiantes', label: 'Estudiantes', icon: Users },
    { id: 'asignaciones', label: 'Todas las Asignaciones', icon: LayoutList },
];

export default function PreparacionPage() {
    return (
        <RequireRole anyOf={['PROF', 'ADMIN']}>
            <PreparacionPageContent />
        </RequireRole>
    );
}

// Helper: Get display name for an assignment with fallbacks
function getAsignacionDisplayName(asignacion) {
    if (!asignacion) return 'Asignación';
    if (asignacion.pieza) return asignacion.pieza;
    if (asignacion.nombre) return asignacion.nombre;
    if (asignacion.plan?.nombre) return asignacion.plan.nombre;
    if (asignacion.semanaInicioISO) {
        try {
            return `Asignación (${format(parseLocalDate(asignacion.semanaInicioISO), 'd MMM yyyy', { locale: es })})`;
        } catch (e) {
            return `Asignación (${asignacion.semanaInicioISO})`;
        }
    }
    return 'Asignación';
}

function PreparacionPageContent() {
    console.log("DEBUG: PreparacionPage Loaded v5 - Refactored Constants");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [filtroEstudiantes, setFiltroEstudiantes] = useState('mis'); // 'mis' | 'todos'

    // Tab logic
    const tabActiva = searchParams.get('tab') || 'estudiantes';
    const handleTabChange = (tab) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tab);
        setSearchParams(newParams, { replace: true });
    };

    const effectiveUser = useEffectiveUser();
    const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
    const isProf = effectiveUser?.rolPersonalizado === 'PROF';

    // Load users
    const { data: usuarios = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['users'],
        queryFn: () => localDataClient.entities.User.list(),
        staleTime: 5 * 60 * 1000,
    });

    // Resolve current user ID
    const userIdActual = useMemo(() => {
        return resolveUserIdActual(effectiveUser, usuarios);
    }, [effectiveUser, usuarios]);

    // Load assignments
    const { data: asignaciones = [], isLoading: loadingAsignaciones } = useQuery({
        queryKey: ['asignaciones'],
        queryFn: () => localDataClient.entities.Asignacion.list(),
        staleTime: 2 * 60 * 1000,
    });

    // Filter students based on role
    const estudiantes = useMemo(() => {
        return usuarios.filter(u => u.rolPersonalizado === 'ESTU');
    }, [usuarios]);

    const estudiantesDelProfesor = useMemo(() => {
        if (isAdmin) return estudiantes;
        if (!isProf || !userIdActual) return [];

        const alumnosIdsFromAssignments = new Set(
            asignaciones
                .filter(a => a.profesorId === userIdActual)
                .map(a => a.alumnoId)
        );

        return estudiantes.filter(e =>
            e.profesorAsignadoId === userIdActual || alumnosIdsFromAssignments.has(e.id)
        );
    }, [estudiantes, asignaciones, userIdActual, isAdmin, isProf]);

    // Search filter - apply to either estudiantesDelProfesor or all students based on toggle
    const estudiantesFiltrados = useMemo(() => {
        // Base list depends on toggle (ADMIN always sees all, PROF can toggle)
        let baseList = estudiantes;
        if (!isAdmin && filtroEstudiantes === 'mis') {
            baseList = estudiantesDelProfesor;
        }

        if (!searchTerm) return baseList;
        const term = searchTerm.toLowerCase();
        return baseList.filter(e => {
            const nombre = displayName(e).toLowerCase();
            const email = (e.email || '').toLowerCase();
            return nombre.includes(term) || email.includes(term);
        });
    }, [estudiantes, estudiantesDelProfesor, searchTerm, filtroEstudiantes, isAdmin]);

    // Get assignments for selected student
    const asignacionesDelEstudiante = useMemo(() => {
        if (!selectedStudentId) return [];
        return asignaciones.filter(a => a.alumnoId === selectedStudentId);
    }, [asignaciones, selectedStudentId]);

    // Get active assignment (publicada or en_curso)
    const asignacionActiva = useMemo(() => {
        return asignacionesDelEstudiante.find(a =>
            a.estado === 'publicada' || a.estado === 'en_curso'
        );
    }, [asignacionesDelEstudiante]);

    const selectedStudent = useMemo(() => {
        return estudiantes.find(e => e.id === selectedStudentId);
    }, [estudiantes, selectedStudentId]);

    // Mutations
    const updateAsignacionMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return await localDataClient.entities.Asignacion.update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asignaciones'] });
            toast.success('Asignación actualizada');
        },
        onError: (error) => {
            toast.error('Error al actualizar: ' + error.message);
        },
    });

    // Actions
    const handleVerProgreso = () => {
        if (!selectedStudentId) return;
        navigate(`${toProgreso('resumen')}&students=${selectedStudentId}`);
    };

    const handleEditarAsignacion = (asignacionId) => {
        navigate(`${ROUTES.ASIGNACION_DETALLE}?id=${asignacionId}`);
    };

    const handleCrearAsignacion = () => {
        // Switch to asignaciones tab and open modal via URL param
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', 'asignaciones');
        newParams.set('action', 'new');
        if (selectedStudentId) {
            newParams.set('alumnoId', selectedStudentId);
        }
        setSearchParams(newParams);
    };

    const handlePublicar = (asignacion) => {
        updateAsignacionMutation.mutate({
            id: asignacion.id,
            data: { estado: 'publicada' },
        });
    };

    const handlePausar = (asignacion) => {
        updateAsignacionMutation.mutate({
            id: asignacion.id,
            data: { estado: 'pausada' },
        });
    };

    const getEstadoBadge = (estado) => {
        const config = {
            'borrador': { variant: 'outline', label: 'Borrador' },
            'publicada': { variant: 'success', label: 'Publicada' },
            'en_curso': { variant: 'info', label: 'En curso' },
            'pausada': { variant: 'warning', label: 'Pausada' },
            'completada': { variant: 'default', label: 'Completada' },
            'archivada': { variant: 'outline', label: 'Archivada' },
        };
        const c = config[estado] || { variant: 'default', label: estado };
        return <Badge variant={c.variant}>{c.label}</Badge>;
    };

    const isLoading = loadingUsers || loadingAsignaciones;

    return (
        <div className={componentStyles.layout.appBackground}>
            <PageHeader
                icon={Target}
                title="Preparación"
                subtitle="Gestiona asignaciones de tus estudiantes"
            />

            <div className={componentStyles.layout.page}>
                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b pb-4">
                    {TABS.map(tab => (
                        <Button
                            key={tab.id}
                            variant={tabActiva === tab.id ? 'default' : 'ghost'}
                            onClick={() => handleTabChange(tab.id)}
                            className={tabActiva === tab.id ? "" : "text-muted-foreground"}
                            size="sm"
                        >
                            <tab.icon className="w-4 h-4 mr-2" />
                            {tab.label}
                        </Button>
                    ))}
                </div>

                {tabActiva === 'asignaciones' ? (
                    <AsignacionesTab />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left column - Student list */}
                        <div className="lg:col-span-1">
                            <Card className={componentStyles.containers.cardBase}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Users className="w-5 h-5" />
                                            {filtroEstudiantes === 'mis' ? 'Mis Estudiantes' : 'Todos los Estudiantes'}
                                        </CardTitle>
                                    </div>
                                    {/* Toggle Mis/Todos */}
                                    <div className="flex gap-1 mt-2">
                                        <Button
                                            variant={filtroEstudiantes === 'mis' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setFiltroEstudiantes('mis')}
                                            className="text-xs h-7 px-2"
                                        >
                                            Mis estudiantes
                                        </Button>
                                        <Button
                                            variant={filtroEstudiantes === 'todos' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setFiltroEstudiantes('todos')}
                                            className="text-xs h-7 px-2"
                                        >
                                            Todos
                                        </Button>
                                    </div>
                                    <div className="relative mt-2">
                                        <Input
                                            placeholder="Buscar alumno..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pr-9 h-10 leading-tight"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-0 bottom-0 my-auto h-fit text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {isLoading ? (
                                        <div className="p-4 text-center text-muted-foreground">
                                            Cargando...
                                        </div>
                                    ) : estudiantesFiltrados.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground">
                                            {searchTerm ? 'Sin resultados' : 'No tienes estudiantes'}
                                        </div>
                                    ) : (
                                        <div className="max-h-[500px] overflow-y-auto">
                                            {estudiantesFiltrados.map((estudiante) => {
                                                const asignacionActual = asignaciones.find(
                                                    a => a.alumnoId === estudiante.id &&
                                                        (a.estado === 'publicada' || a.estado === 'en_curso')
                                                );
                                                const isSelected = selectedStudentId === estudiante.id;

                                                return (
                                                    <button
                                                        key={estudiante.id}
                                                        onClick={() => setSelectedStudentId(estudiante.id)}
                                                        className={cn(
                                                            "w-full text-left p-3 border-b transition-colors flex items-center justify-between",
                                                            isSelected
                                                                ? "bg-[var(--color-primary)]/10 border-l-4 border-l-[var(--color-primary)]"
                                                                : "hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">
                                                                {displayName(estudiante)}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {asignacionActual ? (
                                                                    <Badge variant="success" className="text-xs">
                                                                        Activa
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        Sin asignación
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                            <UserActionsMenu user={estudiante} usuarios={usuarios} />
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right column - Student detail */}
                        <div className="lg:col-span-2">
                            {!selectedStudentId ? (
                                <Card className={componentStyles.containers.cardBase}>
                                    <CardContent className="p-8 text-center">
                                        <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                        <p className="text-muted-foreground">
                                            Selecciona un estudiante para ver sus asignaciones
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-6">
                                    {/* Student header */}
                                    <Card className={componentStyles.containers.cardBase}>
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
                                                <div className="min-w-0">
                                                    <h2 className="text-xl font-semibold truncate">
                                                        {selectedStudent ? displayName(selectedStudent) : 'Estudiante'}
                                                    </h2>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {selectedStudent?.email || ''}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <Button
                                                        onClick={handleCrearAsignacion}
                                                        variant="outline"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Nueva asignación
                                                    </Button>
                                                    <Button
                                                        onClick={handleVerProgreso}
                                                        className={componentStyles.buttons.primary}
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Ver progreso
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Active assignment */}
                                    {asignacionActiva ? (
                                        <Card className={componentStyles.containers.cardBase}>
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="flex items-center gap-2">
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                        Asignación Activa
                                                    </CardTitle>
                                                    {getEstadoBadge(asignacionActiva.estado)}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="font-medium">
                                                            {getAsignacionDisplayName(asignacionActiva)}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Inicio: {asignacionActiva.semanaInicioISO || 'No definido'}
                                                        </p>
                                                        {asignacionActiva.plan && (
                                                            <p className="text-sm text-muted-foreground">
                                                                {asignacionActiva.plan.semanas?.length || 0} semanas planificadas
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEditarAsignacion(asignacionActiva.id)}
                                                        >
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Editar
                                                        </Button>
                                                        {asignacionActiva.estado === 'publicada' || asignacionActiva.estado === 'en_curso' ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handlePausar(asignacionActiva)}
                                                            >
                                                                <Pause className="w-4 h-4 mr-2" />
                                                                Pausar
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handlePublicar(asignacionActiva)}
                                                            >
                                                                <Play className="w-4 h-4 mr-2" />
                                                                Publicar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Card className={componentStyles.containers.cardBase}>
                                            <CardContent className="p-6 text-center">
                                                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
                                                <p className="text-muted-foreground mb-4">
                                                    Este estudiante no tiene una asignación activa
                                                </p>
                                                <Button onClick={handleCrearAsignacion}>
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Crear asignación
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* All assignments */}
                                    {asignacionesDelEstudiante.length > 0 && (
                                        <Card className={componentStyles.containers.cardBase}>
                                            <CardHeader>
                                                <CardTitle>Historial de Asignaciones</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="divide-y">
                                                    {asignacionesDelEstudiante.map((asignacion) => (
                                                        <div
                                                            key={asignacion.id}
                                                            className="p-4 flex items-center justify-between hover:bg-muted/50"
                                                        >
                                                            <div>
                                                                <p className="font-medium">
                                                                    {getAsignacionDisplayName(asignacion)}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {asignacion.semanaInicioISO || 'Fecha no definida'}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {getEstadoBadge(asignacion.estado)}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleEditarAsignacion(asignacion.id)}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

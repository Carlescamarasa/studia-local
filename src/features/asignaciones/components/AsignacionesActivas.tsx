import React, { useState } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAsignaciones } from "@/features/asignaciones/hooks/useAsignaciones";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Badge } from "@/features/shared/components/ui/badge";
import { Eye, Copy, XCircle, Search, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayNameById } from "@/features/shared/utils/helpers";

interface Asignacion {
    id: string;
    alumnoId: string;
    alumnoNombre?: string;
    alumno?: { full_name?: string };
    piezaSnapshot?: { nombre?: string; nivel?: string };
    plan?: { nombre?: string; semanas?: unknown[] };
    semanaInicioISO: string;
    estado: 'publicada' | 'en_curso';
    notas?: string;
    foco?: string;
}

export default function AsignacionesActivas() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('all');

    // Usar hooks centralizados
    const { data: allAsignaciones = [] } = useAsignaciones() as { data: Asignacion[] };
    const asignaciones = allAsignaciones.filter(a => a.estado === 'publicada' || a.estado === 'en_curso');
    const isLoading = false; // Hook handles loading internally

    const cerrarMutation = useMutation({
        mutationFn: (id: string) => localDataClient.entities.Asignacion.update(id, { estado: 'cerrada' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asignaciones-activas'] });
            queryClient.invalidateQueries({ queryKey: ['asignaciones-archivadas'] });
            toast.success('✅ Asignación cerrada');
        },
    });

    const duplicarMutation = useMutation({
        mutationFn: async (asignacion: Asignacion) => {
            const copia = {
                ...asignacion,
                estado: 'borrador',
                semanaInicioISO: '', // El usuario deberá configurar nueva fecha
                notas: asignacion.notas ? `${asignacion.notas}\n\n(Duplicado de asignación anterior)` : 'Duplicado',
            } as Record<string, unknown>;
            delete copia.id;
            delete copia.created_date;
            delete copia.updated_date;
            delete copia.created_by;
            return localDataClient.entities.Asignacion.create(copia);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asignaciones-activas'] });
            toast.success('✅ Asignación duplicada como borrador');
        },
    });

    const filteredAsignaciones = asignaciones.filter((a: Asignacion) => {
        const alumnoNombre = (a.alumnoNombre || a.alumno?.full_name || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        const matchSearch =
            alumnoNombre.includes(term) ||
            (a.piezaSnapshot?.nombre || '').toLowerCase().includes(term) ||
            (a.plan?.nombre || '').toLowerCase().includes(term);
        const matchEstado = estadoFilter === 'all' || a.estado === estadoFilter;
        return matchSearch && matchEstado;
    });

    const estadoColors: Record<string, string> = {
        publicada: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
        en_curso: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20',
    };

    const estadoLabels: Record<string, string> = {
        publicada: 'Publicada',
        en_curso: 'En Curso',
    };

    if (isLoading) {
        return <div className="text-center py-12">Cargando asignaciones...</div>;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <CardTitle className="text-lg">Asignaciones Activas ({filteredAsignaciones.length})</CardTitle>
                        <div className="flex gap-2 flex-wrap">
                            <div className="relative min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                                <Input
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    <SelectItem value="publicada">Publicada</SelectItem>
                                    <SelectItem value="en_curso">En Curso</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredAsignaciones.length === 0 ? (
                        <div className="text-center py-12 text-muted">
                            <Target className="w-16 h-16 mx-auto mb-4 icon-empty" />
                            <p className="text-sm">No hay asignaciones activas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAsignaciones.map((asignacion) => {
                                return (
                                    <Card key={asignacion.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="pt-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <h4 className="font-semibold truncate">
                                                            {asignacion.alumnoNombre || displayNameById(asignacion.alumnoId)}
                                                        </h4>
                                                        <Badge className={estadoColors[asignacion.estado]}>
                                                            {estadoLabels[asignacion.estado]}
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1 text-sm text-muted">
                                                        <p>
                                                            <strong>Pieza:</strong> {asignacion.piezaSnapshot?.nombre}
                                                        </p>
                                                        <p>
                                                            <strong>Plan:</strong> {asignacion.plan?.nombre} ({asignacion.plan?.semanas?.length || 0} semanas)
                                                        </p>
                                                        <p>
                                                            <strong>Inicio:</strong> {new Date(asignacion.semanaInicioISO).toLocaleDateString('es-ES')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => navigate(createPageUrl(`asignacion-detalle?id=${asignacion.id}`))}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        Ver
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => duplicarMutation.mutate(asignacion)}
                                                        disabled={duplicarMutation.isPending}
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            if (window.confirm('¿Cerrar esta asignación?')) {
                                                                cerrarMutation.mutate(asignacion.id);
                                                            }
                                                        }}
                                                        disabled={cerrarMutation.isPending}
                                                        className="text-amber-700 hover:text-amber-800"
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

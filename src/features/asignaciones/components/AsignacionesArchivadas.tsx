import React, { useState } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAsignaciones } from "@/features/asignaciones/hooks/useAsignaciones";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Badge } from "@/features/shared/components/ds/Badge";
import { RotateCcw, Trash2, Search, Archive } from "lucide-react";
import { toast } from "sonner";
import { displayNameById } from "@/features/shared/utils/helpers";

interface Asignacion {
    id: string;
    alumnoId: string;
    alumnoNombre?: string;
    alumno?: { full_name?: string };
    piezaSnapshot?: { nombre?: string };
    plan?: { nombre?: string; semanas?: unknown[] };
    semanaInicioISO: string;
    updated_date: string;
    estado: string;
}

export default function AsignacionesArchivadas() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');

    // Usar hooks centralizados
    const { data: allAsignaciones = [], isLoading } = useAsignaciones() as { data: Asignacion[]; isLoading: boolean };
    const asignaciones = allAsignaciones.filter(a => a.estado === 'cerrada');

    const reabrirMutation = useMutation({
        mutationFn: (id: string) => localDataClient.entities.Asignacion.update(id, { estado: 'borrador' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asignaciones-archivadas'] });
            queryClient.invalidateQueries({ queryKey: ['asignaciones-activas'] });
            toast.success('✅ Asignación reabierta como borrador');
        },
    });

    const eliminarMutation = useMutation({
        mutationFn: (id: string) => localDataClient.entities.Asignacion.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['asignaciones-archivadas'] });
            toast.success('✅ Asignación eliminada');
        },
    });

    const filteredAsignaciones = asignaciones.filter((a: Asignacion) => {
        const alumnoNombre = (a.alumnoNombre || a.alumno?.full_name || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return (
            alumnoNombre.includes(term) ||
            (a.piezaSnapshot?.nombre || '').toLowerCase().includes(term) ||
            (a.plan?.nombre || '').toLowerCase().includes(term)
        );
    });

    if (isLoading) {
        return <div className="text-center py-12">Cargando asignaciones...</div>;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <CardTitle className="text-lg">Asignaciones Archivadas ({filteredAsignaciones.length})</CardTitle>
                        <div className="relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredAsignaciones.length === 0 ? (
                        <div className="text-center py-12 text-muted">
                            <Archive className="w-16 h-16 mx-auto mb-4 icon-empty" />
                            <p className="text-sm">No hay asignaciones archivadas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAsignaciones.map((asignacion) => {
                                return (
                                    <Card key={asignacion.id} className="hover:shadow-md transition-shadow bg-muted">
                                        <CardContent className="pt-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <h4 className="font-semibold truncate">
                                                            {asignacion.alumnoNombre || displayNameById(asignacion.alumnoId)}
                                                        </h4>
                                                        <Badge variant="secondary">Cerrada</Badge>
                                                    </div>
                                                    <div className="space-y-1 text-sm text-muted">
                                                        <p>
                                                            <strong>Pieza:</strong> {asignacion.piezaSnapshot?.nombre}
                                                        </p>
                                                        <p>
                                                            <strong>Plan:</strong> {asignacion.plan?.nombre} ({asignacion.plan?.semanas?.length || 0} semanas)
                                                        </p>
                                                        <p>
                                                            <strong>Período:</strong> {new Date(asignacion.semanaInicioISO).toLocaleDateString('es-ES')} - {new Date(asignacion.updated_date).toLocaleDateString('es-ES')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            if (window.confirm('¿Reabrir esta asignación como borrador?')) {
                                                                reabrirMutation.mutate(asignacion.id);
                                                            }
                                                        }}
                                                        disabled={reabrirMutation.isPending}
                                                    >
                                                        <RotateCcw className="w-3 h-3 mr-1" />
                                                        Reabrir
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => {
                                                            if (window.confirm('¿Eliminar permanentemente esta asignación? Esta acción no se puede deshacer.')) {
                                                                eliminarMutation.mutate(asignacion.id);
                                                            }
                                                        }}
                                                        disabled={eliminarMutation.isPending}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
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

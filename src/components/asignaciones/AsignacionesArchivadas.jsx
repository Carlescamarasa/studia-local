import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trash2, Search, Archive } from "lucide-react";
import { toast } from "sonner";
import { displayName, displayNameById } from "@/components/utils/helpers";

export default function AsignacionesArchivadas() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: asignaciones = [], isLoading } = useQuery({
    queryKey: ['asignaciones-archivadas'],
    queryFn: async () => {
      const all = await base44.entities.Asignacion.list('-created_date');
      return all.filter(a => a.estado === 'cerrada');
    },
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const reabrirMutation = useMutation({
    mutationFn: (id) => base44.entities.Asignacion.update(id, { estado: 'borrador' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-archivadas'] });
      queryClient.invalidateQueries({ queryKey: ['asignaciones-activas'] });
      toast.success('✅ Asignación reabierta como borrador');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => base44.entities.Asignacion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-archivadas'] });
      toast.success('✅ Asignación eliminada');
    },
  });

  const filteredAsignaciones = asignaciones.filter(a => {
    const alumno = usuarios.find(u => u.id === a.alumnoId);
    const alumnoNombreBase = alumno ? displayName(alumno) : '';
    const alumnoNombreSnap = a.alumno?.nombreCompleto || a.alumno?.full_name || '';
    const alumnoNombre = (alumnoNombreBase || alumnoNombreSnap).toLowerCase();
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
                const alumno = usuarios.find(u => u.id === asignacion.alumnoId);
                return (
                  <Card key={asignacion.id} className="hover:shadow-md transition-shadow bg-muted">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="font-semibold truncate">
                              {alumno
                                ? displayName(alumno)
                                : displayNameById(asignacion.alumnoId)}
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
                            variant="danger"
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
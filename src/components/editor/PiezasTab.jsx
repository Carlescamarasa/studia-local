
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Music, Copy } from "lucide-react";
import PieceEditor from "./PieceEditor";
import { toast } from "sonner";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { Badge } from "@/components/ds"; // Changed import path

export default function PiezasTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [nivelFilter, setNivelFilter] = useState('all');
  const [editingPieza, setEditingPieza] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data: piezas = [], isLoading } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => base44.entities.Pieza.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pieza.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piezas'] });
      toast.success('✅ Pieza eliminada');
    },
  });

  const duplicarMutation = useMutation({
    mutationFn: async (pieza) => {
      const copia = {
        ...pieza,
        nombre: `${pieza.nombre} (copia)`,
      };
      delete copia.id;
      delete copia.created_date;
      delete copia.updated_date;
      delete copia.created_by;
      return base44.entities.Pieza.create(copia);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['piezas'] });
      toast.success('✅ Pieza duplicada');
    },
  });

  const filteredPiezas = piezas.filter(p => {
    const matchesSearch = p.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNivel = nivelFilter === 'all' || p.nivel === nivelFilter;
    return matchesSearch && matchesNivel;
  });

  const handleCreate = () => {
    setEditingPieza(null);
    setShowEditor(true);
  };

  const handleEdit = (pieza) => {
    setEditingPieza(pieza);
    setShowEditor(true);
  };

  const handleDelete = async (pieza) => {
    if (window.confirm(`¿Eliminar "${pieza.nombre}"?`)) {
      deleteMutation.mutate(pieza.id);
    }
  };

  const handleDuplicate = (pieza) => {
    duplicarMutation.mutate(pieza);
  };

  const handleClose = () => {
    setShowEditor(false);
    setEditingPieza(null);
  };

  // Removed nivelColors

  const nivelVariants = { // Added nivelVariants
    principiante: 'success',
    intermedio: 'warning',
    avanzado: 'info',
    profesional: 'danger',
  };

  const nivelLabels = {
    principiante: 'Principiante',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
    profesional: 'Profesional',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap flex-1 w-full md:w-auto">
          <Input
            placeholder="Buscar piezas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={nivelFilter} onValueChange={setNivelFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Todos los niveles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              {Object.entries(nivelLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate} className="w-full md:w-auto btn-primary h-10 rounded-xl shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Pieza
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredPiezas.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Music className="w-16 h-16 mx-auto mb-4 text-ui/60" />
          <p className="text-ui/80 mb-2">
            {searchTerm || nivelFilter !== 'all' ? 'No se encontraron piezas' : 'Aún no hay piezas'}
          </p>
          <Button onClick={handleCreate} variant="outline" className="mt-2 rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Crear la primera
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <UnifiedTable
              columns={[
                { key: 'nombre', label: 'Nombre', sortable: true, render: (p) => <span className="font-medium">{p.nombre}</span> },
                { key: 'nivel', label: 'Nivel', sortable: true, render: (p) => (
                  <Badge variant={nivelVariants[p.nivel]}>{nivelLabels[p.nivel]}</Badge> // Changed Badge variant
                ) },
                { key: 'elementos', label: 'Elementos', sortable: true, render: (p) => <span className="text-sm text-ui/80">{p.elementos?.length || 0}</span>, sortValue: (p) => p.elementos?.length || 0 }, // Contraste en fondo claro
                { key: 'tiempo', label: 'Tiempo', sortable: true, render: (p) => <span className="text-sm text-ui/80">{Math.floor((p.tiempoObjetivoSeg || 0) / 60)} min</span>, sortValue: (p) => p.tiempoObjetivoSeg || 0 } // Contraste en fondo claro
              ]}
              data={filteredPiezas}
              getRowActions={(p) => [ // Changed from 'actions' to 'getRowActions'
                { id: 'edit', label: 'Editar', icon: <Edit className="w-4 h-4" />, onClick: () => handleEdit(p) },
                { id: 'duplicate', label: 'Duplicar', icon: <Copy className="w-4 h-4" />, onClick: () => handleDuplicate(p) },
                { id: 'delete', label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(p) }
              ]}
              keyField="id"
            />
          </div>

          <div className="md:hidden space-y-3">
            {filteredPiezas.map((pieza) => (
              <Card key={pieza.id} className="border hover:shadow-sm transition-shadow app-card">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Badge variant={nivelVariants[pieza.nivel]} className="mb-2"> {/* Changed Badge variant and removed rounded-full */}
                          {nivelLabels[pieza.nivel]}
                        </Badge>
                        <h3 className="font-semibold text-base mb-1">{pieza.nombre}</h3>
                        <p className="text-xs text-muted"> {/* Changed text class */}
                          {pieza.elementos?.length || 0} elementos • {Math.floor((pieza.tiempoObjetivoSeg || 0) / 60)} min
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[var(--color-border-default)]"> {/* Reemplazado a tokens */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(pieza)}
                        className="flex-1 btn-secondary h-10" // Changed className
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(pieza)}
                        className="flex-1 btn-secondary h-10" // Changed className
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Duplicar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pieza)}
                        className="btn-danger h-10 px-3" // Changed className
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {showEditor && (
        <PieceEditor
          pieza={editingPieza}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

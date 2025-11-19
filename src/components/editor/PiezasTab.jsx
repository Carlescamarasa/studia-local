
import React, { useState } from "react";
import { useDataEntities } from "@/providers/DataProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Music, Copy } from "lucide-react";
import PieceEditor from "./PieceEditor";
import { toast } from "sonner";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { Badge } from "@/components/ds";
import { componentStyles } from "@/design/componentStyles";

export default function PiezasTab() {
  const queryClient = useQueryClient();
  const entities = useDataEntities();
  const [searchTerm, setSearchTerm] = useState("");
  const [nivelFilter, setNivelFilter] = useState('all');
  const [editingPieza, setEditingPieza] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data: piezas = [], isLoading } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => entities.Pieza.list('-created_at'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Pieza.delete(id),
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
      delete copia.created_at;
      delete copia.updated_at;
      return entities.Pieza.create(copia);
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
            className={`flex-1 min-w-[200px] ${componentStyles.controls.inputDefault}`}
          />
          <Select value={nivelFilter} onValueChange={setNivelFilter}>
            <SelectTrigger className={`w-full md:w-48 ${componentStyles.controls.selectDefault}`}>
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
        <Button onClick={handleCreate} className={`w-full md:w-auto ${componentStyles.buttons.primary}`}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Pieza
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredPiezas.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--color-border-default)] rounded-[var(--radius-card)]">
          <Music className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-secondary)] mb-2">
            {searchTerm || nivelFilter !== 'all' ? 'No se encontraron piezas' : 'Aún no hay piezas'}
          </p>
          <Button onClick={handleCreate} variant="outline" className={`mt-2 ${componentStyles.buttons.outline}`}>
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
                { key: 'elementos', label: 'Elementos', sortable: true, render: (p) => <span className="text-sm text-[var(--color-text-secondary)]">{p.elementos?.length || 0}</span>, sortValue: (p) => p.elementos?.length || 0 },
                { key: 'tiempo', label: 'Tiempo', sortable: true, render: (p) => <span className="text-sm text-[var(--color-text-secondary)]">{Math.floor((p.tiempoObjetivoSeg || 0) / 60)} min</span>, sortValue: (p) => p.tiempoObjetivoSeg || 0 }
              ]}
              data={filteredPiezas}
              selectable={true}
              bulkActions={[
                {
                  id: 'duplicate',
                  label: 'Duplicar',
                  icon: Copy,
                  onClick: (ids) => {
                    const piezasParaDuplicar = filteredPiezas.filter(p => ids.includes(p.id));
                    piezasParaDuplicar.forEach(p => handleDuplicate(p));
                  },
                },
                {
                  id: 'delete',
                  label: 'Eliminar',
                  icon: Trash2,
                  onClick: (ids) => {
                    if (window.confirm(`¿Eliminar ${ids.length} pieza${ids.length > 1 ? 's' : ''}?`)) {
                      ids.forEach(id => {
                        const pieza = filteredPiezas.find(p => p.id === id);
                        if (pieza) {
                          deleteMutation.mutate(pieza.id);
                        }
                      });
                    }
                  },
                },
              ]}
              getRowActions={(p) => [ // Changed from 'actions' to 'getRowActions'
                { id: 'edit', label: 'Editar', icon: <Edit className="w-4 h-4" />, onClick: () => handleEdit(p) },
                { id: 'duplicate', label: 'Duplicar', icon: <Copy className="w-4 h-4" />, onClick: () => handleDuplicate(p) },
                { id: 'delete', label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(p) }
              ]}
              onRowClick={(p) => handleEdit(p)}
              keyField="id"
            />
          </div>

          <div className="md:hidden space-y-3">
            {filteredPiezas.map((pieza) => (
              <Card key={pieza.id} className="border hover:shadow-sm transition-shadow app-card">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleEdit(pieza)}
                      >
                        <Badge variant={nivelVariants[pieza.nivel]} className="mb-2"> {/* Changed Badge variant and removed rounded-full */}
                          {nivelLabels[pieza.nivel]}
                        </Badge>
                        <h3 className="font-semibold text-base mb-1">{pieza.nombre}</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {pieza.elementos?.length || 0} elementos • {Math.floor((pieza.tiempoObjetivoSeg || 0) / 60)} min
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[var(--color-border-default)]"> {/* Reemplazado a tokens */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pieza)}
                        className={`${componentStyles.buttons.iconSmall} ${componentStyles.buttons.ghost} ${componentStyles.buttons.editSubtle}`}
                        aria-label="Editar pieza"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(pieza)}
                        className={`${componentStyles.buttons.iconSmall} ${componentStyles.buttons.ghost} ${componentStyles.buttons.editSubtle}`}
                        aria-label="Duplicar pieza"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pieza)}
                        className={`${componentStyles.buttons.ghost} ${componentStyles.buttons.deleteSubtle} px-3`}
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

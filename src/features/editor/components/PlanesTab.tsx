
/* eslint-disable @typescript-eslint/no-explicit-any */
 
import React, { useState } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/features/shared/components/ui/button";
import { Card, CardContent } from "@/features/shared/components/ui/card";
import { Input } from "@/features/shared/components/ui/input";
import { Badge } from "@/features/shared/components/ds"; // Changed import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Plus, BookOpen, Edit, Copy, Trash2 } from "lucide-react";
import PlanEditor from "./PlanEditor";
import { toast } from "sonner";
import UnifiedTable from "@/features/shared/components/tables/UnifiedTable";
import { componentStyles } from "@/design/componentStyles";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { Plan } from "@/features/editor/types";

export default function PlanesTab() {
  const queryClient = useQueryClient();
  const effectiveUser = useEffectiveUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [focoFilter, setFocoFilter] = useState('all');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data: planes = [], isLoading } = useQuery({
    queryKey: ['planes'],
    queryFn: () => localDataClient.entities.Plan.list('-created_at'),
    staleTime: 5 * 60 * 1000, // 5 min - avoid refetch on tab switch
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => localDataClient.entities.Plan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planes'] });
      toast.success('✅ Plan eliminado');
    },
  });

  const duplicarMutation = useMutation({
    mutationFn: async (plan: Plan) => {
      const copia = {
        ...(plan as any),
        nombre: `${plan.nombre} (copia)`,
        profesorId: (effectiveUser as any)?.id,
      };
      delete copia.id;
      delete copia.created_date;
      delete copia.updated_date;
      delete copia.created_by;
      return localDataClient.entities.Plan.create(copia);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planes'] });
      toast.success('✅ Plan duplicado');
    },
  });

  const filteredPlanes = (planes as any[]).filter(p => {
    const matchesSearch = p.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFoco = focoFilter === 'all' || p.focoGeneral === focoFilter;
    return matchesSearch && matchesFoco;
  });

  const handleCreate = () => {
    setSelectedPlan(null);
    setShowEditor(true);
  };

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan as any); // PlanEditor might expect a slightly different shape or implicit check
    setShowEditor(true); // Ensure editor shows on edit
  };

  const handleDelete = (plan: Plan) => {
    if (plan.id && window.confirm(`¿Eliminar "${plan.nombre}"?`)) {
      deleteMutation.mutate(plan.id);
    }
  };

  const handleDuplicate = (plan: Plan) => {
    duplicarMutation.mutate(plan as any);
  };

  const focoLabels = {
    GEN: 'General',
    SON: 'Sonido',
    FLX: 'Flexibilidad',
    MOT: 'Motricidad',
    ART: 'Articulación',
    COG: 'Cognitivo',
  };

  const focoVariants: Record<string, "neutral" | "info" | "warning" | "success" | "primary"> = {
    GEN: 'neutral',
    LIG: 'info',
    RIT: 'warning',
    ART: 'success',
    'S&A': 'primary',
    SON: 'info',
    FLX: 'warning',
    MOT: 'success',
    COG: 'primary',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap flex-1 w-full md:w-auto">
          <Input
            placeholder="Buscar planes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`flex-1 min-w-[200px] ${componentStyles.controls.inputDefault}`}
          />
          <Select value={focoFilter} onValueChange={setFocoFilter}>
            <SelectTrigger className={`w-full md:w-48 ${componentStyles.controls.selectDefault}`}>
              <SelectValue placeholder="Todos los focos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los focos</SelectItem>
              {Object.entries(focoLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate} className={`w-full md:w-auto ${componentStyles.buttons.primary}`}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredPlanes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[var(--color-border-default)] rounded-[var(--radius-card)]">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-secondary)]" />
          <p className="text-[var(--color-text-secondary)] mb-2">
            {searchTerm || focoFilter !== 'all' ? 'No se encontraron planes' : 'Aún no hay planes'}
          </p>
          <Button onClick={handleCreate} variant="outline" className={`mt-2 ${componentStyles.buttons.outline}`}>
            <Plus className="w-4 h-4 mr-2" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <UnifiedTable
              columns={[
                { key: 'nombre', label: 'Nombre', sortable: true, render: (p) => <span className="font-medium">{p.nombre}</span> },
                {
                  key: 'foco', label: 'Foco', sortable: true, render: (p: Plan) => p.focoGeneral ? (
                    <Badge variant={focoVariants[p.focoGeneral] || 'neutral'}>{focoLabels[p.focoGeneral as keyof typeof focoLabels] || p.focoGeneral}</Badge>
                  ) : <span className="text-[var(--color-text-secondary)]">—</span>, sortValue: (p: Plan) => p.focoGeneral
                },
                { key: 'semanas', label: 'Semanas', sortable: true, render: (p) => <span className="text-sm text-[var(--color-text-secondary)]">{p.semanas?.length || 0}</span>, sortValue: (p) => p.semanas?.length || 0 }
              ]}
              data={filteredPlanes}
              selectable={true}
              bulkActions={[
                {
                  id: 'duplicate',
                  label: 'Duplicar',
                  icon: Copy,
                  onClick: (ids?: any[]) => {
                    if (!ids) return;
                    const planesParaDuplicar = filteredPlanes.filter(p => ids.includes(p.id));
                    planesParaDuplicar.forEach(p => handleDuplicate(p));
                  },
                },
                {
                  id: 'delete',
                  label: 'Eliminar',
                  icon: Trash2,
                  onClick: (ids?: any[]) => {
                    if (!ids) return;
                    const idStrings = ids as string[];
                    if (window.confirm(`¿Eliminar ${idStrings.length} plan${idStrings.length > 1 ? 'es' : ''}?`)) {
                      idStrings.forEach(id => {
                        const plan = filteredPlanes.find(p => p.id === id);
                        if (plan && plan.id) {
                          deleteMutation.mutate(plan.id);
                        }
                      });
                    }
                  },
                },
              ]}
              getRowActions={(p: Plan) => [ // Changed from 'actions' to 'getRowActions' and updated structure
                { id: 'edit', label: 'Editar', icon: <Edit className="w-4 h-4" />, onClick: () => handleEdit(p) },
                { id: 'duplicate', label: 'Duplicar', icon: <Copy className="w-4 h-4" />, onClick: () => handleDuplicate(p) },
                { id: 'delete', label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(p) }
              ]}
              onRowClick={(p: Plan) => handleEdit(p)}
              keyField="id"
            />
          </div>

          <div className="md:hidden space-y-3">
            {filteredPlanes.map((plan) => (
              <Card key={plan.id} className="border hover:shadow-sm transition-shadow app-card">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleEdit(plan)}
                      >
                        {plan.focoGeneral && (
                          <Badge variant={focoVariants[plan.focoGeneral] || 'neutral'} className="mb-2"> {/* Changed to variant */}
                            {focoLabels[plan.focoGeneral as keyof typeof focoLabels] || plan.focoGeneral}
                          </Badge>
                        )}
                        <h3 className="font-semibold text-base mb-1">{plan.nombre}</h3>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {plan.semanas?.length || 0} semanas
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[var(--color-border-default)]"> {/* Reemplazado a tokens */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                        className={`${componentStyles.buttons.iconSmall} ${componentStyles.buttons.ghost} ${componentStyles.buttons.editSubtle}`}
                        aria-label="Editar plan"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(plan as any)}
                        className={`${componentStyles.buttons.iconSmall} ${componentStyles.buttons.ghost} ${componentStyles.buttons.editSubtle}`}
                        aria-label="Duplicar plan"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plan as any)}
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

      {(showEditor || selectedPlan) && (
        <PlanEditor
          plan={selectedPlan}
          onClose={() => {
            setShowEditor(false);
            setSelectedPlan(null);
          }}
        />
      )}
    </div>
  );
}

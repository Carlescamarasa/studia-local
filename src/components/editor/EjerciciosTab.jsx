
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ds"; // Changed import to "@/components/ds"
import { Plus, Search, Copy, Trash2, Edit, Dumbbell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExerciseEditor from "./ExerciseEditor";
import { toast } from "sonner";
import UnifiedTable from "@/components/tables/UnifiedTable";

export default function EjerciciosTab() {
  const queryClient = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [ejercicioActual, setEjercicioActual] = useState(null); // Keep original name 'ejercicioActual'
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');

  const { data: ejercicios = [], isLoading } = useQuery({
    queryKey: ['bloques'],
    queryFn: () => base44.entities.Bloque.list('-updated_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Bloque.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloques'] });
      toast.success("✅ Ejercicio eliminado");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (ejercicio) => {
      const newCode = ejercicio.code.includes('-')
        ? `${ejercicio.code.split('-')[0]}-${Date.now().toString().slice(-4)}`
        : `${ejercicio.code}-COPY`;

      const newData = {
        ...ejercicio,
        nombre: `${ejercicio.nombre} (copia)`,
        code: newCode,
      };
      delete newData.id;
      delete newData.created_date;
      delete newData.updated_date;
      delete newData.created_by;

      return base44.entities.Bloque.create(newData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloques'] });
      toast.success("✅ Ejercicio duplicado");
    },
  });

  const handleCrear = () => {
    setEjercicioActual(null);
    setShowEditor(true);
  };

  const handleEditar = (ejercicio) => {
    setEjercicioActual(ejercicio);
    setShowEditor(true);
  };

  const handleEliminar = (ejercicio) => {
    if (window.confirm(`¿Eliminar "${ejercicio.nombre}"?`)) {
      deleteMutation.mutate(ejercicio.id);
    }
  };

  const handleDuplicar = (ejercicio) => {
    duplicateMutation.mutate(ejercicio);
  };

  const tipoLabels = {
    CA: 'Calentamiento A',
    CB: 'Calentamiento B',
    TC: 'Técnica Central',
    TM: 'Técnica Mantenimiento',
    FM: 'Fragmento Musical',
    VC: 'Vuelta a la Calma',
    AD: 'Advertencia/Descanso',
  };

  // Removed tipoColors
  const tipoVariants = { // Added tipoVariants
    CA: 'primary',
    CB: 'info',
    TC: 'warning',
    TM: 'success',
    FM: 'danger',
    VC: 'info',
    AD: 'neutral',
  };

  const ejerciciosFiltrados = ejercicios.filter(e => {
    const matchesSearch = e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         e.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'all' || e.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap flex-1 w-full md:w-auto">
          <Input
            placeholder="Buscar ejercicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(tipoLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCrear} className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ejercicio
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : ejerciciosFiltrados.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Dumbbell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 mb-2">
            {searchTerm || tipoFilter !== 'all' ? 'No se encontraron ejercicios' : 'Aún no hay ejercicios'}
          </p>
          <Button onClick={handleCrear} variant="outline" className="mt-2 rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <UnifiedTable
              columns={[
                {
                  key: 'tipo',
                  label: 'Tipo',
                  sortable: true,
                  render: (e) => (
                    <Badge variant={tipoVariants[e.tipo]}>{e.tipo}</Badge> // Updated Badge usage
                  ),
                  sortValue: (e) => e.tipo
                },
                { key: 'code', label: 'Código', sortable: true, render: (e) => <span className="font-mono text-sm">{e.code}</span> },
                { key: 'nombre', label: 'Nombre', sortable: true, render: (e) => <span className="font-medium">{e.nombre}</span> },
                {
                  key: 'duracion',
                  label: 'Duración',
                  sortable: true,
                  render: (e) => (
                    <span className="text-sm text-ui/80"> {/* Mejor contraste en fondo claro */}
                      {Math.floor(e.duracionSeg / 60)}:{String(e.duracionSeg % 60).padStart(2, '0')} min
                    </span>
                  ),
                  sortValue: (e) => e.duracionSeg
                }
              ]}
              data={ejerciciosFiltrados}
              getRowActions={(e) => [ // Changed 'actions' to 'getRowActions' and updated structure
                { id: 'edit', label: 'Editar', icon: <Edit className="w-4 h-4" />, onClick: () => handleEditar(e) },
                { id: 'duplicate', label: 'Duplicar', icon: <Copy className="w-4 h-4" />, onClick: () => handleDuplicar(e) },
                { id: 'delete', label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleEliminar(e) }
              ]}
              keyField="id"
            />
          </div>

          <div className="md:hidden space-y-3">
            {ejerciciosFiltrados.map((ejercicio) => (
              <Card key={ejercicio.id} className="border hover:shadow-sm transition-shadow app-card">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Badge variant={tipoVariants[ejercicio.tipo]} className="mb-2"> {/* Updated Badge usage, removed rounded-full */}
                          {tipoLabels[ejercicio.tipo]}
                        </Badge>
                        <h3 className="font-semibold text-base mb-1">{ejercicio.nombre}</h3>
                        <p className="text-xs text-ui/80 font-mono">{ejercicio.code}</p> {/* Mejor contraste en fondo claro */}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs"> {/* Removed rounded-full */}
                        ⏱ {Math.floor(ejercicio.duracionSeg / 60)}:{String(ejercicio.duracionSeg % 60).padStart(2, '0')} min
                      </Badge>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[var(--color-border-default)]"> {/* Reemplazado a tokens */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditar(ejercicio)}
                        className="flex-1 btn-secondary h-10" // Updated className
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicar(ejercicio)}
                        className="flex-1 btn-secondary h-10" // Updated className
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Duplicar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEliminar(ejercicio)}
                        className="btn-danger h-10 px-3" // Updated className
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
        <ExerciseEditor
          bloque={ejercicioActual} // Keep original name 'ejercicioActual'
          onClose={() => {
            setShowEditor(false);
            setEjercicioActual(null); // Keep original name 'ejercicioActual'
          }}
        />
      )}
    </div>
  );
}

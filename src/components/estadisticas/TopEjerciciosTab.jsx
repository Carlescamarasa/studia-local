import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Input } from "@/components/ui/input";
import { Search, Star } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { formatDuracionHM } from "./utils";
import { Badge } from "@/components/ds";

const tipoColors = {
  CA: 'bg-blue-100 text-blue-800 border-blue-300',
  CB: 'bg-blue-200 text-blue-900 border-blue-400',
  TC: 'bg-purple-100 text-purple-800 border-purple-300',
  TM: 'bg-purple-200 text-purple-900 border-purple-400',
  FM: 'bg-green-100 text-green-800 border-green-300',
  VC: 'bg-orange-100 text-orange-800 border-orange-300',
  AD: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * TopEjerciciosTab - Tab de top ejercicios practicados
 * 
 * @param {Object} props
 * @param {Array} props.topEjercicios - Array de ejercicios ordenados por tiempo
 */
export default function TopEjerciciosTab({ topEjercicios }) {
  const isMobile = useIsMobile();
  const [searchEjercicio, setSearchEjercicio] = useState('');

  const topEjerciciosFiltrados = topEjercicios.filter(e => {
    if (searchEjercicio) {
      const term = searchEjercicio.toLowerCase();
      return e.nombre.toLowerCase().includes(term) || e.code.toLowerCase().includes(term);
    }
    return true;
  });

  const columns = [
    {
      key: 'ranking',
      label: '#',
      sortable: false,
      render: (item, index) => {
        return (
          <Badge className="rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] font-bold w-8 h-8 flex items-center justify-center shrink-0">
            {index + 1}
          </Badge>
        );
      },
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      render: (item) => (
        <Badge className={`rounded-full ${tipoColors[item.tipo] || 'bg-gray-100 text-gray-800'} shrink-0`}>
          {item.tipo}
        </Badge>
      ),
    },
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      render: (item) => (
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.nombre}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{item.code}</p>
        </div>
      ),
    },
    {
      key: 'sesionesCount',
      label: 'Sesiones',
      sortable: true,
      render: (item) => (
        <Badge variant="outline" className={componentStyles.status.badgeInfo}>
          {item.sesionesCount} sesiones
        </Badge>
      ),
    },
    {
      key: 'tiempoTotal',
      label: 'Tiempo',
      sortable: true,
      render: (item) => (
        <Badge variant="outline" className={componentStyles.status.badgeDefault}>
          {formatDuracionHM(item.tiempoTotal)}
        </Badge>
      ),
    },
  ];

  return (
    <Card className={componentStyles.components.cardBase}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
            Top Ejercicios Practicados
          </CardTitle>
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <Input
              placeholder="Buscar ejercicio..."
              value={searchEjercicio}
              onChange={(e) => setSearchEjercicio(e.target.value)}
              className={`pl-10 ${componentStyles.controls.inputDefault}`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {topEjerciciosFiltrados.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Star className={componentStyles.components.emptyStateIcon} />
            <p className={componentStyles.components.emptyStateText}>
              {searchEjercicio 
                ? 'No se encontraron ejercicios con ese nombre'
                : 'No hay datos de ejercicios en el periodo seleccionado'
              }
            </p>
          </div>
        ) : (
          <UnifiedTable
            data={topEjerciciosFiltrados}
            columns={columns}
            defaultPageSize={10}
            keyField="code"
          />
        )}
      </CardContent>
    </Card>
  );
}


import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { Layers } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { formatDuracionHM } from "./utils";
import { Badge } from "@/components/ds";

const tipoLabels = {
  CA: 'Calentamiento A',
  CB: 'Calentamiento B',
  TC: 'Técnica Central',
  TM: 'Técnica Mantenimiento',
  FM: 'Fragmento Musical',
  VC: 'Vuelta a la Calma',
  AD: 'Avisos/Descanso',
};

const tipoColors = {
  CA: 'bg-blue-100 text-blue-800 border-blue-300',
  CB: 'bg-blue-200 text-blue-900 border-blue-400',
  TC: 'bg-purple-100 text-purple-800 border-purple-300',
  TM: 'bg-purple-200 text-purple-900 border-purple-400',
  FM: 'bg-green-100 text-green-800 border-green-300',
  VC: 'bg-orange-100 text-orange-800 border-orange-300',
  AD: 'bg-red-100 text-red-800 border-red-300',
};

const tipoChartColors = {
  CA: '#3b82f6',
  CB: '#2563eb',
  TC: '#a855f7',
  TM: '#9333ea',
  FM: '#22c55e',
  VC: '#f97316',
  AD: '#ef4444',
};

/**
 * TiposBloquesTab - Tab de análisis por tipo de bloque
 * 
 * @param {Object} props
 * @param {Array} props.tiposBloques - Array de { tipo, tiempoReal, count, tiempoMedio }
 */
export default function TiposBloquesTab({ tiposBloques }) {
  const totalTiempo = tiposBloques.reduce((sum, t) => sum + t.tiempoReal, 0);

  return (
    <div className="space-y-6">
      {/* Lista detallada por tipo */}
      <Card className={componentStyles.components.cardBase}>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
            Detalle por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tiposBloques.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-text-secondary)]">
              No hay datos disponibles
            </div>
          ) : (
            <div className="space-y-3">
              {tiposBloques
                .sort((a, b) => b.tiempoReal - a.tiempoReal)
                .map((tipo) => {
                  const porcentaje = totalTiempo > 0 
                    ? ((tipo.tiempoReal / totalTiempo) * 100).toFixed(1)
                    : 0;

                  return (
                    <div key={tipo.tipo} className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={`rounded-full ${tipoColors[tipo.tipo] || 'bg-gray-100 text-gray-800'} min-w-[140px] flex items-center justify-center text-xs shrink-0`}>
                          {tipoLabels[tipo.tipo] || tipo.tipo}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                              {formatDuracionHM(tipo.tiempoReal)}
                            </span>
                            <span className="text-xs text-[var(--color-text-secondary)]">
                              {porcentaje}%
                            </span>
                          </div>
                          <div className="bg-[var(--color-surface-muted)] rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full transition-all"
                              style={{ 
                                width: `${porcentaje}%`,
                                backgroundColor: tipoChartColors[tipo.tipo] || tipoChartColors.CA
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-[var(--color-text-secondary)] pl-[155px]">
                        <span>Bloques: {tipo.count}</span>
                        <span>
                          Promedio: {formatDuracionHM(tipo.tiempoMedio)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


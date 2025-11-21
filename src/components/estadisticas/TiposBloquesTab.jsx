import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { PieChart, Layers } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDuracionHM } from "./utils";
import { Badge } from "@/components/ds";

const tipoLabels = {
  CA: 'Calentamiento',
  CB: 'Calentamiento Básico',
  TC: 'Técnica',
  TM: 'Técnica Musical',
  FM: 'Forma Musical',
  VC: 'Virtuosismo',
  AD: 'Aplicación Directa',
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
  const isMobile = useIsMobile();

  const datosPie = tiposBloques.map(t => ({
    name: tipoLabels[t.tipo] || t.tipo,
    value: Math.round(t.tiempoReal / 60), // Convertir a minutos
    tipo: t.tipo,
  }));

  const totalTiempo = tiposBloques.reduce((sum, t) => sum + t.tiempoReal, 0);

  return (
    <div className="space-y-6">
      {/* Gráfico de pastel */}
      <Card className={componentStyles.components.cardBase}>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
            Distribución por Tipo de Bloque
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tiposBloques.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Layers className={componentStyles.components.emptyStateIcon} />
              <p className={componentStyles.components.emptyStateText}>
                No hay datos de bloques en el periodo seleccionado
              </p>
            </div>
          ) : (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
                <RechartsPieChart>
                  <Pie
                    data={datosPie}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={isMobile ? 70 : 100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {datosPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={tipoChartColors[entry.tipo] || '#8884d8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value) => `${value} min`}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: isMobile ? '11px' : '12px' }}
                    iconType="circle"
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

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


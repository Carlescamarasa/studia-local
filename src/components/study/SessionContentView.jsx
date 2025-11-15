import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { getSecuencia, ensureRondaIds, mapBloquesByCode } from "./sessionSequence";

const tipoColors = {
  CA: 'badge-primary',
  CB: 'badge-info',
  TC: 'badge-purple',
  TM: 'badge-success',
  FM: 'badge-danger',
  VC: 'badge-info',
  AD: 'badge-default',
};

/**
 * Componente unificado para visualizar el contenido de una sesión
 * Muestra ejercicios y rondas intercalados según la secuencia
 * Rondas colapsadas por defecto
 */
export default function SessionContentView({ sesion, compact = false }) {
  const [expanded, setExpanded] = useState({});

  if (!sesion) return null;

  const S = ensureRondaIds(sesion);
  const secuencia = getSecuencia(S);
  const bloquesMap = mapBloquesByCode(S);

  const toggleRonda = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Layers className="w-3 h-3" />
        <span>
          {(S.bloques?.length || 0)} ejercicios totales • {(S.rondas?.length || 0)} rondas
        </span>
      </div>

      <div className="space-y-1">
        {secuencia.map((item, idx) => {
          if (item.kind === "BLOQUE") {
            const ej = bloquesMap.get(item.code);
            if (!ej) {
              return (
                <div key={`miss-b-${idx}`} className="p-2 app-panel bg-[hsl(var(--danger))]/10 border-[hsl(var(--danger))]/20 text-xs text-[hsl(var(--danger))]">
                  ⚠️ Ejercicio no encontrado: {item.code}
                </div>
              );
            }
            
            return (
              <div key={`b-${item.code}-${idx}`} className="flex items-center gap-2 p-2 app-card border-ui text-xs">
                <Badge variant="outline" className={tipoColors[ej.tipo]}>
                  {ej.tipo}
                </Badge>
                <span className="flex-1 text-ui">
                  {ej.nombre} {!compact && <span className="text-muted">({ej.code})</span>}
                </span>
                <span className="text-muted">
                  {Math.floor((ej.duracionSeg || 0) / 60)}:{String((ej.duracionSeg || 0) % 60).padStart(2, '0')}
                </span>
              </div>
            );
          }

          // Ronda
          const r = (S.rondas || []).find(x => x.id === item.id);
          if (!r) {
            return (
              <div key={`miss-r-${idx}`} className="p-2 app-panel bg-[hsl(var(--danger))]/10 border-[hsl(var(--danger))]/20 text-xs text-[hsl(var(--danger))]">
                ⚠️ Ronda no encontrada
              </div>
            );
          }

          const key = item.id || idx;
          const isOpen = !!expanded[key];

          return (
            <Card 
              key={`r-${key}`} 
              className="app-panel border-purple-300 bg-purple-50/50 cursor-pointer hover:bg-purple-100/50 transition-colors"
              onClick={() => toggleRonda(key)}
            >
              <CardContent className="pt-2 pb-2">
                <div className="flex items-center gap-2">
                  <div className="pt-0.5">
                    {isOpen ? (
                      <ChevronDown className="w-3 h-3 text-purple-600" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-purple-600" />
                    )}
                  </div>
                  <Badge className="bg-purple-600 text-white text-xs badge">Ronda</Badge>
                  <span className="text-xs text-muted">× {r.repeticiones} repeticiones</span>
                  <span className="text-xs text-muted">({r.bloques.length} ejercicios)</span>
                  {r.aleatoria && (
                    <Badge variant="outline" className="text-[10px] border-purple-400 text-purple-800 bg-purple-100 badge">
                      🎲 random
                    </Badge>
                  )}
                </div>

                {isOpen && (
                  <div className="space-y-1 ml-6 mt-2 border-l-2 border-purple-300 pl-3">
                    {r.bloques.map((code, j) => {
                      const ej = bloquesMap.get(code);
                      if (!ej) {
                        return (
                          <div key={`r-${key}-${j}`} className="p-1.5 app-panel bg-[hsl(var(--danger))]/10 border-[hsl(var(--danger))]/20 text-xs text-[hsl(var(--danger))]">
                            ⚠️ {code} no encontrado
                          </div>
                        );
                      }
                      
                      return (
                        <div key={`r-${key}-${code}-${j}`} className="flex items-center gap-2 p-1.5 app-card border-ui text-xs">
                          <Badge variant="outline" className={tipoColors[ej.tipo]}>
                            {ej.tipo}
                          </Badge>
                          <span className="flex-1 text-ui">
                            {ej.nombre} {!compact && <span className="text-muted">({ej.code})</span>}
                          </span>
                          <span className="text-muted">
                            {Math.floor((ej.duracionSeg || 0) / 60)}:{String((ej.duracionSeg || 0) % 60).padStart(2, '0')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
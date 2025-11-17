import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Layers, Shuffle } from "lucide-react";
import { getSecuencia, ensureRondaIds, mapBloquesByCode } from "./sessionSequence";
import { componentStyles } from "@/design/componentStyles";

const tipoColors = {
  CA: componentStyles.status.badgeDefault,
  CB: componentStyles.status.badgeInfo,
  TC: componentStyles.status.badgeDefault,
  TM: componentStyles.status.badgeSuccess,
  FM: componentStyles.status.badgeDefault,
  VC: componentStyles.status.badgeInfo,
  AD: componentStyles.status.badgeDefault,
};

/**
 * Componente unificado para visualizar el contenido de una sesión
 * Muestra ejercicios y rondas intercalados según la secuencia
 * Rondas expandidas por defecto
 */
export default function SessionContentView({ sesion, compact = false }) {
  if (!sesion) return null;

  const S = ensureRondaIds(sesion);
  const secuencia = getSecuencia(S);
  const bloquesMap = mapBloquesByCode(S);

  // Inicializar todas las rondas como expandidas por defecto
  const [expanded, setExpanded] = useState(() => {
    const expandedMap = {};
    const seq = getSecuencia(ensureRondaIds(sesion));
    seq.forEach((item) => {
      if (item.kind === "RONDA" && item.id) {
        expandedMap[item.id] = true;
      }
    });
    return expandedMap;
  });

  // Actualizar cuando cambie la sesión
  React.useEffect(() => {
    const S = ensureRondaIds(sesion);
    const seq = getSecuencia(S);
    const expandedMap = {};
    seq.forEach((item) => {
      if (item.kind === "RONDA" && item.id) {
        expandedMap[item.id] = true;
      }
    });
    setExpanded(expandedMap);
  }, [sesion]); // Actualizar cuando cambie la sesión

  const toggleRonda = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Layers className="w-4 h-4 text-[var(--color-text-secondary)]" />
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
                <div key={`miss-b-${idx}`} className="p-2 app-panel bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
                  ⚠️ Ejercicio no encontrado: {item.code}
                </div>
              );
            }
            
            return (
              <div key={`b-${item.code}-${idx}`} className="flex items-center gap-2 py-2 px-3 app-card border-[var(--color-border-default)] text-sm">
                <Badge variant="outline" className={tipoColors[ej.tipo]}>
                  {ej.tipo}
                </Badge>
                <span className="flex-1 text-[var(--color-text-primary)]">
                  {ej.nombre} {!compact && <span className="text-[var(--color-text-secondary)]">({ej.code})</span>}
                </span>
                <span className="text-[var(--color-text-secondary)]">
                  {Math.floor((ej.duracionSeg || 0) / 60)}:{String((ej.duracionSeg || 0) % 60).padStart(2, '0')}
                </span>
              </div>
            );
          }

          // Ronda
          const r = (S.rondas || []).find(x => x.id === item.id);
          if (!r) {
            return (
              <div key={`miss-r-${idx}`} className="p-2 app-panel bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
                ⚠️ Ronda no encontrada
              </div>
            );
          }

          const key = item.id || idx;
          const isOpen = !!expanded[key];

          return (
            <Card 
              key={`r-${key}`} 
              className="app-panel border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] cursor-pointer hover:bg-[var(--color-primary-soft)] transition-colors"
              onClick={() => toggleRonda(key)}
            >
              <CardContent className="pt-2 pb-2">
                <div className="flex items-center gap-2">
                  <div className="pt-0.5">
                    {isOpen ? (
                      <ChevronDown className="w-3 h-3 text-[var(--color-primary)]" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-[var(--color-primary)]" />
                    )}
                  </div>
                  <Badge className="bg-[var(--color-primary)] text-[var(--color-text-inverse)] text-sm badge">Ronda</Badge>
                  <span className="text-sm text-[var(--color-text-secondary)]">× {r.repeticiones} repeticiones</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">({r.bloques.length} ejercicios)</span>
                  {r.aleatoria && (
                    <Badge variant="outline" className="text-[10px] border-[var(--color-primary)]/40 text-[var(--color-primary)] bg-[var(--color-primary-soft)] badge flex items-center gap-1">
                      <Shuffle className="w-3 h-3" />
                      aleatorio
                    </Badge>
                  )}
                </div>

                {isOpen && (
                  <div className="space-y-1 ml-6 mt-2 border-l-2 border-[var(--color-primary)]/30 pl-3">
                    {r.bloques.map((code, j) => {
                      const ej = bloquesMap.get(code);
                      if (!ej) {
                        return (
                          <div key={`r-${key}-${j}`} className="p-1.5 app-panel bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-xs text-[var(--color-danger)]">
                            ⚠️ {code} no encontrado
                          </div>
                        );
                      }
                      
                      return (
                        <div key={`r-${key}-${code}-${j}`} className="flex items-center gap-2 py-2 px-3 app-card border-[var(--color-border-default)] text-sm">
                          <Badge variant="outline" className={tipoColors[ej.tipo]}>
                            {ej.tipo}
                          </Badge>
                          <span className="flex-1 text-[var(--color-text-primary)]">
                            {ej.nombre} {!compact && <span className="text-[var(--color-text-secondary)]">({ej.code})</span>}
                          </span>
                          <span className="text-[var(--color-text-secondary)]">
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
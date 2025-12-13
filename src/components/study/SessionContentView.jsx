import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Layers, Shuffle, Eye } from "lucide-react";
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
 * @param {Object} sesion - Session object with bloques and rondas
 * @param {boolean} compact - Compact mode flag
 * @param {Array} dbBloques - Optional array of bloques from DB with variations
 * @param {string} semanaFoco - Optional semana foco to compare for Repaso badge
 */
export default function SessionContentView({ sesion, compact = false, dbBloques = [], semanaFoco = null }) {
  if (!sesion) return null;

  const S = ensureRondaIds(sesion);
  const secuencia = getSecuencia(S);

  // Create bloquesMap with DB variations merged in
  const bloquesMap = new Map();
  (S.bloques || []).forEach(b => {
    // Find matching DB bloque to get variations
    const dbBloque = dbBloques.find(db => db.code === b.code || db.id === b.id);
    const variations = dbBloque?.variations || dbBloque?.content || b.variations || [];
    bloquesMap.set(b.code, { ...b, variations });
  });

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

      <div className="ml-2 space-y-1.5">
        {secuencia.map((item, idx) => {
          if (item.kind === "BLOQUE") {
            const ej = bloquesMap.get(item.code);
            if (!ej) {
              return (
                <div key={`miss-b-${idx}`} className={`text-xs text-[var(--color-danger)] p-1`}>
                  ⚠️ Referencia huérfana: {item.code}
                </div>
              );
            }

            return (
              <div key={`b-${item.code}-${idx}`} className={componentStyles.items.compactItem}>
                <Badge variant="outline" className={`${tipoColors[ej.tipo]} rounded-full ${componentStyles.typography.compactText}`}>
                  {ej.tipo}
                </Badge>
                {ej.variations && ej.variations.length > 0 && (
                  <div className="flex items-center justify-center w-5 h-5 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0" title={`${ej.variations.length} variaciones`}>
                    <Eye className="w-3 h-3 text-blue-500" />
                  </div>
                )}
                {semanaFoco && S.foco !== semanaFoco && (
                  <div className="flex items-center justify-center w-5 h-5 bg-purple-50 dark:bg-purple-900/20 rounded-full shrink-0" title="Modo Repaso">
                    <Shuffle className="w-3 h-3 text-purple-500" />
                  </div>
                )}
                <span className="flex-1 text-[var(--color-text-primary)] font-medium truncate">{ej.nombre}</span>
                <span className={`text-[var(--color-text-secondary)] ${componentStyles.typography.compactTextTiny} flex-shrink-0`}>{ej.code}</span>
              </div>
            );
          }

          // Ronda
          const r = (S.rondas || []).find(x => x.id === item.id);
          if (!r) {
            return (
              <div key={`miss-r-${idx}`} className={`text-xs text-[var(--color-danger)] p-1`}>
                ⚠️ Ronda no encontrada
              </div>
            );
          }

          const key = item.id || idx;
          const isOpen = !!expanded[key];

          return (
            <div key={`r-${key}`}>
              <div
                className={componentStyles.items.compactItemHover}
                onClick={() => toggleRonda(key)}
              >
                <div className={`flex items-center ${componentStyles.layout.gapCompact} flex-shrink-0`}>
                  {isOpen ? (
                    <ChevronDown className="w-3 h-3 text-[var(--color-text-secondary)]" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-[var(--color-text-secondary)]" />
                  )}
                  <Badge variant="outline" className={`bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] rounded-full ${componentStyles.typography.compactText} font-semibold`}>
                    RONDA
                  </Badge>
                </div>
                <span className="flex-1 text-[var(--color-text-primary)] font-medium truncate">
                  {r.aleatoria && <Shuffle className="w-3 h-3 inline mr-1 text-[var(--color-primary)]" />}
                  × {r.repeticiones} repeticiones ({r.bloques.length} ejercicios)
                </span>
              </div>

              {isOpen && (
                <div className="ml-2 mt-1.5 space-y-1">
                  {r.bloques.map((code, j) => {
                    const ej = bloquesMap.get(code);
                    if (!ej) {
                      return (
                        <div key={`r-${key}-${j}`} className={`text-xs text-[var(--color-danger)] p-1 ml-2`}>
                          ⚠️ Referencia huérfana: {code}
                        </div>
                      );
                    }

                    return (
                      <div key={`r-${key}-${code}-${j}`} className={`${componentStyles.items.compactItem} ml-2`}>
                        <Badge variant="outline" className={`${componentStyles.typography.compactText} rounded-full ${tipoColors[ej.tipo]}`}>
                          {ej.tipo}
                        </Badge>
                        {ej.variations && ej.variations.length > 0 && (
                          <div className="flex items-center justify-center w-5 h-5 bg-blue-50 dark:bg-blue-900/20 rounded-full shrink-0" title="Ejercicio con variaciones (Modo Repaso)">
                            <Eye className="w-3 h-3 text-blue-500" />
                          </div>
                        )}
                        <span className="flex-1 text-[var(--color-text-primary)] truncate">{ej.nombre}</span>
                        <span className={`text-[var(--color-text-secondary)] ${componentStyles.typography.compactTextTiny} flex-shrink-0`}>{ej.code}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
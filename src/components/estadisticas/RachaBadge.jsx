import React from "react";
import { Badge } from "@/components/ds";
import { Star, TrendingUp } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { cn } from "@/lib/utils";

/**
 * RachaBadge - Componente mejorado para mostrar rachas con contexto
 * 
 * @param {Object} props
 * @param {number} props.rachaActual - Racha actual de días seguidos
 * @param {number} props.rachaMaxima - Racha máxima en el período
 * @param {string} props.className - Clases adicionales
 */
export default function RachaBadge({ rachaActual, rachaMaxima, className }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center gap-2">
        <Badge 
          className={cn(
            componentStyles.status.badgeWarning,
            "text-base font-bold px-3 py-1.5 rounded-full"
          )}
        >
          <Star className="w-4 h-4 mr-1.5" />
          {rachaActual}
          <span className="text-xs ml-1.5 font-normal">días</span>
        </Badge>
        {rachaMaxima > rachaActual && (
          <Badge 
            variant="outline"
            className="text-xs px-2 py-0.5"
            title={`Racha máxima en el período: ${rachaMaxima} días`}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Máx: {rachaMaxima}
          </Badge>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] text-center">
        {rachaActual === 0 
          ? "Comienza a practicar para iniciar tu racha"
          : rachaActual === 1
          ? "Día seguido practicando"
          : "días seguidos practicando"
        }
      </p>
    </div>
  );
}


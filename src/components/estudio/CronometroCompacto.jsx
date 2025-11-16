import React from "react";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CronometroCompacto({ tiempoActual, tiempoObjetivo, isAD }) {
  const minutos = Math.floor(tiempoActual / 60);
  const segundos = tiempoActual % 60;
  
  const minutosObj = Math.floor(tiempoObjetivo / 60);
  const segundosObj = tiempoObjetivo % 60;
  
  // Calcular porcentaje y color
  const porcentaje = tiempoObjetivo > 0 ? (tiempoActual / tiempoObjetivo) * 100 : 0;
  const exceso = tiempoActual > tiempoObjetivo ? tiempoActual - tiempoObjetivo : 0;
  
  let colorClase = "text-gray-900";
  if (porcentaje > 100) {
    colorClase = "text-red-600";
  } else if (porcentaje > 85) {
    colorClase = "text-amber-600";
  } else if (porcentaje > 0) {
    colorClase = "text-green-600";
  }
  
  if (isAD) {
    return (
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-ui/60" />
        <span className="text-sm text-ui/60 tabular-nums">--:--</span>
        <Badge className="bg-amber-100 text-amber-800 text-xs rounded-full">No suma tiempo</Badge>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-ui/80" />
      <div className="flex items-center gap-1">
        <span className={`text-lg font-bold tabular-nums ${colorClase}`}>
          {minutos}:{String(segundos).padStart(2, '0')}
        </span>
        {tiempoObjetivo > 0 && (
          <>
            <span className="text-sm text-ui/80">/</span>
            <span className="text-sm text-ui/80 tabular-nums">
              {minutosObj}:{String(segundosObj).padStart(2, '0')}
            </span>
          </>
        )}
        {exceso > 0 && (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs ml-1 rounded-full">
            +{Math.floor(exceso / 60)}:{String(exceso % 60).padStart(2, '0')}
          </Badge>
        )}
      </div>
    </div>
  );
}
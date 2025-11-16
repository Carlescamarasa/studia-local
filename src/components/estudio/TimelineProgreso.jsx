import React from "react";

export default function TimelineProgreso({ tiempoActual, tiempoObjetivo, label, className = "" }) {
  if (tiempoObjetivo === 0) return null;
  
  const porcentaje = Math.min((tiempoActual / tiempoObjetivo) * 100, 100);
  const excedido = tiempoActual > tiempoObjetivo;
  
  let colorBarra = "bg-green-500";
  if (excedido) {
    colorBarra = "bg-red-500";
  } else if (porcentaje > 85) {
    colorBarra = "bg-amber-500";
  }
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-ui/80 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">
          {Math.floor(tiempoActual / 60)}:{String(tiempoActual % 60).padStart(2, '0')} / {Math.floor(tiempoObjetivo / 60)}:{String(tiempoObjetivo % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="bg-[var(--color-border-default)]/50 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`${colorBarra} h-full transition-all duration-300`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
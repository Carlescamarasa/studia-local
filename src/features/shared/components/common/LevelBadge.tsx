import React from "react";
import { Badge } from "@/features/shared/components/ui/badge";

export default function LevelBadge({ level, label: customLabel }) {
    if (!level) return null;

    let label = customLabel;
    let className = "";

    // Determinar color basado en el nivel (siempre, para mantener consistencia visual)
    if (level >= 1 && level <= 3) {
        if (!label) label = "Principiante";
        className = "badge-info"; // Azul
    } else if (level >= 4 && level <= 6) {
        if (!label) label = "Intermedio";
        className = "badge-success"; // Verde
    } else if (level >= 7 && level <= 9) {
        if (!label) label = "Avanzado";
        className = "badge-primary"; // Color principal (morado/naranja según tema)
    } else if (level >= 10) {
        if (!label) label = "Profesional";
        className = "badge-warning"; // Ámbar/Naranja
    } else {
        // Fallback para niveles fuera de rango o si solo se pasa label
        if (!label) label = "Nivel " + level;
        className = "badge-default";
    }

    return (
        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-auto font-medium border transition-colors ${className}`}>
            Nivel {level} • {label ? label.charAt(0).toUpperCase() + label.slice(1) : ''}
        </Badge>
    );
};

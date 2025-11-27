import React from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * RowActionsMenu - Menú de acciones para filas de tabla
 * 100% conectado al Design System
 * - Botón de tres puntos con clases semánticas
 * - Visible en hover/focus para accesibilidad
 * - Dropdown con tokens del DS
 */
export default function RowActionsMenu({ actions = [] }) {
  if (!actions || actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="btn-ghost h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-xl focus-brand min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 touch-manipulation"
          aria-label="Abrir menú de acciones"
          title="Más opciones"
        >
          <MoreVertical className="h-4 w-4 sm:h-4 sm:w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => (
          <DropdownMenuItem
            key={action.id || index}
            onClick={action.onClick}
            disabled={action.disabled}
            className="cursor-pointer focus-brand"
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
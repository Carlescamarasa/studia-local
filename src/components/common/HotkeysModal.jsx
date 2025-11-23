import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { componentStyles } from "@/design/componentStyles";
import { Keyboard } from "lucide-react";
import { useEffectiveUser } from "../utils/helpers";
import { getHotkeysForRole, formatShortcut } from "@/utils/hotkeys";

/**
 * Modal que muestra todas las leyendas de atajos de teclado disponibles
 */
export default function HotkeysModal({ open, onOpenChange }) {
  const effectiveUser = useEffectiveUser();
  const userRole = effectiveUser?.rolPersonalizado || 'ESTU';

  // Obtener hotkeys desde la configuración única - mostrar primary y alt si existe
  const formatHotkeyDisplay = (hotkey) => {
    let texto = formatShortcut(hotkey.primary);
    // Si hay alias (máximo 1), mostrarlo también
    if (hotkey.aliases && hotkey.aliases.length > 0) {
      const alias = hotkey.aliases[0]; // Solo mostrar el primero si hay más de uno
      texto += ` o ${formatShortcut(alias)}`;
    }
    return texto;
  };
  
  const hotkeysGlobales = getHotkeysForRole(userRole, 'global').map(hk => ({
    atajo: formatHotkeyDisplay(hk),
    descripcion: hk.description,
    disponible: true,
  }));

  const hotkeysCrear = getHotkeysForRole(userRole, 'create').map(hk => ({
    atajo: formatHotkeyDisplay(hk),
    descripcion: hk.description,
    disponible: true,
  }));

  const hotkeysEstudio = getHotkeysForRole(userRole, 'study').map(hk => ({
    atajo: formatHotkeyDisplay(hk),
    descripcion: hk.description,
    disponible: true,
  }));

  const hotkeysFeedback = getHotkeysForRole(userRole, 'feedback').map(hk => ({
    atajo: formatHotkeyDisplay(hk),
    descripcion: hk.description,
    disponible: true,
  }));


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        size="lg" 
        className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
      >
        {/* Header fijo */}
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <Keyboard className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-[var(--color-text-primary)]">
                Atajos de teclado
              </DialogTitle>
              <DialogDescription className="text-sm text-[var(--color-text-secondary)] mt-1">
                Lista completa de atajos disponibles en la aplicación
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Atajos globales */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">
              Navegación general
            </h3>
            <div className="space-y-1">
              {hotkeysGlobales.map((hotkey, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                >
                    <kbd className="shrink-0 min-w-[140px] text-center text-xs font-mono bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] rounded px-2.5 py-1.5 text-[var(--color-text-primary)] leading-tight">
                      {hotkey.atajo}
                    </kbd>
                  <span className="text-sm text-[var(--color-text-primary)] flex-1">
                    {hotkey.descripcion}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Atajos de crear elementos */}
          {hotkeysCrear.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">
                Listas / Crear elementos
              </h3>
              <div className="space-y-1">
                {hotkeysCrear.map((hotkey, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                  >
                    <kbd className="shrink-0 min-w-[140px] text-center text-xs font-mono bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] rounded px-2.5 py-1.5 text-[var(--color-text-primary)] leading-tight">
                      {hotkey.atajo}
                    </kbd>
                    <span className="text-sm text-[var(--color-text-primary)] flex-1">
                      {hotkey.descripcion}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Atajos de modo estudio */}
          {hotkeysEstudio.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">
                Modo estudio
              </h3>
              <div className="space-y-1">
                {hotkeysEstudio.map((hotkey, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                  >
                    <kbd className="shrink-0 min-w-[100px] text-center text-xs font-mono bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] rounded px-2.5 py-1.5 text-[var(--color-text-primary)] leading-tight">
                      {hotkey.atajo}
                    </kbd>
                    <span className="text-sm text-[var(--color-text-primary)] flex-1">
                      {hotkey.descripcion}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Atajos de feedback */}
          {hotkeysFeedback.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">
                Feedback de sesión
              </h3>
              <div className="space-y-1">
                {hotkeysFeedback.map((hotkey, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                  >
                    <kbd className="shrink-0 min-w-[100px] text-center text-xs font-mono bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] rounded px-2.5 py-1.5 text-[var(--color-text-primary)] leading-tight">
                      {hotkey.atajo}
                    </kbd>
                    <span className="text-sm text-[var(--color-text-primary)] flex-1">
                      {hotkey.descripcion}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer fijo */}
        <DialogFooter className="flex-shrink-0 px-6 py-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-sm">
          <div className="w-full rounded-lg bg-[var(--color-info)]/10 border border-[var(--color-info)]/20 p-2.5">
            <p className="text-xs text-[var(--color-text-secondary)] text-center">
              <strong className="text-[var(--color-text-primary)]">Nota:</strong> Los atajos no se activan mientras escribes en campos de texto, textareas o áreas editables.
            </p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

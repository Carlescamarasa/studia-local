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

/**
 * Modal que muestra todas las leyendas de atajos de teclado disponibles
 */
export default function HotkeysModal({ open, onOpenChange }) {
  const effectiveUser = useEffectiveUser();
  const userRole = effectiveUser?.rolPersonalizado;

  const hotkeysGlobales = [
    {
      atajo: "Ctrl/⌘ + M",
      descripcion: "Abrir/cerrar menú lateral",
      disponible: true,
    },
    {
      atajo: "Ctrl/⌘ + Shift + D",
      descripcion: "Alternar tema claro/oscuro",
      disponible: true,
    },
    ...(userRole === 'ESTU' ? [{
      atajo: "Ctrl/⌘ + Alt + S",
      descripcion: "Ir a Studia ahora",
      disponible: true,
    }] : []),
  ];

  const hotkeysEstudio = userRole === 'ESTU' ? [
    {
      atajo: "← →",
      descripcion: "Navegar entre ejercicios",
      disponible: true,
    },
    {
      atajo: "Espacio",
      descripcion: "Play/pausa del reproductor de audio",
      disponible: true,
    },
    {
      atajo: "O",
      descripcion: "Completar ejercicio actual",
      disponible: true,
    },
    {
      atajo: "Enter",
      descripcion: "Completar ejercicio (alternativa)",
      disponible: true,
    },
    {
      atajo: "I",
      descripcion: "Alternar índice/breadcrumb de ejercicios",
      disponible: true,
    },
    {
      atajo: "?",
      descripcion: "Mostrar ayuda",
      disponible: true,
    },
    {
      atajo: "Esc",
      descripcion: "Cerrar modales o cancelar sesión",
      disponible: true,
    },
  ] : [];

  const hotkeysFeedback = userRole === 'ESTU' ? [
    {
      atajo: "1 - 4",
      descripcion: "Valoración rápida (Muy difícil, Difícil, Bien, Excelente)",
      disponible: true,
    },
    {
      atajo: "Ctrl/⌘ + Enter",
      descripcion: "Guardar feedback y finalizar sesión",
      disponible: true,
    },
  ] : [];

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
              Atajos globales
            </h3>
            <div className="space-y-1">
              {hotkeysGlobales.map((hotkey, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                >
                  <kbd className="kbd shrink-0 min-w-[100px] text-center text-xs">
                    {hotkey.atajo}
                  </kbd>
                  <span className="text-sm text-[var(--color-text-primary)] flex-1">
                    {hotkey.descripcion}
                  </span>
                </div>
              ))}
            </div>
          </div>

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
                    <kbd className="kbd shrink-0 min-w-[100px] text-center text-xs">
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
                    <kbd className="kbd shrink-0 min-w-[100px] text-center text-xs">
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

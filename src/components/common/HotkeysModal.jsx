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
    {
      atajo: "Ctrl/⌘ + Alt + K",
      descripcion: "Mostrar/ocultar panel de atajos de teclado",
      disponible: true,
    },
    {
      atajo: "Ctrl/⌘ + Alt + L",
      descripcion: "Cerrar sesión",
      disponible: true,
    },
    ...(userRole === 'ESTU' ? [
      {
        atajo: "Ctrl/⌘ + Alt + S",
        descripcion: "Ir a Studia ahora",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + M",
        descripcion: "Ir a Mi Semana",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + E",
        descripcion: "Ir a Mis Estadísticas",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + C",
        descripcion: "Ir a Calendario",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + D",
        descripcion: "Ir a Centro de dudas",
        disponible: true,
      },
    ] : []),
    ...(userRole === 'PROF' || userRole === 'ADMIN' ? [
      {
        atajo: "Ctrl/⌘ + Alt + A",
        descripcion: "Ir a Asignaciones",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + G",
        descripcion: "Ir a Agenda",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + P",
        descripcion: "Ir a Plantillas",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + E",
        descripcion: "Ir a Estadísticas",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + C",
        descripcion: "Ir a Calendario",
        disponible: true,
      },
    ] : []),
    ...(userRole === 'ADMIN' ? [
      {
        atajo: "Ctrl/⌘ + Alt + U",
        descripcion: "Ir a Usuarios",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + I",
        descripcion: "Ir a Importar y Exportar",
        disponible: true,
      },
      {
        atajo: "Ctrl/⌘ + Alt + O",
        descripcion: "Ir a Panel de Diseño",
        disponible: true,
      },
    ] : []),
  ];

  const hotkeysCrear = [
    {
      atajo: "Ctrl/⌘ + Alt + N",
      descripcion: "Crear nuevo elemento (contextual según la página)",
      disponible: true,
    },
  ];

  const hotkeysEstudio = userRole === 'ESTU' ? [
    {
      atajo: "Alt + ←",
      descripcion: "Ejercicio anterior",
      disponible: true,
    },
    {
      atajo: "Alt + →",
      descripcion: "Siguiente ejercicio",
      disponible: true,
    },
    {
      atajo: "Alt + P",
      descripcion: "Pausar/reanudar",
      disponible: true,
    },
    {
      atajo: "Alt + O",
      descripcion: "Marcar ejercicio como completado (OK)",
      disponible: true,
    },
    {
      atajo: "Alt + S",
      descripcion: "Saltar ejercicio actual",
      disponible: true,
    },
    {
      atajo: "Alt + T",
      descripcion: "Colapsar/expandir barra de timer",
      disponible: true,
    },
    {
      atajo: "Alt + I",
      descripcion: "Mostrar/ocultar índice de ejercicios",
      disponible: true,
    },
    {
      atajo: "Alt + R",
      descripcion: "Repetir ejercicio actual",
      disponible: true,
    },
    {
      atajo: "Alt + Esc",
      descripcion: "Abrir diálogo de salir de la sesión",
      disponible: true,
    },
    {
      atajo: "Espacio",
      descripcion: "Play/pausa del reproductor de audio",
      disponible: true,
    },
    {
      atajo: "← →",
      descripcion: "Navegar entre ejercicios (alternativa)",
      disponible: true,
    },
    {
      atajo: "O",
      descripcion: "Completar ejercicio (alternativa)",
      disponible: true,
    },
    {
      atajo: "Enter",
      descripcion: "Completar ejercicio (alternativa)",
      disponible: true,
    },
    {
      atajo: "I",
      descripcion: "Alternar índice (alternativa)",
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
      atajo: "Alt + 1",
      descripcion: "Muy difícil",
      disponible: true,
    },
    {
      atajo: "Alt + 2",
      descripcion: "Difícil",
      disponible: true,
    },
    {
      atajo: "Alt + 3",
      descripcion: "Bien",
      disponible: true,
    },
    {
      atajo: "Alt + 4",
      descripcion: "Excelente",
      disponible: true,
    },
    {
      atajo: "Alt + Enter",
      descripcion: "Finalizar (submit feedback)",
      disponible: true,
    },
    {
      atajo: "Esc",
      descripcion: "Cerrar modal",
      disponible: true,
    },
    {
      atajo: "1 - 4",
      descripcion: "Valoración rápida (alternativa)",
      disponible: true,
    },
    {
      atajo: "Ctrl/⌘ + Enter",
      descripcion: "Guardar feedback (alternativa)",
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
              Navegación general
            </h3>
            <div className="space-y-1">
              {hotkeysGlobales.map((hotkey, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                >
                  <kbd className="kbd shrink-0 min-w-[140px] text-center text-xs">
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
                    <kbd className="kbd shrink-0 min-w-[140px] text-center text-xs">
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

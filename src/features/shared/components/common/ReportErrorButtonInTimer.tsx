import React from 'react';
import { Bug } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { componentStyles } from '@/design/componentStyles';

/**
 * Versión del botón de reporte para usar dentro del timer dock
 * Posicionado absolutamente, sin lógica de detección de timer
 */
export default function ReportErrorButtonInTimer() {
  const handleClick = () => {
    console.log('[ReportErrorButtonInTimer] Disparando evento open-error-report');
    window.dispatchEvent(new CustomEvent('open-error-report', { 
      detail: {} 
    }));
  };

  return (
    <Button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }}
      size="icon"
      className={`
        z-[50] rounded-full shadow-lg
        w-14 h-14 flex items-center justify-center
        bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]
        text-white
        transition-all hover:scale-110
        pointer-events-auto
        ${componentStyles.buttons.primary}
      `}
      aria-label="Reportar error o problema"
      title="Reportar error o problema"
      type="button"
    >
      <Bug className="w-6 h-6" />
    </Button>
  );
}


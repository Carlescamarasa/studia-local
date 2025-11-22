import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { componentStyles } from '@/design/componentStyles';

export default function ReportErrorButton() {
  const location = useLocation();
  
  // Detectar si estamos en modo estudio (/hoy)
  const isStudyMode = location.pathname.includes('/hoy');
  
  // Ocultar completamente en modo estudio
  if (isStudyMode) {
    return null;
  }
  
  const handleClick = () => {
    console.log('[ReportErrorButton] Disparando evento open-error-report');
    window.dispatchEvent(new CustomEvent('open-error-report', { 
      detail: {} 
    }));
  };

  return (
    <Button
      onClick={handleClick}
      size="icon"
      className={`
        fixed bottom-6 right-6 z-[9999]
        w-14 h-14 rounded-full shadow-lg
        bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]
        text-white
        transition-all hover:scale-110
        ${componentStyles.buttons.primary}
      `}
      aria-label="Reportar error o problema"
      title="Reportar error o problema"
    >
      <Bug className="w-6 h-6" />
    </Button>
  );
}


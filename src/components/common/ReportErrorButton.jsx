import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { componentStyles } from '@/design/componentStyles';
import { cn } from '@/lib/utils';

export default function ReportErrorButton() {
  const location = useLocation();
  const [timerVisible, setTimerVisible] = useState(false);
  
  // Detectar si estamos en modo estudio (/hoy)
  const isStudyMode = location.pathname.includes('/hoy');
  
  // Escuchar eventos del timer para saber si está visible
  useEffect(() => {
    const handleTimerStateChange = (e) => {
      setTimerVisible(e.detail.visible || false);
    };
    
    // Escuchar evento personalizado del timer
    window.addEventListener('timer-state-change', handleTimerStateChange);
    
    // También podemos verificar manualmente si estamos en /hoy y el timer debería estar visible
    // Para simplificar, si estamos en /hoy asumimos que el timer podría estar visible
    if (isStudyMode) {
      // Dar un pequeño delay para que el timer se inicialice
      const timeout = setTimeout(() => {
        setTimerVisible(true);
      }, 100);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('timer-state-change', handleTimerStateChange);
      };
    }
    
    return () => {
      window.removeEventListener('timer-state-change', handleTimerStateChange);
    };
  }, [isStudyMode]);
  
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
      className={cn(
        "fixed right-4 z-[50] rounded-full shadow-lg",
        "w-14 h-14 flex items-center justify-center",
        "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
        "text-white transition-all duration-200 hover:scale-110",
        componentStyles.buttons.primary,
        // Reposicionar cuando el timer está visible
        timerVisible && isStudyMode
          ? "bottom-28 sm:bottom-24" // Se sube cuando el timer está visible (altura del timer ~80px + padding ~20px = ~100px aprox)
          : "bottom-6" // Posición normal
      )}
      aria-label="Reportar error o problema"
      title="Reportar error o problema"
    >
      <Bug className="w-6 h-6" />
    </Button>
  );
}


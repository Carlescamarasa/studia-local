import { useState, createContext, useContext } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Contexto para compartir el estado del modal de hotkeys
const HotkeysModalContext = createContext(null);

export function HotkeysModalProvider({ children }) {
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);

  return (
    <HotkeysModalContext.Provider value={{ showHotkeysModal, setShowHotkeysModal }}>
      {children}
    </HotkeysModalContext.Provider>
  );
}

// Hook para usar el modal de hotkeys
export function useHotkeysModal() {
  const context = useContext(HotkeysModalContext);
  if (!context) {
    throw new Error('useHotkeysModal must be used within HotkeysModalProvider');
  }
  return context;
}

// Componente botón discreto para el header
export function HotkeysModalButton({ className = "", variant = "ghost", size = "sm" }) {
  const { setShowHotkeysModal } = useHotkeysModal();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={() => setShowHotkeysModal(true)}
            className={`h-9 w-9 p-0 rounded-xl focus-brand touch-manipulation ${className}`}
            aria-label="Mostrar atajos de teclado"
            title="Atajos de teclado"
          >
            <HelpCircle className="w-4 h-4 sm:w-4 sm:h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Atajos de teclado</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


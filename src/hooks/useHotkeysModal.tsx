import { useState, createContext, useContext } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/features/shared/components/ui/tooltip";

interface HotkeysModalContextType {
  showHotkeysModal: boolean;
  setShowHotkeysModal: (show: boolean) => void;
}

// Contexto para compartir el estado del modal de hotkeys
const HotkeysModalContext = createContext<HotkeysModalContextType | null>(null);

export function HotkeysModalProvider({ children }: { children: React.ReactNode }) {
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

interface HotkeysModalButtonProps {
  className?: string;
  variant?: "ghost" | "default" | "destructive" | "outline" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

// Componente botón discreto para el header
export function HotkeysModalButton({ className = "", variant = "ghost", size = "sm" }: HotkeysModalButtonProps) {
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
            aria-label="Atajos de teclado (?)"
            title="Atajos de teclado (?)"
          >
            <Keyboard className="w-4 h-4 sm:w-4 sm:h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Atajos de teclado (?)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


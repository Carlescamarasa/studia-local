import React from "react";
import { Button } from "@/components/ui/button";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface MenuToggleButtonProps {
    /** Si el menú está abierto */
    isOpen: boolean;
    /** Callback al hacer toggle del menú */
    onToggle: () => void;
}

export default function MenuToggleButton({ isOpen, onToggle }: MenuToggleButtonProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggle}
                        className="h-9 w-9 p-0 focus-brand"
                        aria-pressed={isOpen}
                        aria-label={isOpen ? "Ocultar menú" : "Mostrar menú"}
                    >
                        {isOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p className="text-xs">
                        {isOpen ? "Ocultar" : "Mostrar"} menú <kbd className="kbd ml-1">Ctrl+M</kbd>
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

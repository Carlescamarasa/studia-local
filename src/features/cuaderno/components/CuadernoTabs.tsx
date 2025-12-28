import React from "react";
import { Button } from "@/components/ui/button";
import { Users, LayoutList } from "lucide-react";

type TabValue = 'estudiantes' | 'asignaciones';

interface CuadernoTabsProps {
    activeTab: TabValue;
    onTabChange: (tab: TabValue) => void;
}

/**
 * CuadernoTabs - Toggle between "Estudiantes" and "Asignaciones" tabs
 */
export default function CuadernoTabs({ activeTab, onTabChange }: CuadernoTabsProps) {
    return (
        <div className="flex gap-2 border-b pb-4">
            <Button
                variant={activeTab === 'estudiantes' ? 'default' : 'ghost'}
                onClick={() => onTabChange('estudiantes')}
                className={activeTab === 'estudiantes' ? "" : "text-muted-foreground"}
                size="sm"
            >
                <Users className="w-4 h-4 mr-2" />
                Estudiantes
            </Button>
            <Button
                variant={activeTab === 'asignaciones' ? 'default' : 'ghost'}
                onClick={() => onTabChange('asignaciones')}
                className={activeTab === 'asignaciones' ? "" : "text-muted-foreground"}
                size="sm"
            >
                <LayoutList className="w-4 h-4 mr-2" />
                Asignaciones
            </Button>
        </div>
    );
}

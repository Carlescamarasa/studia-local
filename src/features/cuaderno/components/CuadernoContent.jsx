import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { componentStyles } from "@/design/componentStyles";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

import CuadernoHeader from "./CuadernoHeader";
import CuadernoTabs from "./CuadernoTabs";
import CuadernoEstudiantesTab from "./CuadernoEstudiantesTab";
import CuadernoAsignacionesTab from "./CuadernoAsignacionesTab";
import FormularioRapido from "@/features/asignaciones/components/FormularioRapido";
import {
    formatLocalDate,
    parseLocalDate,
    startOfMonday,
    calcularLunesSemanaISO
} from "../utils";

/**
 * CuadernoContent - Main content component for cuaderno feature
 * Manages tabs (estudiantes/asignaciones) and week navigation
 */
export default function CuadernoContent() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState(tabFromUrl === 'asignaciones' ? 'asignaciones' : 'estudiantes');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);

    // Week State Logic
    const [semanaActualISO, setSemanaActualISO] = useState(() => {
        return calcularLunesSemanaISO(new Date());
    });

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
    };

    const cambiarSemana = (direccion) => {
        const base = parseLocalDate(semanaActualISO);
        base.setDate(base.getDate() + (direccion * 7));
        const lunes = startOfMonday(base);
        const nextISO = formatLocalDate(lunes);
        if (nextISO !== semanaActualISO) setSemanaActualISO(nextISO);
    };

    const irSemanaActual = () => {
        const lunes = startOfMonday(new Date());
        setSemanaActualISO(formatLocalDate(lunes));
    };

    return (
        <div className={componentStyles.layout.appBackground}>
            <CuadernoHeader
                semanaActualISO={semanaActualISO}
                onPrev={() => cambiarSemana(-1)}
                onNext={() => cambiarSemana(1)}
                onToday={irSemanaActual}
                onNuevaAsignacion={() => setShowForm(true)}
            />

            {/* FormularioRapido - Component handles its own overlay via createPortal */}
            {showForm && (
                <FormularioRapido onClose={() => setShowForm(false)} />
            )}

            <div className="studia-section">
                {/* Search Bar */}
                <div className="mb-6 relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar estudiante o pieza..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-9"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <CuadernoTabs activeTab={activeTab} onTabChange={handleTabChange} />

                <div className="mt-6">
                    {activeTab === 'estudiantes' ? (
                        <CuadernoEstudiantesTab
                            semanaActualISO={semanaActualISO}
                            searchTerm={searchTerm}
                        />
                    ) : (
                        <CuadernoAsignacionesTab
                            semanaActualISO={semanaActualISO}
                            searchTerm={searchTerm}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

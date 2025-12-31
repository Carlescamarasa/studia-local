import React from "react";
import AsignacionesTab from "./AsignacionesTab";

interface CuadernoAsignacionesTabProps {
    semanaActualISO: string;
    searchTerm: string;
}

/**
 * CuadernoAsignacionesTab - Wrapper for AsignacionesTab component
 */
export default function CuadernoAsignacionesTab({
    semanaActualISO,
    searchTerm
}: CuadernoAsignacionesTabProps) {
    return (
        <AsignacionesTab
            externalSearchTerm={searchTerm}
            externalSemanaISO={semanaActualISO}
            hideTitle={true}
            hideSearchAndWeek={true}
        />
    );
}

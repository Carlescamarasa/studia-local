import React from "react";
import AsignacionesTab from "./AsignacionesTab";

/**
 * CuadernoAsignacionesTab - Wrapper for AsignacionesTab component
 */
export default function CuadernoAsignacionesTab({
    semanaActualISO,
    searchTerm
}) {
    return (
        <AsignacionesTab
            externalSearchTerm={searchTerm}
            externalSemanaISO={semanaActualISO}
            hideTitle={true}
            hideSearchAndWeek={true}
        />
    );
}

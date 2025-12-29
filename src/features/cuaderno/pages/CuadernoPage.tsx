import React from "react";
// @ts-expect-error RequireRole is not typed
import RequireRole from "@/features/auth/components/RequireRole";
import CuadernoContent from "../components/CuadernoContent";

/**
 * CuadernoPage - Main entry point for the cuaderno feature
 * Requires PROF or ADMIN role
 */
export default function CuadernoPage() {
    return (
        <RequireRole anyOf={['PROF', 'ADMIN']}>
            <CuadernoContent />
        </RequireRole>
    );
}

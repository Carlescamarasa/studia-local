import React from "react";
import RequireRole from "@/components/auth/RequireRole";
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

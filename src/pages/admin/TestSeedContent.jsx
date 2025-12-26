/**
 * TestSeedContent - Embedded test & seed content for Configuración page
 */

import MaintenancePanel from './maintenance/MaintenancePanel';

import { useAuth } from "@/auth/AuthProvider";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { useEffect } from "react";

export default function TestSeedContent() {
    const { user } = useAuth();
    const effectiveCtx = useEffectiveUser();



    return <MaintenancePanel embedded />;
}

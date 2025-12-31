/**
 * EffectiveUserProvider
 * 
 * Proporciona contexto para suplantación de usuarios (impersonation).
 * Permite que un admin vea la app "como si fuera" otro usuario,
 * manteniendo trazabilidad del usuario real.
 * 
 * PERSISTENCIA: El estado de impersonación se guarda en localStorage
 * para sobrevivir refrescos de página.
 */

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { UserRole } from '@/features/shared/types/domain';
import { EffectiveUserContextValue, ImpersonationData } from '@/features/auth/types';

const EffectiveUserContext = createContext<EffectiveUserContextValue | null>(null);
const STORAGE_KEY = 'studia_impersonation';

/**
 * EffectiveUserProvider
 * 
 * Debe usarse dentro de AuthProvider para tener acceso a useAuth().
 */
export function EffectiveUserProvider({ children }: { children: React.ReactNode }) {
    const { user, appRole, profile, loading } = useAuth();

    // Ref to track when we're exiting impersonation (to avoid blocking on AuthProvider loading)
    const isExitingImpersonationRef = useRef(false);

    // Estado de suplantación (inicializado desde localStorage si existe)
    const [impersonatedUser, setImpersonatedUser] = useState<ImpersonationData | null>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as ImpersonationData;
                return parsed;
            }
        } catch (e) {
            console.warn('[EffectiveUserProvider] Error reading localStorage:', e);
        }
        return null;
    });



    // Sincronizar con localStorage cuando cambia
    useEffect(() => {
        if (impersonatedUser) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(impersonatedUser));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [impersonatedUser]);

    // Iniciar suplantación
    const startImpersonation = useCallback((userId: string, role: UserRole, userName: string, email: string | null = null) => {
        if (!userId || !role) {
            console.warn('[EffectiveUserProvider] startImpersonation requiere userId y role');
            return;
        }
        const data: ImpersonationData = { userId, role, userName: userName || null, email: email || null };
        setImpersonatedUser(data);
    }, []);

    // Detener suplantación
    const stopImpersonation = useCallback(() => {
        // Mark that we're exiting to prevent loading state from blocking
        isExitingImpersonationRef.current = true;
        setImpersonatedUser(null);
        // Reset the flag after React has settled the state
        queueMicrotask(() => {
            isExitingImpersonationRef.current = false;
        });
    }, []);

    // SEGURIDAD: Si el usuario real hace logout, limpiar la impersonación inmediatamente
    // Solo ejecutar si ya terminó de cargar la sesión (evitar falso positivo al recargar)
    useEffect(() => {
        if (!loading && !user && impersonatedUser) {
            stopImpersonation();
        }
    }, [user, impersonatedUser, stopImpersonation, loading]);

    // Calcular valores del contexto
    const value = useMemo<EffectiveUserContextValue>(() => {
        // Block calculation only if AuthProvider is loading AND we're NOT exiting impersonation.
        // When exiting impersonation, we should NOT block because:
        // 1. The auth state hasn't changed (same user)
        // 2. Impersonation is purely local state (localStorage + React)
        // 3. Blocking here causes the infinite spinner bug
        if (loading && !isExitingImpersonationRef.current) {
            return {
                loading: true,
                isImpersonating: false,
                effectiveUserId: null,
                effectiveRole: null, // Bloquear acceso hasta que cargue
                effectiveUserName: null,
                effectiveEmail: null,
                realUserId: null,
                realRole: null,
                realUserName: null,
                realEmail: null,
                startImpersonation,
                stopImpersonation,
            };
        }



        const isImpersonating = impersonatedUser !== null;

        return {
            loading: false,

            // Estado de suplantación
            isImpersonating,

            // Valores efectivos (el usuario "activo" para la UI)
            effectiveUserId: isImpersonating ? impersonatedUser.userId : (user?.id ?? null),
            effectiveRole: isImpersonating ? impersonatedUser.role : appRole,
            effectiveUserName: isImpersonating ? impersonatedUser.userName : (profile?.full_name ?? null),
            effectiveEmail: isImpersonating ? impersonatedUser.email : (user?.email ?? null),

            // Valores reales (siempre el usuario autenticado)
            realUserId: user?.id ?? null,
            realRole: appRole,
            realUserName: profile?.full_name ?? null,
            realEmail: user?.email ?? null,

            // Acciones
            startImpersonation,
            stopImpersonation,
        };
    }, [loading, user, appRole, profile, impersonatedUser, startImpersonation, stopImpersonation]);

    return (
        <EffectiveUserContext.Provider value={value}>
            {children}
        </EffectiveUserContext.Provider>
    );
}

/**
 * Hook para acceder al contexto de usuario efectivo
 */
export function useEffectiveUser(): EffectiveUserContextValue {
    const context = useContext(EffectiveUserContext);

    if (!context) {
        // En desarrollo durante HMR, devolver objeto temporal
        if (import.meta.env.DEV && import.meta.hot) {
            console.warn('[EffectiveUserProvider] useEffectiveUser llamado sin provider durante HMR');
            return {
                loading: false,
                isImpersonating: false,
                effectiveUserId: null,
                effectiveRole: 'ESTU',
                effectiveUserName: null,
                effectiveEmail: null,
                realUserId: null,
                realRole: 'ESTU',
                realUserName: null,
                realEmail: null,
                startImpersonation: (_userId: string, _role: UserRole, _userName: string, _email: string | null = null) => { },
                stopImpersonation: () => { },
            };
        }

        throw new Error('useEffectiveUser debe usarse dentro de EffectiveUserProvider');
    }

    return context;
}

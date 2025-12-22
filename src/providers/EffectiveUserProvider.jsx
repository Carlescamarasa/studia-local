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

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/auth/AuthProvider';

const EffectiveUserContext = createContext(null);
const STORAGE_KEY = 'studia_impersonation';

/**
 * EffectiveUserProvider
 * 
 * Debe usarse dentro de AuthProvider para tener acceso a useAuth().
 */
export function EffectiveUserProvider({ children }) {
    const { user, appRole, profile } = useAuth();

    // Estado de suplantación (inicializado desde localStorage si existe)
    const [impersonatedUser, setImpersonatedUser] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (import.meta.env.DEV) {
                    console.log('[EffectiveUserProvider] Restored impersonation from localStorage:', parsed);
                }
                return parsed;
            }
        } catch (e) {
            console.warn('[EffectiveUserProvider] Error reading localStorage:', e);
        }
        return null;
    });
    // { userId: string, role: string, userName: string, email?: string }

    // Sincronizar con localStorage cuando cambia
    useEffect(() => {
        if (impersonatedUser) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(impersonatedUser));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [impersonatedUser]);

    // Iniciar suplantación
    const startImpersonation = useCallback((userId, role, userName, email = null) => {
        if (!userId || !role) {
            console.warn('[EffectiveUserProvider] startImpersonation requiere userId y role');
            return;
        }
        const data = { userId, role, userName: userName || null, email: email || null };
        setImpersonatedUser(data);

        if (import.meta.env.DEV) {
            console.log('[EffectiveUserProvider] Impersonation started:', data);
        }
    }, []);

    // Detener suplantación
    const stopImpersonation = useCallback(() => {
        setImpersonatedUser(null);

        if (import.meta.env.DEV) {
            console.log('[EffectiveUserProvider] Impersonation stopped');
        }
    }, []);

    // Valores del contexto
    const value = useMemo(() => {
        const isImpersonating = impersonatedUser !== null;

        return {
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
    }, [user?.id, user?.email, appRole, profile?.full_name, impersonatedUser, startImpersonation, stopImpersonation]);

    return (
        <EffectiveUserContext.Provider value={value}>
            {children}
        </EffectiveUserContext.Provider>
    );
}

/**
 * Hook para acceder al contexto de usuario efectivo
 */
export function useEffectiveUser() {
    const context = useContext(EffectiveUserContext);

    if (!context) {
        // En desarrollo durante HMR, devolver objeto temporal
        if (import.meta.env.DEV && import.meta.hot) {
            console.warn('[EffectiveUserProvider] useEffectiveUser llamado sin provider durante HMR');
            return {
                isImpersonating: false,
                effectiveUserId: null,
                effectiveRole: 'ESTU',
                effectiveUserName: null,
                effectiveEmail: null,
                realUserId: null,
                realRole: 'ESTU',
                realUserName: null,
                realEmail: null,
                startImpersonation: () => { },
                stopImpersonation: () => { },
            };
        }

        throw new Error('useEffectiveUser debe usarse dentro de EffectiveUserProvider');
    }

    return context;
}

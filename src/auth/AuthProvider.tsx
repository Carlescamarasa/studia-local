/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';
import { toast } from 'sonner';
import { AuthState, AuthContextValue } from '@/features/auth/types';
import { UserRole, StudiaUser } from '@/features/shared/types/domain';
import { Session } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);



export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ============================================================================
  // ESTADO UNIFICADO DE AUTENTICACIÓN
  // ============================================================================
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    initialProfileLoaded: false,
    error: null,
  });

  // Refs para control de carga
  const fetchingProfileRef = useRef(false);
  const lastProfileUserIdRef = useRef<string | null>(null);
  const sessionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionNotFoundShownRef = useRef(false);

  // Extraer valores del estado para compatibilidad
  const user = authState.user;
  const session = authState.session;
  const profile = authState.profile;
  const loading = authState.loading;
  const authError = authState.error;

  // Rol basado en el perfil de BD (no emails hardcodeados)
  const appRole = useMemo((): UserRole => {
    return profile?.role || 'ESTU';
  }, [profile?.role]);

  // ============================================================================
  // FUNCIÓN PARA CARGAR PERFIL - OPTIMIZADA con TIMEOUT
  // ============================================================================
  // Stabilize fetchProfile by removing dependency on authState.profile?.id
  const fetchProfile = useCallback(async (userId: string | null, isInitialLoad = false) => {
    if (!userId) {
      setAuthState(prev => ({ ...prev, profile: null, loading: false }));
      lastProfileUserIdRef.current = null;
      fetchingProfileRef.current = false;
      return;
    }

    if (fetchingProfileRef.current && lastProfileUserIdRef.current === userId) {
      if (import.meta.env.DEV) console.log('[AuthProvider] Already fetching profile for:', userId);
      return;
    }

    fetchingProfileRef.current = true;
    lastProfileUserIdRef.current = userId;

    if (import.meta.env.DEV) console.log('[AuthProvider] Starting profile fetch for:', userId);

    // Helper para hacer una consulta con timeout
    const fetchWithTimeout = async (timeoutMs: number): Promise<{ data: StudiaUser | null; error: Error | null }> => {
      const fetchPromise = supabase
        .from('profiles')
        .select('id, full_name, role, profesor_asignado_id, is_active, created_at, updated_at')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs)
      );

      try {
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        return { data: result.data as StudiaUser, error: result.error };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    };

    // Retry config
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 100; // Delay inicial para que el cliente REST se inicialice
    const TIMEOUT_MS = 5000;

    try {
      // Pequeño delay inicial para evitar race condition con la inicialización del cliente
      await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY_MS));

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (import.meta.env.DEV) console.log(`[AuthProvider] Fetch attempt ${attempt}/${MAX_RETRIES}...`);

        const { data, error } = await fetchWithTimeout(TIMEOUT_MS);

        if (data && !error) {
          if (import.meta.env.DEV) console.log('[AuthProvider] Profile loaded successfully');
          setAuthState(prev => ({
            ...prev,
            profile: data,
            initialProfileLoaded: true,
            loading: false,
          }));
          fetchingProfileRef.current = false;
          return;
        }

        lastError = error;
        if (import.meta.env.DEV) console.warn(`[AuthProvider] Attempt ${attempt} failed:`, error?.message);

        // Backoff exponencial antes del siguiente retry (excepto en el último intento)
        if (attempt < MAX_RETRIES) {
          const backoffMs = INITIAL_DELAY_MS * Math.pow(2, attempt);
          if (import.meta.env.DEV) console.log(`[AuthProvider] Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }

      // Todos los intentos fallaron
      console.error('[AuthProvider] All fetch attempts failed:', lastError?.message);
      setAuthState(prev => ({
        ...prev,
        profile: null,
        loading: false,
        initialProfileLoaded: true,
      }));
      fetchingProfileRef.current = false;

    } catch (err) {
      console.error('[AuthProvider] Profile fetch crash:', err);
      setAuthState(prev => ({
        ...prev,
        profile: null,
        loading: false,
        initialProfileLoaded: true,
      }));
      fetchingProfileRef.current = false;
    }
  }, []); // Stable function reference

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore signout errors if session is already missing
    }

    setAuthState({
      session: null,
      user: null,
      profile: null,
      loading: false,
      initialProfileLoaded: true,
      error: null,
    });
    fetchingProfileRef.current = false;
    lastProfileUserIdRef.current = null;
    sessionNotFoundShownRef.current = false;
  }, []);

  const handleAuthErrorEvent = useCallback(async (event: any) => {
    const error = event.detail?.error;
    if (error && isAuthError(error)) {
      const isSessionNotFound = error.message?.includes('session_not_found') ||
        error.status === 403 ||
        error.code === 'session_not_found';

      setAuthState({
        session: null,
        user: null,
        profile: null,
        loading: false,
        initialProfileLoaded: false,
        error,
      });
      lastProfileUserIdRef.current = null;
      fetchingProfileRef.current = false;

      if (isSessionNotFound && !sessionNotFoundShownRef.current) {
        sessionNotFoundShownRef.current = true;
        toast.error('Sesión expirada. Por favor, vuelve a iniciar sesión.');

        setTimeout(() => {
          if (!window.location.pathname.includes('/auth/login')) {
            window.location.href = '/auth/login';
          }
        }, 2000);
      }

      try {
        await supabase.auth.signOut();
      } catch (signOutError) { /* Intentionally swallowed */ }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('auth-error', handleAuthErrorEvent);
    return () => window.removeEventListener('auth-error', handleAuthErrorEvent);
  }, [handleAuthErrorEvent]);

  useEffect(() => {
    let isMounted = true;

    // Use a ref to track if we've handled the initial session to avoid double-processing
    let initialHandled = false;

    // Listen to changes - This handles INITIAL_SESSION as well in v2+
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (import.meta.env.DEV) console.log('[AuthProvider] Auth event:', event, session?.user?.id);

      // IMPORTANTE: Ignorar SIGNED_IN si aún no hemos recibido INITIAL_SESSION
      // Esto evita que intentemos fetch del perfil antes de que el cliente REST esté listo
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !initialHandled) {
        if (import.meta.env.DEV) console.log(`[AuthProvider] Ignoring early ${event}, waiting for INITIAL_SESSION...`);
        return;
      }

      // Marcar como manejado cuando recibimos INITIAL_SESSION
      if (event === 'INITIAL_SESSION') {
        initialHandled = true;
      }

      if (!session) {
        setAuthState({
          session: null,
          user: null,
          profile: null,
          loading: false,
          initialProfileLoaded: true,
          error: null,
        });
        lastProfileUserIdRef.current = null;
        fetchingProfileRef.current = false;
        return;
      }

      const currentUserId = session.user.id;
      const userIdChanged = lastProfileUserIdRef.current !== currentUserId;

      // Update basic session info
      setAuthState(prev => ({
        ...prev,
        session,
        user: session.user,
        error: null,
        // Only trigger loading if the user actually changed
        loading: userIdChanged ? true : prev.loading,
      }));

      // Trigger profile fetch if user changed or it's INITIAL_SESSION
      if (userIdChanged || event === 'INITIAL_SESSION') {
        await fetchProfile(currentUserId, event === 'INITIAL_SESSION');
      } else {
        // If user is the same, ensure loading is stopped (failsafe)
        setAuthState(prev => (prev.loading ? { ...prev, loading: false } : prev));
      }
    });

    // Failsafe: If after 3s we are still loading, force a manual check
    // This handles cases where onAuthStateChange might not fire INITIAL_SESSION on some browsers/versions
    const failsafeTimeout = setTimeout(async () => {
      if (isMounted && !initialHandled) {
        if (import.meta.env.DEV) console.log('[AuthProvider] INITIAL_SESSION failsafe triggered');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && isMounted) {
          setAuthState(prev => ({ ...prev, loading: false, initialProfileLoaded: true }));
        }
      }
    }, 3000);

    sessionCheckIntervalRef.current = setInterval(async () => {
      if (!isMounted) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && lastProfileUserIdRef.current) {
          await signOut();
        }
      } catch (e) { /* Intentionally swallowed */ }
    }, 10 * 60 * 1000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(failsafeTimeout);
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current as any);
      }
    };
  }, [fetchProfile, signOut]); // Only stable dependencies // Stable dependencies

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data?.user) {
      setAuthState(prev => ({ ...prev, user: data.user, loading: true }));
      await fetchProfile(data.user.id, false);
    }
    return data;
  }, [fetchProfile]);

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch {
      return false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    loading,
    authError,
    appRole,
    signIn,
    signOut,
    checkSession,
    resetPassword,
  }), [user, session, profile, loading, authError, appRole, signIn, signOut, checkSession, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

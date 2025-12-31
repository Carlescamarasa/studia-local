import { User, Session } from '@supabase/supabase-js';
import { StudiaUser, UserRole } from '@/features/shared/types/domain';

/* eslint-disable @typescript-eslint/no-explicit-any */
 
export interface AuthState {
    session: Session | null;
    user: User | null;
    profile: StudiaUser | null;
    loading: boolean;
    initialProfileLoaded: boolean;
    error: any;
}

export interface AuthContextValue {
    user: User | null;
    session: Session | null;
    profile: StudiaUser | null;
    loading: boolean;
    authError: any;
    appRole: UserRole;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<boolean>;
    resetPassword: (email: string) => Promise<void>;
}

export interface ImpersonationData {
    userId: string;
    role: UserRole;
    userName: string | null;
    email: string | null;
}

export interface EffectiveUserContextValue {
    loading: boolean;
    isImpersonating: boolean;
    effectiveUserId: string | null;
    effectiveRole: UserRole | null;
    effectiveUserName: string | null;
    effectiveEmail: string | null;
    realUserId: string | null;
    realRole: UserRole | null;
    realUserName: string | null;
    realEmail: string | null;
    startImpersonation: (userId: string, role: UserRole, userName: string, email?: string | null) => void;
    stopImpersonation: () => void;
}

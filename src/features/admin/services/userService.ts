import { supabase } from '@/lib/supabaseClient';
import { setProfileActive } from "@/api/remoteDataAPI";
import { sendPasswordResetAdmin } from "@/api/userAdmin";

export type UserRole = 'ADMIN' | 'PROF' | 'ESTU';

export interface User {
    id: string;
    email: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    role: UserRole;
    rolPersonalizado?: UserRole; // Legacy compatibility
    created_at: string;
    last_login?: string;
    avatar_url?: string;
    is_active?: boolean;
    isActive?: boolean; // Legacy compatibility
    profesorAsignadoId?: string | null;
}

export interface UserListItem extends User {
    has_assignments?: boolean;
    last_activity?: string;
}

export interface CreateUserData {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    password?: string;
}

export interface InviteUserData {
    email: string;
    role: UserRole;
    firstName?: string;
    lastName?: string;
}

/**
 * userService - Centralized data access for user management
 */
export const userService = {
    /**
     * Delete a user using the project's Edge Function
     */
    async deleteUser(userId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            throw new Error('No hay sesión activa');
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
            throw new Error('VITE_SUPABASE_URL no configurada');
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al eliminar usuario');
        }

        return await response.json();
    },

    /**
     * Delete multiple users in parallel
     */
    async bulkDeleteUsers(userIds: string[]) {
        const results = await Promise.allSettled(
            userIds.map(id => this.deleteUser(id))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed > 0) {
            const errors = results
                .filter(r => r.status === 'rejected')
                .map(r => (r as PromiseRejectedResult).reason?.message || 'Error desconocido');
            throw new Error(`${successful} eliminados, ${failed} fallaron: ${errors.join(', ')}`);
        }

        return { successful, total: userIds.length };
    },

    /**
     * Update user assignment
     */
    async assignProfesor(userId: string, profesorId: string | null) {
        const { error } = await supabase
            .from('profiles')
            .update({ profesorAsignadoId: profesorId })
            .eq('id', userId);

        if (error) throw error;
    },

    /**
     * Update multiple user assignments
     */
    async bulkAssignProfesor(userIds: string[], profesorId: string | null) {
        const { error } = await supabase
            .from('profiles')
            .update({ profesorAsignadoId: profesorId })
            .in('id', userIds);

        if (error) throw error;
    },

    /**
     * Change user active state
     */
    async setUserActive(userId: string, isActive: boolean) {
        return await setProfileActive(userId, isActive);
    },

    /**
     * Bulk change user active state
     */
    async bulkSetUserActive(userIds: string[], isActive: boolean) {
        const results = await Promise.allSettled(
            userIds.map(id => this.setUserActive(id, isActive))
        );

        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
            const firstError = (results.find(r => r.status === 'rejected') as PromiseRejectedResult)?.reason;
            throw new Error(
                failed === userIds.length
                    ? firstError?.message || 'Error al cambiar estado de los usuarios'
                    : `${failed} de ${userIds.length} actualizaciones fallaron`
            );
        }
    },

    /**
     * Send password reset emails in bulk
     */
    async bulkSendPasswordReset(emails: string[]) {
        const results = await Promise.allSettled(
            emails.map(email => sendPasswordResetAdmin(email))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed > 0) {
            const errors = results
                .filter(r => r.status === 'rejected')
                .map(r => (r as PromiseRejectedResult).reason?.message || 'Error desconocido');
            throw new Error(`${successful} enviados, ${failed} fallaron: ${errors.join(', ')}`);
        }

        return { successful, total: emails.length };
    }
};

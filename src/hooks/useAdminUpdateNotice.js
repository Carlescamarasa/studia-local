import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { getServerVersion } from '@/lib/getServerVersion';

/**
 * Hook for ADMIN-only version update notification
 * Returns null/empty state for non-ADMIN users (no fetches performed)
 */
export function useAdminUpdateNotice() {
    const { appRole } = useAuth();
    const [serverVersion, setServerVersion] = useState(null);
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const lastCheckRef = useRef(0);

    const isAdmin = appRole === 'ADMIN';

    // Get local build info (injected at build time)
    const localBuild = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : null;

    // LocalStorage key for dismissed versions
    const DISMISSED_KEY = 'studia_dismissed_version';

    // Check if a version was dismissed
    const isDismissed = useCallback((commit) => {
        if (!commit) return false;
        try {
            const dismissed = localStorage.getItem(DISMISSED_KEY);
            return dismissed === commit;
        } catch {
            return false;
        }
    }, []);

    // Dismiss current version
    const dismiss = useCallback(() => {
        if (serverVersion?.commit) {
            try {
                localStorage.setItem(DISMISSED_KEY, serverVersion.commit);
            } catch (e) {
                console.warn('[useAdminUpdateNotice] Could not save dismiss state');
            }
        }
        setIsUpdateAvailable(false);
    }, [serverVersion]);

    // Perform update (clear cache and reload)
    const performUpdate = useCallback(() => {
        console.info('[useAdminUpdateNotice] Performing update...');
        try {
            // Clear localStorage to ensure fresh state
            localStorage.clear();
            // Force reload from server
            window.location.reload();
        } catch (e) {
            console.error('[useAdminUpdateNotice] Error during update:', e);
            window.location.reload();
        }
    }, []);

    // Check for updates
    const checkForUpdate = useCallback(async () => {
        if (!isAdmin || !localBuild?.commit) {
            return;
        }

        // Throttle: minimum 60s between checks
        const now = Date.now();
        if (now - lastCheckRef.current < 60000) {
            return;
        }
        lastCheckRef.current = now;

        setIsChecking(true);
        console.info('[useAdminUpdateNotice] Checking for updates...');

        try {
            const server = await getServerVersion(4000);

            if (!server) {
                console.info('[useAdminUpdateNotice] Could not fetch server version');
                setIsChecking(false);
                return;
            }

            setServerVersion(server);

            // Compare commits
            const hasUpdate = server.commit !== localBuild.commit;
            const wasDismissed = isDismissed(server.commit);

            console.info('[useAdminUpdateNotice] Version check:', {
                local: localBuild.commit,
                server: server.commit,
                hasUpdate,
                wasDismissed,
            });

            setIsUpdateAvailable(hasUpdate && !wasDismissed);
        } catch (error) {
            console.warn('[useAdminUpdateNotice] Check failed:', error);
        } finally {
            setIsChecking(false);
        }
    }, [isAdmin, localBuild, isDismissed]);

    // Initial check on mount
    useEffect(() => {
        if (!isAdmin) return;

        // Check after a brief delay to not block initial render
        const timer = setTimeout(() => {
            checkForUpdate();
        }, 2000);

        return () => clearTimeout(timer);
    }, [isAdmin, checkForUpdate]);

    // Check on visibility change (when returning to tab)
    useEffect(() => {
        if (!isAdmin) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdate();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isAdmin, checkForUpdate]);

    // Return nothing meaningful for non-admins
    if (!isAdmin) {
        return {
            isUpdateAvailable: false,
            serverVersion: null,
            localVersion: null,
            isChecking: false,
            dismiss: () => { },
            performUpdate: () => { },
            refresh: () => { },
        };
    }

    return {
        isUpdateAvailable,
        serverVersion,
        localVersion: localBuild,
        isChecking,
        dismiss,
        performUpdate,
        refresh: checkForUpdate,
    };
}

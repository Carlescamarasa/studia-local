import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versionClient } from '@/lib/versionClient';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from '@/auth/AuthProvider';
import { toast } from 'sonner';

/**
 * Hook para gestionar versiones de la aplicación
 * @returns {Object} { currentVersion, history, refresh, createVersion, activateVersion }
 */
export interface UseAppVersionOptions {
  fetchHistory?: boolean;
}

/**
 * Hook para gestionar versiones de la aplicación
 * @returns {Object} { currentVersion, history, refresh, createVersion, activateVersion }
 */
export function useAppVersion(options: UseAppVersionOptions = {}) {
  const { fetchHistory = false } = options;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query para versión en producción (desde /version.json)
  const {
    data: productionVersion,
    isLoading: isLoadingProduction,
    refetch: refreshProduction,
  } = useQuery({
    queryKey: ['appVersion', 'production'],
    queryFn: async () => {
      const urls = [
        `/version.json?ts=${Date.now()}`,
        `https://studia.latrompetasonara.com/version.json?ts=${Date.now()}`
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            return response.json();
          }
        } catch {
          // Try next URL
        }
      }
      return null;
    },
    staleTime: 60 * 1000, // 1 minuto
    retry: false,
  });

  // Query para versión actual (Supabase - para changelog)
  const {
    data: currentVersion,
    isLoading: isLoadingCurrent,
    refetch: refreshCurrent,
  } = useQuery({
    queryKey: ['appVersion', 'current'],
    queryFn: () => versionClient.getCurrentVersion(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Query para historial completo
  const {
    data: history = [],
    isLoading: isLoadingHistory,
    refetch: refreshHistory,
  } = useQuery({
    queryKey: ['appVersion', 'history'],
    queryFn: () => versionClient.listHistory(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: fetchHistory,
  });

  // Mutación para crear versión (y activarla automáticamente)
  const createVersionMutation = useMutation({
    mutationFn: async ({ version, codename, notes }: { version: string; codename?: string; notes?: string }) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Crear versión
      const newVersion = await versionClient.createVersion({
        version,
        codename,
        notes,
        authorId: user.id,
      });

      // Activar automáticamente
      await versionClient.activateVersion(newVersion.id);

      return newVersion;
    },
    onSuccess: (newVersion) => {
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['appVersion'] });
      toast.success(`✅ Versión ${newVersion.version} creada y activada`);
    },
    onError: (error) => {
      toast.error(`❌ Error al crear versión: ${error.message || 'Error desconocido'}`);
    },
  });

  // Mutación para activar versión existente
  const activateVersionMutation = useMutation({
    mutationFn: (versionId: string) => versionClient.activateVersion(versionId),
    onSuccess: () => {
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['appVersion'] });
      toast.success('✅ Versión activada correctamente');
    },
    onError: (error) => {
      toast.error(`❌ Error al activar versión: ${error.message || 'Error desconocido'}`);
    },
  });

  // Mutación para sincronizar datos de producción (version.json + release-notes.json) a Supabase
  const syncMutation = useMutation({
    mutationFn: async () => {
      console.info("[Version] Refresh clicked");
      if (!user?.id) throw new Error('Usuario no autenticado');

      const PRODUCTION_BASE = 'https://studia.latrompetasonara.com';
      const ts = Date.now();

      // 1. Fetch version.json from production (REQUIRED)
      const versionUrl = `${PRODUCTION_BASE}/version.json?ts=${ts}`;

      const vRes = await fetch(versionUrl, { cache: 'no-store' });

      if (!vRes.ok) {
        const errorMsg = `No se pudo cargar version.json (${vRes.status}: ${vRes.statusText})`;
        console.error('[Version] Sync failed', errorMsg);
        throw new Error(errorMsg);
      }

      const vData = await vRes.json();
      console.info("[Version] version.json", vData);

      // Validate required fields
      if (!vData.versionName || !vData.commit) {
        throw new Error('version.json inválido: faltan campos requeridos');
      }

      // UPDATE LOCAL CACHE IMMEDIATELY
      // This ensures UI shows new version even if Supabase sync fails
      queryClient.setQueryData(['appVersion', 'production'], (old: any) => ({
        ...old,
        ...vData
      }));

      // 2. Fetch release-notes.json from production (OPTIONAL)
      let rData = null;
      const releaseNotesUrl = `${PRODUCTION_BASE}/release-notes.json?ts=${ts}`;

      try {
        const rRes = await fetch(releaseNotesUrl, { cache: 'no-store' });
        if (rRes.ok) {
          rData = await rRes.json();
        }
      } catch (releaseNotesError) {
        console.warn('[Version] Could not fetch release-notes.json', releaseNotesError);
      }

      // 3. Upsert to Supabase (Graceful failure)
      try {
        console.log('[syncToSupabase] Upserting to Supabase version_history...');
        const result = await versionClient.upsertVersion({
          version: vData.versionName,
          commit_hash: vData.commit,
          git_author: vData.author,
          build_date: vData.buildDate,
          release_notes: rData,
          author_id: user.id
        });

        // 4. Activate this version in app_meta
        await versionClient.activateVersion(result.id);

        return { success: true, version: vData.versionName, hasReleaseNotes: rData !== null };
      } catch (dbError: any) {
        console.error("[Version] Sync failed (Supabase)", dbError);
        // Return success=false but don't throw, so we keep the UI clean
        return { success: false, error: dbError, version: vData.versionName };
      }
    },
    onSuccess: (data) => {
      // Refresh all lists
      queryClient.invalidateQueries({ queryKey: ['appVersion'] });

      if (data.success) {
        toast.success(`✅ Actualizado y sincronizado: ${data.version}`);
      } else {
        // UI updated via cache, but DB sync failed
        toast.warning(`⚠️ Datos actualizados en UI, pero falló la sincronización con base de datos: ${data.error?.message || 'Error permisos/red'}`);
      }
    },
    onError: (error) => {
      console.error("[Version] Sync failed", error);
      toast.error(`❌ Error al conectar: ${error.message || 'Error desconocido'}`);
    }
  });

  /**
   * Refresca todos los datos de versión
   */
  const refresh = () => {
    refreshProduction();
    refreshCurrent();
    refreshHistory();
  };

  /**
   * Crea una nueva versión y la activa
   */
  const createVersion = ({ version, codename, notes }: { version: string; codename?: string; notes?: string }) => {
    createVersionMutation.mutate({ version, codename, notes });
  };

  /**
   * Activa una versión existente
   */
  const activateVersion = (versionId: string) => {
    activateVersionMutation.mutate(versionId);
  };

  return {
    productionVersion,
    currentVersion,
    history,
    isLoading: isLoadingCurrent || isLoadingHistory || isLoadingProduction,
    refresh,
    createVersion,
    activateVersion,
    syncToSupabase: syncMutation.mutate,
    isCreating: createVersionMutation.isPending,
    isActivating: activateVersionMutation.isPending,
    isSyncing: syncMutation.isPending,
  };
}


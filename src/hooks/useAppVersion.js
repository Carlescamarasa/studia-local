import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versionClient } from '@/lib/versionClient';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from 'sonner';

/**
 * Hook para gestionar versiones de la aplicación
 * @returns {Object} { currentVersion, history, refresh, createVersion, activateVersion }
 */
export function useAppVersion(options = {}) {
  const { fetchHistory = false } = options;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query para versión actual
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
    mutationFn: async ({ version, codename, notes }) => {
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
    mutationFn: (versionId) => versionClient.activateVersion(versionId),
    onSuccess: () => {
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['appVersion'] });
      toast.success('✅ Versión activada correctamente');
    },
    onError: (error) => {
      toast.error(`❌ Error al activar versión: ${error.message || 'Error desconocido'}`);
    },
  });

  /**
   * Refresca todos los datos de versión
   */
  const refresh = () => {
    refreshCurrent();
    refreshHistory();
  };

  /**
   * Crea una nueva versión y la activa
   * @param {Object} params
   * @param {string} params.version
   * @param {string} [params.codename]
   * @param {string} [params.notes]
   */
  const createVersion = ({ version, codename, notes }) => {
    createVersionMutation.mutate({ version, codename, notes });
  };

  /**
   * Activa una versión existente
   * @param {string} versionId
   */
  const activateVersion = (versionId) => {
    activateVersionMutation.mutate(versionId);
  };

  return {
    currentVersion,
    history,
    isLoading: isLoadingCurrent || isLoadingHistory,
    refresh,
    createVersion,
    activateVersion,
    isCreating: createVersionMutation.isPending,
    isActivating: activateVersionMutation.isPending,
  };
}


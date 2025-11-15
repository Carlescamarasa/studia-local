// Proxy del cliente local - re-exporta localDataClient como base44
import { localDataClient, getCurrentUser } from './localDataClient';

// Crear objeto base44 que replica la estructura de base44 SDK
export const base44 = {
  auth: {
    me: async () => {
      return getCurrentUser();
    },
    getCurrentUser: () => {
      return getCurrentUser();
    },
    login: async (credentials) => {
      // En modo local, simplemente establecer el usuario si existe
      const { localDataClient } = await import('./localDataClient');
      const { localUsers } = await import('@/local-data/localUsers');
      const user = localUsers.find(u => 
        u.email === credentials?.email || 
        u.id === credentials?.userId
      );
      if (user) {
        const { setCurrentUser } = await import('./localDataClient');
        setCurrentUser(user.id);
        return { user, success: true };
      }
      throw new Error('Usuario no encontrado');
    },
    logout: async () => {
      return localDataClient.auth.logout();
    },
    updateMe: async (data) => {
      return localDataClient.auth.updateMe(data);
    },
  },
  entities: localDataClient.entities,
  integrations: {
    Core: {
      // Stubs para integraciones - no hacen nada en modo local
      InvokeLLM: async () => {
        throw new Error('InvokeLLM no disponible en modo local');
      },
      SendEmail: async () => {
        throw new Error('SendEmail no disponible en modo local');
      },
      UploadFile: async () => {
        throw new Error('UploadFile no disponible en modo local');
      },
      GenerateImage: async () => {
        throw new Error('GenerateImage no disponible en modo local');
      },
      ExtractDataFromUploadedFile: async () => {
        throw new Error('ExtractDataFromUploadedFile no disponible en modo local');
      },
      CreateFileSignedUrl: async () => {
        throw new Error('CreateFileSignedUrl no disponible en modo local');
      },
      UploadPrivateFile: async () => {
        throw new Error('UploadPrivateFile no disponible en modo local');
      },
    },
  },
};

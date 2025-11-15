import React, { useEffect, useState } from "react";
import { getCurrentUser } from "@/api/localDataClient";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Shield } from "lucide-react";

export default function RoleBootstrap({ children }) {
  const queryClient = useQueryClient();
  const [bootstrapMessage, setBootstrapMessage] = useState(null);

  // Usar getCurrentUser() local
  const currentUser = getCurrentUser();

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => localDataClient.entities.User.list(),
    enabled: !!currentUser,
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => localDataClient.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  useEffect(() => {
    const checkAndBootstrap = async () => {
      if (!currentUser || !allUsers) return;

      const hasAdmin = allUsers.some(user => user.rolPersonalizado === 'ADMIN');

      if (!hasAdmin && !currentUser.rolPersonalizado) {
        try {
          await updateUserMutation.mutateAsync({ rolPersonalizado: 'ADMIN' });
          setBootstrapMessage('Se ha establecido tu rol como Administrador para iniciar la configuración.');
          setTimeout(() => setBootstrapMessage(null), 5000);
        } catch (error) {
          console.error('Error al establecer rol de administrador:', error);
        }
      } else if (!hasAdmin && currentUser.rolPersonalizado !== 'ADMIN') {
        try {
          await updateUserMutation.mutateAsync({ rolPersonalizado: 'ADMIN' });
          setBootstrapMessage('Se ha establecido tu rol como Administrador para iniciar la configuración.');
          setTimeout(() => setBootstrapMessage(null), 5000);
        } catch (error) {
          console.error('Error al establecer rol de administrador:', error);
        }
      }
    };

    checkAndBootstrap();
  }, [currentUser, allUsers]);

  return (
    <>
      {bootstrapMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
          <Alert className="border-green-200 bg-green-50 shadow-card rounded-xl">
            <Shield className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 font-medium ml-2">
              {bootstrapMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}
      {children}
    </>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ds";
import { Badge } from "@/components/ds";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, ArrowLeft, Mail, Shield, Target, Music,
  Save, Edit, AlertCircle, CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayName } from "../components/utils/helpers";
import { useSearchParams } from "react-router-dom";
import MediaLinksInput from "@/components/common/MediaLinksInput";

export default function PerfilPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId');
  
  const [editedData, setEditedData] = useState(null);
  const [saveResult, setSaveResult] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser,
  });

  const { data: targetUser, isLoading } = useQuery({
    queryKey: ['targetUser', userIdParam],
    queryFn: async () => {
      if (userIdParam && currentUser?.rolPersonalizado === 'ADMIN') {
        const users = await base44.entities.User.list();
        return users.find(u => u.id === userIdParam);
      }
      return currentUser;
    },
    enabled: !!currentUser,
  });

  const getNombreCompleto = (user) => {
    if (!user) return '';
    return displayName(user);
  };

  const profesores = allUsers?.filter(u => u.rolPersonalizado === 'PROF') || [];

  useEffect(() => {
    if (targetUser) {
      setEditedData({
        nombreCompleto: targetUser.nombreCompleto || getNombreCompleto(targetUser),
        email: targetUser.email || '',
        rolPersonalizado: targetUser.rolPersonalizado || 'ESTU',
        profesorAsignadoId: targetUser.profesorAsignadoId || '',
        nivel: targetUser.nivel || '',
        telefono: targetUser.telefono || '',
        mediaLinks: targetUser.mediaLinks || [],
      });
    }
  }, [targetUser]);

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      if (targetUser?.id === currentUser?.id) {
        await base44.auth.updateMe(data);
      } else {
        await base44.entities.User.update(targetUser.id, data);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['targetUser'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      
      setSaveResult({ success: true, message: '✅ Usuario actualizado correctamente.' });
      toast.success('Perfil actualizado correctamente.');

      if (targetUser?.id === currentUser?.id && editedData.rolPersonalizado !== currentUser.rolPersonalizado) {
        setTimeout(() => {
          const mainPages = {
            ADMIN: '/usuarios',
            PROF: '/agenda',
            ESTU: '/hoy'
          };
          navigate(createPageUrl(mainPages[editedData.rolPersonalizado]?.split('/').pop() || 'hoy'));
          window.location.reload();
        }, 1500);
      }
    },
    onError: (error) => {
      setSaveResult({ success: false, message: `❌ Error: ${error.message}` });
      toast.error(`Error al actualizar el perfil: ${error.message}`);
    },
  });

  const handleSave = async () => {
    if (!editedData) return;

    if (!editedData.nombreCompleto?.trim()) {
      setSaveResult({ success: false, message: '❌ El nombre completo es obligatorio' });
      toast.error('El nombre completo es obligatorio');
      return;
    }

    if (editedData.profesorAsignadoId) {
      const profesor = allUsers?.find(u => u.id === editedData.profesorAsignadoId);
      if (!profesor || profesor.rolPersonalizado !== 'PROF') {
        setSaveResult({ success: false, message: '❌ El profesor asignado debe tener rol de Profesor' });
        toast.error('El profesor asignado debe tener rol de Profesor');
        return;
      }
    }

    const isChangingOwnRole = targetUser?.id === currentUser?.id && editedData.rolPersonalizado !== currentUser?.rolPersonalizado;
    
    if (isChangingOwnRole) {
      if (!window.confirm('¿Estás seguro de cambiar tu propio rol? Esto modificará tu acceso y navegación en la aplicación.')) {
        return;
      }
    }

    if (editedData.rolPersonalizado !== targetUser?.rolPersonalizado && targetUser?.rolPersonalizado === 'ADMIN') {
      const adminCount = allUsers?.filter(u => u.rolPersonalizado === 'ADMIN').length || 0;
      if (adminCount <= 1) {
        setSaveResult({ 
          success: false, 
          message: '❌ No puedes eliminar el último Administrador. Debe existir al menos un Administrador en el sistema.' 
        });
        toast.error('No puedes eliminar el último Administrador. Debe existir al menos un Administrador en el sistema.');
        return;
      }
    }

    const dataToSave = {
      nombreCompleto: editedData.nombreCompleto,
      rolPersonalizado: editedData.rolPersonalizado,
      profesorAsignadoId: editedData.profesorAsignadoId || null,
      nivel: editedData.nivel || null,
      telefono: editedData.telefono || null,
      mediaLinks: editedData.mediaLinks || [],
    };

    updateUserMutation.mutate(dataToSave);
  };

  const roleLabels = {
    ADMIN: 'Administrador',
    PROF: 'Profesor',
    ESTU: 'Estudiante',
  };

  const isEditingOwnProfile = targetUser?.id === currentUser?.id;
  const canEditRole = currentUser?.rolPersonalizado === 'ADMIN';
  const canEditProfesor = (currentUser?.rolPersonalizado === 'ADMIN' || currentUser?.rolPersonalizado === 'PROF') 
                          && targetUser?.rolPersonalizado === 'ESTU';
  const isEstudiante = targetUser?.rolPersonalizado === 'ESTU';
  const isProfesor = targetUser?.rolPersonalizado === 'PROF';

  if (isLoading || !editedData) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="icon-tile">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-title">
              {isEditingOwnProfile ? 'Mi Perfil' : `Perfil de ${getNombreCompleto(targetUser)}`}
            </h1>
            <p className="text-subtitle">
              {isEditingOwnProfile ? 'Edita tu información personal' : 'Edita la información del usuario'}
            </p>
          </div>
        </div>
      </div>

      {saveResult && (
        <Alert className={`mb-6 app-panel ${saveResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <AlertDescription className={saveResult.success ? 'text-green-800' : 'text-red-800'}>
            {saveResult.success ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
            {saveResult.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="app-card">
        <CardContent className="pt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nombreCompleto">Nombre Completo *</Label>
              <Input
                id="nombreCompleto"
                value={editedData.nombreCompleto}
                onChange={(e) => setEditedData({ ...editedData, nombreCompleto: e.target.value })}
                placeholder="Nombre y apellidos"
                className="app-panel focus-brand"
              />
              <p className="text-xs text-muted">Este es el nombre visible en toda la aplicación</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editedData.email}
                disabled
                className="bg-muted cursor-not-allowed app-panel"
              />
              <p className="text-xs text-muted">El email no se puede modificar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol en el Sistema</Label>
              {canEditRole ? (
                <div className="space-y-2">
                  <Select
                    value={editedData.rolPersonalizado}
                    onValueChange={(value) => setEditedData({ ...editedData, rolPersonalizado: value })}
                  >
                    <SelectTrigger id="role" className="app-panel focus-brand">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-600" />
                          Administrador
                        </div>
                      </SelectItem>
                      <SelectItem value="PROF">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          Profesor
                        </div>
                      </SelectItem>
                      <SelectItem value="ESTU">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-green-600" />
                          Estudiante
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {editedData.rolPersonalizado === 'ADMIN' && targetUser?.rolPersonalizado === 'ADMIN' && (
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Verifica que no sea el último administrador antes de cambiar
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="role"
                    value={roleLabels[editedData.rolPersonalizado]}
                    disabled
                    className="bg-muted cursor-not-allowed app-panel"
                  />
                  <p className="text-xs text-muted mt-1">Solo administradores pueden cambiar roles</p>
                </div>
              )}
            </div>

            {isEstudiante && (
              <div className="space-y-2">
                <Label htmlFor="profesorAsignado">Profesor Asignado</Label>
                {canEditProfesor ? (
                  <Select
                    value={editedData.profesorAsignadoId}
                    onValueChange={(value) => setEditedData({ ...editedData, profesorAsignadoId: value })}
                  >
                    <SelectTrigger id="profesorAsignado" className="app-panel focus-brand">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Sin asignar</SelectItem>
                      {profesores.map(prof => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {getNombreCompleto(prof)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="profesorAsignado"
                    value={editedData.profesorAsignadoId ? getNombreCompleto(allUsers?.find(u => u.id === editedData.profesorAsignadoId)) : 'Sin asignar'}
                    disabled
                    className="bg-muted cursor-not-allowed app-panel"
                  />
                )}
                <p className="text-xs text-muted">
                  {canEditProfesor ? 'Asigna un profesor a este estudiante' : 'Solo administradores y profesores pueden editar'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={editedData.telefono}
                onChange={(e) => setEditedData({ ...editedData, telefono: e.target.value })}
                placeholder="Ej: +34 600 000 000"
                className="app-panel focus-brand"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nivel">Nivel Técnico</Label>
              <Select
                value={editedData.nivel}
                onValueChange={(value) => setEditedData({ ...editedData, nivel: value })}
              >
                <SelectTrigger id="nivel" className="app-panel focus-brand">
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin especificar</SelectItem>
                  <SelectItem value="principiante">Principiante</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzado">Avanzado</SelectItem>
                  <SelectItem value="profesional">Profesional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isProfesor && (
            <div className="pt-6 border-t border-ui">
              <MediaLinksInput
                value={editedData.mediaLinks}
                onChange={(links) => setEditedData({ ...editedData, mediaLinks: links })}
              />
              <p className="text-xs text-muted mt-2">
                Enlaces multimedia personales (videos demostrativos, recursos, etc.)
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-ui">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted">
                <p>ID de usuario: <span className="font-mono">{targetUser?.id}</span></p>
                <p>Registrado: {targetUser?.created_date ? new Date(targetUser.created_date).toLocaleDateString('es-ES') : '-'}</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={updateUserMutation.isPending}
                className="btn-primary h-10 rounded-xl shadow-sm focus-brand"
              >
                {updateUserMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {canEditRole && isEditingOwnProfile && (
        <Alert className="mt-6 app-panel border-brand-200 bg-brand-50">
          <AlertCircle className="h-4 w-4 text-brand-600" />
          <AlertDescription className="text-brand-800">
            <strong>Advertencia:</strong> Si cambias tu propio rol, tu acceso y navegación en la aplicación se actualizarán automáticamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
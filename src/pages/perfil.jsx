import React, { useState, useEffect } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
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
  Save, Edit, AlertCircle, CheckCircle, Sun, Moon, Monitor
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayName } from "../components/utils/helpers";
import { useSearchParams } from "react-router-dom";
import MediaLinksInput from "@/components/common/MediaLinksInput";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import { useDesign } from "@/components/design/DesignProvider";

export default function PerfilPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId');
  const { design, setDesignPartial } = useDesign();
  
  const [editedData, setEditedData] = useState(null);
  const [saveResult, setSaveResult] = useState(null);

  const currentUser = getCurrentUser();

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => localDataClient.entities.User.list(),
    enabled: true,
  });

  const { data: targetUser, isLoading } = useQuery({
    queryKey: ['targetUser', userIdParam],
    queryFn: async () => {
      if (userIdParam && currentUser?.rolPersonalizado === 'ADMIN') {
        const users = await localDataClient.entities.User.list();
        return users.find(u => u.id === userIdParam);
      }
      return currentUser;
    },
    enabled: true,
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
        await localDataClient.auth.updateMe(data);
      } else {
        await localDataClient.entities.User.update(targetUser.id, data);
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
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)]">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title={isEditingOwnProfile ? 'Mi Perfil' : `Perfil de ${getNombreCompleto(targetUser)}`}
        subtitle={isEditingOwnProfile ? 'Edita tu información personal' : 'Edita la información del usuario'}
      />

      {saveResult && (
        <Alert className={`mb-6 ${componentStyles.containers.panelBase} ${saveResult.success ? 'border-[var(--color-success)] bg-[var(--color-success)]/10' : 'border-[var(--color-danger)] bg-[var(--color-danger)]/10'}`}>
          <AlertDescription className={saveResult.success ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
            {saveResult.success ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
            {saveResult.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className={componentStyles.containers.cardBase}>
        <CardContent className="pt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="nombreCompleto" className="text-[var(--color-text-primary)]">Nombre Completo *</Label>
              <Input
                id="nombreCompleto"
                value={editedData.nombreCompleto}
                onChange={(e) => setEditedData({ ...editedData, nombreCompleto: e.target.value })}
                placeholder="Nombre y apellidos"
                className={componentStyles.controls.inputDefault}
              />
              <p className="text-xs text-[var(--color-text-primary)]">Este es el nombre visible en toda la aplicación</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--color-text-primary)]">Email</Label>
              <Input
                id="email"
                type="email"
                value={editedData.email}
                disabled
                className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
              />
              <p className="text-xs text-[var(--color-text-primary)]">El email no se puede modificar</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-[var(--color-text-primary)]">Rol en el Sistema</Label>
              {canEditRole ? (
                <div className="space-y-2">
                  <Select
                    value={editedData.rolPersonalizado}
                    onValueChange={(value) => setEditedData({ ...editedData, rolPersonalizado: value })}
                  >
                    <SelectTrigger id="role" className={componentStyles.controls.selectDefault}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[var(--color-accent)]" />
                          Administrador
                        </div>
                      </SelectItem>
                      <SelectItem value="PROF">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[var(--color-info)]" />
                          Profesor
                        </div>
                      </SelectItem>
                      <SelectItem value="ESTU">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[var(--color-success)]" />
                          Estudiante
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {editedData.rolPersonalizado === 'ADMIN' && targetUser?.rolPersonalizado === 'ADMIN' && (
                    <p className={`${componentStyles.typography.smallMetaText} text-[var(--color-text-secondary)] flex items-center gap-1`}>
                      <AlertCircle className="w-3 h-3 text-[var(--color-warning)]" />
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
                    className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                  />
                  <p className="text-xs mt-1 text-[var(--color-text-primary)]">Solo administradores pueden cambiar roles</p>
                </div>
              )}
            </div>

            {isEstudiante && (
              <div className="space-y-2">
                <Label htmlFor="profesorAsignado" className="text-[var(--color-text-primary)]">Profesor Asignado</Label>
                {canEditProfesor ? (
                  <Select
                    value={editedData.profesorAsignadoId}
                    onValueChange={(value) => setEditedData({ ...editedData, profesorAsignadoId: value })}
                  >
                    <SelectTrigger id="profesorAsignado" className={componentStyles.controls.selectDefault}>
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
                    className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                  />
                )}
                <p className="text-xs text-[var(--color-text-primary)]">
                  {canEditProfesor ? 'Asigna un profesor a este estudiante' : 'Solo administradores y profesores pueden editar'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-[var(--color-text-primary)]">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={editedData.telefono}
                onChange={(e) => setEditedData({ ...editedData, telefono: e.target.value })}
                placeholder="Ej: +34 600 000 000"
                className={componentStyles.controls.inputDefault}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nivel" className="text-[var(--color-text-primary)]">Nivel Técnico</Label>
              <Select
                value={editedData.nivel}
                onValueChange={(value) => setEditedData({ ...editedData, nivel: value })}
              >
                <SelectTrigger id="nivel" className={componentStyles.controls.selectDefault}>
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

            {isEditingOwnProfile && (
              <div className="space-y-2">
                <Label htmlFor="theme" className="text-[var(--color-text-primary)]">Tema de la Aplicación</Label>
                <Select
                  value={design?.theme || 'system'}
                  onValueChange={(value) => {
                    setDesignPartial('theme', value);
                    toast.success(`Tema cambiado a ${value === 'system' ? 'Predeterminado' : value === 'dark' ? 'Oscuro' : 'Claro'}`);
                  }}
                >
                  <SelectTrigger id="theme" className={componentStyles.controls.selectDefault}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Claro
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Oscuro
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Predeterminado (Sistema)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {design?.theme === 'system' 
                    ? 'Sigue la preferencia de tu sistema operativo'
                    : design?.theme === 'dark'
                    ? 'Tema oscuro activado'
                    : 'Tema claro activado'}
                </p>
              </div>
            )}
          </div>

          {isProfesor && (
            <div className="pt-6 border-t border-[var(--color-border-default)]">
              <MediaLinksInput
                value={editedData.mediaLinks}
                onChange={(links) => setEditedData({ ...editedData, mediaLinks: links })}
              />
              <p className="text-xs mt-2 text-[var(--color-text-primary)]">
                Enlaces multimedia personales (videos demostrativos, recursos, etc.)
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--color-border-default)]">
            <div className="flex items-center justify-between">
              <div className={`text-sm ${componentStyles.typography.smallMetaText}`}>
                <p className="text-[var(--color-text-primary)]">ID de usuario: <span className="font-mono text-[var(--color-text-secondary)]">{targetUser?.id}</span></p>
                <p className="text-[var(--color-text-primary)]">Registrado: <span className="text-[var(--color-text-secondary)]">{targetUser?.created_date ? new Date(targetUser.created_date).toLocaleDateString('es-ES') : '-'}</span></p>
              </div>
              <Button
                onClick={handleSave}
                disabled={updateUserMutation.isPending}
                className={componentStyles.buttons.primary}
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
        <Alert className={`mt-6 ${componentStyles.containers.panelBase} border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10`}>
          <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
          <AlertDescription className="text-[var(--color-warning)]">
            <strong>Advertencia:</strong> Si cambias tu propio rol, tu acceso y navegación en la aplicación se actualizarán automáticamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { localDataClient } from "@/api/localDataClient";
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
  Save, Edit, AlertCircle, CheckCircle, Sun, Moon, Monitor, KeyRound, Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { displayName, useEffectiveUser } from "../components/utils/helpers";
import { useSearchParams } from "react-router-dom";
import MediaLinksInput from "@/components/common/MediaLinksInput";
import PageHeader from "@/components/ds/PageHeader";
import { LoadingSpinner } from "@/components/ds";
import { componentStyles } from "@/design/componentStyles";
import { useDesign } from "@/components/design/DesignProvider";
import { sendPasswordResetAdmin } from "@/api/userAdmin";
import { supabase } from "@/lib/supabaseClient";

export default function PerfilPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId');
  const { design, setDesignPartial } = useDesign();
  
  const [editedData, setEditedData] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordResult, setPasswordResult] = useState(null);

  const effectiveUser = useEffectiveUser();

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => localDataClient.entities.User.list(),
    enabled: true,
  });

  const { data: targetUser, isLoading } = useQuery({
    queryKey: ['targetUser', userIdParam],
    queryFn: async () => {
      if (userIdParam && effectiveUser?.rolPersonalizado === 'ADMIN') {
        const users = await localDataClient.entities.User.list();
        return users.find(u => u.id === userIdParam);
      }
      return effectiveUser;
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
      if (!targetUser || !targetUser.id) {
        throw new Error('No se puede actualizar: usuario no encontrado');
      }
      
      if (targetUser.id === effectiveUser?.id) {
        // Actualizar perfil propio
        return await localDataClient.auth.updateMe(data);
      } else {
        // Actualizar perfil de otro usuario (solo admins)
        return await localDataClient.entities.User.update(targetUser.id, data);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['targetUser'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      
      setSaveResult({ success: true, message: '✅ Usuario actualizado correctamente.' });
      toast.success('Perfil actualizado correctamente.');

      if (targetUser?.id === effectiveUser?.id && editedData.rolPersonalizado !== effectiveUser.rolPersonalizado) {
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

    const isChangingOwnRole = targetUser?.id === effectiveUser?.id && editedData.rolPersonalizado !== effectiveUser?.rolPersonalizado;
    
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

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      // Nota: Supabase permite cambiar la contraseña del usuario autenticado
      // sin verificar la contraseña actual si hay sesión activa.
      // Sin embargo, es mejor práctica verificar primero.
      // Por simplicidad, aquí solo actualizamos la contraseña si hay sesión activa.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión de nuevo.');
      }

      // Actualizar contraseña
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      setPasswordResult({ success: true, message: '✅ Contraseña actualizada correctamente' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Contraseña actualizada correctamente');
    },
    onError: (error) => {
      setPasswordResult({ success: false, message: `❌ Error: ${error.message || 'No se pudo actualizar la contraseña'}` });
      toast.error(`Error al actualizar la contraseña: ${error.message || 'Error desconocido'}`);
    },
  });

  const handleChangePassword = async () => {
    setPasswordResult(null);

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordResult({ success: false, message: '❌ Completa todos los campos' });
      toast.error('Completa todos los campos');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordResult({ success: false, message: '❌ La contraseña debe tener al menos 6 caracteres' });
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordResult({ success: false, message: '❌ Las contraseñas no coinciden' });
      toast.error('Las contraseñas no coinciden');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const roleLabels = {
    ADMIN: 'Administrador',
    PROF: 'Profesor',
    ESTU: 'Estudiante',
  };

  const isEditingOwnProfile = targetUser?.id === effectiveUser?.id;
  const canEditRole = effectiveUser?.rolPersonalizado === 'ADMIN';
  const canEditProfesor = (effectiveUser?.rolPersonalizado === 'ADMIN' || effectiveUser?.rolPersonalizado === 'PROF') 
                          && targetUser?.rolPersonalizado === 'ESTU';
  const isEstudiante = targetUser?.rolPersonalizado === 'ESTU';
  const isProfesor = targetUser?.rolPersonalizado === 'PROF';

  if (isLoading || !editedData) {
    return (
      <LoadingSpinner 
        size="xl" 
        variant="centered" 
        text="Cargando perfil..." 
      />
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title={isEditingOwnProfile ? 'Mi Perfil' : `Perfil de ${getNombreCompleto(targetUser)}`}
        subtitle={isEditingOwnProfile ? 'Edita tu información personal' : 'Edita la información del usuario'}
      />

      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className={componentStyles.buttons.ghost}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atrás
        </Button>
      </div>

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
          <div className={componentStyles.layout.grid2}>
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
                    <p className={`${componentStyles.typography.smallMetaText} flex items-center gap-1`}>
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
              <div className="flex gap-2">
                {isEditingOwnProfile && targetUser?.email && (
                  <Button
                    onClick={async () => {
                      try {
                        await sendPasswordResetAdmin(targetUser.email);
                        toast.success('Te hemos enviado un email para restablecer la contraseña');
                      } catch (error) {
                        toast.error(error.message || 'Error al enviar email de restablecimiento');
                      }
                    }}
                    variant="outline"
                    className={componentStyles.buttons.secondary}
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Restablecer contraseña
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  loading={updateUserMutation.isPending}
                  loadingText="Guardando..."
                  className={componentStyles.buttons.primary}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Seguridad - Cambio de contraseña */}
      {isEditingOwnProfile && (
        <Card className={componentStyles.containers.cardBase + " mt-6"}>
          <CardHeader className="border-b border-[var(--color-border-default)]">
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--color-primary)]" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {passwordResult && (
              <Alert className={`${componentStyles.containers.panelBase} ${passwordResult.success ? 'border-[var(--color-success)] bg-[var(--color-success)]/10' : 'border-[var(--color-danger)] bg-[var(--color-danger)]/10'}`}>
                <AlertDescription className={passwordResult.success ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                  {passwordResult.success ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
                  {passwordResult.message}
                </AlertDescription>
              </Alert>
            )}

            <div className={componentStyles.layout.grid2}>
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-[var(--color-text-primary)]">Contraseña actual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className={componentStyles.controls.inputDefault}
                  disabled={changePasswordMutation.isPending}
                />
                <p className="text-xs text-[var(--color-text-secondary)]">Opcional si hay sesión activa</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[var(--color-text-primary)]">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className={componentStyles.controls.inputDefault}
                  disabled={changePasswordMutation.isPending}
                />
                <p className="text-xs text-[var(--color-text-secondary)]">Mínimo 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[var(--color-text-primary)]">Repetir contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className={componentStyles.controls.inputDefault}
                  disabled={changePasswordMutation.isPending}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleChangePassword}
                loading={changePasswordMutation.isPending}
                loadingText="Actualizando..."
                disabled={!passwordData.newPassword || !passwordData.confirmPassword}
                className={componentStyles.buttons.primary}
              >
                <Lock className="w-4 h-4 mr-2" />
                Actualizar contraseña
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordResult(null);
                }}
                disabled={changePasswordMutation.isPending}
                className={componentStyles.buttons.outline}
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
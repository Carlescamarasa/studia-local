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
  User, Mail, Shield, Target, Music,
  Save, AlertCircle, CheckCircle, Sun, Moon, Monitor, X
} from "lucide-react";
import { toast } from "sonner";
import { displayName, useEffectiveUser } from "../utils/helpers";
import MediaLinksInput from "./MediaLinksInput";
import { LoadingSpinner } from "@/components/ds";
import { componentStyles } from "@/design/componentStyles";
import { useDesign } from "@/components/design/DesignProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function PerfilModal({ 
  open, 
  onOpenChange,
  userId = null 
}) {
  const queryClient = useQueryClient();
  const { design, setDesignPartial } = useDesign();
  
  const [editedData, setEditedData] = useState(null);
  const [saveResult, setSaveResult] = useState(null);

  const effectiveUser = useEffectiveUser();

  const { data: allUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => localDataClient.entities.User.list(),
    enabled: open,
  });

  const { data: targetUser, isLoading } = useQuery({
    queryKey: ['targetUser', userId],
    queryFn: async () => {
      if (userId && effectiveUser?.rolPersonalizado === 'ADMIN') {
        const users = await localDataClient.entities.User.list();
        return users.find(u => u.id === userId);
      }
      return effectiveUser;
    },
    enabled: open,
  });

  const getNombreCompleto = (user) => {
    if (!user) return '';
    return displayName(user);
  };

  const profesores = allUsers?.filter(u => u.rolPersonalizado === 'PROF') || [];

  useEffect(() => {
    if (targetUser && open) {
      setEditedData({
        nombreCompleto: targetUser.nombreCompleto || getNombreCompleto(targetUser),
        email: targetUser.email || '',
        rolPersonalizado: targetUser.rolPersonalizado || 'ESTU',
        profesorAsignadoId: targetUser.profesorAsignadoId || '',
        nivel: targetUser.nivel || '',
        telefono: targetUser.telefono || '',
        mediaLinks: targetUser.mediaLinks || [],
      });
      setSaveResult(null);
    }
  }, [targetUser, open]);

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      if (targetUser?.id === effectiveUser?.id) {
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

      if (targetUser?.id === effectiveUser?.id && editedData.rolPersonalizado !== effectiveUser.rolPersonalizado) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Cerrar modal después de guardar exitosamente
        setTimeout(() => {
          onOpenChange(false);
        }, 1000);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        {isLoading || !editedData ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Cargando perfil..." />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-[var(--color-primary)]" />
                {isEditingOwnProfile ? 'Mi Perfil' : `Perfil de ${getNombreCompleto(targetUser)}`}
              </DialogTitle>
              <DialogDescription>
                {isEditingOwnProfile ? 'Edita tu información personal' : 'Edita la información del usuario'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {saveResult && (
                <Alert className={`${componentStyles.containers.panelBase} ${saveResult.success ? 'border-[var(--color-success)] bg-[var(--color-success)]/10' : 'border-[var(--color-danger)] bg-[var(--color-danger)]/10'}`}>
                  <AlertDescription className={saveResult.success ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                    {saveResult.success ? <CheckCircle className="w-4 h-4 inline mr-2" /> : <AlertCircle className="w-4 h-4 inline mr-2" />}
                    {saveResult.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className={componentStyles.layout.grid2}>
                  <div className="space-y-1.5">
                    <Label htmlFor="nombreCompleto" className="text-sm text-[var(--color-text-primary)]">Nombre Completo *</Label>
                    <Input
                      id="nombreCompleto"
                      value={editedData.nombreCompleto}
                      onChange={(e) => setEditedData({ ...editedData, nombreCompleto: e.target.value })}
                      placeholder="Nombre y apellidos"
                      className={componentStyles.controls.inputDefault}
                    />
                    <p className="text-xs text-[var(--color-text-secondary)]">Este es el nombre visible en toda la aplicación</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm text-[var(--color-text-primary)]">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedData.email}
                      disabled
                      className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                    />
                    <p className="text-xs text-[var(--color-text-secondary)]">El email no se puede modificar</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-sm text-[var(--color-text-primary)]">Rol en el Sistema</Label>
                    {canEditRole ? (
                      <div className="space-y-1.5">
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
                        <p className="text-xs mt-1 text-[var(--color-text-secondary)]">Solo administradores pueden cambiar roles</p>
                      </div>
                    )}
                  </div>

                  {isEstudiante && (
                    <div className="space-y-1.5">
                      <Label htmlFor="profesorAsignado" className="text-sm text-[var(--color-text-primary)]">Profesor Asignado</Label>
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
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {canEditProfesor ? 'Asigna un profesor a este estudiante' : 'Solo administradores y profesores pueden editar'}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="telefono" className="text-sm text-[var(--color-text-primary)]">Teléfono</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={editedData.telefono}
                      onChange={(e) => setEditedData({ ...editedData, telefono: e.target.value })}
                      placeholder="Ej: +34 600 000 000"
                      className={componentStyles.controls.inputDefault}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nivel" className="text-sm text-[var(--color-text-primary)]">Nivel Técnico</Label>
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
                    <div className="space-y-1.5">
                      <Label className="text-sm text-[var(--color-text-primary)]">Tema</Label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setDesignPartial('theme', 'light');
                            toast.success('Tema claro activado');
                          }}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            design?.theme === 'light'
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                              : 'border-[var(--color-border-default)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]'
                          }`}
                          aria-label="Tema claro"
                        >
                          <Sun className="w-4 h-4" />
                          <span className="text-sm">Claro</span>
                        </button>
                        <button
                          onClick={() => {
                            setDesignPartial('theme', 'dark');
                            toast.success('Tema oscuro activado');
                          }}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            design?.theme === 'dark'
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                              : 'border-[var(--color-border-default)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]'
                          }`}
                          aria-label="Tema oscuro"
                        >
                          <Moon className="w-4 h-4" />
                          <span className="text-sm">Oscuro</span>
                        </button>
                        <button
                          onClick={() => {
                            setDesignPartial('theme', 'system');
                            toast.success('Tema del sistema activado');
                          }}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                            (design?.theme === 'system' || !design?.theme)
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                              : 'border-[var(--color-border-default)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]'
                          }`}
                          aria-label="Tema del sistema"
                        >
                          <Monitor className="w-4 h-4" />
                          <span className="text-sm">Sistema</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isProfesor && (
                  <div className="pt-4 border-t border-[var(--color-border-default)]">
                    <MediaLinksInput
                      value={editedData.mediaLinks}
                      onChange={(links) => setEditedData({ ...editedData, mediaLinks: links })}
                    />
                    <p className="text-xs mt-2 text-[var(--color-text-secondary)]">
                      Enlaces multimedia personales (videos demostrativos, recursos, etc.)
                    </p>
                  </div>
                )}

                {canEditRole && isEditingOwnProfile && (
                  <Alert className={`${componentStyles.containers.panelBase} border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10`}>
                    <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
                    <AlertDescription className="text-[var(--color-warning)] text-sm">
                      <strong>Advertencia:</strong> Si cambias tu propio rol, tu acceso y navegación en la aplicación se actualizarán automáticamente.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-4 border-t border-[var(--color-border-default)] flex items-center justify-between gap-4">
                  <div className={`text-xs ${componentStyles.typography.smallMetaText} flex-shrink-0`}>
                    <p className="text-[var(--color-text-primary)]">ID: <span className="font-mono text-[var(--color-text-secondary)]">{targetUser?.id?.slice(0, 8)}...</span></p>
                    <p className="text-[var(--color-text-primary)]">Registrado: <span className="text-[var(--color-text-secondary)]">{targetUser?.created_date ? new Date(targetUser.created_date).toLocaleDateString('es-ES') : '-'}</span></p>
                  </div>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


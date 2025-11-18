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
  Save, AlertCircle, CheckCircle, Sun, Moon, Monitor, X, MessageCircle, Search
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
  const [phoneCountryCode, setPhoneCountryCode] = useState('+34'); // Default: España
  const [phoneSearch, setPhoneSearch] = useState(''); // Para búsqueda/filtrado de teléfono
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Detectar modo oscuro inicial desde la clase del documento
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  });

  // Lista de prefijos de país comunes con longitud estándar de número y formato de placeholder
  const countryCodes = [
    { code: '+34', country: '🇪🇸 España', digits: 9, placeholder: '600 000 000' },
    { code: '+1', country: '🇺🇸 USA/Canadá', digits: 10, placeholder: '(555) 123-4567' },
    { code: '+52', country: '🇲🇽 México', digits: 10, placeholder: '55 1234 5678' },
    { code: '+54', country: '🇦🇷 Argentina', digits: 10, placeholder: '11 1234-5678' },
    { code: '+57', country: '🇨🇴 Colombia', digits: 10, placeholder: '300 123 4567' },
    { code: '+51', country: '🇵🇪 Perú', digits: 9, placeholder: '987 654 321' },
    { code: '+56', country: '🇨🇱 Chile', digits: 9, placeholder: '9 1234 5678' },
    { code: '+591', country: '🇧🇴 Bolivia', digits: 8, placeholder: '7123 4567' },
    { code: '+593', country: '🇪🇨 Ecuador', digits: 9, placeholder: '098 765 432' },
    { code: '+595', country: '🇵🇾 Paraguay', digits: 9, placeholder: '981 123 456' },
    { code: '+598', country: '🇺🇾 Uruguay', digits: 8, placeholder: '99 123 456' },
    { code: '+58', country: '🇻🇪 Venezuela', digits: 10, placeholder: '412 123 4567' },
    { code: '+55', country: '🇧🇷 Brasil', digits: 11, placeholder: '(11) 91234-5678' },
    { code: '+33', country: '🇫🇷 Francia', digits: 9, placeholder: '6 12 34 56 78' },
    { code: '+39', country: '🇮🇹 Italia', digits: 10, placeholder: '333 123 4567' },
    { code: '+49', country: '🇩🇪 Alemania', digits: 11, placeholder: '0171 1234567' },
    { code: '+44', country: '🇬🇧 Reino Unido', digits: 10, placeholder: '7700 123456' },
    { code: '+351', country: '🇵🇹 Portugal', digits: 9, placeholder: '912 345 678' },
  ];
  
  // Obtener placeholder según el país seleccionado
  const getPhonePlaceholder = (countryCode) => {
    const country = countryCodes.find(cc => cc.code === countryCode);
    return country?.placeholder || '600 000 000';
  };
  
  // Actualizar isDarkMode cuando cambie el tema o se abra el modal
  useEffect(() => {
    const checkDarkMode = () => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDarkMode(dark);
    };
    
    // Verificar inmediatamente
    checkDarkMode();
    
    // Observar cambios en la clase del documento
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, [design?.theme, open]);

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

  // Filtrar usuarios con rol PROF o ADMIN para el selector de profesores
  const profesores = React.useMemo(() => {
    if (!allUsers || !Array.isArray(allUsers)) return [];
    return allUsers.filter(u => u.rolPersonalizado === 'PROF' || u.rolPersonalizado === 'ADMIN');
  }, [allUsers]);

  // Extraer código de país del teléfono si existe
  const extractCountryCodeFromPhone = (phone) => {
    if (!phone) return '+34';
    
    // Buscar si el teléfono empieza con un código de país conocido
    const matched = countryCodes.find(cc => phone.startsWith(cc.code));
    if (matched) {
      return matched.code;
    }
    
    // Si empieza con +, intentar extraer el código
    if (phone.startsWith('+')) {
      // Buscar el código más largo que coincida
      for (const cc of countryCodes.sort((a, b) => b.code.length - a.code.length)) {
        if (phone.startsWith(cc.code)) {
          return cc.code;
        }
      }
    }
    
    return '+34'; // Default
  };

  // Filtrar y normalizar entrada de teléfono (solo permitir números, espacios, guiones)
  const filterPhoneInput = (value) => {
    // Permitir solo números, espacios, guiones, paréntesis y puntos
    return value.replace(/[^\d\s\-\(\)\.]/g, '');
  };

  // Normalizar número de teléfono (eliminar espacios, guiones, paréntesis, etc.)
  const normalizePhoneNumber = (phone, countryCode) => {
    if (!phone) return '';
    
    // Eliminar código de país si está presente
    let cleaned = phone;
    if (phone.startsWith(countryCode)) {
      cleaned = phone.substring(countryCode.length);
    } else if (phone.startsWith('+')) {
      // Eliminar cualquier código de país que empiece con +
      for (const cc of countryCodes.sort((a, b) => b.code.length - a.code.length)) {
        if (phone.startsWith(cc.code)) {
          cleaned = phone.substring(cc.code.length);
          break;
        }
      }
    }
    
    // Eliminar espacios, guiones, puntos, paréntesis, etc.
    cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');
    
    return cleaned;
  };

  // Obtener longitud de dígitos estándar para un código de país
  const getCountryDigits = (countryCode) => {
    const country = countryCodes.find(cc => cc.code === countryCode);
    return country?.digits || 9; // Default: 9 dígitos (España)
  };

  // Generar link de WhatsApp (solo si el número tiene la longitud correcta)
  const getWhatsAppLink = (phone, countryCode) => {
    if (!phone) return null;
    
    const normalized = normalizePhoneNumber(phone, countryCode);
    if (!normalized) return null;
    
    // Verificar que el número tenga la longitud estándar del país
    const requiredDigits = getCountryDigits(countryCode);
    if (normalized.length !== requiredDigits) return null;
    
    // Combinar código de país + número normalizado
    const fullNumber = countryCode.replace('+', '') + normalized;
    
    return `https://wa.me/${fullNumber}`;
  };

  useEffect(() => {
    if (targetUser && open) {
      const telefono = targetUser.telefono || '';
      const extractedCode = extractCountryCodeFromPhone(telefono);
      const normalizedPhone = extractedCode !== '+34' 
        ? normalizePhoneNumber(telefono, extractedCode)
        : telefono.replace(/^\+34\s*/, ''); // Si ya tiene +34, quitarlo
      
      setPhoneCountryCode(extractedCode);
      
      setEditedData({
        nombreCompleto: targetUser.nombreCompleto || getNombreCompleto(targetUser),
        email: targetUser.email || '',
        rolPersonalizado: targetUser.rolPersonalizado || 'ESTU',
        profesorAsignadoId: targetUser.profesorAsignadoId || null,
        nivel: targetUser.nivel || null,
        telefono: normalizedPhone,
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
      // Verificar que el profesor asignado realmente tenga rol PROF o ADMIN
      const profesor = profesores.find(p => p.id === editedData.profesorAsignadoId);
      if (!profesor) {
        setSaveResult({ success: false, message: '❌ El profesor asignado debe tener rol de Profesor o Administrador' });
        toast.error('El profesor asignado debe tener rol de Profesor o Administrador');
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

    // Normalizar y guardar teléfono con código de país
    let telefonoFinal = null;
    if (editedData.telefono && editedData.telefono.trim()) {
      const normalized = normalizePhoneNumber(editedData.telefono, phoneCountryCode);
      if (normalized) {
        // Guardar con formato: +[código][número normalizado]
        telefonoFinal = `${phoneCountryCode}${normalized}`;
      }
    }

    const dataToSave = {
      nombreCompleto: editedData.nombreCompleto,
      rolPersonalizado: editedData.rolPersonalizado,
      profesorAsignadoId: editedData.profesorAsignadoId || null,
      nivel: editedData.nivel || null,
      telefono: telefonoFinal,
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
  const userRole = effectiveUser?.rolPersonalizado;
  
  // Permisos de edición según rol
  const canEditNombreCompleto = userRole === 'ADMIN' || userRole === 'PROF' || userRole === 'ESTU'; // Todos pueden editar
  const canEditEmail = false; // Nadie puede editar
  const canEditRole = userRole === 'ADMIN'; // Solo ADMIN
  const canEditProfesor = userRole === 'ADMIN'; // Solo ADMIN (antes también PROF)
  const canEditTelefono = userRole === 'ADMIN' || userRole === 'PROF' || userRole === 'ESTU'; // Todos pueden editar
  const canEditNivel = userRole === 'ADMIN' || userRole === 'PROF' || userRole === 'ESTU'; // Todos pueden editar
  
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
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nombreCompleto" className="text-sm text-[var(--color-text-primary)]">Nombre Completo *</Label>
                    {canEditNombreCompleto ? (
                      <Input
                        id="nombreCompleto"
                        value={editedData.nombreCompleto}
                        onChange={(e) => setEditedData({ ...editedData, nombreCompleto: e.target.value })}
                        placeholder="Nombre y apellidos"
                        className={componentStyles.controls.inputDefault}
                      />
                    ) : (
                      <Input
                        id="nombreCompleto"
                        value={editedData.nombreCompleto}
                        disabled
                        className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                      />
                    )}
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
                    <Label htmlFor="role" className="text-sm text-[var(--color-text-primary)]">Perfil</Label>
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
                        <p className="text-xs mt-1 text-[var(--color-text-secondary)]">Solo administradores pueden cambiar el perfil</p>
                      </div>
                    )}
                  </div>

                  {isEstudiante && (
                    <div className="space-y-1.5">
                      <Label htmlFor="profesorAsignado" className="text-sm text-[var(--color-text-primary)]">Profesor Asignado</Label>
                      {canEditProfesor ? (
                        <Select
                          value={editedData.profesorAsignadoId ? String(editedData.profesorAsignadoId) : "__none__"}
                          onValueChange={(value) => {
                            // Si el valor es "__none__", establecer como null
                            // Si no, usar el ID directamente (el Select devuelve el value como string)
                            const newValue = value === "__none__" ? null : value;
                            setEditedData({ ...editedData, profesorAsignadoId: newValue });
                          }}
                        >
                          <SelectTrigger id="profesorAsignado" className={componentStyles.controls.selectDefault}>
                            <SelectValue placeholder="Sin asignar">
                              {editedData.profesorAsignadoId ? (() => {
                                const prof = profesores.find(p => p.id === editedData.profesorAsignadoId);
                                return prof ? getNombreCompleto(prof) : "Sin asignar";
                              })() : "Sin asignar"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin asignar</SelectItem>
                            {profesores.length > 0 ? profesores.map(prof => (
                              <SelectItem key={prof.id} value={String(prof.id)}>
                                {getNombreCompleto(prof)}
                              </SelectItem>
                            )) : (
                              <SelectItem value="__none__" disabled>No hay profesores disponibles</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="profesorAsignado"
                          value={editedData.profesorAsignadoId ? (() => {
                            const prof = profesores.find(p => p.id === editedData.profesorAsignadoId);
                            return prof ? getNombreCompleto(prof) : 'Sin asignar';
                          })() : 'Sin asignar'}
                          disabled
                          className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                        />
                      )}
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {canEditProfesor ? 'Asigna un profesor o administrador a este estudiante' : 'Solo administradores pueden editar'}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="telefono" className="text-sm text-[var(--color-text-primary)]">Teléfono</Label>
                    <div className="flex items-center gap-2">
                      {canEditTelefono ? (
                        <>
                          <Select
                            value={phoneCountryCode}
                            onValueChange={(value) => setPhoneCountryCode(value)}
                          >
                            <SelectTrigger className={`w-32 ${componentStyles.controls.selectDefault}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countryCodes.map(cc => (
                                <SelectItem key={cc.code} value={cc.code}>
                                  {cc.country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
                              <Input
                                id="telefono"
                                type="tel"
                                value={editedData.telefono || ''}
                                onChange={(e) => {
                                  const filtered = filterPhoneInput(e.target.value);
                                  setEditedData({ ...editedData, telefono: filtered });
                                  setPhoneSearch(filtered);
                                }}
                                placeholder={getPhonePlaceholder(phoneCountryCode)}
                                className={`pl-9 ${componentStyles.controls.inputDefault}`}
                                aria-label="Buscar o ingresar teléfono"
                              />
                              {editedData.telefono && (
                                <button
                                  onClick={() => {
                                    setEditedData({ ...editedData, telefono: '' });
                                    setPhoneSearch('');
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                  aria-label="Limpiar teléfono"
                                  type="button"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {editedData.telefono && editedData.telefono.trim() && getWhatsAppLink(editedData.telefono, phoneCountryCode) && (
                              <a
                                href={getWhatsAppLink(editedData.telefono, phoneCountryCode)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#25D366] text-white hover:bg-[#20BA5A] transition-colors flex-shrink-0"
                                aria-label="Abrir WhatsApp"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="w-5 h-5" />
                              </a>
                            )}
                          </div>
                        </>
                      ) : (
                        <Input
                          id="telefono"
                          type="tel"
                          value={editedData.telefono || ''}
                          disabled
                          className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                        />
                      )}
                    </div>
                  </div>

                  {isEstudiante && (
                    <div className="space-y-1.5">
                      <Label htmlFor="nivel" className="text-sm text-[var(--color-text-primary)]">Experiencia</Label>
                      {canEditNivel ? (
                        <Select
                          value={editedData.nivel || "__none__"}
                          onValueChange={(value) => {
                            const newValue = value === "__none__" ? null : value;
                            setEditedData({ ...editedData, nivel: newValue });
                          }}
                        >
                          <SelectTrigger id="nivel" className={componentStyles.controls.selectDefault}>
                            <SelectValue placeholder="Seleccionar experiencia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin especificar</SelectItem>
                            <SelectItem value="principiante">Principiante</SelectItem>
                            <SelectItem value="intermedio">Intermedio</SelectItem>
                            <SelectItem value="avanzado">Avanzado</SelectItem>
                            <SelectItem value="profesional">Profesional</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="nivel"
                          value={editedData.nivel ? editedData.nivel.charAt(0).toUpperCase() + editedData.nivel.slice(1) : 'Sin especificar'}
                          disabled
                          className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                        />
                      )}
                    </div>
                  )}

                  {isEditingOwnProfile && (() => {
                    const currentTheme = design?.theme || 'system';
                    // En modo oscuro, usar colores más claros para mejor visibilidad
                    // En modo claro, usar las variables CSS del sistema
                    const inactiveBorderColor = isDarkMode ? '#888888' : 'var(--color-border-strong)';
                    const inactiveHoverBorderColor = isDarkMode ? '#AAAAAA' : 'var(--color-border-default)';
                    
                    return (
                      <div className="space-y-1.5">
                        <Label className="text-sm text-[var(--color-text-primary)]">Tema</Label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setDesignPartial('theme', 'light');
                              toast.success('Tema claro activado');
                            }}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                              currentTheme === 'light'
                                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                                : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]'
                            }`}
                            style={currentTheme === 'light' ? {} : {
                              borderColor: inactiveBorderColor,
                              borderWidth: '2px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              if (currentTheme !== 'light') {
                                e.currentTarget.style.setProperty('border-color', inactiveHoverBorderColor, 'important');
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentTheme !== 'light') {
                                e.currentTarget.style.setProperty('border-color', inactiveBorderColor, 'important');
                              }
                            }}
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
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                              currentTheme === 'dark'
                                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                                : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]'
                            }`}
                            style={currentTheme === 'dark' ? {} : {
                              borderColor: inactiveBorderColor,
                              borderWidth: '2px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              if (currentTheme !== 'dark') {
                                e.currentTarget.style.setProperty('border-color', inactiveHoverBorderColor, 'important');
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentTheme !== 'dark') {
                                e.currentTarget.style.setProperty('border-color', inactiveBorderColor, 'important');
                              }
                            }}
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
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                              currentTheme === 'system'
                                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                                : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]'
                            }`}
                            style={currentTheme === 'system' ? {} : {
                              borderColor: inactiveBorderColor,
                              borderWidth: '2px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              if (currentTheme !== 'system') {
                                e.currentTarget.style.setProperty('border-color', inactiveHoverBorderColor, 'important');
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentTheme !== 'system') {
                                e.currentTarget.style.setProperty('border-color', inactiveBorderColor, 'important');
                              }
                            }}
                            aria-label="Tema del sistema"
                          >
                            <Monitor className="w-4 h-4" />
                            <span className="text-sm">Sistema</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
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

                <div className="pt-4 border-t border-[var(--color-border-default)] flex items-center justify-end gap-3">
                  <Button
                    onClick={() => onOpenChange(false)}
                    disabled={updateUserMutation.isPending}
                    variant="outline"
                    className={componentStyles.buttons.secondary}
                  >
                    Cancelar
                  </Button>
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


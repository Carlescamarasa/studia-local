import React, { useState, useEffect } from "react";
import { localDataClient } from "@/api/localDataClient";
import { remoteDataAPI } from "@/api/remote/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUsers } from "@/features/admin/hooks/useUsers";
import { Button } from "@/features/shared/components/ui/button";
import { Card, CardContent } from "@/features/shared/components/ds";
import { Badge } from "@/features/shared/components/ds";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { Alert, AlertDescription } from "@/features/shared/components/ds";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import {
  User, Mail, Shield, Target, Music,
  Save, AlertCircle, Sun, Moon, Monitor, X, MessageCircle, Search, Lock
} from "lucide-react";
import { toast } from "sonner";
import { displayName, displayNameById } from "@/features/shared/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import MediaLinksInput from "@/features/shared/components/media/MediaLinksInput";
import { LoadingSpinner } from "@/features/shared/components/ds";
import { componentStyles } from "@/design/componentStyles";
import { useDesign } from "@/features/design/components/DesignProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/features/shared/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { log } from "@/utils/log";
import { sendPasswordResetEmailFor } from "@/lib/authPasswordHelpers";
import { useUserActions } from "@/features/auth/hooks/useUserActions";

interface PerfilModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
}

export default function PerfilModal({
  open,
  onOpenChange,
  userId = null
}: PerfilModalProps) {
  const queryClient = useQueryClient();
  const { design, setDesignPartial } = useDesign();

  const [editedData, setEditedData] = useState<any>(null);
  const [saveResult, setSaveResult] = useState<any>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordResult, setPasswordResult] = useState<any>(null);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+34'); // Default: España
  const [phoneSearch, setPhoneSearch] = useState(''); // Para búsqueda/filtrado de teléfono
  const [isEditingPhone, setIsEditingPhone] = useState(false);
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
  const getPhonePlaceholder = (countryCode: string) => {
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

  // Usar el nuevo provider de impersonación
  const { effectiveUserId, effectiveEmail, isImpersonating } = useEffectiveUser();
  // Objeto sintético para compatibilidad con código existente
  const effectiveUser = {
    id: effectiveUserId,
    email: effectiveEmail,
    rolPersonalizado: (useEffectiveUser() as any).effectiveRole
  };

  // Usar hook centralizado para usuarios
  const { data: allUsers } = useUsers();

  // Determinar qué userId usar para la query
  // Si hay userId prop, usarlo. Si no, usar effectiveUserId del provider
  const targetUserIdToLoad = userId || effectiveUserId;

  const { data: targetUser, isLoading, refetch: refetchTargetUser } = useQuery({
    // Incluir isImpersonating para forzar refetch al cambiar modo
    queryKey: ['targetUser', targetUserIdToLoad, isImpersonating],
    queryFn: async () => {
      if (!targetUserIdToLoad) return null;

      // OPTIMIZACIÓN: Usar allUsers de useUsers() en lugar de llamar a .list() de nuevo
      // Los datos ya están cacheados por React Query con staleTime de 5 min
      if (allUsers && allUsers.length > 0) {
        const foundUser = allUsers.find(u => u.id === targetUserIdToLoad);
        if (foundUser) {
          return foundUser;
        }

        // Si no se encontró por ID y tenemos email, buscar por email
        if (effectiveEmail) {
          const userByEmail = allUsers.find(u =>
            u.email && u.email.toLowerCase().trim() === ((effectiveEmail as string | null) || '').toLowerCase().trim()
          );
          if (userByEmail) {
            return userByEmail;
          }
        }
      }

      // Fallback: retornar objeto básico si no se encontró en allUsers
      return {
        id: targetUserIdToLoad,
        email: effectiveEmail,
        nombreCompleto: ((effectiveEmail as string | null) || '').split('@')[0],
        rolPersonalizado: 'ESTU',
        profesorAsignadoId: null,
        profesor_asignado_id: null, // Fallback safe
        telefono: null,
        nivel: null,
        nivelTecnico: null,
        mediaLinks: [],
        full_name: (effectiveEmail as string | null)?.split('@')[0],
      };
    },
    enabled: open && !!targetUserIdToLoad && !!allUsers,
  });

  // OPTIMIZACIÓN: El profesor asignado ya debería estar en allUsers gracias a la optimización en usuarios.list()
  // Solo buscar en allUsers, no hacer query individual
  const profesorAsignadoIdToLoad = targetUser?.profesorAsignadoId || targetUser?.profesor_asignado_id;
  const profesorAsignadoDirecto = profesorAsignadoIdToLoad && allUsers
    ? allUsers.find(u => String(u.id).trim() === String(profesorAsignadoIdToLoad).trim())
    : null;

  // Obtener email del usuario objetivo usando la Edge Function get-user-emails
  // Esto es necesario porque los emails no vienen en la lista de usuarios para PROF/ADMIN
  const targetUserId = targetUser?.id;
  const { data: targetUserEmail } = useQuery({
    queryKey: ['targetUserEmail', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      // Si el targetUser ya tiene email válido, usarlo directamente
      if (targetUser?.email && targetUser.email.trim() && targetUser.email.includes('@')) {
        return targetUser.email;
      }

      // Si no tiene email válido, intentar obtenerlo desde la Edge Function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return null;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl) return null;

        const headers: Record<string, string> = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        };

        if (supabaseAnonKey) {
          headers['apikey'] = supabaseAnonKey;
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/get-user-emails`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ userIds: [targetUserId] }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.emails && data.emails[targetUserId]) {
            return data.emails[targetUserId];
          }
        } else {
          log.warn('[PerfilModal] Error en respuesta de get-user-emails:', response.status, response.statusText);
        }
      } catch (error) {
        log.warn('[PerfilModal] Error obteniendo email del usuario:', error);
      }

      return null;
    },
    enabled: !!targetUserId && open, // Ejecutar siempre que haya targetUserId y el modal esté abierto
    retry: false,
  });

  const getNombreCompleto = (user: any) => {
    if (!user) return 'Sin asignar';
    const nombre = displayName(user);
    // Si displayName devuelve "Sin nombre" o está vacío, intentar usar email como fallback
    if (!nombre || nombre === 'Sin nombre' || nombre.trim() === '') {
      if (user.email) {
        const emailStr = String(user.email);
        if (emailStr.includes('@')) {
          const parteLocal = emailStr.split('@')[0];
          const isLikelyId = /^[a-f0-9]{24}$/i.test(parteLocal) || /^u_[a-z0-9_]+$/i.test(parteLocal);
          if (parteLocal && !isLikelyId) {
            return parteLocal
              .replace(/[._+-]/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase())
              .trim() || emailStr;
          }
        }
        return emailStr;
      }
      return 'Sin asignar';
    }
    return nombre;
  };

  // Filtrar usuarios con rol PROF o ADMIN para el selector de profesores
  // También incluir el profesor asignado si existe, aunque no esté en la lista filtrada
  const profesores = React.useMemo(() => {
    if (!allUsers || !Array.isArray(allUsers)) return [];
    const profesoresFiltrados = allUsers.filter(u => u.rolPersonalizado === 'PROF' || u.rolPersonalizado === 'ADMIN');

    // Añadir el profesor asignado si existe (ya sea de allUsers o cargado directamente)
    const profesorId = editedData?.profesorAsignadoId || targetUser?.profesorAsignadoId || targetUser?.profesor_asignado_id;
    if (profesorId) {
      const profesorIdNormalizado = String(profesorId).trim();

      // Buscar en allUsers primero
      let profesorAsignado = allUsers.find((u: any) => {
        const idNormalizado = String(u.id).trim();
        return idNormalizado === profesorIdNormalizado;
      });

      // Si no está en allUsers, usar el profesor cargado directamente
      if (!profesorAsignado && profesorAsignadoDirecto) {
        const profIdNormalizado = String(profesorAsignadoDirecto.id).trim();
        if (profIdNormalizado === profesorIdNormalizado) {
          profesorAsignado = profesorAsignadoDirecto;
        }
      }

      // Añadir a la lista si existe y no está ya en ella
      if (profesorAsignado && !profesoresFiltrados.find(p => String(p.id).trim() === String(profesorAsignado.id).trim())) {
        profesoresFiltrados.push(profesorAsignado);
      }
    }

    return profesoresFiltrados;
  }, [allUsers, targetUser?.profesorAsignadoId, targetUser?.profesor_asignado_id, editedData?.profesorAsignadoId, profesorAsignadoDirecto]);

  // Extraer código de país del teléfono si existe
  const extractCountryCodeFromPhone = (phone: string | null | undefined) => {
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
  const filterPhoneInput = (value: string) => {
    // Permitir solo números, espacios, guiones, paréntesis y puntos
    return value.replace(/[^\d\s\-\(\)\.]/g, '');
  };

  // Normalizar número de teléfono (eliminar espacios, guiones, paréntesis, etc.)
  const normalizePhoneNumber = (phone: string | null | undefined, countryCode: string) => {
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
  const getCountryDigits = (countryCode: string) => {
    const country = countryCodes.find(cc => cc.code === countryCode);
    return country?.digits || 9; // Default: 9 dígitos (España)
  };

  // Generar link de WhatsApp (solo si el número tiene la longitud correcta)
  const getWhatsAppLink = (phone: string | null | undefined, countryCode: string) => {
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
      setIsEditingPhone(false); // Resetear modo edición al cargar usuario

      // Asegurar que profesorAsignadoId se carga correctamente desde targetUser
      // Puede venir como profesorAsignadoId o profesor_asignado_id
      const profesorAsignadoIdValue = targetUser.profesorAsignadoId || targetUser.profesor_asignado_id || null;
      log.debug('[PerfilModal] Cargando editedData:', {
        targetUserProfesorAsignadoId: targetUser.profesorAsignadoId,
        targetUserProfesor_asignado_id: targetUser.profesor_asignado_id,
        profesorAsignadoIdValue,
        allUsersLength: allUsers?.length,
      });

      // Usar email del query si está disponible, sino usar el del targetUser
      // Priorizar el email del query porque viene de la Edge Function y es más confiable
      const emailToUse = targetUserEmail || (targetUser.email && targetUser.email.trim() && targetUser.email.includes('@') ? targetUser.email : '') || '';

      setEditedData({
        nombreCompleto: targetUser.full_name || targetUser.nombreCompleto || getNombreCompleto(targetUser),
        email: emailToUse,
        rolPersonalizado: targetUser.rolPersonalizado || 'ESTU',
        profesorAsignadoId: profesorAsignadoIdValue,
        nivel: targetUser.nivel || null,
        nivelTecnico: targetUser.nivelTecnico || 1,
        telefono: normalizedPhone,
        mediaLinks: (targetUser as any).mediaLinks || [],
      });
      setSaveResult(null);
    }
  }, [targetUser, open, targetUserEmail]); // Añadir targetUserEmail como dependencia para actualizar cuando cambie

  const updateUserMutation = useMutation<any, Error, any>({
    mutationFn: async (data: any) => {
      if (!targetUser?.id) {
        throw new Error('No se puede actualizar: usuario no encontrado');
      }

      if (targetUser?.id === effectiveUser?.id) {
        // Si estamos actualizando nuestro propio perfil, usar updateMe
        // Pasar el ID del effectiveUser para que funcione en modo Supabase
        const updated = await localDataClient.auth.updateMe(data, effectiveUser?.id || targetUser.id);
        return updated; // Retornar el usuario actualizado
      } else {
        // Actualizar perfil de otro usuario (solo admins)
        const updated = await localDataClient.entities.User.update(targetUser.id, data);
        return updated; // Retornar el usuario actualizado
      }
    },
    onSuccess: async (updatedUser) => {
      // Actualizar el cache directamente con el usuario actualizado
      if (updatedUser) {
        queryClient.setQueryData(['targetUser', userId], updatedUser);

        // Si estamos actualizando nuestro propio perfil, también actualizar la lista de usuarios
        if (targetUser?.id === effectiveUser?.id) {
          // Actualizar el usuario en la lista de usuarios
          queryClient.setQueryData(['allUsers'], (oldData: any[]) => {
            if (!oldData) return oldData;
            return oldData.map(u => u.id === updatedUser.id ? updatedUser : u);
          });
          queryClient.setQueryData(['users'], (oldData: any[]) => {
            if (!oldData) return oldData;
            return oldData.map(u => u.id === updatedUser.id ? updatedUser : u);
          });
        }
      }

      // Invalidar todas las queries relacionadas para forzar refetch
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['currentProfile'] }); // Fix: Invalidate correct key used by useCurrentProfile
      await queryClient.invalidateQueries({ queryKey: ['targetUser', userId] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['allUsers'] });

      // Refetch explícito del targetUser para obtener los datos actualizados
      await refetchTargetUser();
      await queryClient.refetchQueries({ queryKey: ['allUsers'] });

      setSaveResult({ success: true, message: '✅ Usuario actualizado correctamente.' });
      toast.success('Perfil actualizado correctamente.');
      setIsEditingPhone(false); // Salir del modo edición después de guardar

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

  // Función para guardar solo el teléfono
  const handleSavePhone = async () => {
    if (!editedData) return;

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
      telefono: telefonoFinal,
    };

    try {
      if (!targetUser?.id) {
        throw new Error('Usuario no encontrado');
      }

      if (targetUser.id === effectiveUser?.id) {
        // Si estamos actualizando nuestro propio perfil, usar updateMe
        // Pasar el ID del effectiveUser para que funcione en modo Supabase
        await localDataClient.auth.updateMe(dataToSave, effectiveUser?.id || targetUser.id);
      } else {
        await localDataClient.entities.User.update(targetUser.id, dataToSave);
      }

      // Actualizar el targetUser localmente para reflejar el cambio
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['currentProfile'] }); // Fix: Invalidate correct key
      await queryClient.invalidateQueries({ queryKey: ['targetUser', userId] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['allUsers'] });

      // Refetch inmediato para actualizar el targetUser
      await queryClient.refetchQueries({ queryKey: ['targetUser', userId] });

      // También refetch de users para asegurar que se actualice
      await queryClient.refetchQueries({ queryKey: ['users'] });

      // Salir del modo edición
      setIsEditingPhone(false);
      toast.success('Teléfono guardado correctamente');
    } catch (error: any) {
      log.error('[PerfilModal] Error al guardar teléfono:', {
        error: error?.message || error,
        code: error?.code,
      });
      toast.error(`Error al guardar el teléfono: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleSave = async () => {
    if (!editedData) return;

    if (!editedData.nombreCompleto?.trim()) {
      setSaveResult({ success: false, message: '❌ El nombre completo es obligatorio' });
      toast.error('El nombre completo es obligatorio');
      return;
    }

    // Solo validar profesor asignado si realmente se está cambiando
    const profesorAsignadoChanged = editedData.profesorAsignadoId !== (targetUser?.profesorAsignadoId || null);
    if (profesorAsignadoChanged && editedData.profesorAsignadoId) {
      // Verificar que el profesor asignado realmente tenga rol PROF o ADMIN
      // Normalizar IDs para comparación
      const profesorIdNormalizado = String(editedData.profesorAsignadoId).trim();
      const profesor = profesores.find(p => {
        const profIdNormalizado = String(p.id).trim();
        return profIdNormalizado === profesorIdNormalizado;
      });
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

    // Preparar datos para guardar
    // Solo incluir profesorAsignadoId si realmente ha cambiado o si es necesario actualizarlo
    // IMPORTANTE: full_name es la fuente de verdad en profiles
    const dataToSave: any = {
      nombreCompleto: editedData.nombreCompleto,
      full_name: editedData.nombreCompleto, // Sincronizar con full_name en profiles
      rolPersonalizado: editedData.rolPersonalizado,
      nivel: editedData.nivel || null,
      nivelTecnico: editedData.nivelTecnico || null,
      telefono: telefonoFinal,
      // mediaLinks no se incluye al guardar (la columna no existe en Supabase profiles)
      // Se mantiene solo en el estado local para mostrar el componente MediaLinksInput
    };

    // Solo incluir profesorAsignadoId si realmente ha cambiado
    // Esto evita intentar actualizar con IDs inválidos cuando solo se actualiza el nombre
    if (profesorAsignadoChanged && isEstudiante) {
      const profesorId = editedData.profesorAsignadoId;
      if (profesorId) {
        // Verificar que sea un UUID válido antes de incluir
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(String(profesorId).trim())) {
          dataToSave.profesorAsignadoId = profesorId;
        } else {
          // Si no es UUID válido, rechazar el cambio
          setSaveResult({ success: false, message: '❌ El ID del profesor asignado no es válido. Debe ser un UUID válido.' });
          toast.error('El ID del profesor asignado no es válido. Debe ser un UUID válido.');
          return;
        }
      } else {
        dataToSave.profesorAsignadoId = null;
      }
    }

    updateUserMutation.mutate(dataToSave);
  };

  // Cambiar contraseña usando resetPasswordForEmail (envía email para restablecer contraseña)
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      // Determinar el email del usuario objetivo
      let targetEmail;

      if (isEditingOwnProfile) {
        // Usuario editando su propio perfil: usar email de la sesión activa
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) {
          throw new Error('No hay sesión activa o no se pudo obtener el email. Por favor, inicia sesión de nuevo.');
        }
        targetEmail = session.user.email;
        // Usar el helper compartido (funciona para el usuario autenticado)
        await sendPasswordResetEmailFor(targetEmail);
      } else {
        // Admin editando otro usuario: usar Edge Function con Admin API
        if (!targetUser?.email) {
          throw new Error('No se pudo obtener el email del usuario.');
        }
        if (!targetUser?.id) {
          throw new Error('No se pudo obtener el ID del usuario.');
        }
        targetEmail = targetUser.email;
        // Usar Edge Function que usa Admin API (más confiable para otros usuarios)
        await sendPasswordResetEmailFor(targetEmail);
      }
      return { success: true, email: targetEmail };
    },
    onSuccess: (data) => {
      const email = data?.email || targetUser?.email || effectiveUser?.email || 'tu correo';
      const mensaje = isEditingOwnProfile
        ? `✅ Te hemos enviado un correo a ${email} para cambiar tu contraseña.`
        : `✅ Se ha enviado un correo a ${email} para cambiar la contraseña.`;
      setPasswordResult({
        success: true,
        message: mensaje
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(isEditingOwnProfile
        ? 'Te hemos enviado un correo para cambiar tu contraseña.'
        : 'Se ha enviado un correo para cambiar la contraseña.');
    },
    onError: (error) => {
      log.error('[PerfilModal] Error al enviar email de restablecimiento:', error);
      const errorMessage = error.message || 'No se pudo enviar el correo';
      setPasswordResult({
        success: false,
        message: `❌ Error: ${errorMessage}`
      });
      toast.error(`Error al enviar el correo: ${errorMessage}`);
    },
  });

  const handleChangePassword = async () => {
    setPasswordResult(null);

    // No necesitamos validar campos ya que solo enviamos el email
    // El usuario establecerá la nueva contraseña desde el email
    changePasswordMutation.mutate();
  };

  // Cambiar contraseña directamente (solo para el propio usuario)
  const updatePasswordMutation = useMutation<any, Error, { currentPassword: string, newPassword: string }>({
    mutationFn: async ({ currentPassword, newPassword }) => {
      if (!isEditingOwnProfile) {
        throw new Error('Solo puedes cambiar tu propia contraseña directamente.');
      }

      // Obtener el email del usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        throw new Error('No se pudo obtener la información de la sesión.');
      }

      // Verificar la contraseña actual intentando hacer signIn
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword.trim(),
      });

      if (signInError) {
        if (signInError.message?.includes('Invalid login credentials') ||
          signInError.message?.includes('Email not confirmed')) {
          throw new Error('La contraseña actual es incorrecta.');
        }
        throw signInError;
      }

      // Si la contraseña actual es correcta, actualizar a la nueva
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      setPasswordResult({
        success: true,
        message: '✅ Contraseña actualizada correctamente.'
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Contraseña actualizada correctamente');
    },
    onError: (error) => {
      log.error('[PerfilModal] Error al actualizar contraseña:', error);
      const errorMessage = error.message || 'No se pudo actualizar la contraseña';
      setPasswordResult({
        success: false,
        message: `❌ Error: ${errorMessage}`
      });
      toast.error(`Error al actualizar la contraseña: ${errorMessage}`);
    },
  });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResult(null);

    // Validaciones
    if (!passwordData.currentPassword.trim()) {
      setPasswordResult({
        success: false,
        message: '❌ Por favor, introduce tu contraseña actual.'
      });
      return;
    }

    if (!passwordData.newPassword.trim()) {
      setPasswordResult({
        success: false,
        message: '❌ Por favor, introduce una nueva contraseña.'
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordResult({
        success: false,
        message: '❌ La contraseña debe tener al menos 6 caracteres.'
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordResult({
        success: false,
        message: '❌ Las contraseñas no coinciden.'
      });
      return;
    }

    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const roleLabels = {
    ADMIN: 'Administrador',
    PROF: 'Profesor',
    ESTU: 'Estudiante',
  };

  // Determinar si estamos editando el perfil propio
  // Verificar tanto por ID como por email para asegurar que funciona en todos los casos
  const isEditingOwnProfile = targetUser?.id === effectiveUser?.id ||
    (targetUser?.email && effectiveUser?.email &&
      targetUser.email.toLowerCase().trim() === ((effectiveUser?.email as string | null) || '').toLowerCase().trim()) ||
    (!userId && targetUser?.id === effectiveUser?.id); // Si no hay userId, siempre es el perfil propio
  const userRole = effectiveUser?.rolPersonalizado;

  // Permisos de edición según rol
  const canEditNombreCompleto = userRole === 'ADMIN' || userRole === 'PROF' || userRole === 'ESTU'; // Todos pueden editar
  const canEditEmail = false; // Nadie puede editar
  const canEditRole = userRole === 'ADMIN'; // Solo ADMIN
  const canEditProfesor = userRole === 'ADMIN'; // Solo ADMIN (antes también PROF)
  const canEditTelefono = userRole === 'ADMIN' || userRole === 'PROF' || userRole === 'ESTU'; // Todos pueden editar
  const canEditNivel = userRole === 'ADMIN' || userRole === 'PROF'; // Solo ADMIN y PROF pueden editar

  const isEstudiante = targetUser?.rolPersonalizado === 'ESTU';
  const isProfesor = targetUser?.rolPersonalizado === 'PROF';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[var(--color-border-default)] shadow-sm relative">
          <div className="flex items-center justify-center">
            <DialogTitle className="flex items-center gap-2 text-center">
              <User className="w-5 h-5 text-[var(--color-primary)]" />
              {isLoading || !targetUser
                ? 'Cargando perfil...'
                : (isEditingOwnProfile ? 'Mi Perfil' : `Perfil de ${getNombreCompleto(targetUser)}`)
              }
            </DialogTitle>
          </div>
          <DialogDescription className="text-center">
            {isEditingOwnProfile ? 'Edita tu información personal' : 'Edita la información del usuario'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !editedData ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Cargando perfil..." />
          </div>
        ) : (
          <>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {saveResult && (
                <Alert
                  variant={saveResult.success ? 'success' : 'danger'}
                  className={componentStyles.containers.panelBase}
                >
                  <AlertDescription>
                    {saveResult.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nombreCompleto" className="block text-sm text-[var(--color-text-primary)]">Nombre Completo *</Label>
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
                    <Label htmlFor="email" className="block text-sm text-[var(--color-text-primary)]">Email</Label>
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
                    <Label htmlFor="role" className="block text-sm text-[var(--color-text-primary)]">Perfil</Label>
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
                          value={roleLabels[editedData.rolPersonalizado as keyof typeof roleLabels] || editedData.rolPersonalizado}
                          disabled
                          className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                        />
                        <p className="text-xs mt-1 text-[var(--color-text-secondary)]">Solo administradores pueden cambiar el perfil</p>
                      </div>
                    )}
                  </div>

                  {isEstudiante && (
                    <div className="space-y-1.5">
                      <Label htmlFor="profesorAsignado" className="block text-sm text-[var(--color-text-primary)]">Profesor Asignado</Label>
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
                                // Normalizar IDs para comparación (pueden venir como string o UUID)
                                const profesorIdNormalizado = String(editedData.profesorAsignadoId).trim();

                                if (!profesorIdNormalizado || profesorIdNormalizado === 'null' || profesorIdNormalizado === 'undefined') {
                                  return "Sin asignar";
                                }

                                // Primero buscar en profesores (que ya incluye el profesor cargado directamente)
                                let prof = profesores.find(p => {
                                  if (!p || !p.id) return false;
                                  const profIdNormalizado = String(p.id).trim();
                                  return profIdNormalizado === profesorIdNormalizado;
                                });

                                // Si no se encuentra en profesores, buscar en allUsers
                                if (!prof && allUsers && Array.isArray(allUsers)) {
                                  prof = allUsers.find(p => {
                                    if (!p || !p.id) return false;
                                    const profIdNormalizado = String(p.id).trim();
                                    return profIdNormalizado === profesorIdNormalizado;
                                  });
                                }

                                // Si aún no se encuentra, usar el profesor cargado directamente
                                if (!prof && profesorAsignadoDirecto) {
                                  const profIdNormalizado = String(profesorAsignadoDirecto.id).trim();
                                  if (profIdNormalizado === profesorIdNormalizado) {
                                    prof = profesorAsignadoDirecto;
                                  }
                                }

                                // Último recurso: usar displayNameById
                                if (!prof) {
                                  const nombrePorId = displayNameById(profesorIdNormalizado);
                                  if (nombrePorId && nombrePorId !== 'Sin nombre') {
                                    return nombrePorId;
                                  }
                                }

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
                            // Normalizar IDs para comparación
                            const profesorIdNormalizado = String(editedData.profesorAsignadoId).trim();

                            if (!profesorIdNormalizado || profesorIdNormalizado === 'null' || profesorIdNormalizado === 'undefined') {
                              return 'Sin asignar';
                            }

                            // Primero buscar en profesores (que ya incluye el profesor cargado directamente)
                            let prof = profesores.find(p => {
                              if (!p || !p.id) return false;
                              const profIdNormalizado = String(p.id).trim();
                              return profIdNormalizado === profesorIdNormalizado;
                            });

                            // Si no se encuentra en profesores, buscar en allUsers
                            if (!prof && allUsers && Array.isArray(allUsers)) {
                              prof = allUsers.find(p => {
                                if (!p || !p.id) return false;
                                const profIdNormalizado = String(p.id).trim();
                                return profIdNormalizado === profesorIdNormalizado;
                              });
                            }

                            // Si aún no se encuentra, usar el profesor cargado directamente
                            if (!prof && profesorAsignadoDirecto) {
                              const profIdNormalizado = String(profesorAsignadoDirecto.id).trim();
                              if (profIdNormalizado === profesorIdNormalizado) {
                                prof = profesorAsignadoDirecto;
                              }
                            }

                            // Último recurso: usar displayNameById
                            if (!prof) {
                              const nombrePorId = displayNameById(profesorIdNormalizado);
                              if (nombrePorId && nombrePorId !== 'Sin nombre') {
                                return nombrePorId;
                              }
                            }

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

                  {/* Campo de teléfono oculto temporalmente */}
                  {false && (
                    <div className="space-y-1.5">
                      <Label htmlFor="telefono" className="block text-sm text-[var(--color-text-primary)]">Teléfono</Label>
                      <div className="flex items-center gap-2">
                        {canEditTelefono && !isEditingPhone ? (
                          // Modo visualización: mostrar teléfono guardado (clickeable para editar)
                          <>
                            <Input
                              id="telefono"
                              type="tel"
                              value={targetUser?.telefono ? String(targetUser?.telefono) : ''}
                              readOnly
                              onClick={() => setIsEditingPhone(true)}
                              className={`flex-1 ${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-pointer`}
                              aria-label="Haz clic para editar el teléfono"
                              title="Haz clic para editar el teléfono"
                            />
                            {(() => {
                              try {
                                if (!targetUser?.telefono) return null;
                                const countryCode = extractCountryCodeFromPhone(targetUser?.telefono);
                                const whatsappLink = getWhatsAppLink(targetUser?.telefono, countryCode);
                                if (!whatsappLink) return null;
                                return (
                                  <a
                                    href={whatsappLink || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#25D366] text-white hover:bg-[#20BA5A] transition-colors flex-shrink-0"
                                    aria-label="Abrir WhatsApp"
                                    title="Abrir WhatsApp"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MessageCircle className="w-5 h-5" />
                                  </a>
                                );
                              } catch (error) {
                                log.error('[PerfilModal] Error al generar link de WhatsApp:', error);
                                return null;
                              }
                            })()}
                          </>
                        ) : canEditTelefono && isEditingPhone ? (
                          // Modo edición: mostrar formulario de edición
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
                                  className={componentStyles.controls.inputDefault}
                                  aria-label="Buscar o ingresar teléfono"
                                />
                              </div>
                              <button
                                onClick={handleSavePhone}
                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-secondary)] transition-colors flex-shrink-0"
                                aria-label="Guardar teléfono"
                                title="Guardar teléfono"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setIsEditingPhone(false);
                                  // Restaurar teléfono original si se cancela
                                  const telefono = targetUser?.telefono || '';
                                  const extractedCode = extractCountryCodeFromPhone(telefono);
                                  const normalizedPhone = extractedCode !== '+34'
                                    ? normalizePhoneNumber(telefono, extractedCode)
                                    : telefono.replace(/^\+34\s*/, '');
                                  setPhoneCountryCode(extractedCode);
                                  setEditedData({ ...editedData, telefono: normalizedPhone });
                                }}
                                className="flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] transition-colors flex-shrink-0"
                                aria-label="Cancelar edición"
                                title="Cancelar edición"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          // Sin permisos de edición
                          <Input
                            id="telefono"
                            type="tel"
                            value={targetUser?.telefono || ''}
                            disabled
                            className={`flex-1 ${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {isEstudiante && (
                    <div className="space-y-1.5">
                      <Label htmlFor="nivel" className="block text-sm text-[var(--color-text-primary)]">Experiencia</Label>
                      {/* Campo de Experiencia siempre bloqueado - se calcula automáticamente */}
                      <Input
                        id="nivel"
                        value={editedData.nivel ? editedData.nivel.charAt(0).toUpperCase() + editedData.nivel.slice(1) : 'Sin especificar'}
                        disabled
                        className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                      />
                      <p className="text-xs text-[var(--color-text-secondary)]">Se actualiza automáticamente según el Nivel Técnico</p>
                    </div>
                  )}

                  {isEstudiante && (
                    <div className="space-y-1.5">
                      <Label htmlFor="nivelTecnico" className="block text-sm text-[var(--color-text-primary)]">Nivel Técnico (1-10)</Label>
                      {canEditNivel ? (
                        <Input
                          id="nivelTecnico"
                          type="number"
                          min="1"
                          max="10"
                          value={editedData.nivelTecnico || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                            if (val === null || (val !== null && !isNaN(val) && val >= 1 && val <= 10)) {
                              // Calcular automáticamente el nivel de experiencia
                              let nuevoNivel = 'principiante';
                              if (val !== null) {
                                if (val >= 4 && val <= 6) nuevoNivel = 'intermedio';
                                else if (val >= 7 && val <= 9) nuevoNivel = 'avanzado';
                                else if (val >= 10) nuevoNivel = 'profesional';
                              }

                              setEditedData({
                                ...editedData,
                                nivelTecnico: val,
                                nivel: nuevoNivel
                              });
                            }
                          }}
                          placeholder="Ej: 5"
                          className={componentStyles.controls.inputDefault}
                        />
                      ) : (
                        <Input
                          id="nivelTecnico"
                          value={editedData.nivelTecnico || 'Sin especificar'}
                          disabled
                          className={`${componentStyles.controls.inputDefault} bg-[var(--color-surface-muted)] cursor-not-allowed`}
                        />
                      )}
                      <p className="text-xs text-[var(--color-text-secondary)]">Nivel técnico objetivo para cálculo de BPMs</p>
                    </div>
                  )}


                </div>

                {isProfesor && (
                  <div className="pt-4 border-t border-[var(--color-border-default)] overflow-hidden">
                    <MediaLinksInput
                      value={editedData.mediaLinks}
                      onChange={(links: any) => setEditedData({ ...editedData, mediaLinks: links })}
                      onPreview={() => { }}
                    />
                    <p className="text-xs mt-2 text-[var(--color-text-secondary)]">
                      Enlaces multimedia personales (videos demostrativos, recursos, etc.)
                    </p>
                  </div>
                )}

                {/* Sección de Seguridad - Cambio de contraseña */}
                {/* Visible para TODOS los usuarios cuando editan su propio perfil, independientemente del rol */}
                {isEditingOwnProfile && targetUser?.email && (
                  <div className="pt-6 border-t border-[var(--color-border-default)] space-y-4">
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Seguridad</h3>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] ml-7">
                        Cambia tu contraseña directamente o solicita un enlace por correo.
                      </p>
                    </div>

                    {passwordResult && (
                      <Alert
                        variant={passwordResult.success ? 'success' : 'danger'}
                        className={componentStyles.containers.panelBase}
                      >
                        <AlertDescription>
                          {passwordResult.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleUpdatePassword} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword" className={componentStyles.form.fieldLabel}>
                          Contraseña actual
                        </Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder="••••••••"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          required
                          disabled={updatePasswordMutation.isPending}
                          autoComplete="current-password"
                          className={componentStyles.controls.inputDefault}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className={componentStyles.form.fieldLabel}>
                          Nueva contraseña
                        </Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="••••••••"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          required
                          disabled={updatePasswordMutation.isPending}
                          autoComplete="new-password"
                          className={componentStyles.controls.inputDefault}
                        />
                        <p className="text-xs text-[var(--color-text-secondary)]">Mínimo 6 caracteres</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className={componentStyles.form.fieldLabel}>
                          Confirmar contraseña
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          required
                          disabled={updatePasswordMutation.isPending}
                          autoComplete="new-password"
                          className={componentStyles.controls.inputDefault}
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          type="submit"
                          loading={updatePasswordMutation.isPending}
                          loadingText="Actualizando..."
                          disabled={updatePasswordMutation.isPending}
                          variant="default"
                          size="sm"
                          className={componentStyles.buttons.primary + " flex-1"}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Actualizar contraseña
                        </Button>
                        <Button
                          type="button"
                          onClick={handleChangePassword}
                          loading={changePasswordMutation.isPending}
                          loadingText="Enviando..."
                          disabled={changePasswordMutation.isPending || updatePasswordMutation.isPending}
                          variant="outline"
                          size="sm"
                          className={componentStyles.buttons.secondary + " flex-1"}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Enviar enlace por email
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Sección de Seguridad para administradores editando otros usuarios */}
                {!isEditingOwnProfile && canEditRole && targetUser?.email && (
                  <div className="pt-6 border-t border-[var(--color-border-default)] space-y-4">
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Seguridad</h3>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] ml-7">
                        Enviar enlace para cambiar contraseña a este usuario.
                      </p>
                    </div>

                    {passwordResult && (
                      <Alert
                        variant={passwordResult.success ? 'success' : 'danger'}
                        className={componentStyles.containers.panelBase}
                      >
                        <AlertDescription>
                          {passwordResult.message}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={async () => {
                          setPasswordResult(null);
                          try {
                            await changePasswordMutation.mutateAsync();
                          } catch (error) {
                            // Error ya manejado en la mutation
                          }
                        }}
                        loading={changePasswordMutation.isPending}
                        loadingText="Enviando correo..."
                        disabled={changePasswordMutation.isPending}
                        variant="destructive"
                        size="sm"
                        className={componentStyles.buttons.danger + " flex-1"}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Enviar enlace de cambio de contraseña
                      </Button>
                    </div>
                  </div>
                )}

                {canEditRole && isEditingOwnProfile && (
                  <Alert
                    variant="warning"
                    className={componentStyles.containers.panelBase}
                  >
                    <AlertDescription>
                      <strong>Advertencia:</strong> Si cambias tu propio rol, tu acceso y navegación en la aplicación se actualizarán automáticamente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

            </div>
          </>
        )}

        {!isLoading && editedData && (
          <DialogFooter className="flex-shrink-0 min-h-[3.5rem] px-6 py-4 border-t border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-sm">
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                onClick={() => {
                  setIsEditingPhone(false);
                  onOpenChange(false);
                }}
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
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}


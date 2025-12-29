import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { getCachedAuthUser } from '@/auth/authUserCache';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { useDesign } from '@/features/design/components/DesignProvider';
import { toast } from 'sonner';
import { UserPlus, CheckCircle, Mail, Music, Sun, Moon } from 'lucide-react';
import logoLTS from '@/assets/Logo_LTS.svg';
import { getAppName } from '@/features/shared/utils/appMeta';
import { log } from '@/utils/log';
import { createPageUrl } from '@/utils';
import { roleHome } from '@/features/auth/components/roleMap';
import { validatePasswordStrength, validateEmail, isEmpty } from '../utils/validation';

export default function InvitationPage() {
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  // @ts-ignore - useAuth user type inference is not perfect yet
  const { user, loading: authLoading, appRole } = useAuth() as any;
  const appName = getAppName();
  const { design, activeMode, setActiveMode } = useDesign();
  // @ts-ignore - design possibly null
  const primaryColor = design?.colors?.primary || '#fd9840';

  useEffect(() => {
    // Esperar a que termine de cargar la autenticación
    if (authLoading) return;

    // Si el usuario está autenticado, obtener su email y nombre
    if (user) {
      setUserEmail(user.email || '');
      // Si el usuario ya tiene nombre completo, prellenar el campo
      if (user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
      return; // Permitir acceso
    }

    // Si no está autenticado, verificar si hay token de invitación
    const hash = window.location.hash;
    const hasHash = hash && hash.length > 1;

    if (hasHash) {
      // Supabase está procesando el token de invitación
      // Esperar a que se procese y obtener la sesión
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUserEmail(session.user.email || '');
          if (session.user.user_metadata?.full_name) {
            setFullName(session.user.user_metadata.full_name);
          }
        }
      });
      return;
    }

    // Si NO hay hash ni usuario, el enlace es inválido
    const errorTimer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !user) {
        toast.error('Enlace de invitación inválido o expirado. Solicita un nuevo enlace.');
        setTimeout(() => navigate('/login'), 3000);
      }
    }, 2000);

    return () => clearTimeout(errorTimer);
  }, [navigate, user, authLoading]);

  // Obtener email del usuario cuando esté disponible
  useEffect(() => {
    if (user?.email && !userEmail) {
      setUserEmail(user.email);
    }
  }, [user, userEmail]);

  const validateField = (field: string, value: string) => {
    const fieldErrors = { ...errors };

    if (field === 'full_name') {
      if (isEmpty(value)) {
        fieldErrors.full_name = 'El nombre completo es requerido';
      } else if (value.trim().length < 2) {
        fieldErrors.full_name = 'El nombre debe tener al menos 2 caracteres';
      } else {
        delete fieldErrors.full_name;
      }
    }

    if (field === 'password') {
      const passwordValidation = validatePasswordStrength(value);
      if (!passwordValidation.valid) {
        fieldErrors.password = passwordValidation.errors[0];
      } else {
        delete fieldErrors.password;
      }
    }

    if (field === 'confirmPassword') {
      if (value !== password) {
        fieldErrors.confirmPassword = 'Las contraseñas no coinciden';
      } else {
        delete fieldErrors.confirmPassword;
      }
    }

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todos los campos
    const fullNameValid = validateField('full_name', fullName);
    const passwordValid = validateField('password', password);
    const confirmPasswordValid = validateField('confirmPassword', confirmPassword);

    if (!fullNameValid || !passwordValid || !confirmPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      // 1. Actualizar la contraseña
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password.trim(),
        data: {
          full_name: fullName.trim(),
        },
      });

      if (passwordError) {
        throw passwordError;
      }

      // 2. Actualizar el perfil en la tabla profiles
      const currentUser = await getCachedAuthUser();
      if (currentUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
          })
          .eq('id', currentUser.id);

        if (profileError) {
          // No es crítico si falla - el nombre ya está en user_metadata
          log.warn('Error al actualizar perfil:', profileError);
        }
      }

      setIsSuccess(true);
      toast.success('Registro completado correctamente');

      // Redirigir según el estado de autenticación
      setTimeout(() => {
        if (user || currentUser) {
          // Si el usuario está autenticado, redirigir a su página de inicio según su rol
          const targetPage = roleHome[appRole as keyof typeof roleHome] || roleHome.ESTU;
          const pageName = targetPage.replace(/^\//, '');
          navigate(createPageUrl(pageName), { replace: true });
        } else {
          // Si no está autenticado, redirigir a login
          navigate('/login', { replace: true });
        }
      }, 2000);
    } catch (error: any) {
      log.error('Error al completar registro:', error);
      const errorMessage = error.message?.toLowerCase() || '';

      if (errorMessage.includes('session') || errorMessage.includes('token')) {
        toast.error('El enlace ha expirado. Solicita un nuevo enlace de invitación.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        toast.error('Error al completar el registro. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const PageLayout = ({ children }: { children: React.ReactNode }) => (
    <div
      className={componentStyles.auth.loginPageContainer}
      style={{
        background: `linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 50%, var(--color-surface-elevated) 100%)`,
      }}
    >
      {/* Elementos decorativos de fondo */}
      <div className={componentStyles.auth.loginPageBackground}>
        {/* Círculos decorativos con gradiente primario */}
        <div
          className={componentStyles.auth.loginDecorativeCircle}
          style={{
            background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
          }}
        />
        <div
          className={componentStyles.auth.loginDecorativeCircleBottom}
          style={{
            background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
          }}
        />
        {/* Patrón de puntos sutiles */}
        <div
          className={componentStyles.auth.loginPatternOverlay}
          style={{
            backgroundImage: `radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Contenedor principal */}
      <div className={componentStyles.auth.loginCardContainer}>
        <Card
          className={`${componentStyles.containers.cardElevated} ${componentStyles.auth.loginCard}`}
          style={{
            borderColor: 'var(--color-border-strong)',
            background: 'var(--color-surface-elevated)',
          }}
        >
          {children}
        </Card>
      </div>
    </div>
  );

  if (isSuccess) {
    return (
      <PageLayout>
        <CardHeader className={componentStyles.auth.loginHeader}>
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="w-16 h-16" style={{ color: primaryColor }} />
            <CardTitle className="text-center" style={{ color: 'var(--color-text-primary)' }}>Registro completado</CardTitle>
            <p className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
              Tu registro ha sido completado correctamente. Redirigiendo...
            </p>
          </div>
        </CardHeader>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <CardHeader className={componentStyles.auth.loginHeader}>
        {/* 1. Logo con efecto visual mejorado */}
        <div className={componentStyles.auth.loginLogoContainer}>
          <div
            className={componentStyles.auth.loginLogoWrapper}
            style={{
              background: 'transparent',
            }}
          >
            <img src={logoLTS} alt={appName} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* 2. Título App */}
        <div className={componentStyles.auth.loginTitleContainer}>
          <CardTitle
            className={`${componentStyles.typography.pageTitle} text-center`}
            style={{ color: 'var(--color-text-primary)' }}
          >
            {appName}
          </CardTitle>
        </div>

        {/* 3. Separador decorativo */}
        <div className={componentStyles.auth.loginDivider}>
          <div
            className={componentStyles.auth.loginDividerLine}
            style={{ background: primaryColor }}
          />
          <Music
            className={componentStyles.auth.loginDividerIcon}
            style={{ color: primaryColor, opacity: 0.8 }}
          />
          <div
            className={componentStyles.auth.loginDividerLine}
            style={{ background: primaryColor }}
          />
        </div>

        {/* 4. Título de la página */}
        <div className="mt-4 text-center space-y-2">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Completa tu registro</h2>
          <p
            className="text-base text-center"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Completa tu información para finalizar tu registro
          </p>
        </div>
      </CardHeader>

      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className={componentStyles.auth.loginForm}>
          {/* Email (solo lectura) */}
          <div className={componentStyles.form.field}>
            <Label htmlFor="email" className={componentStyles.form.fieldLabel}>
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className={`${componentStyles.controls.inputDefault} w-full bg-ui/5`}
              />
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-ui/40" />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Este es el email con el que fuiste invitado</p>
          </div>

          {/* Nombre completo */}
          <div className={componentStyles.form.field}>
            <Label htmlFor="fullName" className={componentStyles.form.fieldLabel}>
              Nombre completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Nombre Apellido"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.full_name) {
                  validateField('full_name', e.target.value);
                }
              }}
              onBlur={() => validateField('full_name', fullName)}
              required
              disabled={isLoading}
              autoComplete="name"
              className={`${componentStyles.controls.inputDefault} w-full ${errors.full_name ? 'border-red-500' : ''}`}
            />
            {errors.full_name && (
              <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>
            )}
          </div>

          {/* Contraseña */}
          <div className={componentStyles.form.field}>
            <Label htmlFor="password" className={componentStyles.form.fieldLabel}>
              Contraseña <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  validateField('password', e.target.value);
                }
                // Validar confirmación también si ya tiene valor
                if (confirmPassword) {
                  validateField('confirmPassword', confirmPassword);
                }
              }}
              onBlur={() => validateField('password', password)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              className={`${componentStyles.controls.inputDefault} w-full ${errors.password ? 'border-red-500' : ''}`}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Mínimo 8 caracteres, incluyendo mayúscula, minúscula y número</p>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div className={componentStyles.form.field}>
            <Label htmlFor="confirmPassword" className={componentStyles.form.fieldLabel}>
              Confirmar contraseña <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  validateField('confirmPassword', e.target.value);
                }
              }}
              onBlur={() => validateField('confirmPassword', confirmPassword)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              className={`${componentStyles.controls.inputDefault} w-full ${errors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            className={`${componentStyles.buttons.primary} w-full mt-6`}
            loading={isLoading}
            loadingText="Completando registro..."
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Completar registro
          </Button>
        </form>

        {/* Footer decorativo */}
        <div className={componentStyles.auth.loginFooter}>
          <div className={componentStyles.auth.loginFooterLinks}>
            <button
              onClick={() => setActiveMode(activeMode === 'dark' ? 'light' : 'dark')}
              className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Toggle theme"
            >
              {activeMode === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <span className="opacity-40">•</span>
            <span>{appName} © {new Date().getFullYear()}</span>
            <span className="opacity-40">-</span>
            <a
              href="https://latrompetasonara.com"
              target="_blank"
              rel="noreferrer"
              className={componentStyles.auth.loginFooterLink}
            >
              La Trompeta Sonará
            </a>
            <span className="opacity-40">•</span>
            <a
              href="https://www.instagram.com/latrompetasonara"
              target="_blank"
              rel="noreferrer"
              className={componentStyles.auth.loginFooterLink}
            >
              Instagram
            </a>
          </div>
        </div>
      </CardContent>
    </PageLayout>
  );
}


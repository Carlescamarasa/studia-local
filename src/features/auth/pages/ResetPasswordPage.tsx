import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { useDesign } from '@/features/design/components/DesignProvider';
import { toast } from 'sonner';
import { Lock, CheckCircle, Music, Sun, Moon } from 'lucide-react';
import logoLTS from '@/assets/Logo_LTS.svg';
import { getAppName } from '@/features/shared/utils/appMeta';
import { log } from '@/utils/log';
import { createPageUrl } from '@/utils';
import { roleHome } from '@/features/auth/components/roleMap';
import { validatePasswordStrength } from './utils/validation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, appRole } = useAuth();
  const appName = getAppName();
  const { design, activeMode, setActiveMode } = useDesign();
  const primaryColor = design?.colors?.primary || '#fd9840';

  useEffect(() => {
    // Esperar a que termine de cargar la autenticación
    if (authLoading) return;

    // Si el usuario está autenticado, permitir acceso sin hash
    // (para cambiar contraseña desde el perfil o cuando ya está logueado)
    if (user) {
      return; // Permitir acceso
    }

    // Si no está autenticado, verificar si hay token de recuperación
    const hash = window.location.hash;
    const hasHash = hash && hash.length > 1; // Hash existe y no está vacío

    // Si hay hash, Supabase está procesando el token de recuperación
    // NO redirigir - Supabase procesará el token automáticamente
    // El AuthProvider detectará el cambio y actualizará el estado
    if (hasHash) {
      // Verificar también si hay sesión (Supabase puede haber procesado el token ya)
      supabase.auth.getSession().then(({ data: { session } }) => {
        // Si hay sesión, no hacer nada - el componente se actualizará
        // Si no hay sesión, el token se está procesando, esperar
      });
      return; // No redirigir si hay hash
    }

    // Si NO hay hash, verificar si hay sesión (puede que Supabase ya procesó el token)
    // Esperar un momento para dar tiempo a que cualquier proceso termine
    const errorTimer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Si hay sesión, no redirigir - el usuario se actualizará pronto
      if (!session && !user) {
        // No hay sesión ni usuario ni hash - el enlace es inválido
        toast.error('Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.');
        setTimeout(() => navigate('/login'), 3000);
      }
    }, 2000);

    return () => clearTimeout(errorTimer);
  }, [navigate, user, authLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error('Por favor, introduce una nueva contraseña.');
      return;
    }

    // Validar fortaleza de contraseña
    const passwordValidation = validatePasswordStrength(password);

    if (!passwordValidation.valid) {
      // Mostrar el primer error o todos si son pocos
      const errorMessage = passwordValidation.errors.length === 1
        ? passwordValidation.errors[0]
        : passwordValidation.errors.join('. ');
      toast.error(errorMessage);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast.success('Contraseña actualizada correctamente');

      // Redirigir según el estado de autenticación
      setTimeout(() => {
        if (user) {
          // Si el usuario está autenticado, redirigir a su página de inicio según su rol
          const targetPage = roleHome[appRole] || roleHome.ESTU;
          const pageName = targetPage.replace(/^\//, '');
          navigate(createPageUrl(pageName), { replace: true });
        } else {
          // Si no está autenticado (vino desde email de recuperación), redirigir a login
          navigate('/login', { replace: true });
        }
      }, 2000);
    } catch (error) {
      log.error('Error al actualizar contraseña:', error);
      const errorMessage = error.message?.toLowerCase() || '';

      if (errorMessage.includes('session') || errorMessage.includes('token')) {
        toast.error('El enlace ha expirado. Solicita un nuevo enlace de recuperación.');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        toast.error('Error al actualizar la contraseña. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const PageLayout = ({ children }) => (
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
            <CardTitle className="text-center" style={{ color: 'var(--color-text-primary)' }}>Contraseña actualizada</CardTitle>
            <p className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
              Tu contraseña ha sido actualizada correctamente. Redirigiendo al inicio de sesión...
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
            <img
              src={logoLTS}
              alt={appName}
              className="w-full h-full object-contain"
            />
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
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Restablecer contraseña</h2>
          <p
            className="text-base text-center"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Introduce tu nueva contraseña
          </p>
        </div>
      </CardHeader>

      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className={componentStyles.auth.loginForm}>
          <div className={componentStyles.form.field}>
            <Label htmlFor="password" className={componentStyles.form.fieldLabel}>
              Nueva contraseña
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              className={`${componentStyles.controls.inputDefault} w-full`}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Mínimo 8 caracteres, incluyendo mayúscula, minúscula y número</p>
          </div>

          <div className={componentStyles.form.field}>
            <Label htmlFor="confirmPassword" className={componentStyles.form.fieldLabel}>
              Confirmar contraseña
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              className={`${componentStyles.controls.inputDefault} w-full`}
            />
          </div>

          <Button
            type="submit"
            className={`${componentStyles.buttons.primary} w-full mt-6`}
            loading={isLoading}
            loadingText="Actualizando..."
          >
            <Lock className="w-5 h-5 mr-2" />
            Actualizar contraseña
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


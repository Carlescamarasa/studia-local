import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { useDesign } from '@/features/design/components/DesignProvider';
import { toast } from 'sonner';
import { Music, Sun, Moon } from 'lucide-react';
import logoLTS from '@/assets/Logo_LTS.svg';
import { getAppName } from '@/features/shared/utils/appMeta';
import { LoginForm } from '../components/LoginForm';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { useRateLimit } from '../hooks/useRateLimit';
import { useAuthErrors } from '../hooks/useAuthErrors';
import { authConfig } from '../config/authConfig';
import { authMessages } from '../config/authMessages';

const REMEMBER_EMAIL_KEY = 'studia_remember_email';
const REMEMBER_EMAIL_ENABLED_KEY = 'studia_remember_email_enabled';

export default function LoginPage() {
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const appName = getAppName();
  const { design, activeMode, setActiveMode } = useDesign();
  const rateLimit = useRateLimit();
  const { getLoginErrorMessage, getForgotPasswordErrorMessage } = useAuthErrors();

  // Cargar email guardado al montar el componente
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    const rememberEnabled = localStorage.getItem(REMEMBER_EMAIL_ENABLED_KEY) === 'true';

    if (rememberEnabled && saved) {
      setSavedEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (email: string, password: string) => {
    if (rateLimit.isLocked) {
      toast.error(authMessages.rateLimit.locked.replace('{minutes}', String(rateLimit.getRemainingTime())));
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password);

      // Guardar o eliminar email según el checkbox
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        localStorage.setItem(REMEMBER_EMAIL_ENABLED_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_EMAIL_ENABLED_KEY);
      }

      // Resetear intentos fallidos en caso de éxito
      rateLimit.resetAttempts();

      if (authConfig.ux.showSuccessToast) {
        toast.success(authMessages.login.success);
      }

      // Redirigir con delay opcional
      setTimeout(() => {
        navigate('/', { replace: true });
      }, authConfig.ux.redirectDelay);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      const errorMessage = getLoginErrorMessage(error);
      toast.error(errorMessage);

      // Registrar intento fallido
      rateLimit.recordFailedAttempt();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setIsResetting(true);

    try {
      await resetPassword(email);
      toast.success(authMessages.forgotPassword.success);
      setShowForgotPassword(false);
    } catch (error) {
      console.error('Error al enviar email de recuperación:', error);
      const errorMessage = getForgotPasswordErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  // Color primario del diseño actual
  const primaryColor = design?.colors?.primary || '#fd9840';

  return (
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

            {/* 2. Título */}
            <div className={componentStyles.auth.loginTitleContainer}>
              <CardTitle
                className={`${componentStyles.typography.pageTitle} text-center`}
                style={{ color: 'var(--color-text-primary)' }}
              >
                {appName}
              </CardTitle>
            </div>

            {/* 3. Slogan */}
            <p
              className={`${componentStyles.typography.pageSubtitle} text-center`}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cuando quieras, porque puedes.
            </p>

            {/* 4. Separador decorativo */}
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

            {/* 5. Mensaje de inicio de sesión */}
            <p
              className="text-base sm:text-base md:text-base text-ui/80 leading-relaxed font-base text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Inicia sesión para continuar
            </p>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {!showForgotPassword ? (
              <LoginForm
                onSubmit={handleLogin}
                isLoading={isLoading}
                rememberMe={rememberMe}
                onRememberMeChange={(checked) => setRememberMe(checked)}
                rateLimit={rateLimit}
                initialEmail={savedEmail}
                onForgotPassword={() => setShowForgotPassword(true)}
              />
            ) : (
              <ForgotPasswordForm
                onSubmit={handleForgotPassword}
                isLoading={isResetting}
                initialEmail={savedEmail}
                onBack={() => setShowForgotPassword(false)}
              />
            )}

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
        </Card>
      </div>
    </div>
  );
}


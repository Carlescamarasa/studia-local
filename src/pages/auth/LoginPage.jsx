import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { useDesign } from '@/components/design/DesignProvider';
import { toast } from 'sonner';
import { LogIn, Music, Mail, ArrowLeft } from 'lucide-react';
import logoLTS from '@/assets/Logo_LTS.png';
import { getAppName } from '@/components/utils/appMeta';

const REMEMBER_EMAIL_KEY = 'studia_remember_email';
const REMEMBER_EMAIL_ENABLED_KEY = 'studia_remember_email_enabled';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const appName = getAppName();
  const { design } = useDesign();

  // Cargar email guardado al montar el componente
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    const rememberEnabled = localStorage.getItem(REMEMBER_EMAIL_ENABLED_KEY) === 'true';
    
    if (rememberEnabled && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Validar formato de email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Obtener mensaje de error específico
  const getErrorMessage = (error) => {
    if (!error) return 'Error al iniciar sesión. Verifica tus credenciales.';
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status || '';
    
    // Email inválido
    if (errorMessage.includes('invalid email') || errorMessage.includes('email format')) {
      return 'El formato del email no es válido. Por favor, verifica tu dirección de correo.';
    }
    
    // Credenciales inválidas
    if (errorMessage.includes('invalid login credentials') || 
        errorMessage.includes('invalid credentials') ||
        errorCode === 'invalid_credentials' ||
        error.status === 400) {
      return 'Email o contraseña incorrectos. Verifica tus credenciales e intenta de nuevo.';
    }
    
    // Email no confirmado
    if (errorMessage.includes('email not confirmed') || 
        errorMessage.includes('email_not_confirmed')) {
      return 'Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.';
    }
    
    // Contraseña débil
    if (errorMessage.includes('password') && errorMessage.includes('weak')) {
      return 'La contraseña es demasiado débil. Por favor, usa una contraseña más segura.';
    }
    
    // Usuario no encontrado
    if (errorMessage.includes('user not found') || 
        errorMessage.includes('no user found')) {
      return 'No se encontró una cuenta con este email. Verifica tu dirección de correo.';
    }
    
    // Error de red/conexión
    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection')) {
      return 'Error de conexión. Por favor, verifica tu conexión a internet e intenta de nuevo.';
    }
    
    // Error genérico
    return error.message || 'Error al iniciar sesión. Verifica tus credenciales e intenta de nuevo.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar email
    if (!email.trim()) {
      toast.error('Por favor, introduce tu dirección de email.');
      return;
    }
    
    if (!validateEmail(email)) {
      toast.error('El formato del email no es válido. Por favor, verifica tu dirección de correo.');
      return;
    }
    
    // Validar contraseña
    if (!password.trim()) {
      toast.error('Por favor, introduce tu contraseña.');
      return;
    }
    
    setIsLoading(true);

    try {
      await signIn(email.trim(), password);
      
      // Guardar o eliminar email según el checkbox
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        localStorage.setItem(REMEMBER_EMAIL_ENABLED_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_EMAIL_ENABLED_KEY);
      }
      
      toast.success('Sesión iniciada correctamente');
      // Redirigir a la página principal - index.jsx se encargará de redirigir según el rol
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      toast.error('Por favor, introduce tu dirección de email.');
      return;
    }
    
    if (!validateEmail(resetEmail)) {
      toast.error('El formato del email no es válido.');
      return;
    }
    
    setIsResetting(true);
    
    try {
      await resetPassword(resetEmail.trim());
      toast.success('Se ha enviado un enlace de recuperación a tu email. Revisa tu bandeja de entrada.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      console.error('Error al enviar email de recuperación:', error);
      const errorMessage = error.message?.toLowerCase() || '';
      
      if (errorMessage.includes('user not found')) {
        toast.error('No se encontró una cuenta con este email.');
      } else if (errorMessage.includes('email')) {
        toast.error('Error al enviar el email. Verifica tu dirección de correo.');
      } else {
        toast.error('Error al enviar el email de recuperación. Intenta de nuevo más tarde.');
      }
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
                  background: `linear-gradient(135deg, ${primaryColor} 0%, var(--color-secondary) 100%)`,
                  boxShadow: `0 8px 24px ${primaryColor}40`,
                }}
              >
                <img 
                  src={logoLTS} 
                  alt={appName}
                  className="w-full h-full object-cover"
                />
                {/* Brillo decorativo */}
                <div 
                  className={componentStyles.auth.loginLogoShine}
                  style={{
                    background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
                  }}
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
              <>
                <form onSubmit={handleSubmit} className={componentStyles.auth.loginForm}>
                  {/* Campo Email */}
                  <div className={componentStyles.form.field}>
                    <Label 
                      htmlFor="email" 
                      className={componentStyles.form.fieldLabel}
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      className={`${componentStyles.controls.inputDefault} w-full`}
                    />
                  </div>

                  {/* Campo Contraseña */}
                  <div className={componentStyles.form.field}>
                    <Label 
                      htmlFor="password" 
                      className={componentStyles.form.fieldLabel}
                    >
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                      className={`${componentStyles.controls.inputDefault} w-full`}
                    />
                  </div>

                  {/* Checkbox Recordar inicio de sesión */}
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                      id="rememberMe"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked)}
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor="rememberMe"
                      className="cursor-pointer font-medium text-ui text-sm"
                    >
                      Recordar inicio de sesión
                    </Label>
                  </div>

                  {/* Botón de submit */}
                  <Button
                    type="submit"
                    className={`${componentStyles.buttons.primary} w-full mt-6`}
                    loading={isLoading}
                    loadingText="Iniciando sesión..."
                  >
                    <LogIn className="w-5 h-5 mr-2" />
                    Iniciar sesión
                  </Button>

                  {/* Enlace "Olvidé mi contraseña" */}
                  <div className="flex justify-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setResetEmail(email); // Pre-llenar con el email del login
                      }}
                      className="text-sm text-ui/60 hover:text-ui font-medium transition-colors"
                      disabled={isLoading}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className={componentStyles.auth.loginForm}>
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                    className="flex items-center text-sm text-ui/60 hover:text-ui transition-colors mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al inicio de sesión
                  </button>
                  
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Recuperar contraseña
                  </h3>
                  <p className="text-sm text-ui/60" style={{ color: 'var(--color-text-secondary)' }}>
                    Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword}>
                  <div className={componentStyles.form.field}>
                    <Label 
                      htmlFor="resetEmail" 
                      className={componentStyles.form.fieldLabel}
                    >
                      Email
                    </Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="tu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={isResetting}
                      autoComplete="email"
                      className={`${componentStyles.controls.inputDefault} w-full`}
                    />
                  </div>

                  <Button
                    type="submit"
                    className={`${componentStyles.buttons.primary} w-full mt-6`}
                    loading={isResetting}
                    loadingText="Enviando..."
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Enviar enlace de recuperación
                  </Button>
                </form>
              </div>
            )}

            {/* Footer decorativo */}
            <div className={componentStyles.auth.loginFooter}>
              <div className={componentStyles.auth.loginFooterLinks}>
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


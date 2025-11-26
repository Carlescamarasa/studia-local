import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { useDesign } from '@/components/design/DesignProvider';
import { toast } from 'sonner';
import { Lock, CheckCircle } from 'lucide-react';
import logoLTS from '@/assets/Logo_LTS.png';
import { getAppName } from '@/components/utils/appMeta';
import { log } from '@/utils/log';
import { createPageUrl } from '@/utils';
import { roleHome } from '@/components/auth/roleMap';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, appRole } = useAuth();
  const appName = getAppName();
  const { design } = useDesign();
  const primaryColor = design?.colors?.primary || '#fd9840';

  useEffect(() => {
    // Esperar a que termine de cargar la autenticación
    if (authLoading) return;

    // Si el usuario está autenticado, permitir acceso sin hash
    // (para cambiar contraseña desde el perfil o cuando ya está logueado)
    if (user) {
      return; // Permitir acceso
    }

    // Si no está autenticado, requiere el hash del email de recuperación
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
      toast.error('Enlace inválido o expirado. Solicita un nuevo enlace de recuperación.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [navigate, user, authLoading]);

  const validatePassword = (pwd) => {
    // Mínimo 6 caracteres (requisito de Supabase)
    return pwd.length >= 6;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error('Por favor, introduce una nueva contraseña.');
      return;
    }

    if (!validatePassword(password)) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
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

  if (isSuccess) {
    return (
      <div className={componentStyles.auth.loginPageContainer}>
        <div className={componentStyles.auth.loginCardContainer}>
          <Card className={`${componentStyles.containers.cardElevated} ${componentStyles.auth.loginCard}`}>
            <CardHeader className={componentStyles.auth.loginHeader}>
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle className="w-16 h-16" style={{ color: primaryColor }} />
                <CardTitle className="text-center">Contraseña actualizada</CardTitle>
                <p className="text-center text-ui/60">
                  Tu contraseña ha sido actualizada correctamente. Redirigiendo al inicio de sesión...
                </p>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={componentStyles.auth.loginPageContainer}>
      <div className={componentStyles.auth.loginCardContainer}>
        <Card className={`${componentStyles.containers.cardElevated} ${componentStyles.auth.loginCard}`}>
          <CardHeader className={componentStyles.auth.loginHeader}>
            <div className={componentStyles.auth.loginLogoContainer}>
              <div 
                className={componentStyles.auth.loginLogoWrapper}
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, var(--color-secondary) 100%)`,
                }}
              >
                <img src={logoLTS} alt={appName} className="w-full h-full object-cover" />
              </div>
            </div>
            <CardTitle className="text-center">Restablecer contraseña</CardTitle>
            <p className="text-center text-ui/60">
              Introduce tu nueva contraseña
            </p>
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
                <p className="text-xs text-ui/50 mt-1">Mínimo 6 caracteres</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


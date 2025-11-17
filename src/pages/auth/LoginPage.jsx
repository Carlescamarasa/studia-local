import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { useDesign } from '@/components/design/DesignProvider';
import { toast } from 'sonner';
import { LogIn, Mail, Lock, Music } from 'lucide-react';
import logoLTS from '@/assets/Logo_LTS.png';
import { getAppName } from '@/components/utils/appMeta';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const appName = getAppName();
  const { design } = useDesign();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      toast.success('Sesión iniciada correctamente');
      // Redirigir a la página principal (agenda es la home por defecto)
      navigate('/agenda', { replace: true });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      toast.error(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  // Color primario del diseño actual
  const primaryColor = design?.colors?.primary || '#fd9840';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 50%, var(--color-surface-elevated) 100%)`,
      }}
    >
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Círculos decorativos con gradiente primario */}
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
          }}
        />
        {/* Patrón de puntos sutiles */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, var(--color-text-primary) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 w-full max-w-md">
        <Card 
          className={`${componentStyles.containers.cardElevated} border-2 shadow-2xl backdrop-blur-sm`}
          style={{
            borderColor: 'var(--color-border-strong)',
            background: 'var(--color-surface-elevated)',
          }}
        >
          <CardHeader className="text-center space-y-6 pb-8 pt-8">
            {/* Logo con efecto visual mejorado */}
            <div className="flex justify-center">
              <div 
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden transition-transform hover:scale-105"
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
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
                  }}
                />
              </div>
            </div>

            {/* Título y subtítulo */}
            <div className="space-y-2">
              <CardTitle 
                className={`${componentStyles.typography.pageTitle} text-center`}
                style={{ color: 'var(--color-text-primary)' }}
              >
                {appName}
              </CardTitle>
              <p 
                className={`${componentStyles.typography.pageSubtitle} text-center`}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Inicia sesión para continuar
              </p>
            </div>

            {/* Indicador decorativo */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div 
                className="h-1 w-12 rounded-full"
                style={{ background: primaryColor }}
              />
              <Music 
                className="w-5 h-5"
                style={{ color: primaryColor, opacity: 0.8 }}
              />
              <div 
                className="h-1 w-12 rounded-full"
                style={{ background: primaryColor }}
              />
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo Email */}
              <div className={componentStyles.form.field}>
                <Label 
                  htmlFor="email" 
                  className={`${componentStyles.form.fieldLabel} flex items-center gap-2`}
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <Mail className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
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
                  className="w-full"
                />
              </div>

              {/* Campo Contraseña */}
              <div className={componentStyles.form.field}>
                <Label 
                  htmlFor="password" 
                  className={`${componentStyles.form.fieldLabel} flex items-center gap-2`}
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <Lock className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
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
                  className="w-full"
                />
              </div>

              {/* Botón de submit */}
              <Button
                type="submit"
                className={`${componentStyles.buttons.primary} w-full mt-6`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div 
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" 
                    />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Iniciar sesión
                  </>
                )}
              </Button>
            </form>

            {/* Footer decorativo */}
            <div className="mt-8 pt-6 border-t border-[var(--color-border-default)] text-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <span>{appName} © {new Date().getFullYear()}</span>
                <span className="opacity-40">-</span>
                <a
                  href="https://latrompetasonara.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-text-primary)] hover:underline transition-colors"
                >
                  La Trompeta Sonará
                </a>
                <span className="opacity-40">•</span>
                <a
                  href="https://www.instagram.com/latrompetasonara"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-text-primary)] hover:underline transition-colors"
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


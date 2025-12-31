// src/pages/local.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalData } from '@/local-data/LocalDataProvider';
import { getCurrentUser, setCurrentUser } from '@/api/localDataClient';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/components/ds';
import { Button } from '@/features/shared/components/ds/Button';
import { Users, PlayCircle, Calendar, Target, Activity, RefreshCw, Database } from 'lucide-react';
import { rebuildAllLocalData, rebuildLocalData } from '@/local-data/rebuildLocalData';
import { printValidationReport } from '@/local-data/verifyLocalData';
import { toast } from 'sonner';
import { displayName } from '@/features/shared/utils/helpers';
import { PageHeader } from '@/features/shared/components/ds/PageHeader';
import { componentStyles } from '@/design/componentStyles';
import { UserRole } from '@/features/shared/types/domain';

export default function LocalPage() {
  const navigate = useNavigate();
  const { usuarios } = useLocalData();
  const currentUser = getCurrentUser();
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  // Solo mostrar en desarrollo
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentUser(userId);
    window.location.reload(); // Recargar para actualizar estado global
  };

  const handleRegenerateData = async () => {
    if (!window.confirm('¿Regenerar todos los datos locales? Esto reemplazará los datos existentes.')) {
      return;
    }

    setIsRegenerating(true);
    try {
      toast.info('🔄 Regenerando datos locales...');
      const report = await rebuildAllLocalData({ numSemanas: 4, limpiarExistente: true });
      toast.success(`✅ Datos regenerados: ${report.stats.asignaciones} asignaciones, ${report.stats.sesiones} sesiones`);

      // Recargar la app después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('[local.jsx] Error regenerando datos:', {
        error: error?.message || error,
        code: error?.code,
      });
      toast.error(`❌ Error: ${error.message}`);
      setIsRegenerating(false);
    }
  };

  const handleValidateData = () => {
    setIsValidating(true);
    try {
      printValidationReport();
      toast.success('✅ Validación completada. Revisa la consola para ver el reporte.');
    } catch (error: any) {
      console.error('[local.jsx] Error validando datos:', {
        error: error?.message || error,
        code: error?.code,
      });
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRepairData = async () => {
    if (!window.confirm('¿Reparar datos locales existentes? Esto corregirá referencias rotas y normalizará valores numéricos.')) {
      return;
    }

    setIsRepairing(true);
    try {
      toast.info('🔧 Reparando datos locales...');
      const report = await rebuildLocalData();
      toast.success(`✅ Datos reparados: ${report.stats.asignaciones} asignaciones, ${report.stats.registrosSesion} sesiones`);

      // Recargar la app después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('[local.jsx] Error reparando datos:', {
        error: error?.message || error,
        code: error?.code,
      });
      toast.error(`❌ Error: ${error.message}`);
      setIsRepairing(false);
    }
  };

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    PROF: 'Profesor',
    ESTU: 'Estudiante',
  };

  const role = currentUser?.rolPersonalizado || 'ESTU';

  const navigationItems: Record<string, any[]> = {
    ADMIN: [
      { title: 'Usuarios', url: '/usuarios', icon: Users },
      { title: 'Asignaciones', url: '/asignaciones', icon: Target },
      { title: 'Agenda', url: '/agenda', icon: Calendar },
      { title: 'Estadísticas', url: '/estadisticas', icon: Activity },
    ],
    PROF: [
      { title: 'Mis Estudiantes', url: '/estudiantes', icon: Users },
      { title: 'Asignaciones', url: '/asignaciones', icon: Target },
      { title: 'Agenda', url: '/agenda', icon: Calendar },
      { title: 'Estadísticas', url: '/estadisticas', icon: Activity },
    ],
    ESTU: [
      { title: 'Studia ahora', url: '/hoy', icon: PlayCircle },
      { title: 'Mi Semana', url: '/semana', icon: Calendar },
      { title: 'Mis Estadísticas', url: '/estadisticas', icon: Activity },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <PageHeader
          title="Modo Local - Sin Autenticación"
          subtitle="Selecciona un usuario para trabajar en modo local"
        />

        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle>Seleccionar Usuario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className={`${componentStyles.typography.sectionTitle} mb-2 block`}>
                Seleccionar Usuario:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handleUserChange(e.target.value)}
                className={`w-full ${componentStyles.controls.selectDefault}`}
              >
                {usuarios.map((user) => (
                  <option key={user.id} value={user.id}>
                    {displayName(user)} ({roleLabel[user.rolPersonalizado]})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-[var(--color-border-default)]">
              <p className={`${componentStyles.typography.smallMetaText} mb-4`}>
                Usuario actual: <strong>{displayName(currentUser)}</strong> ({roleLabel[role]})
              </p>
            </div>

            {isDev && (
              <div className="pt-4 border-t border-[var(--color-border-default)] space-y-3">
                <p className={componentStyles.typography.sectionTitle}>🔧 Herramientas de Desarrollo</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleRepairData}
                    loading={isRepairing}
                    loadingText="Reparando..."
                    variant="outline"
                    className={componentStyles.buttons.outline}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reparar Datos
                  </Button>
                  <Button
                    onClick={handleRegenerateData}
                    loading={isRegenerating}
                    loadingText="Regenerando..."
                    variant="outline"
                    className={componentStyles.buttons.outline}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Regenerar Datos Locales
                  </Button>
                  <Button
                    onClick={handleValidateData}
                    loading={isValidating}
                    loadingText="Validando..."
                    variant="outline"
                    className={componentStyles.buttons.outline}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Validar Datos
                  </Button>
                </div>
                <p className={componentStyles.typography.smallMetaText}>
                  Estas herramientas solo están disponibles en modo desarrollo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className={componentStyles.layout.grid2}>
          {navigationItems[role]?.map((item) => (
            <Card
              key={item.url}
              className={`${componentStyles.items.itemCard} cursor-pointer hover:shadow-lg transition-shadow`}
              onClick={() => navigate(createPageUrl(item.url.split('/').pop()))}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[hsl(var(--brand-100))] rounded-xl flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-[hsl(var(--brand-600))]" />
                  </div>
                  <div>
                    <h3 className={componentStyles.typography.cardTitle}>{item.title}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


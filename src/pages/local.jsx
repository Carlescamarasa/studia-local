// src/pages/local.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalData } from '@/local-data/LocalDataProvider';
import { getCurrentUser, setCurrentUser } from '@/api/localDataClient';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ds';
import { Button } from '@/components/ds/Button';
import { Users, PlayCircle, Calendar, Target, Activity, RefreshCw, Database } from 'lucide-react';
import { rebuildAllLocalData, rebuildLocalData } from '@/local-data/rebuildLocalData';
import { printValidationReport } from '@/local-data/verifyLocalData';
import { toast } from 'sonner';
import { displayName } from '@/components/utils/helpers';

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

  const handleUserChange = (userId) => {
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
    } catch (error) {
      console.error('Error regenerando datos:', error);
      toast.error(`❌ Error: ${error.message}`);
      setIsRegenerating(false);
    }
  };

  const handleValidateData = () => {
    setIsValidating(true);
    try {
      printValidationReport();
      toast.success('✅ Validación completada. Revisa la consola para ver el reporte.');
    } catch (error) {
      console.error('Error validando datos:', error);
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
    } catch (error) {
      console.error('Error reparando datos:', error);
      toast.error(`❌ Error: ${error.message}`);
      setIsRepairing(false);
    }
  };

  const roleLabel = {
    ADMIN: 'Administrador',
    PROF: 'Profesor',
    ESTU: 'Estudiante',
  };

  const role = currentUser?.rolPersonalizado || 'ESTU';

  const navigationItems = {
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
      { title: 'Estudiar Ahora', url: '/hoy', icon: PlayCircle },
      { title: 'Mi Semana', url: '/semana', icon: Calendar },
      { title: 'Mis Estadísticas', url: '/estadisticas', icon: Activity },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Modo Local - Sin Autenticación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-ui mb-2 block">
                Seleccionar Usuario:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full p-2 border rounded-lg bg-card text-ui"
              >
                {usuarios.map((user) => (
                  <option key={user.id} value={user.id}>
                    {displayName(user)} ({roleLabel[user.rolPersonalizado]})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted mb-4">
                Usuario actual: <strong>{displayName(currentUser)}</strong> ({roleLabel[role]})
              </p>
            </div>

            {isDev && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm font-medium text-ui">🔧 Herramientas de Desarrollo</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleRepairData}
                    disabled={isRepairing}
                    variant="outline"
                    className="h-9 rounded-xl"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRepairing ? 'animate-spin' : ''}`} />
                    {isRepairing ? 'Reparando...' : 'Reparar Datos'}
                  </Button>
                  <Button
                    onClick={handleRegenerateData}
                    disabled={isRegenerating}
                    variant="outline"
                    className="h-9 rounded-xl"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {isRegenerating ? 'Regenerando...' : 'Regenerar Datos Locales'}
                  </Button>
                  <Button
                    onClick={handleValidateData}
                    disabled={isValidating}
                    variant="outline"
                    className="h-9 rounded-xl"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
                    {isValidating ? 'Validando...' : 'Validar Datos'}
                  </Button>
                </div>
                <p className="text-xs text-muted">
                  Estas herramientas solo están disponibles en modo desarrollo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {navigationItems[role]?.map((item) => (
            <Card
              key={item.url}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(createPageUrl(item.url.split('/').pop()))}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-ui">{item.title}</h3>
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


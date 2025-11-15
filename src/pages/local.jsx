// src/pages/local.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalData } from '@/local-data/LocalDataProvider';
import { getCurrentUser, setCurrentUser } from '@/api/localDataClient';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ds';
import { Button } from '@/components/ds/Button';
import { Users, PlayCircle, Calendar, Target, Activity } from 'lucide-react';

export default function LocalPage() {
  const navigate = useNavigate();
  const { usuarios } = useLocalData();
  const currentUser = getCurrentUser();
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id);

  const handleUserChange = (userId) => {
    setSelectedUserId(userId);
    setCurrentUser(userId);
    window.location.reload(); // Recargar para actualizar estado global
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
                    {user.nombreCompleto || user.full_name} ({roleLabel[user.rolPersonalizado]})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted mb-4">
                Usuario actual: <strong>{currentUser?.nombreCompleto || currentUser?.full_name}</strong> ({roleLabel[role]})
              </p>
            </div>
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


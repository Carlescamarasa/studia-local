import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/localDataClient";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, X, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RequireRole from "@/components/auth/RequireRole";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { getNombreVisible } from "../components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/ds/PageHeader";

function UsuariosPageContent() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [profesorFilter, setProfesorFilter] = useState('all');

  const currentUser = getCurrentUser();

  const { data: usuarios = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const exportarCSV = () => {
    const headers = ['Nombre', 'Email', 'Rol', 'Profesor Asignado'];
    const rows = usuariosFiltrados.map(u => {
      const profe = usuarios.find(p => p.id === u.profesorAsignadoId);
      return [
        getNombreVisible(u),
        u.email,
        roleLabels[u.rolPersonalizado] || 'Estudiante',
        profe ? getNombreVisible(profe) : '',
      ];
    });

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const simularUsuario = (usuario) => {
    const actualUser = currentUser;
    sessionStorage.setItem('originalUser', JSON.stringify(actualUser));
    sessionStorage.setItem('simulatingUser', JSON.stringify(usuario));
    sessionStorage.setItem('originalPath', window.location.pathname);

    const rolePages = {
      ADMIN: 'usuarios',
      PROF: 'agenda',
      ESTU: 'hoy',
    };
    const targetPage = rolePages[usuario.rolPersonalizado] || 'hoy';
    navigate(createPageUrl(targetPage), { replace: true });
    window.location.reload();
  };

  let usuariosFiltrados = usuarios;

  if (roleFilter !== 'all') {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.rolPersonalizado === roleFilter);
  }

  if (profesorFilter !== 'all') {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.profesorAsignadoId === profesorFilter);
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    usuariosFiltrados = usuariosFiltrados.filter(u => {
      const nombre = getNombreVisible(u).toLowerCase();
      const email = (u.email || '').toLowerCase();
      return nombre.includes(term) || email.includes(term);
    });
  }

  const profesores = usuarios.filter(u => u.rolPersonalizado === 'PROF');

  const roleLabels = {
    ADMIN: 'Administrador',
    PROF: 'Profesor',
    ESTU: 'Estudiante',
  };

  const roleVariants = {
    ADMIN: 'danger',
    PROF: 'info',
    ESTU: 'success',
  };

  const columns = [
    {
      key: 'nombre',
      label: 'Usuario',
      render: (u) => (
        <div>
          <p className="font-medium text-sm">{getNombreVisible(u)}</p>
          <p className="text-xs text-muted">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'rol',
      label: 'Rol',
      render: (u) => (
        <Badge variant={roleVariants[u.rolPersonalizado] || roleVariants.ESTU}>
          {roleLabels[u.rolPersonalizado] || 'Estudiante'}
        </Badge>
      ),
    },
    {
      key: 'profesor',
      label: 'Profesor',
      render: (u) => {
        const profe = usuarios.find(p => p.id === u.profesorAsignadoId);
        return profe ? (
          <p className="text-sm">{getNombreVisible(profe)}</p>
        ) : (
          <span className="text-xs text-muted">-</span>
        );
      },
    },
  ];

  const isAdminOrProf = currentUser?.rolPersonalizado === 'ADMIN' || currentUser?.rolPersonalizado === 'PROF';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Users}
        title="Usuarios"
        subtitle="Gestiona usuarios del sistema"
        filters={
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <Input
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 h-10 focus-brand"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ui"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 h-10">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="ADMIN">Administradores</SelectItem>
                <SelectItem value="PROF">Profesores</SelectItem>
                <SelectItem value="ESTU">Estudiantes</SelectItem>
              </SelectContent>
            </Select>

            {roleFilter === 'ESTU' && profesores.length > 0 && (
              <Select value={profesorFilter} onValueChange={setProfesorFilter}>
                <SelectTrigger className="w-48 h-10">
                  <SelectValue placeholder="Profesor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los profesores</SelectItem>
                  {profesores.map(p => (
                    <SelectItem key={p.id} value={p.id}>{getNombreVisible(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              onClick={exportarCSV}
              className="btn-secondary h-10"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:px-8">
        <Card className="app-card">
          <CardHeader>
            <CardTitle className="text-lg">{usuariosFiltrados.length} usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedTable
              columns={columns}
              data={usuariosFiltrados}
              getRowActions={(u) => [
                {
                  id: 'view',
                  label: 'Ver perfil',
                  onClick: () => navigate(createPageUrl(`perfil?userId=${u.id}`)),
                },
                {
                  id: 'edit',
                  label: 'Editar perfil',
                  onClick: () => navigate(createPageUrl(`perfil?userId=${u.id}`)),
                },
                ...(isAdminOrProf && u.id !== currentUser?.id ? [{
                  id: 'impersonate',
                  label: 'Ver como usuario',
                  onClick: () => simularUsuario(u),
                }] : []),
              ]}
              onRowClick={(u) => navigate(createPageUrl(`perfil?userId=${u.id}`))}
              emptyMessage="No hay usuarios"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <RequireRole anyOf={['ADMIN']}>
      <UsuariosPageContent />
    </RequireRole>
  );
}
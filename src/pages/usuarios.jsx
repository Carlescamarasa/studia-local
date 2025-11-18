import React, { useState, useEffect } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, X, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RequireRole from "@/components/auth/RequireRole";
import UnifiedTable from "@/components/tables/UnifiedTable";
import { getNombreVisible, useEffectiveUser } from "../components/utils/helpers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import PerfilModal from "@/components/common/PerfilModal";

function UsuariosPageContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [profesorFilter, setProfesorFilter] = useState('all');
  const [nivelFilter, setNivelFilter] = useState('all');
  const [profesorAsignadoFilter, setProfesorAsignadoFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isPerfilModalOpen, setIsPerfilModalOpen] = useState(false);

  const effectiveUser = useEffectiveUser();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const users = await localDataClient.entities.User.list();
      return users;
    },
    staleTime: 0, // No usar caché, siempre obtener datos frescos
    cacheTime: 0, // No mantener en caché
  });

  // Invalidar query al montar el componente para asegurar datos frescos
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

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

  let usuariosFiltrados = usuarios;

  if (roleFilter !== 'all') {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.rolPersonalizado === roleFilter);
  }

  if (profesorFilter !== 'all') {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.profesorAsignadoId === profesorFilter);
  }

  if (nivelFilter !== 'all') {
    usuariosFiltrados = usuariosFiltrados.filter(u => u.nivel === nivelFilter);
  }

  if (profesorAsignadoFilter !== 'all') {
    if (profesorAsignadoFilter === 'with') {
      usuariosFiltrados = usuariosFiltrados.filter(u => u.profesorAsignadoId !== null && u.profesorAsignadoId !== undefined);
    } else if (profesorAsignadoFilter === 'without') {
      usuariosFiltrados = usuariosFiltrados.filter(u => !u.profesorAsignadoId);
    }
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
          {/* Priorizar nombreCompleto sobre full_name (que puede ser email en la BD) */}
          <p className="font-medium text-sm">{u.nombreCompleto || (u.full_name && !u.full_name.includes('@') ? u.full_name : null) || u.email}</p>
          <p className="text-xs text-ui/80">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'rol',
      label: 'Rol',
      render: (u) => {
        return (
          <Badge variant={roleVariants[u.rolPersonalizado] || roleVariants.ESTU}>
            {roleLabels[u.rolPersonalizado] || 'Estudiante'}
          </Badge>
        );
      },
    },
    {
      key: 'profesor',
      label: 'Profesor',
      render: (u) => {
        const profe = usuarios.find(p => p.id === u.profesorAsignadoId);
        return profe ? (
          <p className="text-sm">{getNombreVisible(profe)}</p>
        ) : (
          <span className="text-xs text-ui/80">-</span>
        );
      },
    },
  ];

  const isAdminOrProf = effectiveUser?.rolPersonalizado === 'ADMIN' || effectiveUser?.rolPersonalizado === 'PROF';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Users}
        title="Usuarios"
        subtitle="Gestiona usuarios del sistema"
        filters={
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui/80" />
              <Input
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-9 ${componentStyles.controls.inputDefault}`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ui/80 hover:text-ui"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className={`w-40 ${componentStyles.controls.selectDefault}`}>
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
                <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
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

            {roleFilter === 'ESTU' && (
              <Select value={nivelFilter} onValueChange={setNivelFilter}>
                <SelectTrigger className={`w-40 ${componentStyles.controls.selectDefault}`}>
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  <SelectItem value="principiante">Principiante</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzado">Avanzado</SelectItem>
                  <SelectItem value="profesional">Profesional</SelectItem>
                </SelectContent>
              </Select>
            )}

            {roleFilter === 'ESTU' && (
              <Select value={profesorAsignadoFilter} onValueChange={setProfesorAsignadoFilter}>
                <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                  <SelectValue placeholder="Profesor asignado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Con profesor</SelectItem>
                  <SelectItem value="without">Sin profesor</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      <div className={componentStyles.layout.page}>
        <Card className={componentStyles.containers.cardBase}>
          <CardHeader>
            <CardTitle className="text-lg">{usuariosFiltrados.length} usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedTable
              columns={columns}
              data={usuariosFiltrados}
              getRowActions={(u) => [
                {
                  id: 'edit',
                  label: 'Editar perfil',
                  onClick: () => {
                    setSelectedUserId(u.id);
                    setIsPerfilModalOpen(true);
                  },
                },
              ]}
              onRowClick={(u) => {
                setSelectedUserId(u.id);
                setIsPerfilModalOpen(true);
              }}
              emptyMessage="No hay usuarios"
              emptyIcon={Users}
            />
          </CardContent>
        </Card>
      </div>

      <PerfilModal
        open={isPerfilModalOpen}
        onOpenChange={(open) => {
          setIsPerfilModalOpen(open);
          if (!open) {
            setSelectedUserId(null);
          }
        }}
        userId={selectedUserId}
      />
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
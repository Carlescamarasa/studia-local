import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, Badge } from '@/components/ds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Bug, Search, Eye, CheckCircle, Clock, XCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import RequireRole from '@/components/auth/RequireRole';
import UnifiedTable from '@/components/tables/UnifiedTable';
import PageHeader from '@/components/ds/PageHeader';
import { componentStyles } from '@/design/componentStyles';
import { listErrorReports, updateErrorReport } from '@/api/errorReportsAPI';
import { useAuth } from '@/auth/AuthProvider';

const CATEGORY_LABELS = {
  algo_no_funciona: 'Algo no funciona',
  se_ve_mal: 'Se ve mal o confuso',
  no_encuentro: 'No encuentro lo que busco',
  sugerencia: 'Me gustaría que hubiera...',
  otro: 'Otro',
};

const STATUS_LABELS = {
  nuevo: 'Nuevo',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
};

const STATUS_VARIANTS = {
  nuevo: 'danger',
  en_revision: 'warning',
  resuelto: 'success',
};

const STATUS_ICONS = {
  nuevo: XCircle,
  en_revision: Clock,
  resuelto: CheckCircle,
};

function ReportesPageContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['error-reports', statusFilter, categoryFilter],
    queryFn: () => listErrorReports({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateErrorReport(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-reports'] });
      toast.success('Reporte actualizado correctamente');
      setIsDetailModalOpen(false);
      setSelectedReport(null);
    },
    onError: (error) => {
      console.error('[ReportesPage] Error actualizando reporte:', {
        error: error?.message || error,
        code: error?.code,
      });
      toast.error('Error al actualizar el reporte');
    },
  });

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setAdminNotes(report.adminNotes || '');
    setIsDetailModalOpen(true);
  };

  const handleUpdateStatus = (status) => {
    if (!selectedReport) return;

    updateMutation.mutate({
      id: selectedReport.id,
      updates: {
        status,
        resolvedBy: status === 'resuelto' ? user?.id || null : null,
        adminNotes: adminNotes || null,
      },
    });
  };

  let reportsFiltrados = reports;

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    reportsFiltrados = reportsFiltrados.filter(r => {
      const desc = (r.description || '').toLowerCase();
      const category = (CATEGORY_LABELS[r.category] || '').toLowerCase();
      return desc.includes(term) || category.includes(term);
    });
  }

  const columns = [
    {
      key: 'category',
      label: 'Categoría',
      render: (r) => (
        <Badge variant="info">
          {CATEGORY_LABELS[r.category] || r.category}
        </Badge>
      ),
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (r) => (
        <p className="text-sm line-clamp-2 max-w-md">
          {r.description}
        </p>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (r) => {
        const Icon = STATUS_ICONS[r.status];
        return (
          <Badge variant={STATUS_VARIANTS[r.status]}>
            <Icon className="w-3 h-3 mr-1 inline" />
            {STATUS_LABELS[r.status]}
          </Badge>
        );
      },
    },
    {
      key: 'screenshot',
      label: 'Captura',
      render: (r) => (
        r.screenshotUrl ? (
          <ImageIcon className="w-4 h-4 text-[var(--color-primary)]" />
        ) : (
          <span className="text-xs text-ui/60">-</span>
        )
      ),
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (r) => (
        <span className="text-xs text-ui/80">
          {new Date(r.createdAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewReport(r)}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes de errores"
        description="Gestiona los reportes de errores y sugerencias de los usuarios"
        icon={Bug}
      />

      <Card className={componentStyles.containers.cardBase}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ui/60" />
                <Input
                  placeholder="Buscar en descripciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="nuevo">Nuevo</SelectItem>
                <SelectItem value="en_revision">En revisión</SelectItem>
                <SelectItem value="resuelto">Resuelto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className={componentStyles.containers.cardBase}>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-ui/60">Cargando reportes...</div>
          ) : reportsFiltrados.length === 0 ? (
            <div className="text-center py-8 text-ui/60">No hay reportes que mostrar</div>
          ) : (
            <UnifiedTable
              data={reportsFiltrados}
              columns={columns}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del reporte</DialogTitle>
            <DialogDescription>
              Información completa del reporte y opciones de gestión
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-ui/60">Categoría</Label>
                  <p className="font-medium">{CATEGORY_LABELS[selectedReport.category] || selectedReport.category}</p>
                </div>
                <div>
                  <Label className="text-xs text-ui/60">Estado</Label>
                  <div>
                    <Badge variant={STATUS_VARIANTS[selectedReport.status]}>
                      {STATUS_LABELS[selectedReport.status]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-ui/60">Fecha de creación</Label>
                  <p className="text-sm">
                    {new Date(selectedReport.createdAt).toLocaleString('es-ES')}
                  </p>
                </div>
                {selectedReport.resolvedAt && (
                  <div>
                    <Label className="text-xs text-ui/60">Resuelto el</Label>
                    <p className="text-sm">
                      {new Date(selectedReport.resolvedAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-ui/60">Descripción</Label>
                <p className="text-sm whitespace-pre-wrap bg-[var(--color-surface-muted)] p-3 rounded-lg">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.screenshotUrl && (
                <div>
                  <Label className="text-xs text-ui/60">Captura de pantalla</Label>
                  <div className="mt-2 border rounded-lg p-2 bg-[var(--color-surface-muted)]">
                    <img
                      src={selectedReport.screenshotUrl}
                      alt="Captura de pantalla del reporte"
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                </div>
              )}

              {selectedReport.context && (
                <div>
                  <Label className="text-xs text-ui/60">Información técnica</Label>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-[var(--color-primary)] hover:underline">
                      Ver detalles técnicos
                    </summary>
                    <pre className="mt-2 text-xs bg-[var(--color-surface-muted)] p-3 rounded-lg overflow-auto max-h-40">
                      {JSON.stringify(selectedReport.context, null, 2)}
                    </pre>
                  </details>
                </div>
              )}

              <div>
                <Label htmlFor="adminNotes">Notas del administrador</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Añade notas internas sobre este reporte..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('nuevo')}
                  disabled={updateMutation.isPending || selectedReport.status === 'nuevo'}
                  className={componentStyles.buttons.outline}
                >
                  Marcar como nuevo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('en_revision')}
                  disabled={updateMutation.isPending || selectedReport.status === 'en_revision'}
                  className={componentStyles.buttons.outline}
                >
                  En revisión
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('resuelto')}
                  disabled={updateMutation.isPending || selectedReport.status === 'resuelto'}
                  className={`${componentStyles.buttons.primary} gap-2`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Marcar como resuelto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReportesPage() {
  return (
    <RequireRole anyOf={['ADMIN']}>
      <ReportesPageContent />
    </RequireRole>
  );
}

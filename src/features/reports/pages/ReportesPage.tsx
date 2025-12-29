import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Badge } from '@/features/shared/components/ds'; // Assuming simple exports, might need adjustment if they are default
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/components/ui/select';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { Label } from '@/features/shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/shared/components/ui/dialog';
import { Bug, Clock, CheckCircle, XCircle, Search, Eye, Trash2, CheckSquare, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import RequireRole from '@/features/auth/components/RequireRole';
import UnifiedTable from '@/features/shared/components/tables/UnifiedTable';
import { PageHeader } from '@/features/shared/components/ds/PageHeader';
import { componentStyles } from '@/design/componentStyles';
import { listErrorReports, updateErrorReport, updateMultipleErrorReports, deleteErrorReport, deleteMultipleErrorReports } from '@/api/errorReportsAPI';
import { useAuth } from '@/auth/AuthProvider';
import AudioPlayer from '@/features/shared/components/media/AudioPlayer';

interface ErrorReport {
    id: string;
    category: string;
    description: string;
    status: 'nuevo' | 'en_revision' | 'resuelto';
    screenshotUrl?: string;
    audioUrl?: string;
    createdAt: string;
    createdByName?: string;
    resolvedAt?: string;
    resolvedBy?: string;
    adminNotes?: string;
    context?: Record<string, any>;
}

const CATEGORY_LABELS: Record<string, string> = {
    algo_no_funciona: 'Algo no funciona',
    se_ve_mal: 'Se ve mal o confuso',
    no_encuentro: 'No encuentro lo que busco',
    sugerencia: 'Me gustaría que hubiera',
    otro: 'Otro',
};

const CATEGORY_VARIANTS: Record<string, "danger" | "warning" | "info" | "success" | "outline"> = {
    algo_no_funciona: 'danger',
    se_ve_mal: 'warning',
    no_encuentro: 'info',
    sugerencia: 'success',
    otro: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
    nuevo: 'Nuevo',
    en_revision: 'En proceso',
    resuelto: 'Resuelto',
};

const STATUS_VARIANTS: Record<string, "danger" | "warning" | "success"> = {
    nuevo: 'danger',
    en_revision: 'warning',
    resuelto: 'success',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
    nuevo: XCircle,
    en_revision: Clock,
    resuelto: CheckCircle,
};

function ReportesPageContent() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('active');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');

    const { data: reports = [], isLoading } = useQuery<ErrorReport[]>({
        queryKey: ['error-reports', statusFilter, categoryFilter],
        queryFn: async () => {
            let fetchedReports: ErrorReport[] = [];
            if (statusFilter === 'active') {
                const result = await listErrorReports({
                    category: categoryFilter !== 'all' ? categoryFilter : undefined,
                });
                fetchedReports = (result as ErrorReport[]).filter(r => r.status !== 'resuelto');
            } else if (statusFilter === 'all') {
                const result = await listErrorReports({
                    category: categoryFilter !== 'all' ? categoryFilter : undefined,
                });
                fetchedReports = result as ErrorReport[];
            } else {
                const result = await listErrorReports({
                    status: statusFilter,
                    category: categoryFilter !== 'all' ? categoryFilter : undefined,
                });
                fetchedReports = result as ErrorReport[];
            }
            return fetchedReports;
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<ErrorReport> }) => updateErrorReport(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['error-reports'] });
            toast.success('Reporte actualizado correctamente');
            setIsDetailModalOpen(false);
            setSelectedReport(null);
        },
        onError: (error: any) => {
            console.error('[ReportesPage] Error actualizando reporte:', {
                error: error?.message || error,
                code: error?.code,
            });
            toast.error('Error al actualizar el reporte');
        },
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<ErrorReport> }) => updateMultipleErrorReports(ids, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['error-reports'] });
            toast.success(`${variables.ids.length} reporte(s) actualizado(s) correctamente`);
        },
        onError: (error: any) => {
            console.error('[ReportesPage] Error actualizando reportes:', {
                error: error?.message || error,
                code: error?.code,
            });
            toast.error('Error al actualizar los reportes');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteErrorReport(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['error-reports'] });
            toast.success('Reporte eliminado correctamente');
            setIsDetailModalOpen(false);
            setSelectedReport(null);
        },
        onError: (error: any) => {
            console.error('[ReportesPage] Error eliminando reporte:', {
                error: error?.message || error,
                code: error?.code,
                status: error?.status,
                details: error?.details,
            });

            if (error?.code === '42501' || error?.message?.includes('row-level security')) {
                toast.error('❌ Error de permisos: No tienes permiso para eliminar reportes. Verifica que seas administrador.');
            } else if (error?.code === 'PGRST301' || error?.message?.includes('permission denied')) {
                toast.error('❌ Permiso denegado: No tienes permisos para realizar esta acción.');
            } else {
                toast.error(`❌ Error al eliminar el reporte: ${error?.message || 'Error desconocido'}`);
            }
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: string[]) => deleteMultipleErrorReports(ids),
        onSuccess: (_, ids) => {
            queryClient.invalidateQueries({ queryKey: ['error-reports'] });
            toast.success(`${ids.length} reporte(s) eliminado(s) correctamente`);
        },
        onError: (error: any) => {
            console.error('[ReportesPage] Error eliminando reportes:', {
                error: error?.message || error,
                code: error?.code,
                status: error?.status,
                details: error?.details,
            });

            if (error?.code === '42501' || error?.message?.includes('row-level security')) {
                toast.error('❌ Error de permisos: No tienes permiso para eliminar reportes. Verifica que seas administrador.');
            } else if (error?.code === 'PGRST301' || error?.message?.includes('permission denied')) {
                toast.error('❌ Permiso denegado: No tienes permisos para realizar esta acción.');
            } else {
                toast.error(`❌ Error al eliminar los reportes: ${error?.message || 'Error desconocido'}`);
            }
        },
    });

    const handleBulkUpdateStatus = (status: ErrorReport['status']) => {
        return (selectedIds: string[]) => {
            bulkUpdateMutation.mutate({
                ids: selectedIds,
                updates: {
                    status,
                    resolvedBy: status === 'resuelto' ? (user as any)?.id : undefined,
                },
            });
        };
    };

    const handleViewReport = (report: ErrorReport) => {
        setSelectedReport(report);
        setAdminNotes(report.adminNotes || '');
        setIsDetailModalOpen(true);
    };

    const handleUpdateStatus = (status: ErrorReport['status']) => {
        if (!selectedReport) return;

        updateMutation.mutate({
            id: selectedReport.id,
            updates: {
                status,
                resolvedBy: status === 'resuelto' ? (user as any)?.id : undefined,
                adminNotes: adminNotes || undefined,
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
            render: (r: ErrorReport) => (
                <Badge variant={CATEGORY_VARIANTS[r.category as keyof typeof CATEGORY_VARIANTS] || 'outline'}>
                    {CATEGORY_LABELS[r.category] || r.category}
                </Badge>
            ),
        },
        {
            key: 'description',
            label: 'Descripción',
            render: (r: ErrorReport) => (
                <p className="text-sm line-clamp-2 max-w-md">
                    {r.description}
                </p>
            ),
        },
        {
            key: 'status',
            label: 'Estado',
            render: (r: ErrorReport) => {
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
            render: (r: ErrorReport) => (
                r.screenshotUrl ? (
                    <ImageIcon className="w-4 h-4 text-[var(--color-primary)]" />
                ) : (
                    <span className="text-xs text-ui/60">-</span>
                )
            ),
        },
        {
            key: 'audio',
            label: 'Audio',
            render: (r: ErrorReport) => (
                r.audioUrl ? (
                    <span className="text-xs text-[var(--color-primary)]">🎤</span>
                ) : (
                    <span className="text-xs text-ui/60">-</span>
                )
            ),
        },
        {
            key: 'createdAt',
            label: 'Fecha',
            render: (r: ErrorReport) => (
                <div className="flex flex-col gap-0.5">
                    {r.createdByName && (
                        <span className="text-xs text-[var(--color-text-secondary)]">
                            {r.createdByName}
                        </span>
                    )}
                    <span className="text-xs text-ui/80">
                        {new Date(r.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (r: ErrorReport) => (
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewReport(r)}
                        className="gap-2"
                    >
                        <Eye className="w-4 h-4" />
                        Ver
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (window.confirm('¿Estás seguro de que quieres eliminar este reporte?')) {
                                deleteMutation.mutate(r.id);
                            }
                        }}
                        className="gap-2 text-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            <PageHeader
                title="Reportes de errores"
                subtitle="Gestiona los reportes de errores y sugerencias de los usuarios"
                icon={Bug}
            />

            <div className="studia-section">
                <div className="flex flex-col gap-4 mb-6">
                    {/* Búsqueda y Filtros */}
                    <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                        <div className="w-full xl:w-auto flex-1 min-w-[300px]">
                            <div className="relative">
                                <Input
                                    placeholder="Buscar en descripciones..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-full ${componentStyles.controls.inputDefault}`}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                            {/* Select de categoría */}
                            <div className="w-full sm:w-[200px]">
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className={componentStyles.controls.selectDefault}>
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

                            {/* Botones de estado con iconos */}
                            <div className="flex gap-1">
                                <Button
                                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('active')}
                                    size="icon"
                                    title="Activos"
                                    className={`w-12 h-12 ${statusFilter === 'active' ? componentStyles.buttons.primary : componentStyles.buttons.outline}`}
                                >
                                    <CheckSquare className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant={statusFilter === 'nuevo' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('nuevo')}
                                    size="icon"
                                    title="Nuevo"
                                    className={`w-12 h-12 ${statusFilter === 'nuevo' ? componentStyles.buttons.primary : componentStyles.buttons.outline}`}
                                >
                                    <XCircle className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant={statusFilter === 'en_revision' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('en_revision')}
                                    size="icon"
                                    title="En proceso"
                                    className={`w-12 h-12 ${statusFilter === 'en_revision' ? componentStyles.buttons.primary : componentStyles.buttons.outline}`}
                                >
                                    <Clock className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant={statusFilter === 'resuelto' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('resuelto')}
                                    size="icon"
                                    title="Resuelto"
                                    className={`w-12 h-12 ${statusFilter === 'resuelto' ? componentStyles.buttons.primary : componentStyles.buttons.outline}`}
                                >
                                    <CheckCircle className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setStatusFilter('all')}
                                    size="icon"
                                    title="Todos"
                                    className={`w-12 h-12 ${statusFilter === 'all' ? componentStyles.buttons.primary : componentStyles.buttons.outline}`}
                                >
                                    <Bug className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-ui/60">Cargando reportes...</div>
                ) : reportsFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-ui/60">No hay reportes que mostrar</div>
                ) : (
                    <UnifiedTable
                        data={reportsFiltrados}
                        columns={columns}
                        selectable={true}
                        keyField="id"
                        onRowClick={(report: ErrorReport) => handleViewReport(report)}
                        bulkActions={[
                            {
                                label: 'Marcar como nuevo',
                                icon: XCircle,
                                onClick: handleBulkUpdateStatus('nuevo'),
                            },
                            {
                                label: 'Marcar como en proceso',
                                icon: Clock,
                                onClick: handleBulkUpdateStatus('en_revision'),
                            },
                            {
                                label: 'Marcar como resuelto',
                                icon: CheckCircle,
                                onClick: handleBulkUpdateStatus('resuelto'),
                            },
                            {
                                label: 'Eliminar',
                                icon: Trash2,
                                onClick: (selectedIds: string[]) => {
                                    if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.length} reporte(s)?`)) {
                                        bulkDeleteMutation.mutate(selectedIds);
                                    }
                                },
                                variant: 'danger',
                            },
                        ]}
                    />
                )}

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
                                        <Label className="text-xs text-ui/60">Creado por</Label>
                                        <p className="text-sm font-medium">
                                            {selectedReport.createdByName || 'Usuario desconocido'}
                                        </p>
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

                                {selectedReport.audioUrl && (
                                    <div>
                                        <Label className="text-xs text-ui/60">Nota de voz</Label>
                                        <div className="mt-2">
                                            <AudioPlayer url={selectedReport.audioUrl} />
                                        </div>
                                    </div>
                                )}

                                {selectedReport.context && (
                                    <div>
                                        <Label className="text-xs text-ui/60">Información técnica</Label>
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors">
                                                Ver detalles técnicos
                                            </summary>
                                            <div className="mt-2 max-h-[300px] overflow-y-auto">
                                                <pre className="text-xs bg-[var(--color-surface-muted)] p-3 rounded-lg whitespace-pre-wrap break-words">
                                                    {JSON.stringify(selectedReport.context, null, 2)}
                                                </pre>
                                            </div>
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
                                        En proceso
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

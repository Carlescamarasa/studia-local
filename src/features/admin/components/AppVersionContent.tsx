/**
 * AppVersionContent - Embedded version content for Configuración page
 */

import React, { useState } from 'react';
import { useAppVersion } from '@/hooks/useAppVersion';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/features/shared/components/ds';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { Label } from '@/features/shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/shared/components/ui/dialog';
import { Tag, Plus, RefreshCw, CheckCircle, Calendar, User, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { componentStyles } from '@/design/componentStyles';
import { displayName } from '@/features/shared/utils/helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/shared/components/ui/table';

interface ReleaseNotesItem {
    hash: string;
    subject: string;
    author: string;
    date: string;
    type?: string;
}

interface ReleaseNotes {
    summary?: { text: string };
    items?: ReleaseNotesItem[];
}

interface AppVersion {
    id: string;
    version: string;
    codename?: string;
    notes?: string;
    release_notes?: ReleaseNotes;
    created_at: string;
    author?: any;
    build_date?: string;
}

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
    version: AppVersion | null;
}

interface AppVersionHookResult {
    productionVersion: any;
    currentVersion: AppVersion | null;
    history: AppVersion[];
    isLoading: boolean;
    refresh: () => void;
    createVersion: (data: any, options?: any) => void;
    activateVersion: (id: string, options?: any) => void;
    isCreating: boolean;
    isActivating: boolean;
    syncToSupabase: (data?: any, options?: any) => void;
    isSyncing: boolean;
}

function ChangelogModal({ isOpen, onClose, version }: ChangelogModalProps) {
    if (!version || !isOpen) return null;

    const releaseNotes = version.release_notes || {};
    const summary = releaseNotes.summary;
    const items = releaseNotes.items || [];
    const manualNotes = version.notes;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>Cambios en {version.version}</span>
                        {version.codename && (
                            <Badge variant="outline" className="text-sm font-normal">
                                {version.codename}
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {version.build_date && (
                            <span className="block mt-1">
                                Build: {new Date(version.build_date).toLocaleString()}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Resumen */}
                    {summary?.text && (
                        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border)]">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Tag className="w-4 h-4" /> Resumen
                            </h4>
                            <p className="text-[var(--color-text-primary)] font-medium text-lg">
                                {summary.text}
                            </p>
                        </div>
                    )}

                    {/* Notas manuales */}
                    {manualNotes && (
                        <div>
                            <h4 className="text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Notas de la versión</h4>
                            <div className="prose prose-sm dark:prose-invert max-w-none bg-[var(--color-bg-secondary)] p-4 rounded-lg overflow-hidden">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {manualNotes}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Changelog automático */}
                    {items.length > 0 ? (
                        <div>
                            <h4 className="text-sm font-medium mb-3 text-[var(--color-text-secondary)]">
                                Detalle de commits ({items.length})
                            </h4>
                            <div className="border border-[var(--color-border)] rounded-md divide-y divide-[var(--color-border)]">
                                {items.map((item, idx) => (
                                    <div key={idx} className="p-3 text-sm hover:bg-[var(--color-bg-secondary)] transition-colors">
                                        <div className="flex items-start gap-3">
                                            <Badge variant="default" className="font-mono text-[10px] shrink-0 mt-0.5">
                                                {item.hash?.substring(0, 7)}
                                            </Badge>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[var(--color-text-primary)] leading-relaxed">
                                                    {item.subject}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-tertiary)]">
                                                    <span>{item.author}</span>
                                                    <span>•</span>
                                                    <span>{item.date}</span>
                                                    {item.type && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="uppercase tracking-wider font-semibold opacity-70">
                                                                {item.type}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-[var(--color-text-tertiary)] italic">
                            No hay información detallada de commits para esta versión.
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function AppVersionContent() {
    const {
        productionVersion,
        currentVersion,
        history,
        isLoading,
        refresh,
        createVersion,
        activateVersion,
        isCreating,
        isActivating,
        syncToSupabase,
        isSyncing,
    } = useAppVersion({ fetchHistory: true }) as AppVersionHookResult;

    const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [viewingReleaseNotes, setViewingReleaseNotes] = useState<AppVersion | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        version: '',
        codename: '',
        notes: '',
    });

    const handleCreateVersion = () => {
        createVersion(formData, {
            onSuccess: () => {
                setIsNewVersionModalOpen(false);
                setFormData({ version: '', codename: '', notes: '' });
            }
        });
    };

    const handleActivateVersion = (versionId: string) => {
        setSelectedVersionId(versionId);
        setIsActivateModalOpen(true);
    };

    const confirmActivate = () => {
        if (selectedVersionId) {
            activateVersion(selectedVersionId, {
                onSuccess: () => setIsActivateModalOpen(false)
            });
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handleSyncData = () => {
        syncToSupabase(undefined, {
            onSuccess: () => {
                setLastSync(new Date());
            }
        });
    };

    // Display production version from /version.json
    const productionVersionDisplay = productionVersion
        ? `${productionVersion.versionName}`
        : (isLoading ? 'Cargando...' : 'Modo desarrollo');

    const productionDetails = productionVersion
        ? `Commit: ${productionVersion.commit} · Build: ${formatDate(productionVersion.buildDate)}`
        : null;

    return (
        <>
            {/* Header: Tile de Versión + Botones Fuera */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                {/* Tile estilo KPI (Wide Compact) */}
                <div className="w-full max-w-[380px] bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--card-radius,0.75rem)] p-4 flex items-center gap-4 shadow-sm relative overflow-hidden group hover:border-[var(--color-border-hover)] transition-colors">
                    {/* Decorative background accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-primary)]/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-[var(--color-primary)]/10 transition-colors" />

                    <div className="p-3 bg-[var(--color-surface-muted)] rounded-xl shrink-0 border border-[var(--color-border-muted)] group-hover:border-[var(--color-primary)]/20 transition-colors">
                        <Tag className="w-6 h-6 text-[var(--color-primary)]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1 z-10">
                        <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Versión en producción
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
                                {productionVersionDisplay}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                            {productionDetails && (
                                <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                                    {productionDetails}
                                </p>
                            )}
                            {lastSync && (
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mb-0.5" />
                                    Sincronizado: {lastSync.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Botones flotando fuera */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncData}
                        disabled={isLoading || isSyncing}
                        className={componentStyles.buttons?.outline}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${(isLoading || isSyncing) ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Actualizando...' : 'Actualizar'}
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsNewVersionModalOpen(true)}
                        disabled={isCreating}
                        className={componentStyles.buttons?.primary}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva versión
                    </Button>
                </div>
            </div>

            {/* Tabla de historial */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="text-lg">Historial de versiones</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-text-secondary)]" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 text-[var(--color-text-secondary)]">
                            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No hay versiones registradas</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">

                            <Table>

                                <TableHeader>

                                    <TableRow>

                                        <TableHead>Versión</TableHead>

                                        <TableHead>Cambios</TableHead>

                                        <TableHead>Codename</TableHead>

                                        <TableHead>Fecha</TableHead>

                                        <TableHead>Autor</TableHead>

                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {history.map((version) => {
                                        const isActive = currentVersion?.id === version.id;
                                        const author = version.author || {};

                                        // Procesar changelog
                                        const releaseNotes = version.release_notes || {};
                                        const summaryText = releaseNotes.summary?.text;
                                        const itemCount = releaseNotes.items?.length || 0;
                                        const hasNotes = (releaseNotes.items || []).length > 0 || !!version.notes;

                                        return (

                                            <TableRow key={version.id}>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-[var(--color-text-primary)]">
                                                            {version.version}
                                                        </span>
                                                        {isActive && (
                                                            <Badge variant="success" className="text-xs">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Activa
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="max-w-[250px]">
                                                    {hasNotes ? (
                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer group"
                                                            onClick={() => setViewingReleaseNotes(version)}
                                                        >
                                                            <FileText className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors" />
                                                            <span className="text-sm text-[var(--color-text-secondary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                                                {summaryText || `${itemCount} cambios`}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[var(--color-text-tertiary)] text-sm">—</span>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    {version.codename ? (
                                                        <span className="text-[var(--color-text-secondary)] italic">
                                                            "{version.codename}"
                                                        </span>
                                                    ) : (
                                                        <span className="text-[var(--color-text-secondary)]">—</span>
                                                    )}
                                                </TableCell>
                                                {/* @ts-ignore */}
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(version.created_at)}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                                        <span className="text-[var(--color-text-secondary)]">
                                                            {displayName(author) || '—'}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    {!isActive && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleActivateVersion(version.id)}
                                                            disabled={isActivating}
                                                            className={componentStyles.buttons?.outline}
                                                        >
                                                            Activar
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Changelog */}
            <ChangelogModal
                isOpen={!!viewingReleaseNotes}
                onClose={() => setViewingReleaseNotes(null)}
                version={viewingReleaseNotes}
            />

            {/* Modal: Nueva versión */}
            <Dialog open={isNewVersionModalOpen} onOpenChange={setIsNewVersionModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Nueva versión</DialogTitle>
                        <DialogDescription>
                            Crea una nueva versión de Studia. Esta versión se activará automáticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="version">Versión *</Label>
                            <Input
                                id="version"
                                value={formData.version}
                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                placeholder="v0.9-beta"
                                className={componentStyles.controls?.inputDefault}
                            />
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                Ejemplo: v0.9-beta, v1.0.0, v2.1.3
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="codename">Codename (opcional)</Label>
                            <Input
                                id="codename"
                                value={formData.codename}
                                onChange={(e) => setFormData({ ...formData, codename: e.target.value })}
                                placeholder="Aurora"
                                className={componentStyles.controls?.inputDefault}
                            />
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                Nombre código para esta versión
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="notes">Notas (opcional)</Label>
                            <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="## Cambios principales&#10;&#10;- Nueva funcionalidad X&#10;- Mejora en Y&#10;- Corrección de bug Z"
                                rows={8}
                                className={componentStyles.controls?.inputDefault}
                            />
                            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                Notas en formato Markdown sobre los cambios de esta versión
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsNewVersionModalOpen(false)}
                                className={componentStyles.buttons?.outline}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleCreateVersion}
                                disabled={!formData.version.trim() || isCreating}
                                className={componentStyles.buttons?.primary}
                            >
                                {isCreating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Publicando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Publicar versión
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: Confirmar activación */}
            <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Activar versión</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que quieres activar esta versión? La versión actual será reemplazada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsActivateModalOpen(false)}
                            className={componentStyles.buttons?.outline}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={confirmActivate}
                            disabled={isActivating}
                            className={componentStyles.buttons?.primary}
                        >
                            {isActivating ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Activando...
                                </>
                            ) : (
                                'Activar versión'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

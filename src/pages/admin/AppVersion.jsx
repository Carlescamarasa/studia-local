import React, { useState } from 'react';
import { useAppVersion } from '@/hooks/useAppVersion';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tag, Plus, RefreshCw, CheckCircle, Calendar, User, FileText } from 'lucide-react';
import RequireRole from '@/components/auth/RequireRole';
import PageHeader from '@/components/ds/PageHeader';
import { componentStyles } from '@/design/componentStyles';
import { displayName } from '@/components/utils/helpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function AppVersionPageContent() {
  const {
    productionVersion,
    currentVersion,
    history,
    isLoading,
    refresh,
    createVersion,
    activateVersion,
    syncToSupabase,
    isCreating,
    isActivating,
    isSyncing,
  } = useAppVersion({ fetchHistory: true });

  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    version: '',
    codename: '',
    notes: '',
  });

  const handleCreateVersion = () => {
    if (!formData.version.trim()) {
      return;
    }

    createVersion({
      version: formData.version.trim(),
      codename: formData.codename.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });

    // Reset form
    setFormData({ version: '', codename: '', notes: '' });
    setIsNewVersionModalOpen(false);
  };

  const handleActivateVersion = (versionId) => {
    setSelectedVersionId(versionId);
    setIsActivateModalOpen(true);
  };

  const confirmActivate = () => {
    if (selectedVersionId) {
      activateVersion(selectedVersionId);
      setIsActivateModalOpen(false);
      setSelectedVersionId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentVersionDisplay = productionVersion
    ? `${productionVersion.versionName}${productionVersion.codename ? ` "${productionVersion.codename}"` : ''}`
    : 'Sin versión activa';

  const handleSyncData = () => {
    syncToSupabase();
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Versión de Studia"
        description="Gestiona las versiones y el historial de la aplicación"
      />

      <div className={componentStyles.layout.page}>
        {/* Header con versión actual y acciones */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-[var(--color-primary)]" />
                <div>
                  <CardTitle className="text-lg">Versión activa</CardTitle>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    Studia {currentVersionDisplay}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncData}
                  disabled={isLoading || isSyncing}
                  className={componentStyles.buttons.outline}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${(isLoading || isSyncing) ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsNewVersionModalOpen(true)}
                  disabled={isCreating}
                  className={componentStyles.buttons.primary}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva versión
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabla de historial */}
        <Card>
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
                          <TableCell>
                            {version.codename ? (
                              <span className="text-[var(--color-text-secondary)] italic">
                                "{version.codename}"
                              </span>
                            ) : (
                              <span className="text-[var(--color-text-secondary)]">—</span>
                            )}
                          </TableCell>
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
                                {version.git_author || displayName(author) || '—'}
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
                                className={componentStyles.buttons.outline}
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
      </div>

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
                className={componentStyles.controls.inputDefault}
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
                className={componentStyles.controls.inputDefault}
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
                className={componentStyles.controls.inputDefault}
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Notas en formato Markdown sobre los cambios de esta versión
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsNewVersionModalOpen(false)}
                className={componentStyles.buttons.outline}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateVersion}
                disabled={!formData.version.trim() || isCreating}
                className={componentStyles.buttons.primary}
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
              className={componentStyles.buttons.outline}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={confirmActivate}
              disabled={isActivating}
              className={componentStyles.buttons.primary}
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
    </div>
  );
}

export default function AppVersionPage() {
  return (
    <RequireRole anyOf={['ADMIN']}>
      <AppVersionPageContent />
    </RequireRole>
  );
}


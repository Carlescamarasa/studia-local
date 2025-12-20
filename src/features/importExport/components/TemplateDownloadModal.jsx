import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { datasets } from '../registry';
import { FileText, FileJson, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TemplateDownloadModal({ isOpen, onClose }) {

    const downloadTemplate = (dataset, type) => {
        const content = dataset.templates?.[type];
        if (!content) return;

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `plantilla_${dataset.id}.${type}`; // e.g. plantilla_ejercicios.csv
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const importableDatasets = datasets.filter(d => d.import); // Only show templates for things we can import

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[var(--color-surface-card)]" style={{ borderRadius: 'var(--radius-modal)' }}>
                <DialogHeader>
                    <DialogTitle>Plantillas de Importación</DialogTitle>
                    <DialogDescription>
                        Descarga archivos de ejemplo con la estructura correcta para importar tus datos.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px]" style={{ paddingRight: 'var(--space-md)' }}>
                    <div className="grid grid-cols-1 py-[var(--space-md)]" style={{ gap: 'var(--space-md)' }}>
                        {importableDatasets.map(ds => (
                            <div key={ds.id} className="flex items-center justify-between border border-[var(--color-border-default)] rounded-[var(--radius-card)] bg-[var(--color-surface-alt)]" style={{ padding: 'var(--space-md)' }}>
                                <div>
                                    <h3 className="font-medium text-[var(--color-text-primary)]">{ds.label}</h3>
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-sm">
                                        Headers: <span className="font-mono bg-[var(--color-surface-muted)] px-1 rounded">
                                            {(ds.import.csvHeaders || []).join(', ')}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex" style={{ gap: 'var(--space-sm)' }}>
                                    {ds.templates?.csv && (
                                        <Button variant="outline" size="sm" onClick={() => downloadTemplate(ds, 'csv')}>
                                            <FileText className="w-4 h-4 mr-2 text-green-600" />
                                            CSV
                                        </Button>
                                    )}
                                    {ds.templates?.json && (
                                        <Button variant="outline" size="sm" onClick={() => downloadTemplate(ds, 'json')}>
                                            <FileJson className="w-4 h-4 mr-2 text-orange-600" />
                                            JSON
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="flex justify-end" style={{ paddingTop: 'var(--space-md)' }}>
                    <Button variant="ghost" onClick={() => onClose(false)}>Cerrar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

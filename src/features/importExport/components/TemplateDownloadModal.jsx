import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, FileJson } from 'lucide-react';
import { useMobileStrict } from '@/hooks/useMobileStrict';
import { datasets } from '../registry';

export default function TemplateDownloadModal({ isOpen, onClose }) {
    const isMobile = useMobileStrict();

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

    const ModalContent = ({ TitleComponent, DescriptionComponent, FooterButtonComponent }) => (
        <>
            {/* Header */}
            {TitleComponent && (
                <div className="px-6 py-4 border-b border-[var(--color-border-default)]">
                    <TitleComponent>Plantillas de Importación</TitleComponent>
                    <DescriptionComponent>
                        Descarga archivos de ejemplo con la estructura correcta para importar tus datos.
                    </DescriptionComponent>
                </div>
            )}

            <ScrollArea className={isMobile ? "h-auto max-h-[60vh] px-4" : "h-[400px] px-6"}>
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

            {FooterButtonComponent && (
                <div className="flex justify-end p-6 pt-4 border-t border-[var(--color-border-default)]">
                    <FooterButtonComponent variant="ghost" onClick={() => onClose(false)}>Cerrar</FooterButtonComponent>
                </div>
            )}
        </>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onClose}>
                <DrawerContent className="max-h-[85vh] bg-[var(--color-surface-card)]">
                    <DrawerHeader className="text-left">
                        <DrawerTitle>Plantillas de Importación</DrawerTitle>
                        <DrawerDescription>
                            Descarga archivos de ejemplo con la estructura correcta para importar tus datos.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-8 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-4 py-2">
                            {importableDatasets.map(ds => (
                                <div key={ds.id} className="flex flex-col gap-3 p-4 border border-[var(--color-border-default)] rounded-[var(--radius-card)] bg-[var(--color-surface-alt)]">
                                    <div>
                                        <h3 className="font-medium text-[var(--color-text-primary)]">{ds.label}</h3>
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-1 break-all">
                                            Headers: {(ds.import.csvHeaders || []).join(', ')}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {ds.templates?.csv && (
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadTemplate(ds, 'csv')}>
                                                <FileText className="w-4 h-4 mr-2 text-green-600" />
                                                CSV
                                            </Button>
                                        )}
                                        {ds.templates?.json && (
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadTemplate(ds, 'json')}>
                                                <FileJson className="w-4 h-4 mr-2 text-orange-600" />
                                                JSON
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-[var(--color-surface-card)] p-0 gap-0 overflow-hidden" style={{ borderRadius: 'var(--radius-modal)' }}>
                <DialogHeader className="px-6 py-4 border-b border-[var(--color-border-default)]">
                    <DialogTitle>Plantillas de Importación</DialogTitle>
                    <DialogDescription>
                        Descarga archivos de ejemplo con la estructura correcta para importar tus datos.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px]">
                    <div className="px-6 py-4 grid grid-cols-1 gap-4">
                        {importableDatasets.map(ds => (
                            <div key={ds.id} className="flex items-center justify-between border border-[var(--color-border-default)] rounded-[var(--radius-card)] bg-[var(--color-surface-alt)] p-4">
                                <div>
                                    <h3 className="font-medium text-[var(--color-text-primary)]">{ds.label}</h3>
                                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-sm">
                                        Headers: <span className="font-mono bg-[var(--color-surface-muted)] px-1 rounded">
                                            {(ds.import.csvHeaders || []).join(', ')}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
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

                <div className="flex justify-end p-6 pt-4 border-t border-[var(--color-border-default)]">
                    <Button variant="ghost" onClick={() => onClose(false)}>Cerrar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

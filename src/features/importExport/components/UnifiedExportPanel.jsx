import React, { useState } from 'react';
import { Download, Check, FileJson, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { datasets } from '../registry';
import { localDataClient } from '@/api/localDataClient';

const CATEGORIES = [
    { id: 'biblioteca', label: 'Biblioteca', datasets: ['piezas', 'ejercicios', 'planes'] },
    { id: 'alumnos', label: 'Datos de Alumnos', datasets: ['usuarios', 'asignaciones', 'agenda'] },
    { id: 'sistema', label: 'Sistema y Logs', datasets: ['sesiones'] }
];

export default function UnifiedExportPanel({ isOpen, onClose }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [format, setFormat] = useState('csv'); // 'csv' | 'json'
    const [isExporting, setIsExporting] = useState(false);

    const toggleDataset = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleCategory = (catDatasets) => {
        const allSelected = catDatasets.every(d => selectedIds.includes(d));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !catDatasets.includes(id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...catDatasets])]);
        }
    };

    // --- EXPORT HANDLERS ---

    const downloadFile = (content, filename) => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStandardExport = async () => {
        setIsExporting(true);
        let count = 0;
        try {
            for (const dsId of selectedIds) {
                const dataset = datasets.find(d => d.id === dsId);
                if (dataset && dataset.export) {
                    const content = await dataset.export.handler(format);
                    const timestamp = new Date().toISOString().slice(0, 10);
                    downloadFile(content, `studia_${dsId}_${timestamp}.${format}`);
                    count++;
                }
            }
            toast.success(`Exportados ${count} archivos correctamente.`);
            onClose(false);
        } catch (error) {
            toast.error(`Error al exportar: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    // --- FULL BACKUP SPECIAL ---
    const handleFullBackup = async () => {
        if (!confirm("Esto generará un archivo JSON masivo con TODOS los datos del sistema. ¿Continuar?")) return;

        setIsExporting(true);
        try {
            const backup = {
                meta: {
                    date: new Date().toISOString(),
                    version: "1.0"
                },
                data: {}
            };

            // Recorremos todos los datasets y sacamos su JSON
            for (const d of datasets) {
                if (d.export) {
                    // Forzamos JSON
                    const jsonStr = await d.export.handler('json');
                    backup.data[d.id] = JSON.parse(jsonStr);
                }
            }

            downloadFile(JSON.stringify(backup, null, 2), `studia_FULL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
            toast.success("Backup completo generado.");
            onClose(false);
        } catch (error) {
            console.error(error);
            toast.error("Error generando backup.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col bg-[var(--color-surface-card)]" style={{ padding: 'var(--space-lg)', gap: 'var(--space-md)' }}>
                <SheetHeader>
                    <SheetTitle>Exportar datos</SheetTitle>
                    <SheetDescription>
                        Selecciona qué información deseas descargar.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-6 space-y-8 pr-2">

                    {/* Format Selector */}
                    <div className="space-y-3">
                        <Label className="text-xs uppercase text-[var(--color-text-tertiary)] font-bold tracking-wider">
                            Formato de salida
                        </Label>
                        <RadioGroup
                            value={format}
                            onValueChange={setFormat}
                            className="flex gap-4"
                        >
                            <div className={`
                                flex items-center space-x-[var(--space-sm)] border p-[var(--space-sm)] rounded-[var(--radius-md)] flex-1 cursor-pointer transition-colors
                                ${format === 'csv' ? 'border-[var(--color-primary)] bg-[var(--color-surface-muted)]' : 'border-[var(--color-border-default)]'}
                            `}>
                                <RadioGroupItem value="csv" id="r-csv" />
                                <Label htmlFor="r-csv" className="flex items-center gap-[var(--space-xs)] cursor-pointer w-full">
                                    <FileType className="w-4 h-4" /> CSV (Excel)
                                </Label>
                            </div>
                            <div className={`
                                flex items-center space-x-[var(--space-sm)] border p-[var(--space-sm)] rounded-[var(--radius-md)] flex-1 cursor-pointer transition-colors
                                ${format === 'json' ? 'border-[var(--color-primary)] bg-[var(--color-surface-muted)]' : 'border-[var(--color-border-default)]'}
                            `}>
                                <RadioGroupItem value="json" id="r-json" />
                                <Label htmlFor="r-json" className="flex items-center gap-[var(--space-xs)] cursor-pointer w-full">
                                    <FileJson className="w-4 h-4" /> JSON (Raw)
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Dataset Selection */}
                    <div className="space-y-6">
                        {CATEGORIES.map(cat => (
                            <div key={cat.id} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold flex items-center gap-2 text-[var(--color-text-secondary)]">
                                        {cat.label}
                                    </Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-[var(--color-text-tertiary)]"
                                        onClick={() => toggleCategory(cat.datasets)}
                                    >
                                        {cat.datasets.every(d => selectedIds.includes(d)) ? 'Ninguno' : 'Todos'}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {cat.datasets.map(dsId => {
                                        const ds = datasets.find(d => d.id === dsId);
                                        if (!ds) return null;
                                        const checked = selectedIds.includes(dsId);

                                        return (
                                            <div
                                                key={dsId}
                                                className={`
                                                    flex items-start space-x-[var(--space-md)] p-[var(--space-sm)] rounded-[var(--radius-md)] border transition-all cursor-pointer
                                                    ${checked
                                                        ? 'border-[var(--color-primary)] bg-[var(--color-surface-muted)] shadow-sm'
                                                        : 'border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]/50'
                                                    }
                                                `}
                                                onClick={() => toggleDataset(dsId)}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => toggleDataset(dsId)}
                                                    className="mt-0.5"
                                                />
                                                <div className="space-y-1">
                                                    <Label className="font-medium cursor-pointer leading-none">
                                                        {ds.label}
                                                    </Label>
                                                    <p className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
                                                        {ds.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Full Backup Option */}
                    <div className="pt-4 border-t border-[var(--color-border-default)]">
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={handleFullBackup}
                            disabled={isExporting}
                        >
                            <span>Generar Full Backup (JSON del Sistema)</span>
                            <Download className="w-4 h-4 ml-2" />
                        </Button>
                        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2 text-center">
                            Descarga un solo archivo con todas las colecciones para copias de seguridad.
                        </p>
                    </div>

                </div>

                <SheetFooter className="pt-4 border-t border-[var(--color-border-default)]">
                    <Button
                        onClick={handleStandardExport}
                        disabled={selectedIds.length === 0 || isExporting}
                        className="w-full sm:w-auto"
                        size="lg"
                    >
                        {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Exportar {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

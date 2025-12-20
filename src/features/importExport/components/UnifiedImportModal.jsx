import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Loader2, AlertCircle, Eye, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { datasets, getDataset } from '../registry';
import { runImportPipeline } from '../utils/importPipeline';
import { useEffectiveUser } from '@/components/utils/helpers';
import WizardModal from './WizardModal';
import ImportReviewPanel from './ImportReviewPanel'; // Step 3 logic lives here

// Sub-components for steps
const UploadStep = ({ file, onDrop, onSelectFile, onClear, isProcessing, detectedType, onTypeChange, format }) => {
    const importableDatasets = datasets.filter(d => d.import);

    return (
        <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-2">

            {/* Dropzone */}
            {!file ? (
                <div
                    onDrop={onDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="group border-2 border-dashed rounded-[var(--radius-card)] h-64 flex flex-col items-center justify-center text-center transition-all bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-muted)] cursor-pointer"
                    style={{ borderColor: 'var(--color-border-default)' }}
                    onClick={() => document.getElementById('file-upload').click()}
                >
                    <div className="h-16 w-16 mb-4 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                        <Upload className="w-8 h-8 text-[var(--color-primary)] opacity-50 group-hover:opacity-100" />
                    </div>
                    <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Suelta el archivo para importar</h3>
                    <Button variant="secondary" className="mt-4" style={{ borderRadius: 'var(--radius-pill)' }}>
                        Elegir archivo
                    </Button>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-4">Soporta CSV, JSON</p>

                    <input
                        id="file-upload"
                        type="file"
                        accept=".csv,.json"
                        className="hidden"
                        onChange={onSelectFile}
                    />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* File Card */}
                    <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-md)] p-4 flex items-center justify-between border border-[var(--color-border-default)]">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] flex items-center justify-center">
                                <FileText className="w-6 h-6 text-[var(--color-primary)]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium truncate max-w-[200px] text-[var(--color-text-primary)]">
                                    {file.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-normal">
                                        {format}
                                    </Badge>
                                    <span className="text-xs text-[var(--color-text-secondary)]">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClear}
                            disabled={isProcessing}
                            className="text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-50"
                        >
                            Cambiar
                        </Button>
                    </div>

                    {/* Type Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Tipo de contenido
                        </label>
                        <Select value={detectedType} onValueChange={onTypeChange}>
                            <SelectTrigger className="h-12" style={{ borderRadius: 'var(--radius-ctrl)' }}>
                                <SelectValue placeholder="Detectando..." />
                            </SelectTrigger>
                            <SelectContent>
                                {importableDatasets.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {detectedType && (
                            <p className="text-xs text-[var(--color-text-secondary)] pl-1">
                                {getDataset(detectedType)?.description}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const PreviewStep = ({ report, dataset, isLoading }) => {
    if (isLoading) {
        return (
            <div className="h-60 flex flex-col items-center justify-center text-[var(--color-text-secondary)]">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-[var(--color-primary)]" />
                <p>Analizando estructura...</p>
            </div>
        );
    }

    if (!report) return null;

    const previewRows = report.rows.slice(0, 5);
    const headers = dataset.import?.csvHeaders || (previewRows[0] ? Object.keys(previewRows[0].original) : []);

    const summary = report.summary;

    return (
        <div className="space-y-6 py-2 animate-in fade-in">
            {/* Summary Metrics */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-[var(--color-surface-muted)] p-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)]">
                    <span className="block text-2xl font-bold text-[var(--color-text-primary)]">{summary.total}</span>
                    <span className="text-xs text-[var(--color-text-secondary)] uppercase">Registros</span>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-[var(--radius-md)] border border-blue-100">
                    <span className="block text-2xl font-bold text-blue-600">{summary.changes.created}</span>
                    <span className="text-xs text-blue-600/80 uppercase">Nuevos</span>
                </div>
                <div className="bg-yellow-50/50 p-3 rounded-[var(--radius-md)] border border-yellow-100">
                    <span className="block text-2xl font-bold text-yellow-600">{summary.changes.updated}</span>
                    <span className="text-xs text-yellow-600/80 uppercase">Actualiz.</span>
                </div>
                <div className="bg-red-50/50 p-3 rounded-[var(--radius-md)] border border-red-100">
                    <span className="block text-2xl font-bold text-red-600">{summary.errors}</span>
                    <span className="text-xs text-red-600/80 uppercase">Errores</span>
                </div>
            </div>

            {/* Validation Alerts */}
            {summary.errors > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-[var(--radius-md)] text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                        <p className="font-semibold">Se encontraron errores bloqueantes</p>
                        <p className="opacity-90 mt-1">
                            Algunas filas no cumplen con el formato o les faltan campos obligatorios.
                            Podrás revisarlas en el siguiente paso.
                        </p>
                    </div>
                </div>
            )}

            {/* Preview Table */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Previsualización
                    </h3>
                    <span className="text-xs text-[var(--color-text-tertiary)]">Mostrando primeras 5 filas</span>
                </div>
                <div className="border rounded-[var(--radius-md)] overflow-hidden overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-[var(--color-surface-muted)] border-b text-[var(--color-text-secondary)]">
                            <tr>
                                <th className="p-3 w-10">#</th>
                                {headers.slice(0, 5).map(h => (
                                    <th key={h} className="p-3 font-medium uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {previewRows.map((row, i) => (
                                <tr key={i} className="bg-[var(--color-surface-card)]">
                                    <td className="p-3 text-[var(--color-text-tertiary)]">{i + 1}</td>
                                    {headers.slice(0, 5).map(h => (
                                        <td key={h} className="p-3 max-w-[150px] truncate text-[var(--color-text-secondary)]">
                                            {String(row.original[h] || '-')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


export default function UnifiedImportModal({ isOpen, onClose }) {
    // State
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Review, 4: Result
    const [file, setFile] = useState(null);
    const [fileContent, setFileContent] = useState(null);
    const [format, setFormat] = useState('csv');
    const [detectedType, setDetectedType] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [report, setReport] = useState(null);
    const [finalResult, setFinalResult] = useState(null);

    const queryClient = useQueryClient();
    const effectiveUser = useEffectiveUser();
    const currentDataset = getDataset(detectedType);

    // Handlers
    const reset = () => {
        setFile(null);
        setFileContent(null);
        setDetectedType('');
        setReport(null);
        setStep(1);
    };

    const handleFileDrop = useCallback((e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        processFile(droppedFile);
    }, []);

    const processFile = (file) => {
        if (!file) return;
        setFile(file);

        // Auto-detect format
        const ext = file.name.split('.').pop().toLowerCase();
        setFormat(ext === 'json' ? 'json' : 'csv');

        // Auto-detect dataset type (Heuristic)
        const name = file.name.toLowerCase();
        let detected = '';
        if (name.includes('pieza') || name.includes('repertoire')) detected = 'piezas';
        else if (name.includes('ejercicio') || name.includes('technique')) detected = 'ejercicios';
        else if (name.includes('plan')) detected = 'planes';
        if (detected) setDetectedType(detected);

        // Read Content
        const reader = new FileReader();
        reader.onload = (e) => setFileContent(e.target.result);
        reader.readAsText(file);
    };

    // Navigation Logic
    const handleNext = async () => {
        if (step === 1) {
            // Validate Step 1 selection
            if (!file || !detectedType) return;

            // Run Pipeline for Preview
            setIsProcessing(true);
            try {
                const r = await runImportPipeline(currentDataset, fileContent, format);
                setReport(r);
                setStep(2);
            } catch (error) {
                toast.error(`Error al procesar archivo: ${error.message}`);
            } finally {
                setIsProcessing(false);
            }
        }
        else if (step === 2) {
            // Move to Review (or direct import if simple?)
            // Mockup suggest a Resolution step. Let's go to step 3.
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(s => s - 1);
    };

    const handleFinalImport = async (cleanedData) => {
        setIsProcessing(true);
        try {
            const res = await currentDataset.import.handler(cleanedData, 'json', effectiveUser);
            setFinalResult(res);
            setStep(4); // Result Step

            queryClient.invalidateQueries();
            if (res.errors.length === 0) toast.success('Importación completada');
            else toast.warning('Importación con errores');
        } catch (error) {
            toast.error(`Fallo crítico: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Render Steps
    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <UploadStep
                        file={file}
                        onDrop={handleFileDrop}
                        onSelectFile={(e) => processFile(e.target.files?.[0])}
                        onClear={reset}
                        isProcessing={isProcessing}
                        detectedType={detectedType}
                        onTypeChange={setDetectedType}
                        format={format}
                    />
                );
            case 2:
                return (
                    <PreviewStep
                        report={report}
                        dataset={currentDataset}
                        isLoading={isProcessing}
                    />
                );
            case 3:
                return (
                    <ImportReviewPanel
                        report={report}
                        dataset={currentDataset}
                        onCancel={handleBack}
                        onConfirm={handleFinalImport}
                    // We will upgrade this component in Phase 3
                    />
                );
            case 4:
                return (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <h3 className="text-xl font-bold">Importación Finalizada</h3>
                        <p className="text-[var(--color-text-secondary)]">Datos procesados correctamente.</p>
                        <Button onClick={() => { onClose(false); reset(); }}>Cerrar</Button>
                    </div>
                );
            default:
                return null;
        }
    };

    // Footer Actions
    const renderFooter = () => {
        if (step === 3 || step === 4) return null; // Review panel has its own buttons, Result too

        return (
            <div className="p-6 pt-2 flex justify-end gap-3 sticky bottom-0 bg-[var(--color-surface-card)]">
                {step === 1 ? (
                    <Button variant="ghost" onClick={() => onClose(false)}>Cancelar</Button>
                ) : (
                    <Button variant="outline" onClick={handleBack}>Atrás</Button>
                )}

                <Button
                    onClick={handleNext}
                    disabled={!file || !detectedType || isProcessing}
                    className="min-w-[120px]"
                    style={{ borderRadius: 'var(--radius-pill)' }}
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {step === 1 ? (isProcessing ? 'Analizando...' : 'Siguiente') : 'Continuar'}
                </Button>
            </div>
        );
    };

    return (
        <WizardModal
            isOpen={isOpen}
            onClose={(op) => !op && onClose()} // Only close if not processing?
            title={step === 4 ? "Resultado" : "Importar datos"}
            currentStep={step}
            totalSteps={4}
            stepLabel={
                step === 1 ? "Selección de archivo" :
                    step === 2 ? "Previsualización y validación" :
                        step === 3 ? "Revisión y resolución" : ""
            }
            onBack={step > 1 && step < 4 ? handleBack : undefined}
            className="md:max-w-3xl"
        >
            {renderStepContent()}
            {renderFooter()}
        </WizardModal>
    );
}

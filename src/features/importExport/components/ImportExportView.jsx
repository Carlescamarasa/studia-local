import React, { useState } from 'react';
import { Download, Upload, FileText, Settings, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { datasets } from '../registry';
import { ActionCard } from './Dashboard/ActionCard';
import UnifiedImportModal from './UnifiedImportModal'; // Will be refactored later
import UnifiedExportPanel from './UnifiedExportPanel';
import TemplateDownloadModal from './TemplateDownloadModal';

export default function ImportExportView() {
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

    // Mockup-inspired compact dashboard
    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500 flex flex-col" style={{ padding: 'var(--space-xl) var(--space-md)', gap: 'var(--space-xl)' }}>

            {/* 1. Header & Hero Section */}
            <div className="text-center" style={{ gap: 'var(--space-lg)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ gap: 'var(--space-sm)', display: 'flex', flexDirection: 'column' }}>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                        Importar y Exportar
                    </h1>
                    <p className="text-[var(--color-text-secondary)] max-w-lg mx-auto">
                        Gestiona fácilmente la importación y exportación de tus datos.
                        Carga masiva de ejercicios, planes y estudiantes.
                    </p>
                </div>

                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center" style={{ paddingTop: 'var(--space-md)', gap: 'var(--space-md)' }}>
                    <Button
                        size="lg"
                        className="h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all"
                        onClick={() => setIsImportOpen(true)}
                        style={{ borderRadius: 'var(--radius-pill)' }}
                    >
                        <Upload className="mr-2 h-5 w-5" />
                        Importar...
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-8 text-base bg-transparent border-2 border-[var(--color-border-default)] hover:border-[var(--color-text-primary)]"
                        onClick={() => setIsExportOpen(true)}
                        style={{ borderRadius: 'var(--radius-pill)' }}
                    >
                        <Download className="mr-2 h-5 w-5" />
                        Exportar...
                    </Button>
                </div>
            </div>

            {/* 2. Secondary Sections (Compact Lists) */}
            <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto" style={{ gap: 'var(--space-xl)' }}>

                {/* Left: Quick Resources */}
                <div style={{ gap: 'var(--space-md)', display: 'flex', flexDirection: 'column' }}>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] ml-1">
                        Recursos y Plantillas
                    </h2>
                    <div style={{ gap: 'var(--space-sm)', display: 'flex', flexDirection: 'column' }}>
                        <ActionCard
                            icon={<FileText className="w-5 h-5" />}
                            title="Plantillas (CSV y JSON)"
                            description="Descarga formatos de ejemplo"
                            onClick={() => setIsTemplatesOpen(true)}
                        />
                        <ActionCard
                            icon={<History className="w-5 h-5" />}
                            title="Historial de importaciones"
                            description="Ver logs recientes (Próximamente)"
                            className="opacity-50 cursor-not-allowed"
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Right: Advanced */}
                <div style={{ gap: 'var(--space-md)', display: 'flex', flexDirection: 'column' }}>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] ml-1">
                        Más opciones
                    </h2>
                    <div style={{ gap: 'var(--space-sm)', display: 'flex', flexDirection: 'column' }}>
                        <ActionCard
                            icon={<Settings className="w-5 h-5" />}
                            title="Configuración avanzada"
                            description="Mapeos personalizados y reglas"
                            onClick={() => { /* TODO: Advanced Settings */ }}
                            className="opacity-50 cursor-not-allowed"
                        />
                        <ActionCard
                            icon={<Download className="w-5 h-5" />}
                            title="Full Backup"
                            description="Descarga completa JSON (Sistema)"
                            onClick={() => setIsExportOpen(true)}
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <UnifiedImportModal isOpen={isImportOpen} onClose={setIsImportOpen} />
            <UnifiedExportPanel isOpen={isExportOpen} onClose={setIsExportOpen} />
            <TemplateDownloadModal isOpen={isTemplatesOpen} onClose={setIsTemplatesOpen} />
        </div>
    );
}

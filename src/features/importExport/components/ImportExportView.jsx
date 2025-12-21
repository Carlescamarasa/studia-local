import React, { useState } from 'react';
import { Download, Upload, FileText, Settings, History, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { datasets } from '../registry';
import { ActionCard } from './Dashboard/ActionCard';
import UnifiedImportModal from './UnifiedImportModal';
import UnifiedExportPanel from './UnifiedExportPanel';
import TemplateDownloadModal from './TemplateDownloadModal';
export default function ImportExportView() {
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

    return (
        <div className="min-h-screen">
            {/* Header Actions Only - Floating right */}
            <div className="flex justify-end p-4 md:p-6 lg:px-[var(--page-padding-x)]">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsExportOpen(true)}
                        className="h-[var(--control-height)]"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                    <Button
                        onClick={() => setIsImportOpen(true)}
                        className="h-[var(--control-height)]"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Importar
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="studia-container">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--space-xl)]">

                    {/* Left: Quick Resources */}
                    <div className="flex flex-col gap-[var(--space-md)]">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] ml-1">
                            Recursos y Plantillas
                        </h2>
                        <div className="flex flex-col gap-[var(--space-sm)]">
                            <ActionCard
                                icon={<FileText className="w-5 h-5" />}
                                title="Plantillas (CSV y JSON)"
                                description="Descarga formatos de ejemplo para tus datos"
                                onClick={() => setIsTemplatesOpen(true)}
                            />
                            <ActionCard
                                icon={<History className="w-5 h-5" />}
                                title="Historial de importaciones"
                                description="Consulta los logs de operaciones recientes"
                                className="opacity-50 cursor-not-allowed"
                                onClick={() => { }}
                            />
                        </div>
                    </div>

                    {/* Right: Advanced */}
                    <div className="flex flex-col gap-[var(--space-md)]">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] ml-1">
                            Opciones Avanzadas
                        </h2>
                        <div className="flex flex-col gap-[var(--space-sm)]">
                            <ActionCard
                                icon={<Download className="w-5 h-5" />}
                                title="Full Backup"
                                description="Descarga una copia completa del sistema (JSON)"
                                onClick={() => setIsExportOpen(true)}
                            />
                            <ActionCard
                                icon={<Settings className="w-5 h-5" />}
                                title="Configuración de mapeo"
                                description="Personaliza las reglas de importación"
                                onClick={() => { /* TODO: Advanced Settings */ }}
                                className="opacity-50 cursor-not-allowed"
                            />
                        </div>
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

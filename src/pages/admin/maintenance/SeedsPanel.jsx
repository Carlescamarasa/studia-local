import React from 'react';
import { Users, Zap, Sprout, Calendar, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { Alert, AlertDescription } from '@/components/ds';
import SeedCard from './components/SeedCard';
import SyntheticSchoolYearCard from './components/SyntheticSchoolYearCard';
import { componentStyles } from '@/design/componentStyles';

/**
 * SeedsPanel - Panel for generating demo/test data
 */
export default function SeedsPanel({
    isSeeding,
    isRefreshing,
    onCreateUsers,
    onGenerateSeeds,
    onDeleteSeeds,
    onRefresh,
    addLog,
}) {
    return (
        <div className="space-y-4">
            {/* Curso Sintético 2025-26 */}
            <SyntheticSchoolYearCard addLog={addLog} />

            {/* Semillas Realistas */}
            <SeedCard
                icon={Sprout}
                title="Semillas Realistas"
                description="Genera datos de prueba realistas para todos los estudiantes existentes."
                variant="default"
            >
                <Alert className="rounded-xl border-[var(--color-info)]/20 bg-[var(--color-info)]/10">
                    <AlertTriangle className="h-4 w-4 text-[var(--color-info)]" />
                    <AlertDescription className="text-xs text-[var(--color-text-primary)]">
                        <strong>Importante:</strong> Usa estudiantes existentes. Crea usuarios con rol ESTU antes de semillar.
                    </AlertDescription>
                </Alert>

                <div className="space-y-3">
                    <Button
                        variant="outline"
                        onClick={onCreateUsers}
                        loading={isSeeding}
                        className={`w-full ${componentStyles.buttons.outline}`}
                        aria-label="Crear usuarios de prueba"
                    >
                        <Users className="w-4 h-4 mr-2" />
                        Crear Usuarios de Prueba (2 PROF + 5 ESTU)
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="primary"
                        onClick={() => onGenerateSeeds(1)}
                        loading={isSeeding}
                        className={`w-full ${componentStyles.buttons.primary}`}
                        aria-label="Generar 1 semana de semillas realistas"
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        1 Semana
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => onGenerateSeeds(3)}
                        loading={isSeeding}
                        className={`w-full ${componentStyles.buttons.primary}`}
                        aria-label="Generar 3 semanas de semillas realistas"
                    >
                        <Sprout className="w-4 h-4 mr-2" />
                        3 Semanas
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => onGenerateSeeds(12)}
                        loading={isSeeding}
                        className={`w-full ${componentStyles.buttons.primary}`}
                        aria-label="Generar 3 meses (12 semanas) de semillas realistas"
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        3 Meses
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            // Año académico: desde principios de septiembre 2025 hasta finales de agosto 2026
                            const fechaInicio = new Date(2025, 8, 1);
                            const fechaFin = new Date(2026, 7, 31);
                            onGenerateSeeds(null, fechaInicio, fechaFin);
                        }}
                        loading={isSeeding}
                        className={`w-full ${componentStyles.buttons.primary}`}
                        aria-label="Generar año académico 2025-2026"
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        Año 2025-26
                    </Button>
                </div>

                <div className="mt-3">
                    <Button
                        variant="outline"
                        onClick={onRefresh}
                        loading={isRefreshing}
                        disabled={isSeeding}
                        className={`w-full ${componentStyles.buttons.outline}`}
                        aria-label="Actualizar datos y ejecutar pruebas"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualizar
                    </Button>
                </div>
            </SeedCard>

            {/* Limpiar Datos */}
            <SeedCard
                icon={Trash2}
                title="Limpiar Datos"
                description="⚠️ Elimina todas las semillas de prueba (asignaciones, registros, feedbacks, biblioteca seed)."
                variant="warning"
            >
                <Button
                    variant="danger"
                    onClick={onDeleteSeeds}
                    loading={isSeeding}
                    className={`w-full ${componentStyles.buttons.danger}`}
                    aria-label="Borrar todas las semillas de prueba"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Borrar Semillas
                </Button>
            </SeedCard>
        </div>
    );
}

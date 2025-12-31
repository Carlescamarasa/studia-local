/* eslint-disable @typescript-eslint/no-explicit-any */
 
import React, { useState, useMemo } from 'react';
import { useStudentBackpack } from '@/hooks/useStudentBackpack';
import { Card, CardContent, Badge, EmptyState } from '@/features/shared/components/ds';
import { Button } from '@/features/shared/components/ds/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Backpack, PlayCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toStudia } from '@/lib/routes';
import type { StudentBackpackItem } from '@/features/shared/types/domain';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/features/shared/components/ui/tooltip';
import { Checkbox } from '@/features/shared/components/ui/checkbox';
import { createManualSessionDraft } from '@/services/manualSessionService';
import { toast } from 'sonner';

interface MochilaViewContentProps {
    studentId: string;
    navigate: (path: string) => void;
}

type StatusFilter = 'todos' | 'en_progreso' | 'dominado' | 'nuevo' | 'oxidado' | 'archivado';

const statusFilters = [
    { value: 'en_progreso' as const, label: 'En Progreso' },
    { value: 'dominado' as const, label: 'Dominado' },
    { value: 'nuevo' as const, label: 'Nuevo' },
    { value: 'oxidado' as const, label: 'Oxidado' },
    { value: 'archivado' as const, label: 'Archivado' },
];

// Cast components to any to avoid TS errors
const CardAny: any = Card;
const CardContentAny: any = CardContent;
const BadgeAny: any = Badge;
const ButtonAny: any = Button;
const TooltipAny: any = Tooltip;
const TooltipTriggerAny: any = TooltipTrigger;
const TooltipContentAny: any = TooltipContent;
const TooltipProviderAny: any = TooltipProvider;
const CheckboxAny: any = Checkbox;

export default function MochilaViewContent({ studentId, navigate }: MochilaViewContentProps) {
    const { data: backpackItems = [], isLoading } = useStudentBackpack(studentId);
    const [activeFilter, setActiveFilter] = useState<StatusFilter>('todos');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Calculate filter counts
    const filterCounts = useMemo(() => {
        const counts: Record<StatusFilter, number> = {
            todos: backpackItems.length,
            en_progreso: 0,
            dominado: 0,
            nuevo: 0,
            oxidado: 0,
            archivado: 0,
        };

        backpackItems.forEach((item) => {
            counts[item.status]++;
        });

        return counts;
    }, [backpackItems]);

    // Filter items
    const filteredItems = useMemo(() => {
        if (activeFilter === 'todos') return backpackItems;
        return backpackItems.filter(item => item.status === activeFilter);
    }, [backpackItems, activeFilter]);

    // Calculate items actively being practiced
    const practiceCount = useMemo(() => {
        return backpackItems.filter(item =>
            item.status === 'en_progreso' || item.status === 'dominado'
        ).length;
    }, [backpackItems]);

    const getStatusBadgeVariant = (status: StudentBackpackItem['status']): 'default' | 'success' | 'warning' | 'outline' => {
        switch (status) {
            case 'dominado': return 'success';
            case 'en_progreso': return 'default';
            case 'oxidado': return 'warning';
            case 'archivado': return 'outline';
            case 'nuevo': return 'default';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: StudentBackpackItem['status']): string => {
        switch (status) {
            case 'dominado': return 'Dominado';
            case 'en_progreso': return 'En Progreso';
            case 'oxidado': return 'Oxidado';
            case 'archivado': return 'Archivado';
            case 'nuevo': return 'Nuevo';
            default: return status;
        }
    };

    // Selection handlers
    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(item => item.id)));
        }
    };

    const toggleSelectItem = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const isAllSelected = filteredItems.length > 0 && selectedItems.size === filteredItems.length;
    const isSomeSelected = selectedItems.size > 0 && selectedItems.size < filteredItems.length;

    // Handle practice button  
    const handlePracticar = async () => {
        try {
            // Determine which items to practice
            let itemsToPractice: StudentBackpackItem[];

            if (selectedItems.size > 0) {
                // Use selected items
                itemsToPractice = backpackItems.filter(item => selectedItems.has(item.id));
            } else {
                // Use all active items (en_progreso or dominado)
                itemsToPractice = backpackItems.filter(item =>
                    item.status === 'en_progreso' || item.status === 'dominado'
                );
            }

            if (itemsToPractice.length === 0) {
                toast.error('No hay ejercicios para practicar');
                return;
            }

            // Extract exercise codes (backpack_key)
            const exerciseCodes = itemsToPractice.map(item => item.backpackKey);

            toast.loading('Creando sesión de repaso...', { id: 'creating-session' });

            // Create manual session draft
            const { asignacionId, semanaIdx, sesionIdx } = await createManualSessionDraft({
                studentId,
                exerciseCodes,
                source: 'mochila'
            });

            toast.success(`Sesión de repaso creada con ${itemsToPractice.length} ejercicio${itemsToPractice.length > 1 ? 's' : ''}`, {
                id: 'creating-session'
            });

            // Navigate to Studia with the created session
            navigate(toStudia({
                asignacionId: asignacionId,
                semanaIdx: semanaIdx,
                sesionIdx: sesionIdx
            }));

        } catch (error) {
            console.error('Error creating practice session:', error);
            toast.error('Error al crear la sesión de repaso', { id: 'creating-session' });
        }
    };

    if (isLoading) {
        return (
            <CardAny className="p-8">
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
                </div>
            </CardAny>
        );
    }

    return (
        <>
            {/* Info Card */}
            <CardAny className="bg-[var(--color-accent-yellow-bg)] border-[var(--color-accent-yellow-border)]">
                <CardContentAny className="p-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-[var(--color-accent-yellow-text)] mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-[var(--color-accent-yellow-text)] space-y-1">
                            <p className="font-medium">La Mochila muestra el estado actual (foto fija).</p>
                            <p>Los estados se actualizan al practicar:</p>
                            <p className="font-mono text-xs">Nuevo → En progreso → Dominado</p>
                            <p className="text-xs opacity-90">
                                Oxidado/Archivado solo aparecen si se marcan/archivan manualmente (por ahora).
                            </p>
                        </div>
                    </div>
                </CardContentAny>
            </CardAny>

            {/* Filters and Practice Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Status Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Todos filter */}
                    <button
                        onClick={() => setActiveFilter('todos')}
                        className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            activeFilter === 'todos'
                                ? "bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                        )}
                    >
                        Todos <span className="ml-1.5 text-xs opacity-70">{filterCounts.todos}</span>
                    </button>

                    {/* Status filters */}
                    {statusFilters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setActiveFilter(filter.value)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                activeFilter === filter.value
                                    ? "bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-sm"
                                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                            )}
                        >
                            {filter.label} <span className="ml-1.5 text-xs opacity-70">{filterCounts[filter.value]}</span>
                        </button>
                    ))}
                </div>

                {/* Practice Button */}
                {practiceCount > 0 && (
                    <ButtonAny
                        variant="default"
                        onClick={handlePracticar}
                        className="gap-2"
                    >
                        <PlayCircle className="w-4 h-4" />
                        {selectedItems.size > 0
                            ? `Practicar (${selectedItems.size})`
                            : `Practicar (${practiceCount})`
                        }
                    </ButtonAny>
                )}
            </div>

            {/* Table */}
            <CardAny>
                <CardContentAny className="p-0">
                    {filteredItems.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                icon={<Backpack className="w-12 h-12 text-muted-foreground" />}
                                title={activeFilter === 'todos' ? "Mochila vacía" : `Sin ítems en "${statusFilters.find(f => f.value === activeFilter)?.label}"`}
                                description={activeFilter === 'todos'
                                    ? "A medida que practiques, los ejercicios se guardarán aquí automáticamente."
                                    : "No hay ítems con este estado actualmente."
                                }
                            />
                        </div>
                    ) : (
                        <div className="rounded-md border border-[var(--color-border-default)] overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border-default)]">
                                    <tr>
                                        {/* Checkbox column */}
                                        <th className="h-12 px-4 text-left align-middle font-semibold w-12">
                                            <CheckboxAny
                                                checked={isAllSelected}
                                                indeterminate={isSomeSelected}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="h-12 px-4 text-left align-middle font-semibold text-[var(--color-text-secondary)]">
                                            ESTADO
                                        </th>
                                        <th className="h-12 px-4 text-left align-middle font-semibold text-[var(--color-text-secondary)]">
                                            <div className="flex items-center gap-2">
                                                NIVEL MAESTRÍA
                                                <TooltipProviderAny>
                                                    <TooltipAny>
                                                        <TooltipTriggerAny asChild>
                                                            <Info className="w-4 h-4 text-[var(--color-text-muted)] cursor-help" />
                                                        </TooltipTriggerAny>
                                                        <TooltipContentAny className="max-w-[300px]">
                                                            <p className="text-sm">
                                                                El XP aumenta con cada práctica completada.
                                                                Al alcanzar ciertos umbrales en múltiples semanas,
                                                                el estado cambia automáticamente.
                                                            </p>
                                                        </TooltipContentAny>
                                                    </TooltipAny>
                                                </TooltipProviderAny>
                                            </div>
                                        </th>
                                        <th className="h-12 px-4 text-left align-middle font-semibold text-[var(--color-text-secondary)]">
                                            ÚLTIMA PRÁCTICA
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => (
                                        <tr
                                            key={item.id}
                                            className={cn(
                                                "transition-colors hover:bg-[var(--color-surface-muted)]/50",
                                                idx !== filteredItems.length - 1 && "border-b border-[var(--color-border-default)]"
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <td className="p-4 align-middle">
                                                <CheckboxAny
                                                    checked={selectedItems.has(item.id)}
                                                    onCheckedChange={() => toggleSelectItem(item.id)}
                                                />
                                            </td>

                                            {/* Row Icon + Item Key */}
                                            <td className="p-4 align-middle">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 rounded bg-[var(--color-accent-orange-bg)] flex items-center justify-center">
                                                        <Backpack className="w-5 h-5 text-[var(--color-accent-orange-text)]" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-[var(--color-text-primary)]">
                                                            {item.backpackKey}
                                                        </div>
                                                        <BadgeAny
                                                            variant={getStatusBadgeVariant(item.status)}
                                                            className="mt-1"
                                                        >
                                                            {getStatusLabel(item.status)}
                                                        </BadgeAny>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Mastery Progress */}
                                            <td className="p-4 align-middle">
                                                <div className="flex items-center gap-3 max-w-[200px]">
                                                    <div className="w-full bg-[var(--color-surface-muted)] rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className="bg-[var(--color-accent-orange-text)] h-2.5 rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, item.masteryScore)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                                                        {item.masteryScore} XP
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Last Practiced */}
                                            <td className="p-4 align-middle text-[var(--color-text-secondary)]">
                                                {item.lastPracticedAt
                                                    ? format(new Date(item.lastPracticedAt), "d MMM yyyy", { locale: es })
                                                    : '-'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContentAny>
            </CardAny>

            {/* Selection Info & Pagination */}
            <div className="flex justify-between items-center text-sm text-[var(--color-text-secondary)]">
                <div>
                    {selectedItems.size > 0 && (
                        <span className="font-medium">
                            {selectedItems.size} {selectedItems.size === 1 ? 'ítem seleccionado' : 'ítems seleccionados'}
                        </span>
                    )}
                </div>
                {filteredItems.length > 0 && (
                    <div>
                        Mostrando 1 - {filteredItems.length} de {filteredItems.length} | Filas por página: 10
                    </div>
                )}
            </div>
        </>
    );
}

import React, { useState, useEffect } from 'react';
import { localDataClient } from '@/api/localDataClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import UnifiedTable from '@/components/tables/UnifiedTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save, ArrowRight, Copy, Check, AlertCircle, X, ArrowLeftRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info, ChevronDown, Pencil } from "lucide-react"

export default function LevelConfigView() {
    const [loading, setLoading] = useState(true);
    const [levels, setLevels] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [activeLevel, setActiveLevel] = useState('1');
    const [viewMode, setViewMode] = useState('edit'); // 'edit', 'compare'
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importCandidates, setImportCandidates] = useState([]);
    const [selectedImportIds, setSelectedImportIds] = useState([]);

    // Modal edit states for criteria
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCriteria, setEditingCriteria] = useState(null);
    const [editDraft, setEditDraft] = useState({ skill: '', source: '', description: '', required: false });

    // Responsive state: <1024 uses Drawer, >=1024 uses Dialog
    const [isDrawerMode, setIsDrawerMode] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsDrawerMode(window.innerWidth < 1024);
        };
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [levelsData, criteriaData] = await Promise.all([
                localDataClient.entities.LevelConfig.list(),
                localDataClient.entities.LevelKeyCriteria.list()
            ]);

            // Ensure we have configs for levels 1-10
            const fullLevels = [];
            for (let i = 1; i <= 10; i++) {
                const existing = levelsData.find(l => l.level === i);
                if (existing) {
                    fullLevels.push(existing);
                } else {
                    fullLevels.push({
                        level: i,
                        minXpFlex: 0,
                        minXpMotr: 0,
                        minXpArt: 0,
                        minEvalSound: 0,
                        minEvalCog: 0,
                        evidenceWindowDays: 30
                    });
                }
            }

            setLevels(fullLevels);
            setCriteria(criteriaData);
        } catch (error) {
            console.error('Error loading level config:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleLevelChange = (level, field, value) => {
        setLevels(prev => prev.map(l =>
            l.level === level ? { ...l, [field]: value } : l
        ));
    };

    const saveLevelConfig = async (levelConfig) => {
        try {
            // Check if exists to decide create or update
            const existing = await localDataClient.entities.LevelConfig.list();
            const match = existing.find(l => l.level === levelConfig.level);

            if (match) {
                // Use level as the ID for update, as defined in remoteDataAPI
                await localDataClient.entities.LevelConfig.update(levelConfig.level, levelConfig);
            } else {
                await localDataClient.entities.LevelConfig.create(levelConfig);
            }
            toast.success(`Nivel ${levelConfig.level} guardado`);

            // Reload to get fresh data (especially if created)
            loadData();
        } catch (error) {
            console.error('Error saving level:', error);
            toast.error('Error al guardar');
        }
    };

    const addCriteria = async (level) => {
        const newCriteria = {
            level,
            skill: 'Flexibilidad',
            source: 'PROF',
            description: 'Nuevo criterio',
            required: true,
            evidenceRequired: 3,
            evidenceDays: 14
        };

        try {
            const created = await localDataClient.entities.LevelKeyCriteria.create(newCriteria);
            setCriteria(prev => [...prev, created]);
            toast.success('Criterio añadido');
        } catch (error) {
            toast.error('Error al crear criterio');
        }
    };

    const updateCriteria = async (id, updates) => {
        try {
            const updated = await localDataClient.entities.LevelKeyCriteria.update(id, updates);
            setCriteria(prev => prev.map(c => c.id === id ? updated : c));
        } catch (error) {
            toast.error('Error al actualizar criterio');
        }
    };

    const deleteCriteria = async (id) => {
        if (!confirm('¿Eliminar criterio?')) return;
        try {
            await localDataClient.entities.LevelKeyCriteria.delete(id);
            setCriteria(prev => prev.filter(c => c.id !== id));
            toast.success('Criterio eliminado');
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    // Modal edit handlers
    const openCriteriaModal = (criterio) => {
        setEditingCriteria(criterio);
        setEditDraft({
            skill: criterio.skill || '',
            source: criterio.source || '',
            description: criterio.description || '',
            required: criterio.required || false
        });
        setEditModalOpen(true);
    };

    const saveCriteriaDraft = async () => {
        if (editingCriteria) {
            await updateCriteria(editingCriteria.id, editDraft);
            setEditModalOpen(false);
            setEditingCriteria(null);
        }
    };

    const cancelCriteriaEdit = () => {
        setEditModalOpen(false);
        setEditingCriteria(null);
    };


    const normalizeText = (text) => {
        return text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";
    };

    const getComparisonData = () => {
        const currentLvl = parseInt(activeLevel);
        const prevLvl = currentLvl - 1;

        if (prevLvl < 1) return null;

        const currentItems = criteria.filter(c => c.level === currentLvl);
        const prevItems = criteria.filter(c => c.level === prevLvl);

        // Group by skill
        const skills = ['Flexibilidad', 'Motricidad', 'Articulación', 'Sonido', 'Cognición'];
        const comparison = {};

        skills.forEach(skill => {
            const currentSkillItems = currentItems.filter(c => c.skill === skill);
            const prevSkillItems = prevItems.filter(c => c.skill === skill);

            const newItems = [];
            const removedItems = [];
            const similarItems = [];

            // Find new and similar
            currentSkillItems.forEach(curr => {
                const exactMatch = prevSkillItems.find(prev =>
                    normalizeText(prev.description) === normalizeText(curr.description)
                );

                if (exactMatch) {
                    // Exact match - usually wouldn't happen if looking for diffs, but let's consider it "continuist"
                    // actually, if it's EXACT it's just 'continued'. 
                    // We might want to see what CHANGED or is NEW.
                    // If it's exact, maybe we don't show it in "New", but we might want to see it in context.
                    // Let's stick to the prompt: "Nuevos", "Eliminados", "Similares".
                    // If exact match, it's not new.
                } else {
                    // Check similarity
                    const similar = prevSkillItems.find(prev => {
                        const s1 = normalizeText(curr.description);
                        const s2 = normalizeText(prev.description);
                        // Simple inclusion or very basic similarity for now
                        return s1.includes(s2) || s2.includes(s1);
                    });

                    if (similar) {
                        similarItems.push({ current: curr, previous: similar });
                    } else {
                        newItems.push(curr);
                    }
                }
            });

            // Find removed
            prevSkillItems.forEach(prev => {
                const exactMatch = currentSkillItems.find(curr =>
                    normalizeText(prev.description) === normalizeText(curr.description)
                );

                // If not exact match AND not in the similar list we found earlier...
                // Wait, similar logic above was from Current perspective.
                // Refined logic:
                // 1. Identify Exact Matches (Continued)
                // 2. Identify Similar (Evolving)
                // 3. Identify New (In Current, not in Prev, not similar)
                // 4. Identify Removed (In Prev, not in Current, not similar)

                // Let's simplify for the UI requested:
                // Nuevos: in Current, no match/similar in Prev.
                // Eliminados: in Prev, no match/similar in Current.

                const similar = currentSkillItems.find(curr => {
                    const s1 = normalizeText(curr.description);
                    const s2 = normalizeText(prev.description);
                    return s1.includes(s2) || s2.includes(s1);
                });

                if (!exactMatch && !similar) {
                    removedItems.push(prev);
                }
            });

            comparison[skill] = {
                new: newItems,
                removed: removedItems,
                similar: similarItems
            };
        });

        return comparison;
    };

    const prepareImport = () => {
        const currentLvl = parseInt(activeLevel);
        const prevLvl = currentLvl - 1;
        if (prevLvl < 1) {
            toast.error("No hay nivel anterior para importar");
            return;
        }

        const currentItems = criteria.filter(c => c.level === currentLvl);
        const prevItems = criteria.filter(c => c.level === prevLvl);

        // Filter duplicates
        const candidates = prevItems.filter(prev => {
            const exists = currentItems.some(curr =>
                curr.skill === prev.skill &&
                normalizeText(curr.description) === normalizeText(prev.description)
            );
            return !exists;
        });

        if (candidates.length === 0) {
            toast.info("No hay criterios nuevos para importarn del nivel anterior");
            return;
        }

        setImportCandidates(candidates);
        setSelectedImportIds(candidates.map(c => c.id)); // Select all by default
        setImportModalOpen(true);
    };

    const executeImport = async () => {
        try {
            const currentLvl = parseInt(activeLevel);
            const toImport = importCandidates.filter(c => selectedImportIds.includes(c.id));

            if (toImport.length === 0) {
                setImportModalOpen(false);
                return;
            }

            const promises = toImport.map(item => {
                const { id, created_at, ...rest } = item;
                // Create new copy for current level
                return localDataClient.entities.LevelKeyCriteria.create({
                    ...rest,
                    level: currentLvl
                });
            });

            const newItems = await Promise.all(promises);
            setCriteria(prev => [...prev, ...newItems]);
            toast.success(`${newItems.length} criterios importados`);
            setImportModalOpen(false);
        } catch (error) {
            console.error('Import error:', error);
            toast.error("Error al importar criterios");
        }
    };

    const renderDescriptionWithTags = (text) => {
        if (!text) return "";
        const parts = text.split(/(#\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('#')) {
                return <Badge key={i} variant="secondary" className="mr-1 text-xs">{part}</Badge>;
            }
            return part;
        });
    };

    const currentLevelConfig = levels.find(l => l.level === parseInt(activeLevel));
    const currentCriteria = criteria.filter(c => c.level === parseInt(activeLevel));
    const currentLevelNum = parseInt(activeLevel);
    const nextLevelNum = currentLevelNum + 1;
    const isLastLevel = currentLevelNum >= 10;

    // For text display: if last level, we talk about "Completing Level 10" instead of "Ascending to 11"
    const requirementLabel = isLastLevel
        ? `Requisitos para COMPLETAR el Nivel ${currentLevelNum}`
        : `Requisitos para pasar de Nivel ${currentLevelNum} → Nivel ${nextLevelNum}`;

    const objectiveLabel = isLastLevel
        ? `Objetivo: Completar Estudios`
        : `Objetivo: Nivel ${nextLevelNum}`;

    return (
        <div className="space-y-6">




            {/* Header toolbar - responsive layout */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-muted/20 p-3 sm:p-4 rounded-lg border">
                {/* Level selector group - stacks on mobile */}
                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 min-w-0 w-full xs:w-auto">
                    <div className="flex items-center gap-2 min-w-0">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 flex-shrink-0 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent align="start" className="max-w-[320px] p-4">
                                    <h4 className="font-semibold mb-2 text-sm">Cómo funciona el sistema de niveles</h4>
                                    <ul className="list-disc space-y-1 text-xs ml-3 text-muted-foreground">
                                        <li>Se empieza en Nivel 1 con 0 XP.</li>
                                        <li>La configuración de Nivel {currentLevelNum} define cuándo puede pasar a Nivel {nextLevelNum}.</li>
                                        <li>Los criterios son orientativos; la decisión final es del profesor.</li>
                                    </ul>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Label className="text-muted-foreground whitespace-nowrap text-sm">Configurando:</Label>
                        <Select value={activeLevel} onValueChange={setActiveLevel}>
                            <SelectTrigger className="w-auto min-w-[100px] max-w-[140px] font-medium bg-background text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {levels.map(l => (
                                    <SelectItem key={l.level} value={String(l.level)}>Nivel {l.level}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Objective badge - wraps on narrow screens */}
                    <div className="flex items-center gap-2 min-w-0">
                        <ArrowRight className="w-4 h-4 flex-shrink-0 text-muted-foreground hidden xs:block" />
                        <Badge variant="outline" className="bg-background text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                            {objectiveLabel}
                        </Badge>
                    </div>

                    {currentLevelNum === 1 && (
                        <span className="text-xs text-muted-foreground italic hidden sm:inline">
                            (En Nivel 1 se empieza con 0 XP)
                        </span>
                    )}
                </div>

                {/* Divider - hidden on mobile */}
                <div className="hidden sm:block h-6 w-px bg-border" />

                {/* Action buttons group - wraps to new row on mobile */}
                <div className="flex flex-wrap items-center gap-2 w-full xs:w-auto">
                    <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v)} className="flex-wrap">
                        <ToggleGroupItem value="edit" aria-label="Editar" className="text-xs sm:text-sm px-2 sm:px-3">
                            Editar
                        </ToggleGroupItem>
                        <ToggleGroupItem value="compare" aria-label="Comparar" className="text-xs sm:text-sm px-2 sm:px-3">
                            <ArrowLeftRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden xs:inline">Comparar</span>
                            <span className="xs:hidden">Comp.</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="matrix" aria-label="Vista General" className="text-xs sm:text-sm px-2 sm:px-3">
                            <span className="hidden xs:inline">Vista General</span>
                            <span className="xs:hidden">Vista</span>
                        </ToggleGroupItem>
                    </ToggleGroup>

                    {viewMode === 'edit' && parseInt(activeLevel) > 1 && (
                        <Button variant="outline" size="sm" onClick={prepareImport} className="text-xs sm:text-sm whitespace-nowrap ml-auto xs:ml-0">
                            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Importar del Nivel {parseInt(activeLevel) - 1}</span>
                            <span className="sm:hidden">Importar</span>
                        </Button>
                    )}
                </div>
            </div>



            {viewMode === 'compare' ? (
                <div className="space-y-6">
                    {parseInt(activeLevel) === 1 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No hay nivel anterior para comparar con el Nivel 1.
                        </div>
                    ) : (
                        (() => {
                            const comparison = getComparisonData();
                            // XP Comparison Logic
                            const currentLvl = parseInt(activeLevel);
                            const prevLvl = currentLvl - 1;
                            const prevConfig = levels.find(l => l.level === prevLvl) || { minXpFlex: 0, minXpMotr: 0, minXpArt: 0 };
                            const currConfig = levels.find(l => l.level === currentLvl);

                            const xpFields = [
                                { label: 'Flexibilidad', key: 'minXpFlex' },
                                { label: 'Motricidad', key: 'minXpMotr' },
                                { label: 'Articulación', key: 'minXpArt' }
                            ];

                            return (
                                <div className="grid gap-6">
                                    {/* XP Comparison Card */}
                                    <Card>
                                        <CardHeader className="py-4">
                                            <CardTitle className="text-base font-medium">
                                                Diferencias de XP (Ascenso Nivel {prevLvl} → {currentLvl})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {xpFields.map(field => {
                                                    const prevVal = prevConfig[field.key] || 0;
                                                    const currVal = currConfig?.[field.key] || 0;
                                                    const diff = currVal - prevVal;
                                                    const isIncrease = diff > 0;

                                                    return (
                                                        <div key={field.key} className="p-3 bg-muted/30 rounded-lg border">
                                                            <div className="text-sm font-medium text-muted-foreground mb-1">{field.label}</div>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-xl font-bold">{prevVal}</span>
                                                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                                                <span className="text-xl font-bold">{currVal}</span>
                                                            </div>
                                                            {diff !== 0 && (
                                                                <div className={`text-xs mt-1 font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {isIncrease ? '+' : ''}{diff} XP
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {Object.entries(comparison).map(([skill, data]) => {
                                        const hasChanges = data.new.length > 0 || data.removed.length > 0 || data.similar.length > 0;
                                        if (!hasChanges) return null;

                                        return (
                                            <Card key={skill}>
                                                <CardHeader className="py-4">
                                                    <CardTitle className="text-base font-medium flex items-center gap-2">
                                                        {skill}
                                                        <Badge variant="outline" className="ml-auto font-normal">
                                                            +{data.new.length} / -{data.removed.length}
                                                        </Badge>
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    {data.similar.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-[var(--color-warning)] mb-2 flex items-center gap-2">
                                                                <AlertCircle className="w-3 h-3" /> Evolución Posible
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {data.similar.map((item, idx) => (
                                                                    <div key={idx} className="bg-[var(--color-warning)]/10 p-2 rounded text-sm grid grid-cols-2 gap-4 items-center">
                                                                        <div className="text-muted-foreground line-through opacity-70">
                                                                            {item.previous.description}
                                                                        </div>
                                                                        <div className="font-medium">
                                                                            {renderDescriptionWithTags(item.current.description)}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {data.new.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-[var(--color-success)] mb-2 flex items-center gap-2">
                                                                <Plus className="w-3 h-3" /> Nuevos en Nivel {activeLevel}
                                                            </h4>
                                                            <ul className="space-y-1">
                                                                {data.new.map(item => (
                                                                    <li key={item.id} className="bg-[var(--color-success)]/10 p-2 rounded text-sm">
                                                                        {renderDescriptionWithTags(item.description)}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {data.removed.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-[var(--color-danger)] mb-2 flex items-center gap-2">
                                                                <Trash2 className="w-3 h-3" /> Eliminados (estaban en Nivel {parseInt(activeLevel) - 1})
                                                            </h4>
                                                            <ul className="space-y-1">
                                                                {data.removed.map(item => (
                                                                    <li key={item.id} className="bg-[var(--color-danger)]/10 p-2 rounded text-sm text-muted-foreground">
                                                                        {item.description}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            );
                        })()
                    )}
                </div>
            ) : viewMode === 'matrix' ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Vista General de Niveles</CardTitle>
                        <p className="text-sm text-muted-foreground">Edita los requisitos de XP para todos los niveles de un vistazo. Los cambios se guardan al perder el foco (blur).</p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="ui-table-shell overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-muted sticky top-0 z-20">
                                    <tr>
                                        <th className="w-[180px] min-w-[180px] text-left font-semibold p-3 border-b border-r border-border bg-muted sticky left-0 z-30">
                                            Requisito
                                        </th>
                                        {levels.map(l => (
                                            <th key={l.level} className="w-[110px] min-w-[110px] text-center font-semibold p-3 border-b border-border">
                                                Nivel {l.level}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* XP Flexibilidad */}
                                    <tr className="hover:bg-muted/20">
                                        <td className="font-medium p-3 border-b border-r border-border bg-background sticky left-0 z-10">
                                            Min. XP Flexibilidad
                                        </td>
                                        {levels.map(l => (
                                            <td key={l.level} className="p-2 border-b border-border text-center">
                                                <Input
                                                    type="number"
                                                    className="w-full max-w-[90px] text-center mx-auto tabular-nums"
                                                    value={l.minXpFlex || 0}
                                                    onChange={(e) => handleLevelChange(l.level, 'minXpFlex', parseInt(e.target.value) || 0)}
                                                    onBlur={() => saveLevelConfig(l)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    {/* XP Motricidad */}
                                    <tr className="hover:bg-muted/20 bg-muted/5">
                                        <td className="font-medium p-3 border-b border-r border-border bg-background sticky left-0 z-10">
                                            Min. XP Motricidad
                                        </td>
                                        {levels.map(l => (
                                            <td key={l.level} className="p-2 border-b border-border text-center">
                                                <Input
                                                    type="number"
                                                    className="w-full max-w-[90px] text-center mx-auto tabular-nums"
                                                    value={l.minXpMotr || 0}
                                                    onChange={(e) => handleLevelChange(l.level, 'minXpMotr', parseInt(e.target.value) || 0)}
                                                    onBlur={() => saveLevelConfig(l)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    {/* XP Articulación */}
                                    <tr className="hover:bg-muted/20">
                                        <td className="font-medium p-3 border-b border-r border-border bg-background sticky left-0 z-10">
                                            Min. XP Articulación
                                        </td>
                                        {levels.map(l => (
                                            <td key={l.level} className="p-2 border-b border-border text-center">
                                                <Input
                                                    type="number"
                                                    className="w-full max-w-[90px] text-center mx-auto tabular-nums"
                                                    value={l.minXpArt || 0}
                                                    onChange={(e) => handleLevelChange(l.level, 'minXpArt', parseInt(e.target.value) || 0)}
                                                    onBlur={() => saveLevelConfig(l)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    {/* Total XP */}
                                    <tr className="bg-muted font-semibold text-primary">
                                        <td className="p-3 border-b border-r border-border bg-muted sticky left-0 z-10">
                                            Total XP
                                        </td>
                                        {levels.map(l => (
                                            <td key={l.level} className="p-3 border-b border-border text-center tabular-nums bg-muted">
                                                {((l.minXpFlex || 0) + (l.minXpMotr || 0) + (l.minXpArt || 0)).toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    {/* Criteria Count with Tooltips */}
                                    <tr className="hover:bg-muted/20 bg-muted/5">
                                        <td className="font-medium p-3 border-r border-border bg-background sticky left-0 z-10">
                                            Criterios Definidos
                                        </td>
                                        {levels.map(l => {
                                            const levelCriteria = criteria.filter(c => c.level === l.level);
                                            const count = levelCriteria.length;
                                            return (
                                                <td key={l.level} className="p-3 text-center">
                                                    {count > 0 ? (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help underline decoration-dotted text-primary hover:text-primary/80 font-medium">
                                                                        {count}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-[280px] p-3">
                                                                    <p className="font-semibold text-xs mb-2">Criterios Nivel {l.level}:</p>
                                                                    <ul className="text-xs space-y-1">
                                                                        {levelCriteria.map(c => (
                                                                            <li key={c.id} className="flex items-start gap-1">
                                                                                <span className="text-muted-foreground">•</span>
                                                                                <span><strong>{c.skill}:</strong> {c.description}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ) : (
                                                        <span className="text-muted-foreground">0</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* XP Requirements */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex flex-wrap justify-between items-center gap-2">
                                <span className="text-base">{isLastLevel ? `Requisitos de XP para completar Nivel ${currentLevelNum}` : `Requisitos de XP para ascender a Nivel ${nextLevelNum}`}</span>
                                <Button size="sm" onClick={() => saveLevelConfig(currentLevelConfig)} className="text-xs sm:text-sm whitespace-nowrap">
                                    <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    <span className="hidden xs:inline">Guardar Configuración</span>
                                    <span className="xs:hidden">Guardar</span>
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Min. XP Flexibilidad {isLastLevel ? "" : `para Nivel ${nextLevelNum}`}</Label>
                                    <Input
                                        type="number"
                                        value={currentLevelConfig?.minXpFlex || 0}
                                        onChange={e => handleLevelChange(parseInt(activeLevel), 'minXpFlex', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min. XP Motricidad {isLastLevel ? "" : `para Nivel ${nextLevelNum}`}</Label>
                                    <Input
                                        type="number"
                                        value={currentLevelConfig?.minXpMotr || 0}
                                        onChange={e => handleLevelChange(parseInt(activeLevel), 'minXpMotr', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min. XP Articulación {isLastLevel ? "" : `para Nivel ${nextLevelNum}`}</Label>
                                    <Input
                                        type="number"
                                        value={currentLevelConfig?.minXpArt || 0}
                                        onChange={e => handleLevelChange(parseInt(activeLevel), 'minXpArt', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Key Criteria */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex flex-wrap justify-between items-center gap-2">
                                <span className="text-base">{isLastLevel ? `Requisitos para completar Nivel ${currentLevelNum}` : `Requisitos de ascenso (Criterios para Nivel ${nextLevelNum})`}</span>
                                <Button size="sm" variant="outline" onClick={() => addCriteria(parseInt(activeLevel))} className="text-xs sm:text-sm whitespace-nowrap">
                                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    <span className="hidden xs:inline">Añadir Criterio</span>
                                    <span className="xs:hidden">Añadir</span>
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <UnifiedTable
                                data={currentCriteria}
                                keyField="id"
                                emptyMessage="No hay criterios definidos para este nivel."
                                paginated={false}
                                onRowClick={(item) => openCriteriaModal(item)}
                                columns={[
                                    {
                                        key: 'skill',
                                        label: 'Habilidad',
                                        mobileIsPrimary: true,
                                        render: (item) => (
                                            <span className="font-medium">{item.skill}</span>
                                        )
                                    },
                                    {
                                        key: 'source',
                                        label: 'Fuente',
                                        mobileLabel: 'Fuente',
                                        render: (item) => (
                                            <span>
                                                {item.source === 'PROF' ? 'Profesor' : 'Práctica'}
                                            </span>
                                        )
                                    },
                                    {
                                        key: 'required',
                                        label: 'Obligatorio',
                                        mobileLabel: 'Oblig.',
                                        render: (item) => (
                                            <span className={item.required ? 'text-[var(--color-primary)] font-medium' : 'text-muted-foreground'}>
                                                {item.required ? 'Sí' : 'No'}
                                            </span>
                                        )
                                    },
                                    {
                                        key: 'description',
                                        label: 'Descripción',
                                        mobileLabel: 'Desc.',
                                        mobileFullRow: true,
                                        render: (item) => (
                                            <span className="text-muted-foreground">
                                                {item.description || '—'}
                                            </span>
                                        )
                                    },
                                    {
                                        key: 'actions',
                                        label: 'Acciones',
                                        mobileLabel: '',
                                        rawValue: () => true, // Prevent filtering in mobile
                                        render: (item) => (
                                            <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openCriteriaModal(item)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteCriteria(item.id)}
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Importar del Nivel {parseInt(activeLevel) - 1}</DialogTitle>
                        <DialogDescription>
                            Selecciona los criterios que quieres copiar al nivel actual.
                            Se han filtrado automáticamente los que ya existen.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden min-h-[300px]">
                        <ScrollArea className="h-full pr-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={selectedImportIds.length === importCandidates.length && importCandidates.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedImportIds(importCandidates.map(c => c.id));
                                                    else setSelectedImportIds([]);
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead>Habilidad</TableHead>
                                        <TableHead>Descripción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {importCandidates.map(candidate => (
                                        <TableRow key={candidate.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedImportIds.includes(candidate.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedImportIds(prev => [...prev, candidate.id]);
                                                        else setSelectedImportIds(prev => prev.filter(id => id !== candidate.id));
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>{candidate.skill}</TableCell>
                                            <TableCell>{candidate.description}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
                        <Button onClick={executeImport} disabled={selectedImportIds.length === 0}>
                            Importar {selectedImportIds.length} Criterios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Criteria Modal - Drawer on mobile, Dialog on desktop */}
            {isDrawerMode ? (
                <Drawer open={editModalOpen} onOpenChange={setEditModalOpen}>
                    <DrawerContent className="flex flex-col rounded-t-xl bg-[var(--color-surface-card)] max-h-[85vh]">
                        <DrawerHeader className="border-b border-[var(--color-border-default)] pb-4">
                            <div className="flex items-center justify-between">
                                <DrawerTitle className="text-base font-semibold">Editar Criterio</DrawerTitle>
                                <DrawerClose asChild>
                                    <button
                                        onClick={cancelCriteriaEdit}
                                        className="p-2 rounded-full hover:bg-[var(--color-surface-muted)] transition-colors"
                                        aria-label="Cerrar"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </DrawerClose>
                            </div>
                            <DrawerDescription className="text-sm text-muted-foreground mt-1">
                                Modifica los campos del criterio de ascenso.
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="space-y-4 p-4 flex-1 overflow-y-auto">
                            {/* Habilidad */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Habilidad</label>
                                <Select
                                    value={editDraft.skill}
                                    onValueChange={(val) => setEditDraft(prev => ({ ...prev, skill: val }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Flexibilidad', 'Motricidad', 'Articulación', 'Sonido', 'Cognición'].map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Fuente */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fuente</label>
                                <Select
                                    value={editDraft.source}
                                    onValueChange={(val) => setEditDraft(prev => ({ ...prev, source: val }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PROF">Profesor</SelectItem>
                                        <SelectItem value="PRACTICA">Práctica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Descripción */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descripción</label>
                                <Input
                                    value={editDraft.description}
                                    onChange={(e) => setEditDraft(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Descripción del criterio..."
                                    className="w-full"
                                />
                            </div>

                            {/* Obligatorio */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Obligatorio</label>
                                <Switch
                                    checked={editDraft.required}
                                    onCheckedChange={(val) => setEditDraft(prev => ({ ...prev, required: val }))}
                                />
                            </div>
                        </div>
                        <DrawerFooter className="border-t border-[var(--color-border-default)] pt-4">
                            <div className="flex gap-2 w-full">
                                <Button variant="outline" onClick={cancelCriteriaEdit} className="flex-1">Cancelar</Button>
                                <Button onClick={saveCriteriaDraft} className="flex-1">Guardar</Button>
                            </div>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                    <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
                        <DialogHeader>
                            <DialogTitle>Editar Criterio</DialogTitle>
                            <DialogDescription>
                                Modifica los campos del criterio de ascenso.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {/* Habilidad */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Habilidad</label>
                                <Select
                                    value={editDraft.skill}
                                    onValueChange={(val) => setEditDraft(prev => ({ ...prev, skill: val }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Flexibilidad', 'Motricidad', 'Articulación', 'Sonido', 'Cognición'].map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Fuente */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fuente</label>
                                <Select
                                    value={editDraft.source}
                                    onValueChange={(val) => setEditDraft(prev => ({ ...prev, source: val }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PROF">Profesor</SelectItem>
                                        <SelectItem value="PRACTICA">Práctica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Descripción */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descripción</label>
                                <Input
                                    value={editDraft.description}
                                    onChange={(e) => setEditDraft(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Descripción del criterio..."
                                    className="w-full"
                                />
                            </div>

                            {/* Obligatorio */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Obligatorio</label>
                                <Switch
                                    checked={editDraft.required}
                                    onCheckedChange={(val) => setEditDraft(prev => ({ ...prev, required: val }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={cancelCriteriaEdit}>Cancelar</Button>
                            <Button onClick={saveCriteriaDraft}>Guardar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

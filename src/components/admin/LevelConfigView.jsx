import React, { useState, useEffect } from 'react';
import { localDataClient } from '@/api/localDataClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';

export default function LevelConfigView() {
    const [loading, setLoading] = useState(true);
    const [levels, setLevels] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [activeLevel, setActiveLevel] = useState('1');

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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    const currentLevelConfig = levels.find(l => l.level === parseInt(activeLevel));
    const currentCriteria = criteria.filter(c => c.level === parseInt(activeLevel));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Configuración de Niveles</h2>
            </div>

            <Tabs value={activeLevel} onValueChange={setActiveLevel} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                    {levels.map(l => (
                        <TabsTrigger key={l.level} value={String(l.level)}>Nivel {l.level}</TabsTrigger>
                    ))}
                </TabsList>

                <div className="mt-6 space-y-6">
                    {/* XP Requirements */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Requisitos de Experiencia (XP)
                                <Button size="sm" onClick={() => saveLevelConfig(currentLevelConfig)}>
                                    <Save className="w-4 h-4 mr-2" /> Guardar Configuración
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Min. XP Flexibilidad</Label>
                                    <Input
                                        type="number"
                                        value={currentLevelConfig?.minXpFlex || 0}
                                        onChange={e => handleLevelChange(parseInt(activeLevel), 'minXpFlex', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min. XP Motricidad</Label>
                                    <Input
                                        type="number"
                                        value={currentLevelConfig?.minXpMotr || 0}
                                        onChange={e => handleLevelChange(parseInt(activeLevel), 'minXpMotr', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Min. XP Articulación</Label>
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
                            <CardTitle className="flex justify-between items-center">
                                Criterios Clave
                                <Button size="sm" variant="outline" onClick={() => addCriteria(parseInt(activeLevel))}>
                                    <Plus className="w-4 h-4 mr-2" /> Añadir Criterio
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Habilidad</TableHead>
                                        <TableHead>Fuente</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Obligatorio</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentCriteria.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No hay criterios definidos para este nivel.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {currentCriteria.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>
                                                <Select
                                                    value={c.skill}
                                                    onValueChange={val => updateCriteria(c.id, { skill: val })}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['Flexibilidad', 'Motricidad', 'Articulación', 'Sonido', 'Cognición'].map(s => (
                                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={c.source}
                                                    onValueChange={val => updateCriteria(c.id, { source: val })}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="PROF">Profesor</SelectItem>
                                                        <SelectItem value="PRACTICA">Práctica</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={c.description}
                                                    onChange={e => updateCriteria(c.id, { description: e.target.value })}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={c.required}
                                                    onCheckedChange={val => updateCriteria(c.id, { required: val })}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => deleteCriteria(c.id)}>
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </Tabs>
        </div>
    );
}

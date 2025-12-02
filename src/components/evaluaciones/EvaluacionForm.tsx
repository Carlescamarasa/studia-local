import React, { useState } from 'react';
import { useEvaluaciones } from '@/hooks/useEvaluaciones';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Loader2, Save, X } from 'lucide-react';
import { format } from 'date-fns';

interface EvaluacionFormProps {
    alumnoId: string;
    onClose?: () => void;
}

import { useEffectiveUser } from '@/components/utils/helpers';

export default function EvaluacionForm({ alumnoId, onClose }: EvaluacionFormProps) {
    const { createEvaluacion, isCreating } = useEvaluaciones(alumnoId);
    const effectiveUser = useEffectiveUser();

    const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [notas, setNotas] = useState('');

    // Habilidades (0-10)
    const [sonido, setSonido] = useState([5]);
    const [flexibilidad, setFlexibilidad] = useState([5]);
    const [cognitivo, setCognitivo] = useState([5]);

    // Habilidades (BPM)
    const [motricidad, setMotricidad] = useState('');
    const [articulacionT, setArticulacionT] = useState('');
    const [articulacionTK, setArticulacionTK] = useState('');
    const [articulacionTTK, setArticulacionTTK] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const nuevaEvaluacion = {
            alumnoId,
            profesorId: effectiveUser?.id || 'unknown', // Use real ID
            fecha: new Date(fecha).toISOString(),
            habilidades: {
                sonido: sonido[0],
                flexibilidad: flexibilidad[0],
                cognitivo: cognitivo[0],
                motricidad: motricidad ? parseInt(motricidad) : undefined,
                articulacion: {
                    t: articulacionT ? parseInt(articulacionT) : undefined,
                    tk: articulacionTK ? parseInt(articulacionTK) : undefined,
                    ttk: articulacionTTK ? parseInt(articulacionTTK) : undefined,
                }
            },
            notas: notas.trim() || undefined
        };

        try {
            await createEvaluacion(nuevaEvaluacion);
            if (onClose) onClose();
        } catch (error) {
            console.error('Error al guardar evaluación:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                    <Label htmlFor="fecha">Fecha de Evaluación</Label>
                    <Input
                        id="fecha"
                        type="date"
                        value={fecha}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFecha(e.target.value)}
                        required
                    />
                </div>

                {/* Sliders (0-10) */}
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Cualidades (0-10)</h4>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Sonido</Label>
                            <span className="text-sm font-mono">{sonido[0]}</span>
                        </div>
                        <Slider
                            value={sonido}
                            onValueChange={setSonido}
                            max={10}
                            step={1}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Flexibilidad</Label>
                            <span className="text-sm font-mono">{flexibilidad[0]}</span>
                        </div>
                        <Slider
                            value={flexibilidad}
                            onValueChange={setFlexibilidad}
                            max={10}
                            step={1}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Cognitivo / Lectura</Label>
                            <span className="text-sm font-mono">{cognitivo[0]}</span>
                        </div>
                        <Slider
                            value={cognitivo}
                            onValueChange={setCognitivo}
                            max={10}
                            step={1}
                        />
                    </div>
                </div>

                {/* Inputs Numéricos (BPM) */}
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Velocidad (BPM)</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="motricidad">Motricidad</Label>
                            <Input
                                id="motricidad"
                                type="number"
                                placeholder="Ej: 90"
                                value={motricidad}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMotricidad(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="artT">Articulación (T)</Label>
                            <Input
                                id="artT"
                                type="number"
                                placeholder="Ej: 100"
                                value={articulacionT}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArticulacionT(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="artTK">Articulación (TK)</Label>
                            <Input
                                id="artTK"
                                type="number"
                                placeholder="Ej: 80"
                                value={articulacionTK}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArticulacionTK(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="artTTK">Articulación (TTK)</Label>
                            <Input
                                id="artTTK"
                                type="number"
                                placeholder="Ej: 60"
                                value={articulacionTTK}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArticulacionTTK(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notas">Notas / Observaciones</Label>
                    <Textarea
                        id="notas"
                        placeholder="Comentarios sobre el progreso..."
                        value={notas}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotas(e.target.value)}
                        rows={3}
                    />
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                {onClose && (
                    <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Evaluación
                </Button>
            </div>
        </form>
    );
}

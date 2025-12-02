import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Volume2, VolumeX, Minus, Plus } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";

export default function Metronomo({ initialBpm = 60, onPpmChange }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(initialBpm);
    const [unidad, setUnidad] = useState('negra'); // negra, blanca, blancaConPuntillo, corchea
    const [volume, setVolume] = useState(0.5);

    const audioContextRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const timerIDRef = useRef(null);
    const lookahead = 25.0; // ms
    const scheduleAheadTime = 0.1; // s

    // Factores de conversión respecto a la negra (1)
    const unitFactors = {
        negra: 1,
        blanca: 0.5, // 1 blanca = 2 negras (tempo más lento si BPM es de negras, pero si BPM es de blancas...)
        // Si BPM es "pulsos por minuto" y la unidad es el pulso:
        // 60 BPM negra = 60 negras/min.
        // 60 BPM blanca = 60 blancas/min.
        // El metrónomo marca PULSOS. La unidad solo define qué figura representa ese pulso.
        // PERO, si queremos registrar "ppmAlcanzado" con unidad, simplemente pasamos el valor.
        // El sonido del metrónomo siempre es "BPM" clicks por minuto.
        // La unidad es metadato para el registro.
        blancaConPuntillo: 1, // Placeholder
        corchea: 1, // Placeholder
    };

    // Inicializar AudioContext
    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (timerIDRef.current) {
                clearTimeout(timerIDRef.current);
            }
        };
    }, []);

    const nextNote = useCallback(() => {
        const secondsPerBeat = 60.0 / bpm;
        nextNoteTimeRef.current += secondsPerBeat;
    }, [bpm]);

    const playClick = (time) => {
        const osc = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        osc.frequency.value = 1000;
        gainNode.gain.value = volume;

        osc.start(time);
        osc.stop(time + 0.05);
    };

    const scheduler = useCallback(() => {
        while (nextNoteTimeRef.current < audioContextRef.current.currentTime + scheduleAheadTime) {
            playClick(nextNoteTimeRef.current);
            nextNote();
        }
        timerIDRef.current = setTimeout(scheduler, lookahead);
    }, [nextNote, volume]); // volume dependency added to update gain if needed (though gain is created per click)

    useEffect(() => {
        if (isPlaying) {
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
            nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
            scheduler();
        } else {
            if (timerIDRef.current) {
                clearTimeout(timerIDRef.current);
            }
        }
    }, [isPlaying, scheduler]);

    useEffect(() => {
        if (onPpmChange) {
            onPpmChange({ bpm, unidad });
        }
    }, [bpm, unidad, onPpmChange]);

    const adjustBpm = (delta) => {
        setBpm(prev => Math.max(30, Math.min(300, prev + delta)));
    };

    return (
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Metrónomo</h3>
                    <Badge variant="outline" className="text-xs font-mono">
                        {bpm} BPM
                    </Badge>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustBpm(-5)}><Minus className="w-3 h-3" /></Button>
                    <Slider
                        value={[bpm]}
                        onValueChange={(vals) => setBpm(vals[0])}
                        min={30}
                        max={250}
                        step={1}
                        className="flex-1"
                    />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjustBpm(5)}><Plus className="w-3 h-3" /></Button>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={unidad} onValueChange={setUnidad}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="negra">Negra (♩)</SelectItem>
                            <SelectItem value="blanca">Blanca (d)</SelectItem>
                            <SelectItem value="blancaConPuntillo">Blanca c/p (d.)</SelectItem>
                            <SelectItem value="corchea">Corchea (♪)</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                        {volume === 0 ? <VolumeX className="w-4 h-4 text-[var(--color-text-tertiary)]" /> : <Volume2 className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                        <Slider
                            value={[volume]}
                            onValueChange={(vals) => setVolume(vals[0])}
                            min={0}
                            max={1}
                            step={0.1}
                            className="w-20"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

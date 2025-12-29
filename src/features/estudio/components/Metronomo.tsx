import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ds/Badge";
import { Slider } from "@/features/shared/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Play, Pause, Volume2, VolumeX, Minus, Plus, Timer } from "lucide-react";
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
        blanca: 0.5,
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
    }, [nextNote, volume]);

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
        return () => {
            if (timerIDRef.current) {
                clearTimeout(timerIDRef.current);
            }
        };
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
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-xl p-3 shadow-sm flex flex-col gap-3">
            {/* Fila 1: Icono, Play, BPM Badge, Select, Volume */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg">
                        <Timer className="w-4 h-4" />
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </Button>

                    <Badge variant="outline" className="text-sm font-mono h-8 px-2.5 min-w-[4.5rem] justify-center bg-background shrink-0">
                        {bpm} <span className="text-[10px] text-[var(--color-text-tertiary)] ml-1">BPM</span>
                    </Badge>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Select value={unidad} onValueChange={setUnidad}>
                        <SelectTrigger className="h-8 w-[100px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="negra">Negra (♩)</SelectItem>
                            <SelectItem value="blanca">Blanca (d)</SelectItem>
                            <SelectItem value="blancaConPuntillo">Blanca c/p (d.)</SelectItem>
                            <SelectItem value="corchea">Corchea (♪)</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-border-default)]">
                        <button
                            onClick={() => setVolume(v => v === 0 ? 0.5 : 0)}
                            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Fila 2: Slider + Botones +/- */}
            <div className="flex items-center gap-3 bg-[var(--color-surface-muted)]/50 p-2 rounded-lg">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                    onClick={() => adjustBpm(-5)}
                >
                    <Minus className="w-3.5 h-3.5" />
                </Button>

                <Slider
                    value={[bpm]}
                    onValueChange={(vals) => setBpm(vals[0])}
                    min={30}
                    max={250}
                    step={1}
                    className="flex-1 touch-none"
                />

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                    onClick={() => adjustBpm(5)}
                >
                    <Plus className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
    );
}

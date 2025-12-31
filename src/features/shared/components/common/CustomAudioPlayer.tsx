import React, { useRef, useState, useEffect } from 'react';
import { Slider } from "@/features/shared/components/ui/slider";
import { Button } from "@/features/shared/components/ds/Button";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomAudioPlayerProps {
    src: string;
    className?: string;
    [key: string]: any;
}

const CustomAudioPlayer = ({ src, className, ...props }: CustomAudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
        }
    };

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleSpeedChange = (value: number[]) => {
        setPlaybackRate(value[0]);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className={cn("bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-xl p-3 shadow-sm", className)} {...props}>
            <audio ref={audioRef} src={src} preload="metadata" />

            <div className="flex flex-col gap-2">
                {/* Row 1: Controls + Progress */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full hover:bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                        onClick={togglePlay}
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </Button>

                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="w-full cursor-pointer"
                    />
                </div>

                {/* Row 2: Info + Speed */}
                <div className="flex items-center justify-between px-1 gap-4">
                    <div className="text-[10px] text-[var(--color-text-secondary)] font-mono tabular-nums shrink-0">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>

                    <div className="flex items-center gap-3 bg-[var(--color-surface-default)] rounded-full px-3 py-1 border border-[var(--color-border-default)] w-1/2">
                        <span className="text-[10px] font-medium text-[var(--color-text-secondary)] w-8 text-right shrink-0">
                            {playbackRate.toFixed(1)}x
                        </span>
                        <Slider
                            value={[playbackRate]}
                            min={0.5}
                            max={2.0}
                            step={0.1}
                            onValueChange={handleSpeedChange}
                            className="flex-1"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

};

export default CustomAudioPlayer;

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Piano } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/SidebarState";

// Helper to get frequency from semitone offset relative to A4 (440)
const getFreq = (semitonesFromA4) => 440 * Math.pow(2, semitonesFromA4 / 12);

// NOTE DEFINITIONS
// "name": Unique ID for React keys and logic
// "type": white/black keys
// "writtenMidi": The MIDI number corresponding to the WRITTEN note (e.g., C4 = 60)
// "label": The label displayed on the key (WRITTEN pitch)
const WRITTEN_NOTES = [
    { name: "F#2", type: "black", writtenMidi: 42, label: "Fa#" },
    { name: "G2", type: "white", writtenMidi: 43, label: "Sol" },
    { name: "G#2", type: "black", writtenMidi: 44, label: "Sol#" },
    { name: "A2", type: "white", writtenMidi: 45, label: "La" },
    { name: "A#2", type: "black", writtenMidi: 46, label: "Sib" },
    { name: "B2", type: "white", writtenMidi: 47, label: "Si" },
    { name: "C3", type: "white", writtenMidi: 48, label: "Do" },
    { name: "C#3", type: "black", writtenMidi: 49, label: "Do#" },
    { name: "D3", type: "white", writtenMidi: 50, label: "Re" },
    { name: "D#3", type: "black", writtenMidi: 51, label: "Mib" },
    { name: "E3", type: "white", writtenMidi: 52, label: "Mi" },
    { name: "F3", type: "white", writtenMidi: 53, label: "Fa" },
    { name: "F#3", type: "black", writtenMidi: 54, label: "Fa#" },
    { name: "G3", type: "white", writtenMidi: 55, label: "Sol" },
    { name: "G#3", type: "black", writtenMidi: 56, label: "Sol#" },
    { name: "A3", type: "white", writtenMidi: 57, label: "La" },
    { name: "A#3", type: "black", writtenMidi: 58, label: "Sib" },
    { name: "B3", type: "white", writtenMidi: 59, label: "Si" },
    { name: "C4", type: "white", writtenMidi: 60, label: "Do" },
    { name: "C#4", type: "black", writtenMidi: 61, label: "Do#" },
    { name: "D4", type: "white", writtenMidi: 62, label: "Re" },
    { name: "D#4", type: "black", writtenMidi: 63, label: "Mib" },
    { name: "E4", type: "white", writtenMidi: 64, label: "Mi" },
    { name: "F4", type: "white", writtenMidi: 65, label: "Fa" },
    { name: "F#4", type: "black", writtenMidi: 66, label: "Fa#" },
    { name: "G4", type: "white", writtenMidi: 67, label: "Sol" },
    { name: "G#4", type: "black", writtenMidi: 68, label: "Sol#" },
    { name: "A4", type: "white", writtenMidi: 69, label: "La" },
    { name: "A#4", type: "black", writtenMidi: 70, label: "Sib" },
    { name: "B4", type: "white", writtenMidi: 71, label: "Si" },
    { name: "C5", type: "white", writtenMidi: 72, label: "Do" },
];

export default function PianoPanel({ isOpen, onClose, bottomOffset = 80 }) {
    const audioContextRef = useRef(null);
    // Map of active notes: noteName -> { osc, gain, intervalId? }
    const activeNotes = useRef(new Map());
    const panelRef = useRef(null);

    // Sidebar state for positioning
    const { abierto } = useSidebar();
    const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

    // Detect desktop vs mobile
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Init AudioContext on open
    useEffect(() => {
        if (isOpen && !audioContextRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            // Low latency hint for interactive audio
            audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });
        }
    }, [isOpen]);

    // Cleanup on unmount or close?
    useEffect(() => {
        // We don't necessarily close context on close, to keep it ready? 
        // But we should stop sounds if closed while playing.
        if (!isOpen) {
            stopAllSounds();
        }
        return () => {
            stopAllSounds();
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => { });
                audioContextRef.current = null;
            }
        };
    }, [isOpen]);

    const stopAllSounds = () => {
        activeNotes.current.forEach(({ osc, gain }) => {
            try {
                const now = audioContextRef.current?.currentTime || 0;
                gain.gain.cancelScheduledValues(now);
                gain.gain.setValueAtTime(gain.gain.value, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.stop(now + 0.1);
                setTimeout(() => {
                    osc.disconnect();
                    gain.disconnect();
                }, 200);
            } catch (e) { }
        });
        activeNotes.current.clear();
    };

    const startNote = (note, e) => {
        // Prevent default to stop scrolling/selecting on touch
        if (e && e.cancelable) { e.preventDefault(); }
        // Capture pointer if available to track release outside
        if (e && e.target && e.target.setPointerCapture) {
            try { e.target.setPointerCapture(e.pointerId); } catch (err) { }
        }

        if (!audioContextRef.current) return;
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        // Don't restart if already playing (multi-touch safety)
        if (activeNotes.current.has(note.name)) return;

        // Transposition Logic:
        // Written C (60) -> Sound Bb (58)
        // Sound = Written - 2
        const concertMidi = note.writtenMidi - 2;
        const semitonesFromA4 = concertMidi - 69;
        const freq = getFreq(semitonesFromA4);

        const osc = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        osc.type = 'triangle'; // Smooth enough resembling brass/strings
        osc.frequency.value = freq;

        osc.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        const now = audioContextRef.current.currentTime;

        // Attack
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.02); // Fast attack

        osc.start(now);

        activeNotes.current.set(note.name, { osc, gain: gainNode });
    };

    const stopNote = (note, e) => {
        if (e && e.preventDefault && e.cancelable) e.preventDefault();

        const active = activeNotes.current.get(note.name);
        if (!active) return;

        const { osc, gain } = active;
        const now = audioContextRef.current.currentTime;

        // Release
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // Short release

        osc.stop(now + 0.15);

        // Cleanup
        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, 200);

        activeNotes.current.delete(note.name);
    };

    return (
        <div
            ref={panelRef}
            className={cn(
                "fixed left-0 right-0 border-t border-[var(--color-border-default)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out z-40 bg-[var(--color-surface-elevated)]",
                isOpen ? "translate-y-0" : "translate-y-[100%]"
            )}
            style={{
                // Align bottom with top of footer dynamically
                bottom: `${bottomOffset}px`,
                // Shift left when sidebar is open on desktop
                left: isDesktop && abierto ? '280px' : '0',
                // Adjust height relative to view if needed, but simple flex container is fine
                paddingBottom: 'env(safe-area-inset-bottom)', // just in case
            }}
        >
            {/* Header */}
            <div className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border-default)] py-1.5">
                <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
                        <Piano className="w-3.5 h-3.5" />
                        <span>Piano (Transpositor Si♭)</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0 hover:bg-black/5">
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Keys Container */}
            <div className="p-0 overflow-x-auto bg-[var(--color-surface-elevated)] flex justify-center w-full touch-pan-x">
                <div className="flex relative select-none" style={{ height: '140px', minWidth: 'fit-content', paddingBottom: '0', paddingLeft: '12px' }}>
                    {/* Render White Keys + Labels */}
                    {WRITTEN_NOTES.map((note, idx) => {
                        const isWhite = note.type === 'white';
                        if (!isWhite) return null;

                        // Check if this is the FIRST white key for left border
                        // Start searching from 0. If current is first found white, add border.
                        const isFirstWhite = WRITTEN_NOTES.find(n => n.type === 'white') === note;

                        return (
                            <div key={note.name} className="relative h-full flex flex-col justify-start">
                                <button
                                    className="w-10 h-[100px] bg-white active:bg-gray-100 relative focus:outline-none touch-none rounded-b-[4px]"
                                    style={{
                                        // Use border-right for separation, explicit color
                                        borderRight: '2px solid #e5e7eb', // Thicker separation
                                        borderLeft: isFirstWhite ? '2px solid #e5e7eb' : 'none',
                                        borderBottom: '2px solid #e5e7eb',
                                        zIndex: 1,
                                        boxSizing: 'border-box'
                                    }}
                                    onPointerDown={(e) => startNote(note, e)}
                                    onPointerUp={(e) => stopNote(note, e)}
                                    onPointerLeave={(e) => stopNote(note, e)}
                                    onPointerCancel={(e) => stopNote(note, e)}
                                />
                                {/* Label Zone - Only for WHITE keys */}
                                <div className="h-[40px] w-full flex items-center justify-center pointer-events-none select-none">
                                    <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                                        {note.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Black Keys - Positioned absolute on top */}
                    {WRITTEN_NOTES.map((note, idx) => {
                        if (note.type !== 'black') return null;

                        const notesBefore = WRITTEN_NOTES.slice(0, idx);
                        const whiteCount = notesBefore.filter(n => n.type === 'white').length;

                        // White key width is w-10 = 40px in Tailwind (usually)
                        const whiteKeyWidth = 40;
                        const blackKeyWidth = 24;

                        // Calculate visual offset
                        const leftPos = (whiteCount * whiteKeyWidth) - (blackKeyWidth / 2);

                        // Match offset with container padding (+12px)
                        // This aligns black keys to be centered on the boundary of white keys (which are shifted by padding)
                        const finalLeft = leftPos + 12;

                        return (
                            <button
                                key={note.name}
                                className="absolute w-6 h-[65px] bg-black active:bg-gray-800 rounded-b-[4px] z-10 focus:outline-none touch-none shadow-md border border-gray-900 ring-1 ring-white/10"
                                style={{
                                    left: `${finalLeft}px`,
                                    top: 0
                                }}
                                onPointerDown={(e) => startNote(note, e)}
                                onPointerUp={(e) => stopNote(note, e)}
                                onPointerLeave={(e) => stopNote(note, e)}
                                onPointerCancel={(e) => stopNote(note, e)}
                            >
                                {/* No label for black keys as requested */}
                            </button>
                        );
                    })}

                    {/* Padding right to handle last key border? */}
                    <div className="w-[12px] h-full shrink-0" />
                </div>
            </div>
        </div>
    );
}

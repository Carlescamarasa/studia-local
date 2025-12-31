import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { X, Piano, ChevronUp, ChevronDown, Play, Pause, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarSafe } from "@/features/shared/components/ui/SidebarState";
import {
    concertToTrumpetWritten,
    midiToNoteInfo,
    formatNoteLabel
} from "@/utils/musicTransposition";

// Trumpet Icon Component - Based on trompet.svg, adapted for currentColor
const TrumpetIcon = ({ className = "w-4 h-4", style = {} }: { className?: string; style?: React.CSSProperties }) => (
    <svg
        className={className}
        style={style}
        viewBox="0 0 1920 1920"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="50"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {/* Mouthpiece */}
        <path fill="none" d="M296 977.7h-20c-32.5 0-59-26.6-59-59V800.2c0-32.5 26.6-59 59-59h20c32.4 0 59 26.5 59 59v118.5c0 32.5-26.6 59-59 59z" />
        {/* Bell and body */}
        <path fill="none" d="M1346.7 928.5c29.6 46.2 46.8 101 46.8 159.7 0 81.9-33.5 156.3-87.4 210.3-54 54-128.4 87.4-210.3 87.4H788.3c-163.7 0-297.7-134-297.7-297.7 0-29.3 4.3-57.7 12.3-84.5 8-26.8 19.7-52.1 34.5-75.2" />
        <path fill="none" d="M537.3 928.5c53-82.8 145.8-138 251-138" />
        <path fill="none" d="M1108 928.9c-4-.3-8.1-.5-12.2-.5H788.3c-87.8 0-159.7 71.9-159.7 159.7 0 43.9 18 83.8 46.9 112.8 28.9 28.9 68.9 46.9 112.8 46.9h307.5c87.8 0 159.7-71.9 159.7-159.7 0-41.8-16.3-80.1-42.9-108.6-26.7-28.5-63.5-47.4-104.6-50.6l238.8-.5h46.8c126.5 81.1 309.6 358.4 309.6 358.4V432s-183.1 277.3-309.6 358.4H355v138h182.3" />
        {/* Valves */}
        <path fill="none" d="M942 928.5v319.3M800.2 928.5v319.3M1083.7 928.5v319.3M942 659.8v130.6M800.2 659.8v130.6M1083.7 659.8v130.6" />
        {/* Valve caps */}
        <path fill="none" d="M766.4 659.8H834M908.2 659.8h67.6M1049.9 659.8h67.6" />
    </svg>
);

// InfoTooltip Component - Accessible tooltip with ⓘ icon
const InfoTooltip = ({ text }: { text: string }) => {
    const [isVisible, setIsVisible] = useState(false);
    const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`);

    return (
        <span className="relative inline-flex items-center ml-1">
            <button
                type="button"
                className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] transition-colors"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onFocus={() => setIsVisible(true)}
                onBlur={() => setIsVisible(false)}
                aria-describedby={tooltipId.current}
            >
                <Info className="w-3 h-3 text-[var(--color-text-secondary)]" />
            </button>
            {isVisible && (
                <span
                    id={tooltipId.current}
                    role="tooltip"
                    className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] leading-tight whitespace-nowrap rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-lg border border-[var(--color-border-default)]"
                >
                    {text}
                </span>
            )}
        </span>
    );
};

// Helper to get frequency from semitone offset relative to A4 (440)
const getFreq = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);

/**
 * Convert piano key MIDI to concert pitch MIDI based on pianoKey mode.
 * - 'Do' (C): no transposition, piano sounds as concert pitch
 * - 'Sib' (Bb): piano acts as Bb instrument, concert = piano - 2 semitones
 * @param {number} pianoKeyMidi - MIDI number of the pressed piano key
 * @param {string} pianoKey - 'Do' or 'Sib'
 * @returns {number} Concert pitch MIDI
 */
const pianoToConcertMidi = (pianoKeyMidi: number, pianoKey: string) => {
    if (pianoKey === 'Do') return pianoKeyMidi;
    // Bb instrument: written G (67) sounds as concert F (65), i.e., -2 semitones
    return pianoKeyMidi - 2;
};

// NOTE DEFINITIONS
// "name": Unique ID for React keys and logic
// "type": white/black keys
// "writtenMidi": The MIDI number corresponding to the WRITTEN note (e.g., C4 = 60)
// "label": The label displayed on the key (WRITTEN pitch)
// "accidental": explicitly used for Staff display (null, '#')
// "enharmonic": Alternate name (e.g. Do# -> Reb)
interface NoteDef {
    name: string;
    type: 'white' | 'black';
    writtenMidi: number;
    label: string;
    accidental: string | null;
    enharmonic?: string;
}

const WRITTEN_NOTES: NoteDef[] = [
    { name: "F#2", type: "black", writtenMidi: 42, label: "Fa#", accidental: '#', enharmonic: "Solb" },
    { name: "G2", type: "white", writtenMidi: 43, label: "Sol", accidental: null },
    { name: "G#2", type: "black", writtenMidi: 44, label: "Sol#", accidental: '#', enharmonic: "Lab" },
    { name: "A2", type: "white", writtenMidi: 45, label: "La", accidental: null },
    { name: "A#2", type: "black", writtenMidi: 46, label: "Sib", accidental: 'b', enharmonic: "La#" },
    { name: "B2", type: "white", writtenMidi: 47, label: "Si", accidental: null },
    { name: "C3", type: "white", writtenMidi: 48, label: "Do", accidental: null },
    { name: "C#3", type: "black", writtenMidi: 49, label: "Do#", accidental: '#', enharmonic: "Reb" },
    { name: "D3", type: "white", writtenMidi: 50, label: "Re", accidental: null },
    { name: "D#3", type: "black", writtenMidi: 51, label: "Mib", accidental: 'b', enharmonic: "Re#" },
    { name: "E3", type: "white", writtenMidi: 52, label: "Mi", accidental: null },
    { name: "F3", type: "white", writtenMidi: 53, label: "Fa", accidental: null },
    { name: "F#3", type: "black", writtenMidi: 54, label: "Fa#", accidental: '#', enharmonic: "Solb" },
    { name: "G3", type: "white", writtenMidi: 55, label: "Sol", accidental: null },
    { name: "G#3", type: "black", writtenMidi: 56, label: "Sol#", accidental: '#', enharmonic: "Lab" },
    { name: "A3", type: "white", writtenMidi: 57, label: "La", accidental: null },
    { name: "A#3", type: "black", writtenMidi: 58, label: "Sib", accidental: 'b', enharmonic: "La#" },
    { name: "B3", type: "white", writtenMidi: 59, label: "Si", accidental: null },
    { name: "C4", type: "white", writtenMidi: 60, label: "Do", accidental: null },
    { name: "C#4", type: "black", writtenMidi: 61, label: "Do#", accidental: '#', enharmonic: "Reb" },
    { name: "D4", type: "white", writtenMidi: 62, label: "Re", accidental: null },
    { name: "D#4", type: "black", writtenMidi: 63, label: "Mib", accidental: 'b', enharmonic: "Re#" },
    { name: "E4", type: "white", writtenMidi: 64, label: "Mi", accidental: null },
    { name: "F4", type: "white", writtenMidi: 65, label: "Fa", accidental: null },
    { name: "F#4", type: "black", writtenMidi: 66, label: "Fa#", accidental: '#', enharmonic: "Solb" },
    { name: "G4", type: "white", writtenMidi: 67, label: "Sol", accidental: null },
    { name: "G#4", type: "black", writtenMidi: 68, label: "Sol#", accidental: '#', enharmonic: "Lab" },
    { name: "A4", type: "white", writtenMidi: 69, label: "La", accidental: null },
    { name: "A#4", type: "black", writtenMidi: 70, label: "Sib", accidental: 'b', enharmonic: "La#" },
    { name: "B4", type: "white", writtenMidi: 71, label: "Si", accidental: null },
    { name: "C5", type: "white", writtenMidi: 72, label: "Do", accidental: null },
    { name: "C#5", type: "black", writtenMidi: 73, label: "Do#", accidental: '#', enharmonic: "Reb" },
    { name: "D5", type: "white", writtenMidi: 74, label: "Re", accidental: null },
    { name: "D#5", type: "black", writtenMidi: 75, label: "Mib", accidental: 'b', enharmonic: "Re#" },
    { name: "E5", type: "white", writtenMidi: 76, label: "Mi", accidental: null },
    { name: "F5", type: "white", writtenMidi: 77, label: "Fa", accidental: null },
    { name: "F#5", type: "black", writtenMidi: 78, label: "Fa#", accidental: '#', enharmonic: "Solb" },
    { name: "G5", type: "white", writtenMidi: 79, label: "Sol", accidental: null },
    { name: "G#5", type: "black", writtenMidi: 80, label: "Sol#", accidental: '#', enharmonic: "Lab" },
    { name: "A5", type: "white", writtenMidi: 81, label: "La", accidental: null },
    { name: "A#5", type: "black", writtenMidi: 82, label: "Sib", accidental: 'b', enharmonic: "La#" },
    { name: "B5", type: "white", writtenMidi: 83, label: "Si", accidental: null },
    { name: "C6", type: "white", writtenMidi: 84, label: "Do", accidental: null },
];

// Visible Range for Trumpet: F#3 (Index 12) to C6 (Index 44 - last)
// We will slice the array for rendering, but keep logic referencing original WRITTEN_NOTES 
// to avoid breaking lookup by index if not careful.
// Actually, let's just create a subset to map over.
const VISIBLE_NOTES = WRITTEN_NOTES.slice(12); // From F#3 onwards

// TRUMPET FINGERINGS DATA
// Key = Note Name (approximate matching) considering the range Fa#3 to Do6
// 0 = Open, 1, 2, 3 = Pistons
const TRUMPET_FINGERINGS: Record<string, number[]> = {
    // Octave 3 (Low)
    'F#3': [1, 2, 3],
    'G3': [1, 3],
    'G#3': [2, 3], 'Ab3': [2, 3],
    'A3': [1, 2],
    'A#3': [1], 'Bb3': [1],
    'B3': [2],
    // Octave 4 (Mid)
    'C4': [0],
    'C#4': [1, 2, 3], 'Db4': [1, 2, 3],
    'D4': [1, 3],
    'D#4': [2, 3], 'Eb4': [2, 3],
    'E4': [1, 2],
    'F4': [1],
    'F#4': [2], 'Gb4': [2],
    'G4': [0],
    'G#4': [2, 3], 'Ab4': [2, 3],
    'A4': [1, 2],
    'A#4': [1], 'Bb4': [1],
    'B4': [2],
    // Octave 5 (High)
    'C5': [0],
    'C#5': [1, 2], 'Db5': [1, 2],
    'D5': [1],
    'D#5': [2], 'Eb5': [2],
    'E5': [0],
    'F5': [1],
    'F#5': [2], 'Gb5': [2],
    'G5': [0],
    'G#5': [2, 3], 'Ab5': [2, 3],
    'A5': [1, 2],
    'A#5': [1], 'Bb5': [1],
    'B5': [2],
    // Octave 6
    'C6': [0]
};

// SVG MUSIC STAFF COMPONENT - Larger, cleaner notation
const MusicStaff = ({ note }: { note: any }) => {
    // Larger dimensions for better visibility
    const staffHeight = 100;
    const spacing = 10;
    const line1Y = 70;

    // Use CSS variables for theme-aware colors
    const lineColor = 'var(--color-text-secondary)';
    const noteColor = 'var(--color-text-primary)';
    const mutedColor = 'var(--color-text-muted)';

    if (!note) {
        return (
            <svg width="100%" height={staffHeight} viewBox="0 0 140 100" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                {/* Empty staff lines */}
                {[0, 1, 2, 3, 4].map(i => {
                    const y = line1Y - (i * spacing);
                    return <line key={y} x1="5" y1={y} x2="135" y2={y} stroke={mutedColor} strokeWidth="0.8" />;
                })}
                {/* Treble Clef */}
                <text x="8" y="76" fontSize="85" fontFamily="'Noto Music', 'Bravura', 'Times New Roman', serif" fill={mutedColor}>𝄞</text>
            </svg>
        );
    }

    // Staff Drawing Logic
    const noteSteps: Record<string, number> = { "C": 0, "D": 1, "E": 2, "F": 3, "G": 4, "A": 5, "B": 6 };
    const match = note.name.match(/([A-G])([#b]?)(\d)/);
    if (!match) return null;

    const baseLetter = match[1];
    const octave = parseInt(match[3]);
    const stepOfLetter = noteSteps[baseLetter];
    const absStep = (octave - 4) * 7 + (stepOfLetter - 2); // E4 = step 0
    const cy = line1Y - (absStep * (spacing / 2));

    // Proper musical accidentals
    const accidental = note.name.includes('#') ? '♯' : (note.label.includes('b') || note.label.includes('ib') ? '♭' : null);

    return (
        <svg width="100%" height={staffHeight} viewBox="0 0 140 100" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
            {/* Staff Lines */}
            {[0, 1, 2, 3, 4].map(i => {
                const y = line1Y - (i * spacing);
                return <line key={y} x1="5" y1={y} x2="135" y2={y} stroke={lineColor} strokeWidth="0.8" />;
            })}

            {/* Treble Clef */}
            <text
                x="8"
                y="76"
                fontSize="85"
                fontFamily="'Noto Music', 'Bravura', 'Times New Roman', serif"
                fill={noteColor}
            >
                𝄞
            </text>

            {/* Ledger Lines */}
            {absStep <= -2 && (
                <line x1="75" y1={line1Y + 10} x2="105" y2={line1Y + 10} stroke={lineColor} strokeWidth="0.8" />
            )}
            {absStep <= -4 && (
                <line x1="75" y1={line1Y + 20} x2="105" y2={line1Y + 20} stroke={lineColor} strokeWidth="0.8" />
            )}
            {absStep >= 10 && (
                <line x1="75" y1={line1Y - 50} x2="105" y2={line1Y - 50} stroke={lineColor} strokeWidth="0.8" />
            )}
            {absStep >= 12 && (
                <line x1="75" y1={line1Y - 60} x2="105" y2={line1Y - 60} stroke={lineColor} strokeWidth="0.8" />
            )}

            {/* Note Head - stemless, larger */}
            <g transform={`translate(90, ${cy})`}>
                <ellipse cx="0" cy="0" rx="7" ry="5" fill={noteColor} transform="rotate(-12)" />

                {/* Accidental */}
                {accidental && (
                    <text
                        x="-18"
                        y="5"
                        fontSize="18"
                        fontFamily="'Noto Music', 'Bravura', 'Times New Roman', serif"
                        fill={noteColor}
                    >
                        {accidental}
                    </text>
                )}
            </g>
        </svg>
    );
};

interface PianoPanelProps {
    isOpen: boolean;
    onClose: () => void;
    bottomOffset?: number | string;
}

interface ActiveNote {
    osc: OscillatorNode;
    gain: GainNode;
    concertMidi: number;
}

export default function PianoPanel({ isOpen, onClose, bottomOffset = 80 }: PianoPanelProps) {
    const audioContextRef = useRef<AudioContext | null>(null);
    // Map of active notes: noteName -> { osc, gain, intervalId? }
    const activeNotes = useRef<Map<string, ActiveNote>>(new Map());
    const panelRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const sustainRef = useRef(false); // Ref for immediate audio logic

    // Sidebar state for positioning - safe access (returns defaults if no provider)
    const { abierto: sidebarAbierto } = useSidebarSafe();

    // Scroll to center on open - Adjusted to start at C4 (approx 140px)
    useLayoutEffect(() => {
        if (isOpen && scrollRef.current) {
            // Target C4 (Do central) to be on the left
            // VISIBLE_NOTES starts at F#3. White keys before C4: G3, A3, B3 (3 keys)
            // 3 * 44px (w-11) + 8px (padding) = 140px
            scrollRef.current.scrollLeft = 140;
        }
    }, [isOpen]);

    // Track which keys are currently pressed for visual highlighting
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

    // Feature State
    const [pianoMode, setPianoMode] = useState('Sib'); // 'Sib' | 'Do'
    const [trumpetMode, setTrumpetMode] = useState('Sib'); // 'Sib' | 'Do'
    const [lastNote, setLastNote] = useState<(NoteDef & { concertMidi?: number }) | null>(null); // { name, midi, label }
    const [isSustaining, setIsSustaining] = useState(false);

    // Sync Ref
    useEffect(() => {
        sustainRef.current = isSustaining;
        // If turning OFF sustain, stop all current notes immediately.
        // The user expects the "Hold" to stop holding, effectively silencing the sustained notes.
        if (!isSustaining) {
            stopAllSounds();
        }
    }, [isSustaining]);




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
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            // Low latency hint for interactive audio
            audioContextRef.current = new AudioContextClass({ latencyHint: 'interactive' });
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
        if (!audioContextRef.current) return;

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
            } catch (e) { /* Intentionally swallowed */ }
        });
        activeNotes.current.clear();
        setPressedKeys(new Set()); // Reset visual state
    };

    const startNote = (note: NoteDef, e?: React.PointerEvent<any>) => {
        // ALLOW default behavior to enable native scrolling
        // if (e && e.cancelable) { e.preventDefault(); }

        // Capture pointer if available to track release outside
        if (e && e.target && (e.target as Element).setPointerCapture) {
            try { (e.target as Element).setPointerCapture(e.pointerId); } catch (err) { /* Intentionally swallowed */ }
        }

        if (!audioContextRef.current) return;
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        // Toggle behavior: if in sustain mode and clicking the same note, stop it
        if (sustainRef.current && lastNote && lastNote.name === note.name && activeNotes.current.has(note.name)) {
            stopNote(note, e, true); // Force stop
            return;
        }

        // Monophonic: Force stop previous sounds and visual state
        stopAllSounds();

        // Calculate concert pitch based on pianoMode
        // pianoKeyMidi is the MIDI of the physical key pressed
        const pianoKeyMidi = note.writtenMidi;
        // Transpose to concert pitch based on piano mode
        const concertMidi = pianoToConcertMidi(pianoKeyMidi, pianoMode);

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

        // Store note with its concert pitch for display purposes
        activeNotes.current.set(note.name, { osc, gain: gainNode, concertMidi });

        // Update visual state
        setPressedKeys(prev => new Set(prev).add(note.name));
        setLastNote({ ...note, concertMidi });
    };

    const stopNote = (note: NoteDef, e?: React.PointerEvent<any> | null, force = false) => {
        if (e && e.preventDefault && e.cancelable) e.preventDefault();

        // If Sustain is ON, we do NOT stop the audio AND we keep the visual key pressed
        // The visual key will be cleared when the next note starts (via stopAllSounds called in startNote)
        if (sustainRef.current && !force) {
            return;
        }

        const active = activeNotes.current.get(note.name);
        if (!active) return; // Already stopped or not playing

        if (!audioContextRef.current) return;

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

        // Update visual state
        setPressedKeys(prev => {
            const next = new Set(prev);
            next.delete(note.name);
            return next;
        });
    };

    // Step Logic
    const handleStep = (direction: number) => { // 1 or -1
        if (!lastNote) return;
        const currentIdx = WRITTEN_NOTES.findIndex(n => n.name === lastNote.name);
        if (currentIdx === -1) return;

        const nextIdx = currentIdx + direction;
        if (nextIdx < 0 || nextIdx >= WRITTEN_NOTES.length) return;

        const nextNote = WRITTEN_NOTES[nextIdx];

        // Stop previous note if playing
        stopNote(lastNote, null, true); // Force stop

        // Play new note
        startNote(nextNote);

        // If NOT sustaining, we should stop it immediately?
        // The buttons implies "Play note". If hold is off, it plays short?
        // Let's assume buttons trigger a short 'beep' OR if sustain is on it stays.
        if (!sustainRef.current) {
            setTimeout(() => stopNote(nextNote, null, true), 300); // Short play
        }
    };

    return (
        <div
            ref={panelRef}
            className={cn(
                "fixed left-0 right-0 border-t border-[var(--color-border-default)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] transition-all duration-300 ease-out z-40 bg-[var(--color-surface-elevated)]",
                isOpen ? "translate-y-0" : "translate-y-[100%]"
            )}
            style={{
                // Use CSS custom property for synchronized animation with footer
                // No transition on bottom - rAF updates frame-by-frame for 1:1 tracking
                bottom: 'var(--footer-offset, 80px)',
                // Shift left when sidebar is open on desktop
                left: isDesktop && sidebarAbierto ? '280px' : '0',
                // Only transition transform (open/close) and left (sidebar)
                transition: 'transform 300ms ease-out, left 300ms ease-out',
            }}>
            {/* Header - aligned with studia page layout */}
            <div className="py-2 bg-[var(--color-surface-muted)] border-b border-[var(--color-border-default)]">
                <div className="max-w-5xl mx-auto px-2 sm:px-3 md:px-6 flex flex-wrap items-center justify-center sm:justify-between gap-y-2">

                    {/* LEFT: Piano Toggle */}
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
                        <Piano className="w-3.5 h-3.5" />
                        <div className="flex rounded-md p-0.5 bg-[var(--color-surface)]">
                            <button
                                onClick={() => setPianoMode('Do')}
                                className={cn("px-2.5 py-1 rounded text-[11px] font-medium transition-all",
                                    pianoMode === 'Do' ? "bg-[var(--color-accent)] shadow-sm text-white" : "hover:bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-secondary)]")}
                            >
                                Do
                            </button>
                            <button
                                onClick={() => setPianoMode('Sib')}
                                className={cn("px-2.5 py-1 rounded text-[11px] font-medium transition-all",
                                    pianoMode === 'Sib' ? "bg-[var(--color-accent)] shadow-sm text-white" : "hover:bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-secondary)]")}
                            >
                                Si♭
                            </button>
                        </div>
                        <InfoTooltip text="Do: suena como piano (concert) | Sib: suena transpuesto (Sol suena como Fa)" />
                    </div>

                    {/* CENTER: Controls < MANTENER > */}
                    <div className="flex items-center order-3 sm:order-none w-full sm:w-auto justify-center mt-1 sm:mt-0">
                        <button
                            onClick={() => handleStep(-1)}
                            disabled={!lastNote}
                            className="h-8 w-9 flex items-center justify-center rounded-l-md border transition-colors disabled:opacity-40"
                            style={{ backgroundColor: '#fff', borderColor: '#ddd', color: '#555' }}
                        >
                            <ChevronDown className="w-4 h-4 rotate-90" />
                        </button>
                        <button
                            onClick={() => setIsSustaining(!isSustaining)}
                            className="h-8 px-4 text-[11px] font-bold border-y transition-all"
                            style={{
                                backgroundColor: isSustaining ? 'var(--color-accent)' : '#fff',
                                color: isSustaining ? '#fff' : '#555',
                                borderColor: isSustaining ? 'var(--color-accent)' : '#ddd'
                            }}
                        >
                            {isSustaining ? "SOLTAR" : "MANTENER"}
                        </button>
                        <button
                            onClick={() => handleStep(1)}
                            disabled={!lastNote}
                            className="h-8 w-9 flex items-center justify-center rounded-r-md border transition-colors disabled:opacity-40"
                            style={{ backgroundColor: '#fff', borderColor: '#ddd', color: '#555' }}
                        >
                            <ChevronUp className="w-4 h-4 rotate-90" />
                        </button>
                    </div>

                    {/* RIGHT: Trumpet Toggle + Close */}
                    <div className="flex items-center gap-3">
                        {/* Trumpet Toggle - Mib/Do/Sib */}
                        <div className="flex items-center gap-1.5">
                            <TrumpetIcon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            <div className="flex rounded-md p-0.5 bg-[var(--color-surface)]">
                                <button
                                    onClick={() => setTrumpetMode('Mib')}
                                    className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                        trumpetMode === 'Mib' ? "bg-[var(--color-accent)] shadow-sm text-white" : "hover:bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-secondary)]")}
                                >
                                    Mi♭
                                </button>
                                <button
                                    onClick={() => setTrumpetMode('Do')}
                                    className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                        trumpetMode === 'Do' ? "bg-[var(--color-accent)] shadow-sm text-white" : "hover:bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-secondary)]")}
                                >
                                    Do
                                </button>
                                <button
                                    onClick={() => setTrumpetMode('Sib')}
                                    className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-all",
                                        trumpetMode === 'Sib' ? "bg-[var(--color-accent)] shadow-sm text-white" : "hover:bg-[var(--color-surface-elevated)]/50 text-[var(--color-text-secondary)]")}
                                >
                                    Si♭
                                </button>
                            </div>
                            <InfoTooltip text="Cambia la nota escrita y la digitacion mostradas" />
                        </div>
                        {/* Close X */}
                        <button
                            onClick={onClose}
                            className="h-7 w-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-[var(--color-text-secondary)]"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Keyboard centered, Info panel on right */}
            <div className="bg-[var(--color-surface-muted)]" style={{ minHeight: '180px' }}>
                <div className="max-w-5xl mx-auto flex justify-center w-full">

                    {/* Keys Container - centered */}
                    <div ref={scrollRef} className="w-full flex-shrink-0 overflow-x-auto touch-pan-x relative" style={{ maxWidth: 'calc(100% - 160px)' }}>
                        <div className="flex relative select-none h-[180px]" style={{ minWidth: 'fit-content', paddingLeft: '8px', paddingRight: '8px' }}>
                            {/* White Keys */}
                            {VISIBLE_NOTES.map((note, idx) => {
                                const isWhite = note.type === 'white';
                                if (!isWhite) return null;
                                const isFirstWhite = VISIBLE_NOTES.find(n => n.type === 'white') === note;
                                // Labels are ALWAYS fixed (piano key names), no transposition
                                return (
                                    <div key={note.name} className="relative h-full flex flex-col justify-start">
                                        <button
                                            className={cn(
                                                "w-11 h-[175px] relative focus:outline-none touch-pan-x rounded-b-[3px] transition-all duration-75 flex flex-col justify-end items-center pb-2",
                                                pressedKeys.has(note.name)
                                                    ? ""
                                                    : "shadow-sm hover:shadow-md"
                                            )}
                                            style={{
                                                backgroundColor: pressedKeys.has(note.name) ? 'var(--color-accent)' : '#fff',
                                                borderRight: '1px solid #e0e0e0',
                                                borderLeft: isFirstWhite ? '1px solid #e0e0e0' : 'none',
                                                borderBottom: '1px solid #d0d0d0',
                                                zIndex: 1,
                                                boxSizing: 'border-box'
                                            }}
                                            onPointerDown={(e) => startNote(note, e)}
                                            onPointerUp={(e) => stopNote(note, e)}
                                            onPointerLeave={(e) => stopNote(note, e)}
                                            onPointerCancel={(e) => stopNote(note, e)}
                                        >
                                            {/* Label inside key - ALWAYS fixed piano names */}
                                            <span
                                                className="text-[10px] font-medium pointer-events-none select-none"
                                                style={{
                                                    color: pressedKeys.has(note.name) ? 'rgba(255,255,255,0.8)' : '#999'
                                                }}
                                            >
                                                {formatNoteLabel(note.label)}
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Black Keys */}
                            {VISIBLE_NOTES.map((note, idx) => {
                                if (note.type !== 'black') return null;
                                const notesBefore = VISIBLE_NOTES.slice(0, idx);
                                const whiteCount = notesBefore.filter(n => n.type === 'white').length;
                                const whiteKeyWidth = 44; // w-11
                                const blackKeyWidth = 26;
                                const leftPos = (whiteCount * whiteKeyWidth) - (blackKeyWidth / 2);
                                const finalLeft = leftPos + 8;

                                return (
                                    <button
                                        key={note.name}
                                        className={cn(
                                            "absolute rounded-b-[3px] z-10 focus:outline-none touch-pan-x transition-all duration-75",
                                            pressedKeys.has(note.name) ? "" : "shadow-lg"
                                        )}
                                        style={{
                                            width: `${blackKeyWidth}px`,
                                            height: '95px',
                                            left: `${finalLeft}px`,
                                            top: 0,
                                            backgroundColor: pressedKeys.has(note.name) ? 'var(--color-accent)' : '#1a1a1a',
                                            border: '1px solid #0a0a0a'
                                        }}
                                        onPointerDown={(e) => startNote(note, e)}
                                        onPointerUp={(e) => stopNote(note, e)}
                                        onPointerLeave={(e) => stopNote(note, e)}
                                        onPointerCancel={(e) => stopNote(note, e)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT: Info Panel - compact layout, overflow visible for treble clef */}
                    <div className="w-[160px] max-w-[160px] flex flex-col shrink-0 py-2 overflow-visible">

                        {/* TOP: PISTONS - Compact grid */}
                        <div className="grid grid-cols-3 gap-1.5 px-2">
                            {[1, 2, 3].map(pistonNum => {
                                // Use concertMidi (what's actually sounding) for fingering/display
                                const displayMidi = lastNote?.concertMidi
                                    ? concertToTrumpetWritten(lastNote.concertMidi, trumpetMode)
                                    : null;
                                const displayInfo = displayMidi ? midiToNoteInfo(displayMidi) : null;

                                const fingering = displayInfo
                                    ? (TRUMPET_FINGERINGS[displayInfo.scientificName] || TRUMPET_FINGERINGS[displayInfo.name] || [])
                                    : [];

                                const isPressed = fingering.includes(pistonNum);
                                return (
                                    <div
                                        key={pistonNum}
                                        className={cn(
                                            "aspect-square rounded-full flex items-center justify-center min-w-[24px] max-w-[32px] w-full mx-auto transition-colors border-2",
                                            isPressed
                                                ? "bg-[var(--color-accent)] border-[var(--color-accent)] shadow-sm"
                                                : "bg-[var(--color-surface)] dark:bg-[var(--color-surface-elevated)] border-[var(--color-border-default)]"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "text-xs font-bold leading-none",
                                                isPressed ? "text-white" : "text-[var(--color-text-muted)]"
                                            )}
                                        >
                                            {pistonNum}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CENTER: Staff - flex-1 to take max space */}
                        <div className="flex-1 flex items-center justify-center px-2 min-h-[80px] overflow-visible" style={{ zIndex: 10 }}>
                            <div className="w-full h-full overflow-visible">
                                {lastNote?.concertMidi ? (
                                    (() => {
                                        // Use concertMidi for staff display
                                        const displayMidi = concertToTrumpetWritten(lastNote.concertMidi, trumpetMode);
                                        const displayInfo = midiToNoteInfo(displayMidi);
                                        return <MusicStaff note={displayInfo} />;
                                    })()
                                ) : <MusicStaff note={null} />}
                            </div>
                        </div>

                        {/* BOTTOM: Note Name - closer to staff */}
                        <div className="px-2 flex justify-center -mt-10 relative" style={{ zIndex: 20 }}>
                            {lastNote?.concertMidi ? (
                                (() => {
                                    // Use concertMidi for note name display
                                    const displayMidi = concertToTrumpetWritten(lastNote.concertMidi, trumpetMode);
                                    const displayInfo = midiToNoteInfo(displayMidi);

                                    return (
                                        <div className="flex items-baseline gap-1 justify-center">
                                            <span className="text-lg font-bold leading-none text-[var(--color-text-primary)]">
                                                {formatNoteLabel(displayInfo.label)}
                                            </span>
                                            {displayInfo.enharmonic && (
                                                <>
                                                    <span className="text-lg font-medium leading-none text-[var(--color-text-muted)]">/</span>
                                                    <span className="text-lg font-bold leading-none text-[var(--color-text-secondary)]">
                                                        {formatNoteLabel(displayInfo.enharmonic)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()
                            ) : (
                                <span className="text-xs italic text-[var(--color-text-muted)]">Toca nota</span>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
}

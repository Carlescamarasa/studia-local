
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Music Transposition Utilities
 * 
 * Two domains:
 * - concertPitch: what sounds (MIDI/Hz, the "real" pitch)
 * - writtenPitch: what the student sees (note name, fingering, staff notation)
 * 
 * Trumpet in Bb: sounds a major 2nd (2 semitones) LOWER than written
 * Therefore: written pitch = concert pitch + 2 semitones
 */

// Note names for display (Spanish)
const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'Sib', 'Si'];
const NOTE_NAMES_FLAT = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

// Pure lists for forcing specific spellings
const PURE_SHARPS = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const PURE_FLATS = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

// Map note name prefixes to semitone offset from C
const NAME_TO_SEMITONE: Record<string, number> = {
    'Do': 0, 'C': 0,
    'Re': 2, 'D': 2,
    'Mi': 4, 'E': 4,
    'Fa': 5, 'F': 5,
    'Sol': 7, 'G': 7,
    'La': 9, 'A': 9,
    'Si': 11, 'B': 11,
};

/**
 * Transpose a MIDI note by n semitones
 * @param {number} midiNote - MIDI note number
 * @param {number} semitones - Number of semitones to transpose (positive = up)
 * @returns {number} Transposed MIDI note
 */
export function transposeSemitones(midiNote: number, semitones: number): number {
    return midiNote + semitones;
}

/**
 * Convert concert pitch to trumpet written pitch
 * Trumpet in Bb sounds a major 2nd lower than written
 * So written = concert + 2 semitones
 * 
 * @param {number} concertMidi - Concert pitch MIDI number
 * @param {'C' | 'Bb'} trumpetKey - Trumpet transposition key
 * @returns {number} Written pitch MIDI number
 */
export function concertToTrumpetWritten(concertMidi: number, trumpetKey: string): number {
    if (trumpetKey === 'C' || trumpetKey === 'Do') {
        return concertMidi;
    }
    if (trumpetKey === 'Eb' || trumpetKey === 'Mib' || trumpetKey === 'Mi♭') {
        // Eb trumpet: sounds a minor 3rd (3 semitones) HIGHER than written
        // So written pitch is 3 semitones LOWER than concert
        return transposeSemitones(concertMidi, -3);
    }
    // Bb trumpet: written pitch is 2 semitones higher than concert
    return transposeSemitones(concertMidi, 2);
}

/**
 * Get the display label for a piano key based on key mode
 * 
 * @param {number} concertMidi - Concert pitch MIDI number  
 * @param {'C' | 'Bb'} pianoKey - Piano label mode
 * @returns {object} { label, accidental, enharmonic }
 */
export function pianoLabelForKey(concertMidi: number, pianoKey: string) {
    const midi = pianoKey === 'C' || pianoKey === 'Do'
        ? concertMidi
        : transposeSemitones(concertMidi, 2);

    return midiToNoteInfo(midi);
}

/**
 * Convert MIDI number to note information
 * @param {number} midi - MIDI note number
 * @returns {object} { label, accidental, enharmonic, octave }
 */
export function midiToNoteInfo(midi: number) {
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1;

    const label = NOTE_NAMES[noteIndex];
    const labelFlat = NOTE_NAMES_FLAT[noteIndex];

    // Determine accidental
    let accidental = null;
    if (label.includes('#')) {
        accidental = '#';
    } else if (labelFlat.includes('b')) {
        accidental = 'b';
    }

    // Enharmonic (opposite representation)
    let enharmonic = null;
    if (accidental === '#') {
        enharmonic = labelFlat;
    } else if (accidental === 'b' && label !== labelFlat) {
        enharmonic = label;
    }

    const scientificName = `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][noteIndex]}${octave}`;

    // Explicit sharp/flat scientific names for staff display
    const sharpLabel = PURE_SHARPS[noteIndex];
    const flatLabel = PURE_FLATS[noteIndex];

    // Helper to get scientific name from Spanish label
    // e.g. Sol# -> G#
    const toScientific = (spanLabel: string) => {
        let base = spanLabel.replace(/[#b]/g, '');
        const acc = spanLabel.includes('#') ? '#' : (spanLabel.includes('b') ? '' : ''); // Flat in scientific is implicitly handled if we map correctly? 
        // Actually, simple map:
        const map: Record<string, string> = {
            'Do': 'C', 'Re': 'D', 'Mi': 'E', 'Fa': 'F', 'Sol': 'G', 'La': 'A', 'Si': 'B'
        };
        const sciBase = map[base];
        const sciAcc = spanLabel.includes('#') ? '#' : (spanLabel.includes('b') ? 'b' : ''); // Standardize 'b' for flat in scientific strings usually
        return `${sciBase}${sciAcc}${octave}`;
    };

    const scientificNameSharp = toScientific(sharpLabel); // e.g. F#4
    const scientificNameFlat = toScientific(flatLabel);   // e.g. Gb4

    return {
        label,
        labelFlat,
        accidental,
        enharmonic,
        octave,
        midi,
        scientificName, // Generic/Preferred
        scientificNameSharp,
        scientificNameFlat,
        name: scientificName // Alias for compatibility
    };
}

/**
 * Get note name with proper accidental symbols for display
 * @param {string} label - Note label (e.g., "Do#", "Sib")
 * @returns {string} Formatted label with ♯ and ♭
 */
export function formatNoteLabel(label: string): string {
    return label
        .replace(/#/g, '♯')
        .replace(/b/g, '♭');
}

/**
 * Normalize key value to standard format
 * @param {string} key - 'Do', 'C', 'Sib', 'Bb'
 * @returns {'C' | 'Bb'}
 */
export function normalizeKey(key: string): 'C' | 'Bb' {
    if (key === 'Do' || key === 'C') return 'C';
    if (key === 'Sib' || key === 'Bb' || key === 'Si♭') return 'Bb';
    return 'C';
}

export default {
    transposeSemitones,
    concertToTrumpetWritten,
    pianoLabelForKey,
    midiToNoteInfo,
    formatNoteLabel,
    normalizeKey,
};

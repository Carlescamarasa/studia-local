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

// Map note name prefixes to semitone offset from C
const NAME_TO_SEMITONE = {
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
export function transposeSemitones(midiNote, semitones) {
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
export function concertToTrumpetWritten(concertMidi, trumpetKey) {
    if (trumpetKey === 'C' || trumpetKey === 'Do') {
        return concertMidi;
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
export function pianoLabelForKey(concertMidi, pianoKey) {
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
export function midiToNoteInfo(midi) {
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

    return {
        label,
        labelFlat,
        accidental,
        enharmonic,
        octave,
        midi,
        scientificName, // e.g. "C4"
        name: scientificName // Alias for compatibility
    };
}

/**
 * Get note name with proper accidental symbols for display
 * @param {string} label - Note label (e.g., "Do#", "Sib")
 * @returns {string} Formatted label with ♯ and ♭
 */
export function formatNoteLabel(label) {
    return label
        .replace(/#/g, '♯')
        .replace(/b/g, '♭');
}

/**
 * Normalize key value to standard format
 * @param {string} key - 'Do', 'C', 'Sib', 'Bb'
 * @returns {'C' | 'Bb'}
 */
export function normalizeKey(key) {
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

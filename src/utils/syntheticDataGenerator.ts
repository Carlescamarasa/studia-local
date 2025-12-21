/**
 * Synthetic Data Generator - Core Utilities
 * 
 * Provides deterministic random generation and realistic data creation
 * for synthetic school year data.
 */

// ============================================================================
// Seeded Random Number Generator (Mulberry32)
// ============================================================================

export class SeededRandom {
    private seed: number;

    constructor(seed: string | number) {
        // Convert string seed to number
        if (typeof seed === 'string') {
            this.seed = 0;
            for (let i = 0; i < seed.length; i++) {
                this.seed = ((this.seed << 5) - this.seed) + seed.charCodeAt(i);
                this.seed = this.seed & this.seed; // Convert to 32bit integer
            }
        } else {
            this.seed = seed;
        }
    }

    /**
     * Returns a random number between 0 and 1 (exclusive)
     */
    next(): number {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive)
     */
    int(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Returns a random element from an array
     */
    pick<T>(array: T[]): T {
        return array[this.int(0, array.length - 1)];
    }

    /**
     * Shuffles an array in place
     */
    shuffle<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.int(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Returns true with given probability (0-1)
     */
    chance(probability: number): boolean {
        return this.next() < probability;
    }
}

// ============================================================================
// Date Utilities
// ============================================================================

export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date): string {
    return date.toISOString();
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function addWeeks(date: Date, weeks: number): Date {
    return addDays(date, weeks * 7);
}

export function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function isSameDay(date1: Date, date2: Date): boolean {
    return formatDate(date1) === formatDate(date2);
}

export function getWeeksBetween(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
}

// ============================================================================
// ID Generation
// ============================================================================

export function generateId(prefix: string, rng: SeededRandom): string {
    const timestamp = Date.now();
    // Use part of deterministic UUID for better entropy than simple int
    // This avoids collisions when generating thousands of items quickly
    const randomPart = generateUUID(rng).substring(0, 8);
    return `${prefix}_${timestamp}_${randomPart}`;
}

export function generateUUID(rng: SeededRandom): string {
    // Generate a deterministic UUID-like string
    const hex = '0123456789abcdef';
    let uuid = '';
    for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
            uuid += '-';
        } else if (i === 14) {
            uuid += '4'; // Version 4
        } else if (i === 19) {
            uuid += hex[rng.int(8, 11)]; // Variant
        } else {
            uuid += hex[rng.int(0, 15)];
        }
    }
    return uuid;
}

// ============================================================================
// Name Generators
// ============================================================================

const FIRST_NAMES_MALE = [
    'Carlos', 'Javier', 'Miguel', 'David', 'Daniel', 'Pablo', 'Alejandro',
    'Manuel', 'Francisco', 'Antonio', 'José', 'Luis', 'Pedro', 'Sergio'
];

const FIRST_NAMES_FEMALE = [
    'María', 'Carmen', 'Ana', 'Isabel', 'Laura', 'Marta', 'Elena',
    'Cristina', 'Sara', 'Paula', 'Lucía', 'Andrea', 'Sofía', 'Alba'
];

const LAST_NAMES = [
    'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez',
    'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández',
    'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez'
];

export function generateName(rng: SeededRandom, gender?: 'male' | 'female'): string {
    const isMale = gender === 'male' || (gender === undefined && rng.chance(0.5));
    const firstName = rng.pick(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
    const lastName1 = rng.pick(LAST_NAMES);
    const lastName2 = rng.pick(LAST_NAMES.filter(n => n !== lastName1));
    return `${firstName} ${lastName1} ${lastName2}`;
}

export function generateEmail(name: string, tag: string): string {
    const normalized = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, '.');
    return `${normalized}+${tag}@example.com`;
}

// ============================================================================
// Schedule Utilities
// ============================================================================

export interface TimeSlot {
    date: Date;
    startHour: number;
    startMinute: number;
    durationMinutes: number;
}

export interface ScheduleConstraints {
    startDate: Date;
    endDate: Date;
    weekdayHours: { start: number; end: number }; // L-V
    saturdayHours: { start: number; end: number }; // S
    bufferMinutes: number; // Buffer between sessions
    sessionsPerWeek: number;
}

/**
 * Checks if two time slots overlap
 */
export function slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    if (!isSameDay(slot1.date, slot2.date)) return false;

    const start1 = slot1.startHour * 60 + slot1.startMinute;
    const end1 = start1 + slot1.durationMinutes;
    const start2 = slot2.startHour * 60 + slot2.startMinute;
    const end2 = start2 + slot2.durationMinutes;

    return start1 < end2 && start2 < end1;
}

/**
 * Generates a schedule of sessions respecting constraints
 */
export function generateSchedule(
    constraints: ScheduleConstraints,
    rng: SeededRandom,
    existingSlots: TimeSlot[] = []
): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const totalWeeks = getWeeksBetween(constraints.startDate, constraints.endDate);

    for (let week = 0; week < totalWeeks; week++) {
        const weekStart = addWeeks(constraints.startDate, week);
        const sessionsThisWeek = constraints.sessionsPerWeek;

        // Generate sessions for this week
        for (let session = 0; session < sessionsThisWeek; session++) {
            let attempts = 0;
            const maxAttempts = 50;

            while (attempts < maxAttempts) {
                // Pick a random day (0-5: Mon-Sat)
                const dayOffset = rng.int(0, 5);
                const date = addDays(weekStart, dayOffset);

                // Check if date is within range
                if (date > constraints.endDate) break;

                // Determine available hours based on day
                const isSaturday = dayOffset === 5;
                const hours = isSaturday ? constraints.saturdayHours : constraints.weekdayHours;

                // Pick random start time
                const startHour = rng.int(hours.start, hours.end - 1);
                const startMinute = rng.pick([0, 15, 30, 45]);

                // Random duration (30-90 minutes)
                const durationMinutes = rng.pick([30, 45, 60, 75, 90]);

                const newSlot: TimeSlot = {
                    date,
                    startHour,
                    startMinute,
                    durationMinutes
                };

                // Check for overlaps with existing slots (including buffer)
                const hasOverlap = [...existingSlots, ...slots].some(existing => {
                    if (!isSameDay(existing.date, newSlot.date)) return false;

                    // Add buffer to both slots
                    const bufferedExisting = {
                        ...existing,
                        durationMinutes: existing.durationMinutes + constraints.bufferMinutes
                    };
                    const bufferedNew = {
                        ...newSlot,
                        durationMinutes: newSlot.durationMinutes + constraints.bufferMinutes
                    };

                    return slotsOverlap(bufferedExisting, bufferedNew);
                });

                if (!hasOverlap) {
                    slots.push(newSlot);
                    break;
                }

                attempts++;
            }
        }
    }

    return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ============================================================================
// Content Generators
// ============================================================================

export function generateNotes(rng: SeededRandom, context: string): string {
    const templates = [
        `Excelente progreso en ${context}. Continuar con este enfoque.`,
        `Buen trabajo en ${context}. Prestar atención a la precisión.`,
        `Mejora notable en ${context}. Seguir practicando con regularidad.`,
        `Sólido desempeño en ${context}. Reforzar la técnica base.`,
        `Progreso constante en ${context}. Mantener la disciplina.`
    ];
    return rng.pick(templates);
}

export function generateMediaUrl(rng: SeededRandom, type: 'youtube' | 'pdf' | 'image'): string {
    const id = rng.int(100000, 999999);

    switch (type) {
        case 'youtube':
            return `https://youtube.com/watch?v=SYNTH_${id}`;
        case 'pdf':
            return `https://example.com/docs/SYNTH_${id}.pdf`;
        case 'image':
            return `https://example.com/images/SYNTH_${id}.jpg`;
    }
}

// ============================================================================
// Progress Generators
// ============================================================================

export interface ProgressMetrics {
    totalTime: number; // seconds
    streak: number; // days
    rating: number; // 1-4
}

/**
 * Generates realistic progress metrics with upward trend and variability
 */
export function generateProgressMetrics(
    rng: SeededRandom,
    weekIndex: number,
    totalWeeks: number
): ProgressMetrics {
    // Base progress (0-1) with upward trend
    const baseProgress = Math.min(1, weekIndex / totalWeeks);

    // Add variability
    const variability = (rng.next() - 0.5) * 0.2;
    const progress = Math.max(0, Math.min(1, baseProgress + variability));

    // Total time: 1-6 hours per week, increasing with progress
    const minTime = 60 * 60; // 1 hour
    const maxTime = 6 * 60 * 60; // 6 hours
    const totalTime = Math.floor(minTime + (maxTime - minTime) * progress);

    // Streak: 0-30 days with occasional breaks
    const hasBreak = rng.chance(0.15); // 15% chance of break
    const streak = hasBreak ? 0 : rng.int(0, Math.min(30, weekIndex * 7));

    // Rating: 1-4, normal distribution around 3
    const ratingRoll = rng.next();
    let rating: number;
    if (ratingRoll < 0.1) rating = 1;
    else if (ratingRoll < 0.3) rating = 2;
    else if (ratingRoll < 0.8) rating = 3;
    else rating = 4;

    return { totalTime, streak, rating };
}

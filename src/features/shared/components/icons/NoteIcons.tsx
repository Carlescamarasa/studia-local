/* eslint-disable react/prop-types */
import React from 'react';

export const NoteQuarter = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 3v13.55c-.83-.52-1.87-.8-3-.8-3.31 0-6 2.69-6 6s2.69 6 6 6c3.16 0 5.76-2.46 5.98-5.56.01-.15.02-.29.02-.44V3h-3z" />
    </svg>
);

export const NoteQuarterDotted = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 32 24" fill="currentColor" className={className}>
        <path d="M12 3v13.55c-.83-.52-1.87-.8-3-.8-3.31 0-6 2.69-6 6s2.69 6 6 6c3.16 0 5.76-2.46 5.98-5.56.01-.15.02-.29.02-.44V3h-3z" />
        <circle cx="22" cy="19" r="3" />
    </svg>
);

export const NoteHalf = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M14 3v13.56c-.01.03-.01.06-.02.09-.26 3.07-2.84 5.48-5.98 5.48-3.31 0-6-2.69-6-6s2.69-6 6-6c1.13 0 2.17.28 3 .8V3h3zm-5 10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
    </svg>
);

export const NoteHalfDotted = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 32 24" fill="currentColor" className={className}>
        <path d="M14 3v13.56c-.01.03-.01.06-.02.09-.26 3.07-2.84 5.48-5.98 5.48-3.31 0-6-2.69-6-6s2.69-6 6-6c1.13 0 2.17.28 3 .8V3h3zm-5 10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
        <circle cx="24" cy="19" r="3" />
    </svg>
);

export const NoteEighth = ({ className = "w-4 h-4" }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 3v13.55c-.83-.52-1.87-.8-3-.8-3.31 0-6 2.69-6 6s2.69 6 6 6c3.16 0 5.76-2.46 5.98-5.56.01-.15.02-.29.02-.44V3h-3V6.5c1.1 0 2.1.2 3 .6 1.1.5 2 1.3 2.6 2.2.4.6.8 1.3 1 2.1l2.4-.9c-.3-1.3-.9-2.5-1.6-3.6-.9-1.4-2.2-2.5-3.7-3.2-.9-.4-1.9-.7-2.9-.7H12z" />
    </svg>
);

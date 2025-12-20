export const MEDIA_FILE_TYPES = {
    VIDEO: 'video',
    AUDIO: 'audio',
    IMAGE: 'image',
    PDF: 'pdf',
    YOUTUBE: 'youtube',
    OTHER: 'other',
};

// Labels for UI display
export const MEDIA_FILE_TYPE_LABELS = {
    [MEDIA_FILE_TYPES.VIDEO]: 'Video',
    [MEDIA_FILE_TYPES.AUDIO]: 'Audio',
    [MEDIA_FILE_TYPES.IMAGE]: 'Imagen',
    [MEDIA_FILE_TYPES.PDF]: 'PDF',
    [MEDIA_FILE_TYPES.YOUTUBE]: 'YouTube',
    [MEDIA_FILE_TYPES.OTHER]: 'Otros',
};

export const MEDIA_ORIGIN_TYPES = {
    EJERCICIO: 'ejercicio',
    VARIACION: 'variacion',
    PIEZA: 'pieza',
    FEEDBACK_PROFESOR: 'feedback_profesor',
    FEEDBACK_SESION: 'feedback_sesion',
    CENTRO_DUDAS: 'centro_dudas',
    UNLINKED: 'unlinked', // For filter usage
};

export const MEDIA_ORIGIN_TYPE_LABELS = {
    [MEDIA_ORIGIN_TYPES.EJERCICIO]: 'Ejercicios',
    [MEDIA_ORIGIN_TYPES.VARIACION]: 'Variaciones',
    [MEDIA_ORIGIN_TYPES.PIEZA]: 'Piezas',
    [MEDIA_ORIGIN_TYPES.FEEDBACK_PROFESOR]: 'Feedback Profesor',
    [MEDIA_ORIGIN_TYPES.FEEDBACK_SESION]: 'Feedback Sesión',
    [MEDIA_ORIGIN_TYPES.CENTRO_DUDAS]: 'Soporte',
    [MEDIA_ORIGIN_TYPES.UNLINKED]: 'No vinculados',
};

export const MEDIA_ORIGIN_BADGE_VARIANTS = {
    [MEDIA_ORIGIN_TYPES.EJERCICIO]: 'info',
    [MEDIA_ORIGIN_TYPES.VARIACION]: 'warning',
    [MEDIA_ORIGIN_TYPES.PIEZA]: 'secondary',
    [MEDIA_ORIGIN_TYPES.FEEDBACK_PROFESOR]: 'success',
    [MEDIA_ORIGIN_TYPES.FEEDBACK_SESION]: 'outline',
    [MEDIA_ORIGIN_TYPES.CENTRO_DUDAS]: 'destructive',
};

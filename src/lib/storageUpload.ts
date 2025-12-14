/**
 * Supabase Storage Upload Utilities
 * Handles file uploads for PDF, Images, and Audio to Supabase Storage bucket
 */

import { supabase } from './supabaseClient';

// Bucket name for media assets
const BUCKET_NAME = 'media-assets';

// Accepted file types and their mappings
export const ACCEPTED_FILE_TYPES = {
    pdf: {
        mimeTypes: ['application/pdf'],
        extensions: ['.pdf'],
        label: 'PDF',
        icon: 'FileText'
    },
    image: {
        mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
        label: 'Imagen',
        icon: 'Image'
    },
    audio: {
        mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
        extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.webm'],
        label: 'Audio',
        icon: 'Music'
    }
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Detect file type category from MIME type
 */
export function detectFileType(file: File): 'pdf' | 'image' | 'audio' | 'unknown' {
    for (const [type, config] of Object.entries(ACCEPTED_FILE_TYPES)) {
        if (config.mimeTypes.includes(file.type)) {
            return type as 'pdf' | 'image' | 'audio';
        }
    }
    return 'unknown';
}

/**
 * Get accepted MIME types for file input
 */
export function getAcceptedMimeTypes(): string {
    const allMimes: string[] = [];
    for (const config of Object.values(ACCEPTED_FILE_TYPES)) {
        allMimes.push(...config.mimeTypes);
    }
    return allMimes.join(',');
}

/**
 * Generate a unique storage path for a file
 */
export function generateStoragePath(file: File, prefix: string = ''): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();

    const basePath = prefix ? `${prefix}/${timestamp}_${randomSuffix}_${sanitizedName}` : `${timestamp}_${randomSuffix}_${sanitizedName}`;
    return basePath;
}

export interface UploadResult {
    success: boolean;
    url?: string;
    path?: string;
    fileType?: 'pdf' | 'image' | 'audio';
    fileName?: string;
    fileSize?: number;
    error?: string;
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percent: number;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
    file: File,
    pathPrefix: string = 'uploads',
    onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            success: false,
            error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        };
    }

    // Detect and validate file type
    const fileType = detectFileType(file);
    if (fileType === 'unknown') {
        return {
            success: false,
            error: `Tipo de archivo no soportado: ${file.type || 'desconocido'}`
        };
    }

    // Generate storage path
    const storagePath = generateStoragePath(file, pathPrefix);

    try {
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('[storageUpload] Upload error:', error);
            return {
                success: false,
                error: error.message || 'Error al subir el archivo'
            };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        // Report 100% progress
        if (onProgress) {
            onProgress({ loaded: file.size, total: file.size, percent: 100 });
        }

        return {
            success: true,
            url: urlData.publicUrl,
            path: storagePath,
            fileType,
            fileName: file.name,
            fileSize: file.size
        };
    } catch (err) {
        console.error('[storageUpload] Unexpected error:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Error inesperado al subir el archivo'
        };
    }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(storagePath: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([storagePath]);

        if (error) {
            console.error('[storageUpload] Delete error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('[storageUpload] Unexpected delete error:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Error inesperado al eliminar el archivo'
        };
    }
}

/**
 * Batch upload multiple files
 */
export async function uploadFiles(
    files: File[],
    pathPrefix: string = 'uploads',
    onFileProgress?: (index: number, result: UploadResult) => void
): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
        const result = await uploadFile(files[i], pathPrefix);
        results.push(result);
        if (onFileProgress) {
            onFileProgress(i, result);
        }
    }

    return results;
}

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { remoteDataAPI, fetchBloquesPreview, fetchPiezasPreview, fetchFeedbacksSemanales, fetchRegistrosSesionMultimedia, fetchSupportMensajes } from "@/api/remoteDataAPI";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, FileVideo, FileAudio, Image as ImageIcon, FileText, Trash2, ExternalLink, Database, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import UnifiedTable from "@/components/tables/UnifiedTable";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    MEDIA_FILE_TYPES,
    MEDIA_FILE_TYPE_LABELS,
    MEDIA_ORIGIN_TYPES,
    MEDIA_ORIGIN_TYPE_LABELS,
    MEDIA_ORIGIN_BADGE_VARIANTS
} from "@/lib/constants";

/**
 * Deriva un nombre legible para mostrar en la interfaz.
 * Prioridad:
 * 1. Name explícito (si no parece hash/slug raro)
 * 2. Storage Path (nombre de archivo)
 * 3. URL (nombre de archivo o ID youtube)
 */
function deriveAssetDisplayName(asset) {
    if (!asset) return "(Desconocido)";

    let candidate = asset.name;


    // Detectar si es un link de YouTube (por tipo o URL)
    // Note: API returns camelCase (fileType, storagePath, etc)
    const isYoutube = asset.fileType === 'youtube' || (asset.url && (asset.url.includes('youtube') || asset.url.includes('youtu.be')));

    // Detectar si el nombre actual es solo un fragmento de URL (ej: "watch?v=...")
    const nameIsUrlFragment = candidate && (candidate.startsWith('watch?') || candidate.includes('='));

    // Detectar si parece un hash/slug ilegible (ej: secuencia muy larga de hex chars)
    // El usuario especificó "[a-f0-9]{20,}" como criterio principal de hash.
    const looksLikeHash = candidate && /[a-f0-9]{20,}/i.test(candidate);

    // 1. Si es YouTube o el nombre es malo (hash o fragmento url), buscar alternativas
    if (!candidate || looksLikeHash || (isYoutube && nameIsUrlFragment)) {

        // Priority A: Origin Label (Si el nombre era un hash ilegible, es mejor el contexto)
        // Solo si NO es YouTube (para YouTube preferimos el ID o título si lo tuviéramos, pero origin_label puede ser "Video X")
        // Pero si es un hash, origin_label es definitivamente mejor.
        if (looksLikeHash && asset.originLabel) {
            let ext = "";
            // Intentar preservar extensión
            if (asset.storagePath) {
                const parts = asset.storagePath.split('.');
                if (parts.length > 1) ext = '.' + parts.pop();
            } else if (candidate && candidate.includes('.')) {
                const parts = candidate.split('.');
                if (parts.length > 1) ext = '.' + parts.pop();
            }
            // Validar extensión
            if (ext.length > 5 || !/^\.[a-z0-9]+$/i.test(ext)) ext = "";

            return asset.originLabel + ext;
        }

        // Priority B: YouTube URL parsing
        if (isYoutube && asset.url) {
            try {
                const urlObj = new URL(asset.url);
                if (urlObj.hostname.includes('youtube') || urlObj.hostname.includes('youtu.be')) {
                    const v = urlObj.searchParams.get('v');
                    if (v) return `YouTube: ${v}`;
                    return `YouTube: ${urlObj.pathname.replace(/^\//, '')}`;
                }
            } catch (e) { /* ignore */ }
        }

        // Priority C: Storage Path
        if (asset.storagePath) {
            candidate = asset.storagePath.split('/').pop();
        }
        // Priority D: Generic URL fallback
        else if (asset.url) {
            try {
                const urlObj = new URL(asset.url);
                candidate = urlObj.pathname.split('/').pop();
            } catch (e) {
                candidate = asset.url;
            }
        }
    }

    if (!candidate) return "(Sin nombre)";

    // 2. Cleaning Steps
    try { candidate = decodeURIComponent(candidate); } catch (e) { }

    // Remove Supabase Timestamp prefix (10-14 digits + underscores)
    // Supports pattern: 1765679404599_lq6ece_filename.pdf -> filename.pdf
    candidate = candidate.replace(/^\d{10,14}_([a-zA-Z0-9]{4,10}_)?/, '');

    // 3. Truncate
    if (candidate.length > 60) {
        candidate = candidate.substring(0, 55) + "...";
    }

    return candidate;
}

const FILE_TYPE_ICONS = {
    [MEDIA_FILE_TYPES.VIDEO]: <FileVideo className="w-4 h-4 text-blue-500" />,
    [MEDIA_FILE_TYPES.AUDIO]: <FileAudio className="w-4 h-4 text-purple-500" />,
    [MEDIA_FILE_TYPES.IMAGE]: <ImageIcon className="w-4 h-4 text-green-500" />,
    [MEDIA_FILE_TYPES.PDF]: <FileText className="w-4 h-4 text-red-500" />,
    [MEDIA_FILE_TYPES.YOUTUBE]: <FileVideo className="w-4 h-4 text-red-600" />,
    [MEDIA_FILE_TYPES.OTHER]: <Database className="w-4 h-4 text-gray-500" />,
};

const STATE_BADGES = {
    active: "success",
    archived: "default",
    deleted: "danger",
};


import { getYouTubeTitle } from "@/components/utils/media";

// Componente para renderizar el nombre de forma asíncrona (YouTube titles)
function AssetDisplayName({ asset, deriveDisplayName }) {
    const defaultName = deriveDisplayName(asset);
    const [title, setTitle] = useState(defaultName);
    const [loading, setLoading] = useState(false);

    // Si es YouTube, intentamos cargar el título real
    const isYoutube = (asset.fileType === 'youtube' || asset.file_type === 'youtube') && asset.url;

    useEffect(() => {
        let mounted = true;
        if (isYoutube) {
            setLoading(true);
            getYouTubeTitle(asset.url).then(realTitle => {
                if (mounted && realTitle) {
                    setTitle(`${realTitle}`);
                }
                if (mounted) setLoading(false);
            });
        }
        return () => { mounted = false; };
    }, [asset.url, isYoutube]);

    // Show loading state subtly
    if (loading && isYoutube && title.startsWith("YouTube:")) {
        return (
            <div className="flex flex-col max-w-[300px]">
                <span className="font-medium truncate text-xs text-muted-foreground italic">
                    cargando título...
                </span>
                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate flex items-center gap-1">
                    {asset.url} <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col max-w-[300px]">
            <span className="font-medium truncate" title={title}>{title}</span>
            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate flex items-center gap-1">
                {asset.url} <ExternalLink className="w-3 h-3" />
            </a>
        </div>
    );
}

export default function ContenidoMultimediaPage({ embedded = false }) {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [originFilter, setOriginFilter] = useState('all');

    // Fetch Media Assets
    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['media_assets'],
        queryFn: async () => {
            const data = await remoteDataAPI.mediaAssets.list();
            return data || [];
        },
    });

    // Delete Mutation
    const deleteAssetMutation = useMutation({
        mutationFn: async (id) => {
            await remoteDataAPI.mediaAssets.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['media_assets'] });
            toast.success('Asset eliminado correctamente');
        },
        onError: (error) => {
            toast.error('Error al eliminar asset: ' + error.message);
        },
    });

    // --- MIGRATION LOGIC ---
    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigrateLegacy = async () => {
        if (!window.confirm('¿Iniciar escaneo y migración de enlaces legacy? Esto revisará TODOS los recursos (Ejercicios, Piezas, Feedback, Sesiones y Soporte).')) return;

        setIsMigrating(true);
        let addedCount = 0;
        let skippedCount = 0;
        let scannedCount = 0;

        try {
            // Helper to derive a better name for the link
            const deriveNameFromLink = (url) => {
                if (!url) return null;
                try {
                    // YouTube
                    if (url.includes('youtube') || url.includes('youtu.be')) {
                        const urlObj = new URL(url);
                        if (urlObj.searchParams.has('v')) return `YouTube: ${urlObj.searchParams.get('v')}`;
                        return `YouTube: ${urlObj.pathname.replace(/^\//, '')}`;
                    }
                    // Doc/Drive/Other
                    const urlObj = new URL(url);
                    const lastSegment = urlObj.pathname.split('/').pop();
                    if (lastSegment) return decodeURIComponent(lastSegment);
                } catch (e) { /* ignore */ }
                return url.split('/').pop(); // Fallback
            };

            const migrateLinks = async (links, originType, originId, originLabel, defaultName) => {
                if (!links || !Array.isArray(links)) return;

                for (const link of links) {
                    if (!link) continue;
                    try {
                        let derivedName = deriveNameFromLink(link) || defaultName;
                        if (derivedName.length > 60) derivedName = derivedName.substring(0, 55) + "...";

                        await remoteDataAPI.mediaAssets.create({
                            url: link,
                            name: derivedName,
                            fileType: getFileTypeFromUrl(link),
                            /* originalName: null */
                            originType: originType,
                            originId: originId,
                            originLabel: originLabel,
                            state: 'external',
                            storagePath: null
                        });
                        addedCount++;
                    } catch (err) {
                        skippedCount++;
                    }
                }
            };

            // 1. BLOQUES (EJERCICIOS)
            toast.info('Escaneando Ejercicios...', { duration: Infinity, id: 'scan-exercises' });
            const exercises = await fetchBloquesPreview();
            if (exercises) {
                scannedCount += exercises.length;
                for (const ej of exercises) {
                    // Main links
                    const mediaLinks = ej.media_links || ej.mediaLinks; // Handle snake/camel
                    await migrateLinks(mediaLinks, MEDIA_ORIGIN_TYPES.EJERCICIO, ej.id, ej.nombre || ej.code, 'Ejercicio Legacy');

                    // Variations
                    const variations = ej.variations ||
                        (ej.content && Array.isArray(ej.content) ? ej.content : []) ||
                        (ej.content && ej.content.variations) || [];

                    if (Array.isArray(variations)) {
                        for (const v of variations) {
                            const vLinks = [];
                            if (v.asset_url) vLinks.push(v.asset_url);
                            if (v.asset_urls && Array.isArray(v.asset_urls)) vLinks.push(...v.asset_urls);
                            if (v.media_links && Array.isArray(v.media_links)) vLinks.push(...v.media_links);

                            const vLabel = v.label ? `Variación: ${v.label} (${ej.nombre})` : `Variación de ${ej.nombre}`;
                            await migrateLinks(vLinks, MEDIA_ORIGIN_TYPES.VARIACION, v.id || null, vLabel, 'Variación Legacy');
                        }
                    }
                }
            }
            toast.dismiss('scan-exercises');

            // 2. PIEZAS
            toast.info('Escaneando Piezas...', { duration: Infinity, id: 'scan-piezas' });
            const piezas = await fetchPiezasPreview();
            if (piezas) {
                scannedCount += piezas.length;
                for (const p of piezas) {
                    // Check elementos JSON for mediaLinks
                    if (p.elementos && Array.isArray(p.elementos)) {
                        for (const elem of p.elementos) {
                            if (elem.mediaLinks && Array.isArray(elem.mediaLinks)) {
                                await migrateLinks(elem.mediaLinks, MEDIA_ORIGIN_TYPES.PIEZA, p.id, `${p.nombre} - ${elem.nombre}`, 'Pieza Legacy');
                            }
                        }
                    }
                }
            }
            toast.dismiss('scan-piezas');

            // 3. FEEDBACK SEMANAL
            toast.info('Escaneando Feedback Semanal...', { duration: Infinity, id: 'scan-feedback' });
            const feedbacks = await fetchFeedbacksSemanales();
            if (feedbacks) {
                scannedCount += feedbacks.length;
                for (const fb of feedbacks) {
                    const links = fb.media_links || fb.mediaLinks;
                    if (links) { // Assuming format(date) might be needed for label, using ID for now
                        await migrateLinks(links, MEDIA_ORIGIN_TYPES.FEEDBACK_PROFESOR, fb.id, `Feedback del ${new Date(fb.created_at).toLocaleDateString()}`, 'Feedback Profesor');
                    }
                }
            }
            toast.dismiss('scan-feedback');

            // 4. REGISTROS SESION
            toast.info('Escaneando Sesiones...', { duration: Infinity, id: 'scan-sesiones' });
            const sesiones = await fetchRegistrosSesionMultimedia();
            if (sesiones) {
                scannedCount += sesiones.length;
                for (const ses of sesiones) {
                    const links = ses.media_links || ses.mediaLinks;
                    if (links) {
                        await migrateLinks(links, MEDIA_ORIGIN_TYPES.FEEDBACK_SESION, ses.id, `Sesión ${ses.sesion_nombre || new Date(ses.created_at).toLocaleDateString()}`, 'Adjunto de Sesión');
                    }
                }
            }
            toast.dismiss('scan-sesiones');

            // 5. MENSAJES SOPORTE
            toast.info('Escaneando Mensajes de Soporte...', { duration: Infinity, id: 'scan-soporte' });
            const mensajes = await fetchSupportMensajes();
            if (mensajes) {
                scannedCount += mensajes.length;
                for (const msg of mensajes) {
                    const links = msg.media_links || msg.mediaLinks;
                    if (links) {
                        await migrateLinks(links, MEDIA_ORIGIN_TYPES.CENTRO_DUDAS, msg.ticket_id, `Mensaje Soporte`, 'Adjunto Soporte');
                    }
                }
            }
            toast.dismiss('scan-soporte');

            toast.success(`Migración Finalizada. Escaneados: ${scannedCount} items. Agregados: ${addedCount}.`);
            queryClient.invalidateQueries({ queryKey: ['media_assets'] });

        } catch (error) {
            console.error("Migration Error:", error);
            toast.error('Error crítico durante la migración: ' + error.message);
        } finally {
            setIsMigrating(false);
        }
    };

    const getFileTypeFromUrl = (url) => {
        if (!url) return MEDIA_FILE_TYPES.OTHER;
        const lower = url.toLowerCase();
        // Robust YouTube detection
        if (lower.includes('youtube.com/') || lower.includes('youtu.be/')) return MEDIA_FILE_TYPES.YOUTUBE;
        if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || lower.endsWith('.mkv')) return MEDIA_FILE_TYPES.VIDEO;
        if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.m4a') || lower.endsWith('.ogg')) return MEDIA_FILE_TYPES.AUDIO;
        if (lower.endsWith('.jpg') || lower.endsWith('.png') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp')) return MEDIA_FILE_TYPES.IMAGE;
        if (lower.endsWith('.pdf')) return MEDIA_FILE_TYPES.PDF;
        // Google Drive / Docs detection (often used for PDFs)
        if (lower.includes('drive.google.com') && lower.includes('/view')) return MEDIA_FILE_TYPES.PDF;
        return MEDIA_FILE_TYPES.OTHER;
    };

    // Filter Logic
    let filteredAssets = assets;

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredAssets = filteredAssets.filter(a => {
            const derivedName = deriveAssetDisplayName(a).toLowerCase();
            return (
                (a.name || '').toLowerCase().includes(term) ||
                derivedName.includes(term) ||
                (a.originLabel || '').toLowerCase().includes(term) ||
                (a.url || '').toLowerCase().includes(term)
            );
        });
    }

    if (typeFilter !== 'all') {
        filteredAssets = filteredAssets.filter(a => a.fileType === typeFilter);
    }

    if (originFilter !== 'all') {
        if (originFilter === MEDIA_ORIGIN_TYPES.UNLINKED) {
            filteredAssets = filteredAssets.filter(a => !a.originId);
        } else {
            filteredAssets = filteredAssets.filter(a => a.originType === originFilter);
        }
    }

    const columns = [
        {
            key: 'type',
            label: 'Tipo',
            render: (a) => (
                <div className="flex items-center gap-2" title={a.fileType}>
                    {FILE_TYPE_ICONS[a.fileType] || FILE_TYPE_ICONS.other}
                    <span className="text-xs uppercase text-muted-foreground">{a.fileType}</span>
                </div>
            ),
        },
        {
            key: 'name',
            label: 'Nombre / URL',
            render: (a) => <AssetDisplayName asset={a} deriveDisplayName={deriveAssetDisplayName} />,
        },
        {
            key: 'origin',
            label: 'Origen (Vinculado a)',
            render: (a) => {
                if (!a.originId) return <Badge variant="outline" className="text-xs text-gray-400">No vinculado</Badge>;

                const variant = MEDIA_ORIGIN_BADGE_VARIANTS[a.originType] || "default";
                const label = MEDIA_ORIGIN_TYPE_LABELS[a.originType] || a.originType;

                let displayLabel = a.originLabel || a.originId;

                // Truncate exercise labels to code only
                if (a.originType === 'ejercicio' && a.originLabel) {
                    if (displayLabel.includes(' - ')) displayLabel = displayLabel.split(' - ')[0];
                    else if (displayLabel.includes(':')) displayLabel = displayLabel.split(':')[0];
                    else if (displayLabel.includes(' ')) displayLabel = displayLabel.split(' ')[0];
                }

                return (
                    <div className="flex flex-col">
                        <Badge variant={variant} className="w-fit mb-1 text-[10px] uppercase">
                            {label}
                        </Badge>
                        <span className="text-xs truncate max-w-[200px]" title={a.originLabel}>
                            {displayLabel}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'createdAt',
            label: 'Fecha',
            render: (a) => (
                <span className="text-xs text-muted-foreground">
                    {a.createdAt ? format(new Date(a.createdAt), "d MMM yyyy, HH:mm", { locale: es }) : '-'}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (a) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                            if (window.confirm('¿Eliminar este asset? Esta acción no se puede deshacer.')) {
                                deleteAssetMutation.mutate(a.id);
                            }
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const FilterControls = () => (
        <>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Input
                    placeholder="Buscar por nombre, origen o URL..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9"
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[200px] h-9">
                        <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        {Object.entries(MEDIA_FILE_TYPES).map(([key, value]) => (
                            <SelectItem key={value} value={value}>
                                {MEDIA_FILE_TYPE_LABELS[value]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={originFilter} onValueChange={setOriginFilter}>
                    <SelectTrigger className="w-[220px] h-9">
                        <SelectValue placeholder="Todos los orígenes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los orígenes</SelectItem>
                        {Object.entries(MEDIA_ORIGIN_TYPES).map(([key, value]) => (
                            <SelectItem key={value} value={value}>
                                {MEDIA_ORIGIN_TYPE_LABELS[value]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    );

    return (
        <div className={embedded ? "" : "min-h-screen bg-background"}>
            {!embedded && (
                <PageHeader
                    icon={Database}
                    title="Contenido Multimedia"
                    subtitle="Gestión centralizada de archivos y enlaces multimedia"
                    actions={
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMigrateLegacy}
                                disabled={isMigrating}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isMigrating ? 'animate-spin' : ''}`} />
                                {isMigrating ? 'Migrando...' : 'Migrar Legacy'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['media_assets'] })}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refrescar
                            </Button>
                        </div>
                    }
                    filters={<FilterControls />}
                />
            )}

            {embedded && (
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    {/* Filters Left Side */}
                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <FilterControls />
                    </div>

                    {/* Actions Right Side */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMigrateLegacy}
                            disabled={isMigrating}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isMigrating ? 'animate-spin' : ''}`} />
                            {isMigrating ? 'Migrando...' : 'Migrar Legacy'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['media_assets'] })}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refrescar
                        </Button>
                    </div>
                </div>
            )}

            <div className={embedded ? "" : "studia-section"}>
                <Card className={`${componentStyles.containers.cardBase}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Assets: {filteredAssets.length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UnifiedTable
                            columns={columns}
                            data={filteredAssets}
                            isLoading={isLoading}
                            emptyMessage="No se encontraron assets multimedia."
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

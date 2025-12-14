import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { remoteDataAPI } from "@/api/remoteDataAPI";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, FileVideo, FileAudio, Image as ImageIcon, FileText, Trash2, ExternalLink, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import UnifiedTable from "@/components/tables/UnifiedTable";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const FILE_TYPE_ICONS = {
    video: <FileVideo className="w-4 h-4 text-blue-500" />,
    audio: <FileAudio className="w-4 h-4 text-purple-500" />,
    image: <ImageIcon className="w-4 h-4 text-green-500" />,
    pdf: <FileText className="w-4 h-4 text-red-500" />,
    youtube: <FileVideo className="w-4 h-4 text-red-600" />,
    other: <Database className="w-4 h-4 text-gray-500" />,
};

const STATE_BADGES = {
    active: "success",
    archived: "default",
    deleted: "danger",
};

export default function ContenidoMultimediaPage() {
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
            // Helper to migrate a list of links
            const migrateLinks = async (links, originType, originId, originLabel, defaultName) => {
                if (!links || !Array.isArray(links)) return;

                for (const link of links) {
                    if (!link) continue;
                    try {
                        await remoteDataAPI.mediaAssets.create({
                            url: link,
                            name: link.split('/').pop() || defaultName,
                            file_type: getFileTypeFromUrl(link),
                            origin_type: originType,
                            origin_id: originId,
                            origin_label: originLabel,
                            state: 'external',
                            storage_path: null
                        });
                        addedCount++;
                    } catch (err) {
                        skippedCount++;
                    }
                }
            };

            // 1. BLOQUES (EJERCICIOS)
            toast.info('Escaneando Ejercicios...', { duration: Infinity, id: 'scan-exercises' });
            const { data: exercises } = await supabase.from('bloques').select('*');
            if (exercises) {
                scannedCount += exercises.length;
                for (const ej of exercises) {
                    // Main links
                    const mediaLinks = ej.media_links || ej.mediaLinks; // Handle snake/camel
                    await migrateLinks(mediaLinks, 'ejercicio', ej.id, ej.nombre || ej.code, 'Ejercicio Legacy');

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
                            await migrateLinks(vLinks, 'variacion', v.id || null, vLabel, 'Variación Legacy');
                        }
                    }
                }
            }
            toast.dismiss('scan-exercises');

            // 2. PIEZAS
            toast.info('Escaneando Piezas...', { duration: Infinity, id: 'scan-piezas' });
            const { data: piezas } = await supabase.from('piezas').select('*');
            if (piezas) {
                scannedCount += piezas.length;
                for (const p of piezas) {
                    // Check elementos JSON for mediaLinks
                    if (p.elementos && Array.isArray(p.elementos)) {
                        for (const elem of p.elementos) {
                            if (elem.mediaLinks && Array.isArray(elem.mediaLinks)) {
                                await migrateLinks(elem.mediaLinks, 'pieza', p.id, `${p.nombre} - ${elem.nombre}`, 'Pieza Legacy');
                            }
                        }
                    }
                }
            }
            toast.dismiss('scan-piezas');

            // 3. FEEDBACK SEMANAL
            toast.info('Escaneando Feedback Semanal...', { duration: Infinity, id: 'scan-feedback' });
            const { data: feedbacks } = await supabase.from('feedbacks_semanal').select('*');
            if (feedbacks) {
                scannedCount += feedbacks.length;
                for (const fb of feedbacks) {
                    const links = fb.media_links || fb.mediaLinks;
                    if (links) { // Assuming format(date) might be needed for label, using ID for now
                        await migrateLinks(links, 'feedback_profesor', fb.id, `Feedback del ${new Date(fb.created_at).toLocaleDateString()}`, 'Feedback Profesor');
                    }
                }
            }
            toast.dismiss('scan-feedback');

            // 4. REGISTROS SESION
            toast.info('Escaneando Sesiones...', { duration: Infinity, id: 'scan-sesiones' });
            const { data: sesiones } = await supabase.from('registros_sesion').select('*');
            if (sesiones) {
                scannedCount += sesiones.length;
                for (const ses of sesiones) {
                    const links = ses.media_links || ses.mediaLinks;
                    if (links) {
                        await migrateLinks(links, 'feedback_sesion', ses.id, `Sesión ${ses.sesion_nombre || new Date(ses.created_at).toLocaleDateString()}`, 'Adjunto de Sesión');
                    }
                }
            }
            toast.dismiss('scan-sesiones');

            // 5. MENSAJES SOPORTE
            toast.info('Escaneando Mensajes de Soporte...', { duration: Infinity, id: 'scan-soporte' });
            const { data: mensajes } = await supabase.from('support_mensajes').select('*');
            if (mensajes) {
                scannedCount += mensajes.length;
                for (const msg of mensajes) {
                    const links = msg.media_links || msg.mediaLinks;
                    if (links) {
                        await migrateLinks(links, 'centro_dudas', msg.ticket_id, `Mensaje Soporte`, 'Adjunto Soporte');
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
        if (!url) return 'other';
        const lower = url.toLowerCase();
        // Robust YouTube detection
        if (lower.includes('youtube.com/') || lower.includes('youtu.be/')) return 'youtube';
        if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || lower.endsWith('.mkv')) return 'video';
        if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.m4a') || lower.endsWith('.ogg')) return 'audio';
        if (lower.endsWith('.jpg') || lower.endsWith('.png') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp')) return 'image';
        if (lower.endsWith('.pdf')) return 'pdf';
        // Google Drive / Docs detection (often used for PDFs)
        if (lower.includes('drive.google.com') && lower.includes('/view')) return 'pdf';
        return 'other';
    };

    // Filter Logic
    let filteredAssets = assets;

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredAssets = filteredAssets.filter(a =>
            (a.name || '').toLowerCase().includes(term) ||
            (a.origin_label || '').toLowerCase().includes(term) ||
            (a.url || '').toLowerCase().includes(term)
        );
    }

    if (typeFilter !== 'all') {
        filteredAssets = filteredAssets.filter(a => a.fileType === typeFilter);
    }

    if (originFilter !== 'all') {
        if (originFilter === 'unlinked') {
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
            render: (a) => (
                <div className="flex flex-col max-w-[300px]">
                    <span className="font-medium truncate" title={a.name}>{a.name || 'Sin nombre'}</span>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate flex items-center gap-1">
                        {a.url} <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            ),
        },
        {
            key: 'origin',
            label: 'Origen (Vinculado a)',
            render: (a) => {
                if (!a.originId) return <Badge variant="outline" className="text-xs text-gray-400">No vinculado</Badge>;

                let variant = "default";
                let label = a.originType;

                switch (a.originType) {
                    case 'ejercicio': variant = "info"; label = "Ejercicio"; break;
                    case 'variacion': variant = "warning"; label = "Variación"; break;
                    case 'pieza': variant = "secondary"; label = "Pieza"; break;
                    case 'feedback_profesor': variant = "success"; label = "Feedback Pro"; break;
                    case 'feedback_sesion': variant = "outline"; label = "Sesión"; break;
                    case 'centro_dudas': variant = "destructive"; label = "Soporte"; break;
                    default: variant = "secondary";
                }

                return (
                    <div className="flex flex-col">
                        <Badge variant={variant} className="w-fit mb-1 text-[10px] uppercase">
                            {label}
                        </Badge>
                        <span className="text-xs truncate max-w-[200px]" title={a.originLabel}>
                            {a.originLabel || a.originId}
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

    return (
        <div className="min-h-screen bg-background">
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
                filters={
                    <>
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre, origen o URL..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9"
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
                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="all">Todos los tipos</option>
                                <option value="video">Video</option>
                                <option value="audio">Audio</option>
                                <option value="image">Imagen</option>
                                <option value="pdf">PDF</option>
                                <option value="youtube">YouTube</option>
                            </select>
                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={originFilter}
                                onChange={(e) => setOriginFilter(e.target.value)}
                            >
                                <option value="all">Todos los orígenes</option>
                                <option value="ejercicio">Ejercicios</option>
                                <option value="variacion">Variaciones</option>
                                <option value="pieza">Piezas</option>
                                <option value="feedback_profesor">Feedback Profesor</option>
                                <option value="feedback_sesion">Feedback Sesión</option>
                                <option value="centro_dudas">Soporte</option>
                                <option value="unlinked">No vinculados</option>
                            </select>
                        </div>
                    </>
                }
            />

            <div className={componentStyles.layout.page}>
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

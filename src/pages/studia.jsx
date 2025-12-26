/**
 * Studia - Full-screen practice mode (no sidebar)
 * 
 * This page receives session context via query params:
 * - asignacionId: ID of the assignment
 * - semanaIdx: Index of the week in the plan
 * - sesionIdx: Index of the session in the week
 * 
 * The X button navigates back to /hoy.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUsers } from "@/hooks/entities/useUsers";
import { useAsignaciones } from "@/hooks/entities/useAsignaciones";
import { useBloques } from "@/hooks/entities/useBloques";
import { updateBackpackFromSession } from '@/services/backpackService';

import RequireRole from "@/components/auth/RequireRole";
import { ROUTES } from "@/lib/routes";
import { toast } from "sonner";

// Reuse existing components and helpers from hoy.jsx
import {
    calcularOffsetSemanas,
    aplanarSesion,
    formatLocalDate,
    parseLocalDate,
} from "@/components/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import { ensureRondaIds, getSecuencia } from "@/components/study/sessionSequence";
import ResumenFinal from "@/components/estudio/ResumenFinal";
import ModalCancelar from "@/components/estudio/ModalCancelar";
import { shouldIgnoreHotkey } from "@/utils/hotkeys";
import { useHotkeysModal, HotkeysModalProvider } from "@/hooks/useHotkeysModal.jsx";
import { getValidVariations, pickRandomVariation } from "@/hooks/useExerciseVariations";
import HotkeysModal from "@/components/common/HotkeysModal";

// UI Components
import { Card, CardContent } from "@/components/ds";
import { Button } from "@/components/ds/Button";
import { Badge } from "@/components/ds";
import { Alert, AlertDescription, AlertTitle } from "@/components/ds";
import { LoadingSpinner } from "@/components/ds";
import {
    ChevronLeft,
    ChevronRight,
    Pause,
    Play,
    CheckCircle,
    XCircle,
    Clock,
    Music,
    ChevronsRight,
    ChevronUp,
    ChevronDown,
    Target,
    X,
    Piano,
    PlayCircle,
    AlertTriangle,
    List,
    HelpCircle,
    FileText,
    Lightbulb,
    Film,
    Sun,
    Moon,
    Bug,
    Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDesign } from "@/components/design/DesignProvider";
import { componentStyles } from "@/design/componentStyles";
import Metronomo from "@/components/study/Metronomo";
import PianoPanel from "@/components/study/PianoPanel";
import SessionContentView from "@/components/study/SessionContentView";
import MediaEmbed from "@/components/common/MediaEmbed";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDockToFooterOffset } from "@/hooks/useDockToFooterOffset";

// Create remote API instance
const remoteDataAPI = createRemoteDataAPI();

export default function StudiaPage() {
    return (
        <HotkeysModalProvider>
            <RequireRole anyOf={['ESTU']}>
                <StudiaPageContent />
                <HotkeysModalWrapper />
            </RequireRole>
        </HotkeysModalProvider>
    );
}

// Wrapper to render the hotkeys modal
function HotkeysModalWrapper() {
    const { showHotkeysModal, setShowHotkeysModal } = useHotkeysModal();
    return (
        <HotkeysModal
            open={showHotkeysModal}
            onOpenChange={setShowHotkeysModal}
        />
    );
}

function StudiaPageContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showHotkeysModal, setShowHotkeysModal } = useHotkeysModal();
    const { design, activeMode, setActiveMode } = useDesign();

    // Parse query params
    const asignacionIdParam = searchParams.get('asignacionId');
    const semanaIdxParam = parseInt(searchParams.get('semanaIdx') || '0', 10);
    const sesionIdxParam = parseInt(searchParams.get('sesionIdx') || '0', 10);

    // Session state
    const [sesionActiva, setSesionActiva] = useState(null);
    const [indiceActual, setIndiceActual] = useState(0);
    const [tiempoActual, setTiempoActual] = useState(0);
    const [cronometroActivo, setCronometroActiva] = useState(false);
    const [completados, setCompletados] = useState(new Set());
    const [omitidos, setOmitidos] = useState(new Set());
    const [sesionFinalizada, setSesionFinalizada] = useState(false);
    const [datosFinal, setDatosFinal] = useState(null);
    const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
    const [mostrarItinerario, setMostrarItinerario] = useState(false);
    const [reportModalAbierto, setReportModalAbierto] = useState(false);
    const [timerCollapsed, setTimerCollapsed] = useState(false);
    const [mostrarPiano, setMostrarPiano] = useState(false);
    const [ppmAlcanzado, setPpmAlcanzado] = useState(null);
    const [footerHeight, setFooterHeight] = useState(80);
    const [instruccionesOpen, setInstruccionesOpen] = useState(true);
    const [objetivoOpen, setObjetivoOpen] = useState(true);
    const footerRef = useRef(null);
    const chevronRef = useRef(null);

    // Use dock hook for precise Piano-Footer sync using real DOM measurements
    const { syncNow, startTracking, attachTransitionListeners } = useDockToFooterOffset({
        anchorRef: footerRef,
        cssVarName: '--footer-offset',
        enabled: true,
    });

    // Attach transition listeners to footer for rAF tracking during animation
    useEffect(() => {
        if (footerRef.current) {
            const cleanup = attachTransitionListeners(footerRef.current);
            // Initial sync after DOM is ready
            syncNow();
            return cleanup;
        }
    }, [attachTransitionListeners, syncNow]);

    // Set app mode for scoped CSS styling (studia mode = no sidebar, different layout)
    useEffect(() => {
        document.documentElement.setAttribute('data-app-mode', 'studia');
        return () => document.documentElement.removeAttribute('data-app-mode');
    }, []);

    // Sync on timerCollapsed change (triggers transition, rAF will track)
    useEffect(() => {
        syncNow();
    }, [timerCollapsed, syncNow]);

    // Sync when piano opens (ensure correct offset before it animates in)
    useEffect(() => {
        if (mostrarPiano) {
            syncNow();
        }
    }, [mostrarPiano, syncNow]);

    // Timing state
    const [registroSesionId, setRegistroSesionId] = useState(null);
    const [timestampInicio, setTimestampInicio] = useState(null);
    const [timestampUltimoPausa, setTimestampUltimoPausa] = useState(null);
    const [tiempoAcumuladoAntesPausa, setTiempoAcumuladoAntesPausa] = useState(0);
    const bloquesPendientesRef = useRef([]);
    const colaOfflineRef = useRef([]);

    const effectiveUser = useEffectiveUser();

    // Load users (centralized hook)
    const { data: usuarios = [] } = useUsers();

    // Find actual user
    const alumnoActual = usuarios.find(u => {
        if (effectiveUser?.email && u.email) {
            return u.email.toLowerCase().trim() === effectiveUser.email.toLowerCase().trim();
        }
        return u.id === effectiveUser?.id;
    }) || effectiveUser;

    const userIdActual = alumnoActual?.id || effectiveUser?.id;

    // Load assignments (centralized hook)
    const { data: asignacionesRaw = [], isLoading: loadingAsignaciones } = useAsignaciones();

    // Load blocks with variations (centralized hook)
    const { data: bloquesActuales = [] } = useBloques();

    // Filter valid assignments
    const asignaciones = useMemo(() => {
        return asignacionesRaw.filter(a => {
            if (!a.alumnoId) return false;
            if (!a.plan || !Array.isArray(a.plan.semanas) || a.plan.semanas.length === 0) return false;
            if (!a.semanaInicioISO || typeof a.semanaInicioISO !== 'string') return false;
            return true;
        });
    }, [asignacionesRaw]);

    // Find the specific assignment
    const asignacionActiva = useMemo(() => {
        if (!asignacionIdParam) return null;
        return asignaciones.find(a => a.id === asignacionIdParam) || null;
    }, [asignaciones, asignacionIdParam]);

    // Get week and session
    const semanaDelPlan = asignacionActiva?.plan?.semanas?.[semanaIdxParam] || null;
    const sesionDelPlan = semanaDelPlan?.sesiones?.[sesionIdxParam] || null;

    // Initialize session on mount
    useEffect(() => {
        if (!sesionDelPlan || sesionActiva) return;

        // Process session with variations (same logic as empezarSesion in hoy.jsx)
        const sesionActualizada = {
            ...sesionDelPlan,
            bloques: (sesionDelPlan.bloques || []).map(bloqueSnapshot => {
                const bloqueActual = bloquesActuales.find(b => b.code === bloqueSnapshot.code);
                if (!bloqueActual) return bloqueSnapshot;

                const policy = bloqueSnapshot.variation_policy || (bloqueSnapshot.modo === 'repaso' ? 'random' : 'fixed');
                const fixedVariationKey = bloqueSnapshot.selected_variation_key;
                let pickedVariation = null;

                if (policy === 'fixed' && fixedVariationKey && bloqueActual.variations) {
                    pickedVariation = bloqueActual.variations.find(v => v.id === fixedVariationKey || v.label === fixedVariationKey);
                } else if (policy === 'random' && bloqueActual.variations?.length > 0) {
                    const userLevel = alumnoActual?.nivelTecnico || 1;
                    const validVars = getValidVariations(bloqueActual, userLevel);
                    if (validVars) {
                        pickedVariation = pickRandomVariation(validVars);
                    }
                }

                let selectedVariationMedia = null;
                let variationLabel = null;
                let selectedVariationDuration = null;

                if (pickedVariation) {
                    variationLabel = pickedVariation.label;
                    if (pickedVariation.mediaItems?.length > 0) {
                        selectedVariationMedia = pickedVariation.mediaItems;
                    } else if (pickedVariation.assetUrl || pickedVariation.asset_url) {
                        selectedVariationMedia = [{ url: pickedVariation.assetUrl || pickedVariation.asset_url, name: null }];
                    }
                    if (pickedVariation.duracionSeg || pickedVariation.duracion_seg) {
                        selectedVariationDuration = pickedVariation.duracionSeg || pickedVariation.duracion_seg;
                    }
                }

                let mediaLinksFinal = [];
                if (selectedVariationMedia) {
                    mediaLinksFinal = selectedVariationMedia;
                } else if (bloqueActual.content?.mediaItems?.length > 0) {
                    mediaLinksFinal = bloqueActual.content.mediaItems;
                } else if (bloqueActual.mediaLinks?.length > 0) {
                    mediaLinksFinal = bloqueActual.mediaLinks.map(u => typeof u === 'string' ? { url: u, name: null } : u);
                } else if (bloqueSnapshot.mediaLinks?.length > 0) {
                    mediaLinksFinal = bloqueSnapshot.mediaLinks.map(u => typeof u === 'string' ? { url: u, name: null } : u);
                }

                const baseName = bloqueActual.nombre || bloqueSnapshot.nombre;
                const finalName = variationLabel ? `${baseName} / ${variationLabel}` : baseName;

                return {
                    ...bloqueSnapshot,
                    nombre: finalName,
                    mediaLinks: mediaLinksFinal,
                    instrucciones: bloqueActual.instrucciones || bloqueSnapshot.instrucciones,
                    indicadorLogro: bloqueActual.indicadorLogro || bloqueSnapshot.indicadorLogro,
                    materialesRequeridos: bloqueActual.materialesRequeridos || bloqueSnapshot.materialesRequeridos || [],
                    duracionSeg: selectedVariationDuration || bloqueActual.duracionSeg || bloqueSnapshot.duracionSeg || 0,
                    targetPPMs: bloqueActual.targetPPMs || bloqueSnapshot.targetPPMs || [],
                    variationName: variationLabel,
                    backpack_key: bloqueSnapshot.backpack_key || bloqueActual.backpack_key || null,
                    variation_key: pickedVariation ? (pickedVariation.id || pickedVariation.label) : null,
                    variation_policy: policy
                };
            })
        };

        setSesionActiva(sesionActualizada);
        setIndiceActual(0);
        setTiempoActual(0);
        setCronometroActiva(false);
        setCompletados(new Set());
        setOmitidos(new Set());
        setSesionFinalizada(false);
        setDatosFinal(null);
        setRegistroSesionId(null);
        bloquesPendientesRef.current = [];
        setTimestampInicio(Date.now());
        setTimestampUltimoPausa(null);
        setTiempoAcumuladoAntesPausa(0);
    }, [sesionDelPlan, bloquesActuales, alumnoActual, sesionActiva]);

    // Timer logic
    useEffect(() => {
        if (!cronometroActivo || !sesionActiva || sesionFinalizada) return;

        const listaEjecucion = aplanarSesion(sesionActiva);
        const ejercicioActual = listaEjecucion[indiceActual];

        if (ejercicioActual?.tipo === 'AD') {
            setCronometroActiva(false);
            return;
        }

        const interval = setInterval(() => {
            const ahora = Date.now();
            const tiempoDesdeInicio = timestampInicio ? Math.floor((ahora - timestampInicio) / 1000) : 0;
            const tiempoTotal = tiempoAcumuladoAntesPausa + tiempoDesdeInicio;

            if (tiempoTotal >= 18000) {
                setTiempoActual(18000);
                setCronometroActiva(false);
                toast.error("⏳ Tiempo máximo alcanzado (5h). Sesión guardada.");
                setSesionFinalizada(true);
                return;
            }

            setTiempoActual(tiempoTotal);
        }, 1000);

        return () => clearInterval(interval);
    }, [cronometroActivo, sesionActiva, indiceActual, sesionFinalizada, timestampInicio, tiempoAcumuladoAntesPausa]);

    // Auto-start timer when changing exercises
    useEffect(() => {
        if (!sesionActiva || sesionFinalizada) return;
        const listaEjecucion = aplanarSesion(sesionActiva);
        const ejercicioActual = listaEjecucion[indiceActual];

        if (ejercicioActual?.tipo !== 'AD' && document.hasFocus()) {
            if (!cronometroActivo) {
                const ahora = Date.now();
                setTimestampInicio(ahora);
                setTiempoAcumuladoAntesPausa(0);
                setTimestampUltimoPausa(null);
                setCronometroActiva(true);
            }
        } else {
            setCronometroActiva(false);
            setTimestampInicio(null);
            setTiempoAcumuladoAntesPausa(0);
            setTimestampUltimoPausa(null);
        }
        setPpmAlcanzado(null);
    }, [indiceActual, sesionActiva, sesionFinalizada]);

    // Listen for Report Modal events
    useEffect(() => {
        const handleReportModalOpened = () => setReportModalAbierto(true);
        const handleReportModalClosed = () => setReportModalAbierto(false);

        window.addEventListener('report-modal-opened', handleReportModalOpened);
        window.addEventListener('report-modal-closed', handleReportModalClosed);

        return () => {
            window.removeEventListener('report-modal-opened', handleReportModalOpened);
            window.removeEventListener('report-modal-closed', handleReportModalClosed);
        };
    }, []);

    // Pause timer when any modal is open (cancel, itinerary, hotkeys, or report)
    const [pausadoPorModal, setPausadoPorModal] = useState(false);

    useEffect(() => {
        const hayModalAbierto = mostrarModalCancelar || mostrarItinerario || showHotkeysModal || reportModalAbierto;

        if (hayModalAbierto && cronometroActivo) {
            // Pause when any modal opens
            const ahora = Date.now();
            const tiempoDesdeInicio = timestampInicio ? Math.floor((ahora - timestampInicio) / 1000) : 0;
            setTiempoAcumuladoAntesPausa(prev => prev + tiempoDesdeInicio);
            setTimestampInicio(null);
            setCronometroActiva(false);
            setPausadoPorModal(true);
        } else if (!hayModalAbierto && pausadoPorModal && !sesionFinalizada) {
            // Resume when all modals close
            const ahora = Date.now();
            setTimestampInicio(ahora);
            setCronometroActiva(true);
            setPausadoPorModal(false);
        }
    }, [mostrarModalCancelar, mostrarItinerario, showHotkeysModal, reportModalAbierto, pausadoPorModal, sesionFinalizada]);

    // Helper functions
    const guardarRegistroBloque = async (indice, estado, duracionReal = 0) => {
        if (!sesionActiva) return;
        const listaEjecucion = aplanarSesion(sesionActiva);
        const bloque = listaEjecucion[indice];
        if (!bloque) return;

        const dataBloque = {
            asignacionId: asignacionActiva.id,
            alumnoId: userIdActual,
            semanaIdx: semanaIdxParam,
            sesionIdx: sesionIdxParam,
            ordenEjecucion: indice,
            tipo: bloque.tipo,
            code: bloque.code,
            nombre: bloque.nombre,
            duracionObjetivoSeg: bloque.duracionSeg || 0,
            duracionRealSeg: bloque.tipo === 'AD' ? 0 : duracionReal,
            estado: estado,
            inicioISO: new Date().toISOString(),
            finISO: new Date().toISOString(),
            iniciosPausa: 0,
            ppmAlcanzado: ppmAlcanzado,
            backpack_key: bloque.backpack_key || null,
            variation_key: bloque.variation_key || null,
            ppm_objetivo: bloque.targetPPMs?.[0] || null,
        };

        bloquesPendientesRef.current.push(dataBloque);
    };

    const cerrarSesion = () => {
        setCronometroActiva(false);
        setSesionActiva(null);
        setIndiceActual(0);
        setTiempoActual(0);
        setCompletados(new Set());
        setOmitidos(new Set());
        setSesionFinalizada(false);
        setDatosFinal(null);
        setRegistroSesionId(null);
        setTimestampInicio(null);
        setTimestampUltimoPausa(null);
        setTiempoAcumuladoAntesPausa(0);

        // Navigate back
        navigate(ROUTES.HOY);
    };

    const reiniciarSesion = () => {
        setIndiceActual(0);
        setTiempoActual(0);
        setCronometroActiva(false);
        setCompletados(new Set());
        setOmitidos(new Set());
        setSesionFinalizada(false);
        setDatosFinal(null);
        const ahora = Date.now();
        setTimestampInicio(ahora);
        setTimestampUltimoPausa(null);
        setTiempoAcumuladoAntesPausa(0);
    };

    const togglePlayPausa = () => {
        const ahora = Date.now();
        if (cronometroActivo) {
            const tiempoDesdeInicio = timestampInicio ? Math.floor((ahora - timestampInicio) / 1000) : 0;
            setTiempoAcumuladoAntesPausa(prev => prev + tiempoDesdeInicio);
            setTimestampUltimoPausa(ahora);
            setTimestampInicio(null);
            setCronometroActiva(false);
        } else {
            setTimestampInicio(ahora);
            setTimestampUltimoPausa(null);
            setCronometroActiva(true);
        }
    };

    const handleAnterior = () => {
        if (indiceActual > 0) {
            setCronometroActiva(false);
            setIndiceActual(prev => prev - 1);
            setTiempoActual(0);
            const ahora = Date.now();
            setTimestampInicio(ahora);
            setTiempoAcumuladoAntesPausa(0);
            setTimestampUltimoPausa(null);
        }
    };

    const omitirYAvanzar = async () => {
        const listaEjecucion = aplanarSesion(sesionActiva);
        await guardarRegistroBloque(indiceActual, 'omitido', 0);

        const newOmitidos = new Set(omitidos);
        newOmitidos.add(indiceActual);
        completados.delete(indiceActual);
        setOmitidos(newOmitidos);

        toast.info("⏭️ Ejercicio omitido");

        if (indiceActual === listaEjecucion.length - 1) {
            setSesionFinalizada(true);
        } else {
            setCronometroActiva(false);
            setIndiceActual(prev => prev + 1);
            setTiempoActual(0);
            const ahora = Date.now();
            setTimestampInicio(ahora);
            setTiempoAcumuladoAntesPausa(0);
            setTimestampUltimoPausa(null);
        }
    };

    const completarYAvanzar = async () => {
        const listaEjecucion = aplanarSesion(sesionActiva);
        await guardarRegistroBloque(indiceActual, 'completado', tiempoActual);

        const newCompletados = new Set(completados);
        newCompletados.add(indiceActual);
        omitidos.delete(indiceActual);
        setCompletados(newCompletados);

        if (indiceActual === listaEjecucion.length - 1) {
            setSesionFinalizada(true);
        } else {
            setCronometroActiva(false);
            setIndiceActual(prev => prev + 1);
            setTiempoActual(0);
            const ahora = Date.now();
            setTimestampInicio(ahora);
            setTiempoAcumuladoAntesPausa(0);
            setTimestampUltimoPausa(null);
        }
    };

    const handleCancelar = () => {
        setMostrarModalCancelar(true);
    };

    const guardarYSalir = async () => {
        setMostrarModalCancelar(false);
        setSesionFinalizada(true);
    };

    const salirSinGuardar = () => {
        setMostrarModalCancelar(false);
        cerrarSesion();
    };

    const finalizarSesion = async (calidad, notas, mediaLinks) => {
        if (!asignacionActiva || !sesionActiva) return;

        const listaEjecucion = aplanarSesion(sesionActiva);
        const tiempoPrevisto = listaEjecucion
            .filter(e => e.tipo !== 'AD')
            .reduce((sum, e) => sum + (e.duracionSeg || 0), 0);

        const duracionRealTotal = bloquesPendientesRef.current.reduce((acc, b) => acc + (b.duracionRealSeg || 0), 0);

        const dataRegistro = {
            asignacionId: asignacionActiva.id,
            alumnoId: userIdActual,
            profesorAsignadoId: alumnoActual?.profesorAsignadoId || null,
            semanaIdx: semanaIdxParam,
            sesionIdx: sesionIdxParam,
            inicioISO: timestampInicio ? new Date(timestampInicio).toISOString() : new Date().toISOString(),
            finISO: new Date().toISOString(),
            duracionRealSeg: duracionRealTotal,
            duracionObjetivoSeg: tiempoPrevisto,
            bloquesTotales: listaEjecucion.length,
            bloquesCompletados: completados.size,
            bloquesOmitidos: omitidos.size,
            finalizada: true,
            finAnticipado: false,
            motivoFin: null,
            calificacion: calidad,
            notas: notas,
            mediaLinks: mediaLinks || [],
            dispositivo: navigator.userAgent,
            versionSchema: "1.0",
            piezaNombre: asignacionActiva.piezaSnapshot?.nombre || '',
            planNombre: asignacionActiva.plan?.nombre || '',
            semanaNombre: semanaDelPlan?.nombre || '',
            sesionNombre: sesionActiva.nombre || '',
            foco: sesionActiva.foco || 'GEN',
        };

        try {
            const nuevoRegistro = await localDataClient.entities.RegistroSesion.create(dataRegistro);
            const nuevoId = nuevoRegistro.id;
            setRegistroSesionId(nuevoId);

            const promesasBloques = bloquesPendientesRef.current.map(bloque => {
                return localDataClient.entities.RegistroBloque.create({
                    ...bloque,
                    registroSesionId: nuevoId
                });
            });

            await Promise.all(promesasBloques);

            try {
                await updateBackpackFromSession({
                    studentId: userIdActual,
                    registrosBloque: bloquesPendientesRef.current
                });
            } catch (bpError) {
                console.error("Error actualizando backpack:", bpError);
            }

            toast.success("✅ Sesión guardada correctamente");
            bloquesPendientesRef.current = [];

        } catch (error) {
            console.error("Error al guardar sesión:", error);
            toast.error("❌ Error al guardar la sesión. Se intentará guardar localmente.");
            colaOfflineRef.current.push({
                tipo: 'sesion_completa',
                data: { sesion: dataRegistro, bloques: bloquesPendientesRef.current },
                timestamp: Date.now(),
            });
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (!sesionActiva || sesionFinalizada) return;

        const handleKeyDown = (e) => {
            // 1. Priority: ESCAPE (Always handled first)
            if (e.key === 'Escape') {
                e.preventDefault();
                if (mostrarItinerario) {
                    setMostrarItinerario(false);
                } else if (mostrarModalCancelar) {
                    setMostrarModalCancelar(false);
                } else if (mostrarPiano) {
                    setMostrarPiano(false);
                } else {
                    setMostrarModalCancelar(true);
                }
                return;
            }

            // 2. Strict Blocking: If any modal-like overlay is open, BLOCK EVERYTHING ELSE
            //    (Exit Confirmation, Report Error, Hotkeys CheatSheet, Piano Panel)
            if (reportModalAbierto || mostrarModalCancelar || showHotkeysModal || mostrarPiano) {
                // Exception: Allow '?' to toggle (close) the Hotkeys modal even if it's open (Strict block would prevent it otherwise)
                if (e.key === '?') {
                    e.preventDefault();
                    setShowHotkeysModal(prev => !prev);
                    return;
                }
                return;
            }

            // 3. Global Toggles (Allowed if NO strict modal is open)
            if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                setMostrarItinerario(prev => !prev);
                return;
            }

            if (e.key === '?') {
                e.preventDefault();
                setShowHotkeysModal(prev => !prev);
                return;
            }

            // 4. Session Control Blocking: If Drawer (Itinerary) is open, BLOCK Session Controls
            //    (Space, Arrows, Enter, etc.)
            if (mostrarItinerario) return;

            // 5. Normal Session Controls (Only when fully focused on the session)
            if (shouldIgnoreHotkey(e)) return;

            const listaEjecucion = aplanarSesion(sesionActiva);

            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                const ejercicioActual = listaEjecucion[indiceActual];
                if (ejercicioActual?.tipo !== 'AD') {
                    togglePlayPausa();
                }
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (indiceActual > 0) handleAnterior();
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (indiceActual < listaEjecucion.length - 1) omitirYAvanzar();
            }

            if (e.key === 'o' || e.key === 'O' || e.key === 'Enter') {
                e.preventDefault();
                completarYAvanzar();
            }

            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                omitirYAvanzar();
            }

            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                handleAnterior();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [sesionActiva, sesionFinalizada, indiceActual, mostrarModalCancelar, mostrarItinerario, reportModalAbierto, showHotkeysModal, mostrarPiano]);

    // Loading state
    if (loadingAsignaciones || !sesionActiva) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <LoadingSpinner size="xl" text="Cargando sesión de estudio..." />
            </div>
        );
    }

    // Error state - no assignment found
    if (!asignacionActiva || !semanaDelPlan || !sesionDelPlan) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-[var(--color-warning)]" />
                        <h2 className="text-lg font-bold mb-2">Sesión no encontrada</h2>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                            No se pudo cargar la sesión de estudio. Por favor, vuelve a seleccionarla.
                        </p>
                        <Button variant="primary" onClick={() => navigate(ROUTES.HOY)}>
                            Volver a Studia
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Session finished - show summary
    if (sesionFinalizada) {
        const listaEjecucion = aplanarSesion(sesionActiva);
        const tiempoPrevisto = listaEjecucion
            .filter(e => e.tipo !== 'AD')
            .reduce((sum, e) => sum + (e.duracionSeg || 0), 0);

        return (
            <ResumenFinal
                sesion={sesionActiva}
                tiempoReal={datosFinal?.tiempoReal || tiempoActual}
                tiempoPrevisto={tiempoPrevisto}
                completados={completados}
                omitidos={omitidos}
                totalEjercicios={listaEjecucion.length}
                onGuardarYSalir={cerrarSesion}
                onReiniciar={reiniciarSesion}
                open={sesionFinalizada}
                onOpenChange={(open) => {
                    if (!open) cerrarSesion();
                }}
                onCalidadNotas={async (calidad, notas, mediaLinks) => {
                    setDatosFinal(prev => ({ ...prev, calidad, notas, mediaLinks }));
                    await finalizarSesion(calidad, notas, mediaLinks);
                }}
                userId={userIdActual}
                userProfile={alumnoActual}
                registroSesionId={registroSesionId}
                profesorAsignadoId={alumnoActual?.profesorAsignadoId}
            />
        );
    }

    // Active session - render player UI
    const listaEjecucion = aplanarSesion(sesionActiva);
    const ejercicioActual = listaEjecucion[indiceActual];

    if (!ejercicioActual) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Alert className="max-w-md border-[var(--color-danger)]">
                    <AlertTriangle className="h-5 w-5 text-[var(--color-danger)]" />
                    <AlertTitle>Error al cargar ejercicio</AlertTitle>
                    <AlertDescription className="mt-2">
                        No se pudo cargar el ejercicio actual.
                        <Button variant="outline" onClick={cerrarSesion} className="mt-4">
                            Volver
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const isAD = ejercicioActual?.tipo === 'AD';
    const isUltimo = indiceActual === listaEjecucion.length - 1;
    const porcentajeEjercicio = ejercicioActual?.duracionSeg > 0
        ? (tiempoActual / ejercicioActual.duracionSeg) * 100
        : 0;
    const porcentajeEjercicioLimitado = Math.min(porcentajeEjercicio, 100);
    const excedido = tiempoActual > (ejercicioActual?.duracionSeg || 0);
    const enRangoWarning = !excedido && porcentajeEjercicio >= 90 && porcentajeEjercicio <= 100;

    const focoLabels = {
        GEN: 'General', SON: 'Sonido', FLX: 'Flexibilidad',
        MOT: 'Motricidad', ART: 'Articulación', COG: 'Cognitivo',
    };
    const focoColors = {
        GEN: componentStyles.status.badgeDefault,
        LIG: componentStyles.status.badgeInfo,
        RIT: componentStyles.status.badgeDefault,
        ART: componentStyles.status.badgeSuccess,
    };

    return (
        <div className="min-h-screen bg-background transition-all duration-300 ease-in-out" style={{
            paddingBottom: timerCollapsed ? '80px' : '150px'
        }}>
            {/* Timer dock */}
            <div
                ref={footerRef}
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border-default)] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out pb-[env(safe-area-inset-bottom)]",
                    timerCollapsed ? "min-h-[80px] h-auto" : "min-h-[80px]"
                )}
            >


                {/* Progress bar - centered on the border */}
                {!isAD && ejercicioActual?.duracionSeg > 0 && (
                    <div
                        className={cn(
                            "absolute left-0 right-0 h-2 md:h-2.5 overflow-hidden transition-all duration-300 -top-1 md:-top-[5px] rounded-full",
                            excedido ? 'bg-[var(--color-danger)]/20' : enRangoWarning ? 'bg-[var(--color-warning)]/20' : 'bg-[var(--color-border-default)]/30'
                        )}
                    >
                        <div
                            className={cn(
                                "h-full transition-all duration-300 rounded-full",
                                excedido ? 'bg-[var(--color-danger)]' : enRangoWarning ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-primary)]'
                            )}
                            style={{ width: `${porcentajeEjercicioLimitado}%` }}
                        />
                    </div>
                )}

                {/* Main controls row */}
                <div className={cn("max-w-5xl mx-auto px-4 py-3", excedido ? "border-b-2 border-[var(--color-danger)]" : "")}>
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-2">
                        {/* Left: Time - shrink-0 to give space to center */}
                        <div className="flex items-center gap-2 shrink-0 order-1 sm:order-none">
                            <Clock className={cn("w-4 h-4 shrink-0", excedido ? "text-[var(--color-danger)]" : enRangoWarning ? "text-[var(--color-warning)]" : "text-[var(--color-primary)]")} />
                            <div className="flex flex-col min-w-0">
                                <div className={cn("text-base font-mono font-bold tabular-nums leading-tight", excedido ? "text-[var(--color-danger)]" : enRangoWarning ? "text-[var(--color-warning)]" : "text-[var(--color-text-primary)]")}>
                                    {Math.floor(tiempoActual / 60)}:{String(tiempoActual % 60).padStart(2, '0')}
                                </div>
                                {!isAD && ejercicioActual?.duracionSeg > 0 && (
                                    <div className="text-[10px] text-[var(--color-text-secondary)] font-mono tabular-nums leading-tight">
                                        / {Math.floor(ejercicioActual.duracionSeg / 60)}:{String((ejercicioActual.duracionSeg % 60)).padStart(2, '0')}
                                    </div>
                                )}
                            </div>

                            <Button
                                variant={mostrarPiano ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setMostrarPiano(!mostrarPiano)}
                                className={cn(
                                    "h-9 w-9 p-0 rounded-lg shrink-0 ml-1 transition-colors",
                                    mostrarPiano
                                        ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
                                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                                )}
                                title="Piano (T)"
                            >
                                <Piano className="w-4 h-4" />
                            </Button>

                            {/* Theme Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveMode(activeMode === 'dark' ? 'light' : 'dark')}
                                className="h-9 w-9 p-0 rounded-lg shrink-0 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors"
                                title={activeMode === 'dark' ? "Modo claro" : "Modo oscuro"}
                            >
                                {activeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 min-w-0 justify-center px-1 order-3 w-full sm:w-auto sm:order-none sm:flex-1">
                            <Button variant="outline" size="sm" onClick={handleAnterior} disabled={indiceActual === 0} className="h-9 flex-1 min-w-0 px-2 rounded-lg shrink-0 sm:max-w-[120px]" title="Anterior (P)">
                                <ChevronLeft className="w-4 h-4 shrink-0 sm:mr-1" />
                                <span className="truncate">Atrás</span>
                            </Button>

                            {!isAD && (
                                <Button variant="outline" size="sm" onClick={togglePlayPausa} className="h-9 flex-1 min-w-0 p-0 rounded-lg shrink-0 sm:max-w-[60px]" title={cronometroActivo ? "Pausar" : "Reproducir"}>
                                    {cronometroActivo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </Button>
                            )}

                            <Button
                                variant="primary"
                                onClick={completarYAvanzar}
                                className="h-9 flex-1 min-w-0 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 font-semibold text-sm rounded-lg shadow-sm text-white shrink-0 px-2 sm:max-w-[120px]"
                                title="Completar (Enter)"
                            >
                                <CheckCircle className="w-4 h-4 shrink-0 sm:mr-1" />
                                <span className="truncate">{isUltimo ? 'Finalizar' : 'OK'}</span>
                            </Button>

                            {!isUltimo && (
                                <Button variant="outline" size="sm" onClick={omitirYAvanzar} className="h-9 flex-1 min-w-0 px-2 rounded-lg shrink-0 sm:max-w-[120px]" title="Omitir (N)">
                                    <ChevronsRight className="w-4 h-4 shrink-0 sm:mr-1" />
                                    <span className="truncate">Saltar</span>
                                </Button>
                            )}
                        </div>

                        {/* Right: Progress + collapse */}
                        <div className="flex items-center gap-2 shrink-0 order-2 sm:order-none">
                            <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs transition-all",
                                "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)]"
                            )}>
                                <Target className="w-3.5 h-3.5" />
                                <span className="font-mono tabular-nums">
                                    {indiceActual + 1}<span className="text-[var(--color-text-secondary)] font-normal">/{listaEjecucion.length}</span>
                                </span>
                            </div>

                            <Button variant="ghost" size="sm" onClick={() => setTimerCollapsed(!timerCollapsed)} className="h-9 w-9 p-0">
                                {timerCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Separator line - center turns danger when time exceeded */}
                {!timerCollapsed && (
                    <div className="w-full h-[1px] flex items-center justify-center">
                        <div
                            className="h-full transition-all"
                            style={{
                                width: excedido ? '40%' : '100%',
                                background: excedido
                                    ? 'linear-gradient(90deg, transparent 0%, var(--color-danger) 30%, var(--color-danger) 70%, transparent 100%)'
                                    : 'var(--color-border-default)'
                            }}
                        />
                    </div>
                )}

                {/* Breadcrumb row - shows exercises around current */}
                {!timerCollapsed && (
                    <div className="max-w-5xl mx-auto px-4 py-2">
                        <TooltipProvider>
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4">
                                {listaEjecucion.slice(Math.max(0, indiceActual - 2), Math.min(listaEjecucion.length, indiceActual + 4)).map((ej, idx) => {
                                    const realIdx = Math.max(0, indiceActual - 2) + idx;
                                    const isActive = realIdx === indiceActual;
                                    const isCompleted = completados.has(realIdx);
                                    const isOmitted = omitidos.has(realIdx);

                                    // Format label for breadcrumb
                                    let label = ej.tipo;
                                    if (ej.esRonda && ej.rondaIdx !== undefined && ej.repeticion !== undefined) {
                                        label = `${ej.tipo} R${ej.rondaIdx + 1}-${ej.repeticion}`;
                                    }

                                    const nombreEjercicio = ej.nombre || `${ej.tipo}`;

                                    return (
                                        <React.Fragment key={realIdx}>
                                            {idx > 0 && <ChevronRight className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => {
                                                            setIndiceActual(realIdx);
                                                            setTiempoActual(0);
                                                            setTimestampInicio(Date.now());
                                                            setTiempoAcumuladoAntesPausa(0);
                                                        }}
                                                        className={cn(
                                                            "px-2 py-0.5 rounded text-xs font-medium shrink-0 transition-all whitespace-nowrap",
                                                            isActive
                                                                ? "bg-[var(--color-primary)] text-white shadow-sm"
                                                                : isCompleted
                                                                    ? "bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30"
                                                                    : isOmitted
                                                                        ? "bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30"
                                                                        : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]/80"
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="max-w-xs">{nombreEjercicio}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </TooltipProvider>
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="studia-player-header header-modern lg:sticky lg:top-0 z-10">
                <div className="studia-player-header-inner">
                    <div className="page-header-grid">
                        <div className="page-header-title">
                            <PlayCircle className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[var(--color-primary)]" />
                            <h1 className={`${componentStyles.typography.pageTitle} text-base sm:text-lg md:text-xl lg:text-2xl flex-1 min-w-0`}>
                                <span className="truncate block">{ejercicioActual?.nombre || 'Ejercicio'}</span>
                            </h1>
                        </div>
                        <div className="page-header-actions">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 border-0 shadow-sm"
                                onClick={() => window.dispatchEvent(new CustomEvent('open-error-report', { detail: {} }))}
                                title="Reportar error"
                            >
                                <Bug className="w-5 h-5 sm:w-4 sm:h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl" onClick={() => setMostrarItinerario(true)}>
                                <List className="w-5 h-5 sm:w-4 sm:h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="hidden lg:inline-flex h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl" onClick={() => setShowHotkeysModal(true)}>
                                <Keyboard className="w-5 h-5 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-0 rounded-xl hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
                                onClick={handleCancelar}
                                title="Salir (Esc)"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Breadcrumbs */}
                    <div className="hidden sm:flex items-center mt-1">
                        <p className={`${componentStyles.typography.pageSubtitle} text-xs sm:text-sm md:text-base flex items-center gap-2 flex-wrap`}>
                            <Music className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                            <span className="font-medium">{asignacionActiva.piezaSnapshot?.nombre}</span>
                            <span className="text-[var(--color-text-secondary)]">•</span>
                            <Target className="w-3 h-3 text-[var(--color-info)] shrink-0" />
                            <span>{asignacionActiva.plan?.nombre}</span>
                            <span className="text-[var(--color-text-secondary)]">•</span>
                            <Badge className={focoColors[sesionActiva.foco]} variant="outline">
                                {focoLabels[sesionActiva.foco]}
                            </Badge>
                        </p>
                    </div>
                </div>
            </div>

            {/* Exercise content */}
            <div className="max-w-[900px] md:max-w-[1000px] mx-auto p-4 md:p-6">
                <Card className="app-card shadow-md">
                    <CardContent className="p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4">
                        {isAD && (
                            <Alert className={`${componentStyles.containers.panelBase} border-[var(--color-primary)] bg-[var(--color-primary-soft)]`}>
                                <AlertTriangle className="h-4 w-4 text-[var(--color-primary)]" />
                                <AlertDescription>Este ejercicio no suma tiempo real</AlertDescription>
                            </Alert>
                        )}

                        {ejercicioActual.instrucciones && (
                            <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4">
                                <button
                                    onClick={() => setInstruccionesOpen(!instruccionesOpen)}
                                    className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
                                >
                                    <FileText className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                    <span className="text-sm font-semibold flex-1">Instrucciones</span>
                                    {instruccionesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                {instruccionesOpen && (
                                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed mt-2 pl-6">
                                        {ejercicioActual.instrucciones}
                                    </p>
                                )}
                            </div>
                        )}

                        {ejercicioActual.indicadorLogro && (
                            <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4">
                                <button
                                    onClick={() => setObjetivoOpen(!objetivoOpen)}
                                    className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
                                >
                                    <Lightbulb className="w-4 h-4 text-[var(--color-text-secondary)]" />
                                    <span className="text-sm font-semibold flex-1">Objetivo de logro</span>
                                    {objetivoOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                {objetivoOpen && (
                                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed mt-2 pl-6">
                                        {ejercicioActual.indicadorLogro}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Metronome if has targetPPMs */}
                        {!isAD && ejercicioActual.targetPPMs?.length > 0 && (() => {
                            const nivelAlumno = alumnoActual?.nivelTecnico || 1;
                            const target = ejercicioActual.targetPPMs.find(t => t.nivel === nivelAlumno);
                            if (target) {
                                return (
                                    <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4">
                                        <div className="mb-4 p-3 bg-[var(--color-surface-muted)] rounded-lg flex items-center gap-2 text-sm font-medium border border-[var(--color-border-default)]">
                                            <span>🎯</span>
                                            <span>Tempo objetivo (Nivel {target.nivel}): {target.unidad || 'Negra'} = {target.bpm} bpm</span>
                                        </div>
                                        <Metronomo initialBpm={target.bpm} onPpmChange={setPpmAlcanzado} />
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Media */}
                        {ejercicioActual.mediaLinks?.length > 0 && (
                            <div className="border-b border-[var(--color-border-default)] pb-3 md:pb-4 last:border-b-0">
                                <p className="text-sm font-semibold mb-2">🎬 Material</p>
                                <div className="space-y-2">
                                    {ejercicioActual.mediaLinks.map((media, idx) => (
                                        <MediaEmbed key={idx} url={typeof media === 'string' ? media : media.url} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Piano Panel - always rendered for exit animation */}
            <PianoPanel
                isOpen={mostrarPiano}
                onClose={() => setMostrarPiano(false)}
                bottomOffset={footerHeight}
            />

            {/* Cancel Modal */}
            {mostrarModalCancelar && (
                <ModalCancelar
                    onGuardarYSalir={guardarYSalir}
                    onSalirSinGuardar={salirSinGuardar}
                    onContinuar={() => setMostrarModalCancelar(false)}
                />
            )}

            {/* Itinerary Dialog */}
            <Dialog open={mostrarItinerario} onOpenChange={setMostrarItinerario}>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Índice de Ejercicios</DialogTitle>
                        <DialogDescription className="sr-only">
                            Lista de ejercicios de la sesión actual
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-3 space-y-2">
                        {listaEjecucion.map((ej, idx) => {
                            const estaActivo = idx === indiceActual;
                            const estaCompletado = completados.has(idx);
                            const estaOmitido = omitidos.has(idx);

                            return (
                                <button
                                    key={`ejercicio-${idx}`}
                                    onClick={() => {
                                        setIndiceActual(idx);
                                        setTiempoActual(0);
                                        setTimestampInicio(Date.now());
                                        setTiempoAcumuladoAntesPausa(0);
                                        setMostrarItinerario(false);
                                    }}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg border transition-all min-h-[52px]",
                                        estaActivo
                                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-text-primary)] border-[var(--color-primary)] shadow-sm'
                                            : estaCompletado
                                                ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]'
                                                : estaOmitido
                                                    ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]'
                                                    : 'bg-[var(--color-surface)] border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]'
                                    )}
                                    aria-label={`Ir a ejercicio ${idx + 1}: ${ej.nombre}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold min-w-[24px] text-[var(--color-text-primary)]">#{idx + 1}</span>
                                        <Badge variant="outline" className="text-xs border">
                                            {ej.tipo}
                                        </Badge>
                                        <span className="flex-1 text-sm font-medium truncate text-[var(--color-text-primary)]">{ej.nombre}</span>
                                        {estaCompletado && <CheckCircle className="w-4 h-4 text-[var(--color-success)] shrink-0" />}
                                        {estaOmitido && <XCircle className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { getCachedAuthUser } from "@/auth/authUserCache";
import {
    Flame,
    Backpack,
    CheckCircle2,
    Check,
    Clock,
    Play,
    Zap,
    Repeat,
    Shuffle,
    Activity,
    Music,
    FileImage,
    Plus,
    GripVertical,
    Trash2,
    ChevronRight,
    MoreVertical,
    Layout as LayoutIcon,
    BarChart3,
    Calendar,
    Users,
    Eye,
    BookOpen,
    ListMusic,
    History
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient'; // Real Data Switch
import { deleteBloque, fetchPlanesPreview, fetchRegistrosSesionPreview } from "@/api/remoteDataAPI";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ExerciseTypeKey = 'TC' | 'FL' | 'SON' | 'ART' | 'MEC' | 'CA' | 'CB' | 'TM' | 'VC' | 'AD' | 'FM';

interface ExerciseVariation {
    label: string;
    min_level: number;
    tags: string[];
    asset_url: string | null;
}

interface StudiaExercise {
    id: string;
    title: string;
    type: ExerciseTypeKey;
    category: string;
    mode: 'learning' | 'review' | 'archived';
    status: 'active' | 'mastered' | 'archived';
    dur: number;
    asset: string;
    variations: ExerciseVariation[];
    raw: any;
}

interface ItineraryItem extends StudiaExercise {
    isFocus: boolean;
    activeVariation?: ExerciseVariation | null;
}

interface StudentItinerary {
    items: ItineraryItem[];
    totalMin: number;
}

interface StudiaPlan {
    id: string;
    nombre: string;
    objetivo_semanal_por_defecto?: string;
    objetivoSemanalPorDefecto?: string;
    semanas?: string | any[];
}

interface StudiaSession {
    id: string;
    duracion_real_seg?: number;
    duracionRealSeg?: number;
    duracion_objetivo_seg?: number;
    duracionObjetivoSeg?: number;
    created_at?: string;
    created_date?: string;
}

interface ExerciseFormData {
    nombre: string;
    tipo: string;
    duracion: number;
}

// Helper for Categories
const TYPE_MAP: Record<ExerciseTypeKey, { label: string; color: string }> = {
    'TC': { label: 'Técnica', color: 'bg-blue-100 text-blue-700' },
    'FL': { label: 'Flexibilidad', color: 'bg-green-100 text-green-700' },
    'SON': { label: 'Sonido', color: 'bg-purple-100 text-purple-700' },
    'ART': { label: 'Articulación', color: 'bg-orange-100 text-orange-700' },
    'MEC': { label: 'Mecanismo', color: 'bg-slate-100 text-slate-700' },
    'CA': { label: 'Calentamiento', color: 'text-orange-600 bg-orange-50' },
    'CB': { label: 'Calentamiento', color: 'text-orange-600 bg-orange-50' },
    'TM': { label: 'Téc. Mantenimiento', color: 'text-blue-600 bg-blue-50' },
    'VC': { label: 'Vuelta Calma', color: 'text-green-600 bg-green-50' },
    'AD': { label: 'Advertencia', color: 'text-red-600 bg-red-50' },
    'FM': { label: 'Musicalidad', color: 'text-pink-600 bg-pink-50' },
};

// --- MOCKED VARIATIONS DATA (Simulating JSONB 'content') ---
const MOCKED_VARIATIONS = {
    'TC-COL-0004': [
        { label: 'Sistema 1', min_level: 1, tags: ['easy', 'tone'], asset_url: 'https://placehold.co/600x150/e2e8f0/475569?text=Colin+4+-+Sistema+1' },
        { label: 'Sistema 2', min_level: 2, tags: ['medium', 'flex'], asset_url: 'https://placehold.co/600x150/e2e8f0/475569?text=Colin+4+-+Sistema+2' },
        { label: 'Sistema 3', min_level: 3, tags: ['hard', 'range'], asset_url: 'https://placehold.co/600x150/e2e8f0/475569?text=Colin+4+-+Sistema+3' }
    ],
    'TC-CLA-0002': [
        { label: 'Var A (Ligado)', min_level: 1, tags: ['slur'], asset_url: null }, // Test Fallback
        { label: 'Var B (Piccado)', min_level: 2, tags: ['staccato'], asset_url: 'https://placehold.co/600x150/e2e8f0/475569?text=Clarke+2+-+Var+B' }
    ]
};

export default function StudiaConceptPage() {
    // State for Real Data
    const [localExercises, setLocalExercises] = useState<StudiaExercise[]>([]);
    const [realPlanes, setRealPlanes] = useState<StudiaPlan[]>([]);
    const [realSessions, setRealSessions] = useState<StudiaSession[]>([]);
    const [loading, setLoading] = useState(true);

    // State for UI
    const [view, setView] = useState<'profe' | 'student' | 'dashboard'>('profe');
    const [activeTab, setActiveTab] = useState('ejercicios');
    const [showArchived, setShowArchived] = useState(false);

    // Dashboard Accordion State
    const [expandedVarId, setExpandedVarId] = useState<string | null>(null);
    const [showBackpack, setShowBackpack] = useState(false); // Toggle List vs Backpack Cloud

    // Derived State
    const [studentItinerary, setStudentItinerary] = useState<StudentItinerary>({ items: [], totalMin: 0 });

    // --- CRUD STATE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null); // If null -> Create Mode
    const [formData, setFormData] = useState<ExerciseFormData>({ nombre: '', tipo: 'TC', duracion: 5 });

    // --- CRUD HANDLERS ---
    const handleOpenModal = (exercise: StudiaExercise | null = null) => {
        if (exercise) {
            setEditingId(exercise.id);
            setFormData({
                nombre: exercise.title,
                tipo: exercise.type,
                duracion: exercise.dur
            });
        } else {
            setEditingId(null);
            setFormData({ nombre: '', tipo: 'TC', duracion: 5 });
        }
        setIsModalOpen(true);
    };

    const handleSaveExercise = async () => {
        if (!formData.nombre) return toast.error("El nombre es obligatorio");

        setLoading(true);
        // Optimistic / Local Update Preparation
        const tempId = editingId || `temp_${Date.now()}`;
        const exerciseType = formData.tipo as ExerciseTypeKey;
        const newItem: StudiaExercise = {
            id: tempId,
            title: formData.nombre,
            type: exerciseType,
            category: TYPE_MAP[exerciseType]?.label || 'General',
            mode: 'learning',
            status: 'active',
            dur: formData.duracion,
            asset: 'resource.pdf',
            raw: {},
            variations: [] // New items start with no variations
        };

        try {
            const user = await getCachedAuthUser();
            const payload = {
                nombre: formData.nombre,
                tipo: formData.tipo,
                duracion_seg: formData.duracion * 60,
                profesor_id: user?.id
            };

            if (editingId) {
                // UPDATE
                // Optimistic UI
                setLocalExercises(prev => prev.map(e => e.id === editingId ? { ...e, ...newItem } : e));
                setIsModalOpen(false); // Close immediately for responsiveness

                const { error } = await supabase
                    .from('bloques')
                    .update(payload)
                    .eq('id', editingId);
                if (error) {
                    // Revert if error (not implemented for simplicity in mockup)
                    throw error;
                }
                toast.success("Ejercicio actualizado");
            } else {
                // INSERT
                // Optimistic UI
                setLocalExercises(prev => [newItem, ...prev]);
                setIsModalOpen(false);

                const { data, error } = await supabase
                    .from('bloques')
                    .insert([payload])
                    .select(); // Select to get the real ID

                if (error) throw error;

                // Update temp ID with real ID
                if (data && data[0]) {
                    setLocalExercises(prev => prev.map(e => e.id === tempId ? { ...e, id: data[0].id } : e));
                }
                toast.success("Ejercicio creado");
            }
        } catch (error: any) {
            console.error("Error saving:", error);
            toast.error(`Error al guardar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteExercise = async (id: string) => {
        if (!confirm("¿Seguro que quieres borrar este ejercicio?")) return;

        // Optimistic Delete
        setLocalExercises(prev => prev.filter(e => e.id !== id));

        try {
            await deleteBloque(id);
            toast.success("Ejercicio eliminado");
        } catch (e) {
            toast.error("Error al eliminar");
            // Re-fetch or revert would be ideal here
        }
    };

    // --- FETCH DATA FROM SUPABASE ---
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // 1. Fetch Bloques (Exercises)
                const { data: bloques, error: errBloques } = await supabase
                    .from('bloques')
                    .select('*')
                    .order('created_at', { ascending: false }) // ensure newest first
                    .limit(100);

                if (errBloques) throw errBloques;

                if (bloques) {
                    // Map Bloques and Attach MOCKED VARIATIONS (For Demo: Attach to first few items regardless of ID)
                    const mappedBloques: StudiaExercise[] = bloques.map((b: any, idx: number) => {
                        let vars: ExerciseVariation[] = [];
                        // DEMO HACK: Force attach variations to the first 2 items to guarantee UI testing
                        if (idx === 0) vars = MOCKED_VARIATIONS['TC-COL-0004'];
                        else if (idx === 1) vars = MOCKED_VARIATIONS['TC-CLA-0002'];
                        // Standard match (if IDs matched) - skip for safety

                        const bloqueType = (b.tipo || 'TC') as ExerciseTypeKey;
                        const categoryInfo = TYPE_MAP[bloqueType] || { label: 'General', color: 'text-slate-600 bg-slate-50' };
                        // Simulate lifecycle status (since real data might not have per-student status yet)
                        let mode: 'learning' | 'review' | 'archived' = 'learning';
                        let status: 'active' | 'mastered' | 'archived' = 'active';
                        if (idx % 3 === 0) { mode = 'review'; status = 'mastered'; }
                        if (idx % 10 === 0) { mode = 'archived'; status = 'archived'; }

                        // Handle DB variations (duracion_seg or duracionSeg)
                        const dur = Math.round((b.duracion_seg || b.duracionSeg || 300) / 60);

                        return {
                            id: b.id as string,
                            title: b.nombre as string,
                            type: bloqueType,
                            category: categoryInfo.label,
                            mode,
                            status,
                            dur: dur || 5,
                            asset: 'resource.pdf',
                            variations: vars,
                            raw: b
                        };
                    });
                    setLocalExercises(mappedBloques);

                    // Generate Itinerary (Mock Logic: 1st=Focus, others=Review with Variations)
                    const itinerary: ItineraryItem[] = mappedBloques.slice(0, 4).map((ex, i) => {
                        const itemMode: 'learning' | 'review' = i === 0 ? 'learning' : 'review';
                        let activeVar: ExerciseVariation | null = null;

                        if (itemMode === 'review' && ex.variations.length > 0) {
                            // Filter by Level (Mock User Level = 2)
                            // 100% Random Selection from Valid Pool
                            const valid = ex.variations.filter((v: ExerciseVariation) => v.min_level <= 2);
                            if (valid.length > 0) {
                                activeVar = valid[Math.floor(Math.random() * valid.length)];
                            }
                        }

                        return {
                            ...ex,
                            mode: itemMode,
                            isFocus: itemMode === 'learning',
                            activeVariation: activeVar
                        };
                    });

                    const totalMin = itinerary.reduce((sum, item) => sum + item.dur, 0);
                    setStudentItinerary({ items: itinerary, totalMin });
                }

                // 2. Fetch Planes
                const planes = await fetchPlanesPreview();
                if (planes) setRealPlanes(planes);

                // 3. Fetch Sessions
                const sessions = await fetchRegistrosSesionPreview();
                if (sessions) setRealSessions(sessions);

            } catch (error) {
                console.error("Error loading Studia data:", error);
                toast.error("Error cargando datos de Supabase");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // --- LOGIC ENGINE ---

    // Derived State
    const learningLoad = localExercises.filter(e => e.mode === 'learning').reduce((sum, e) => sum + e.dur, 0);
    const reviewItems = localExercises.filter(e => e.mode === 'review');
    const totalLoad = learningLoad + (reviewItems.length * 5);
    const dailyBudget = 50; // Hardcoded for mockup

    // Actions (Simulated Updates)
    const approveMastery = (id: string) => {
        setLocalExercises(prev => prev.map(ex =>
            ex.id === id ? { ...ex, mode: 'review' as const, status: 'mastered' as const, dur: 5 } : ex
        ));
        toast.success("Ejercicio movido a La Mochila");
    };

    const toggleArchive = (id: string, shouldArchive: boolean) => {
        setLocalExercises(prev => prev.map(ex =>
            ex.id === id ? { ...ex, mode: (shouldArchive ? 'archived' : 'review') as StudiaExercise['mode'], status: (shouldArchive ? 'archived' : 'mastered') as StudiaExercise['status'] } : ex
        ));
        toast.info(shouldArchive ? "Ejercicio archivado" : "Ejercicio reactivado");
    };

    // Student 'Clipper' Logic
    const generateItinerary = () => {
        const learning = localExercises.filter(e => e.mode === 'learning');
        const reviewPool = localExercises.filter(e => e.mode === 'review');
        const reviewSelected: StudiaExercise[] = [];

        let currentMin = learning.reduce((acc, val) => acc + val.dur, 0);

        // Shuffle Review
        const shuffled = [...reviewPool].sort(() => 0.5 - Math.random());

        for (let item of shuffled) {
            if (currentMin + item.dur <= dailyBudget) {
                reviewSelected.push(item);
                currentMin += item.dur;
            }
        }

        const allItems: ItineraryItem[] = [
            ...learning.map(i => ({ ...i, isFocus: true })),
            ...reviewSelected.map(i => ({ ...i, isFocus: false }))
        ];

        setStudentItinerary({
            items: allItems,
            totalMin: currentMin
        });
    };

    useEffect(() => {
        if (localExercises.length > 0 && view === 'student') {
            generateItinerary();
        }
    }, [view, localExercises]);


    return (
        <div className="bg-slate-50 min-h-screen font-sans text-slate-900 border-t-4 border-orange-500">

            {/* Dev Navigation */}
            <nav className="fixed bottom-4 right-4 bg-slate-900 text-white p-2 rounded-full shadow-2xl z-50 flex gap-2 scale-90 opacity-80 hover:opacity-100 transition-opacity">
                <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${view === 'dashboard' ? 'bg-orange-500 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>Profe</button>
                <button onClick={() => setView('student')} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${view === 'student' ? 'bg-orange-500 text-white' : 'hover:bg-slate-700 text-slate-300'}`}>Alumno</button>
            </nav>

            {/* VIEW A: DASHBOARD PROFESOR */}
            {view === 'dashboard' && (
                <div className="flex bg-slate-50 min-h-screen">
                    {/* Sidebar */}
                    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col p-4 gap-1">
                        <div className="flex items-center gap-2 px-2 mb-8">
                            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">S</div>
                            <span className="font-bold text-lg text-slate-800">Studia</span>
                        </div>
                        <div className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium flex items-center gap-3"><Users className="w-4 h-4" /> Usuarios</div>
                        <div className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium flex items-center gap-3"><Calendar className="w-4 h-4" /> Agenda</div>
                        <div className="px-3 py-2 bg-orange-50 text-orange-700 rounded-md text-sm font-medium flex items-center gap-3"><BarChart3 className="w-4 h-4" /> Estadísticas</div>
                    </aside>

                    <main className="flex-1 overflow-hidden flex flex-col">
                        {/* Header */}
                        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                    <span>Estudiantes</span>
                                    <ChevronRight className="w-4 h-4" />
                                    <span>Carles Cam.</span>
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900">Gestión del Estudiante</h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{totalLoad}' / {dailyBudget}' carga</span>
                            </div>
                        </header>

                        {/* Tabs Navigation */}
                        <div className="px-8 mt-6 border-b border-slate-200 flex gap-8">
                            {[
                                { id: 'repertorio', label: 'Repertorio', icon: Zap },
                                { id: 'ejercicios', label: 'Ejercicios', icon: ListMusic },
                                { id: 'planes', label: 'Planes', icon: BookOpen },
                                { id: 'sesiones', label: 'Sesiones', icon: History },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === tab.id
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* TAB CONTENT: REPERTORIO (Kanban) */}
                        {activeTab === 'repertorio' && (
                            <div className="flex-1 p-8 overflow-hidden flex gap-6 bg-slate-50">
                                {/* COL 1: FOCO */}
                                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> En Foco (Learning)
                                        </h3>
                                        <button className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Asignar Nuevo</button>
                                    </div>
                                    <div className="p-4 overflow-y-auto flex-1 space-y-3">
                                        {localExercises.filter(e => e.mode === 'learning').map(ex => (
                                            <div key={ex.id} className="p-4 rounded-lg border transition-all bg-white border-slate-200 hover:border-slate-300 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{ex.type}</span>
                                                    <span className="text-xs font-mono text-slate-500">{ex.dur}'</span>
                                                </div>
                                                <h4 className="font-semibold text-slate-800 text-sm mb-1">{ex.title}</h4>
                                                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-blue-500 h-full w-[40%]"></div>
                                                </div>
                                                <div className="mt-2 flex justify-end">
                                                    <button onClick={() => approveMastery(ex.id)} className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">Donimar <Check className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* COL 2: MOCHILA */}
                                <div className="w-[350px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
                                    <div className={`p-4 border-b border-slate-100 flex justify-between items-center ${showArchived ? 'bg-slate-100' : 'bg-slate-50/50'}`}>
                                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${showArchived ? 'bg-slate-400' : 'bg-purple-500'}`}></span>
                                            {showArchived ? 'Biblioteca (Archived)' : 'Mochila (Review)'}
                                        </h3>
                                        <button onClick={() => setShowArchived(!showArchived)} className="text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded flex items-center gap-1">
                                            {showArchived ? <><Repeat className="w-3 h-3" /> Ver Activos</> : <><Backpack className="w-3 h-3" /> Ver Archivo</>}
                                        </button>
                                    </div>
                                    <div className="p-2 overflow-y-auto flex-1">
                                        <table className="w-full text-left text-sm">
                                            <tbody className="divide-y divide-slate-100">
                                                {localExercises.filter(e => showArchived ? e.mode === 'archived' : e.mode === 'review').map(ex => (
                                                    <tr key={ex.id} className="hover:bg-slate-50 group">
                                                        <td className="px-3 py-3 font-medium text-slate-700">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${showArchived ? 'bg-slate-300' : 'bg-green-400'} group-hover:scale-125 transition-transform`}></div>
                                                                <div>
                                                                    <div className="">{ex.title}</div>
                                                                    <div className="text-[10px] text-slate-400">{ex.category}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-3 text-right">
                                                            {showArchived ? (
                                                                <button onClick={() => toggleArchive(ex.id, false)} className="text-slate-400 hover:text-green-600 p-1"><Plus className="w-4 h-4" /></button>
                                                            ) : (
                                                                <button onClick={() => toggleArchive(ex.id, true)} className="text-slate-300 hover:text-slate-500 p-1"><Backpack className="w-4 h-4 opacity-50 hover:opacity-100" /></button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: EJERCICIOS (Data Grid) */}
                        {activeTab === 'ejercicios' && (
                            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                                        <h2 className="text-sm font-bold text-slate-700">Catálogo de Ejercicios (Base de Datos Real)</h2>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-slate-100 text-xs rounded text-slate-500">{localExercises.length} items</span>
                                            <button
                                                onClick={() => setShowBackpack(!showBackpack)}
                                                className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors ${showBackpack ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                                <Backpack className="w-3 h-3" /> {showBackpack ? 'Ver Lista' : 'Ver Mochila'}
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(null)}
                                                className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors">
                                                <Plus className="w-3 h-3" /> Nuevo
                                            </button>
                                        </div>
                                    </div>

                                    {/* MOCHILA VIEW (BACKPACK) */}
                                    {showBackpack ? (
                                        <div className="p-6 bg-slate-50 min-h-[300px]">
                                            <div className="mb-4 flex items-center gap-2">
                                                <Backpack className="w-5 h-5 text-indigo-500" />
                                                <h3 className="font-bold text-slate-700">Mochila de Repaso (Items Dominados)</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {localExercises.filter(e => e.mode === 'review').map(ex => (
                                                    <div key={ex.id} className="bg-white border border-slate-200 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                                        <span className={`w-2 h-2 rounded-full ${TYPE_MAP[ex.type]?.color.split(' ')[0].replace('text-', 'bg-')}`}></span>
                                                        <span className="text-sm font-medium text-slate-700">{ex.title}</span>
                                                        {ex.variations.length > 0 && (
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full">{ex.variations.length} vars</span>
                                                        )}
                                                        <div className="w-0 overflow-hidden group-hover:w-auto transition-all flex items-center">
                                                            <button className="ml-2 bg-indigo-50 text-indigo-600 p-1 rounded-full hover:bg-indigo-100"><Play className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {localExercises.filter(e => e.mode === 'review').length === 0 && (
                                                    <div className="text-slate-400 text-sm italic">No hay items en la mochila de repaso aún.</div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-slate-400">Nombre</th>
                                                    <th className="px-4 py-3 text-left font-medium text-slate-400">Tipo</th>
                                                    <th className="px-4 py-3 text-left font-medium text-slate-400">Duración</th>
                                                    <th className="px-4 py-3 text-left font-medium text-slate-400">ID</th>
                                                    <th className="px-4 py-3 text-right font-medium text-slate-400">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {localExercises.map(ex => (
                                                    <React.Fragment key={ex.id}>
                                                        <tr
                                                            onClick={() => setExpandedVarId(expandedVarId === ex.id ? null : ex.id)}
                                                            className={`hover:bg-slate-50 transition-colors group cursor-pointer ${expandedVarId === ex.id ? 'bg-slate-50' : ''}`}
                                                        >
                                                            <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                                                                {ex.variations.length > 0 && (
                                                                    <div className={`text-slate-400 text-[10px] transition-transform ${expandedVarId === ex.id ? 'rotate-90' : ''}`}>▶</div>
                                                                )}
                                                                {ex.title}
                                                            </td>
                                                            <td className="px-4 py-3"><span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{ex.type}</span></td>
                                                            <td className="px-4 py-3 text-slate-500 font-mono">{ex.dur}'</td>
                                                            <td className="px-4 py-3 text-xs text-slate-300 font-mono">{ex.id.slice(0, 8)}...</td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(ex); }}
                                                                        className="p-1 hover:bg-slate-200 rounded text-slate-500">
                                                                        <div className="w-4 h-4 text-xs">Edit</div>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex.id); }}
                                                                        className="p-1 hover:bg-red-100 rounded text-red-500">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {/* VARIATIONS VIEWER (Accordion) */}
                                                        {expandedVarId === ex.id && ex.variations.length > 0 && (
                                                            <tr className="bg-slate-50/50">
                                                                <td colSpan={5} className="px-4 py-2 p-0">
                                                                    <div className="ml-8 border-l-2 border-slate-200 pl-4 space-y-2 mb-3 mt-1">
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Variaciones ({ex.variations.length})</div>
                                                                        {ex.variations.map((v, idx) => (
                                                                            <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded border border-slate-200 text-sm shadow-sm">
                                                                                <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-[10px] font-mono text-slate-500">L{v.min_level}</div>
                                                                                <div className="flex-1">
                                                                                    <div className="font-medium text-slate-700 text-xs">{v.label}</div>
                                                                                    <div className="text-[10px] text-slate-400">{v.tags.join(', ')}</div>
                                                                                </div>
                                                                                {v.asset_url && (
                                                                                    <div className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 truncate max-w-[150px]">{v.asset_url}</div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: PLANES (Cards) */}
                        {activeTab === 'planes' && (
                            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {realPlanes.map(plan => (
                                        <div key={plan.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                                <span className="text-xs font-mono text-slate-300">{plan.id.slice(-6)}</span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 mb-1">{plan.nombre}</h3>
                                            <p className="text-xs text-slate-500 mb-4 line-clamp-2">{plan.objetivo_semanal_por_defecto || plan.objetivoSemanalPorDefecto || "Sin objetivo definido"}</p>

                                            <div className="flex gap-2 text-xs text-slate-400 border-t border-slate-100 pt-3">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {plan.semanas ? (typeof plan.semanas === 'string' ? JSON.parse(plan.semanas).length : plan.semanas.length) : 0} semanas</span>
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Publicado</span>
                                            </div>
                                        </div>
                                    ))}
                                    {realPlanes.length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-400">
                                            {loading ? "Cargando planes..." : "No hay planes en Supabase."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: SESIONES (History) */}
                        {activeTab === 'sesiones' && (
                            <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
                                <div className="space-y-3">
                                    {realSessions.map(ses => {
                                        const durReal = ses.duracion_real_seg || ses.duracionRealSeg || 0;
                                        const durObj = ses.duracion_objetivo_seg || ses.duracionObjetivoSeg || 0;
                                        const fecha = ses.created_at || ses.created_date;
                                        return (
                                            <div key={ses.id} className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold">
                                                        {Math.round(durReal / 60)}'
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800">Sesión Completada</h4>
                                                        <p className="text-xs text-slate-500">{fecha ? new Date(fecha).toLocaleString() : 'Fecha desconocida'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-slate-600">{Math.round(durObj / 60)}' Objetivo</div>
                                                    <div className="text-xs text-slate-400">ID: {ses.id.slice(0, 8)}...</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {realSessions.length === 0 && (
                                        <div className="py-12 text-center text-slate-400 italic">
                                            {loading ? "Cargando historial..." : "No hay registros de sesiones anteriores."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* MODAL OVERLAY */}
                        {isModalOpen && (
                            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800">{editingId ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}</h3>
                                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                                            <input
                                                type="text"
                                                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                value={formData.nombre}
                                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                                placeholder="Ej: Escalas Mayores..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                                <select
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    value={formData.tipo}
                                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                                >
                                                    {(Object.keys(TYPE_MAP) as ExerciseTypeKey[]).map(key => (
                                                        <option key={key} value={key}>{key} - {TYPE_MAP[key].label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duración (min)</label>
                                                <input
                                                    type="number"
                                                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                    value={formData.duracion}
                                                    onChange={e => setFormData({ ...formData, duracion: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveExercise}
                                            disabled={loading}
                                            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </main>
                </div>
            )}

            {/* VIEW B: STUDENT PLAYER */}
            {view === 'student' && (
                <main className="max-w-3xl mx-auto p-6 min-h-screen bg-white shadow-xl my-4 rounded-xl border border-slate-100">
                    <div className="mb-8 border-b border-slate-100 pb-6">
                        <div className="flex items-center gap-2 text-orange-600 font-bold uppercase tracking-wider text-xs mb-2">
                            <Activity className="w-4 h-4" />
                            <span>Plan Activo</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Sesión Generada</h1>
                        <div className="flex items-center gap-4 text-slate-500 text-sm">
                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium"><Clock className="w-4 h-4" /> {studentItinerary.totalMin} min</span>
                        </div>
                    </div>

                    <div className="space-y-4 mb-20">
                        {studentItinerary.items.map((ex, idx) => (
                            <div key={ex.id + idx} className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${ex.isFocus
                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                    : 'bg-purple-50 text-purple-600 border border-purple-100'
                                    }`}>
                                    {ex.type}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        {ex.isFocus ? (
                                            <span className="text-[10px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded uppercase tracking-wide flex items-center gap-1"><Zap className="w-3 h-3 fill-current" /> Foco</span>
                                        ) : (
                                            // Review Mode - Clean Badge
                                            <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                                                <Eye className="w-3 h-3" /> Repaso
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{ex.category}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-orange-600 transition-colors">{ex.title}</h3>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-sm font-mono font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{ex.dur} min</span>
                                </div>
                            </div>
                        ))}
                        {studentItinerary.items.length === 0 && (
                            <div className="text-center py-10 text-slate-400">
                                <p>No se encontraron ejercicios activos para generar una sesión.</p>
                                <p className="text-sm mt-2">Asegúrate de tener ejercicios en 'Learning' o 'Review' en el Dashboard.</p>
                            </div>
                        )}
                    </div>

                    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 flex justify-center shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)]">
                        <button onClick={() => toast.success("Iniciando práctica...")} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-orange-500/30 flex items-center gap-2 transform transition-all hover:scale-105 active:scale-95">
                            <Play className="w-5 h-5 fill-current" /> Iniciar Práctica
                        </button>
                    </div>
                </main>
            )}
        </div>
    );
}

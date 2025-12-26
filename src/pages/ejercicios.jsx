import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchPlanesPreviewEjercicios, fetchRecentRegistrosSesion, updateBloque, createBloque, deleteBloque, fetchBloquesListado } from "@/api/remoteDataAPI";
import { toast } from 'sonner';
import {
  Flame, Backpack, Check, Clock, Play, Zap, Repeat,
  Activity, Music, Plus, Trash2, ChevronRight,
  BookOpen, ListMusic, History, Layout as LayoutIcon,
  BarChart3, Calendar, Users, Eye
} from 'lucide-react';
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";

// --- HELPERS & MOCK DATA (Ported from StudiaConceptPage) ---

const TYPE_MAP = {
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

// MOCKED VARIATIONS (Simulating JSONB 'content')
const MOCKED_VARIATIONS = {
  'TC-COL-0004': [
    { label: 'Sistema 1', min_level: 1, tags: ['easy', 'tone'], asset_url: 'https://placehold.co/600x150/e2e8f0/475569?text=Colin+4+-+Sistema+1' },
    { label: 'Sistema 2', min_level: 2, tags: ['medium', 'flex'], asset_url: 'https://placehold.co/600x150/e2e8f0/475569?text=Colin+4+-+Sistema+2' },
    { label: 'Sistema 3', min_level: 3, tags: ['hard', 'range'], asset_url: 'https://placehold.co/600x150/e2e8f0/475569?text=Colin+4+-+Sistema+3' }
  ],
  'TC-CLA-0002': [
    { label: 'Var A (Ligado)', min_level: 1, tags: ['slur'], asset_url: null },
    { label: 'Var B (Piccado)', min_level: 2, tags: ['staccato'], asset_url: 'https://placehold.co/600x150/e2e8f0/475569?text=Clarke+2+-+Var+B' }
  ]
};

export default function EjerciciosPage() {
  // State
  const [localExercises, setLocalExercises] = useState([]);
  const [realPlanes, setRealPlanes] = useState([]);
  const [realSessions, setRealSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ejercicios');
  const [showArchived, setShowArchived] = useState(false);

  // Dashboard Accordion & View State
  const [expandedVarId, setExpandedVarId] = useState(null);
  const [showBackpack, setShowBackpack] = useState(false);

  // CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', tipo: 'TC', duracion: 5 });

  // --- EFFECT: Load Data ---
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch Bloques
        const bloques = await fetchBloquesListado();

        if (bloques) {
          const mappedBloques = bloques.map((b, idx) => {
            let vars = [];
            // DEMO HACK: Force attach variations to first 2 items
            if (idx === 0) vars = MOCKED_VARIATIONS['TC-COL-0004'];
            else if (idx === 1) vars = MOCKED_VARIATIONS['TC-CLA-0002'];
            else vars = MOCKED_VARIATIONS[b.code] || MOCKED_VARIATIONS[b.id] || [];

            // Real logic: map from DB content if available
            if (b.content && Array.isArray(b.content) && vars.length === 0) {
              vars = b.content;
            }

            const categoryInfo = TYPE_MAP[b.tipo] || { label: 'General', color: 'text-slate-600 bg-slate-50' };
            // Simulate lifecycle
            let mode = 'learning';
            let status = 'active';
            if (idx % 3 === 0) { mode = 'review'; status = 'mastered'; }
            if (idx % 10 === 0) { mode = 'archived'; status = 'archived'; }

            const dur = Math.round((b.duracion_seg || b.duracionSeg || 300) / 60);

            return {
              id: b.id,
              title: b.nombre,
              type: b.tipo,
              category: categoryInfo.label,
              mode: mode,
              status: status,
              dur: dur || 5,
              asset: 'resource.pdf',
              variations: vars,
              raw: b
            };
          });
          setLocalExercises(mappedBloques);
        }

        // 2. Fetch Planes
        const planes = await fetchPlanesPreviewEjercicios();
        if (planes) setRealPlanes(planes);

        // 3. Fetch Sessions
        const sessions = await fetchRecentRegistrosSesion();
        if (sessions) setRealSessions(sessions);

      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Error cargando datos");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- CRUD Handlers ---
  const handleOpenModal = (exercise = null) => {
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
    const tempId = editingId || `temp_${Date.now()}`;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      const payload = {
        nombre: formData.nombre,
        tipo: formData.tipo,
        duracion_seg: formData.duracion * 60,
        profesor_id: user?.id
      };

      const newItem = {
        id: tempId,
        title: formData.nombre,
        type: formData.tipo,
        category: TYPE_MAP[formData.tipo]?.label || 'General',
        mode: 'learning',
        status: 'active',
        dur: formData.duracion,
        asset: 'resource.pdf',
        raw: {},
        variations: []
      };

      if (editingId) {
        // Update
        setLocalExercises(prev => prev.map(e => e.id === editingId ? { ...e, ...newItem } : e));
        setIsModalOpen(false);
        await updateBloque(editingId, payload);
        toast.success("Ejercicio actualizado");
      } else {
        // Insert
        setLocalExercises(prev => [newItem, ...prev]);
        setIsModalOpen(false);
        const data = await createBloque(payload);
        if (data && data[0]) {
          setLocalExercises(prev => prev.map(e => e.id === tempId ? { ...e, id: data[0].id } : e));
        }
        toast.success("Ejercicio creado");
      }
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExercise = async (id) => {
    if (!confirm("¿Seguro que quieres borrar este ejercicio?")) return;
    setLocalExercises(prev => prev.filter(e => e.id !== id));
    try {
      await deleteBloque(id);
      toast.success("Ejercicio eliminado");
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const approveMastery = (id) => {
    setLocalExercises(prev => prev.map(ex =>
      ex.id === id ? { ...ex, mode: 'review', status: 'mastered', dur: 5 } : ex
    ));
    toast.success("Ejercicio movido a La Mochila");
  };

  const toggleArchive = (id, shouldArchive) => {
    setLocalExercises(prev => prev.map(ex =>
      ex.id === id ? { ...ex, mode: shouldArchive ? 'archived' : 'review', status: shouldArchive ? 'archived' : 'mastered' } : ex
    ));
    toast.info(shouldArchive ? "Archivado" : "Reactivado");
  };

  // --- RENDER ---
  return (
    <div className="studia-section">
      <PageHeader
        title="Gestión de Ejercicios"
        subtitle="Biblioteca técnica y repertorio"
        actions={
          <div className="flex gap-2">
            <span className="px-2 py-1 bg-slate-100 text-xs rounded text-slate-500 self-center">{localExercises.length} items</span>
          </div>
        }
      />

      {/* TABS Navigation */}
      <div className="flex gap-6 border-b border-slate-200 mb-6">
        {[
          { id: 'ejercicios', label: 'Ejercicios', icon: ListMusic },
          { id: 'repertorio', label: 'Repertorio (Kanban)', icon: Zap },
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

      {/* TAB CONTENT: EJERCICIOS (Data Grid + Mochila) */}
      {activeTab === 'ejercicios' && (
        <div className="ui-table-shell bg-white">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-700">Listado Maestro</h2>
            <div className="flex gap-2">
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
                  <th className="px-4 py-3 font-medium text-slate-400">Nombre</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Tipo</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Duración</th>
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
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleOpenModal(ex); }} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                            <div className="w-4 h-4 text-xs">Edit</div>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex.id); }} className="p-1 hover:bg-red-100 rounded text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* ACCORDION */}
                    {expandedVarId === ex.id && ex.variations.length > 0 && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="5" className="px-4 py-2 p-0">
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
      )}

      {/* TAB CONTENT: REPERTORIO (Kanban) */}
      {activeTab === 'repertorio' && (
        <div className="flex gap-6 overflow-x-auto pb-4">
          {/* COL 1: FOCO */}
          <div className="flex-1 min-w-[300px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> En Foco (Learning)
              </h3>
              <button className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Asignar Nuevo</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[600px] flex-1 space-y-3">
              {localExercises.filter(e => e.mode === 'learning').map(ex => (
                <div key={ex.id} className="p-4 rounded-lg border transition-all bg-white border-slate-200 hover:border-slate-300 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{ex.type}</span>
                    <span className="text-xs font-mono text-slate-500">{ex.dur}'</span>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">{ex.title}</h4>
                  <div className="mt-2 flex justify-end">
                    <button onClick={() => approveMastery(ex.id)} className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">Donimar <Check className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* COL 2: MOCHILA */}
          <div className="w-[300px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all">
            <div className={`p-4 border-b border-slate-100 flex justify-between items-center ${showArchived ? 'bg-slate-100' : 'bg-slate-50/50'}`}>
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${showArchived ? 'bg-slate-400' : 'bg-purple-500'}`}></span>
                {showArchived ? 'Biblioteca (Archived)' : 'Mochila (Review)'}
              </h3>
              <button onClick={() => setShowArchived(!showArchived)} className="text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded flex items-center gap-1">
                {showArchived ? <><Repeat className="w-3 h-3" /> Ver Activos</> : <><Backpack className="w-3 h-3" /> Ver Archivo</>}
              </button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[600px] flex-1">
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

      {/* TAB CONTENT: PLANES */}
      {activeTab === 'planes' && (
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
              <p className="text-xs text-slate-500 mb-4 line-clamp-2">{plan.objetivo_semanal_por_defecto || plan.objetivoSemanalPorDefecto || "Sin objetivo"}</p>
              <div className="flex gap-2 text-xs text-slate-400 border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {plan.semanas ? (typeof plan.semanas === 'string' ? JSON.parse(plan.semanas).length : plan.semanas.length) : 0} semanas</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
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
                    {Object.keys(TYPE_MAP).map(key => (
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
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-200 rounded-lg">Cancelar</button>
              <button onClick={handleSaveExercise} disabled={loading} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
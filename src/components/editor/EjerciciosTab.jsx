import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Flame, Backpack, Check, Clock, Play, Zap, Repeat,
  Activity, Music, Plus, Trash2, ChevronRight,
  BookOpen, ListMusic, History, Layout as LayoutIcon,
  BarChart3, Calendar, Users, Eye, Search
} from 'lucide-react';
import { componentStyles } from "@/design/componentStyles";
import ExerciseEditor from "./ExerciseEditor";

// --- HELPERS & MOCK DATA ---

const TYPE_MAP = {
  'CA': { label: 'Calentamiento A (físico)', color: 'text-orange-600 bg-orange-50' },
  'CB': { label: 'Calentamiento B (musical)', color: 'text-blue-600 bg-blue-50' },
  'TC': { label: 'Técnica', color: 'text-purple-600 bg-purple-50' },
  'FM': { label: 'Fragmento Musical', color: 'text-pink-600 bg-pink-50' },
  'VC': { label: 'Vuelta a la Calma', color: 'text-green-600 bg-green-50' },
  'AD': { label: 'Aviso/Descanso', color: 'text-slate-600 bg-slate-50' },
};


export default function EjerciciosTab() {
  // State
  const [localExercises, setLocalExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Dashboard Accordion
  const [expandedVarId, setExpandedVarId] = useState(null);

  // Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [ejercicioActual, setEjercicioActual] = useState(null);

  // --- Data Loading ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Bloques directly
      const { data: bloques, error: errBloques } = await supabase
        .from('bloques')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (errBloques) throw errBloques;

      if (bloques) {
        const mappedBloques = bloques.map((b, idx) => {
          let vars = [];

          // PRIORITY 1: Use real content from Supabase if available
          if (b.content && Array.isArray(b.content) && b.content.length > 0) {
            vars = b.content;
            console.log(`[EjerciciosTab] ${b.nombre || b.code}: Using ${vars.length} variations from Supabase content column`);
          }


          const categoryInfo = TYPE_MAP[b.tipo] || { label: 'General', color: 'text-slate-600 bg-slate-50' };
          const dur = Math.round((b.duracion_seg || b.duracionSeg || 300) / 60);

          return {
            id: b.id,
            title: b.nombre,
            type: b.tipo,
            category: categoryInfo.label,
            dur: dur || 5,
            asset: 'resource.pdf',
            variations: vars,
            raw: b,
            code: b.code
          };
        });
        setLocalExercises(mappedBloques);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Filter Logic ---
  const filteredExercises = localExercises.filter(ex => {
    const matchesSearch = ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.code && ex.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || ex.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // --- Handlers ---
  const handleOpenEditor = (exercise = null) => {
    if (exercise) {
      // Merge variations from display mapping into raw data for editing
      const rawWithVariations = {
        ...(exercise.raw || exercise),
        variations: exercise.variations || (exercise.raw?.content) || []
      };
      setEjercicioActual(rawWithVariations);
    } else {
      setEjercicioActual(null);
    }
    setShowEditor(true);
  };

  const handleDeleteExercise = async (id) => {
    if (!confirm("¿Seguro que quieres borrar este ejercicio?")) return;
    setLocalExercises(prev => prev.filter(e => e.id !== id));
    try {
      const { error } = await supabase.from('bloques').delete().eq('id', id);
      if (error) throw error;
      toast.success("Ejercicio eliminado");
      loadData();
    } catch (e) {
      toast.error("Error al eliminar");
      loadData();
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER ACTIONS (Filters + New) */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 flex-wrap flex-1 w-full md:w-auto">
          <Input
            placeholder="Buscar ejercicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`flex-1 min-w-[200px] ${componentStyles.controls.inputDefault}`}
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={`w-full md:w-48 ${componentStyles.controls.selectDefault}`}>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.keys(TYPE_MAP).map(key => (
                <SelectItem key={key} value={key}>{TYPE_MAP[key].label} ({key})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handleOpenEditor(null)} className={`w-full md:w-auto ${componentStyles.buttons.primary}`}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ejercicio
        </Button>
      </div>

      {/* CONTENT: TABLE */}
      <div className="bg-[var(--color-surface-default)] rounded-xl shadow-sm border border-[var(--color-border-default)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-elevated)] font-medium border-b border-[var(--color-border-default)]">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">Nombre</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">Tipo</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">Duración</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-secondary)]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-default)]">
            {filteredExercises.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-[var(--color-text-secondary)]">
                {loading ? 'Cargando...' : 'No se encontraron ejercicios'}
              </td></tr>
            ) : filteredExercises.map(ex => (
              <React.Fragment key={ex.id}>
                <tr
                  onClick={() => setExpandedVarId(expandedVarId === ex.id ? null : ex.id)}
                  className={`hover:bg-[var(--color-surface-elevated)] transition-colors group cursor-pointer ${expandedVarId === ex.id ? 'bg-[var(--color-surface-elevated)]' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                    {ex.variations.length > 0 && (
                      <div className={`text-[var(--color-text-secondary)] text-[10px] transition-transform ${expandedVarId === ex.id ? 'rotate-90' : ''}`}>▶</div>
                    )}
                    {ex.title}
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-[var(--color-surface-elevated)] px-2 py-1 rounded text-[var(--color-text-secondary)]">{ex.type}</span></td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] font-mono">{ex.dur}'</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEditor(ex); }} className="p-1 hover:bg-[var(--color-surface-elevated)] rounded text-[var(--color-text-secondary)]">
                        <div className="w-4 h-4 text-xs">Edit</div>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex.id); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* ACCORDION */}
                {expandedVarId === ex.id && ex.variations.length > 0 && (
                  <tr className="bg-[var(--color-surface-elevated)]/50">
                    <td colSpan="5" className="px-4 py-2 p-0">
                      <div className="ml-8 border-l-2 border-[var(--color-border-default)] pl-4 space-y-2 mb-3 mt-1">
                        <div className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Variaciones ({ex.variations.length})</div>
                        {ex.variations.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-[var(--color-surface-default)] p-2 rounded border border-[var(--color-border-default)] text-sm shadow-sm">
                            <div className="w-6 h-6 bg-[var(--color-surface-elevated)] rounded flex items-center justify-center text-[10px] font-mono text-[var(--color-text-secondary)]">L{v.min_level}</div>
                            <div className="flex-1">
                              <div className="font-medium text-[var(--color-text-primary)] text-xs">{v.label}</div>
                              <div className="text-[10px] text-[var(--color-text-secondary)]">{v.tags.join(', ')}</div>
                            </div>
                            {v.asset_url && (
                              <div className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--color-border-default)] truncate max-w-[150px]">{v.asset_url}</div>
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
      </div>

      {/* EDITOR */}
      {showEditor && (
        <ExerciseEditor
          ejercicio={ejercicioActual}
          onClose={() => {
            setShowEditor(false);
            setEjercicioActual(null);
            loadData(); // Re-fetch on close
          }}
        />
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useBloques } from '@/features/estudio/hooks/useBloques';
import { remoteDataAPI } from '@/api/remote/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Dashboard Accordion
  const [expandedVarId, setExpandedVarId] = useState(null);

  // Editor State
  const [showEditor, setShowEditor] = useState(false);
  const [ejercicioActual, setEjercicioActual] = useState(null);

  // --- Data Loading with centralized hook ---
  const { data: bloques = [], isLoading: loading, refetch } = useBloques();

  // Transform bloques to localExercises format (memoized)
  const localExercises = useMemo(() => {
    return bloques.map((b) => {
      let vars = [];

      // PRIORITY 1: Use real content from Supabase if available
      if (b.content && Array.isArray(b.content) && b.content.length > 0) {
        vars = b.content;
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
  }, [bloques]);

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
      // Convert snake_case raw data to camelCase for ExerciseEditor
      const raw = exercise.raw || exercise;
      const camelCaseData = {
        id: raw.id,
        nombre: raw.nombre,
        code: raw.code,
        tipo: raw.tipo,
        // Convert snake_case to camelCase
        duracionSeg: raw.duracion_seg ?? raw.duracionSeg ?? 0,
        instrucciones: raw.instrucciones || '',
        indicadorLogro: raw.indicador_logro ?? raw.indicadorLogro ?? '',
        materialesRequeridos: raw.materiales_requeridos ?? raw.materialesRequeridos ?? [],
        mediaLinks: raw.media_links ?? raw.mediaLinks ?? [],
        elementosOrdenados: raw.elementos_ordenados ?? raw.elementosOrdenados ?? [],
        piezaRefId: raw.pieza_ref_id ?? raw.piezaRefId ?? null,
        profesorId: raw.profesor_id ?? raw.profesorId ?? null,
        skillTags: raw.skill_tags ?? raw.skillTags ?? [],
        targetPPMs: raw.target_ppms ?? raw.targetPPMs ?? [],
        // CRITICAL FIX: Ensure content is passed so variations can be extracted
        content: raw.content || { variations: [] },
        // Merge variations from display mapping into data for editing
        variations: exercise.variations || raw.content || [],
      };
      console.log('[EjerciciosTab] Opening editor with camelCase data:', camelCaseData);
      setEjercicioActual(camelCaseData);
    } else {
      setEjercicioActual(null);
    }
    setShowEditor(true);
  };

  const handleDeleteExercise = async (id) => {
    if (!confirm("¿Seguro que quieres borrar este ejercicio?")) return;
    try {
      await remoteDataAPI.bloques.delete(id);
      toast.success("Ejercicio eliminado");
      queryClient.invalidateQueries({ queryKey: ['bloques'] });
    } catch (e) {
      toast.error("Error al eliminar");
      queryClient.invalidateQueries({ queryKey: ['bloques'] });
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
      <div className="ui-table-shell bg-[var(--color-surface-default)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-elevated)] font-medium border-b border-[var(--color-border-default)]">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)] w-16">Code</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)]">Nombre</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)] w-24">Tipo</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)] w-20 text-center">Media</th>
              <th className="px-4 py-3 font-medium text-[var(--color-text-secondary)] w-20 text-right">Dur.</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-secondary)] w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-default)]">
            {filteredExercises.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-[var(--color-text-secondary)]">
                {loading ? 'Cargando...' : 'No se encontraron ejercicios'}
              </td></tr>
            ) : filteredExercises.map(ex => (
              <React.Fragment key={ex.id}>
                <tr
                  onClick={() => handleOpenEditor(ex)}
                  className="hover:bg-[var(--color-surface-elevated)] transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] font-mono text-xs">
                    {ex.code || '-'}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                    <div className="flex items-center gap-2">
                      {/* Variations Indicator Button - Only click here expands */}
                      {ex.variations.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVarId(expandedVarId === ex.id ? null : ex.id);
                          }}
                          className={`p-1 rounded hover:bg-[var(--color-surface-hover)] transition-transform ${expandedVarId === ex.id ? 'rotate-90' : ''}`}
                        >
                          <div className="text-[var(--color-text-secondary)] text-[10px]">▶</div>
                        </button>
                      )}
                      {ex.title}
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs bg-[var(--color-surface-elevated)] px-2 py-1 rounded text-[var(--color-text-secondary)]">{ex.type}</span></td>
                  <td className="px-4 py-3 text-center">
                    {/* Media Icons */}
                    <div className="flex justify-center gap-1">
                      {(ex.raw.media_links?.length > 0 || ex.raw.mediaLinks?.length > 0) && (
                        <div title="Multimedia" className="text-[var(--color-text-secondary)]">
                          <LayoutIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] font-mono">{ex.dur}'</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Try/Preview Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/studia?mode=try&codes=${ex.code}`);
                        }}
                        title="Probar ejercicio"
                        className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-full text-green-600 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      {/* Edit Icon Button */}
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEditor(ex); }} className="p-1.5 hover:bg-[var(--color-surface-elevated)] rounded-full text-[var(--color-text-primary)] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex.id); }} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* ACCORDION */}
                {expandedVarId === ex.id && ex.variations.length > 0 && (
                  <tr className="bg-[var(--color-surface-elevated)]/50">
                    <td colSpan="6" className="px-4 py-2 p-0">
                      <div className="ml-16 border-l-2 border-[var(--color-border-default)] pl-4 space-y-2 mb-3 mt-1">
                        <div className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Variaciones ({ex.variations.length})</div>
                        {ex.variations.map((v, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-[var(--color-surface-default)] p-2 rounded border border-[var(--color-border-default)] text-sm shadow-sm inline-flex min-w-[300px]">
                            <div className="w-6 h-6 bg-[var(--color-surface-elevated)] rounded flex items-center justify-center text-[10px] font-mono text-[var(--color-text-secondary)]">L{v.min_level}</div>
                            <div className="flex-1">
                              <div className="font-medium text-[var(--color-text-primary)] text-xs">{v.label}</div>
                              <div className="text-[10px] text-[var(--color-text-secondary)]">{v.tags?.join(', ')}</div>
                            </div>
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
            // Invalidate cache to refresh on close
            queryClient.invalidateQueries({ queryKey: ['bloques'] });
          }}
        />
      )}
    </div>
  );
}

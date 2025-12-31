
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import { localDataClient } from "@/api/localDataClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useBloques } from "@/features/estudio/hooks/useBloques";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Label } from "@/features/shared/components/ui/label";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { X, Save, Plus, Trash2, AlertTriangle, RefreshCw, Info, Music, GripVertical, ArrowUp, ArrowDown, RotateCcw, Play, Image as ImageIcon, FileText, Volume2, Pentagon, Star, Pencil } from "lucide-react";
import { Alert, AlertDescription } from "@/features/shared/components/ui/alert";
import { Badge } from "@/features/shared/components/ds/Badge";
import { Checkbox } from "@/features/shared/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/features/shared/components/ui/tooltip";
import { toast } from "sonner";
import { TargetPPM, Variation, Elemento, Pieza, Ejercicio, EjercicioFormData, MediaItem } from "@/features/editor/types";

// ========== TYPE DEFINITIONS ==========





interface MetodoOption {
  value: string;
  label: string;
}

interface SaveResult {
  success: boolean;
  message: string;
}

interface ExerciseEditorProps {
  ejercicio?: Ejercicio | null;
  onClose: (result: EjercicioFormData | Ejercicio | null) => void;
  piezaSnapshot?: Pieza | null;
  isInlineMode?: boolean;
}

// Simple UUID generator for frontend use
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/features/shared/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/features/shared/components/ui/accordion";
import { createPortal } from "react-dom";
import { componentStyles } from "@/design/componentStyles";
import MediaLinksInput from "@/features/shared/components/media/MediaLinksInput";
import { normalizeMediaLinks } from "@/features/shared/utils/media";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import MultiSelect from "@/features/shared/components/ui/MultiSelect";
import { NoteQuarter, NoteQuarterDotted, NoteHalf, NoteHalfDotted, NoteEighth } from "@/features/shared/components/icons/NoteIcons";

const SKILL_OPTIONS = [
  { value: 'Sonido', label: 'Sonido' },
  { value: 'Flexibilidad', label: 'Flexibilidad' },
  { value: 'Motricidad', label: 'Motricidad' },
  { value: 'Articulación (T)', label: 'Articulación (T)' },
  { value: 'Articulación (TK)', label: 'Articulación (TK)' },
  { value: 'Articulación (TTK)', label: 'Articulación (TTK)' },
  { value: 'Cognitivo', label: 'Cognitivo' },
  { value: 'Resistencia', label: 'Resistencia' },
  { value: 'Registro', label: 'Registro' }
];

// Métodos iniciales por defecto (se cargan en localStorage si no hay ninguno)
const INITIAL_METODO_OPTIONS: MetodoOption[] = [
  { value: 'ARB', label: 'Arbans' },
  { value: 'CLK', label: 'Clarke' },
  { value: 'SCL', label: 'Escalas' },
  { value: 'FLX', label: 'Flexibilidad' },
  { value: 'INT', label: 'Intervalos' },
  { value: 'RNG', label: 'Registro' },
  { value: 'ART', label: 'Articulación' },
  { value: 'OTR', label: 'Otro' },
];



// Helper para obtener métodos desde localStorage (inicializa con defaults si está vacío)
const getMetodos = (): MetodoOption[] => {
  try {
    const saved = localStorage.getItem('studia_metodos');
    if (saved) {
      return JSON.parse(saved);
    }
    // Primera vez: inicializar con métodos por defecto
    localStorage.setItem('studia_metodos', JSON.stringify(INITIAL_METODO_OPTIONS));
    return INITIAL_METODO_OPTIONS;
  } catch {
    return INITIAL_METODO_OPTIONS;
  }
};

// Helper para guardar métodos en localStorage
const saveMetodos = (metodos: MetodoOption[]): void => {
  localStorage.setItem('studia_metodos', JSON.stringify(metodos));
};

// Helper para obtener el número más alto usado para un método
const getHighestCodeNumber = (allEjercicios: Ejercicio[], metodo: string): number => {
  const regex = new RegExp(`^TC-${metodo}-(\\d+)$`);
  let highest = 0;
  allEjercicios.forEach((ej: Ejercicio) => {
    const match = ej.code?.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  });
  return highest;
};

export default function ExerciseEditor({ ejercicio, onClose, piezaSnapshot, isInlineMode: initialInlineMode = false }: ExerciseEditorProps) {
  const queryClient = useQueryClient();
  const effectiveUser = useEffectiveUser();
  const [formData, setFormData] = useState<EjercicioFormData>({
    id: null,
    nombre: '',
    code: '',
    tipo: 'TC',
    metodo: 'OTR',
    duracionSeg: 0,
    instrucciones: '',
    indicadorLogro: '',
    materialesRequeridos: [],
    mediaLinks: [],
    elementosOrdenados: [],
    piezaRefId: null,
    targetPPMs: [],
    skillTags: [],
    variations: [],
  });

  // State for exercise ID (either from prop or generated)
  const [exerciseId, setExerciseId] = useState<string | null>(ejercicio?.id || null);

  const handleAssetRegistered = (asset: unknown): void => {
    console.log("Asset Registered:", asset);
    // Optional: Refresh media assets list or show notification
  };

  // Debug log for props - VARIATIONS DEBUGGING
  useEffect(() => {
    console.log('[ExerciseEditor] Mounted/updated with:', {
      ejercicioCode: ejercicio?.code,
      ejercicioVariations: ejercicio?.variations,
      ejercicioContent: ejercicio?.content,
      variationsCount: ejercicio?.variations?.length || 0,
      isInlineMode: initialInlineMode
    });
  }, [ejercicio, initialInlineMode]);

  // Función para convertir el formato antiguo (media object) al nuevo (mediaLinks array)
  const normalizeMedia = (media: (string | MediaItem)[] | Record<string, string> | null | undefined): (string | MediaItem)[] => {
    if (!media) return [];
    if (Array.isArray(media)) {
      // Si ya es un array, normalizarlo
      return normalizeMediaLinks(media);
    }
    // Si es un objeto, convertir a array
    const mediaObj = media as Record<string, string>;
    const urls: string[] = [];
    if (mediaObj.video) urls.push(mediaObj.video);
    if (mediaObj.audio) urls.push(mediaObj.audio);
    if (mediaObj.imagen) urls.push(mediaObj.imagen);
    if (mediaObj.pdf) urls.push(mediaObj.pdf);
    return normalizeMediaLinks(urls);
  };
  const [nuevoMaterial, setNuevoMaterial] = useState('');
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [autoGeneratedCode, setAutoGeneratedCode] = useState(true);
  const [piezaRefId, setPiezaRefId] = useState('');
  const [selectedElementos, setSelectedElementos] = useState<Elemento[]>([]);
  const [isInlineMode, setIsInlineMode] = useState(initialInlineMode);

  // Estado para gestión de métodos (todos son editables)
  const [metodos, setMetodos] = useState<MetodoOption[]>(getMetodos());
  const [showMetodoEditor, setShowMetodoEditor] = useState(false);
  const [nuevoMetodoCodigo, setNuevoMetodoCodigo] = useState('');
  const [nuevoMetodoNombre, setNuevoMetodoNombre] = useState('');
  const [editingMetodo, setEditingMetodo] = useState<MetodoOption | null>(null);

  // Lista de métodos para el selector
  const metodoOptions = metodos;

  // Obtener ejercicios usando hook centralizado
  const { data: allEjercicios = [] } = useBloques();

  // Verificar si un método está en uso (tiene ejercicios con código > 0000)
  const isMetodoInUse = (metodoCode: string): boolean => {
    return getHighestCodeNumber(allEjercicios as unknown as Ejercicio[], metodoCode) > 0;
  };

  // Función para añadir un nuevo método
  const handleAddMetodo = (): void => {
    const codigo = nuevoMetodoCodigo.toUpperCase().trim();
    const nombre = nuevoMetodoNombre.trim();
    if (!codigo || !nombre) return;
    if (codigo.length < 2 || codigo.length > 5) {
      setSaveResult({ success: false, message: 'El código debe tener entre 2-5 caracteres' });
      setTimeout(() => setSaveResult(null), 2000);
      return;
    }
    if (metodos.some(m => m.value === codigo)) {
      setSaveResult({ success: false, message: 'Este código ya existe' });
      setTimeout(() => setSaveResult(null), 2000);
      return;
    }
    const nuevoMetodo = { value: codigo, label: nombre };
    const nuevosMetodos = [...metodos, nuevoMetodo];
    setMetodos(nuevosMetodos);
    saveMetodos(nuevosMetodos);
    setNuevoMetodoCodigo('');
    setNuevoMetodoNombre('');
    setFormData({ ...formData, metodo: codigo });
    setSaveResult({ success: true, message: `✅ Método "${nombre}" añadido` });
    setTimeout(() => setSaveResult(null), 2000);
  };

  // Función para eliminar un método (solo si no está en uso)
  const handleDeleteMetodo = (codigo: string): void => {
    if (isMetodoInUse(codigo)) {
      setSaveResult({ success: false, message: '❌ No se puede eliminar: hay ejercicios usando este método' });
      setTimeout(() => setSaveResult(null), 3000);
      return;
    }
    const nuevosMetodos = metodos.filter(m => m.value !== codigo);
    setMetodos(nuevosMetodos);
    saveMetodos(nuevosMetodos);
    if (formData.metodo === codigo) {
      setFormData({ ...formData, metodo: 'OTR' });
    }
    setSaveResult({ success: true, message: '✅ Método eliminado' });
    setTimeout(() => setSaveResult(null), 2000);
  };

  // Función para iniciar edición de un método
  const handleStartEditMetodo = (metodo: MetodoOption): void => {
    if (isMetodoInUse(metodo.value)) {
      setSaveResult({ success: false, message: '❌ No se puede editar: hay ejercicios usando este método' });
      setTimeout(() => setSaveResult(null), 3000);
      return;
    }
    setEditingMetodo({ ...metodo });
    setNuevoMetodoCodigo(metodo.value);
    setNuevoMetodoNombre(metodo.label);
  };

  // Función para guardar edición de un método
  const handleSaveEditMetodo = (): void => {
    if (!editingMetodo) return;
    const nuevoNombre = nuevoMetodoNombre.trim();
    if (!nuevoNombre) return;
    const nuevosMetodos = metodos.map(m =>
      m.value === editingMetodo.value ? { ...m, label: nuevoNombre } : m
    );
    setMetodos(nuevosMetodos);
    saveMetodos(nuevosMetodos);
    setEditingMetodo(null);
    setNuevoMetodoCodigo('');
    setNuevoMetodoNombre('');
    setSaveResult({ success: true, message: '✅ Método actualizado' });
    setTimeout(() => setSaveResult(null), 2000);
  };

  // Función para cancelar edición
  const handleCancelEditMetodo = (): void => {
    setEditingMetodo(null);
    setNuevoMetodoCodigo('');
    setNuevoMetodoNombre('');
  };

  const { data: piezas = [] } = useQuery({
    queryKey: ['piezas'],
    queryFn: () => localDataClient.entities.Pieza.list(),
  });

  const piezaRef = piezas.find(p => p.id === piezaRefId);
  const usandoPiezaSnapshot = !!piezaSnapshot;
  const elementosDisponibles = usandoPiezaSnapshot ? (piezaSnapshot?.elementos || []) : (piezaRef?.elementos || []);

  const generateCode = async (tipo: string, metodo: string | null = null): Promise<string> => {
    // Para TC, usar formato TC-{método}-{número}
    if (tipo === 'TC' && metodo) {
      const prefix = `TC-${metodo}-`;
      const ejerciciosDeTipo = allEjercicios.filter(e => e.code?.startsWith(prefix));
      const maxNum = ejerciciosDeTipo.reduce((max: number, e) => {
        const match = e.code?.match(new RegExp(`${prefix}(\\d+)`));
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
    }
    // Para otros tipos, usar formato {tipo}-{número}
    const ejerciciosDeTipo = allEjercicios.filter(e => e.code?.startsWith(`${tipo}-`));
    const maxNum = ejerciciosDeTipo.reduce((max: number, e) => {
      const match = e.code?.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `${tipo}-${String(maxNum + 1).padStart(4, '0')}`;
  };

  useEffect(() => {
    if (ejercicio) {
      // Extraer método del código si es TC (ej: TC-ARB-0001 -> ARB)
      let metodoFromCode = 'OTR';
      if (ejercicio.tipo === 'TC' && ejercicio.code) {
        const match = ejercicio.code.match(/^TC-([A-Z]+)-/);
        if (match) metodoFromCode = match[1];
      }
      // DEBUG: Log what indicadorLogro is received
      console.log('[ExerciseEditor] Loading ejercicio - indicadorLogro:', {
        code: ejercicio.code,
        indicadorLogro: ejercicio.indicadorLogro,
        indicador_logro: ejercicio.indicador_logro, // Check if snake_case field exists
        allKeys: Object.keys(ejercicio)
      });

      // Safe access for content union type
      const content = ejercicio.content;
      const isLegacyContent = Array.isArray(content);
      const mediaItems = !isLegacyContent && content ? (content as { mediaItems?: MediaItem[] }).mediaItems || [] : [];

      // Determine variations source safely
      let variationsList: Variation[] = [];
      if (isLegacyContent) {
        variationsList = content as Variation[];
      } else if (content && (content as { variations?: Variation[] }).variations) {
        variationsList = (content as { variations?: Variation[] }).variations || [];
      } else {
        variationsList = ejercicio.variations || [];
      }

      setFormData({
        id: ejercicio.id || null, // Set ID
        nombre: ejercicio.nombre || '',
        code: ejercicio.code || '',
        tipo: ejercicio.tipo || 'TC',
        metodo: ejercicio.metodo || metodoFromCode,
        duracionSeg: ejercicio.duracionSeg || 0,
        instrucciones: ejercicio.instrucciones || '',
        indicadorLogro: ejercicio.indicadorLogro || '',
        materialesRequeridos: ejercicio.materialesRequeridos || [],
        // Load media: Prioritize content.mediaItems (rich objects), then mediaLinks/media (legacy strings)
        mediaLinks: mediaItems.length > 0
          ? mediaItems
          : normalizeMedia(ejercicio.mediaLinks || ejercicio.media),
        elementosOrdenados: ejercicio.elementosOrdenados || [],
        skillTags: ejercicio.skillTags || [],
        piezaRefId: ejercicio.piezaRefId || null,
        targetPPMs: ejercicio.targetPPMs || [],
        // Ensure variations have IDs
        variations: variationsList.map(v => ({ ...v, id: v.id || generateUUID() })),
        profesorId: ejercicio.profesorId || null
      });
      setPiezaRefId(ejercicio.piezaRefId || '');
      setAutoGeneratedCode(false);
      // Set exercise ID for logic
      setExerciseId(ejercicio.id || null);
    } else {
      setIsInlineMode(false);
      const newId = generateUUID();
      setFormData({
        id: newId,
        nombre: '', code: '', tipo: 'TC', metodo: 'OTR', duracionSeg: 0, instrucciones: '', indicadorLogro: '',
        materialesRequeridos: [], mediaLinks: [], elementosOrdenados: [], piezaRefId: null,
        targetPPMs: [], skillTags: [],
        variations: [],
        profesorId: null
      });
      setExerciseId(newId);
      setPiezaRefId('');
      setSelectedElementos([]);
      generateCode('TC', 'OTR').then(code => {
        setFormData(prev => ({ ...prev, code }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicio]); // Note: allEjercicios removed to prevent infinite loop on new exercise

  // ... (intermediate useEffects omitted for brevity, they are unchanged)

  const handleRegenerateCode = async () => {
    const metodo = formData.tipo === 'TC' ? formData.metodo : null;
    const newCode = await generateCode(formData.tipo, metodo);
    setFormData({ ...formData, code: newCode });
    setAutoGeneratedCode(true);
    setSaveResult({ success: true, message: '✅ Código regenerado' });
    setTimeout(() => setSaveResult(null), 2000);
  };

  const handleCodeChange = (value: string) => {
    setFormData({ ...formData, code: value });
    setAutoGeneratedCode(false);
  };

  const saveMutation = useMutation<Ejercicio, Error, EjercicioFormData>({
    mutationFn: async (data: EjercicioFormData) => {
      if (isInlineMode) {
        return data as unknown as Ejercicio;
      }

      const currentId = data.id || ejercicio?.id; // Use ID from data or prop

      console.log('Validando unicidad de código:', {
        newCode: data.code,
        currentId: currentId,
        isInline: isInlineMode
      });

      const codeExists = allEjercicios.some(e => {
        const isDuplicate = e.code === data.code && e.id !== currentId;
        if (isDuplicate) {
          console.warn('Conflicto de código encontrado:', {
            existingExercise: e,
            currentId: currentId
          });
        }
        return isDuplicate;
      });

      if (codeExists) {
        throw new Error('Ya existe un ejercicio con este código. El código debe ser único.');
      }

      if (ejercicio?.id) {
        await localDataClient.entities.Bloque.update(ejercicio.id, data as any);
        return data as unknown as Ejercicio;
      }
      await localDataClient.entities.Bloque.create(data as any);
      return data as unknown as Ejercicio;
    },
    onSuccess: (result) => {
      if (isInlineMode) {
        onClose(result);
      } else {
        queryClient.invalidateQueries({ queryKey: ['bloques'] });
        queryClient.invalidateQueries({ queryKey: ['bloques-with-variations'] });
        setSaveResult({ success: true, message: '✅ Cambios guardados' });
        setTimeout(() => onClose(null), 1500);
      }
    },
    onError: (error) => {
      setSaveResult({ success: false, message: `❌ ${error.message}` });
    },
  });

  const handleSave = useCallback(() => {
    if (!formData.nombre.trim()) {
      setSaveResult({ success: false, message: '❌ El nombre es obligatorio' });
      return;
    }
    if (!formData.code.trim()) {
      setSaveResult({ success: false, message: '❌ El código es obligatorio' });
      return;
    }
    if (formData.duracionSeg < 0) {
      setSaveResult({ success: false, message: '❌ La duración debe ser mayor o igual a 0' });
      return;
    }

    const dataToSave = { ...formData };

    // Asegurarse de que se use mediaLinks en lugar de media (formato antiguo)
    if (dataToSave.media) {
      delete dataToSave.media;
    }

    // Normalizar mediaLinks al guardar
    // dataToSave.mediaLinks contains objects {url, name} or strings
    // We need to:
    // 1. Save the rich objects in content.mediaItems (for ordering and names)
    // 2. Save only the URLs in the mediaLinks column (for DB compatibility and simple queries)

    const richMediaItems = normalizeMediaLinks(dataToSave.mediaLinks || [], true) as MediaItem[];
    const plainUrls = normalizeMediaLinks(dataToSave.mediaLinks || [], false);

    dataToSave.mediaLinks = plainUrls;

    // PACK VARIATIONS AND RICH MEDIA INTO CONTENT
    // The API whitelist strips 'variations' and unknown fields, so we nest them in 'content'
    dataToSave.content = {
      ...(dataToSave.content || {}),
      variations: dataToSave.variations || [],
      mediaItems: richMediaItems // New field for rich media with names/order
    };

    if (dataToSave.tipo === 'FM') {
      dataToSave.elementosOrdenados = selectedElementos.map(e => e.nombre);
      if (!usandoPiezaSnapshot) {
        dataToSave.piezaRefId = piezaRefId;
      }
    } else {
      dataToSave.elementosOrdenados = [];
      dataToSave.piezaRefId = null;
    }

    // Asegurar que targetPPMs se guarde (y añadir versión snake_case por si acaso)
    if (dataToSave.targetPPMs) {
      dataToSave.target_ppms = dataToSave.targetPPMs;
    }

    // Añadir profesorId si no existe (solo para creación, no para edición)
    if (!ejercicio?.id) {
      dataToSave.profesorId = effectiveUser?.effectiveUserId || null;
      if (!effectiveUser?.effectiveUserId) {
        setSaveResult({ success: false, message: '❌ No se pudo identificar el usuario. Por favor, recarga la página.' });
        return;
      }
    } else {
      // Ensure ID is present for updates
      dataToSave.id = ejercicio.id;
    }

    // PACK VARIATIONS INTO CONTENT (Critical for persistence)
    // The API whitelist strips 'variations', so we must nest them in 'content'
    // (variations and mediaItems are already packed above)

    saveMutation.mutate(dataToSave);
  }, [formData, selectedElementos, usandoPiezaSnapshot, piezaRefId, ejercicio?.id, effectiveUser?.effectiveUserId, saveMutation]);

  const addTargetPPM = () => {
    const currentLevels = (formData.targetPPMs || []).map(t => t.nivel);
    let nextLevel = 1;
    while (currentLevels.includes(nextLevel) && nextLevel <= 10) {
      nextLevel++;
    }

    if (nextLevel > 10) {
      toast.error("Ya existen objetivos para todos los niveles (1-10).");
      return;
    }

    setFormData({
      ...formData,
      targetPPMs: [...(formData.targetPPMs || []), { nivel: nextLevel, bpm: 60, unidad: 'negra' }]
    });
  };

  const removeTargetPPM = (index: number) => {
    const newTargets = [...(formData.targetPPMs || [])];
    newTargets.splice(index, 1);
    setFormData({ ...formData, targetPPMs: newTargets });
  };

  const updateTargetPPM = (index: number, field: keyof TargetPPM, value: string | number) => {
    if (field === 'nivel') {
      const newLevel = typeof value === 'number' ? value : parseInt(value as string) || 1;
      const currentLevels = (formData.targetPPMs || []).map((t, i) => i === index ? null : t.nivel); // Exclude current item

      if (currentLevels.includes(newLevel)) {
        toast.error("Ya existe una velocidad objetivo para ese nivel.");
        return; // Prevent update
      }
    }

    const newTargets = [...(formData.targetPPMs || [])];
    newTargets[index] = { ...newTargets[index], [field]: value };
    setFormData({ ...formData, targetPPMs: newTargets });
  };

  const addMaterial = () => {
    if (nuevoMaterial.trim()) {
      setFormData({
        ...formData,
        materialesRequeridos: [...formData.materialesRequeridos, nuevoMaterial.trim()]
      });
      setNuevoMaterial('');
    }
  };

  const removeMaterial = (index: number) => {
    setFormData({
      ...formData,
      materialesRequeridos: formData.materialesRequeridos.filter((_, i) => i !== index)
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        onClose(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSave]);

  const toggleElementoSeleccion = (elemento: Elemento) => {
    if (selectedElementos.find(e => e.nombre === elemento.nombre)) {
      setSelectedElementos(selectedElementos.filter(e => e.nombre !== elemento.nombre));
    } else {
      setSelectedElementos([...selectedElementos, elemento]);
    }
  };

  const moveElemento = (index: number, direction: number) => {
    if (index + direction < 0 || index + direction >= selectedElementos.length) return;
    const newSelected = [...selectedElementos];
    [newSelected[index], newSelected[index + direction]] = [newSelected[index + direction], newSelected[index]];
    setSelectedElementos(newSelected);
  };

  const resetElementosOrden = () => {
    if (elementosDisponibles && elementosDisponibles.length > 0) {
      setSelectedElementos((elementosDisponibles as any[]).filter((availableEl: any) =>
        selectedElementos.some(selectedEl => selectedEl.nombre === availableEl.nombre)
      ));
    } else {
      setSelectedElementos([]);
    }
  };

  // --- Variation Management ---
  const addVariation = () => {
    setFormData({
      ...formData,
      variations: [
        ...(formData.variations || []),
        {
          id: generateUUID(), // Generate ID for new variation
          nombre: '',
          nivelMinimo: 1,
          duracionSeg: 0,
          tags: [],
          asset_url: ''
        }
      ]
    });
  };

  const updateVariation = (index: number, field: keyof Variation, value: string | number | string[] | MediaItem[] | (string | MediaItem)[]) => {
    const newVariations = [...(formData.variations || [])];
    newVariations[index] = { ...newVariations[index], [field]: value };
    setFormData({ ...formData, variations: newVariations });
  };

  const removeVariation = (index: number) => {
    const newVariations = [...(formData.variations || [])];
    newVariations.splice(index, 1);
    setFormData({ ...formData, variations: newVariations });
  };

  const tipoLabels = {
    CA: 'Calentamiento A (físico)',
    CB: 'Calentamiento B (musical)',
    TC: 'Técnica',
    FM: 'Fragmento Musical',
    VC: 'Vuelta a la Calma',
    AD: 'Aviso/Descanso',
  };

  const tipoColors = {
    CA: 'bg-brand-100 text-brand-800 border-brand-200',
    CB: 'bg-blue-100 text-blue-800 border-blue-200',
    TC: 'bg-purple-100 text-purple-800 border-purple-200',
    FM: 'bg-pink-100 text-pink-800 border-pink-200',
    VC: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    AD: 'bg-[var(--color-surface-muted)] text-ui border-[var(--color-border-default)]',
  };

  const isAD = formData.tipo === 'AD';
  const isFM = formData.tipo === 'FM';

  const modalContent = (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[260]"
        onClick={() => onClose(null)}
      />

      <div className="fixed inset-0 z-[265] flex items-center justify-center pointer-events-none p-4 overflow-y-auto">
        <div
          className="bg-[var(--color-surface-elevated)] w-full max-w-3xl max-h-[92vh] shadow-card rounded-[var(--radius-modal)] flex flex-col pointer-events-auto my-8 border border-[var(--color-border-default)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)] rounded-t-[var(--radius-modal)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                    {isInlineMode ? 'Editar Ejercicio (inline)' : ejercicio ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {isInlineMode ? 'Cambios aplicados a la sesión actual' : 'Plantilla de ejercicio'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onClose(null)} className="text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-[var(--btn-radius)] touch-manipulation">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {saveResult && (
              <Alert className={`rounded-[var(--radius-card)] ${saveResult.success ? 'border-[var(--color-success)]/20 bg-[var(--color-success)]/10' : 'border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10'}`}>
                <AlertDescription className="text-[var(--color-text-primary)]">
                  {saveResult.message}
                </AlertDescription>
              </Alert>
            )}

            {isFM && usandoPiezaSnapshot && (
              <Alert className="rounded-[var(--radius-card)] border-[var(--color-info)]/20 bg-[var(--color-info)]/10">
                <Info className="h-4 w-4 text-[var(--color-info)]" />
                <AlertDescription className="text-[var(--color-info)]">
                  <strong>Este FM usa el material de la Pieza de la Asignación.</strong>
                </AlertDescription>
              </Alert>
            )}

            {isAD && (
              <Alert className="rounded-[var(--radius-card)] border-[var(--color-warning)]/20 bg-[var(--color-warning)]/10">
                <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                <AlertDescription className="text-[var(--color-text-primary)]">
                  Este ejercicio no activa cronómetro ni suma tiempo real. La duración es solo referencia visual.
                </AlertDescription>
              </Alert>
            )}

            <Accordion type="single" collapsible defaultValue="detalles" className="space-y-3">
              {/* SECCIÓN 1: DETALLES GENERALES */}
              <AccordionItem value="detalles" className="border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-elevated)] overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[var(--color-surface-muted)]">
                  <span className="font-semibold text-[var(--color-text-primary)]">1. Detalles Generales</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-12 gap-4">
                    {/* Fila 1: Tipo y Método */}
                    <div className="col-span-12 md:col-span-5">
                      <Label htmlFor="tipo">Tipo *</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(v) => {
                          const newMetodo = v === 'TC' ? formData.metodo : null;
                          setFormData({ ...formData, tipo: v });
                          if (!ejercicio) {
                            generateCode(v, newMetodo).then(code => {
                              setFormData(prev => ({ ...prev, code }));
                              setAutoGeneratedCode(true);
                            });
                          }
                        }}
                      >
                        <SelectTrigger id="tipo" className="w-full h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange mt-1">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          align="start"
                          sideOffset={4}
                          className="z-[280] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                        >
                          {Object.entries(tipoLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-12 md:col-span-7">
                      <div className="flex items-center justify-between h-[21px]">
                        <Label htmlFor="metodo">Método *</Label>
                        {formData.tipo === 'TC' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMetodoEditor(!showMetodoEditor)}
                            className="text-xs h-5 px-2 text-[var(--color-primary)] -mt-0.5"
                          >
                            {showMetodoEditor ? 'Ocultar' : 'Editar métodos'}
                          </Button>
                        )}
                      </div>
                      <Select
                        value={formData.metodo}
                        onValueChange={(v) => {
                          setFormData({ ...formData, metodo: v });
                          if (!ejercicio && formData.tipo === 'TC') {
                            generateCode('TC', v).then(code => {
                              setFormData(prev => ({ ...prev, code }));
                              setAutoGeneratedCode(true);
                            });
                          }
                        }}
                        disabled={formData.tipo !== 'TC'}
                      >
                        <SelectTrigger id="metodo" className="w-full h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange mt-1">
                          <SelectValue placeholder={formData.tipo === 'TC' ? 'Selecciona...' : 'Otro'} />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          align="start"
                          sideOffset={4}
                          className="z-[280] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                        >
                          {metodoOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label} ({opt.value})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Editor de métodos inline (solo cuando showMetodoEditor) */}
                    {formData.tipo === 'TC' && showMetodoEditor && (
                      <div className="col-span-12 p-4 border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-muted)] space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Métodos disponibles:</p>
                          <div className="flex flex-wrap gap-2">
                            {metodos.map((m) => {
                              const inUse = isMetodoInUse(m.value);
                              return (
                                <div
                                  key={m.value}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${editingMetodo?.value === m.value
                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]'
                                    : inUse
                                      ? 'border-[var(--color-border-default)] bg-[var(--color-surface-muted)] opacity-70'
                                      : 'border-[var(--color-border-default)] bg-[var(--color-surface)]'
                                    }`}
                                >
                                  <span className="font-medium">{m.label}</span>
                                  <span className="text-[var(--color-text-secondary)]">({m.value})</span>
                                  {inUse && <span className="text-[10px] text-[var(--color-text-secondary)] ml-1">🔒</span>}
                                  <Button type="button" variant="ghost" size="icon" onClick={() => handleStartEditMetodo(m)} disabled={inUse} className={`h-5 w-5 p-0 ml-1 ${inUse ? 'opacity-30' : 'hover:bg-[var(--color-info)]/10'}`}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteMetodo(m.value)} disabled={inUse} className={`h-5 w-5 p-0 ${inUse ? 'opacity-30' : 'hover:bg-[var(--color-danger)]/10'}`}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)] italic mt-2">🔒 = En uso</p>
                        </div>
                        <div className="pt-3 border-t border-[var(--color-border-default)]">
                          <p className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
                            {editingMetodo ? `✏️ Editando: ${editingMetodo.label}` : '➕ Añadir nuevo:'}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            <Input placeholder="Código" value={nuevoMetodoCodigo} onChange={(e) => setNuevoMetodoCodigo(e.target.value.toUpperCase().slice(0, 5))} className="w-20 h-9 text-xs" disabled={!!editingMetodo} />
                            <Input placeholder="Nombre" value={nuevoMetodoNombre} onChange={(e) => setNuevoMetodoNombre(e.target.value)} className="flex-1 h-9 text-xs min-w-[120px]" />
                            {editingMetodo ? (
                              <>
                                <Button type="button" size="sm" onClick={handleSaveEditMetodo} disabled={!nuevoMetodoNombre} className="h-9"><Save className="w-3 h-3 mr-1" />Guardar</Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleCancelEditMetodo} className="h-9">Cancelar</Button>
                              </>
                            ) : (
                              <Button type="button" size="sm" onClick={handleAddMetodo} disabled={!nuevoMetodoCodigo || !nuevoMetodoNombre} className="h-9"><Plus className="w-3 h-3 mr-1" />Añadir</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fila 2: Nombre, Código, Duración */}
                    <div className="col-span-12 md:col-span-5">
                      <Label htmlFor="nombre" className="block">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Escalas cromáticas"
                        className="w-full h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange mt-1"
                      />
                    </div>
                    <div className="col-span-8 md:col-span-5">
                      <Label htmlFor="code" className="block">Código *</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => handleCodeChange(e.target.value)}
                          placeholder="TC-OTR-XXXX"
                          className="flex-1 min-w-0 h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleRegenerateCode}
                          title="Regenerar código"
                          className="h-10 w-10 min-w-[40px] rounded-[var(--radius-ctrl)] shrink-0"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label htmlFor="duracion" className="block">Duración *</Label>
                      <Input
                        id="duracion"
                        type="number"
                        min="0"
                        value={formData.duracionSeg}
                        onChange={(e) => setFormData({ ...formData, duracionSeg: parseInt(e.target.value || '0') })}
                        className="w-full max-w-[100px] ml-auto h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange mt-1"
                      />
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {Math.floor(formData.duracionSeg / 60)}:{String(formData.duracionSeg % 60).padStart(2, '0')} min
                      </p>
                    </div>

                    {/* Fila 3: Habilidades */}
                    <div className="col-span-12">
                      <Label>Habilidades Maestras (Skill Tags)</Label>
                      <MultiSelect
                        label="Habilidades"
                        items={SKILL_OPTIONS}
                        value={formData.skillTags}
                        onChange={(val: string[]) => setFormData({ ...formData, skillTags: val })}
                        icon={Star}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SECCIÓN 2: INSTRUCCIONES Y LOGROS */}
              <AccordionItem value="instrucciones" className="border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-elevated)] overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[var(--color-surface-muted)]">
                  <span className="font-semibold text-[var(--color-text-primary)]">2. Instrucciones y Logros</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12">
                      <Label htmlFor="instrucciones">Instrucciones</Label>
                      <Textarea
                        id="instrucciones"
                        value={formData.instrucciones}
                        onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
                        placeholder="Instrucciones detalladas para el ejercicio..."
                        rows={3}
                        className="rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange resize-none mt-1"
                      />
                    </div>

                    <div className="col-span-12">
                      <Label htmlFor="indicador">Indicador de Logro</Label>
                      <Textarea
                        id="indicador"
                        value={formData.indicadorLogro}
                        onChange={(e) => setFormData({ ...formData, indicadorLogro: e.target.value })}
                        placeholder="¿Cómo sabe el estudiante que lo logró?"
                        rows={3}
                        className="rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange resize-none mt-1"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {isFM && (
                <Card className="app-panel">
                  <CardHeader>
                    <CardTitle>
                      {usandoPiezaSnapshot ? 'Elementos de la Pieza (Asignación)' : 'Configuración FM (Previsualización)'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!usandoPiezaSnapshot && (
                      <div>
                        <Label htmlFor="piezaRef">Pieza de referencia (opcional)</Label>
                        <Select
                          value={piezaRefId || ""}
                          onValueChange={setPiezaRefId}
                        >
                          <SelectTrigger id="piezaRef" className="w-full h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange">
                            <SelectValue placeholder="Selecciona una Pieza para previsualizar FM (opcional)" />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            side="bottom"
                            align="start"
                            sideOffset={4}
                            className="z-[280] min-w-[var(--radix-select-trigger-width)] max-h-64 overflow-auto"
                          >
                            <SelectItem value="">Sin pieza de referencia</SelectItem>
                            {piezas.length === 0 ? (
                              <div className="p-2 text-sm text-[var(--color-text-secondary)]">No hay piezas disponibles</div>
                            ) : (
                              piezas.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {!piezaRefId && (
                          <p className="text-xs text-[var(--color-info)] mt-1">
                            Puedes guardar sin pieza. La configuración se aplicará al crear la Asignación.
                          </p>
                        )}
                      </div>
                    )}

                    {elementosDisponibles.length > 0 && (
                      <>
                        <div>
                          <Label>Elementos disponibles (multi-selección y ordenación)</Label>
                          <div className="border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] p-3 max-h-48 overflow-y-auto space-y-2 bg-muted">
                            {(elementosDisponibles as any[]).map((elemento: any) => (
                              <div
                                key={elemento.nombre}
                                className="flex items-center gap-2 p-2 bg-card border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] cursor-pointer hover:bg-muted hover:shadow-sm transition-all"
                                onClick={() => toggleElementoSeleccion(elemento)}
                              >
                                <Checkbox
                                  checked={!!selectedElementos.find(e => e.nombre === elemento.nombre)}
                                  onCheckedChange={() => toggleElementoSeleccion(elemento)}
                                />
                                <Music className="w-4 h-4 text-[var(--color-primary)]" />
                                <span className="text-sm flex-1 text-ui">{elemento.nombre}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedElementos.length > 0 && (
                          <>
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label>Orden seleccionado ({selectedElementos.length})</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={resetElementosOrden}
                                    className="h-8 rounded-[var(--radius-ctrl)] hover:shadow-sm"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Restablecer
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedElementos([])}
                                    className="h-8 rounded-[var(--radius-ctrl)] hover:shadow-sm"
                                  >
                                    Vaciar
                                  </Button>
                                </div>
                              </div>
                              <div className="border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] p-3 space-y-1 bg-card">
                                {selectedElementos.map((elemento, index) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-[var(--radius-ctrl)]">
                                    <div className="flex flex-col gap-0.5">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 p-0 rounded"
                                        onClick={() => moveElemento(index, -1)}
                                        disabled={index === 0}
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 p-0 rounded"
                                        onClick={() => moveElemento(index, 1)}
                                        disabled={index === selectedElementos.length - 1}
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <Badge variant="outline" className="rounded-full">{index + 1}</Badge>
                                    <span className="text-sm flex-1 text-ui">{elemento.nombre}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label>Preview del Material</Label>
                              <Tabs defaultValue={String(0)} className="w-full">
                                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(selectedElementos.length, 4)}, 1fr)` }}>
                                  {selectedElementos.slice(0, 4).map((elemento, idx) => (
                                    <TabsTrigger key={idx} value={String(idx)} className="text-xs truncate">
                                      {elemento.nombre}
                                    </TabsTrigger>
                                  ))}
                                  {selectedElementos.length > 4 && (
                                    <TabsTrigger value="more" className="text-xs truncate" disabled>
                                      ... {selectedElementos.length - 4} más
                                    </TabsTrigger>
                                  )}
                                </TabsList>
                                {selectedElementos.map((elemento, idx) => (
                                  <TabsContent key={idx} value={String(idx)} className="space-y-2">
                                    {elemento.media?.video && (
                                      <div className="border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] p-2 bg-card">
                                        <div className="flex items-center gap-2 text-sm mb-1">
                                          <Play className="w-4 h-4 text-[var(--color-info)]" />
                                          <span className="font-medium text-ui">Video</span>
                                        </div>
                                        <a href={elemento.media.video} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-info)] hover:underline truncate block">
                                          {elemento.media.video}
                                        </a>
                                      </div>
                                    )}
                                    {elemento.media?.audio && (
                                      <div className="border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] p-2 bg-card">
                                        <div className="flex items-center gap-2 text-sm mb-1">
                                          <Volume2 className="w-4 h-4 text-[var(--color-primary)]" />
                                          <span className="font-medium text-ui">Audio</span>
                                        </div>
                                        <a href={elemento.media.audio} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-primary)] hover:underline truncate block">
                                          {elemento.media.audio}
                                        </a>
                                      </div>
                                    )}
                                    {elemento.media?.imagen && (
                                      <div className="border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] p-2 bg-card">
                                        <div className="flex items-center gap-2 text-sm mb-1">
                                          <ImageIcon className="w-4 h-4 text-[var(--color-success)]" />
                                          <span className="font-medium text-ui">Imagen</span>
                                        </div>
                                        <a href={elemento.media.imagen} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-success)] hover:underline truncate block">
                                          {elemento.media.imagen}
                                        </a>
                                      </div>
                                    )}
                                    {elemento.media?.pdf && (
                                      <div className="border border-[var(--color-border-default)] rounded-[var(--radius-ctrl)] p-2 bg-card">
                                        <div className="flex items-center gap-2 text-sm mb-1">
                                          <FileText className="w-4 h-4 text-[var(--color-danger)]" />
                                          <span className="font-medium text-ui">PDF</span>
                                        </div>
                                        <a href={elemento.media.pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-danger)] hover:underline truncate block">
                                          {elemento.media.pdf}
                                        </a>
                                      </div>
                                    )}
                                    {!elemento.media?.video && !elemento.media?.audio && !elemento.media?.imagen && !elemento.media?.pdf && (
                                      <p className="text-xs text-[var(--color-text-secondary)] text-center py-4">Sin material multimedia</p>
                                    )}
                                  </TabsContent>
                                ))}
                              </Tabs>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {elementosDisponibles.length === 0 && isFM && (
                      <Alert className="rounded-[var(--radius-ctrl)] border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 text-sm">
                          {usandoPiezaSnapshot ?
                            'La pieza de la asignación no tiene elementos' :
                            'Selecciona una pieza con elementos para configurar FM'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}


              {/* SECCIÓN 3: CONTENIDO */}
              <AccordionItem value="contenido" className="border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-elevated)] overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[var(--color-surface-muted)]">
                  <span className="font-semibold text-[var(--color-text-primary)]">3. Contenido</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-12 gap-4">
                    {/* Materiales Requeridos */}
                    <div className="col-span-12 space-y-3">
                      <Label className="text-sm font-medium">Materiales Requeridos</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ej: Metrónomo, partitura..."
                          value={nuevoMaterial}
                          onChange={(e) => setNuevoMaterial(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                          className="h-10 rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange"
                        />
                        <Button onClick={addMaterial} type="button" className="h-10 rounded-[var(--radius-ctrl)] btn-primary shadow-sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.materialesRequeridos.map((material, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1 rounded-full">
                            {material}
                            <button
                              onClick={() => removeMaterial(index)}
                              className="ml-1 hover:text-[var(--color-danger)]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Bloque Multimedia */}
                    {!isFM && (
                      <div className="col-span-12 space-y-3 overflow-hidden">
                        <Label className="text-sm font-medium">Bloque Multimedia</Label>
                        <MediaLinksInput
                          value={formData.mediaLinks || []}
                          onChange={(links) => setFormData({ ...formData, mediaLinks: normalizeMediaLinks(links) })}
                          showFileUpload={true}
                          originType="ejercicio"
                          originId={exerciseId}
                          originLabel={formData.code ? `${formData.code} - ${formData.nombre}` : (formData.nombre || 'Nuevo Ejercicio')}
                          onAssetRegistered={handleAssetRegistered}
                        />
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* SECCIÓN 4: VARIACIONES Y OBJETIVOS */}
              <AccordionItem value="variaciones" className="border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-elevated)] overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-[var(--color-surface-muted)]">
                  <span className="font-semibold text-[var(--color-text-primary)]">4. Variaciones y Objetivos</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-12 gap-4">
                    {/* Variaciones */}
                    <div className="col-span-12 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Variaciones</Label>
                        <Button onClick={addVariation} size="sm" variant="outline" className={componentStyles.buttons.outline}>
                          <Plus className="w-4 h-4 mr-2" />
                          Añadir Variación
                        </Button>
                      </div>
                      {(formData.variations || []).length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-[var(--color-border-default)] rounded-lg">
                          <Info className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-secondary)]" />
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            No hay variaciones. Añade variaciones para diferentes niveles de dificultad.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(formData.variations || []).map((variation, idx) => (
                            <div key={idx} className="border border-[var(--color-border-default)] rounded-lg bg-[var(--color-surface-muted)]/50 hover:bg-[var(--color-surface-muted)] transition-colors overflow-hidden">
                              {/* Variation Header with Delete Button */}
                              <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface-muted)] border-b border-[var(--color-border-default)]/50">
                                <span className="text-xs font-medium text-[var(--color-text-secondary)]">Variación {idx + 1}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariation(idx)}
                                  className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] h-7 w-7 p-0"
                                  title="Eliminar variación"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>

                              {/* Fields Grid */}
                              <div className="p-4 grid grid-cols-12 gap-4 items-start">
                                {/* Nombre/Etiqueta: col-span-3 */}
                                <div className="col-span-12 md:col-span-3">
                                  <Label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">Nombre/Etiqueta</Label>
                                  <Input
                                    id={`var-label-${idx}`}
                                    value={variation.nombre || ''}
                                    onChange={(e) => updateVariation(idx, 'nombre', e.target.value)}
                                    placeholder="Nombre de la variación..."
                                    className="h-9 text-sm w-full"
                                  />
                                </div>

                                {/* Nivel Mínimo: col-span-2 */}
                                <div className="col-span-6 md:col-span-2">
                                  <Label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">Nivel Mín.</Label>
                                  <Input
                                    id={`var-min-level-${idx}`}
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={variation.nivelMinimo || 1}
                                    onChange={(e) => updateVariation(idx, 'nivelMinimo', parseInt(e.target.value) || 1)}
                                    className="h-9 text-sm text-center w-full"
                                  />
                                </div>

                                {/* Duración: col-span-3 */}
                                <div className="col-span-6 md:col-span-3">
                                  <Label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">Duración (seg)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={variation.duracionSeg || 0}
                                    onChange={(e) => updateVariation(idx, 'duracionSeg', parseInt(e.target.value) || 0)}
                                    placeholder="120"
                                    className="h-9 text-sm w-full"
                                  />
                                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                    {Math.floor((variation.duracionSeg || 0) / 60)}:{String((variation.duracionSeg || 0) % 60).padStart(2, '0')}
                                  </p>
                                </div>

                                {/* Tags: col-span-4 (Chip/Pill style) */}
                                <div className="col-span-12 md:col-span-4">
                                  <Label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">Tags (opcional)</Label>
                                  <div className="flex flex-wrap gap-1.5 p-2 min-h-[36px] bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-md">
                                    {(variation.tags || []).map((tag, tagIdx) => (
                                      <Badge
                                        key={tagIdx}
                                        variant="secondary"
                                        className="flex items-center gap-1 text-xs py-0.5 px-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-0"
                                      >
                                        {tag}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newTags = [...(variation.tags || [])];
                                            newTags.splice(tagIdx, 1);
                                            updateVariation(idx, 'tags', newTags);
                                          }}
                                          className="ml-0.5 hover:text-[var(--color-danger)] focus:outline-none"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                    <input
                                      type="text"
                                      placeholder={(variation.tags || []).length === 0 ? "Añadir tag..." : ""}
                                      className="flex-1 min-w-[80px] text-xs bg-transparent border-0 outline-none focus:ring-0 p-0 placeholder:text-[var(--color-text-muted)]"
                                      onKeyDown={(e) => {
                                        const target = e.target as HTMLInputElement;
                                        if ((e.key === 'Enter' || e.key === ',') && target.value.trim()) {
                                          e.preventDefault();
                                          const newTag = target.value.trim().replace(/,/g, '');
                                          if (newTag && !(variation.tags || []).includes(newTag)) {
                                            updateVariation(idx, 'tags', [...(variation.tags || []), newTag]);
                                          }
                                          target.value = '';
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const target = e.target as HTMLInputElement;
                                        const newTag = target.value.trim().replace(/,/g, '');
                                        if (newTag && !(variation.tags || []).includes(newTag)) {
                                          updateVariation(idx, 'tags', [...(variation.tags || []), newTag]);
                                        }
                                        target.value = '';
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Media Block (Full Width) */}
                                <div className="col-span-12 overflow-hidden">
                                  <Label className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 block">Recursos y Multimedia</Label>
                                  <MediaLinksInput
                                    value={variation.asset_urls || (variation.asset_url ? [variation.asset_url] : [])}
                                    onChange={(urls) => updateVariation(idx, 'asset_urls', urls)}
                                    showFileUpload={true}
                                    originType="variacion"
                                    originId={variation.id}
                                    originLabel={`Variación: ${variation.nombre || 'Nueva'}`}
                                    initialMedia={variation.mediaItems || []}
                                    onUpdate={(items) => updateVariation(idx, 'mediaItems', items)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Objetivos Técnicos (PPM) - solo para CA, CB, TC */}
                    {['CA', 'CB', 'TC'].includes(formData.tipo) && (
                      <div className="col-span-12 space-y-3 pt-4 border-t border-[var(--color-border-default)]">
                        <Label className="text-sm font-medium">Objetivos Técnicos (PPM)</Label>
                        <div className="grid grid-cols-12 gap-2 md:gap-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2 px-1">
                          <div className="col-span-2">Nivel</div>
                          <div className="col-span-2">PPM</div>
                          <div className="col-span-5">Unidad</div>
                          <div className="col-span-3 text-right">Acciones</div>
                        </div>

                        {(formData.targetPPMs || []).map((target, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 md:gap-4 items-center">
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={target.nivel}
                                onChange={(e) => updateTargetPPM(index, 'nivel', parseInt(e.target.value) || 1)}
                                className="h-10 w-full rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange text-center"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min="1"
                                value={target.bpm}
                                onChange={(e) => updateTargetPPM(index, 'bpm', parseInt(e.target.value) || 60)}
                                className="h-10 w-full rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange text-center"
                              />
                            </div>
                            <div className="col-span-5">
                              <Select
                                value={target.unidad}
                                onValueChange={(v) => updateTargetPPM(index, 'unidad', v)}
                              >
                                <SelectTrigger className="h-10 w-full rounded-[var(--radius-ctrl)] border-[var(--color-border-default)] focus-orange">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="negra">
                                    <div className="flex items-center gap-3">
                                      <NoteQuarter className="w-5 h-5 shrink-0" />
                                      <span className="text-sm">Negra</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="negraConPuntillo">
                                    <div className="flex items-center gap-3">
                                      <NoteQuarterDotted className="w-5 h-5 shrink-0" />
                                      <span className="text-sm">Negra c/p</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="blanca">
                                    <div className="flex items-center gap-3">
                                      <NoteHalf className="w-5 h-5 shrink-0" />
                                      <span className="text-sm">Blanca</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="blancaConPuntillo">
                                    <div className="flex items-center gap-3">
                                      <NoteHalfDotted className="w-5 h-5 shrink-0" />
                                      <span className="text-sm">Blanca c/p</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="corchea">
                                    <div className="flex items-center gap-3">
                                      <NoteEighth className="w-5 h-5 shrink-0" />
                                      <span className="text-sm">Corchea</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-3 flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTargetPPM(index)}
                                className="h-10 w-10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] rounded-[var(--radius-ctrl)]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addTargetPPM}
                          className="w-full border-dashed border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Añadir Nivel Objetivo
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="border-t border-[var(--color-border-default)] px-6 py-4 bg-[var(--color-surface-muted)] rounded-b-2xl">
            <div className="flex gap-3 mb-2">
              <Button variant="outline" onClick={() => onClose(null)} className={`flex-1 ${componentStyles.buttons.outline}`}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className={`flex-1 ${componentStyles.buttons.primary}`}
              >
                {saveMutation.isPending ? (
                  'Guardando...'
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-center text-[var(--color-text-secondary)]">
              Ctrl/⌘+. : cerrar • Ctrl/⌘+Intro : guardar
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

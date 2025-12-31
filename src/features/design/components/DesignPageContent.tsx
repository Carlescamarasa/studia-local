/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDesign } from "@/features/design/components/DesignProvider";
import { useDesignDiff } from "@/features/design/components/useDesignDiff";
import { Card, CardContent, CardHeader, CardTitle, Badge, Alert, AlertDescription } from "@/features/shared/components/ds";
import { Button } from "@/features/shared/components/ui/button";
import { Switch } from "@/features/shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shared/components/ui/select";
import { Label } from "@/features/shared/components/ui/label";
import { Input } from "@/features/shared/components/ui/input";
import { Textarea } from "@/features/shared/components/ui/textarea";
import {
  Palette, Trash2,
  FileCode,
  Scan, Copy, ChevronDown, ChevronUp,
  LayoutTemplate
} from "lucide-react";
import { toast } from "sonner";
import RequireRole from "@/features/auth/components/RequireRole";
import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import { Tabs } from "@/features/shared/components/ds/Tabs";
import { getAllPresets, deleteCustomPreset } from "@/features/design/components/DesignPresets";
import LevelConfigView from "@/features/admin/components/LevelConfigView";
import { DesignControls } from "@/features/design/components/DesignControls";
import { DesignStatusBlock } from "@/features/design/components/DesignStatusBlock";

// ... existing imports ...

interface BasePreset {
  id: string;
  label: string;
  description?: string;
  design: any;
}

interface PresetUI {
  id: string;
  name: string;
  label?: string;
  description?: string;
  config: any;
  design?: any;
  isBase?: boolean;
}

// ... existing interfaces ...


interface DiffAccordionProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface DiagnosticMetric {
  value: string | null;
  valid: boolean;
  missing: boolean;
  status: 'ok' | 'missing' | 'invalid';
}

interface SelectedElement {
  tag: string;
  classes: string[];
  styles: {
    borderRadius: string;
    boxShadow: string;
    background: string;
    color: string;
    padding: string;
  };
}



interface DesignPageContentProps {
  embedded?: boolean;
  hideLevelsTab?: boolean;
}

// ============================================================================
// COMPONENTS
// ============================================================================

const componentStyles = {
  layout: {
    page: "container mx-auto p-6 max-w-[var(--page-max-width)]",
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-6",
    grid3: "grid grid-cols-1 md:grid-cols-3 gap-6",
  },
  // ... rest of componentStyles unchanged ...
  controls: {
    inputDefault: "ctrl-field",
    selectDefault: "ctrl-field",
    inputSm: "ctrl-field h-8 text-xs",
    inputUnderline: "ctrl-field--underline",
  },
  containers: {
    cardBase: "app-card",
    cardElevated: "app-card bg-[var(--color-surface-elevated)]",
    cardMetric: "app-card",
    panelBase: "app-panel",
  },
  typography: {
    pageTitle: "text-2xl font-bold tracking-tight font-headings",
    pageSubtitle: "text-muted-foreground",
    cardTitle: "text-lg font-semibold leading-none tracking-tight",
    bodyText: "text-sm text-muted-foreground",
    smallMetaText: "text-xs text-muted-foreground",
  },
  buttons: {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
    ghost: "btn-ghost",
    danger: "btn-danger",
  },
  status: {
    badgeDefault: "badge-primary",
    badgeInfo: "badge-info",
    badgeSuccess: "badge-success",
    badgeWarning: "badge-warning",
    badgeDanger: "badge-danger",
    badgeOutline: "badge-outline",
  }
};



// ... rest of PREVIEW BANNER ...


// ============================================================================
// PREVIEW BANNER COMPONENT
// ============================================================================

// ============================================================================
// DIFF ACCORDION COMPONENT
// ============================================================================
interface DiffAccordionProps {
  isOpen: boolean;
  onToggle: () => void;
}





/**
 * Enhanced Diagnostic Overlay
 *
 * Features:
 * - Always on top (z-index: 2147483647)
 * - Draggable with handle
 * - Follow cursor mode (optional)
 * - Element picker (click to inspect)
 * - Real-time CSS variable monitoring
 * - Session storage for position and settings
 * - Copy report functionality
 */
// Core tokens to monitor
const MONITORED_TOKENS = [
  '--radius-card', '--radius-ctrl', '--radius-table', '--radius-modal',
  '--shadow-card', '--color-primary', '--color-background',
  '--page-max-width', '--page-padding-x', '--btn-height',
  '--sidebar-surface', '--sidebar-item-radius', '--card-padding-x'
];

function DiagnosticOverlay({ active }: { active: boolean }) {
  const [metrics, setMetrics] = useState<Record<string, DiagnosticMetric>>({});
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = sessionStorage.getItem('studia_diagnostic_position');
      return saved ? JSON.parse(saved) : { x: window.innerWidth - 340, y: 20 };
    } catch {
      return { x: window.innerWidth - 340, y: 20 };
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [followCursor, setFollowCursor] = useState(() => {
    try {
      return sessionStorage.getItem('studia_diagnostic_follow_cursor') === 'true';
    } catch {
      return false;
    }
  });
  const [pickerMode, setPickerMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Update metrics from CSS variables
  const updateMetrics = useCallback(() => {
    const root = getComputedStyle(document.documentElement);
    const newMetrics: Record<string, DiagnosticMetric> = {};

    MONITORED_TOKENS.forEach(token => {
      const value = root.getPropertyValue(token).trim();
      newMetrics[token] = {
        value: value || null,
        valid: value !== '' && value !== 'none' && !value.includes('NaN'),
        missing: !value,
        status: !value ? 'missing' : (value === 'none' || value.includes('NaN') ? 'invalid' : 'ok')
      };
    });

    setMetrics(newMetrics);
  }, []);

  // Real-time monitoring via MutationObserver
  useEffect(() => {
    if (!active) return;

    updateMetrics();

    const observer = new MutationObserver((mutations) => {
      if (mutations.some(m => m.attributeName === 'style')) {
        updateMetrics();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => observer.disconnect();
  }, [active, updateMetrics]);

  // Follow cursor mode
  useEffect(() => {
    if (!active || !followCursor) return;

    const handleMouseMove = (e: MouseEvent) => {
      const offset = 20;
      const width = 320;
      const height = 400;

      let x = e.clientX + offset;
      let y = e.clientY + offset;

      // Keep within viewport
      if (x + width > window.innerWidth) x = e.clientX - width - offset;
      if (y + height > window.innerHeight) y = e.clientY - height - offset;

      setPosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [active, followCursor]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (followCursor) return; // Disable drag in follow mode
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Keep within viewport
      const maxX = window.innerWidth - 320;
      const maxY = window.innerHeight - 100;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position to sessionStorage
      try {
        sessionStorage.setItem('studia_diagnostic_position', JSON.stringify(position));
      } catch (e) {
        console.warn('Failed to save diagnostic position:', e);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  // Element picker
  const handlePickElement = () => {
    setPickerMode(!pickerMode);
    setSelectedElement(null);
  };

  useEffect(() => {
    if (!pickerMode) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const element = e.target as HTMLElement;
      if (!element) return;
      const computed = getComputedStyle(element);

      setSelectedElement({
        tag: element.tagName.toLowerCase(),
        classes: Array.from(element.classList),
        styles: {
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,
          background: computed.background,
          color: computed.color,
          padding: computed.padding,
        }
      });

      setPickerMode(false);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pickerMode]);

  // Toggle follow cursor
  const handleToggleFollowCursor = () => {
    const newValue = !followCursor;
    setFollowCursor(newValue);
    try {
      sessionStorage.setItem('studia_diagnostic_follow_cursor', String(newValue));
    } catch (e) {
      console.warn('Failed to save follow cursor setting:', e);
    }
  };

  // Copy report
  const handleCopy = () => {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: Object.entries(metrics).map(([token, data]) => ({
        token,
        value: data.value || 'MISSING',
        status: data.status
      })),
      selectedElement
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast.success('✅ Diagnostic report copied');
  };

  if (!active) return null;

  const statusCounts = Object.values(metrics).reduce((acc: Record<string, number>, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      ref={overlayRef}
      className="fixed p-4 bg-black/95 text-white rounded-lg shadow-2xl border border-white/20 font-mono text-xs w-80 max-h-[80vh] overflow-auto pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 2147483647,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header - Draggable handle */}
      <div
        className="flex items-center justify-between mb-3 pb-2 border-b border-white/20 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <h4 className="font-bold flex items-center gap-2">
          <Scan className="w-3 h-3 text-green-400 animate-pulse" />
          DIAGNOSTIC MODE
        </h4>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">
            {statusCounts.ok || 0} OK / {statusCounts.missing || 0} MISS / {statusCounts.invalid || 0} INV
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={handleToggleFollowCursor}
          className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${followCursor ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/10 hover:bg-white/20'
            }`}
          title="Follow cursor"
        >
          {followCursor ? '📍 Following' : '📍 Follow'}
        </button>
        <button
          onClick={handlePickElement}
          className={`text-xs px-2 py-1 rounded transition-colors cursor-pointer ${pickerMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-white/10 hover:bg-white/20'
            }`}
          title="Pick element to inspect"
        >
          {pickerMode ? '🎯 Picking...' : '🎯 Pick'}
        </button>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors cursor-pointer"
          title="Copy diagnostic report"
        >
          <Copy className="w-3 h-3 inline mr-1" />
          Copy
        </button>
      </div>

      {/* Selected Element Info */}
      {selectedElement && (
        <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded">
          <div className="text-[10px] text-yellow-300 font-bold mb-1">SELECTED ELEMENT</div>
          <div className="text-[10px] space-y-0.5">
            <div><span className="text-gray-400">Tag:</span> {selectedElement.tag}</div>
            <div><span className="text-gray-400">Classes:</span> {selectedElement.classes.join(', ') || 'none'}</div>
            <div className="text-[9px] mt-1 space-y-0.5">
              {Object.entries(selectedElement.styles).map(([prop, value]) => (
                <div key={prop}>
                  <span className="text-gray-500">{prop}:</span> {value}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {Object.entries(metrics).map(([key, data]) => (
          <div key={key} className="flex justify-between items-center gap-2">
            <span className="text-gray-400 truncate text-[10px]" title={key}>{key}:</span>
            <span className={`text-right font-medium text-[10px] ${data.status === 'missing' ? 'text-red-400' :
              data.status === 'invalid' ? 'text-yellow-400' :
                'text-green-300'
              }`}>
              {data.status === 'missing' ? 'MISSING' : data.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-white/20 text-[10px] text-gray-500 text-center">
        Real-time via MutationObserver
      </div>
    </div>
  );
}

function DesignPageContent({ embedded = false, hideLevelsTab = false }: DesignPageContentProps) {
  const { design, setDesign, setDesignPartial, loadPreset, currentPresetId, setPresetId, basePresets } = useDesign();
  // Aliases para compatibilidad
  const config = design;
  const setConfig = setDesign;
  const [activeSection, setActiveSection] = useState('controls');

  const handleControlChange = (path: string, value: any, explicitScope?: 'light' | 'dark' | undefined) => {
    setDesignPartial(path, value, explicitScope);
  };
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(() => {
    try {
      return sessionStorage.getItem('studia_diagnostic_mode') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDiagnostic = (checked: boolean) => {
    setShowDiagnostic(checked);
    sessionStorage.setItem('studia_diagnostic_mode', String(checked));
  };


  // Combinar presets base (desde BasePresets.ts) con presets personalizados
  const customPresets = useMemo(() => getAllPresets(), []); // config dependency removed as getAllPresets reads from local storage/constants
  const allPresets = useMemo(() => {
    // Convertir basePresets a formato compatible con la UI
    const basePresetsMap: Record<string, PresetUI> = {};
    if (basePresets && Array.isArray(basePresets)) {
      basePresets.forEach((preset: BasePreset) => {
        basePresetsMap[preset.id] = {
          name: preset.label,
          description: preset.description,
          config: preset.design,
          isBase: true, // Marcar como preset base
          id: preset.id, // Ensure id is present for base presets
          label: preset.label, // Add label for BasePreset compatibility
          design: preset.design, // Add design for BasePreset compatibility
        };
      });
    }
    // Combinar con presets personalizados
    return { ...basePresetsMap, ...customPresets };
  }, [basePresets, customPresets]);

  const handleCopyConfig = useCallback(() => {
    try {
      const json = JSON.stringify(config, null, 2);
      navigator.clipboard.writeText(json);
      toast.success('✅ Configuración copiada al portapapeles');
    } catch (err: any) {
      toast.error('❌ Error al copiar: ' + err.message);
    }
  }, [config]);



  const handleLoadPreset = useCallback((presetId: string) => {
    // Verificar si es un preset base
    const basePreset = (basePresets as BasePreset[] | undefined)?.find((p: BasePreset) => p.id === presetId);
    if (basePreset) {
      // Cargar preset base usando setPresetId
      setPresetId(presetId);
      toast.success('✅ Preset base cargado');
      return;
    }

    // Si no es base, intentar cargar como preset personalizado
    const result = loadPreset(presetId);
    if (result.success) {
      toast.success('✅ Preset personalizado cargado');
    } else {
      toast.error('❌ Preset no encontrado');
    }
  }, [loadPreset, basePresets, setPresetId]);

  const handleDeletePreset = useCallback((presetId: string) => {
    if (!window.confirm('¿Eliminar este preset?')) return;

    const result = deleteCustomPreset(presetId);
    if (result.success) {
      toast.success('✅ Preset eliminado');
      setConfig({ ...config });
    } else {
      toast.error('❌ ' + result.error);
    }
  }, [config, setConfig]);







  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && (
        <PageHeader
          icon={Palette}
          title="Panel de Diseño"
          subtitle="Herramienta interna para ajustar tokens visuales y presets del sistema"
        />
      )}

      <div className={embedded ? "" : "studia-section"}>
        <div className="mb-6">
          <DesignStatusBlock
            activeTab={activeSection}
            onTabChange={setActiveSection}
            tabs={[
              { value: 'controls', label: 'Controles' },
              { value: 'preview', label: 'Preview' },
              ...(hideLevelsTab ? [] : [{ value: 'levels', label: 'Niveles' }]),
            ]}
          />
        </div>


        {activeSection === 'levels' && (
          <div className="mt-6">
            <LevelConfigView />
          </div>
        )}
        {activeSection === 'controls' && (
          <div className="space-y-4">



            {/* Presets Accordion */}
            <div className="border border-[var(--color-border-default)]  overflow-hidden bg-[var(--color-surface)]" style={{ borderRadius: 'var(--card-radius)' }}>
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'presets' ? null : 'presets')}
                className="w-full flex items-center justify-between p-4 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-muted)]/80 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-muted)] text-[var(--color-primary)]">
                    <LayoutTemplate className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--color-text-primary)]">Presets y Temas</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Gestionar temas base y configuraciones guardadas
                    </div>
                  </div>
                </div>
                {activeAccordion === 'presets' ? <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />}
              </button>

              {activeAccordion === 'presets' && (
                <div className="p-4 border-t border-[var(--color-border-default)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-medium text-[var(--color-text-secondary)]">Selecciona un punto de partida:</div>
                  </div>

                  <div className={componentStyles.layout.grid2}>
                    {/* Base Presets */}
                    {(Object.values(allPresets) as PresetUI[]).filter(p => p.isBase).map((preset: PresetUI) => (
                      <Card
                        key={preset.id || Math.random()}
                        className={`app-panel cursor-pointer transition-all border ${currentPresetId === preset.id ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]'
                          }`}
                        onClick={() => handleLoadPreset(preset.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                                  {preset.label || preset.name}
                                </h4>
                                {currentPresetId === preset.id && (
                                  <Badge className="badge-primary text-[10px] px-1.5 py-0.5 shrink-0">Activo</Badge>
                                )}
                                <Badge className="badge-outline text-[10px] px-1.5 py-0.5 shrink-0">Base</Badge>
                              </div>
                              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{preset.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Custom Presets */}
                    {(Object.values(allPresets) as PresetUI[]).filter(p => !p.isBase).map((preset: PresetUI) => (
                      <Card
                        key={preset.id || Math.random()}
                        className={`app-panel cursor-pointer transition-all border ${currentPresetId === preset.id ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]'
                          }`}
                        onClick={() => handleLoadPreset(preset.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                                  {preset.label || preset.name}
                                </h4>
                                {currentPresetId === preset.id && (
                                  <Badge className="badge-primary text-[10px] px-1.5 py-0.5 shrink-0">Activo</Badge>
                                )}
                                <Badge className="badge-outline text-[10px] px-1.5 py-0.5 shrink-0 border-purple-200 text-purple-700 bg-purple-50">Custom</Badge>
                              </div>
                              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{preset.description}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePreset(preset.id);
                              }}
                              className="h-7 w-7 p-0 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* JSON Config Accordion */}
            <div className="border border-[var(--color-border-default)]  overflow-hidden bg-[var(--color-surface)]" style={{ borderRadius: 'var(--card-radius)' }}>
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'json' ? null : 'json')}
                className="w-full flex items-center justify-between p-4 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-muted)]/80 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-muted)] text-[var(--color-text-secondary)]">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--color-text-primary)]">Configuración JSON</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      Ver y copiar el estado actual en formato JSON
                    </div>
                  </div>
                </div>
                {activeAccordion === 'json' ? <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />}
              </button>

              {activeAccordion === 'json' && (
                <div className="p-4 border-t border-[var(--color-border-default)]">
                  <div className="relative">
                    <Textarea
                      readOnly
                      value={JSON.stringify(config, null, 2)}
                      className="font-mono text-xs min-h-[50vh] resize-y bg-[var(--color-surface-elevated)]"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopyConfig}
                      className="absolute top-2 right-2 h-7 text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Design Controls */}
            <DesignControls
              design={config}
              setDesignPartial={handleControlChange}
              componentStyles={componentStyles}
            />
          </div>
        )}



        {/* Audit section - Feature temporarily hidden (see git history for implementation) */}
        {/* QA quick tests section - Feature temporarily hidden (see git history for implementation) */}

        {
          activeSection === 'preview' && (
            <div className="space-y-6">
              {/* Preview de Componentes */}
              <Card className="app-card">
                <CardHeader className="border-b border-[var(--color-border-default)] flex flex-row items-center justify-between">
                  <CardTitle>Preview de Componentes</CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="diag-mode" className="text-xs cursor-pointer">Modo Diagnóstico</Label>
                    <Switch id="diag-mode" checked={showDiagnostic} onCheckedChange={handleToggleDiagnostic} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 text-[var(--color-text-primary)]">
                  <DiagnosticOverlay active={showDiagnostic} />
                  {/* PageHeader */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">PageHeader:</p>
                    <div className={componentStyles.containers.cardBase + " p-4"}>
                      <h1 className={componentStyles.typography.pageTitle}>Título de Página</h1>
                      <p className={componentStyles.typography.pageSubtitle}>Subtítulo descriptivo del contenido</p>
                    </div>
                  </div>

                  {/* Botones */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Botones (todas las variantes):</p>
                    <div className="flex flex-wrap gap-3">
                      <Button className={componentStyles.buttons.primary}>Primary</Button>
                      <Button className={componentStyles.buttons.secondary}>Secondary</Button>
                      <Button className={componentStyles.buttons.outline}>Outline</Button>
                      <Button className={componentStyles.buttons.ghost}>Ghost</Button>
                      <Button className={componentStyles.buttons.danger}>Danger</Button>
                    </div>
                  </div>

                  {/* Cards y Paneles */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Cards y Paneles:</p>
                    <div className={componentStyles.layout.grid2}>
                      <Card className={componentStyles.containers.cardBase}>
                        <CardHeader>
                          <CardTitle className={componentStyles.typography.cardTitle}>Card Base</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className={componentStyles.typography.bodyText}>Contenido de card base con shadow suave</p>
                        </CardContent>
                      </Card>
                      <Card className={componentStyles.containers.cardElevated}>
                        <CardHeader>
                          <CardTitle className={componentStyles.typography.cardTitle}>Card Elevated</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className={componentStyles.typography.bodyText}>Card elevada con shadow más marcada</p>
                        </CardContent>
                      </Card>
                      <Card className={componentStyles.containers.cardMetric}>
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-[var(--color-text-primary)]">198</p>
                          <p className={componentStyles.typography.smallMetaText}>Métrica destacada</p>
                        </CardContent>
                      </Card>
                      <Card className={componentStyles.containers.panelBase}>
                        <CardContent className="pt-4">
                          <p className={componentStyles.typography.bodyText}>Panel base con borde sutil</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Inputs y Controles */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Inputs y Controles:</p>
                    <div className="space-y-3 max-w-md">
                      <Input
                        placeholder="Input por defecto"
                        className={componentStyles.controls.inputDefault}
                      />
                      <Input
                        placeholder="Input pequeño"
                        className={componentStyles.controls.inputSm}
                      />
                      <Input
                        placeholder="Input underline"
                        className={componentStyles.controls.inputUnderline}
                      />
                      <Select>
                        <SelectTrigger className={componentStyles.controls.selectDefault}>
                          <SelectValue placeholder="Select por defecto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Opción 1</SelectItem>
                          <SelectItem value="2">Opción 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Tabs:</p>
                    <Tabs
                      value="tab1"
                      onChange={() => { }}
                      items={[
                        { value: 'tab1', label: 'Tab 1' },
                        { value: 'tab2', label: 'Tab 2' },
                      ]}
                      variant="segmented"
                    />
                  </div>

                  {/* Badges y Estados */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Badges y Estados:</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={componentStyles.status.badgeDefault}>Default</Badge>
                      <Badge className={componentStyles.status.badgeInfo}>Info</Badge>
                      <Badge className={componentStyles.status.badgeSuccess}>Success</Badge>
                      <Badge className={componentStyles.status.badgeWarning}>Warning</Badge>
                      <Badge className={componentStyles.status.badgeDanger}>Danger</Badge>
                    </div>
                  </div>

                  {/* Components Expansion: Table & Modal */}
                  <div className={componentStyles.layout.grid2}>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Tabla (con .ui-table-shell):</p>
                      <div className="ui-table-shell border border-[var(--color-border-default)]">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] font-medium text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 text-left">Usuario</th>
                              <th className="px-4 py-3 text-left">Rol</th>
                              <th className="px-4 py-3 text-right">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border-default)] bg-[var(--color-surface)]">
                            <tr>
                              <td className="px-4 py-3 font-medium">Alice Johnson</td>
                              <td className="px-4 py-3 text-[var(--color-text-secondary)]">Admin</td>
                              <td className="px-4 py-3 text-right"><Badge className={componentStyles.status.badgeSuccess}>Activo</Badge></td>
                            </tr>
                            <tr>
                              <td className="px-4 py-3 font-medium">Bob Smith</td>
                              <td className="px-4 py-3 text-[var(--color-text-secondary)]">Editor</td>
                              <td className="px-4 py-3 text-right"><Badge className={componentStyles.status.badgeWarning}>Pendiente</Badge></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Modal (Simulado):</p>
                      <div className="relative p-6 bg-[var(--color-overlay-backdrop)]/20 rounded-lg flex items-center justify-center min-h-[200px]">
                        <div
                          className="bg-[var(--color-surface-elevated)] p-6 shadow-2xl max-w-sm w-full relative"
                          style={{ borderRadius: 'var(--radius-modal)' }}
                        >
                          <h3 className="text-lg font-semibold mb-2">Confirmar Acción</h3>
                          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                            Este es un ejemplo de modal consumiendo <code className="bg-muted px-1 rounded">--radius-modal</code>.
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button className={componentStyles.buttons.ghost}>Cancelar</Button>
                            <Button className={componentStyles.buttons.primary}>Confirmar</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alerts & Toasts */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Alerts & Notifications:</p>
                    <div className="space-y-2 max-w-2xl">
                      <Alert className="app-panel border-[var(--color-info)]/20 bg-[var(--color-info)]/5">
                        <AlertDescription className="text-[var(--color-info)] text-sm">
                          ℹ️ Alert info usando <code className="bg-muted px-1 rounded">--radius-card</code>
                        </AlertDescription>
                      </Alert>
                      <Alert className="app-panel border-[var(--color-success)]/20 bg-[var(--color-success)]/5">
                        <AlertDescription className="text-[var(--color-success)] text-sm">
                          ✅ Alert success - token-driven radius
                        </AlertDescription>
                      </Alert>
                      <Alert className="app-panel border-[var(--color-warning)]/20 bg-[var(--color-warning)]/5">
                        <AlertDescription className="text-[var(--color-warning)] text-sm">
                          ⚠️ Alert warning - responde a cambios de panel
                        </AlertDescription>
                      </Alert>
                      <Alert className="app-panel border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5">
                        <AlertDescription className="text-[var(--color-danger)] text-sm">
                          ❌ Alert danger - verifica en modo diagnóstico
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>

                  {/* Verificación de Color de Marca */}
                  <div className="p-4 border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)]" style={{ borderRadius: 'var(--card-radius)' }}>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">✅ Verificación de Color de Marca</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      El color primary debe ser siempre <code className="bg-[var(--color-surface-elevated)]/50 px-1" style={{ borderRadius: 'var(--radius-ctrl)' }}>#fd9840</code> en todos los presets.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)] font-mono">
                      {/* Primary color swatch */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border border-[var(--color-border-default)]" style={{ backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-ctrl)' }}></div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-primary)]">#fd9840</span>
                          <span className="text-[10px] opacity-70">--color-primary</span>
                        </div>
                      </div>
                      {/* Secondary color swatch */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border border-[var(--color-border-default)]" style={{ backgroundColor: 'var(--color-secondary)', borderRadius: 'var(--radius-ctrl)' }}></div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-secondary)]">#f08021</span>
                          <span className="text-[10px] opacity-70">--color-secondary</span>
                        </div>
                      </div>
                      {/* Primary soft swatch */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border border-[var(--color-border-default)]" style={{ backgroundColor: 'var(--color-primary-soft)', borderRadius: 'var(--radius-ctrl)' }}></div>
                        <div className="flex flex-col">
                          <span className="font-semibold">Primary Soft</span>
                          <span className="text-[10px] opacity-70">--color-primary-soft</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        }
      </div >
    </div >
  );
}

export default function DesignPage() {
  return (
    <RequireRole anyOf={['ADMIN']}>
      <DesignPageContent />
    </RequireRole>
  );
}

export { DesignPageContent };
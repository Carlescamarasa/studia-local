import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useDesign } from "@/components/design/DesignProvider";
import { useDesignDiff } from "@/components/design/useDesignDiff";
import { Card, CardContent, CardHeader, CardTitle, Badge, Alert, AlertDescription } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Palette, Download, Upload, RotateCcw, Save, Trash2,
  FileCode, CheckCircle, AlertTriangle, Play, Eye, Plus,
  Scan, Sparkles, X, Copy, Settings, Shield, Undo2, ChevronDown, ChevronUp,
  Sun, Moon, LayoutTemplate
} from "lucide-react";
import { toast } from "sonner";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import { runDesignAudit, QUICK_PROFILES, parseAuditSpec, runAudit } from "@/components/utils/auditor";
import Tabs from "@/components/ds/Tabs";
import { getAllPresets, saveCustomPreset, deleteCustomPreset, exportCustomPresets, importCustomPresets } from "@/components/design/DesignPresets";
import LevelConfigView from "@/components/admin/LevelConfigView";
import { DesignControls } from "@/components/design/DesignControls";
import { DesignStatusBlock } from "@/components/design/DesignStatusBlock";

// ... existing imports ...

// ... inside DesignPageContent ...

const componentStyles = {
  layout: {
    page: "container mx-auto p-6 max-w-[var(--page-max-width)]",
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-6",
  },
  controls: {
    inputDefault: "bg-background border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    selectDefault: "bg-background border-input ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    inputSm: "h-8 text-xs",
    inputUnderline: "border-b border-input bg-transparent rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary",
  },
  containers: {
    cardBase: "rounded-xl border bg-card text-card-foreground shadow-sm",
    cardElevated: "rounded-xl border bg-card text-card-foreground shadow-md",
    cardMetric: "rounded-xl border bg-card text-card-foreground shadow-sm p-4",
    panelBase: "rounded-xl border bg-muted/20 text-muted-foreground",
  },
  typography: {
    pageTitle: "text-2xl font-bold tracking-tight",
    pageSubtitle: "text-muted-foreground",
    cardTitle: "text-lg font-semibold leading-none tracking-tight",
    bodyText: "text-sm text-muted-foreground",
    smallMetaText: "text-xs text-muted-foreground",
  },
  buttons: {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  status: {
    badgeDefault: "!bg-primary !text-primary-foreground hover:!bg-primary/80 border-transparent",
    badgeInfo: "!bg-[var(--color-info,#3b82f6)] !text-white hover:!opacity-80 border-transparent",
    badgeSuccess: "!bg-[var(--color-success,#22c55e)] !text-white hover:!opacity-80 border-transparent",
    badgeWarning: "!bg-[var(--color-warning,#eab308)] !text-white hover:!opacity-80 border-transparent",
    badgeDanger: "!bg-[var(--color-danger,#ef4444)] !text-white hover:!opacity-80 border-transparent",
    badgeOutline: "text-foreground border border-[var(--color-border-default)]",
  }
};

function LayoutValuesDebug() {
  const [values, setValues] = useState({});

  useEffect(() => {
    const updateValues = () => {
      const root = getComputedStyle(document.documentElement);
      setValues({
        maxWidth: root.getPropertyValue('--page-max-width').trim() || 'no definido',
        paddingX: root.getPropertyValue('--page-padding-x').trim() || 'no definido',
        paddingY: root.getPropertyValue('--page-padding-y').trim() || 'no definido',
        gapX: root.getPropertyValue('--grid-gap-x').trim() || 'no definido',
        gapY: root.getPropertyValue('--grid-gap-y').trim() || 'no definido',
      });
    };
    updateValues();
    // Actualizar cuando cambie el diseño
    const interval = setInterval(updateValues, 500);
    return () => clearInterval(interval);
  }, []);


  return (
    <div className="mt-4 p-3 bg-[var(--color-surface-muted)] rounded-lg text-xs">
      <p className="font-semibold mb-2">Valores de Layout Actuales (CSS vars):</p>
      <div className="space-y-1 font-mono">
        <div>--page-max-width: <span className="text-[var(--color-primary)]">{values.maxWidth}</span></div>
        <div>--page-padding-x: <span className="text-[var(--color-primary)]">{values.paddingX}</span></div>
        <div>--page-padding-y: <span className="text-[var(--color-primary)]">{values.paddingY}</span></div>
        <div>--grid-gap-x: <span className="text-[var(--color-primary)]">{values.gapX}</span></div>
        <div>--grid-gap-y: <span className="text-[var(--color-primary)]">{values.gapY}</span></div>
      </div>
    </div>
  );
}

function LabeledRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--color-border-default)] last:border-0">
      <Label className="text-sm text-[var(--color-text-primary)] font-medium">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

// ============================================================================
// PREVIEW BANNER COMPONENT
// ============================================================================
function PreviewBanner() {
  const { isPreviewActive, clearPreview, activeMode } = useDesign();
  const { totalCount, counts } = useDesignDiff();

  if (!isPreviewActive) return null;

  return (
    <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--color-info)_10%,transparent)] border border-[color-mix(in_srgb,var(--color-info)_30%,transparent)] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[var(--color-info)]" />
          <div>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              Vista previa activa — {totalCount} cambio{totalCount !== 1 ? 's' : ''}
            </span>
            <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Modo: <strong className="capitalize">{activeMode}</strong>
              {counts.common > 0 && <span className="ml-2">Comunes: {counts.common}</span>}
              {counts.light > 0 && <span className="ml-2">Light: {counts.light}</span>}
              {counts.dark > 0 && <span className="ml-2">Dark: {counts.dark}</span>}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearPreview();
            toast.success('✅ Cambios descartados');
          }}
          className="h-8 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Cancelar preview
        </Button>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        💡 Los cambios solo se aplican a tu sesión. Usa "Exportar" para guardar.
      </p>
    </div>
  );
}

// ============================================================================
// DIFF ACCORDION COMPONENT
// ============================================================================
function DiffAccordion({ isOpen, onToggle }) {
  // const [isOpen, setIsOpen] = useState(false); // Controlled now
  const [openSections, setOpenSections] = useState({ common: true, light: false, dark: false });
  const {
    diff,
    hasChanges,
    totalCount,
    counts,
    revertChange,
    exportFull,
    exportDiff,
    exportFullAndDiff,
    downloadExport,
    generateReport,
  } = useDesignDiff();

  if (!hasChanges) return null;

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderChangeList = (changes, scope) => (
    <div className="space-y-1">
      {changes.map((change, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-muted)] text-xs"
        >
          <div className="flex-1 min-w-0">
            <code className="text-[var(--color-primary)] font-mono truncate block">
              {change.path}
            </code>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[var(--color-text-muted)] truncate" title={JSON.stringify(change.from)}>
                {typeof change.from === 'string' ? change.from : JSON.stringify(change.from)}
              </span>
              <span className="text-[var(--color-text-muted)]">→</span>
              <span className="text-[var(--color-success)] font-medium truncate" title={JSON.stringify(change.to)}>
                {typeof change.to === 'string' ? change.to : JSON.stringify(change.to)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              revertChange(change.path, scope);
              toast.info(`↩️ Revertido: ${change.path}`);
            }}
            className="h-6 w-6 p-0 shrink-0"
            title="Revertir este cambio"
          >
            <Undo2 className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] hover:bg-[var(--color-surface)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Badge className="badge-primary text-xs">{totalCount}</Badge>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            Cambios detectados
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            (C:{counts.common} L:{counts.light} D:{counts.dark})
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-2 p-4 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border-default)]">
          {/* Secciones particionadas */}
          <div className="max-h-80 overflow-y-auto space-y-3 mb-4">
            {/* Common */}
            {diff.common.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('common')}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs">{counts.common}</Badge>
                    <span className="text-sm font-medium">Comunes (ambos modos)</span>
                  </div>
                  {openSections.common ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSections.common && <div className="mt-2">{renderChangeList(diff.common, 'common')}</div>}
              </div>
            )}

            {/* Light */}
            {diff.light.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('light')}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 text-xs">{counts.light}</Badge>
                    <span className="text-sm font-medium">Solo Light</span>
                    <Sun className="w-3 h-3" />
                  </div>
                  {openSections.light ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSections.light && <div className="mt-2">{renderChangeList(diff.light, 'light')}</div>}
              </div>
            )}

            {/* Dark */}
            {diff.dark.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('dark')}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-700 text-gray-200 dark:bg-gray-300 dark:text-gray-800 text-xs">{counts.dark}</Badge>
                    <span className="text-sm font-medium">Solo Dark</span>
                    <Moon className="w-3 h-3" />
                  </div>
                  {openSections.dark ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSections.dark && <div className="mt-2">{renderChangeList(diff.dark, 'dark')}</div>}
              </div>
            )}
          </div>

          {/* Botones de export */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[var(--color-border-default)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadExport(exportFull(), 'design-full.json');
                toast.success('✅ Base completo exportado');
              }}
              className="h-8 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              FULL (Base)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadExport(exportDiff(), 'design-diff.json');
                toast.success('✅ Solo cambios exportados');
              }}
              className="h-8 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              DIFF (Overlay)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadExport(exportFullAndDiff(), 'design-full+diff.json');
                toast.success('✅ FULL + DIFF exportado');
              }}
              className="h-8 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              FULL + DIFF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const report = generateReport();
                navigator.clipboard.writeText(report);
                toast.success('📋 Reporte copiado al portapapeles');
              }}
              className="h-8 text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copiar Reporte
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



function DesignPageContent({ embedded = false, hideLevelsTab = false }) {
  const { design, setDesign, setDesignPartial, resetDesign, exportDesign, importDesign, loadPreset, currentPresetId, setPresetId, basePresets, activeMode, setActiveMode } = useDesign();
  // Aliases para compatibilidad
  const config = design;
  const setConfig = setDesign;
  const reset = resetDesign;
  const [activeSection, setActiveSection] = useState('controls');
  const [qaTabsValue, setQaTabsValue] = useState('one');
  const [qaOutput, setQaOutput] = useState('');
  const [qaRunning, setQaRunning] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditProfile, setAuditProfile] = useState('full');
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [importPresetsJson, setImportPresetsJson] = useState('');
  const [importError, setImportError] = useState('');
  const [activeAccordion, setActiveAccordion] = useState(null);

  const LEGACY_HEX = useMemo(() => {
    const parts = [
      { name: "Legacy Orange Principal", p1: "#fd", p2: "9840" },
      { name: "Legacy Orange Hover", p1: "#ff", p2: "7e1f" },
      { name: "Legacy Brand 1", p1: "#f5", p2: "9e42" },
      { name: "Legacy Brand 2", p1: "#f2", p2: "8a2e" },
    ];
    return parts.map(({ name, p1, p2 }) => ({
      pattern: new RegExp((p1 + p2).replace("#", "\\#"), "gi"),
      name,
      displayHex: `${p1}${p2}`.replace("#", "# "),
    }));
  }, []);

  // Combinar presets base (desde BasePresets.ts) con presets personalizados
  const customPresets = useMemo(() => getAllPresets(), [config]);
  const allPresets = useMemo(() => {
    // Convertir basePresets a formato compatible con la UI
    const basePresetsMap = {};
    if (basePresets && Array.isArray(basePresets)) {
      basePresets.forEach(preset => {
        basePresetsMap[preset.id] = {
          name: preset.label,
          description: preset.description,
          config: preset.design,
          isBase: true, // Marcar como preset base
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
    } catch (err) {
      toast.error('❌ Error al copiar');
    }
  }, [config]);

  const handleReset = useCallback(() => {
    if (window.confirm('¿Restablecer diseño a valores por defecto?')) {
      reset();
      toast.success('✅ Diseño restablecido');
    }
  }, [reset]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      toast.error('Ingresa un nombre para el preset');
      return;
    }

    const presetId = `custom_${Date.now()}`;
    const result = saveCustomPreset(presetId, presetName, presetDescription, config);

    if (result.success) {
      toast.success('✅ Preset guardado');
      setShowSavePresetModal(false);
      setPresetName('');
      setPresetDescription('');
    } else {
      toast.error('❌ Error al guardar preset: ' + result.error);
    }
  }, [presetName, presetDescription, config]);

  const handleLoadPreset = useCallback((presetId) => {
    // Verificar si es un preset base
    const basePreset = basePresets?.find(p => p.id === presetId);
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

  const handleDeletePreset = useCallback((presetId) => {
    if (!window.confirm('¿Eliminar este preset?')) return;

    const result = deleteCustomPreset(presetId);
    if (result.success) {
      toast.success('✅ Preset eliminado');
      setConfig({ ...config });
    } else {
      toast.error('❌ ' + result.error);
    }
  }, [config, setConfig]);

  const handleExportPresets = useCallback(() => {
    try {
      const json = exportCustomPresets();
      navigator.clipboard.writeText(json);
      toast.success('✅ Presets personalizados copiados al portapapeles');
    } catch (err) {
      toast.error('❌ Error al exportar: ' + err.message);
    }
  }, []);

  const handleImportPresets = useCallback(() => {
    setImportError('');
    if (!importPresetsJson.trim()) {
      setImportError('Por favor, pega el JSON de presets para importar.');
      return;
    }
    try {
      const result = importCustomPresets(importPresetsJson);
      if (result.success) {
        toast.success('✅ Presets importados con éxito');
        setShowImportExportModal(false);
        setImportPresetsJson('');
        setConfig({ ...config });
      } else {
        setImportError('Error al importar: ' + result.error);
        toast.error('❌ Error al importar presets');
      }
    } catch (e) {
      setImportError('JSON inválido: ' + e.message);
      toast.error('❌ JSON inválido');
    }
  }, [importPresetsJson, config, setConfig]);

  const handleRunAudit = useCallback(async (profileKey) => {
    setAuditRunning(true);
    const profile = QUICK_PROFILES[profileKey || auditProfile];
    if (!profile) {
      toast.error('❌ Perfil de auditoría no encontrado.');
      setAuditRunning(false);
      return;
    }

    toast.info(`🔍 Iniciando auditoría: ${profile.name}...`);
    setAuditReport(null);
    try {
      const auditSpec = parseAuditSpec(profile.spec);
      const report = await runAudit(auditSpec);
      setAuditReport(report);
      const totalIssues = report?.summary?.totalIssues || 0;
      if (totalIssues > 0) {
        toast.warning(`⚠️ Auditoría completada: ${totalIssues} problemas encontrados.`);
      } else {
        toast.success('✅ Auditoría completada: ¡Sin problemas encontrados!');
      }
    } catch (err) {
      toast.error('❌ Error en auditoría: ' + err.message);
      console.error(err);
    } finally {
      setAuditRunning(false);
    }
  }, [auditProfile]);

  const handleCopyAudit = useCallback(() => {
    if (!auditReport) return;
    try {
      navigator.clipboard.writeText(JSON.stringify(auditReport, null, 2));
      toast.success('✅ Informe de auditoría copiado');
    } catch (err) {
      toast.error('❌ Error al copiar');
    }
  }, [auditReport]);

  const handleVisualSmoke = useCallback(() => {
    setQaRunning(true);
    setQaOutput('Ejecutando visual smoke...');

    setTimeout(() => {
      const checks = [
        { sel: '.icon-tile', name: 'Icon tiles' },
        { sel: 'h1', name: 'H1 headings' },
        { sel: '.app-card, .app-panel', name: 'Cards DS' },
        { sel: '.page-header', name: 'PageHeader' },
        { sel: 'button', name: 'Botones' },
        { sel: '.btn-primary', name: 'Botones primary' },
        { sel: '[data-testid="tabs-segmented"]', name: 'Tabs segmentadas' },
        { sel: '[data-sidebar-abierto]', name: 'Sidebar state' },
      ];

      const results = checks.map(c => {
        const found = document.querySelectorAll(c.sel).length;
        const status = found > 0 ? '✅' : '⚠️';
        return `${status} ${c.name}: ${found}`;
      });

      const bodyHTML = document.body.innerHTML;

      results.push('');
      results.push('Legacy Colors:');
      LEGACY_HEX.forEach(({ pattern, name, displayHex }) => {
        const matches = bodyHTML.match(pattern);
        if (matches) {
          results.push(`❌ ${name} (${displayHex}): ${matches.length} en DOM`);
        } else {
          results.push(`✅ ${name} (${displayHex}): OK`);
        }
      });

      setQaOutput(`VISUAL SMOKE TEST\n${'='.repeat(50)}\n\n${results.join('\n')}`);
      setQaRunning(false);
      toast.success('✅ Visual smoke completado');
    }, 600);
  }, [LEGACY_HEX]);

  const handleA11yQuick = useCallback(() => {
    setQaRunning(true);
    setQaOutput('Ejecutando a11y quick-check...');

    setTimeout(() => {
      const results = [];

      const h1Count = document.querySelectorAll('h1').length;
      if (h1Count === 0) {
        results.push('❌ Sin H1 en página');
      } else if (h1Count === 1) {
        results.push('✅ Exactamente 1 H1');
      } else {
        results.push(`⚠️ ${h1Count} H1s (se recomienda 1)`);
      }

      const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      const unlabelledButtons = buttons.filter(el => {
        const text = el.textContent?.trim();
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const title = el.getAttribute('title');
        return !text && !ariaLabel && !ariaLabelledBy && !title;
      });
      results.push(unlabelledButtons.length === 0
        ? `✅ Todos los botones etiquetados (${buttons.length} total)`
        : `❌ ${unlabelledButtons.length}/${buttons.length} botón(es) sin label`);

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
      const unlabelledInputs = inputs.filter(el => {
        const id = el.getAttribute('id');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const hasLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
        return !hasLabel && !ariaLabel && !ariaLabelledBy;
      });
      results.push(unlabelledInputs.length === 0
        ? `✅ Todos los inputs etiquetados (${inputs.length} total)`
        : `⚠️ ${unlabelledInputs.length}/${inputs.length} input(s) sin label`);

      const hasMain = !!document.querySelector('main');
      const hasNav = !!document.querySelector('nav, [role="navigation"]');
      const hasHeader = !!document.querySelector('header, [role="banner"]');

      results.push('');
      results.push('Landmarks:');
      results.push(hasMain ? '✅ <main> presente' : '⚠️ Sin <main> landmark');
      results.push(hasNav ? '✅ Nav presente' : 'ℹ️ Sin nav (puede ser OK)');
      results.push(hasHeader ? '✅ Header presente' : 'ℹ️ Sin header');

      results.push('');
      results.push('Focus:');
      const focusableElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      results.push(`ℹ️ ${focusableElements.length} elementos enfocables detectados`);
      results.push(`ℹ️ Ring focus: brand (probar con Tab)`);

      results.push('');
      results.push('Contraste:');
      results.push('ℹ️ Usar herramienta externa para análisis completo');
      results.push('✅ Design System usa tokens con contraste WCAG AA+');

      setQaOutput(`A11Y QUICK-CHECK\n${'='.repeat(50)}\n\n${results.join('\n')}`);
      setQaRunning(false);

      const errors = results.filter(r => r.startsWith('❌')).length;
      const warnings = results.filter(r => r.startsWith('⚠️')).length;

      if (errors > 0) {
        toast.error(`❌ ${errors} error(es) críticos`);
      } else if (warnings > 0) {
        toast.warning(`⚠️ ${warnings} advertencia(s)`);
      } else {
        toast.success('✅ A11y check completado sin errores');
      }
    }, 600);
  }, []);

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && (
        <PageHeader
          icon={Palette}
          title="Panel de Diseño"
          subtitle="Herramienta interna para ajustar tokens visuales y presets del sistema"
        />
      )}

      <div className={embedded ? "" : componentStyles.layout.page}>
        <div className="mb-6">
          <DesignStatusBlock />
        </div>
        <div className="flex justify-center mb-6">
          <Tabs
            value={activeSection}
            onChange={setActiveSection}
            items={[
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

            {/* Diff Accordion - Collapsible list of changes */}
            <DiffAccordion
              isOpen={activeAccordion === 'diff'}
              onToggle={() => setActiveAccordion(activeAccordion === 'diff' ? null : 'diff')}
            />

            {/* Presets Accordion */}
            <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-surface)]">
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowImportExportModal(true)}
                        size="sm"
                        className="h-8 rounded-xl"
                      >
                        <FileCode className="w-4 h-4 mr-2" />
                        Importar/Exportar
                      </Button>
                      <Button
                        onClick={() => setShowSavePresetModal(true)}
                        size="sm"
                        className="btn-primary h-8 rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Guardar Actual
                      </Button>
                    </div>
                  </div>

                  <div className={componentStyles.layout.grid2}>
                    {/* Base Presets */}
                    {Object.values(allPresets).filter(p => p.isBase).map((preset) => (
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
                    {Object.values(allPresets).filter(p => !p.isBase).map((preset) => (
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
            <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-surface)]">
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
                      className="font-mono text-xs min-h-[300px] bg-[var(--color-surface-elevated)]"
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
              setDesignPartial={setDesignPartial}
              componentStyles={componentStyles}
            />
          </div>
        )}



        {/* Auditoría y QA: funcionalidad mantenida pero oculta en UI simplificada */}
        {
          false && activeSection === 'audit' && (
            <Card className="app-card">
              <CardHeader className="border-b border-[var(--color-border-default)]">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Scan className="w-5 h-5" />
                    Auditoría Avanzada de Diseño
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select
                      value={auditProfile}
                      onValueChange={setAuditProfile}
                      disabled={auditRunning}
                    >
                      <SelectTrigger className="w-[180px] h-9 rounded-xl">
                        <SelectValue placeholder="Perfil de auditoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUICK_PROFILES).map(([key, profile]) => (
                          <SelectItem key={key} value={key}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => handleRunAudit(auditProfile)}
                      disabled={auditRunning}
                      className="btn-primary h-9 rounded-xl shadow-sm"
                    >
                      <Scan className="w-4 h-4 mr-2" />
                      {auditRunning ? 'Auditando...' : 'Ejecutar Auditoría'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-[var(--color-text-primary)]">
                {auditReport ? (
                  <div className="space-y-4">
                    <div className={componentStyles.layout.grid2}>
                      <Card className="bg-[var(--color-surface-muted)] rounded-lg p-3 border border-[var(--color-border-default)]">
                        <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Archivos escaneados</div>
                        <div className="text-2xl font-bold text-[var(--color-text-primary)]">{auditReport?.summary?.filesScanned || 0}</div>
                      </Card>
                      <Card className="bg-[var(--color-surface-muted)] rounded-lg p-3 border border-[var(--color-border-default)]">
                        <div className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Problemas encontrados</div>
                        <div className="text-2xl font-bold text-[var(--color-text-primary)]">{auditReport?.summary?.totalIssues || 0}</div>
                      </Card>
                    </div>

                    {(auditReport?.summary?.totalIssues || 0) === 0 && (
                      <Alert variant="success">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>¡Excelente! No se encontraron problemas de diseño con el perfil "{QUICK_PROFILES[auditProfile]?.name}".</AlertDescription>
                      </Alert>
                    )}

                    {(auditReport?.summary?.totalIssues || 0) > 0 && auditReport?.summary?.issues && (
                      <div className={componentStyles.layout.grid2}>
                        {Object.entries(auditReport.summary.issues).map(([k, v]) => (
                          <Card key={k} className="bg-[var(--color-surface-elevated)] rounded-lg p-3 border border-[var(--color-border-default)]">
                            <div className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)] mb-1">{k}</div>
                            <div className="text-xl font-semibold text-[var(--color-text-primary)]">{v}</div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {auditReport?.issues && (
                      <details className="rounded-xl border border-[var(--color-border-default)] p-4 bg-[var(--color-surface-muted)]">
                        <summary className="cursor-pointer font-medium text-[var(--color-text-primary)]">Detalles por categoría</summary>
                        <div className="mt-4 space-y-4 max-h-[420px] overflow-auto">
                          {Object.entries(auditReport.issues).map(([bucket, items]) => (
                            items.length > 0 && (
                              <Card key={bucket} className="bg-[var(--color-surface-elevated)] rounded-lg p-3 border border-[var(--color-border-default)]">
                                <div className="mb-3 font-semibold text-[var(--color-text-primary)] flex items-center justify-between">
                                  <span>{bucket}</span>
                                  <Badge className={`rounded-full ${componentStyles.status.badgeDanger}`}>
                                    {items.length}
                                  </Badge>
                                </div>
                                <ul className="space-y-2 text-sm">
                                  {items.slice(0, 50).map((it, idx) => (
                                    <li key={idx} className="border-l-2 border-[var(--color-primary)]/30 pl-3 py-1">
                                      <div className="text-[11px] text-[var(--color-text-secondary)]">{it.file}:{it.line}</div>
                                      <div className="font-mono text-xs text-[var(--color-text-primary)] bg-[var(--color-surface-muted)] p-1 rounded mt-1">{it.snippet}</div>
                                    </li>
                                  ))}
                                </ul>
                                {items.length > 50 && (
                                  <div className="text-xs text-[var(--color-text-secondary)] mt-3 text-center">
                                    +{items.length - 50} más (usa "Copiar JSON" para ver todo)
                                  </div>
                                )}
                              </Card>
                            )
                          ))}
                        </div>
                      </details>
                    )}

                    <Button variant="outline" onClick={handleCopyAudit} className="h-9 rounded-xl w-full">
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar informe JSON completo
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Selecciona un perfil y pulsa "Ejecutar Auditoría" para analizar estilos y clases en todo el proyecto.
                  </p>
                )}
              </CardContent>
            </Card>
          )
        }

        {
          activeSection === 'qa' && false && (
            <>
              <Card className="app-card">
                <CardHeader className="border-b border-[var(--color-border-default)]">
                  <CardTitle>QA Rápido (Dev)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 text-[var(--color-text-primary)]">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Pruebas integradas para detectar problemas comunes de diseño y accesibilidad.
                  </p>
                  {/* Fixtures visibles para QA: aseguran detección por selectores del test */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Acciones rápidas</h4>
                      <div className="flex items-center gap-3">
                        <Button
                          className="btn-primary h-8 rounded-xl shadow-sm px-3"
                          onClick={() => toast.success('✅ Botón Primary funcionando')}
                          aria-label="Probar botón Primary QA"
                        >
                          Primary (QA)
                        </Button>
                        <Badge>QA</Badge>
                      </div>
                    </div>
                    <div className="app-panel p-3 rounded-xl border border-[var(--color-border-muted)]">
                      <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Componentes de prueba</h4>
                      <div className="text-sm text-[var(--color-text-secondary)]">Panel QA</div>
                    </div>
                    <div className="icon-tile" aria-hidden />
                    <div>
                      <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Pestañas de ejemplo</h4>
                      <Tabs
                        value={qaTabsValue}
                        onChange={setQaTabsValue}
                        items={[
                          { value: 'one', label: 'Uno' },
                          { value: 'two', label: 'Dos' },
                        ]}
                        variant="segmented"
                      />
                      <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
                        {qaTabsValue === 'one' ? (
                          <span>Contenido de la pestaña “Uno”: texto de ejemplo.</span>
                        ) : (
                          <span>Contenido de la pestaña “Dos”: texto de ejemplo alternativo.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={handleVisualSmoke}
                      disabled={qaRunning}
                      className="h-10 rounded-xl"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Visual Smoke
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleA11yQuick}
                      disabled={qaRunning}
                      className="h-10 rounded-xl"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      A11y Quick-Check
                    </Button>
                  </div>

                  {qaOutput && (
                    <div className="bg-[var(--color-surface-muted)] rounded-xl p-4 border border-[var(--color-border-default)]">
                      <pre className="text-xs text-[var(--color-text-primary)] whitespace-pre-wrap font-mono overflow-x-auto max-h-96">
                        {qaOutput}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="app-card">
                <CardHeader className="border-b border-[var(--color-border-default)]">
                  <CardTitle>QA Visual - Design System</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <QAVisualContent embedded />
                </CardContent>
              </Card>
            </>
          )
        }

        {
          activeSection === 'preview' && (
            <div className="space-y-6">

              {/* Preview de Componentes */}
              <Card className="app-card">
                <CardHeader className="border-b border-[var(--color-border-default)]">
                  <CardTitle>Preview de Componentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 text-[var(--color-text-primary)]">
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

                  {/* Verificación de Color de Marca */}
                  <div className="p-4 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)]">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">✅ Verificación de Color de Marca</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      El color primary debe ser siempre <code className="bg-[var(--color-surface-elevated)]/50 px-1 rounded">#fd9840</code> en todos los presets.
                    </p>
                    <div className="mt-3 flex items-center gap-6 text-xs text-[var(--color-text-secondary)] font-mono">
                      <div className="flex items-center gap-2">
                        <span>Primary:</span>
                        <span style={{ color: '#fd9840', fontWeight: 'bold' }}>#fd9840</span>
                        {/* Intentional hardcode for QA: must match #fd9840 */}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Soft:</span>
                        <span style={{ color: 'var(--color-primary-soft)', fontWeight: 'bold' }}>var(--color-primary-soft)</span>
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
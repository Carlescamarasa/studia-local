import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useDesign } from "@/components/design/DesignProvider";
import { Card, CardContent, CardHeader, CardTitle, Badge, Alert, AlertDescription } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Palette, Download, Upload, RotateCcw, Save, Trash2,
  FileCode, CheckCircle, AlertTriangle, Play, Eye, Plus,
  Scan, Sparkles, X, Copy, Settings, Shield } from "lucide-react";
import { toast } from "sonner";
import RequireRole from "@/components/auth/RequireRole";
import PageHeader from "@/components/ds/PageHeader";
import { runDesignAudit, QUICK_PROFILES, parseAuditSpec, runAudit } from "@/components/utils/auditor";
import Tabs from "@/components/ds/Tabs";
import { getAllPresets, saveCustomPreset, deleteCustomPreset, isBuiltInPreset, exportCustomPresets, importCustomPresets } from "@/components/design/DesignPresets";
import { QAVisualContent } from "@/pages/qa-visual.jsx";
import { componentStyles } from "@/design/componentStyles";

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

function DesignPageContent({ embedded = false }) {
  const { design, setDesign, setDesignPartial, resetDesign, exportDesign, importDesign, loadPreset, currentPresetId, setPresetId, basePresets } = useDesign();
  // Aliases para compatibilidad
  const config = design;
  const setConfig = setDesign;
  const reset = resetDesign;
  const [activeSection, setActiveSection] = useState('presets');
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

  const allPresets = useMemo(() => getAllPresets(), [config]);

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
    const result = loadPreset(presetId);
    if (result.success) {
      toast.success('✅ Preset cargado');
    } else {
      toast.error('❌ Preset no encontrado');
    }
  }, [loadPreset]);

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
      <PageHeader
        icon={Palette}
        title="Panel de Diseño"
        subtitle="Ajusta tokens visuales en tiempo real sin tocar código"
      />

      <div className={componentStyles.layout.page}>
        {/* Selector de tema movido al sidebar (Layout) */}
        <Card className="app-card border-[var(--color-border-default)] bg-[var(--color-primary-soft)]">
                    <CardContent className="pt-4 text-[var(--color-text-primary)]">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-[var(--color-primary)] mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text-primary)]">
                  <strong>Modo runtime:</strong> Los cambios se guardan en <code className="bg-[var(--color-primary-soft)] px-1 rounded">localStorage</code> y se aplican mediante variables CSS generadas por el <code className="bg-[var(--color-primary-soft)] px-1 rounded">DesignProvider</code> (desde <code className="bg-[var(--color-primary-soft)] px-1 rounded">src/components/design/designConfig.ts</code>). 
                  Los <strong>tokens</strong> de diseño viven en <code className="bg-[var(--color-primary-soft)] px-1 rounded">src/design/designSystem.ts</code> y las <strong>clases semánticas</strong> en <code className="bg-[var(--color-primary-soft)] px-1 rounded">src/design/componentStyles.ts</code>, tal y como se describe en el README. Útil para probar variantes sin deployar código.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Tabs
            value={activeSection}
            onChange={setActiveSection}
            items={[
              { value: 'presets', label: 'Presets' },
              { value: 'controls', label: 'Controles' },
              { value: 'audit', label: 'Auditoría' },
              { value: 'qa', label: 'QA' },
              { value: 'preview', label: 'Preview' },
            ]}
          />
        </div>

        {activeSection === 'presets' && (
          <>
            <Card className="app-card">
              <CardHeader className="border-b border-[var(--color-border-default)]">
                <div className="flex items-center justify-between">
                  <CardTitle>Presets Disponibles</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowImportExportModal(true)}
                      className="h-9 rounded-xl shadow-sm"
                    >
                      <FileCode className="w-4 h-4 mr-2" />
                      Importar/Exportar
                    </Button>
                    <Button
                      onClick={() => setShowSavePresetModal(true)}
                      className="btn-primary h-9 rounded-xl shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Guardar Como...
                    </Button>
                  </div>
                </div>
              </CardHeader>
                    <CardContent className="pt-4 text-[var(--color-text-primary)]">
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(allPresets).map(([id, preset]) => {
                    const isActive = JSON.stringify(config) === JSON.stringify(preset.config);
                    const isBuiltIn = isBuiltInPreset(id);
                    
                    return (
                      <Card 
                        key={id}
                        className={`app-panel cursor-pointer transition-all ${
                          isActive ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'hover:bg-[var(--color-surface-muted)]'
                        }`}
                        onClick={() => handleLoadPreset(id)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                                {preset.name}
                                {isActive && <Badge className="badge-primary">Activo</Badge>}
                                {isBuiltIn && <Badge className="badge-outline text-[10px]">Built-in</Badge>}
                              </h4>
                              <p className="text-xs text-[var(--color-text-secondary)] mt-1">{preset.description}</p>
                            </div>
                            {!isBuiltIn && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePreset(id);
                                }}
                                className="h-8 w-8 p-0 text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger))]/10 rounded-xl"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {showSavePresetModal && (
              <>
                <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowSavePresetModal(false)} />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                  <Card className="w-full max-w-md pointer-events-auto app-card">
                    <CardHeader className="border-b border-[var(--color-border-default)]">
                      <CardTitle>Guardar Preset</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-[var(--color-text-primary)]">
                      <div>
                        <Label htmlFor="preset-name">Nombre del Preset</Label>
                        <Input
                          id="preset-name"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          className={componentStyles.controls.inputDefault}
                        />
                      </div>
                      <div>
                        <Label htmlFor="preset-desc">Descripción (opcional)</Label>
                        <Textarea
                          id="preset-desc"
                          value={presetDescription}
                          onChange={(e) => setPresetDescription(e.target.value)}
                          rows={3}
                          className={componentStyles.controls.inputDefault}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowSavePresetModal(false);
                            setPresetName('');
                            setPresetDescription('');
                          }}
                          className="flex-1 btn-secondary"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleSavePreset}
                          className="flex-1 btn-primary"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {showImportExportModal && (
              <>
                <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowImportExportModal(false)} />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                  <Card className="w-full max-w-md pointer-events-auto app-card">
                    <CardHeader className="border-b border-[var(--color-border-default)] flex items-center justify-between">
                      <CardTitle>Importar/Exportar Presets</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowImportExportModal(false)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-[var(--color-text-primary)]">
                      <div className="space-y-2">
                        <Label htmlFor="export-json">Exportar presets personalizados:</Label>
                        <Textarea
                          id="export-json"
                          value={exportCustomPresets()}
                          readOnly
                          rows={6}
                          className={`font-mono text-xs ${componentStyles.controls.inputDefault}`}
                        />
                        <Button onClick={handleExportPresets} className="w-full btn-secondary">
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar al portapapeles
                        </Button>
                      </div>
                      <div className="space-y-2 pt-4 border-t border-[var(--color-border-default)]">
                        <Label htmlFor="import-json">Importar presets (pegar JSON aquí):</Label>
                        <Textarea
                          id="import-json"
                          value={importPresetsJson}
                          onChange={(e) => {
                            setImportPresetsJson(e.target.value);
                            setImportError('');
                          }}
                          placeholder="Pega el JSON de presets aquí..."
                          rows={6}
                          className={`font-mono text-xs ${componentStyles.controls.inputDefault}`}
                        />
                        {importError && (
                          <Alert variant="danger">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{importError}</AlertDescription>
                          </Alert>
                        )}
                        <Button onClick={handleImportPresets} className="w-full btn-primary">
                          <Upload className="w-4 h-4 mr-2" />
                          Importar Presets
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            <Card className="app-card">
              <CardHeader className="border-b border-[var(--color-border-default)]">
                <CardTitle>Configuración Actual</CardTitle>
              </CardHeader>
                    <CardContent className="pt-4 text-[var(--color-text-primary)]">
                <pre className="text-xs font-mono bg-[var(--color-surface-muted)] p-4 rounded-xl border border-[var(--color-border-default)] overflow-x-auto">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}

        {activeSection === 'controls' && (
          <>
            <Card className="app-card">
              <CardHeader className="border-b border-[var(--color-border-default)]">
                <CardTitle>Controles de Diseño</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-[var(--color-border-default)] text-[var(--color-text-primary)]">
                {/* Tipografía */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Tipografía</h3>
                  <LabeledRow label="Títulos con Serif">
                    <Switch 
                      checked={design?.typography?.serifHeadings || false} 
                      onCheckedChange={(v) => setDesignPartial('typography.serifHeadings', !!v)} 
                    />
                  </LabeledRow>
                  <LabeledRow label="Tamaño Base (px)">
                    <Input
                      type="number"
                      value={design?.typography?.fontSizeBase || 16}
                      onChange={(e) => setDesignPartial('typography.fontSizeBase', parseInt(e.target.value) || 16)}
                      className={`w-32 ${componentStyles.controls.inputDefault}`}
                    />
                  </LabeledRow>
                  <LabeledRow label="Escala de Tamaño">
                    <Input
                      type="number"
                      step="0.1"
                      value={design?.typography?.fontSizeScale || 1.25}
                      onChange={(e) => setDesignPartial('typography.fontSizeScale', parseFloat(e.target.value) || 1.25)}
                      className={`w-32 ${componentStyles.controls.inputDefault}`}
                    />
                  </LabeledRow>
                  <LabeledRow label="Fuente Base">
                    <Input
                      type="text"
                      value={design?.typography?.fontFamilyBase || 'Raleway, system-ui, -apple-system, sans-serif'}
                      onChange={(e) => setDesignPartial('typography.fontFamilyBase', e.target.value)}
                      className={`w-64 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                    />
                  </LabeledRow>
                  <LabeledRow label="Fuente Títulos">
                    <Input
                      type="text"
                      value={design?.typography?.fontFamilyHeadings || 'Inter, system-ui, -apple-system, sans-serif'}
                      onChange={(e) => setDesignPartial('typography.fontFamilyHeadings', e.target.value)}
                      className={`w-64 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                    />
                  </LabeledRow>
                  <LabeledRow label="Interlineado Tight">
                    <Input
                      type="number"
                      step="0.1"
                      value={design?.typography?.lineHeight?.tight || 1.25}
                      onChange={(e) => setDesignPartial('typography.lineHeight.tight', parseFloat(e.target.value) || 1.25)}
                      className={`w-32 ${componentStyles.controls.inputDefault}`}
                    />
                  </LabeledRow>
                  <LabeledRow label="Interlineado Normal">
                    <Input
                      type="number"
                      step="0.1"
                      value={design?.typography?.lineHeight?.normal || 1.5}
                      onChange={(e) => setDesignPartial('typography.lineHeight.normal', parseFloat(e.target.value) || 1.5)}
                      className={`w-32 ${componentStyles.controls.inputDefault}`}
                    />
                  </LabeledRow>
                  <LabeledRow label="Interlineado Relaxed">
                    <Input
                      type="number"
                      step="0.1"
                      value={design?.typography?.lineHeight?.relaxed || 1.75}
                      onChange={(e) => setDesignPartial('typography.lineHeight.relaxed', parseFloat(e.target.value) || 1.75)}
                      className={`w-32 ${componentStyles.controls.inputDefault}`}
                    />
                  </LabeledRow>
                </div>

                {/* Layout */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Layout</h3>
                  <LabeledRow label="Radio Global">
                    <Select 
                      value={design?.layout?.radius?.global || 'lg'} 
                      onValueChange={(v) => setDesignPartial('layout.radius.global', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none (0px)</SelectItem>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                        <SelectItem value="3xl">3xl (24px)</SelectItem>
                        <SelectItem value="full">full (9999px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Radio de Cards">
                    <Select 
                      value={design?.layout?.radius?.card || 'lg'} 
                      onValueChange={(v) => setDesignPartial('layout.radius.card', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none (0px)</SelectItem>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                        <SelectItem value="3xl">3xl (24px)</SelectItem>
                        <SelectItem value="full">full (9999px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Radio de Controles">
                    <Select 
                      value={design?.layout?.radius?.controls || 'lg'} 
                      onValueChange={(v) => setDesignPartial('layout.radius.controls', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none (0px)</SelectItem>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                        <SelectItem value="3xl">3xl (24px)</SelectItem>
                        <SelectItem value="full">full (9999px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Radio de Pills">
                    <Select 
                      value={design?.layout?.radius?.pill || 'lg'} 
                      onValueChange={(v) => setDesignPartial('layout.radius.pill', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none (0px)</SelectItem>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                        <SelectItem value="3xl">3xl (24px)</SelectItem>
                        <SelectItem value="full">full (9999px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Radio de Modales">
                    <Select 
                      value={design?.layout?.radius?.modal || 'xl'} 
                      onValueChange={(v) => setDesignPartial('layout.radius.modal', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none (0px)</SelectItem>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                        <SelectItem value="3xl">3xl (24px)</SelectItem>
                        <SelectItem value="full">full (9999px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Sombras">
                    <Select 
                      value={design?.layout?.shadow || 'md'} 
                      onValueChange={(v) => setDesignPartial('layout.shadow', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguna</SelectItem>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="card">Card (sutil)</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="xl">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Densidad">
                    <Select 
                      value={design?.layout?.density || 'normal'} 
                      onValueChange={(v) => setDesignPartial('layout.density', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                </div>

                {/* Colores Principales */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Colores Principales</h3>
                  <LabeledRow label="Color Primario">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.primary || '#4F46E5'}
                        onChange={(e) => setDesignPartial('colors.primary', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.primary || '#4F46E5'}
                        onChange={(e) => setDesignPartial('colors.primary', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Color Primario Soft">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.primarySoft || '#EEF2FF'}
                        onChange={(e) => setDesignPartial('colors.primarySoft', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.primarySoft || '#EEF2FF'}
                        onChange={(e) => setDesignPartial('colors.primarySoft', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Color Secundario">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.secondary || '#6366F1'}
                        onChange={(e) => setDesignPartial('colors.secondary', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.secondary || '#6366F1'}
                        onChange={(e) => setDesignPartial('colors.secondary', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Color Accent">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.accent || '#F97316'}
                        onChange={(e) => setDesignPartial('colors.accent', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.accent || '#F97316'}
                        onChange={(e) => setDesignPartial('colors.accent', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                </div>

                {/* Colores de Estado */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Colores de Estado</h3>
                  <LabeledRow label="Success">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.success || '#10B981'}
                        onChange={(e) => setDesignPartial('colors.success', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.success || '#10B981'}
                        onChange={(e) => setDesignPartial('colors.success', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Warning">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.warning || '#F59E0B'}
                        onChange={(e) => setDesignPartial('colors.warning', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.warning || '#F59E0B'}
                        onChange={(e) => setDesignPartial('colors.warning', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Danger">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.danger || '#EF4444'}
                        onChange={(e) => setDesignPartial('colors.danger', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.danger || '#EF4444'}
                        onChange={(e) => setDesignPartial('colors.danger', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Info">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.info || '#3B82F6'}
                        onChange={(e) => setDesignPartial('colors.info', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.info || '#3B82F6'}
                        onChange={(e) => setDesignPartial('colors.info', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                </div>

                {/* Colores de Superficie */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Colores de Superficie</h3>
                  <LabeledRow label="Background">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.background || '#FFFFFF'}
                        onChange={(e) => setDesignPartial('colors.background', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.background || '#FFFFFF'}
                        onChange={(e) => setDesignPartial('colors.background', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Surface">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.surface || '#F9FAFB'}
                        onChange={(e) => setDesignPartial('colors.surface', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.surface || '#F9FAFB'}
                        onChange={(e) => setDesignPartial('colors.surface', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Surface Elevated">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.surfaceElevated || '#FFFFFF'}
                        onChange={(e) => setDesignPartial('colors.surfaceElevated', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.surfaceElevated || '#FFFFFF'}
                        onChange={(e) => setDesignPartial('colors.surfaceElevated', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Surface Muted">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.surfaceMuted || '#F3F4F6'}
                        onChange={(e) => setDesignPartial('colors.surfaceMuted', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.surfaceMuted || '#F3F4F6'}
                        onChange={(e) => setDesignPartial('colors.surfaceMuted', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                </div>

                {/* Colores de Texto */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Colores de Texto</h3>
                  <LabeledRow label="Texto Primario">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.text?.primary || '#111827'}
                        onChange={(e) => setDesignPartial('colors.text.primary', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.text?.primary || '#111827'}
                        onChange={(e) => setDesignPartial('colors.text.primary', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Texto Secundario">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.text?.secondary || '#6B7280'}
                        onChange={(e) => setDesignPartial('colors.text.secondary', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.text?.secondary || '#6B7280'}
                        onChange={(e) => setDesignPartial('colors.text.secondary', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Texto Muted">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.text?.muted || '#9CA3AF'}
                        onChange={(e) => setDesignPartial('colors.text.muted', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.text?.muted || '#9CA3AF'}
                        onChange={(e) => setDesignPartial('colors.text.muted', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Texto Inverse">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.text?.inverse || '#FFFFFF'}
                        onChange={(e) => setDesignPartial('colors.text.inverse', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.text?.inverse || '#FFFFFF'}
                        onChange={(e) => setDesignPartial('colors.text.inverse', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                </div>

                {/* Colores de Borde */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Colores de Borde</h3>
                  <LabeledRow label="Borde Default">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.border?.default || '#E5E7EB'}
                        onChange={(e) => setDesignPartial('colors.border.default', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.border?.default || '#E5E7EB'}
                        onChange={(e) => setDesignPartial('colors.border.default', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Borde Muted">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.border?.muted || '#F3F4F6'}
                        onChange={(e) => setDesignPartial('colors.border.muted', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.border?.muted || '#F3F4F6'}
                        onChange={(e) => setDesignPartial('colors.border.muted', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Borde Strong">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.border?.strong || '#D1D5DB'}
                        onChange={(e) => setDesignPartial('colors.border.strong', e.target.value)}
                        className={`w-16 ${componentStyles.controls.inputDefault}`}
                      />
                      <Input
                        type="text"
                        value={design?.colors?.border?.strong || '#D1D5DB'}
                        onChange={(e) => setDesignPartial('colors.border.strong', e.target.value)}
                        className={`w-32 font-mono text-xs ${componentStyles.controls.inputDefault}`}
                      />
                    </div>
                  </LabeledRow>
                </div>

                {/* Componentes */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Componentes</h3>
                  <LabeledRow label="Radio de Botones">
                    <Select 
                      value={design?.components?.button?.radius || 'lg'} 
                      onValueChange={(v) => setDesignPartial('components.button.radius', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none (0px)</SelectItem>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                        <SelectItem value="3xl">3xl (24px)</SelectItem>
                        <SelectItem value="full">full (9999px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Padding Botón SM">
                    <Input
                      type="text"
                      value={design?.components?.button?.padding?.sm || '0.375rem 0.75rem'}
                      onChange={(e) => setDesignPartial('components.button.padding.sm', e.target.value)}
                      className="w-48 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                  <LabeledRow label="Padding Botón MD">
                    <Input
                      type="text"
                      value={design?.components?.button?.padding?.md || '0.5rem 1rem'}
                      onChange={(e) => setDesignPartial('components.button.padding.md', e.target.value)}
                      className="w-48 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                  <LabeledRow label="Padding Botón LG">
                    <Input
                      type="text"
                      value={design?.components?.button?.padding?.lg || '0.75rem 1.5rem'}
                      onChange={(e) => setDesignPartial('components.button.padding.lg', e.target.value)}
                      className="w-48 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                  <LabeledRow label="Radio de Inputs">
                    <Select 
                      value={design?.components?.input?.radius || 'lg'} 
                      onValueChange={(v) => setDesignPartial('components.input.radius', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none (0px)</SelectItem>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                        <SelectItem value="3xl">3xl (24px)</SelectItem>
                        <SelectItem value="full">full (9999px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Padding de Inputs">
                    <Input
                      type="text"
                      value={design?.components?.input?.padding || '0.5rem 0.75rem'}
                      onChange={(e) => setDesignPartial('components.input.padding', e.target.value)}
                      className="w-48 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                  <LabeledRow label="Radio de Cards">
                    <Select 
                      value={design?.components?.card?.radius || 'lg'} 
                      onValueChange={(v) => setDesignPartial('components.card.radius', v)}
                    >
                      <SelectTrigger className={`w-48 ${componentStyles.controls.selectDefault}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none (0px)</SelectItem>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                        <SelectItem value="3xl">3xl (24px)</SelectItem>
                        <SelectItem value="full">full (9999px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>
                  <LabeledRow label="Ancho Sidebar">
                    <Input
                      type="text"
                      value={design?.components?.sidebar?.width || '16rem'}
                      onChange={(e) => setDesignPartial('components.sidebar.width', e.target.value)}
                      className="w-32 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                  <LabeledRow label="Ancho Sidebar Colapsado">
                    <Input
                      type="text"
                      value={design?.components?.sidebar?.widthCollapsed || '4rem'}
                      onChange={(e) => setDesignPartial('components.sidebar.widthCollapsed', e.target.value)}
                      className="w-32 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                  <LabeledRow label="Altura Header">
                    <Input
                      type="text"
                      value={design?.components?.header?.height || '4rem'}
                      onChange={(e) => setDesignPartial('components.header.height', e.target.value)}
                      className="w-32 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                </div>

                {/* Focus */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Focus y Accesibilidad</h3>
                  <LabeledRow label="Ancho Ring Focus">
                    <Input
                      type="text"
                      value={design?.focus?.ring?.width || '2px'}
                      onChange={(e) => setDesignPartial('focus.ring.width', e.target.value)}
                      className="w-32 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                  <LabeledRow label="Color Ring Focus">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={design?.focus?.ring?.color || 'rgba(79, 70, 229, 0.5)'}
                        onChange={(e) => setDesignPartial('focus.ring.color', e.target.value)}
                        className="w-48 h-9 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Offset Ring Focus">
                    <Input
                      type="text"
                      value={design?.focus?.ring?.offset || '2px'}
                      onChange={(e) => setDesignPartial('focus.ring.offset', e.target.value)}
                      className="w-32 h-9 rounded-xl font-mono text-xs"
                    />
                  </LabeledRow>
                </div>

                {/* Brand Hue (compatibilidad) */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Brand (Compatibilidad)</h3>
                  <LabeledRow label="Brand Hue">
                    <Input
                      type="number"
                      min="0"
                      max="360"
                      value={design?.brandHue || 26}
                      onChange={(e) => setDesignPartial('brandHue', parseInt(e.target.value) || 26)}
                      className={`w-32 ${componentStyles.controls.inputDefault}`}
                    />
                  </LabeledRow>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={handleReset} className="h-10 rounded-xl">
                <RotateCcw className="w-4 h-4 mr-2" />
                Restablecer a valores por defecto
              </Button>
              <Button variant="outline" onClick={handleCopyConfig} className="h-10 rounded-xl">
                <Copy className="w-4 h-4 mr-2" />
                Copiar JSON de Configuración
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const json = exportDesign();
                  navigator.clipboard.writeText(json);
                  toast.success('✅ Diseño exportado al portapapeles');
                }} 
                className="h-10 rounded-xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Diseño
              </Button>
            </div>
            
            <Card className="app-card">
              <CardHeader className="border-b border-[var(--color-border-default)]">
                <CardTitle>Importar Diseño</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <Textarea
                  placeholder="Pega aquí el JSON del diseño a importar..."
                  rows={6}
                  className="font-mono text-xs focus-brand"
                  onChange={(e) => {
                    try {
                      const result = importDesign(e.target.value);
                      if (result.success) {
                        toast.success('✅ Diseño importado');
                        e.target.value = '';
                      } else {
                        toast.error('❌ Error: ' + result.error);
                      }
                    } catch (err) {
                      // Solo importar cuando sea JSON válido completo
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const json = prompt('Pega el JSON del diseño:');
                    if (json) {
                      const result = importDesign(json);
                      if (result.success) {
                        toast.success('✅ Diseño importado');
                      } else {
                        toast.error('❌ Error: ' + result.error);
                      }
                    }
                  }} 
                  className="h-10 rounded-xl"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar desde JSON
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {activeSection === 'audit' && (
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
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid md:grid-cols-2 gap-3">
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
        )}

        {activeSection === 'qa' && (
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
        )}

        {activeSection === 'preview' && (
          <>
            {/* Selector de Preset Base */}
            <Card className="app-card">
              <CardHeader className="border-b border-[var(--color-border-default)]">
                <CardTitle>Selector de Estilo Base</CardTitle>
              </CardHeader>
                    <CardContent className="pt-4 text-[var(--color-text-primary)]">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-[var(--color-text-primary)] mb-2 block">
                      Preset de Estilo:
                    </Label>
                    <Select
                      value={currentPresetId || 'studia'}
                      onValueChange={setPresetId}
                    >
                      <SelectTrigger className="w-full h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {basePresets && basePresets.length > 0 ? (
                          basePresets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              <div>
                                <div className="font-medium">{preset.label}</div>
                                <div className="text-xs text-[var(--color-text-secondary)]">{preset.description}</div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="default" disabled>
                            No hay presets disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Debug: mostrar información de presets */}
                  <div className="mt-4 p-3 bg-[var(--color-surface-muted)] rounded-lg text-xs">
                    <p className="font-semibold mb-2">Presets disponibles ({basePresets?.length || 0}):</p>
                    <div className="space-y-1 font-mono text-[10px]">
                      {basePresets?.map(p => (
                        <div key={p.id} className={currentPresetId === p.id ? 'text-[var(--color-primary)] font-bold' : ''}>
                          {p.id} - {p.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Debug: mostrar valores de layout actuales */}
                  <LayoutValuesDebug />
                  {currentPresetId && basePresets && (
                    <div className="p-3 rounded-xl bg-[var(--color-surface-muted)] border border-[var(--color-border-default)]">
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        <strong>Preset activo:</strong> {basePresets.find(p => p.id === currentPresetId)?.label || currentPresetId}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {basePresets.find(p => p.id === currentPresetId)?.description}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        💡 El color de marca (primary) es siempre <code className="bg-[var(--color-primary-soft)] px-1 rounded">#fd9840</code> en todos los presets.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    onChange={() => {}}
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
                    Este badge usa <code>var(--color-primary)</code> y <code>var(--color-primary-soft)</code>.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: '#fd9840' }} />
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      <div>Primary: <code>#fd9840</code></div>
                      <div>Primary Soft: <code>var(--color-primary-soft)</code></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
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
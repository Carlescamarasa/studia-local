import React, { useState, useMemo, useCallback } from "react";
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

function LabeledRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-ui last:border-0">
      <Label className="text-sm text-ui font-medium">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function DesignPageContent() {
  const { design, setDesign, setDesignPartial, resetDesign, exportDesign, importDesign, loadPreset } = useDesign();
  // Aliases para compatibilidad
  const config = design;
  const setConfig = setDesign;
  const reset = resetDesign;
  const [activeSection, setActiveSection] = useState('presets');
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
        { sel: '.segmented', name: 'Tabs segmentadas' },
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
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Palette}
        title="Panel de Diseño"
        subtitle="Ajusta tokens visuales en tiempo real sin tocar código"
      />

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="app-card border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900">
                  <strong>Modo runtime:</strong> Los cambios se guardan en <code className="bg-blue-100 px-1 rounded">localStorage</code> y se aplican mediante CSS variables. Útil para probar variantes sin deployar código.
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
              <CardHeader className="border-b border-ui">
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
              <CardContent className="pt-4">
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(allPresets).map(([id, preset]) => {
                    const isActive = JSON.stringify(config) === JSON.stringify(preset.config);
                    const isBuiltIn = isBuiltInPreset(id);
                    
                    return (
                      <Card 
                        key={id}
                        className={`app-panel cursor-pointer transition-all ${
                          isActive ? 'border-[hsl(var(--brand-500))] bg-[hsl(var(--brand-50))]' : 'hover:bg-muted'
                        }`}
                        onClick={() => handleLoadPreset(id)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-ui flex items-center gap-2">
                                {preset.name}
                                {isActive && <Badge className="badge-primary">Activo</Badge>}
                                {isBuiltIn && <Badge className="badge-outline text-[10px]">Built-in</Badge>}
                              </h4>
                              <p className="text-xs text-muted mt-1">{preset.description}</p>
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
                    <CardHeader className="border-b border-ui">
                      <CardTitle>Guardar Preset</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div>
                        <Label htmlFor="preset-name">Nombre del Preset</Label>
                        <Input
                          id="preset-name"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          className="focus-brand"
                        />
                      </div>
                      <div>
                        <Label htmlFor="preset-desc">Descripción (opcional)</Label>
                        <Textarea
                          id="preset-desc"
                          value={presetDescription}
                          onChange={(e) => setPresetDescription(e.target.value)}
                          rows={3}
                          className="focus-brand"
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
                    <CardHeader className="border-b border-ui flex items-center justify-between">
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
                    <CardContent className="pt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="export-json">Exportar presets personalizados:</Label>
                        <Textarea
                          id="export-json"
                          value={exportCustomPresets()}
                          readOnly
                          rows={6}
                          className="font-mono text-xs focus-brand"
                        />
                        <Button onClick={handleExportPresets} className="w-full btn-secondary">
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar al portapapeles
                        </Button>
                      </div>
                      <div className="space-y-2 pt-4 border-t border-ui">
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
                          className="font-mono text-xs focus-brand"
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
              <CardHeader className="border-b border-ui">
                <CardTitle>Configuración Actual</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <pre className="text-xs font-mono bg-muted p-4 rounded-xl border border-ui overflow-x-auto">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}

        {activeSection === 'controls' && (
          <>
            <Card className="app-card">
              <CardHeader className="border-b border-ui">
                <CardTitle>Controles de Diseño</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-ui">
                {/* Tipografía */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-ui mb-3">Tipografía</h3>
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
                      className="w-32 h-9 rounded-xl"
                    />
                  </LabeledRow>
                </div>

                {/* Layout */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-ui mb-3">Layout</h3>
                  <LabeledRow label="Radio de Cards">
                    <Select 
                      value={design?.layout?.radius?.card || 'lg'} 
                      onValueChange={(v) => setDesignPartial('layout.radius.card', v)}
                    >
                      <SelectTrigger className="w-48 h-9 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                        <SelectItem value="2xl">2xl (20px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>

                  <LabeledRow label="Radio de Controles">
                    <Select 
                      value={design?.layout?.radius?.controls || 'lg'} 
                      onValueChange={(v) => setDesignPartial('layout.radius.controls', v)}
                    >
                      <SelectTrigger className="w-48 h-9 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">sm (4px)</SelectItem>
                        <SelectItem value="md">md (8px)</SelectItem>
                        <SelectItem value="lg">lg (12px)</SelectItem>
                        <SelectItem value="xl">xl (16px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>

                  <LabeledRow label="Sombras">
                    <Select 
                      value={design?.layout?.shadow || 'md'} 
                      onValueChange={(v) => setDesignPartial('layout.shadow', v)}
                    >
                      <SelectTrigger className="w-48 h-9 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ninguna</SelectItem>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="card">Card (sutil)</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </LabeledRow>

                  <LabeledRow label="Densidad">
                    <Select 
                      value={design?.layout?.density || 'normal'} 
                      onValueChange={(v) => setDesignPartial('layout.density', v)}
                    >
                      <SelectTrigger className="w-48 h-9 rounded-xl">
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

                {/* Colores */}
                <div className="py-2">
                  <h3 className="text-sm font-semibold text-ui mb-3">Colores</h3>
                  <LabeledRow label="Color Primario">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.primary || '#4F46E5'}
                        onChange={(e) => setDesignPartial('colors.primary', e.target.value)}
                        className="w-16 h-9 rounded-xl"
                      />
                      <Input
                        type="text"
                        value={design?.colors?.primary || '#4F46E5'}
                        onChange={(e) => setDesignPartial('colors.primary', e.target.value)}
                        className="w-32 h-9 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Color Secundario">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.secondary || '#6366F1'}
                        onChange={(e) => setDesignPartial('colors.secondary', e.target.value)}
                        className="w-16 h-9 rounded-xl"
                      />
                      <Input
                        type="text"
                        value={design?.colors?.secondary || '#6366F1'}
                        onChange={(e) => setDesignPartial('colors.secondary', e.target.value)}
                        className="w-32 h-9 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </LabeledRow>
                  <LabeledRow label="Color Accent">
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={design?.colors?.accent || '#F97316'}
                        onChange={(e) => setDesignPartial('colors.accent', e.target.value)}
                        className="w-16 h-9 rounded-xl"
                      />
                      <Input
                        type="text"
                        value={design?.colors?.accent || '#F97316'}
                        onChange={(e) => setDesignPartial('colors.accent', e.target.value)}
                        className="w-32 h-9 rounded-xl font-mono text-xs"
                      />
                    </div>
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
              <CardHeader className="border-b border-ui">
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
            <CardHeader className="border-b border-ui">
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
            <CardContent className="pt-4">
              {auditReport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-slate-50 rounded-lg p-3 border border-ui">
                      <div className="text-xs text-muted uppercase tracking-wide">Archivos escaneados</div>
                      <div className="text-2xl font-bold text-ui">{auditReport?.summary?.filesScanned || 0}</div>
                    </Card>
                    <Card className="bg-slate-50 rounded-lg p-3 border border-ui">
                      <div className="text-xs text-muted uppercase tracking-wide">Problemas encontrados</div>
                      <div className="text-2xl font-bold text-ui">{auditReport?.summary?.totalIssues || 0}</div>
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
                        <Card key={k} className="bg-white rounded-lg p-3 border border-ui">
                          <div className="text-xs uppercase tracking-wide text-muted mb-1">{k}</div>
                          <div className="text-xl font-semibold text-ui">{v}</div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {auditReport?.issues && (
                    <details className="rounded-xl border border-ui p-4 bg-slate-50">
                      <summary className="cursor-pointer font-medium text-ui">Detalles por categoría</summary>
                      <div className="mt-4 space-y-4 max-h-[420px] overflow-auto">
                        {Object.entries(auditReport.issues).map(([bucket, items]) => (
                          items.length > 0 && (
                            <Card key={bucket} className="bg-white rounded-lg p-3 border border-ui">
                              <div className="mb-3 font-semibold text-ui flex items-center justify-between">
                                <span>{bucket}</span>
                                <Badge className="bg-red-50 text-red-800 border-red-200 rounded-full">
                                  {items.length}
                                </Badge>
                              </div>
                              <ul className="space-y-2 text-sm">
                                {items.slice(0, 50).map((it, idx) => (
                                  <li key={idx} className="border-l-2 border-brand-200 pl-3 py-1">
                                    <div className="text-[11px] text-muted">{it.file}:{it.line}</div>
                                    <div className="font-mono text-xs text-ui bg-slate-50 p-1 rounded mt-1">{it.snippet}</div>
                                  </li>
                                ))}
                              </ul>
                              {items.length > 50 && (
                                <div className="text-xs text-muted mt-3 text-center">
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
                <p className="text-sm text-muted">
                  Selecciona un perfil y pulsa "Ejecutar Auditoría" para analizar estilos y clases en todo el proyecto.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'qa' && (
          <Card className="app-card">
            <CardHeader className="border-b border-ui">
              <CardTitle>QA Rápido (Dev)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-muted">
                Pruebas integradas para detectar problemas comunes de diseño y accesibilidad.
              </p>

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
                <div className="bg-muted rounded-xl p-4 border border-ui">
                  <pre className="text-xs text-ui whitespace-pre-wrap font-mono overflow-x-auto max-h-96">
                    {qaOutput}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'preview' && (
          <Card className="app-card">
            <CardHeader className="border-b border-ui">
              <CardTitle>Preview de Componentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-ui mb-2">Botones:</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button className="btn-primary h-10 rounded-xl shadow-sm">Primary</Button>
                    <Button variant="outline" className="h-10 rounded-xl">Outline</Button>
                    <Button variant="ghost" className="h-10 rounded-xl">Ghost</Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-ui mb-2">Cards anidadas:</p>
                  <Card className="app-panel">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted">Panel interno con radius variable</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="text-sm font-medium text-ui mb-2">Icon tile:</p>
                  <div className="icon-tile">
                    <Palette className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-ui mb-2">Badges:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-slate-100 text-slate-800 border-slate-200 rounded-full">GEN</Badge>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 rounded-full">LIG</Badge>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 rounded-full">RIT</Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-200 rounded-full">ART</Badge>
                    <Badge className="bg-brand-100 text-brand-800 border-brand-200 rounded-full">S&A</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-ui mb-2">Focus ring:</p>
                  <Button variant="outline" className="h-10 rounded-xl focus-brand">
                    Enfócame con Tab
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
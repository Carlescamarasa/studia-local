import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/features/shared/components/ds";
import { Badge } from "@/features/shared/components/ds";
import { Alert, AlertDescription } from "@/features/shared/components/ds";
import { Tabs } from "@/features/shared/components/ds/Tabs";
import { useDesign } from "@/features/design/components/DesignProvider";
import RequireRole from "@/features/auth/components/RequireRole";
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Eye, Settings, Code, Target, Palette
} from "lucide-react";
import { PageHeader } from "@/features/shared/components/ds/PageHeader";
import { Input } from "@/features/shared/components/ui/input";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { RADIUS_MAP, SHADOW_MAP, DEFAULT_DESIGN } from "@/features/design/components/designConfig";

interface QAVisualContentProps {
  embedded?: boolean;
}

interface CheckResult {
  category: string;
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const componentStyles = {
  layout: {
    grid2: "grid grid-cols-1 md:grid-cols-2 gap-4",
    grid3: "grid grid-cols-1 md:grid-cols-3 gap-4",
  }
};

function QAVisualContent({ embedded = false }: QAVisualContentProps) {
  const { design } = useDesign();
  const config = design; // Compatibility alias

  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [activeTab, setActiveTab] = useState('components');

  const runChecks = useCallback(() => {
    const results = [];

    // 1. Verificar CSS Variables
    const root = getComputedStyle(document.documentElement);
    const layout = config?.layout || {};
    const radius = layout?.radius || {};
    const cardRadiusKey = radius?.card || DEFAULT_DESIGN.layout.radius.card;
    const controlsRadiusKey = radius?.controls || DEFAULT_DESIGN.layout.radius.controls;
    const shadowKey = layout?.shadow || DEFAULT_DESIGN.layout.shadow;
    const focusRing = config?.focus?.ring || DEFAULT_DESIGN.focus.ring;
    const expectedCardRadius = RADIUS_MAP[cardRadiusKey] || RADIUS_MAP.lg;
    const expectedCtrlRadius = RADIUS_MAP[controlsRadiusKey] || RADIUS_MAP.lg;
    const expectedShadow = SHADOW_MAP[shadowKey] || SHADOW_MAP.md;
    const expectedFocus = `${focusRing.width} ${focusRing.style} ${focusRing.color}`;

    results.push({
      category: 'CSS Variables',
      name: '--radius-card',
      expected: expectedCardRadius,
      actual: root.getPropertyValue('--radius-card').trim(),
      pass: root.getPropertyValue('--radius-card').trim() !== ''
    });

    results.push({
      category: 'CSS Variables',
      name: '--radius-ctrl',
      expected: expectedCtrlRadius,
      actual: root.getPropertyValue('--radius-ctrl').trim(),
      pass: root.getPropertyValue('--radius-ctrl').trim() !== ''
    });

    results.push({
      category: 'CSS Variables',
      name: '--shadow-card',
      expected: expectedShadow.substring(0, 30) + '...',
      actual: root.getPropertyValue('--shadow-card').trim().substring(0, 30) + '...',
      pass: root.getPropertyValue('--shadow-card').trim() !== ''
    });

    results.push({
      category: 'CSS Variables',
      name: '--focus-ring',
      expected: expectedFocus.substring(0, 30) + '...',
      actual: root.getPropertyValue('--focus-ring').trim().substring(0, 30) + '...',
      pass: root.getPropertyValue('--focus-ring').trim() !== ''
    });

    // 2. Verificar Body Classes
    const hasSerifClass = document.body.classList.contains('ds-serif');
    results.push({
      category: 'Body Classes',
      name: 'ds-serif',
      expected: (config?.typography?.serifHeadings ?? DEFAULT_DESIGN.typography.serifHeadings) ? 'presente' : 'ausente',
      actual: hasSerifClass ? 'presente' : 'ausente',
      pass: hasSerifClass === (config?.typography?.serifHeadings ?? DEFAULT_DESIGN.typography.serifHeadings)
    });

    // 3. Verificar Componentes en DOM
    const componentsToCheck = [
      { sel: '.app-card', name: 'Cards con .app-card', min: 1 },
      { sel: '.app-panel', name: 'Panels con .app-panel', min: 0 },
      { sel: '.btn-primary', name: 'Botones .btn-primary', min: 1 },
      { sel: '.badge', name: 'Badges con .badge', min: 1 },
      { sel: '.icon-tile', name: 'Icon tiles', min: 1 },
      { sel: '.page-header', name: 'Page headers', min: 1 },
      { sel: '.text-ui', name: 'Textos con .text-ui', min: 1 },
      { sel: '[class*="text-ui/80"]', name: 'Textos secundarios (.text-ui/80)', min: 1 },
    ];

    componentsToCheck.forEach(({ sel, name, min }) => {
      const count = document.querySelectorAll(sel).length;
      results.push({
        category: 'Componentes DOM',
        name,
        expected: `≥${min}`,
        actual: count.toString(),
        pass: count >= min
      });
    });

    // 4. Verificar que NO hay clases hardcodeadas en DOM
    const bodyHTML = document.body.innerHTML;
    const bannedPatterns = [
      { pattern: /bg-orange-\d{3}/g, name: 'bg-orange-*' },
      { pattern: /text-orange-\d{3}/g, name: 'text-orange-*' },
      { pattern: /rounded-\[[\d.]+px\]/g, name: 'rounded-[*px]' },
      { pattern: /bg-#[0-9a-fA-F]{6}/g, name: 'bg-[#hex]' },
    ];

    bannedPatterns.forEach(({ pattern, name }) => {
      const matches = bodyHTML.match(pattern);
      results.push({
        category: 'Clases Hardcodeadas',
        name: `Sin ${name}`,
        expected: '0',
        actual: matches ? matches.length.toString() : '0',
        pass: !matches || matches.length === 0
      });
    });

    setChecks(results);
  }, [config]);

  useEffect(() => {
    runChecks();
  }, [config]);

  const passed = checks.filter(c => c.pass).length;
  const failed = checks.filter(c => !c.pass).length;
  const total = checks.length;

  const checksByCategory = checks.reduce<Record<string, CheckResult[]>>((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {});

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && (
        <PageHeader
          icon={Eye}
          title="QA Visual - Design System"
          subtitle="Verificación en runtime de tokens y componentes"
          actions={
            <Button onClick={runChecks} className="btn-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-ejecutar
            </Button>
          }
        />
      )}

      <div className={`$"studia-section" space-y-6`}>
        {/* Resumen */}
        <div className={componentStyles.layout.grid3}>
          <Card className="app-card">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--success))]" />
              <p className="text-3xl font-bold text-ui">{passed}</p>
              <p className="text-sm text-ui/80">Pasados</p>
            </CardContent>
          </Card>

          <Card className="app-card">
            <CardContent className="pt-6 text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--danger))]" />
              <p className="text-3xl font-bold text-ui">{failed}</p>
              <p className="text-sm text-ui/80">Fallidos</p>
            </CardContent>
          </Card>

          <Card className="app-card">
            <CardContent className="pt-6 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--info))]" />
              <p className="text-3xl font-bold text-ui">{total}</p>
              <p className="text-sm text-ui/80">Total</p>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: 'components', label: 'Componentes' },
            { value: 'preview', label: 'Preview' },
          ]}
        />

        {activeTab === 'components' && (
          <div className="space-y-4">
            {Object.entries(checksByCategory).map(([category, categoryChecks]: [string, CheckResult[]]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mt-6 first:mt-0">
                  {category}
                </h3>
                <div className={componentStyles.layout.grid2}>
                  {(categoryChecks as CheckResult[]).map((check: CheckResult, idx: number) => (
                    <Card key={idx} className={`p-3 border ${check.pass ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs font-medium text-[var(--color-text-primary)] mb-1">{check.name}</div>
                          <div className="text-[10px] space-y-0.5">
                            <div className="text-[var(--color-text-muted)] flex justify-between">
                              <span>Esperado:</span>
                              <span className="font-mono">{check.expected}</span>
                            </div>
                            <div className={`${check.pass ? 'text-green-700' : 'text-red-700'} flex justify-between`}>
                              <span>Real:</span>
                              <span className="font-mono">{check.actual}</span>
                            </div>
                          </div>
                        </div>
                        {check.pass ? (
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-6">
            <Card className="app-card">
              <CardHeader className="border-b border-[var(--color-border-default)]">
                <CardTitle>Componentes Base</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Botones */}
                <div>
                  <p className="text-sm font-medium text-ui mb-3">Botones:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button className="btn-primary">Primary</Button>
                    <Button className="btn-secondary">Secondary</Button>
                    <Button className="btn-ghost">Ghost</Button>
                  </div>
                </div>

                {/* Badges */}
                <div>
                  <p className="text-sm font-medium text-ui mb-3">Badges:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="badge-default">Default</Badge>
                    <Badge className="badge-primary">Primary</Badge>
                  </div>
                </div>

                {/* Cards */}
                <div>
                  <p className="text-sm font-medium text-ui mb-3">Cards:</p>
                  <div className={componentStyles.layout.grid2}>
                    <Card className="app-card">
                      <CardHeader className="border-b border-[var(--color-border-default)]">
                        <CardTitle>Card con header</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-sm text-ui/80">
                          Contenido de la card usando tokens del DS
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="app-panel">
                      <CardContent className="pt-4">
                        <p className="text-sm text-ui/80">Panel sin header</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Inputs */}
                <div>
                  <p className="text-sm font-medium text-ui mb-3">Inputs:</p>
                  <div className={`${componentStyles.layout.grid2} max-w-2xl`}>
                    <div>
                      <label htmlFor="qa-input" className="text-xs text-ui/80 block mb-1">Input estándar</label>
                      <Input id="qa-input" placeholder="Input estándar" className="focus-brand" />
                    </div>
                    <div>
                      <label htmlFor="qa-textarea" className="text-xs text-ui/80 block mb-1">Textarea</label>
                      <Textarea id="qa-textarea" placeholder="Textarea" rows={2} className="focus-brand" />
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                <div>
                  <p className="text-sm font-medium text-ui mb-3">Alerts:</p>
                  <div className="space-y-2 max-w-2xl">
                    <Alert className="app-panel border-[hsl(var(--info))]/20 bg-[hsl(var(--info))]/5">
                      <AlertDescription className="text-[hsl(var(--info))]">
                        Alert info conectada al DS
                      </AlertDescription>
                    </Alert>
                    <Alert className="app-panel border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5">
                      <AlertDescription className="text-[hsl(var(--success))]">
                        Alert success conectada al DS
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* Icon Tile */}
                <div>
                  <p className="text-sm font-medium text-ui mb-3">Icon Tile:</p>
                  <div className="icon-tile">
                    <Palette className="w-6 h-6" />
                  </div>
                </div>

                {/* Typography */}
                <div>
                  <p className="text-sm font-medium text-ui mb-3">Tipografía:</p>
                  <div className="space-y-2">
                    <h2 className="text-ui text-3xl font-bold">Heading 1 con tokens</h2>
                    <h3 className="text-ui text-2xl font-semibold">Heading 2</h3>
                    <h4 className="text-ui text-xl font-semibold">Heading 3</h4>
                    <p className="text-ui">Párrafo normal con text-ui</p>
                    <p className="text-ui/80 text-sm">Texto secundario</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuración actual */}
        {!embedded && (
          <Card className="app-card">
            <CardHeader className="border-b border-[var(--color-border-default)]">
              <CardTitle>Configuración Actual del DS</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <pre className="text-xs font-mono bg-muted p-4 app-panel overflow-x-auto">
                {JSON.stringify(config, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function QAVisualPage() {
  return (
    <RequireRole anyOf={['ADMIN']}>
      <QAVisualContent />
    </RequireRole>
  );
}

export { QAVisualContent };
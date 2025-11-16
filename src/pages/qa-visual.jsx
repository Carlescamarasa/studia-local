import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ds";
import { Badge } from "@/components/ds";
import { Alert, AlertDescription } from "@/components/ds";
import Tabs from "@/components/ds/Tabs";
import { useDesign } from "@/components/design/DesignProvider";
import RequireRole from "@/components/auth/RequireRole";
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Eye, Settings, Code, Target, Palette
} from "lucide-react";
import PageHeader from "@/components/ds/PageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RADIUS_MAP, SHADOW_MAP, DEFAULT_DESIGN } from "@/components/design/designConfig";

function QAVisualContent({ embedded = false }) {
  const { config } = useDesign();
  const [checks, setChecks] = useState([]);
  const [activeTab, setActiveTab] = useState('components');

  const runChecks = () => {
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
      { sel: '.text-ui\\/80', name: 'Textos secundarios (.text-ui/80)', min: 1 },
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
      { pattern: /bg-\[#[0-9a-fA-F]{6}\]/g, name: 'bg-[#hex]' },
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
  };

  useEffect(() => {
    runChecks();
  }, [config]);

  const passed = checks.filter(c => c.pass).length;
  const failed = checks.filter(c => !c.pass).length;
  const total = checks.length;

  const groupedChecks = checks.reduce((acc, check) => {
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

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4">
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
            {Object.entries(groupedChecks).map(([category, categoryChecks]) => (
              <Card key={category} className="app-card">
                <CardHeader className="border-b border-ui">
                  <CardTitle className="text-lg">{category}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {categoryChecks.map((check, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 app-panel border-2 ${
                          check.pass
                            ? 'border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5'
                            : 'border-[hsl(var(--danger))]/20 bg-[hsl(var(--danger))]/5'
                        }`}
                      >
                        {check.pass ? (
                          <CheckCircle className="w-5 h-5 text-[hsl(var(--success))] shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[hsl(var(--danger))] shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-ui">{check.name}</p>
                          <div className="flex gap-4 mt-1 text-xs">
                            <span className="text-ui/80">
                              Esperado: <code className="bg-muted px-1 rounded">{check.expected}</code>
                            </span>
                            <span className="text-ui/80">
                              Actual: <code className="bg-muted px-1 rounded">{check.actual}</code>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-6">
            <Card className="app-card">
              <CardHeader className="border-b border-ui">
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="app-card">
                      <CardHeader className="border-b border-ui">
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
                  <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
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
            <CardHeader className="border-b border-ui">
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

// Auditoría de Diseño (runtime) para Vite - v2 afinado
// Escanea archivos, detecta patrones de diseño/estándares y genera un informe JSON.

const BANNED_HEX = [
  "#fd9840", "#ff7e1f", "#F59E42", "#F28A2E", // legacy orange variants
];
const BANNED_TW_ORANGE = [
  "bg-orange-", "text-orange-", "border-orange-",
  "from-orange-", "to-orange-", "via-orange-", "ring-orange-",
  "fill-orange-", "stroke-orange-", "hover:bg-orange-", "hover:text-orange-"
];
const BANNED_GRADIENT_HEX = /from-\[#?[0-9A-Fa-f]{3,6}\]|to-\[#?[0-9A-Fa-f]{3,6}\]|via-\[#?[0-9A-Fa-f]{3,6}\]/g;

// Radios permitidos: lg, xl, 2xl, full + variantes direccionales
const ALLOWED_RADIUS_PATTERN = /^rounded(-([trbl]|t[lr]|b[lr]))?(-(lg|xl|2xl|full))?$/;
const ALLOWED_SHADOWS = new Set(["shadow-card", "shadow-sm", "shadow-md", "shadow-none"]); // permitimos md para casos específicos
const BAD_REQUIRE = /(^|[^'"\\])\brequire\(/g; // require() no dentro de strings
const BAD_REQUIRE_ROLE_PROPS = /<RequireRole[^>]+roles=|roles\s*=/g; // debe ser anyOf
const DYNAMIC_CLASSNAME = /className=\{`[^`]*\$\{[^}]+\}[^`]*`\}/g; // clases construidas dinámicamente
const WHITELISTED_DYNAMICS = /tipoColors|nivelColors|estadoColors|focoColors|colorClase|priorityColors|categoryColors|statusColors/;
const RAW_BRAND_VAR = /var\(--brand-(\d{2,3})\)/g;

const isAllowedBrandToken = (n: string | number) => {
  const num = Number(n);
  return [50, 100, 200, 300, 400, 500, 600, 700, 800].includes(num);
};

export interface AuditIssue {
  file: string;
  line: number;
  snippet: string;
  [key: string]: any;
}

export interface AuditReport {
  summary: {
    filesScanned: number;
    totalIssues: number;
    issues: Record<string, number>;
  };
  issues: Record<string, AuditIssue[]>;
  scannedFiles: Set<string>;
  scannedAt: string;
}

export async function runDesignAudit(): Promise<AuditReport> {
  // Incluye JSX/TSX/JS/TS/CSS, excluyendo ui/
  // Usamos eager: false para code-splitting - se carga solo cuando se necesita
  const filesModule = await import.meta.glob(
    [
      "/src/**/*.{jsx,tsx,js,ts,css}",
      "/app/**/*.{jsx,tsx,js,ts,css}",
      "!/src/components/ui/**",
      "!/app/components/ui/**"
    ],
    { query: "?raw", import: "default", eager: false }
  );

  // Cargar todos los archivos de forma asíncrona
  const files: Record<string, string> = {};
  await Promise.all(
    Object.entries(filesModule).map(async ([path, loader]) => {
      files[path] = (await loader()) as string;
    })
  );

  const report: AuditReport = {
    summary: {
      filesScanned: 0,
      totalIssues: 0,
      issues: {},
    },
    issues: {
      bannedHex: [],
      bannedTailwindOrange: [],
      gradientHex: [],
      radiusInconsistent: [],
      shadowInconsistent: [],
      requireUsage: [],
      requireRoleLegacyProp: [],
      dsAliasNotes: [],
      dynamicClassname: [],
      brandTokenOutOfScale: [],
    },
    scannedFiles: new Set(), // Track actually scanned files to filter ghost issues
    scannedAt: new Date().toISOString(),
  };

  const add = (bucket: string, file: string, line: number, snippet: string, meta: Record<string, any> = {}) => {
    report.issues[bucket].push({ file, line, snippet, ...meta });
    report.summary.issues[bucket] = (report.summary.issues[bucket] || 0) + 1;
    report.summary.totalIssues++;
  };

  const eachLine = (text: string) => text.split(/\r?\n/);

  // Para detectar alias mixtos
  const aliasUsage = { app: new Set<string>(), components: new Set<string>() };

  for (const [path, content] of Object.entries(files)) {
    report.summary.filesScanned++;
    report.scannedFiles.add(path); // Register scanned file
    const lines = eachLine(content);

    // 1) HEX legacy
    lines.forEach((ln, i) => {
      for (const hex of BANNED_HEX) {
        const re = new RegExp(hex.replace('#', '#?'), 'gi');
        if (re.test(ln)) add("bannedHex", path, i + 1, ln.trim(), { hex });
      }
    });

    // 2) Clases naranja Tailwind
    lines.forEach((ln, i) => {
      if (BANNED_TW_ORANGE.some(k => ln.includes(k))) {
        add("bannedTailwindOrange", path, i + 1, ln.trim());
      }
    });

    // 3) Gradientes con HEX entre corchetes
    lines.forEach((ln, i) => {
      const m = ln.match(BANNED_GRADIENT_HEX);
      if (m) add("gradientHex", path, i + 1, ln.trim(), { matches: m });
    });

    // 4) Radios - ahora con patrón
    lines.forEach((ln, i) => {
      if (ln.includes("rounded-")) {
        const classes = ln.match(/rounded(-([trbl]|t[lr]|b[lr]))?(-([\w[\]-]+))?/g) || [];
        classes.forEach((c) => {
          if (!ALLOWED_RADIUS_PATTERN.test(c) && !c.includes('[')) {
            add("radiusInconsistent", path, i + 1, ln.trim(), { value: c });
          }
        });
      }
    });

    // 5) Sombras
    lines.forEach((ln, i) => {
      const classes = ln.match(/shadow-[\w-]+/g) || [];
      classes.forEach((c) => {
        if (!ALLOWED_SHADOWS.has(c)) {
          add("shadowInconsistent", path, i + 1, ln.trim(), { value: c });
        }
      });
    });

    // 6) require() - solo fuera de strings
    lines.forEach((ln, i) => {
      BAD_REQUIRE.lastIndex = 0;
      if (BAD_REQUIRE.test(ln)) add("requireUsage", path, i + 1, ln.trim());
    });

    // 7) RequireRole con prop legacy "roles"
    lines.forEach((ln, i) => {
      if (BAD_REQUIRE_ROLE_PROPS.test(ln)) add("requireRoleLegacyProp", path, i + 1, ln.trim());
    });

    // 8) Alias DS - detectar mixtos
    if (content.includes('@/App/ds')) aliasUsage.app.add(path);
    if (content.includes('@/features/shared/components/ds')) aliasUsage.components.add(path);

    // 9) className dinámico - solo si no está en whitelist
    lines.forEach((ln, i) => {
      if (DYNAMIC_CLASSNAME.test(ln) && !WHITELISTED_DYNAMICS.test(ln)) {
        add("dynamicClassname", path, i + 1, ln.trim());
      }
    });

    // 10) Escala de brand tokens
    let match;
    const brandRegex = new RegExp(RAW_BRAND_VAR.source, 'g');
    while ((match = brandRegex.exec(content)) !== null) {
      const n = match[1];
      if (!isAllowedBrandToken(n)) {
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        add("brandTokenOutOfScale", path, line, match[0], { token: n });
      }
    }
  }

  // Reportar alias mixtos solo si hay ambos tipos
  if (aliasUsage.app.size > 0 && aliasUsage.components.size > 0) {
    add("dsAliasNotes", "global", 0,
      `Alias mixtos detectados: ${aliasUsage.app.size} archivos usan @/App/ds y ${aliasUsage.components.size} usan @/components/ds`);
  }

  return report;
}

// ===== Legacy functions for testseed.jsx compatibility =====

export const QUICK_PROFILES = {
  isoString: {
    name: 'toISOString',
    spec: 'pattern: toISOString\\s*\\(\ninclude: /src/**/*.{js,jsx}\nexclude: **/node_modules/**'
  },
  legacyColors: {
    name: 'Legacy Colors',
    spec: 'pattern: #fd9840|#ff7e1f|#F59E42|#F28A2E\ninclude: /src/**/*.{js,jsx,css}\nexclude: **/node_modules/**'
  },
  requireCalls: {
    name: 'require() calls',
    spec: 'pattern: [^.\\w]require\\(\ninclude: /src/**/*.{js,jsx}\nexclude: **/node_modules/**'
  },
};

export interface AuditConfig {
  patterns: RegExp[];
  includes: string[];
  excludes: string[];
}

export function parseAuditSpec(spec: string): AuditConfig {
  const lines = spec.split('\n').map(l => l.trim()).filter(Boolean);
  const config: AuditConfig = {
    patterns: [],
    includes: ['/src/**/*.{js,jsx,tsx,ts,css}'],
    excludes: ['**/node_modules/**'],
  };

  for (const line of lines) {
    if (line.startsWith('pattern:')) {
      const pattern = line.substring('pattern:'.length).trim();
      try {
        config.patterns.push(new RegExp(pattern, 'g'));
      } catch (e) {
        config.patterns.push(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      }
    } else if (line.startsWith('include:')) {
      config.includes.push(line.substring('include:'.length).trim());
    } else if (line.startsWith('exclude:')) {
      config.excludes.push(line.substring('exclude:'.length).trim());
    }
  }

  return config;
}

export interface AuditResults {
  filesScanned: number;
  matchesTotal: number;
  perFile: {
    path: string;
    matches: {
      line: number;
      pattern: string;
      match: string;
      start: number;
      end: number;
      context: {
        before: string | null;
        current: string;
        after: string | null;
      };
    }[];
  }[];
  durationMs: number;
  compiled: AuditConfig;
  reason?: string;
}

export async function runAudit(config: AuditConfig): Promise<AuditResults> {
  const startTime = Date.now();
  const results: AuditResults = {
    filesScanned: 0,
    matchesTotal: 0,
    perFile: [],
    durationMs: 0,
    compiled: config,
  };

  if (!config.patterns || config.patterns.length === 0) {
    results.reason = 'No hay patrones definidos';
    results.durationMs = Date.now() - startTime;
    return results;
  }

  try {
    // Usamos eager: false para code-splitting - se carga solo cuando se necesita
    const filesModule = await import.meta.glob(
      ['/src/**/*.{jsx,tsx,js,ts,css}'],
      { query: "?raw", import: "default", eager: false }
    );

    // Cargar todos los archivos de forma asíncrona
    const files: Record<string, string> = {};
    await Promise.all(
      Object.entries(filesModule).map(async ([path, loader]) => {
        files[path] = (await loader()) as string;
      })
    );

    for (const [path, content] of Object.entries(files)) {
      const shouldInclude = config.includes.some(inc => {
        const glob = inc.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        return new RegExp(glob).test(path);
      });

      const shouldExclude = config.excludes.some(exc => {
        const glob = exc.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
        return new RegExp(glob).test(path);
      });

      if (!shouldInclude || shouldExclude) continue;

      results.filesScanned++;
      const lines = content.split(/\r?\n/);
      const fileMatches: AuditResults['perFile'][0]['matches'] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of config.patterns) {
          pattern.lastIndex = 0;
          let match;
          while ((match = pattern.exec(line)) !== null) {
            fileMatches.push({
              line: i + 1,
              pattern: pattern.source,
              match: match[0],
              start: match.index,
              end: match.index + match[0].length,
              context: {
                before: i > 0 ? lines[i - 1] : null,
                current: line,
                after: i < lines.length - 1 ? lines[i + 1] : null,
              }
            });
            results.matchesTotal++;
          }
        }
      }

      if (fileMatches.length > 0) {
        results.perFile.push({ path, matches: fileMatches });
      }
    }
  } catch (error: any) {
    results.reason = `Error al escanear archivos: ${error.message}`;
  }

  results.durationMs = Date.now() - startTime;
  return results;
}

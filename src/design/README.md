# Sistema de Diseño – Studia

Origen único de verdad para estilos, tokens y clases semánticas.

## 1) Tokens

Archivo: `src/design/designSystem.ts`

Categorías:
- colors: `primary`, `primarySoft`, `secondary`, `background`, `surface`, `surfaceElevated`, `surfaceMuted`, `textPrimary`, `textSecondary`, `textMuted`, `textInverse`, `success`, `warning`, `danger`, `info`, `accent`, `border*`, `ring`.
- typography: familias, tamaños y line-heights.
- spacing: `spacingXs..spacingXl` (dependiente de densidad).
- radius: `radiusSm..radiusFull`.
- shadows: `shadowSm`, `shadowMd` (→ `--shadow-card`), `shadowLg`.
- motion: `transitionBase/Fast/Slow`.

Los valores se conectan a variables CSS que genera `DesignProvider` (desde `src/components/design/designConfig.ts`) y a las HSL base definidas en `src/index.css` (incluye el bloque `.dark`).

## 2) Variables CSS globales

Archivo: `src/index.css`

- Vars HSL base: `--background`, `--foreground`, `--primary`, … y tema oscuro mediante `.dark`.
- `@layer components` centraliza clases semánticas:
  - `.app-card`, `.app-panel`
  - `.ctrl-field`
  - `.btn-*` (`btn-primary`, `btn-secondary`, `btn-outline`, `btn-ghost`, `btn-danger`, tamaños `btn-sm/md/lg/icon`)

Usar estas clases cuando el elemento sea semánticamente un botón, tarjeta o panel.

## 3) Mapa de estilos por componente

Archivo: `src/design/componentStyles.ts`

- layout: fondos de app/página/panel.
- typography: `pageTitle`, `pageSubtitle`, `sectionTitle`, `cardTitle`, `bodyText`, `smallMetaText`.
- components:
  - Botones: `buttonPrimary`, `buttonSecondary`, `buttonOutline`, `buttonGhost`.
  - Inputs/Selects: `inputDefault`, `inputSm`, `inputLg`, `selectDefault` (todos basados en `ctrl-field`).
  - Cards base: `cardBase`, `cardElevated`, `cardKpi`, `panelBase`.
  - Cards Agenda (unificadas): `cardStudent` = `cardBase`; `cardAsignacion|cardPlan|cardSemana` = variantes tonales (primary/accent/secondary); `panelSesion` = panel con fondo muted.
  - Tabs: `tabsSegmented*` y `tabsUnderline*`.
  - Vacíos: `emptyStateIcon`, `emptyStateText`.
  - Menú: `menuSectionTitle`, `menuItem`, `menuItemActive`.

Objetivo: que un re-temeado se resuelva aquí y/o en tokens, no en componentes aislados. Las cards están unificadas sobre bases reutilizables para evitar duplicación.

## 4) Componentes base conectados

- `PageHeader` (DS): usa `componentStyles.typography.pageTitle/pageSubtitle`, `filters`/`actions`.
- `Tabs` (DS): variantes segmentada/underline (usa `componentStyles.components.tabs*`). La variante segmentada expone `data-testid="tabs-segmented"` para QA.
- `Card` (UI/DS): preferir `Card` + `app-card/panelBase` via `componentStyles`.
- `Input`, `SelectTrigger`: basados en `ctrl-field` (via `useClassTokens`).

## 5) Pautas de uso

1. Headers: usar `PageHeader` con `componentStyles.typography.pageTitle/pageSubtitle`.
2. Tabs: `Tabs` unificado; estado activo = `primarySoft` + borde `primary`.
3. Botones: `btn-*` y tamaños (`btn-sm/md/lg`) o `Button` con `variant/size`.
4. Cards/Paneles: usar `cardBase/cardElevated`, `cardKpi`, `panelBase` desde `componentStyles`. Las variantes de Agenda están unificadas sobre estas bases.
5. Contraste: usar `text-ui` para contenido primario, `text-ui/80` para secundario. Reservar `text-muted` solo para meta/desactivado.
6. Colores: siempre usar tokens `var(--color-*)` o clases semánticas. No usar colores literales Tailwind (`bg-gray-50`, `text-slate-600`, etc.).
7. Inline styles: evitarlos salvo layout dinámico (anchos/transformaciones basadas en datos). Preferir utilidades o estilos centralizados.

## 6) Checklist por página

- `PageHeader` presente.
- Tabs con `Tabs` (DS).
- Filtros sobre `panelBase` o `cardBase`.
- Contraste: `text-ui`/`text-ui/80` (no `text-muted` para contenido primario).
- Botones con `btn-*` o `Button` component.
- Cards con `app-card` / variantes desde `componentStyles`.
- Colores: tokens `var(--color-*)` (no literales Tailwind).

## 7) Re-temear (Light/Dark)

1. `designSystem.ts`: paleta, tipografía, radios, sombras (tokens de referencia; alineados con `designConfig.ts`).
2. `designConfig.ts`:
   - `DEFAULT_DESIGN` y `generateCSSVariables` (camelCase → kebab-case).
   - Genera escala de marca `--brand-50..--brand-900` a partir de `brandHue`.
   - Emite alias de radios: `--radius-ctrl` y `--radius-card` desde `layout.radius`.
3. `componentStyles.ts`: combinaciones por tipo de UI.
4. `index.css` (`@layer components`): clases semánticas (`.btn-*`, `.ctrl-field`, `.app-card/panel`).

El `DesignProvider` añade/quita `.dark` en `<html>` según `design.theme`, activando el tema oscuro y aplicando todas las CSS vars en runtime. El selector rápido Light/Dark está disponible en el pie del sidebar (Layout).

---

## 8) Inventario de elementos y atributos estandarizados

Esta sección recoge todos los elementos/atributos ya mapeados a tokens y CSS globales (fuente de verdad).

1) Tipografía
- Tokens: `typography.fontFamilyBase`, `fontFamilyHeadings/Serif`, `fontSizeBase`, `lineHeight.*`.
- Clases semánticas (componentStyles.typography):
  - `pageTitle`, `pageSubtitle`, `sectionTitle`, `cardTitle`, `bodyText`, `smallMetaText`.
- Reglas:
  - Textos primarios: `text-ui`.
  - Textos secundarios: `text-ui/80` (no usar `text-muted` para contenido primario).

2) Colores
- Tokens (colors): `primary`, `primarySoft`, `secondary`, `accent`, `info`, `background`, `surface`, `surfaceElevated`, `surfaceMuted`, `text{primary,secondary,muted,inverse}`, `success`, `warning`, `danger`, `border{default,muted,strong}`, `ring`.
- Vars generadas: `--color-*` (kebab-case), p. ej. `--color-primary-soft`, `--color-surface-elevated`, `--color-text-inverse`.
- HSL base (`index.css`):
  - Light y `.dark` para: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, etc. (complementan las vars `--color-*`).
- Escala de marca:
  - `--brand-50..--brand-900` (HSL), derivada de `brandHue`. Úsese para realces/accent, no para texto de cuerpo.

3) Layout, radius y sombras
- Tokens: `layout.radius.{global,card,controls,pill,modal}`, `layout.density`, `layout.shadow`.
- Vars generadas:
  - `--radius-card`, `--radius-ctrl`, `--shadow-card`, `--space-*`, `--gap-*`.
- Densidad en `body`: `ds-density-{compact|normal|spacious}`.

4) Controles (Inputs/Selects)
- Clase: `.ctrl-field` (via `Input`/`SelectTrigger` o `useClassTokens.control`).
- Atributos gobernados por tokens/vars:
  - `padding: var(--input-padding)`
  - `border-radius: var(--radius-ctrl)`
  - `border-color: var(--color-border-default)`
  - `focus: box-shadow: var(--focus-ring)`

5) Botones
- Clases semánticas (`index.css`):
  - `.btn-primary|secondary|outline|ghost|danger`, tamaños `.btn-sm|md|lg|icon`, y `.btn-disabled`.
- Vía componente `Button` (ui): `variant/size` mapean a `.btn-*`.

6) Cards y Paneles
- Clases globales: `.app-card`, `.app-panel`.
- Atributos gobernados por tokens:
  - `background-color: var(--color-surface|surface-elevated|surface-muted)`
  - `color: var(--color-text-primary)`
  - `border: var(--color-border-strong|muted|default)`
  - `border-radius: var(--radius-card)`
  - Sombra (cards): `var(--shadow-card)`
- Variantes (componentStyles.components):
  - Bases: `cardBase`, `cardElevated`, `cardKpi`, `panelBase`.
  - Agenda (unificadas): `cardStudent` = `cardBase`; `cardAsignacion|cardPlan|cardSemana` = variantes tonales (primary/accent/secondary); `panelSesion` = panel con fondo muted.

7) Tabs
- `Tabs` (DS) → `segmented`/`underline` usando `componentStyles.components.tabs*`. La variante segmentada expone `data-testid="tabs-segmented"` para QA.
- Estados activos con `primarySoft` + borde `primary`.

8) Menú lateral
- `menuSectionTitle`, `menuItem`, `menuItemActive` (componentStyles.components).

9) Tema Light/Dark
- `DesignProvider` alterna `.dark` en `<html>` según `design.theme`.
- El preset se puede alternar desde el sidebar (Light/Dark). En `/design` (pestaña “QA”) se incluyen fixtures estáticos (`.page-header`, `.btn-primary`, `.badge`, `.app-panel`, `[data-testid="tabs-segmented"]`) para auditoría consistente.

---

## 9) Procedimiento de auditoría y QA

1) QA Visual (runtime)
- `/design` → pestaña "QA". Ejecuta verificaciones sobre:
  - Vars críticas: `--radius-card/ctrl`, `--shadow-card`, `--focus-ring`.
  - Clases en `<body>`: `ds-serif`, densidad.
  - Presencia de patrones esperados: `.page-header`, `.btn-primary`, `.badge`, `.app-panel`, `[data-testid="tabs-segmented"]`.
- `QAVisualContent` admite `embedded` para integrarlo en otras vistas si se quiere.

2) Validación multi-tema
- Alternar Light/Dark desde el sidebar y revisar:
  - Contraste en cards/paneles, inputs, tabs, badges y tablas.
  - Consistencia visual en todas las vistas.

3) Verificación estática
- Buscar restos de colores literales: `rg -n "text-(gray|slate|stone)-[3-9]00" src/` y `rg -n "bg-(gray|slate|stone)-[1-9]0" src/`
- Verificar uso correcto de tokens: `rg -n "var\(--color-" src/`

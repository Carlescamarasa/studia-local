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
- `@layer components` centraliza clases semánticas (núcleo mínimo):
  - `.ctrl-field` (y variante `.ctrl-field--underline`)
  - `.btn-*` (`btn-primary`, `btn-secondary`, `btn-outline`, `btn-ghost`, `btn-danger`, tamaños `btn-sm/md/lg/icon`)
  - `.text-ui`, `.text-muted` (tipografía semántica)
  - `.app-card`, `.app-panel` (legacy, mantener solo por compatibilidad con usos directos)

**IMPORTANTE**: Las únicas clases globales "fuente de verdad" son `.btn-*` y `.ctrl-field`. TODO lo demás (cards, paneles, filas, items, badges, etc.) se define en `componentStyles.ts` usando utilidades + vars.

## 3) Mapa de estilos por componente

Archivo: `src/design/componentStyles.ts`

Estructura genérica (sin dependencias de dominio):

- **layout**: fondos de app/página/panel.
- **typography**: `pageTitle`, `pageSubtitle`, `sectionTitle`, `cardTitle`, `bodyText`, `smallMetaText`.
- **containers**: `cardBase`, `cardElevated`, `cardMetric`, `panelBase`.
- **items**: `itemCard`, `itemCardHighlight`, `itemRow`, `itemRowTone`.
- **controls**: `inputDefault`, `inputSm`, `inputUnderline`, `selectDefault`.
- **buttons**: `primary`, `secondary`, `ghost`, `outline`, `danger`.
- **tabs**: `tabsSegmentedContainer/Item/ItemActive`, `tabsUnderlineContainer/Item/ItemActive`.
- **nav**: `menuSectionTitle`, `menuItem`, `menuItemActive`.
- **empty**: `emptyIcon`, `emptyText`.
- **status**: `badgeDefault`, `badgeInfo`, `badgeSuccess`, `badgeWarning`, `badgeDanger`.
- **components**: alias hacia los grupos genéricos (compatibilidad hacia atrás).

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
4. Cards/Paneles: 
   - Uso directo: `className="app-card"` para el contenedor, `className="card-header"` / `className="card-content"` para secciones internas.
   - Variantes: usar `componentStyles.containers.*` (cardBase, cardElevated, cardMetric, panelBase) o `componentStyles.items.*` (itemCard, itemCardHighlight, itemRow). Todas se basan en `.app-card` y solo añaden variantes de color/borde.
   - El radius, padding y shadow se controlan desde tokens CSS (`components.card.*`) sin tocar JSX. Las clases usan `!important` para anular utilidades Tailwind (`rounded-*`, `p-*`, `shadow-*`).
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
- Tokens específicos de card: `components.card.*` (padding X/Y, radius, shadow, gap) - ver sección 6) Cards y Paneles.
- Vars generadas:
  - `--radius-card`, `--radius-ctrl`, `--shadow-card`, `--space-*`, `--gap-*`.
  - Card específicas: `--card-padding-x/y`, `--card-header-padding-x/y`, `--card-content-padding-x/y`, `--card-footer-padding-x/y`, `--card-gap`.
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
- **Tokens específicos de card** (`designConfig.ts` → `components.card.*`):
  - `padding.x/y`: padding base de la card (horizontal/vertical)
  - `padding.header.x/y`: padding específico del header
  - `padding.content.x/y`: padding específico del content
  - `padding.footer.x/y`: padding específico del footer
  - `radius`: radio de las esquinas (mapeado a `--radius-card`)
  - `shadow`: sombra (mapeado a `--shadow-card`)
  - `gap`: gap interno entre elementos (mapeado a `--card-gap`)
- **CSS vars generadas**:
  - `--radius-card`: radio de las esquinas
  - `--card-padding-x/y`: padding base
  - `--card-header-padding-x/y`: padding del header
  - `--card-content-padding-x/y`: padding del content
  - `--card-footer-padding-x/y`: padding del footer
  - `--shadow-card`: sombra
  - `--card-gap`: gap interno
- **Clases semánticas** (`index.css` → `@layer components`):
  - `.app-card`: clase base universal de tarjeta. Incluye radius, padding y shadow desde tokens CSS con `!important` para anular utilidades Tailwind (`rounded-*`, `p-*`, `shadow-*`) sin tocar JSX.
  - `.card-header`: sección de encabezado con padding específico desde tokens.
  - `.card-content`: sección de contenido con padding específico desde tokens.
  - `.card-footer`: sección de pie con padding específico desde tokens.
  - `.app-panel`: panel base (legacy, mantener por compatibilidad).
- **Uso recomendado**:
  - Para cualquier card nueva: `className="app-card"` + `className="card-header"` / `className="card-content"` según estructura.
  - El 100% del look (radius, padding, shadow) se controla desde el panel de diseño/presets sin tocar JSX.
  - Variantes de color/borde: usar `componentStyles.containers.*` o `componentStyles.items.*` que se basan en `.app-card` y solo añaden variantes de color/borde.
- **Variantes en componentStyles**:
  - **containers**: `cardBase`, `cardElevated`, `cardMetric`, `panelBase` (todos usan `.app-card` como base).
  - **items**: `itemCard`, `itemCardHighlight`, `itemRow`, `itemRowTone`.

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

4) Auditoría de Accesibilidad (A11Y)
- Ejecutar quick-check desde `/design` → pestaña "QA" → "A11Y Quick-Check"
- Verificaciones automáticas:
  - **H1 único**: Solo debe haber 1 `<h1>` por página (usar `PageHeader` con `componentStyles.typography.pageTitle`)
  - **Botones etiquetados**: Todos los botones deben tener:
    - Texto visible, O
    - `aria-label`, O
    - `aria-labelledby`, O
    - `title` (como fallback)
  - **Inputs etiquetados**: Todos los inputs deben tener:
    - `<label>` asociado con `htmlFor`/`id`, O
    - `aria-label`, O
    - `aria-labelledby`
  - **Focus visible**: Todos los elementos enfocables deben tener ring focus visible (usar `focus-brand` o clases del DS)
  - **Contraste**: El sistema usa tokens con contraste WCAG AA+; verificar con herramientas externas si es necesario

**Buenas prácticas al usar el sistema de diseño:**
- Botones solo con iconos: siempre añadir `aria-label="Descripción de la acción"`
- Inputs: usar `FormField` + `FormLabel` + `FormControl` del sistema de formularios, o asociar manualmente `<label htmlFor={id}>`
- Múltiples H1: usar `PageHeader` que genera un único H1; títulos secundarios usar `h2` con `componentStyles.typography.sectionTitle`
- Focus: el sistema proporciona `--focus-ring` y clases `.btn-*`/`.ctrl-field` con focus visible; no desactivar `outline` sin proporcionar alternativa visual

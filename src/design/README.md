# Sistema de Diseño – Studia

Origen único de verdad para estilos, tokens y clases semánticas.

## 1) Tokens

Archivo: `src/design/designSystem.ts`

Expone categorías:
- colors: `primary`, `primarySoft`, `secondary`, `background`, `surface`, `surfaceMuted`, `textPrimary`, `textSecondary`, `textMuted`, `success`, `warning`, `danger`, `border*`, `ring`.
- typography: familias, tamaños y line-heights.
- spacing: `spacingXs..spacingXl` (vinculado a densidad).
- radius: `radiusSm..radiusFull`.
- shadows: `shadowSm`, `shadowMd` (→ `--shadow-card`), `shadowLg`.
- motion: `transitionBase/Fast/Slow`.

Los valores se conectan a variables CSS que genera `DesignProvider` (desde `designConfig.ts`) y a los colores HSL definidos en `index.css` (para Tailwind).

## 2) Variables CSS globales

Archivo: `src/index.css`

- Define las vars HSL base (`--background`, `--foreground`, `--primary`, etc.) y tema dark por `.dark`.
- Capa `@layer components` centraliza clases semánticas y controles:
  - `.app-card`, `.app-panel`
  - `.ctrl-field`
  - `.btn-*` (`btn-primary`, `btn-secondary`, `btn-outline`, `btn-ghost`, `btn-danger`, tamaños `btn-sm/md/lg/icon`)

Usar estas clases en lugar de estilos inline o utilidades dispersas cuando el elemento sea semánticamente un botón, tarjeta o panel.

## 3) Lista de estilos por componente

Archivo: `src/design/componentStyles.ts`

Mapa centralizado para referenciar combinaciones de clases:
- layout: fondos de app/página/panel.
- typography: `pageTitle`, `pageSubtitle`, `sectionTitle`, `cardTitle`, `bodyText`, `smallMetaText`.
- components:
  - Botones: `buttonPrimary`, `buttonSecondary`, `buttonOutline`, `buttonGhost`.
  - Inputs/Selects: `inputDefault`, `inputSm`, `inputLg`, `selectDefault` (todos basados en `ctrl-field`).
  - Cards: `cardBase`, `cardElevated`, `cardKpi`, `panelBase`.
  - Agenda: `cardStudent`, `cardAsignacion`, `cardPlan`, `cardSemana`, `panelSesion`, `toneRowPlan`, `toneRowSemana`.
  - Tabs (estandarizadas): `tabsSegmented*` y `tabsUnderline*`.
  - Vacíos: `emptyStateIcon`, `emptyStateText`.
  - Menú lateral: `menuSectionTitle`, `menuItem`, `menuItemActive`.

Objetivo: que un cambio de look se resuelva tocando este archivo y/o los tokens, no componentes sueltos.

## 4) Componentes base

- `PageHeader` (DS): ya consume `componentStyles.typography.pageTitle/pageSubtitle`. Usa `filters`/`actions` para slots.
- `Tabs` (DS) y `SegmentedTabs` (UI): consumen `componentStyles.components.tabs*` en ambas variantes.
- `Card` (DS y UI): preferir `Card` con clases semánticas (`app-card` / `panelBase` vía `componentStyles`) en lugar de utilidades sueltas.
- `Input` y `Select`: basados en `ctrl-field` vía `useClassTokens` o directo (`componentStyles.components.inputDefault`).

## 5) Pautas de uso

1. Headers:
   - Usar siempre `PageHeader` con `icon`, `title`, `subtitle` y `filters`/`actions` cuando proceda.
2. Tabs:
   - Usar `Tabs` (o `SegmentedTabs`) y no clases in situ; el estado activo es `primarySoft + borde primary` (contraste alto sin salto a sólido).
3. Botones:
   - Preferir `btn-*` semánticos y tamaños `btn-sm/md/lg` (o `Button` con `variant/size` que mapean a estas clases).
4. Cards y paneles:
   - `cardBase`/`cardElevated` para contenedores; `cardKpi` para KPIs; `panelBase` para bloques de filtros o contenedores neutros.
5. Inputs subrayados (buscadores):
   - Usar patrón subrayado con `border-b-2 border-[var(--color-border-strong)] text-ui placeholder:text-ui/60`.
6. Contraste:
   - Evitar `text-muted` en textos primarios; usar `text-ui` o `text-ui/80`. Reservar `text-muted` para meta o contenido desactivado.
7. Inline styles:
   - Evitarlos salvo casos de layout dinámico (ej. width basado en data). Para paddings/márgenes, usar utilidades. Para aspect ratios, `pb-[56.25%]`, etc.

## 6) Checklist por página (resumen)

- Usa `PageHeader`.
- Tabs con `Tabs` unificado.
- Controles de filtro sobre `panelBase`.
- Contraste: textos base `text-ui`/`text-ui/80`, no `text-muted`.
- Botones con `btn-*` y tokens.
- Cards con `app-card` / variantes desde `componentStyles`.

## 7) Dónde tocar para re-temear

1. `designSystem.ts`: cambiar paleta, tipografía, radios, sombras.
2. `designConfig.ts` → `DEFAULT_DESIGN` y `generateCSSVariables`: añade/ajusta variables (p. ej. `primarySoft`, `surfaceMuted`).
3. `componentStyles.ts`: ajustar combinaciones por tipo de UI.
4. `index.css` (`@layer components`): estilos semánticos globales (`.btn-*`, `.ctrl-field`, `.app-card/panel`).



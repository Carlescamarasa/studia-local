# Sistema de Diseño – Studia

Origen único de verdad para estilos, tokens y clases semánticas.

## 1) Tokens

Archivo: `src/design/designSystem.ts`

Categorías:
- colors: `primary`, `primarySoft`, `secondary`, `background`, `surface`, `surfaceMuted`, `textPrimary`, `textSecondary`, `textMuted`, `success`, `warning`, `danger`, `border*`, `ring`.
- typography: familias, tamaños y line-heights.
- spacing: `spacingXs..spacingXl` (dependiente de densidad).
- radius: `radiusSm..radiusFull`.
- shadows: `shadowSm`, `shadowMd` (→ `--shadow-card`), `shadowLg`.
- motion: `transitionBase/Fast/Slow`.

Los valores se conectan a variables CSS que genera `DesignProvider` (desde `designConfig.ts`) y a las HSL base definidas en `src/index.css` (incluye el bloque `.dark`).

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
  - Cards: `cardBase`, `cardElevated`, `cardKpi`, `panelBase`.
  - Agenda: `cardStudent`, `cardAsignacion`, `cardPlan`, `cardSemana`, `panelSesion`, `toneRowPlan`, `toneRowSemana`.
  - Tabs: `tabsSegmented*` y `tabsUnderline*`.
  - Vacíos: `emptyStateIcon`, `emptyStateText`.
  - Menú: `menuSectionTitle`, `menuItem`, `menuItemActive`.

Objetivo: que un re-temeado se resuelva aquí y/o en tokens, no en componentes aislados.

## 4) Componentes base conectados

- `PageHeader` (DS): usa `componentStyles.typography.pageTitle/pageSubtitle`, `filters`/`actions`.
- `Tabs` (DS): variantes segmentada/underline (usa `componentStyles.components.tabs*`).
- `Card` (UI/DS): preferir `Card` + `app-card/panelBase` via `componentStyles`.
- `Input`, `SelectTrigger`: basados en `ctrl-field` (via `useClassTokens`).

## 5) Pautas de uso

1. Headers: usar `PageHeader`.
2. Tabs: `Tabs` unificado; estado activo = `primarySoft` + borde `primary`.
3. Botones: `btn-*` y tamaños (`btn-sm/md/lg`) o `Button` con `variant/size`.
4. Cards/Paneles: `cardBase/cardElevated`, `cardKpi`, `panelBase`.
5. Buscadores (subrayado): `border-b-2 border-[var(--color-border-strong)] text-ui placeholder:text-ui/60`.
6. Contraste: no usar `text-muted` en contenido primario; usar `text-ui`/`text-ui/80`. Reservar `text-muted` para meta/desactivado.
7. Inline styles: evitarlos salvo layout dinámico (anchos basados en datos). Preferir utilidades o estilos centralizados.

## 6) Checklist por página

- `PageHeader` presente.
- Tabs con `Tabs`.
- Filtros sobre `panelBase`.
- Contraste: `text-ui`/`text-ui/80` (no `text-muted` para contenido).
- Botones con `btn-*`.
- Cards con `app-card` / variantes en `componentStyles`.

## 7) Re-temear (Light/Dark)

1. `designSystem.ts`: paleta, tipografía, radios, sombras.
2. `designConfig.ts`:
   - `DEFAULT_DESIGN` y `generateCSSVariables` (camelCase → kebab-case).
   - Genera escala de marca `--brand-50..--brand-900` a partir de `brandHue`.
3. `componentStyles.ts`: combinaciones por tipo de UI.
4. `index.css` (`@layer components`): clases semánticas (`.btn-*`, `.ctrl-field`, `.app-card/panel`).

El `DesignProvider` añade/quita `.dark` en `<html>` según `design.theme`, activando el tema oscuro y aplicando todas las CSS vars en runtime.

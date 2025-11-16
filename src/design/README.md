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
  - Cards: `cardBase`, `cardElevated`, `cardKpi`, `panelBase`.
  - Agenda: `cardStudent`, `cardAsignacion`, `cardPlan`, `cardSemana`, `panelSesion`, `toneRowPlan`, `toneRowSemana`.
  - Tabs: `tabsSegmented*` y `tabsUnderline*`.
  - Vacíos: `emptyStateIcon`, `emptyStateText`.
  - Menú: `menuSectionTitle`, `menuItem`, `menuItemActive`.

Objetivo: que un re-temeado se resuelva aquí y/o en tokens, no en componentes aislados.

## 4) Componentes base conectados

- `PageHeader` (DS): usa `componentStyles.typography.pageTitle/pageSubtitle`, `filters`/`actions`.
- `Tabs` (DS): variantes segmentada/underline (usa `componentStyles.components.tabs*`). La variante segmentada expone `data-testid="tabs-segmented"` para QA.
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
- Tokens (colors): `primary`, `primarySoft`, `secondary`, `background`, `surface`, `surfaceElevated`, `surfaceMuted`, `text{primary,secondary,muted,inverse}`, `border{default,muted,strong}`, `ring`.
- Vars generadas: `--color-*` (kebab-case), p. ej. `--color-primary-soft`, `--color-surface-elevated`.
- HSL base (`index.css`):
  - Light y `.dark` para: `--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, etc.
- Escala de marca:
  - `--brand-50..--brand-900` (HSL), derivada de `brandHue`. Úsese para realces/accent.

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
- Clases: `.app-card`, `.app-panel`.
- Atributos:
  - `background-color: var(--color-surface|surface-elevated)`
  - `color: var(--color-text-primary)`
  - `border: var(--color-border-strong|muted)`
  - `border-radius: var(--radius-card)`
  - Sombra (cards): `var(--shadow-card)`
- Variantes (componentStyles.components):
  - `cardBase`, `cardElevated`, `cardKpi`, `panelBase`, plus Agenda.

7) Tabs
- `Tabs` (DS) → `segmented`/`underline` usando `componentStyles.components.tabs*`. La variante segmentada expone `data-testid="tabs-segmented"` para QA.
- Estados activos con `primarySoft` + borde `primary`.

8) Menú lateral
- `menuSectionTitle`, `menuItem`, `menuItemActive` (componentStyles.components).

9) Tema Light/Dark
- `DesignProvider` alterna `.dark` en `<html>` según `design.theme`.
- Componente `/design` permite seleccionar y aplicar el preset. En la pestaña “QA” se incluyen fixtures estáticos (`.page-header`, `.btn-primary`, `.badge`, `.app-panel`, `[data-testid="tabs-segmented"]`) para auditoría consistente.

---

## 9) Atributos no estandarizados (a vigilar y migrar)

Patrones detectados en el proyecto que conviene normalizar hacia tokens/clases semánticas:

1) `text-muted` en contenido primario (fondos claros)
- Riesgo de contraste bajo. Sustituir por `text-ui` o `text-ui/80`.
- Áreas comunes: meta de tarjetas, contadores “Total: …”, textos de ayuda en paneles.

2) Estilos de controles duplicados
- No añadir `h-10`, `rounded-xl`, `border-ui` ad-hoc a Inputs/Selects.
- Confiar en `.ctrl-field` (padding, radius, focus ring, border).

3) Colores literales Tailwind fuera de tokens
- Ej.: `bg-slate-50`, `text-gray-500/600/700`, `border-gray-200`.
- Sustituir por tokens equivalentes:
  - Fondo claro → `var(--color-surface|surface-elevated|surface-muted)`
  - Texto meta → `text-ui/80`
  - Bordes → `var(--color-border-default|strong)`

4) `border-ui` u otras clases no mapeadas a tokens
- Alinear con `border-[var(--color-border-*)]` según contexto (`default/muted/strong`). Evitar `border-ui` legacy.

5) Uso de escala `brand` en texto de cuerpo
- Reservar `--brand-*` para acentos/badges/borders ligeros, no para cuerpo.

6) Inline styles no dinámicos
- Evitarlos para padding/margins/width/height fijos. Preferir utilidades o clases de `componentStyles`.

7) Clases heredadas/obsoletas
- Evitar `icon-tile`, `page-header-*`. Usar `PageHeader` + `componentStyles.typography`. En `/design` se mantiene `icon-tile` solo como fixture QA.

Sugerencias de auditoría (expresiones útiles):
- Restos `text-muted`: `rg -n "text-muted" src/`
- Colores literales: `rg -n "text-(gray|slate|stone)-[3-9]00" src/` y `rg -n "bg-(gray|slate|stone)-[1-9]0" src/`
- Control styles duplicados: `rg -n "h-10|rounded-xl|border-ui" src/pages src/components`

---

## 10) Procedimiento de auditoría

1) QA Visual (runtime)
- `/design` → pestaña “QA”. Ejecuta verificaciones sobre:
  - Vars críticas: `--radius-card/ctrl`, `--shadow-card`, `--focus-ring`.
  - Clases en `<body>`: `ds-serif`, densidad.
  - Presencia de patrones esperados (selectores actualizados: `.page-header`, `.btn-primary`, `.badge`, `.app-panel`, `[data-testid="tabs-segmented"]`).
- `QAVisualContent` admite `embedded` para integrarlo en otras vistas si se quiere. En `/design` (pestaña “QA”) se añaden fixtures para detección estable.

2) Greps dirigidos (estáticos)
- Buscar usos no estandarizados (ver expresiones arriba).
- Priorizar reemplazos en páginas de mayor uso (Agenda, Estadísticas, Asignaciones).

3) Validación multi-tema
- Cambiar Light/Dark en `/design` y revisar:
  - Contraste en cards/paneles, inputs, tabs, badges y tablas.
  - Headers claros con `text-[var(--color-primary)]`.

4) Documentar decisiones
- Cualquier caso especial de color/contraste que se mantenga fuera de tokens debe anotarse aquí con justificación.

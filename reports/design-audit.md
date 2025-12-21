# Design System Audit Report

**Generated:** 12/21/2025, 2:40:02 AM

## Executive Summary

- **Total files analyzed:** 342
- **Files with issues:** 226
- **Total hardcoded classes:** 8856
- **Total inline styles:** 31
- **Orphaned CSS variables:** 46
- **Missing CSS variables:** 10

## Top 20 Offenders

Files with the most hardcoded styles that should use design tokens:

| Rank | File | Hardcoded Classes | Inline Styles | Total |
|------|------|-------------------|---------------|-------|
| 1 | `pages/StudiaConceptPage.jsx` | 505 | 0 | 505 |
| 2 | `pages/hoy.jsx` | 437 | 0 | 437 |
| 3 | `pages/design.jsx` | 327 | 0 | 327 |
| 4 | `pages/ejercicios.jsx` | 317 | 0 | 317 |
| 5 | `components/editor/ExerciseEditor.jsx` | 265 | 0 | 265 |
| 6 | `design/componentStyles.ts` | 248 | 0 | 248 |
| 7 | `pages/estadisticas.jsx` | 191 | 0 | 191 |
| 8 | `pages/studia.jsx` | 188 | 0 | 188 |
| 9 | `pages/testseed.jsx` | 175 | 0 | 175 |
| 10 | `pages/agenda.jsx` | 174 | 0 | 174 |
| 11 | `pages/semana.jsx` | 156 | 0 | 156 |
| 12 | `pages/asignacion-detalle.jsx` | 140 | 0 | 140 |
| 13 | `components/editor/SessionEditor.jsx` | 139 | 0 | 139 |
| 14 | `components/editor/PlanEditor.jsx` | 135 | 0 | 135 |
| 15 | `components/design/HardcodeInspector.jsx` | 108 | 0 | 108 |
| 16 | `components/asignaciones/CrearAsignacionWizard.jsx` | 106 | 0 | 106 |
| 17 | `components/common/MediaLinksInput.jsx` | 101 | 0 | 101 |
| 18 | `pages/adaptar-asignacion.jsx` | 95 | 0 | 95 |
| 19 | `components/design/DesignStatusBlock.jsx` | 94 | 0 | 94 |
| 20 | `pages/admin/AppVersionContent.jsx` | 92 | 0 | 92 |

## Orphaned CSS Variables

These variables are emitted by `designConfig.ts` but never consumed in CSS:

- `--radius-controls`
- `--radius-pill`
- `--radius-modal`
- `--radius`
- `--radius-base`
- `--shadow-card`
- `--shadow-control`
- `--space-base`
- `--space-sm`
- `--space-md`
- `--space-lg`
- `--space-xl`
- `--card-gap`
- `--table-cell-px`
- `--table-cell-py`
- `--grid-columns`
- `--grid-gap-x`
- `--grid-gap-y`
- `--section-padding-y`
- `--focus-ring-offset`
- `--font-size-scale`
- `--font-size-sm`
- `--font-size-lg`
- `--font-size-xl`
- `--sidebar-item-muted-text`
- `--ctrl-field-height`
- `--ctrl-field-border`
- `--ctrl-field-radius`
- `--btn-height`
- `--input-border-color`
- `--card-radius`
- `--header-inner-padding-x`
- `--studia-page-max-width`
- `--studia-header-margin-bottom`
- `--studia-card-max-width`
- `--studia-card-padding-x`
- `--studia-card-padding-y`
- `--studia-card-radius`
- `--card-foreground`
- `--popover-foreground`
- `--secondary-foreground`
- `--accent`
- `--accent-foreground`
- `--destructive`
- `--destructive-foreground`
- `--ring`

## Missing CSS Variables

These variables are consumed in CSS but never emitted by `designConfig.ts`:

- `--color-text-primary`
- `--color-text-secondary`
- `--color-primary`
- `--color-border-strong`
- `--color-primary-soft`
- `--color-surface`
- `--color-border-muted`
- `--color-border-default`
- `--color-text-inverse`
- `--color-surface-muted`

## Semantic Classes Coverage

### Defined Classes

- `.app-card`
- `.ui-card`
- `.app-panel`
- `.ui-panel`
- `.ui-table-shell`
- `.btn`
- `.btn-primary`
- `.btn-secondary`
- `.btn-outline`
- `.btn-ghost`
- `.ctrl-field`
- `.app-sidebar`
- `.page-header-shell`
- `.page-header-inner`

## Actionable Recommendations

### Quick Wins (High Impact, Low Effort)

1. **Wrap cards with semantic classes**: Add `.app-card` or `.ui-card` to card components
2. **Replace hardcoded radius**: Use `rounded-[var(--radius-card)]` instead of `rounded-lg`
3. **Use button classes**: Apply `.btn-primary`, `.btn-secondary` instead of custom Tailwind

### Medium Effort

1. **Refactor top 10 offenders**: Focus on files with most hardcoded styles
2. **Add table wrappers**: Wrap tables with `.ui-table-shell` for consistent styling
3. **Clean up orphaned variables**: Remove unused CSS variables from `designConfig.ts`

### Structural Changes

1. **Create sidebar semantic class**: Add `.app-sidebar` for consistent sidebar styling
2. **Implement header tokens**: Create token-driven header system
3. **Establish token naming convention**: Standardize token paths and fallback chains

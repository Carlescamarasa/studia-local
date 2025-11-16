import { useDesign } from "@/components/design/DesignProvider";
import { DEFAULT_DESIGN, getSpacingForDensity } from "./designConfig";

/**
 * Hook para obtener clases dinámicas basadas en tokens de diseño
 * Útil para componentes que necesitan adaptarse a la configuración runtime
 */
export function useClassTokens() {
  const designContext = useDesign();
  // Usar design del contexto, o DEFAULT_DESIGN como fallback
  const design = designContext?.design || DEFAULT_DESIGN;
  
  // Obtener valores de radius
  const radiusCard = design?.layout?.radius?.card || 'lg';
  const radiusCtrl = design?.layout?.radius?.controls || 'lg';
  const radiusPill = design?.layout?.radius?.pill || 'lg';
  
  // Obtener valores de spacing según densidad usando helper del config
  const density = design?.layout?.density || 'normal';
  const densitySpacing = getSpacingForDensity(density);
  const spacing = {
    header: densitySpacing.lg || '1rem',
    content: densitySpacing.lg || '1rem',
  };
  
  return {
    // Cards y paneles - usando CSS variables
    card: `rounded-[var(--radius-card)] shadow-[var(--shadow-card)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]`,
    panel: `rounded-[var(--radius-ctrl)] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]`,
    ctrl: `rounded-[var(--radius-ctrl)]`,
    pill: `rounded-[var(--radius-pill)]`,
    
    // Spacing
    headerPad: `p-[var(--card-padding-header)]`,
    contentPad: `p-[var(--card-padding-content)]`,
    
    // Focus ring
    focus: `focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--focus-ring)]`,
    
    // Controles de formulario - conectados al Design System
    control: 'ctrl-field',
    controlSm: 'ctrl-field ctrl-field-sm',
    controlLg: 'ctrl-field ctrl-field-lg',
    
    // Helpers condicionales
    isDense: design?.layout?.density === 'compact',
    isNormal: design?.layout?.density === 'normal',
    isSpacious: design?.layout?.density === 'spacious',
    isSerif: design?.typography?.serifHeadings || false,
    shadowLevel: design?.layout?.shadow || 'md',
    
    // Acceso directo a valores del diseño
    design,
  };
}

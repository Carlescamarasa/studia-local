import { useDesign } from "@/components/design/DesignProvider";

/**
 * Hook para obtener clases dinámicas basadas en tokens de diseño
 * Útil para componentes que necesitan adaptarse a la configuración runtime
 */
export function useClassTokens() {
  const { config } = useDesign();
  
  return {
    card: `rounded-[var(--radius-card)] shadow-[var(--shadow-card)] border-ui bg-white`,
    panel: `rounded-[var(--radius-ctrl)] border-ui bg-white`,
    ctrl: `rounded-[var(--radius-ctrl)]`,
    pill: `rounded-[var(--radius-pill)]`,
    headerPad: `p-[var(--space-card-header)]`,
    contentPad: `p-[var(--space-card-content)]`,
    focus: `focus-visible:outline-none focus-visible:ring-0 focus-visible:[box-shadow:var(--focus-ring)]`,
    
    // Controles de formulario - conectados al Design System
    control: 'ctrl-field',
    controlSm: 'ctrl-field ctrl-field-sm',
    controlLg: 'ctrl-field ctrl-field-lg',
    
    // Helpers condicionales
    isDense: config.density === 'compact',
    isSerif: config.serifHeadings,
    shadowLevel: config.shadow,
  };
}
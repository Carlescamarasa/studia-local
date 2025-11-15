
/**
 * @typedef {'comfortable' | 'compact'} Density
 * @typedef {'lg' | 'xl' | '2xl'} RadiusScale
 * @typedef {'none' | 'card' | 'md'} Shadow
 * @typedef {'orange' | 'system'} FocusStyle
 * 
 * @typedef {Object} RadiusConfig
 * @property {RadiusScale} card - Border radius para cards
 * @property {'lg' | 'xl'} controls - Border radius para controles
 * @property {'lg'} pill - Border radius para pills
 * 
 * @typedef {Object} DesignConfig
 * @property {number} [brandHue] - Tono de marca (24-32 para naranja)
 * @property {boolean} serifHeadings - Usar serif en headings
 * @property {RadiusConfig} radius - Configuración de radios
 * @property {Shadow} shadow - Nivel de sombras
 * @property {Density} density - Densidad de espaciado
 * @property {FocusStyle} focus - Estilo de focus ring
 */

/**
 * Configuración por defecto del Design System
 * @type {DesignConfig}
 */
export const DEFAULT_DESIGN = {
  brandHue: 26,
  serifHeadings: true,
  radius: {
    card: 'lg',
    controls: 'lg',
    pill: 'lg'
  },
  shadow: 'md',
  density: 'compact',
  focus: 'orange',
};

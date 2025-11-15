// Estructura compatible con design.jsx y DesignPresets.jsx
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
  // Campos adicionales para compatibilidad
  theme: "light",
  primaryColor: "#4F46E5",
  secondaryColor: "#6366F1",
  typography: {
    fontFamily: "Inter, sans-serif",
    baseSize: 16,
  },
  layout: {
    sidebarCollapsed: false,
    density: "comfortable",
  },
};

// Re-exportar funciones de DesignPresets para compatibilidad
export { getAllPresets, deleteCustomPreset, isBuiltInPreset } from './DesignPresets';
// saveCustomPreset tiene firma diferente en DesignPresets, se exporta desde allí directamente
export { saveCustomPreset } from './DesignPresets';
  
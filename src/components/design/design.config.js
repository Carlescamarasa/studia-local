export const DEFAULT_DESIGN = {
    theme: "light", // o "dark"
    primaryColor: "#4F46E5",
    secondaryColor: "#6366F1",
  
    typography: {
      fontFamily: "Inter, sans-serif",
      baseSize: 16,
    },
  
    layout: {
      sidebarCollapsed: false,
      density: "comfortable", // "compact" | "comfortable"
    },
  };
  
  export function getAllPresets() {
    return [DEFAULT_DESIGN];
  }
  
  export function saveCustomPreset(preset) {
    try {
      localStorage.setItem("custom_design_preset", JSON.stringify(preset));
    } catch (e) {
      console.error("Failed to save design preset", e);
    }
  }
  
  export function deleteCustomPreset() {
    try {
      localStorage.removeItem("custom_design_preset");
    } catch (e) {
      console.error("Failed to delete design preset", e);
    }
  }
  
  export function isBuiltInPreset(presetName) {
    return presetName === "DEFAULT";
  }
  
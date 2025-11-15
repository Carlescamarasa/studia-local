import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_DESIGN,
  getAllPresets,
  saveCustomPreset,
  deleteCustomPreset,
  isBuiltInPreset,
} from "./design.config";

const DesignContext = createContext(null);

export function useDesign() {
  return useContext(DesignContext);
}

export function DesignProvider({ children }) {
  const [design, setDesign] = useState(() => {
    try {
      const custom = localStorage.getItem("custom_design_preset");
      if (custom) return JSON.parse(custom);
    } catch (_) {}
    return DEFAULT_DESIGN;
  });

  // Guardar preset cuando cambie (guardar como preset activo en localStorage)
  useEffect(() => {
    try {
      localStorage.setItem("custom_design_preset", JSON.stringify(design));
    } catch (e) {
      console.error("Failed to save design preset", e);
    }
  }, [design]);

  const value = useMemo(
    () => ({
      design,
      setDesign,
      // Aliases para compatibilidad con código existente
      config: design,
      setConfig: setDesign,
      reset: () => setDesign(DEFAULT_DESIGN),
      // Funciones originales
      presets: getAllPresets(),
      resetDesign: () => setDesign(DEFAULT_DESIGN),
      deleteDesignPreset: () => {
        deleteCustomPreset();
        setDesign(DEFAULT_DESIGN);
      },
      isBuiltInPreset,
    }),
    [design]
  );

  return (
    <DesignContext.Provider value={value}>
      {children}
    </DesignContext.Provider>
  );
}

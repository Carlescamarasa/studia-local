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

  // Guardar preset cuando cambie
  useEffect(() => {
    saveCustomPreset(design);
  }, [design]);

  const value = useMemo(
    () => ({
      design,
      setDesign,
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

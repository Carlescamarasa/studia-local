import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

// Migration Logic
import { localDataClient } from './api/localDataClient';
import { Bloque, RegistroBloque } from './features/shared/types/domain';

// @ts-expect-error
window.migrateSkills = async function () {
  console.log("Starting Migration: Skills to RegistrosBloque...");
  try {
    const bloques = await localDataClient.entities.Bloque.list() as Bloque[];
    const bloqueMap = new Map<string, string[]>();
    bloques.forEach(b => {
      if (b.code) bloqueMap.set(b.code, b.skillTags || []);
    });

    const registros = await localDataClient.entities.RegistroBloque.list() as RegistroBloque[];
    let updatedCount = 0;

    for (const reg of registros) {
      if (reg.skills && reg.skills.length > 0) continue;
      const skills = bloqueMap.get(reg.code);

      if (skills && skills.length > 0) {
        // Use localDataClient.entities to respect Remote vs Local mode
        await localDataClient.entities.RegistroBloque.update(reg.id, { skills: skills });
        updatedCount++;
      }
    }
    console.log(`Migration Complete. Updated ${updatedCount} records.`);
  } catch (e) {
    console.error("Migration Failed", e);
  }
};

console.log("🛠️ DevTools: Run `window.migrateSkills()` to backfill skills data.");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

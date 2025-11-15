import React from "react";
import { getCurrentUser } from "@/api/localDataClient";

export default function RoleBootstrap({ children }) {
  const user = getCurrentUser();

  // Si no hay usuario local → redirigir a /local
  if (!user) {
    return null;
  }

  return children;
}

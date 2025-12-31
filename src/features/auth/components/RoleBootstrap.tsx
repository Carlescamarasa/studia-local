import React from "react";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";

export default function RoleBootstrap({ children }: { children: React.ReactNode }) {
  const effectiveUser = useEffectiveUser();

  // Si no hay usuario efectivo, no renderizar nada
  // (en modo Supabase, si el usuario no existe en datos locales, effectiveUser será null)
  if (!effectiveUser) {
    return null;
  }

  return children;
}

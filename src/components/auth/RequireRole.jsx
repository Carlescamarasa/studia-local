import React, { useEffect } from "react";
import { getCurrentUser } from "@/api/localDataClient";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { roleHome } from "./roleMap";

/**
 * Componente guard que valida acceso por rol.
 * Si el usuario no tiene uno de los roles permitidos, redirige a su home sin mostrar "Acceso denegado".
 * Respeta simulación de usuario desde sessionStorage.
 */
export default function RequireRole({ children, anyOf = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Usar getCurrentUser() local en lugar de useQuery
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser) return;

    // Detectar simulación
    const simulatingUser = sessionStorage.getItem('simulatingUser');
    const effectiveRole = simulatingUser 
      ? JSON.parse(simulatingUser).rolPersonalizado 
      : currentUser.rolPersonalizado;

    // Verificar si el rol está permitido
    if (!anyOf.includes(effectiveRole)) {
      const targetHome = roleHome[effectiveRole] || roleHome.ESTU;
      const targetPath = targetHome.replace(/^\//, '');
      
      // Evitar bucle: no redirigir si ya estamos en nuestro home
      if (location.pathname !== targetHome) {
        navigate(createPageUrl(targetPath), { replace: true });
      }
    }
  }, [currentUser, anyOf, navigate, location.pathname]);

  // Detectar rol efectivo
  const simulatingUser = sessionStorage.getItem('simulatingUser');
  const effectiveRole = simulatingUser 
    ? JSON.parse(simulatingUser).rolPersonalizado 
    : currentUser?.rolPersonalizado;

  // Si tiene acceso, renderizar children
  if (anyOf.includes(effectiveRole)) {
    return <>{children}</>;
  }

  // Si no tiene acceso, no renderizar nada (la redirección ya se hizo en useEffect)
  return null;
}
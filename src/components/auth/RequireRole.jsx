import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (isLoading || !currentUser) return;

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
  }, [currentUser, isLoading, anyOf, navigate, location.pathname]);

  // Mientras carga, mostrar loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

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
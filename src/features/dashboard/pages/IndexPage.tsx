import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { createPageUrl } from "@/utils";
import { roleHome } from "@/components/auth/roleMap";
import { Clock } from "lucide-react";

export default function IndexPage() {
  const navigate = useNavigate();
  const { user, appRole, loading } = useAuth();
  
  useEffect(() => {
    // Esperar a que termine de cargar la autenticación
    if (loading) return;
    
    if (user) {
      const targetPage = roleHome[appRole] || roleHome.ESTU;
      const normalizedTarget = targetPage.split('?')[0].replace(/\/$/, '') || '/';
      const normalizedCurrent = window.location.pathname.split('?')[0].replace(/\/$/, '') || '/';
      
      // Solo redirigir si no estamos ya en la página objetivo
      if (normalizedCurrent !== normalizedTarget) {
        const pageName = targetPage.replace(/^\//, '');
        navigate(createPageUrl(pageName), { replace: true });
      }
    } else {
      // Si no hay usuario autenticado, ir a login
      const normalizedCurrent = window.location.pathname.split('?')[0].replace(/\/$/, '') || '/';
      if (normalizedCurrent !== '/login') {
        navigate('/login', { replace: true });
      }
    }
  }, [user, appRole, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-surface-muted)]">
      <div className="flex flex-col items-center gap-4">
        <Clock className="w-12 h-12 text-brand-500 animate-spin" />
        <p className="text-ui/80">Redirigiendo...</p>
      </div>
    </div>
  );
}
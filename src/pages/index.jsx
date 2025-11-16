import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/api/localDataClient";
import { createPageUrl } from "@/utils";
import { roleHome } from "@/components/auth/roleMap";
import { Clock } from "lucide-react";

export default function IndexPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Usar getCurrentUser() local en lugar de useQuery
    const currentUser = getCurrentUser();
    
    if (currentUser) {
      const simulatingUser = sessionStorage.getItem('simulatingUser');
      const role = simulatingUser 
        ? JSON.parse(simulatingUser).rolPersonalizado 
        : currentUser.rolPersonalizado;
      
      const originalPath = sessionStorage.getItem('originalPath');
      
      if (originalPath && !simulatingUser) {
        sessionStorage.removeItem('originalPath');
        navigate(originalPath, { replace: true });
        return;
      }
      
      const targetPage = roleHome[role] || roleHome.ESTU;
      const pageName = targetPage.replace(/^\//, '');
      navigate(createPageUrl(pageName), { replace: true });
    } else {
      // Si no hay usuario, ir a página local
      navigate(createPageUrl('local'), { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-surface-muted)]">
      <div className="flex flex-col items-center gap-4">
        <Clock className="w-12 h-12 text-brand-500 animate-spin" />
        <p className="text-ui/80">Redirigiendo...</p>
      </div>
    </div>
  );
}
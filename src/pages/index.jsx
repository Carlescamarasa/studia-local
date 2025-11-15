import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { roleHome } from "@/components/auth/roleMap";
import { Clock } from "lucide-react";

export default function IndexPage() {
  const navigate = useNavigate();
  
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (!isLoading && currentUser) {
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
    }
  }, [currentUser, isLoading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Clock className="w-12 h-12 text-brand-500 animate-spin" />
        <p className="text-muted">Redirigiendo...</p>
      </div>
    </div>
  );
}
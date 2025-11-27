import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, AlertTriangle, Save, LogOut } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";

export default function ModalCancelar({ onGuardarYSalir, onSalirSinGuardar, onContinuar }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onContinuar} />
      <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101] shadow-card rounded-2xl overflow-hidden">
        <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
              <CardTitle className={`text-lg ${componentStyles.typography.sectionTitle}`}>Salir de la práctica</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onContinuar}
              className="h-9 w-9 rounded-xl hover:bg-[var(--color-surface-muted)]"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <CardContent className="pt-6 space-y-4 px-6 pb-6">
          <p className={`text-sm ${componentStyles.typography.bodyText}`}>
            ¿Deseas guardar el estado de la sesión para retomarla más tarde?
          </p>
          
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={onGuardarYSalir}
              className={`h-11 ${componentStyles.buttons.primary}`}
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar estado y salir
            </Button>
            
            <Button
              variant="outline"
              onClick={onSalirSinGuardar}
              className={`h-11 ${componentStyles.buttons.danger}`}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir sin guardar
            </Button>
            
            <Button
              variant="ghost"
              onClick={onContinuar}
              className={`h-11 ${componentStyles.buttons.ghost}`}
            >
              Continuar practicando
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
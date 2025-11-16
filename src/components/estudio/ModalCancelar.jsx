import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, AlertTriangle, Save, LogOut } from "lucide-react";

export default function ModalCancelar({ onGuardarYSalir, onSalirSinGuardar, onContinuar }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onContinuar} />
      <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101]">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-brand-600" />
              <CardTitle className="text-lg">Salir de la práctica</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onContinuar}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <p className="text-ui text-sm">
            ¿Deseas guardar el estado de la sesión para retomarla más tarde?
          </p>
          
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={onGuardarYSalir}
              className="bg-brand-500 hover:bg-brand-600 h-11"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar estado y salir
            </Button>
            
            <Button
              variant="outline"
              onClick={onSalirSinGuardar}
              className="text-red-600 border-red-300 hover:bg-red-50 h-11"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Salir sin guardar
            </Button>
            
            <Button
              variant="ghost"
              onClick={onContinuar}
              className="h-11"
            >
              Continuar practicando
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
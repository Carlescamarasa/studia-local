
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MediaLinksInput from "../common/MediaLinksInput";
import MediaPreviewModal from "../common/MediaPreviewModal";

export default function ModalFinalizarSesion({ onConfirmar, onCancelar }) {
  const [motivo, setMotivo] = useState("terminado");
  const [calificacion, setCalificacion] = useState(null);
  const [notas, setNotas] = useState("");
  const [mediaLinks, setMediaLinks] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  const motivos = [
    { value: "terminado", label: "Terminé antes de tiempo" },
    { value: "objetivo", label: "Objetivo cubierto" },
    { value: "salte", label: "Salté algunos ejercicios" },
    { value: "otro", label: "Otro motivo" },
  ];

  const calificaciones = [
    { value: 1, label: "Difícil", emoji: "😰", color: "bg-red-100 border-red-300 text-red-800" },
    { value: 2, label: "Complicado", emoji: "😕", color: "bg-amber-100 border-amber-300 text-amber-800" },
    { value: 3, label: "Bien", emoji: "🙂", color: "bg-green-100 border-green-300 text-green-800" },
    { value: 4, label: "Excelente", emoji: "😄", color: "bg-blue-100 border-blue-300 text-blue-800" },
  ];

  const handlePreview = (index) => {
    setPreviewIndex(index);
    setShowPreview(true);
  };
  
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onCancelar} />
      <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-[101]">
        <CardHeader className="border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <CardTitle>Finalizar Sesión</CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancelar}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label className="text-base mb-3 block">¿Por qué finalizas la sesión?</Label>
            <div className="space-y-2">
              {motivos.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMotivo(m.value)}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    motivo === m.value 
                      ? 'border-brand-500 bg-brand-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      motivo === m.value ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                    }`}>
                      {motivo === m.value && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm font-medium">{m.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base mb-3 block">¿Cómo te fue la sesión?</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {calificaciones.map((cal) => (
                <button
                  key={cal.value}
                  onClick={() => setCalificacion(cal.value)}
                  className={`p-3 border-2 rounded-lg transition-all text-center ${
                    calificacion === cal.value 
                      ? cal.color + ' shadow-sm' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{cal.emoji}</div>
                  <div className="text-xs font-medium">{cal.label}</div>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <Label htmlFor="notas">Notas de la práctica (opcional)</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="¿Qué aprendiste? ¿Qué te costó? ¿Qué mejorar?"
              rows={4}
              className="mt-2 resize-none"
            />
          </div>

          <MediaLinksInput 
            value={mediaLinks}
            onChange={setMediaLinks}
            onPreview={handlePreview}
          />
          
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 text-sm">
              Tu progreso y materiales adjuntos se guardarán en el sistema
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onCancelar} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={() => onConfirmar({ motivo, calificacion, notas, mediaLinks })} 
              className="flex-1 bg-brand-500 hover:bg-brand-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Finalizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <MediaPreviewModal
          urls={mediaLinks}
          initialIndex={previewIndex}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}

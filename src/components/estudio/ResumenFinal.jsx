import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Clock, RotateCcw, Home } from "lucide-react";
import MediaLinksInput from "../common/MediaLinksInput";
import MediaPreviewModal from "../common/MediaPreviewModal";
import { componentStyles } from "@/design/componentStyles";

const EmojiCalidad = ({ nivel }) => {
  const emojis = {
    1: { emoji: "😣", label: "Muy difícil" },
    2: { emoji: "😕", label: "Difícil" },
    3: { emoji: "🙂", label: "Bien" },
    4: { emoji: "😄", label: "Excelente" },
  };
  
  const config = emojis[nivel] || emojis[3];
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl">{config.emoji}</span>
      <span className="text-xs font-medium mt-1 text-[var(--color-text-primary)]">{config.label}</span>
    </div>
  );
};

export default function ResumenFinal({ 
  sesion,
  tiempoReal, 
  tiempoPrevisto,
  completados, 
  omitidos,
  totalEjercicios,
  onGuardarYSalir, 
  onReiniciar,
  onCalidadNotas
}) {
  const [calidad, setCalidad] = useState(3);
  const [notas, setNotas] = useState("");
  const [mediaLinks, setMediaLinks] = useState([]);
  const [guardado, setGuardado] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  const pendientes = totalEjercicios - completados.size - omitidos.size;
  
  const handleGuardarFeedback = () => {
    if (onCalidadNotas) {
      onCalidadNotas(calidad, notas, mediaLinks);
    }
    
    setGuardado(true);
    
    setTimeout(() => {
      onGuardarYSalir();
    }, 1000);
  };

  const handlePreview = (index) => {
    setPreviewIndex(index);
    setShowPreview(true);
  };
  
  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto app-card">
          <CardHeader className="text-center border-b border-[var(--color-border-default)] pb-4 sticky top-0 bg-[var(--color-surface-elevated)] z-10">
            <div className="icon-tile mx-auto mb-3 bg-[var(--color-success)]/10">
              <CheckCircle className="w-8 h-8 text-[var(--color-success)]" />
            </div>
            <CardTitle className={`text-xl ${componentStyles.typography.pageTitle}`}>¡Sesión Completada!</CardTitle>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{sesion.nombre}</p>
          </CardHeader>
          
          <CardContent className="pt-4 space-y-4">
            <div className={`${componentStyles.layout.grid3} gap-2`}>
              <div className="text-center p-2 app-panel bg-[var(--color-success)]/5 border-[var(--color-success)]/20">
                <CheckCircle className="w-4 h-4 mx-auto mb-1 text-[var(--color-success)]" />
                <p className="text-base font-bold text-[var(--color-text-primary)]">{completados.size}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Completados</p>
              </div>
              
              <div className="text-center p-2 app-panel">
                <XCircle className="w-4 h-4 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-base font-bold text-[var(--color-text-primary)]">{omitidos.size}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">Omitidos</p>
              </div>
              
              <div className="text-center p-2 app-panel bg-[var(--color-info)]/5 border-[var(--color-info)]/20">
                <Clock className="w-4 h-4 mx-auto mb-1 text-[var(--color-info)]" />
                <p className="text-base font-bold text-[var(--color-text-primary)]">
                  {Math.floor(tiempoReal / 60)}:{String(tiempoReal % 60).padStart(2, '0')}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">Minutos</p>
              </div>
            </div>
            
            <div className="border-t border-[var(--color-border-default)] pt-4 space-y-3">
              <h2 className={`font-semibold text-base text-center ${componentStyles.typography.sectionTitle}`}>¿Cómo fue la práctica?</h2>
              
              <div className={`${componentStyles.layout.grid4} gap-2`}>
                {[1, 2, 3, 4].map((nivel) => (
                  <button
                    key={nivel}
                    onClick={() => setCalidad(nivel)}
                    className={`flex flex-col items-center justify-center p-3 app-panel border-2 transition-all min-h-[80px] ${
                      calidad === nivel 
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' 
                        : 'border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]'
                    }`}
                    aria-label={`Calificar como ${["Muy difícil", "Difícil", "Bien", "Excelente"][nivel - 1]}`}
                  >
                    <EmojiCalidad nivel={nivel} />
                  </button>
                ))}
              </div>
              
              <div>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="¿Qué te ha gustado? ¿Retos a futuro? ¿Cómo piensas superarlos?"
                  rows={3}
                  className={`text-sm app-panel resize-none ${componentStyles.controls.inputDefault}`}
                  aria-label="Notas sobre la práctica"
                />
              </div>

              <MediaLinksInput
                value={mediaLinks}
                onChange={setMediaLinks}
                onPreview={handlePreview}
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={onReiniciar}
                className={`flex-1 ${componentStyles.buttons.outline}`}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Repetir
              </Button>
              <Button
                onClick={handleGuardarFeedback}
                disabled={guardado}
                className={`flex-1 ${componentStyles.buttons.primary}`}
              >
                {guardado ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Guardado
                  </>
                ) : (
                  <>
                    <Home className="w-4 h-4 mr-1" />
                    Finalizar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
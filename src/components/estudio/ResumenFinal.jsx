import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Clock, RotateCcw, Home } from "lucide-react";
import MediaLinksInput from "../common/MediaLinksInput";
import MediaPreviewModal from "../common/MediaPreviewModal";
import { componentStyles } from "@/design/componentStyles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
      <span className="text-xl sm:text-2xl">{config.emoji}</span>
      <span className="text-[9px] sm:text-[10px] font-medium mt-0 sm:mt-0.5 text-[var(--color-text-primary)]">{config.label}</span>
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
  onCalidadNotas,
  open = true,
  onOpenChange
}) {
  const [calidad, setCalidad] = useState(3);
  const [notas, setNotas] = useState("");
  const [mediaLinks, setMediaLinks] = useState([]);
  const [guardado, setGuardado] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  const pendientes = totalEjercicios - completados.size - omitidos.size;
  
  const handleGuardarFeedback = async () => {
    if (onCalidadNotas) {
      // Llamar a onCalidadNotas y esperar a que termine
      await onCalidadNotas(calidad, notas, mediaLinks);
    }
    
    setGuardado(true);
    
    // Esperar un poco más para asegurar que el guardado se complete
    setTimeout(() => {
      onGuardarYSalir();
    }, 1500);
  };

  const handlePreview = (index) => {
    setPreviewIndex(index);
    setShowPreview(true);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-center">
            <div className="flex flex-col items-center space-y-1.5 sm:space-y-2">
              <div className="icon-tile mx-auto mb-2 sm:mb-3 bg-[var(--color-success)]/10 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-success)]" />
              </div>
              <DialogTitle className={`text-lg sm:text-xl ${componentStyles.typography.pageTitle} text-center`}>¡Sesión Completada!</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1 text-center">{sesion.nombre}</DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
            {/* Estadísticas inline sin cuadro */}
            <div className="flex gap-4 sm:gap-6 justify-center items-center pb-2 sm:pb-3 border-b border-[var(--color-border-default)]">
              <div className="text-center">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-success)]" />
                <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">{completados.size}</p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Completados</p>
              </div>
              
              <div className="text-center">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-text-secondary)]" />
                <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">{omitidos.size}</p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Omitidos</p>
              </div>
              
              <div className="text-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-[var(--color-info)]" />
                <p className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
                  {Math.floor(tiempoReal / 60)}:{String(tiempoReal % 60).padStart(2, '0')}
                </p>
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">Minutos</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h2 className={`font-semibold text-sm sm:text-base text-center ${componentStyles.typography.sectionTitle}`}>¿Cómo fue la práctica?</h2>
              
              <div className="flex gap-2 sm:gap-3 justify-center">
                {[1, 2, 3, 4].map((nivel) => (
                  <button
                    key={nivel}
                    onClick={() => setCalidad(nivel)}
                    className={`flex flex-col items-center justify-center p-2 sm:p-3 app-panel border-2 transition-all flex-1 max-w-[120px] ${
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
                <label htmlFor="notas-practica" className={`block text-sm font-medium text-[var(--color-text-primary)] mb-1.5 ${componentStyles.forms.label}`}>
                  Notas sobre la práctica (opcional)
                </label>
                <Textarea
                  id="notas-practica"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="¿Qué te ha gustado? ¿Retos a futuro? ¿Cómo piensas superarlos?"
                  rows={2}
                  className={`text-xs sm:text-sm app-panel resize-none ${componentStyles.controls.inputDefault}`}
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
                className={`flex-1 text-xs sm:text-sm h-9 sm:h-10 ${componentStyles.buttons.outline}`}
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                Repetir
              </Button>
              <Button
                onClick={handleGuardarFeedback}
                disabled={guardado}
                className={`flex-1 text-xs sm:text-sm h-9 sm:h-10 ${componentStyles.buttons.primary}`}
              >
                {guardado ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Guardado
                  </>
                ) : (
                  <>
                    <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    Finalizar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
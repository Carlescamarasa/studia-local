import { useState, useEffect } from 'react';
import ReportErrorModal from './ReportErrorModal';

/**
 * Componente global que maneja el modal de reporte de errores
 * Siempre está montado dentro de los providers, por lo que funciona
 * tanto en la aplicación normal como cuando ErrorBoundary muestra su pantalla
 */
export default function GlobalErrorReportHandler() {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalError, setReportModalError] = useState(null);
  const [reportModalCategory, setReportModalCategory] = useState(null);

  useEffect(() => {
    const handleOpenReport = (event) => {
      console.log('[GlobalErrorReportHandler] Evento open-error-report recibido:', event.detail);
      try {
        setReportModalError(event.detail?.error || null);
        setReportModalCategory(event.detail?.category || null);
        setReportModalOpen(true);
        console.log('[GlobalErrorReportHandler] Modal de reporte abierto');
      } catch (error) {
        console.error('[GlobalErrorReportHandler] Error al abrir modal:', error);
        // Fallback: abrir modal sin error
        setReportModalOpen(true);
        setReportModalCategory(event.detail?.category || 'algo_no_funciona');
      }
    };

    window.addEventListener('open-error-report', handleOpenReport);
    return () => window.removeEventListener('open-error-report', handleOpenReport);
  }, []);

  return (
    <ReportErrorModal
      open={reportModalOpen}
      onOpenChange={setReportModalOpen}
      initialError={reportModalError}
      initialCategory={reportModalCategory}
    />
  );
}


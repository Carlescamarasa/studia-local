import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import ReportErrorModal from './ReportErrorModal';
import { componentStyles } from '@/design/componentStyles';

/**
 * Botón flotante para reportar errores y problemas
 * Siempre visible en la esquina inferior derecha
 */
export default function ReportErrorButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className={`
          fixed bottom-6 right-6 z-[100]
          rounded-full w-14 h-14 p-0
          shadow-lg hover:shadow-xl
          ${componentStyles.buttons.primary}
        `}
        aria-label="Reportar error o problema"
        title="Reportar error o problema"
      >
        <Bug className="w-5 h-5" />
      </Button>
      
      <ReportErrorModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}


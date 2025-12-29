import React from 'react';

import { Bug } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { componentStyles } from '@/design/componentStyles';

export default function ReportErrorButton() {


  const handleClick = () => {
    console.log('[ReportErrorButton] Disparando evento open-error-report');
    window.dispatchEvent(new CustomEvent('open-error-report', {
      detail: {}
    }));
  };

  return (
    <Button
      onClick={handleClick}
      size="icon"
      className={`
        fixed top-4 right-4 z-[100000]
        w-12 h-12 rounded-full shadow-lg
        bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]
        text-white
        transition-all hover:scale-110
        ${componentStyles.buttons.primary}
      `}
      aria-label="Reportar error o problema"
      title="Reportar error o problema"
    >
      <Bug className="w-6 h-6" />
    </Button>
  );
}


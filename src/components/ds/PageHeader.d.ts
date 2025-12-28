import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    /** Componente de icono de lucide-react */
    icon?: LucideIcon;
    /** Título de la página */
    title?: string;
    /** Subtítulo (opcional) */
    subtitle?: string;
    /** Slot para acciones (botones, etc.) */
    actions?: React.ReactNode;
    /** Slot para filtros (opcional) */
    filters?: React.ReactNode;
    /** Clases adicionales */
    className?: string;
    /** Variante del icono (deprecated: siempre usa estilo plain) */
    iconVariant?: string;
    /** Mostrar botón de menú en mobile (default: true) */
    showMenuButton?: boolean;
    /** Mostrar botón de hotkeys (default: true) */
    showHotkeys?: boolean;
}

declare function PageHeader(props: PageHeaderProps): JSX.Element;

export default PageHeader;

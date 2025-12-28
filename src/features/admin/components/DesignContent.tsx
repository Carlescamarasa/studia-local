/**
 * DesignContent - Embedded design panel content for Configuración page
 */

import React from 'react';
// @ts-ignore - Assuming DesignPageContent will be migrated later or handled via TS
import { DesignPageContent } from '@/pages/design';

interface DesignContentProps {
    hideLevelsTab?: boolean;
}

export default function DesignContent({ hideLevelsTab = false }: DesignContentProps) {
    return <DesignPageContent embedded hideLevelsTab={hideLevelsTab} />;
}

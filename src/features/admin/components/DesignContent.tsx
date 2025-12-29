/**
 * DesignContent - Embedded design panel content for Configuración page
 */

import React from 'react';
// @ts-ignore - Migrated from legacy
import { DesignPageContent } from '@/features/design/components/DesignPageContent';

interface DesignContentProps {
    hideLevelsTab?: boolean;
}

export default function DesignContent({ hideLevelsTab = false }: DesignContentProps) {
    return <DesignPageContent embedded hideLevelsTab={hideLevelsTab} />;
}

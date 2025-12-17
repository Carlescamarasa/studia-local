/**
 * DesignContent - Embedded design panel content for Configuración page
 */

import { DesignPageContent } from '@/pages/design';

export default function DesignContent({ hideLevelsTab = false }) {
    return <DesignPageContent embedded hideLevelsTab={hideLevelsTab} />;
}

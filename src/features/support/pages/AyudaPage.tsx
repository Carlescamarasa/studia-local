import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/features/shared/components/ds/PageHeader';
import { Tabs } from '@/features/shared/components/ds/Tabs';
import MarkdownPage from '@/features/support/components/MarkdownPage';
import { Card, CardContent } from '@/features/shared/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { HelpCircle, BookOpen, User, Users, Settings, Keyboard, Video, Info } from 'lucide-react';

export default function AyudaPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Obtener tab desde URL o usar 'README' por defecto
  const activeTab = searchParams.get('tab') || 'README';

  const tabs = [
    {
      value: 'README',
      label: 'Inicio',
      icon: BookOpen,
      content: <MarkdownPage slug="README" />,
    },
    {
      value: 'alumno',
      label: 'Alumno',
      icon: User,
      content: <MarkdownPage slug="alumno" />,
    },
    {
      value: 'profesor',
      label: 'Profesor',
      icon: Users,
      content: <MarkdownPage slug="profesor" />,
    },
    {
      value: 'admin',
      label: 'Admin',
      icon: Settings,
      content: <MarkdownPage slug="admin" />,
    },
    {
      value: 'faq',
      label: 'FAQs',
      icon: HelpCircle,
      content: <MarkdownPage slug="faq" />,
    },
    {
      value: 'hotkeys',
      label: 'Atajos',
      icon: Keyboard,
      content: <MarkdownPage slug="hotkeys" />,
    },
    {
      value: 'videos',
      label: 'Vídeos',
      icon: Video,
      content: <MarkdownPage slug="videos" />,
    },
    {
      value: 'tecnico',
      label: 'Técnico',
      icon: Info,
      content: <MarkdownPage slug="tecnico" />,
    },
  ];

  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Centro de Ayuda"
        subtitle="Encuentra respuestas a tus preguntas y aprende a usar Studia"
      />

      <div className="studia-section py-4">
        <Card className={componentStyles.containers.cardBase}>
          <CardContent className="p-4 md:p-6">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              items={tabs}
              variant="segmented"
              showIconsOnlyMobile={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


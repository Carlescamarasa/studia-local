import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ds/PageHeader';
import Tabs from '@/components/ds/Tabs';
import MarkdownPage from '@/components/help/MarkdownPage';
import { Card, CardContent } from '@/components/ds';
import { componentStyles } from '@/design/componentStyles';
import { HelpCircle, BookOpen, User, Users, Settings, Keyboard, Video, Info } from 'lucide-react';

export default function AyudaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Obtener tab desde URL o usar 'README' por defecto
  const tabFromUrl = searchParams.get('tab') || 'README';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sincronizar con URL cuando cambia el tab
  useEffect(() => {
    if (activeTab !== tabFromUrl) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, tabFromUrl, setSearchParams]);

  // Sincronizar con URL cuando cambia la URL externamente
  useEffect(() => {
    const newTab = searchParams.get('tab') || 'README';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [searchParams]);

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

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Centro de Ayuda"
        subtitle="Encuentra respuestas a tus preguntas y aprende a usar Studia"
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
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


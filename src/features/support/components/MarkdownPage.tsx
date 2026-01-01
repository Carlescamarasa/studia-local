/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as Accordion from '@radix-ui/react-accordion';
import { HelpCircle, BookOpen, User, Users, Settings, Keyboard, Video, Info, ChevronRight } from 'lucide-react';
import VideoEmbed from './VideoEmbed';
import { rehypeCollapsible } from '../utils/rehype-collapsible';

// Cargar todos los archivos markdown usando import.meta.glob
const markdownModules = import.meta.glob<string>('/src/help/*.md', {
  query: '?raw',
  import: 'default',
  eager: false
});

// Mapeo de slugs a nombres de archivo
const slugToFile: Record<string, string> = {
  'README': '/src/help/README.md',
  'alumno': '/src/help/alumno.md',
  'profesor': '/src/help/profesor.md',
  'admin': '/src/help/admin.md',
  'faq': '/src/help/faq.md',
  'hotkeys': '/src/help/hotkeys.md',
  'videos': '/src/help/videos.md',
  'tecnico': '/src/help/tecnico.md',
};

/**
 * Componente que renderiza un archivo Markdown desde /src/help
 * @param {string} slug - Nombre del archivo sin extensión (ej: 'alumno', 'profesor', etc.)
 */
export default function MarkdownPage({ slug = 'README' }: { slug?: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setLoading(true);
        setError(null);

        const filePath = slugToFile[slug];
        if (!filePath) {
          throw new Error(`Archivo no encontrado: ${slug}`);
        }

        const loadFile = markdownModules[filePath];
        if (!loadFile) {
          throw new Error(`No se pudo cargar el archivo: ${filePath}`);
        }

        let markdownContent = await loadFile();

        // Procesar componentes personalizados antes de renderizar
        // Sintaxis: [video:URL:Título opcional]
        markdownContent = (markdownContent as unknown as string).replace(
          /\[video:([^\]]+)\]/g,
          (match: string, params: string) => {
            const [url, ...titleParts] = params.split(':');
            const title = titleParts.length > 0 ? titleParts.join(':') : '';
            // Escapar HTML para evitar problemas de seguridad
            const safeUrl = url.replace(/"/g, '&quot;');
            const safeTitle = title.replace(/"/g, '&quot;');
            return `<div class="video-embed" data-url="${safeUrl}" data-title="${safeTitle}"></div>`;
          }
        );

        setContent(markdownContent as string);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[MarkdownPage] Error cargando markdown:', err);
        setError(`Error al cargar el contenido: ${message}`);
        setContent('');
      } finally {
        setLoading(false);
      }
    };

    loadMarkdown();
  }, [slug]);

  // Manejar enlaces internos entre documentos
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Si es un enlace interno a otro .md
    if (href.endsWith('.md')) {
      e.preventDefault();
      const newSlug = href.replace('.md', '');
      navigate(`/ayuda?tab=${newSlug}`);
    }
    // Si es un enlace a una sección (#)
    else if (href.startsWith('#')) {
      // El scroll se maneja automáticamente por el navegador
      return;
    }
    // Si es un enlace externo, se abre normalmente
    // Si es un enlace a otra página de la app (ej: /soporte)
    else if (href.startsWith('/') || href.startsWith('../')) {
      e.preventDefault();
      const cleanPath = href.replace('../', '/');
      navigate(cleanPath);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-sm text-[var(--color-text-secondary)]">Cargando contenido...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-xl">
        <p className="text-[var(--color-danger)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="markdown-content prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeCollapsible]}
        components={{
          // Estilizar enlaces
          a: ({ href, children, ...props }) => {
            // Si es un email, abrir el cliente de correo
            if (href?.startsWith('mailto:')) {
              return (
                <a
                  href={href}
                  className="text-[var(--color-primary)] hover:underline"
                  {...props}
                >
                  {children}
                </a>
              );
            }
            // Enlaces internos
            return (
              <a
                href={href}
                onClick={(e) => handleLinkClick(e, href || '')}
                className="text-[var(--color-primary)] hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Estilizar títulos (H1 sigue igual, H2 y H3 son manejados por el Accordion)
          h1: ({ children, ...props }) => (
            <h1
              className="text-3xl font-bold text-[var(--color-text-primary)] mt-8 mb-4 pb-2 border-b border-[var(--color-border-default)]"
              {...props}
            >
              {children}
            </h1>
          ),
          // Nota: H2 y H3 son transformados en accordion-header por el plugin.
          // Si quedara alguno suelto (h4, h5, etc)
          h4: ({ children, ...props }) => (
            <h4
              className="text-lg font-semibold text-[var(--color-text-primary)] mt-4 mb-2"
              {...props}
            >
              {children}
            </h4>
          ),
          // Estilizar listas
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-outside ml-5 space-y-1 my-2 text-[var(--color-text-primary)]" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-outside ml-5 space-y-1 my-2 text-[var(--color-text-primary)]" {...props}>
              {children}
            </ol>
          ),
          // Estilizar párrafos
          p: ({ children, ...props }) => (
            <p className="text-[var(--color-text-primary)] leading-relaxed my-3" {...props}>
              {children}
            </p>
          ),
          // Estilizar código inline
          code: ({ children, className, ...props }) => {
            const inline = !className;
            if (inline) {
              return (
                <code
                  className="bg-[var(--color-surface-muted)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--color-text-primary)]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="block bg-[var(--color-surface-muted)] p-4 rounded-lg text-sm font-mono text-[var(--color-text-primary)] overflow-x-auto my-4"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Estilizar tablas mejoradas
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full text-left text-sm"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-[var(--color-surface-muted)]/50 border-b border-[var(--color-border-default)]" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className="hover:bg-[var(--color-surface-muted)]/30 transition-colors" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-4 py-3 font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider text-xs"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-4 py-3 text-[var(--color-text-primary)] whitespace-normal"
              {...props}
            >
              {children}
            </td>
          ),
          // Estilizar blockquotes y Alertas GitHub
          blockquote: ({ children, ...props }) => {
            return (
              <blockquote
                className="border-l-4 border-[var(--color-primary)] pl-4 py-2 my-4 italic text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)]/30 rounded-r"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          // Procesa elementos custom generados por rehype-collapsible
          // @ts-expect-error: Custom elements not in standard JSX
          'accordion-root': ({ children, ...props }) => (
            <Accordion.Root
              type="single"
              collapsible
              className="w-full space-y-2"
              {...props}
            >
              {children}
            </Accordion.Root>
          ),

          'accordion-item': ({ children, className, ...props }: any) => {
            const isH3 = className?.includes('details-h3');
            // Ensure value is present for Accordion.Item
            const value = props.value || `item-${Math.random().toString(36).substr(2, 9)}`;

            return (
              <Accordion.Item
                value={value}
                className={`
                    group overflow-hidden
                    ${isH3
                    ? 'my-1 ml-4 border-l-2 border-[var(--color-border-default)]'
                    : 'border-b border-[var(--color-border-default)]'
                  }
                    ${className || ''}
                  `}
                {...props}
              >
                {children}
              </Accordion.Item>
            );
          },
          // @ts-expect-error: Custom elements
          'accordion-header': ({ children, className, ...props }) => {
            const isH3 = className?.includes('summary-h3');
            return (
              <div className="flex">
                <Accordion.Header className="flex-1">
                  <Accordion.Trigger
                    className={`
                      flex flex-1 items-center justify-between px-4 py-3
                      cursor-pointer select-none transition-all
                      marker:content-none font-semibold text-[var(--color-text-primary)]
                      outline-none
                      ${isH3
                        ? 'bg-transparent hover:bg-[var(--color-surface-muted)]/30 text-base'
                        : 'bg-[var(--color-surface-muted)]/30 hover:bg-[var(--color-surface-muted)] text-lg rounded-t-lg group-data-[state=closed]:rounded-lg'
                      }
                      ${className || ''}
                    `}
                    {...props}
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200 group-data-[state=open]:rotate-90" />
                      {children}
                    </span>
                  </Accordion.Trigger>
                </Accordion.Header>
              </div>
            );
          },
          // @ts-expect-error: Custom elements
          'accordion-content': ({ children, ...props }) => (
            <Accordion.Content
              className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
              {...props}
            >
              <div className="px-4 pb-4 pt-0">
                {children}
              </div>
            </Accordion.Content>
          ),
          // Procesar divs con clase video-embed como componentes VideoEmbed
          div: ({ node, className, ...props }) => {
            const classStr = typeof className === 'string' ? className : '';
            if (classStr.includes('video-embed')) {
              // Extraer data attributes del nodo HTML
              const dataUrl = (node as any)?.properties?.['data-url'] || (props as Record<string, any>)['data-url'] || '';
              const dataTitle = (node as any)?.properties?.['data-title'] || (props as Record<string, any>)['data-title'] || '';
              // Decodificar HTML entities
              const url = typeof dataUrl === 'string' ? dataUrl.replace(/&quot;/g, '"') : '';
              const title = typeof dataTitle === 'string' ? dataTitle.replace(/&quot;/g, '"') : '';
              return <VideoEmbed url={url} title={title} />;
            }
            return <div className={className} {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useNavigate, useSearchParams } from 'react-router-dom';
import VideoEmbed from './VideoEmbed';

// Cargar todos los archivos markdown usando import.meta.glob
const markdownModules = import.meta.glob('/src/help/*.md', { 
  query: '?raw',
  import: 'default',
  eager: false 
});

// Mapeo de slugs a nombres de archivo
const slugToFile = {
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
export default function MarkdownPage({ slug = 'README' }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
        markdownContent = markdownContent.replace(
          /\[video:([^\]]+)\]/g,
          (match, params) => {
            const [url, ...titleParts] = params.split(':');
            const title = titleParts.length > 0 ? titleParts.join(':') : '';
            // Escapar HTML para evitar problemas de seguridad
            const safeUrl = url.replace(/"/g, '&quot;');
            const safeTitle = title.replace(/"/g, '&quot;');
            return `<div class="video-embed" data-url="${safeUrl}" data-title="${safeTitle}"></div>`;
          }
        );

        setContent(markdownContent);
      } catch (err) {
        console.error('[MarkdownPage] Error cargando markdown:', err);
        setError(`Error al cargar el contenido: ${err.message}`);
        setContent('');
      } finally {
        setLoading(false);
      }
    };

    loadMarkdown();
  }, [slug]);

  // Manejar enlaces internos entre documentos
  const handleLinkClick = (e, href) => {
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
        rehypePlugins={[rehypeRaw]}
        components={{
          // Estilizar enlaces
          a: ({ node, href, children, ...props }) => {
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
          // Estilizar títulos
          h1: ({ node, children, ...props }) => (
            <h1
              className="text-3xl font-bold text-[var(--color-text-primary)] mt-8 mb-4 pb-2 border-b border-[var(--color-border-default)]"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2
              className="text-2xl font-semibold text-[var(--color-text-primary)] mt-6 mb-3"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3
              className="text-xl font-semibold text-[var(--color-text-primary)] mt-4 mb-2"
              {...props}
            >
              {children}
            </h3>
          ),
          // Estilizar listas
          ul: ({ node, children, ...props }) => (
            <ul className="list-disc list-inside space-y-2 my-4 text-[var(--color-text-primary)]" {...props}>
              {children}
            </ul>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 my-4 text-[var(--color-text-primary)]" {...props}>
              {children}
            </ol>
          ),
          // Estilizar párrafos
          p: ({ node, children, ...props }) => (
            <p className="text-[var(--color-text-primary)] leading-relaxed my-3" {...props}>
              {children}
            </p>
          ),
          // Estilizar código inline
          code: ({ node, inline, children, ...props }) => {
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
          // Estilizar tablas
          table: ({ node, children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full border-collapse border border-[var(--color-border-default)] rounded-lg"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ node, children, ...props }) => (
            <thead className="bg-[var(--color-surface-muted)]" {...props}>
              {children}
            </thead>
          ),
          tbody: ({ node, children, ...props }) => (
            <tbody {...props}>
              {children}
            </tbody>
          ),
          tr: ({ node, children, ...props }) => (
            <tr className="border-b border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]/50" {...props}>
              {children}
            </tr>
          ),
          th: ({ node, children, ...props }) => (
            <th
              className="px-4 py-2 text-left font-semibold text-[var(--color-text-primary)] border border-[var(--color-border-default)]"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ node, children, ...props }) => (
            <td
              className="px-4 py-2 text-[var(--color-text-primary)] border border-[var(--color-border-default)]"
              {...props}
            >
              {children}
            </td>
          ),
          // Estilizar blockquotes
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              className="border-l-4 border-[var(--color-primary)] pl-4 py-2 my-4 italic text-[var(--color-text-secondary)] bg-[var(--color-surface-muted)]/50 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // Estilizar strong/bold
          strong: ({ node, children, ...props }) => (
            <strong className="font-bold text-[var(--color-text-primary)]" {...props}>
              {children}
            </strong>
          ),
          // Estilizar em/italic
          em: ({ node, children, ...props }) => (
            <em className="italic text-[var(--color-text-primary)]" {...props}>
              {children}
            </em>
          ),
          // Procesar divs con clase video-embed como componentes VideoEmbed
          div: ({ node, className, ...props }) => {
            const classStr = typeof className === 'string' ? className : '';
            if (classStr.includes('video-embed')) {
              // Extraer data attributes del nodo HTML
              const dataUrl = node?.properties?.['data-url'] || props['data-url'] || '';
              const dataTitle = node?.properties?.['data-title'] || props['data-title'] || '';
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


import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ds";
import { MessageSquare, Edit } from "lucide-react";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import UnifiedTable from "@/components/tables/UnifiedTable";
import MediaLinksBadges from "@/components/common/MediaLinksBadges";
import { formatLocalDate, parseLocalDate } from "./utils";

/**
 * FeedbackTab - Tab de feedback del profesor
 * 
 * @param {Object} props
 * @param {Array} props.feedbacks - Array de feedbacks
 * @param {boolean} props.isEstu - Si es estudiante
 * @param {Function} props.onEditFeedback - Callback para editar feedback
 * @param {Function} props.puedeEditar - Función que determina si se puede editar un feedback (opcional)
 * @param {Function} props.onMediaClick - Callback para abrir medialinks (opcional)
 */
export default function FeedbackTab({ feedbacks, isEstu, onEditFeedback, puedeEditar, onMediaClick }) {
  const isMobile = useIsMobile();

  const columns = [
    {
      key: 'fecha',
      label: 'Fechas',
      sortable: true,
      sortValue: (f) => {
        // Ordenar por la fecha más reciente (updated_at si existe, sino created_at)
        const createdAt = f.createdAt || f.created_at;
        const updatedAt = f.updatedAt || f.updated_at || createdAt;
        return updatedAt ? new Date(updatedAt).getTime() : 0;
      },
      render: (f) => {
        const createdAt = f.createdAt || f.created_at;
        const updatedAt = f.updatedAt || f.updated_at;

        if (!createdAt) {
          return <span className="text-sm text-[var(--color-text-secondary)]">Sin fecha</span>;
        }

        const formatDate = (dateStr) => {
          const date = new Date(dateStr);
          return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          });
        };

        const createdFormatted = formatDate(createdAt);
        // Considerar "editado" solo si updated_at existe y es diferente de created_at
        const hasBeenEdited = updatedAt && createdAt && updatedAt !== createdAt;

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-primary)] whitespace-nowrap">
              Creado: {createdFormatted}
            </span>
            {hasBeenEdited && (
              <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                Editado: {formatDate(updatedAt)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'nota',
      label: 'Observaciones',
      sortable: false,
      render: (f) => (
        <div className="min-w-0">
          <p className="text-sm text-[var(--color-text-primary)] line-clamp-2">
            {f.notaProfesor || '—'}
          </p>
          {f.mediaLinks && f.mediaLinks.length > 0 && (
            <div className="mt-1">
              <MediaLinksBadges
                mediaLinks={f.mediaLinks}
                onMediaClick={onMediaClick ? (index) => onMediaClick(f.mediaLinks, index) : undefined}
              />
            </div>
          )}
        </div>
      ),
    },
    ...(isEstu ? [] : [
      {
        key: 'alumno',
        label: 'Estudiante',
        sortable: true,
        render: (f) => (
          <span className="text-sm text-[var(--color-text-primary)]">
            {f.alumnoNombre || '—'}
          </span>
        ),
      },
    ]),
    ...(puedeEditar && onEditFeedback ? [
      {
        key: 'actions',
        label: 'Acciones',
        sortable: false,
        render: (f) => {
          const puedeEditarEste = puedeEditar(f);
          if (!puedeEditarEste) return null;
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditFeedback(f);
              }}
              className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1 text-sm"
            >
              <Edit className="w-4 h-4" />
              {isMobile ? '' : 'Editar'}
            </button>
          );
        },
      },
    ] : []),
  ];

  return (
    <Card className={componentStyles.components.cardBase}>
      <CardHeader>
        <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-info)]" />
          🗨️ Comentarios del Profesor ({feedbacks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feedbacks.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <MessageSquare className={componentStyles.components.emptyStateIcon} />
            <p className={componentStyles.components.emptyStateText}>
              No hay feedbacks en el periodo seleccionado
            </p>
          </div>
        ) : (
          <UnifiedTable
            data={feedbacks}
            columns={columns}
            defaultPageSize={10}
            keyField="id"
          />
        )}
      </CardContent>
    </Card>
  );
}


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
      label: 'Fecha',
      sortable: true,
      render: (f) => {
        // Use created_at for timestamp if available, otherwise semanaInicioISO
        const dateStr = f.created_at || f.semanaInicioISO;
        if (!dateStr) return <span className="text-sm text-[var(--color-text-secondary)]">Sin fecha</span>;

        const date = new Date(dateStr);
        const fechaFormateada = date.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        return (
          <span className="text-sm text-[var(--color-text-primary)] whitespace-nowrap">
            {fechaFormateada}
          </span>
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


import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableItem({ 
  id, 
  children, 
  className = '',
  dragHandleClassName = '',
  disabled = false 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? 'shadow-card border-[var(--color-primary)]' : ''}`}
    >
      {children({
        dragHandleProps: {
          ...attributes,
          ...listeners,
          className: `cursor-grab active:cursor-grabbing ${dragHandleClassName}`,
        },
        isDragging,
      })}
    </div>
  );
}









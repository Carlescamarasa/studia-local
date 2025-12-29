import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: (args: {
    dragHandleProps: any;
    isDragging: boolean;
  }) => React.ReactNode;
  className?: string;
  dragHandleClassName?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export function SortableItem({
  id,
  children,
  className = '',
  dragHandleClassName = '',
  disabled = false,
  onClick
}: SortableItemProps) {
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
      onClick={onClick}
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




















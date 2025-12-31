/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface DragResult {
  active: { id: string | number; data: any };
  over: { id: string | number; data: any };
}

interface DndProviderProps {
  children: React.ReactNode;
  onDragEnd: (result: DragResult) => void;
}

export function DndProvider({ children, onDragEnd }: DndProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere 8px de movimiento antes de activar
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    onDragEnd({
      active: {
        id: active.id,
        data: active.data.current,
      },
      over: {
        id: over.id,
        data: over.data.current,
      },
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}

export { SortableContext, verticalListSortingStrategy, arrayMove };










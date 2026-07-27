import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface ColumnProps {
  id: string;
  title: string;
  accentColor?: string;
  headerAction?: ReactNode;
  onDelete?: () => void;
  taskIds: string[];
  children: ReactNode;
}

export function Column({ id, title, accentColor, headerAction, onDelete, taskIds, children }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`column${isOver ? ' column--over' : ''}`}
      style={accentColor ? { borderTopColor: accentColor } : undefined}
    >
      <div className="column__header">
        <h2 className="column__title">{title}</h2>
        <div className="column__header-actions">
          {headerAction}
          {onDelete && (
            <button
              type="button"
              className="column__delete-btn"
              aria-label={`Видалити юзера ${title}`}
              title={`Видалити юзера ${title}`}
              onClick={onDelete}
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="column__body">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

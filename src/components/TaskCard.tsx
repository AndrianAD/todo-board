import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ConfirmDialog } from './ConfirmDialog';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../types';
import type { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
  onEditTitle: (title: string) => void;
}

export function TaskCard({ task, onStatusChange, onDelete, onEditTitle }: TaskCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleConfirmDelete = () => {
    setIsConfirmingDelete(false);
    onDelete();
  };

  const startEditing = () => {
    setEditedTitle(task.title);
    setIsEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onEditTitle(trimmed);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setEditedTitle(task.title);
    setIsEditing(false);
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commitEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`task-card task-card--${task.status} task-card--editing`}
      >
        <textarea
          className="task-card__title-textarea"
          value={editedTitle}
          onChange={(event) => setEditedTitle(event.target.value)}
          onKeyDown={handleEditKeyDown}
          autoFocus
          rows={3}
        />
        <div className="task-card__edit-actions">
          <button type="button" className="task-card__edit-cancel" onClick={cancelEdit}>
            Скасувати
          </button>
          <button type="button" className="task-card__edit-save" onClick={commitEdit}>
            Зберегти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card task-card--${task.status}${isDragging ? ' task-card--dragging' : ''}`}
    >
      <div className="task-card__row">
        <div className="task-card__drag-handle" {...listeners} {...attributes} onDoubleClick={startEditing}>
          <span className={`task-card__title${task.status === 'done' ? ' task-card__title--done' : ''}`}>
            {task.title}
          </span>
        </div>
        <button
          type="button"
          className="task-card__edit-btn"
          aria-label="Редагувати задачу"
          title="Редагувати задачу"
          onClick={startEditing}
        >
          ✎
        </button>
        <button
          type="button"
          className="task-card__delete-btn"
          aria-label="Видалити задачу"
          title="Видалити задачу"
          onClick={() => setIsConfirmingDelete(true)}
        >
          ×
        </button>
      </div>
      <div className="task-card__status" role="group" aria-label="Task status">
        {TASK_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`task-card__status-btn task-card__status-btn--${status}${
              status === task.status ? ' task-card__status-btn--active' : ''
            }`}
            onClick={() => onStatusChange(status)}
          >
            {TASK_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {isConfirmingDelete && (
        <ConfirmDialog
          title="Видалити задачу?"
          message={`Задача "${task.title}" буде видалена без можливості відновлення.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

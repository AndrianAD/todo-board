import { useState } from 'react';
import type { FormEvent } from 'react';

interface AddTaskFormProps {
  onAdd: (title: string) => void;
  disabled?: boolean;
}

export function AddTaskForm({ onAdd, disabled }: AddTaskFormProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTitle('');
  };

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="add-task-form__input"
        placeholder="Нова задача..."
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={disabled}
      />
      <button type="submit" className="add-task-form__submit" disabled={disabled || !title.trim()}>
        Додати
      </button>
    </form>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';

interface AddUserModalProps {
  onAdd: (name: string, color: string) => void;
  onClose: () => void;
}

const DEFAULT_COLOR = '#4c6ef5';

export function AddUserModal({ onAdd, onClose }: AddUserModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, color);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal__title">Додати юзера</h2>
        <form onSubmit={handleSubmit}>
          <label className="modal__field">
            <span>Ім'я</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </label>
          <label className="modal__field">
            <span>Колір</span>
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <div className="modal__actions">
            <button type="button" className="modal__cancel" onClick={onClose}>
              Скасувати
            </button>
            <button type="submit" className="modal__submit" disabled={!name.trim()}>
              Додати
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

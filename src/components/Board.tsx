import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { AddTaskForm } from './AddTaskForm';
import { AddUserModal } from './AddUserModal';
import { ConfirmDialog } from './ConfirmDialog';
import { generateId } from '../lib/id';
import type { Board as BoardData, TaskStatus, User } from '../types';

const BACKLOG_COLUMN_ID = 'backlog';

interface BoardProps {
  board: BoardData;
  saving: boolean;
  onMutate: (mutate: (board: BoardData) => BoardData) => void;
}

export function Board({ board, saving, onMutate }: BoardProps) {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userPendingDeletion, setUserPendingDeletion] = useState<User | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleAddTask = (title: string) => {
    onMutate((current) => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: generateId(),
          title,
          createdAt: new Date().toISOString(),
          assigneeId: null,
          status: 'opened' as TaskStatus,
        },
      ],
    }));
  };

  const handleAddUser = (name: string, color: string) => {
    onMutate((current) => ({
      ...current,
      users: [...current.users, { id: generateId(), name, color }],
    }));
  };

  const handleConfirmDeleteUser = () => {
    if (!userPendingDeletion) return;
    const userId = userPendingDeletion.id;
    onMutate((current) => ({
      ...current,
      users: current.users.filter((user) => user.id !== userId),
      // Задачі видаленого юзера повертаються в Backlog, а не видаляються.
      tasks: current.tasks.map((task) =>
        task.assigneeId === userId ? { ...task, assigneeId: null } : task
      ),
    }));
    setUserPendingDeletion(null);
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    onMutate((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
    }));
  };

  const handleEditTaskTitle = (taskId: string, title: string) => {
    onMutate((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, title } : task)),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    onMutate((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const targetId = String(over.id);
    const assigneeId = targetId === BACKLOG_COLUMN_ID ? null : targetId;

    onMutate((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      if (!task || task.assigneeId === assigneeId) return current;
      return {
        ...current,
        tasks: current.tasks.map((item) =>
          item.id === taskId ? { ...item, assigneeId } : item
        ),
      };
    });
  };

  const backlogTasks = board.tasks.filter((task) => task.assigneeId === null);

  return (
    <div className="board">
      <header className="board__header">
        <h1 className="board__title">Todo Board</h1>
        <div className="board__header-actions">
          {saving && <span className="board__saving">Збереження...</span>}
          <button type="button" className="board__add-user-btn" onClick={() => setIsAddUserOpen(true)}>
            + Додати юзера
          </button>
        </div>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="board__columns">
          <Column
            id={BACKLOG_COLUMN_ID}
            title="Backlog"
            headerAction={<span className="column__count">{backlogTasks.length}</span>}
          >
            <AddTaskForm onAdd={handleAddTask} disabled={saving} />
            {backlogTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
                onDelete={() => handleDeleteTask(task.id)}
                onEditTitle={(title) => handleEditTaskTitle(task.id, title)}
              />
            ))}
          </Column>

          {board.users.map((user) => {
            const userTasks = board.tasks.filter((task) => task.assigneeId === user.id);
            return (
              <Column
                key={user.id}
                id={user.id}
                title={user.name}
                accentColor={user.color}
                headerAction={<span className="column__count">{userTasks.length}</span>}
                onDelete={() => setUserPendingDeletion(user)}
              >
                {userTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={(status) => handleStatusChange(task.id, status)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onEditTitle={(title) => handleEditTaskTitle(task.id, title)}
                  />
                ))}
              </Column>
            );
          })}
        </div>
      </DndContext>

      {isAddUserOpen && (
        <AddUserModal onAdd={handleAddUser} onClose={() => setIsAddUserOpen(false)} />
      )}

      {userPendingDeletion && (
        <ConfirmDialog
          title="Видалити юзера?"
          message={`Юзер "${userPendingDeletion.name}" буде видалений. Його задачі повернуться в Backlog.`}
          onConfirm={handleConfirmDeleteUser}
          onCancel={() => setUserPendingDeletion(null)}
        />
      )}
    </div>
  );
}

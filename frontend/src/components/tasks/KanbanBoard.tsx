import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { TaskStatus } from '../../types/enums';
import { KanbanColumn } from './KanbanColumn';
import { TaskDto } from '../../types/tasks';

export const KanbanBoard: React.FC = () => {
  const { tasks, setSelectedTask, setDetailModalOpen, isLoading } = useTaskStore();

  const handleSelectTask = (task: TaskDto) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const todoTasks = tasks.filter((t) => t.status === TaskStatus.TODO);
  const inProgressTasks = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS);
  const inReviewTasks = tasks.filter((t) => t.status === TaskStatus.IN_REVIEW);
  const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-96 rounded-2xl glass-panel-subtle border border-white/5 p-4" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      <KanbanColumn
        status={TaskStatus.TODO}
        title="Todo"
        tasks={todoTasks}
        onSelectTask={handleSelectTask}
      />
      <KanbanColumn
        status={TaskStatus.IN_PROGRESS}
        title="In Progress"
        tasks={inProgressTasks}
        onSelectTask={handleSelectTask}
      />
      <KanbanColumn
        status={TaskStatus.IN_REVIEW}
        title="In Review"
        tasks={inReviewTasks}
        onSelectTask={handleSelectTask}
      />
      <KanbanColumn
        status={TaskStatus.DONE}
        title="Done"
        tasks={doneTasks}
        onSelectTask={handleSelectTask}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { TaskDto } from '../../types/tasks';
import { TaskStatus } from '../../types/enums';
import { TaskCard } from './TaskCard';
import { useTaskStore } from '../../store/useTaskStore';
import { Circle, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  tasks: TaskDto[];
  onSelectTask: (task: TaskDto) => void;
}

const COLUMN_CONFIG: Record<
  TaskStatus,
  { icon: React.FC<{ className?: string }>; color: string; badge: string; border: string }
> = {
  [TaskStatus.TODO]: {
    icon: Circle,
    color: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    border: 'border-slate-800/80',
  },
  [TaskStatus.IN_PROGRESS]: {
    icon: Clock,
    color: 'text-blue-400',
    badge: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
    border: 'border-blue-900/30',
  },
  [TaskStatus.IN_REVIEW]: {
    icon: AlertCircle,
    color: 'text-amber-400',
    badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    border: 'border-amber-900/30',
  },
  [TaskStatus.DONE]: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    border: 'border-emerald-900/30',
  },
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  onSelectTask,
}) => {
  const { moveTaskStatus } = useTaskStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const config = COLUMN_CONFIG[status];
  const Icon = config.icon;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      try {
        await moveTaskStatus(taskId, status);
      } catch (err: any) {
        alert(err.response?.data?.error || err.message || 'Permission denied: Cannot move task');
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col rounded-2xl glass-panel-subtle border transition-all duration-200 min-h-[550px] p-3.5 ${
        isDragOver
          ? 'border-indigo-500/80 bg-indigo-950/20 shadow-xl shadow-indigo-950/50 scale-[1.01]'
          : config.border
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color}`} />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {title}
          </h2>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${config.badge}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-0.5">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl p-6 text-center text-slate-500 text-xs">
            <span>No tasks in this lane</span>
            <span className="text-[10px] text-slate-600 mt-1">Drag cards here to update status</span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onSelect={onSelectTask} />
          ))
        )}
      </div>
    </div>
  );
};

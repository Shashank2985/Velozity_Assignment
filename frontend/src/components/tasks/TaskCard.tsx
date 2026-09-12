import React from 'react';
import { TaskDto } from '../../types/tasks';
import { Priority, Role, TaskStatus } from '../../types/enums';
import { useAuthStore } from '../../store/useAuthStore';
import { useTaskStore } from '../../store/useTaskStore';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface TaskCardProps {
  task: TaskDto;
  onSelect: (task: TaskDto) => void;
}

const PRIORITY_STYLES: Record<Priority, { label: string; badge: string }> = {
  [Priority.LOW]: { label: 'LOW', badge: 'bg-slate-700/40 text-slate-300 border-slate-600/40' },
  [Priority.MEDIUM]: { label: 'MEDIUM', badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  [Priority.HIGH]: { label: 'HIGH', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  [Priority.CRITICAL]: {
    label: 'CRITICAL',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-900/30',
  },
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onSelect }) => {
  const { user } = useAuthStore();
  const { moveTaskStatus } = useTaskStore();

  const priorityStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES[Priority.MEDIUM];
  const dueDate = new Date(task.dueDate);
  const isOverdue = task.isOverdue || (task.status !== TaskStatus.DONE && isPast(dueDate));

  const isAssignee = user?.id === task.assigneeId;
  const isDev = user?.role === Role.DEVELOPER;
  const isPMOrAdmin = user?.role === Role.ADMIN || user?.role === Role.PM;

  // Can transition status?
  const canMoveToReview = isDev && isAssignee && task.status === TaskStatus.IN_PROGRESS;
  const canAdminPMMove = isPMOrAdmin;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleStatusClick = async (e: React.MouseEvent, targetStatus: TaskStatus) => {
    e.stopPropagation();
    try {
      await moveTaskStatus(task.id, targetStatus);
    } catch (err) {
      console.error('Failed to move task status:', err);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(task)}
      className={`group relative p-4 rounded-xl glass-card cursor-pointer border transition-all duration-200 ${
        isOverdue
          ? 'border-rose-500/40 shadow-lg shadow-rose-950/20 bg-rose-950/[0.07]'
          : 'border-white/10 hover:border-indigo-500/40'
      }`}
    >
      {/* Top Row: Priority & Due Date */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border tracking-wider uppercase font-mono ${priorityStyle.badge}`}
        >
          {priorityStyle.label}
        </span>

        {/* Due Date Indicator */}
        <div
          className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${
            isOverdue
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold animate-pulse-subtle'
              : 'bg-black/20 text-slate-400 border-white/5'
          }`}
        >
          {isOverdue ? (
            <AlertTriangle className="w-3 h-3 text-rose-400" />
          ) : (
            <Calendar className="w-3 h-3 text-slate-400" />
          )}
          <span>{format(dueDate, 'MMM dd')}</span>
        </div>
      </div>

      {/* Task Title */}
      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-200 transition-colors line-clamp-2 leading-snug mb-1.5">
        {task.title}
      </h3>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Project & Assignee Tag */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 flex-shrink-0">
            {task.assignee?.name?.charAt(0) || 'U'}
          </div>
          <span className="truncate">{task.assignee?.name || 'Unassigned'}</span>
        </div>

        {task.project && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 truncate max-w-[120px]">
            {task.project.name}
          </span>
        )}
      </div>

      {/* Quick Status Action Controls */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
        {canMoveToReview && (
          <button
            onClick={(e) => handleStatusClick(e, TaskStatus.IN_REVIEW)}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold shadow-sm transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            Submit for Review
          </button>
        )}

        {canAdminPMMove && (
          <div className="w-full flex items-center justify-end gap-1.5">
            {task.status === TaskStatus.TODO && (
              <button
                onClick={(e) => handleStatusClick(e, TaskStatus.IN_PROGRESS)}
                className="px-2 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[10px] font-medium transition-colors"
                title="Move to In Progress"
              >
                Start
              </button>
            )}
            {task.status === TaskStatus.IN_PROGRESS && (
              <button
                onClick={(e) => handleStatusClick(e, TaskStatus.IN_REVIEW)}
                className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-medium transition-colors"
                title="Move to In Review"
              >
                Review
              </button>
            )}
            {task.status === TaskStatus.IN_REVIEW && (
              <>
                <button
                  onClick={(e) => handleStatusClick(e, TaskStatus.IN_PROGRESS)}
                  className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-medium transition-colors"
                  title="Reject back to In Progress"
                >
                  Reject
                </button>
                <button
                  onClick={(e) => handleStatusClick(e, TaskStatus.DONE)}
                  className="px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium transition-colors"
                  title="Approve and Complete"
                >
                  Approve
                </button>
              </>
            )}
            {task.status === TaskStatus.DONE && (
              <button
                onClick={(e) => handleStatusClick(e, TaskStatus.IN_PROGRESS)}
                className="px-2 py-1 rounded bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 border border-slate-600/40 text-[10px] font-medium transition-colors"
                title="Reopen Task"
              >
                Reopen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

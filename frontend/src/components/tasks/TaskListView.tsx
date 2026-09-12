import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { TaskDto } from '../../types/tasks';
import { Priority, TaskStatus } from '../../types/enums';
import { format, isPast } from 'date-fns';
import { AlertTriangle, Calendar, ExternalLink } from 'lucide-react';

const STATUS_BADGES: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'bg-slate-800 text-slate-300 border-slate-700',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  [TaskStatus.IN_REVIEW]: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  [TaskStatus.DONE]: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
};

const PRIORITY_BADGES: Record<Priority, string> = {
  [Priority.LOW]: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  [Priority.MEDIUM]: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  [Priority.HIGH]: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  [Priority.CRITICAL]: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
};

export const TaskListView: React.FC = () => {
  const { tasks, setSelectedTask, setDetailModalOpen, isLoading } = useTaskStore();

  const handleSelect = (task: TaskDto) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  if (isLoading && tasks.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-white/10 animate-pulse h-64" />
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 text-slate-400">
        <p className="text-sm font-semibold text-slate-300">No tasks found matching your filter criteria</p>
        <p className="text-xs text-slate-500 mt-1">Try resetting or adjusting the filter query.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/40 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
            <tr>
              <th className="py-3 px-4">Task Details</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4">Assignee</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tasks.map((task) => {
              const dueDate = new Date(task.dueDate);
              const isOverdue = task.isOverdue || (task.status !== TaskStatus.DONE && isPast(dueDate));

              return (
                <tr
                  key={task.id}
                  onClick={() => handleSelect(task)}
                  className={`cursor-pointer transition-colors ${
                    isOverdue
                      ? 'bg-rose-950/[0.08] hover:bg-rose-950/[0.15]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Task details */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-semibold text-slate-100 hover:text-indigo-300 transition-colors line-clamp-1">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {task.description}
                      </div>
                    )}
                  </td>

                  {/* Project */}
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {task.project?.name || '—'}
                  </td>

                  {/* Assignee */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                        {task.assignee?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="text-slate-300">{task.assignee?.name || 'Unassigned'}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${
                        STATUS_BADGES[task.status]
                      }`}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider font-mono ${
                        PRIORITY_BADGES[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div
                      className={`flex items-center gap-1.5 ${
                        isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-300'
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{format(dueDate, 'MMM dd, yyyy')}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(task);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      title="View details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

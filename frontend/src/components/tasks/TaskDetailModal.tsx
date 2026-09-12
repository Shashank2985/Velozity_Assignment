import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuthStore } from '../../store/useAuthStore';
import { activityService } from '../../services/activity.service';
import { projectsService } from '../../services/projects.service';
import { TaskActivityLogDto } from '../../types/activity';
import { Priority, Role, TaskStatus } from '../../types/enums';
import { UserDto } from '../../types/auth';
import {
  X,
  Calendar,
  AlertTriangle,
  User,
  Folder,
  Trash2,
  Edit3,
  Check,
  Activity,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';

export const TaskDetailModal: React.FC = () => {
  const { user } = useAuthStore();
  const {
    selectedTask,
    isDetailModalOpen,
    setDetailModalOpen,
    updateTask,
    moveTaskStatus,
    deleteTask,
  } = useTaskStore();

  const [taskActivities, setTaskActivities] = useState<TaskActivityLogDto[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [assignees, setAssignees] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.PM;
  const canDelete = user?.role === Role.ADMIN || user?.role === Role.PM;
  const isDev = user?.role === Role.DEVELOPER;
  const isAssignee = user?.id === selectedTask?.assigneeId;

  useEffect(() => {
    if (selectedTask && isDetailModalOpen) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description || '');
      setPriority(selectedTask.priority);
      setDueDate(selectedTask.dueDate ? selectedTask.dueDate.split('T')[0] : '');
      setAssigneeId(selectedTask.assigneeId);
      setIsEditing(false);
      setError(null);

      // Fetch task activity history
      activityService.getActivityLogs({ taskId: selectedTask.id }).then((res) => {
        if (res.success) setTaskActivities(res.activities);
      });

      // Fetch assignees if canEdit
      if (canEdit) {
        projectsService.getUsers(Role.DEVELOPER).then((res) => {
          if (res.success) setAssignees(res.users);
        });
      }
    }
  }, [selectedTask, isDetailModalOpen]);

  if (!isDetailModalOpen || !selectedTask) return null;

  const isOverdue =
    selectedTask.isOverdue ||
    (selectedTask.status !== TaskStatus.DONE && isPast(new Date(selectedTask.dueDate)));

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await updateTask(selectedTask.id, {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        assigneeId,
      });
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusTransition = async (newStatus: TaskStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      await moveTaskStatus(selectedTask.id, newStatus);
      // Refresh audit logs
      const res = await activityService.getActivityLogs({ taskId: selectedTask.id });
      if (res.success) setTaskActivities(res.activities);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Cannot transition task status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this task?')) return;
    setIsLoading(true);
    try {
      await deleteTask(selectedTask.id);
      setDetailModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to delete task');
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 transition-opacity"
        onClick={() => setDetailModalOpen(false)}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-2xl max-h-[90vh] rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col animate-slide-up overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedTask.project?.name || 'Project'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    selectedTask.priority === Priority.CRITICAL
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {selectedTask.priority}
                </span>
                {isOverdue && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    OVERDUE
                  </span>
                )}
              </div>

              {!isEditing ? (
                <h2 className="text-lg font-bold text-white leading-snug">{selectedTask.title}</h2>
              ) : (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-1.5 text-base font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                  title="Edit task"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="p-2 text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/10 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex-shrink-0">
              {error}
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
            {/* Status Transition Action Bar */}
            <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Workflow State Transition
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.values(TaskStatus).map((st) => {
                  const isCurrent = selectedTask.status === st;
                  const canTransitionToThis =
                    canEdit || (isDev && isAssignee && st === TaskStatus.IN_REVIEW);

                  return (
                    <button
                      key={st}
                      onClick={() => handleStatusTransition(st)}
                      disabled={isCurrent || !canTransitionToThis || isLoading}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : canTransitionToThis
                          ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer'
                          : 'bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
              {isDev && (
                <p className="text-[11px] text-slate-400 mt-2">
                  * As a developer, you can move tasks assigned to you to IN_REVIEW. Project Managers and Admins verify and mark tasks as DONE.
                </p>
              )}
            </div>

            {/* Edit / View Form */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value={Priority.LOW}>Low</option>
                      <option value={Priority.MEDIUM}>Medium</option>
                      <option value={Priority.HIGH}>High</option>
                      <option value={Priority.CRITICAL}>Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Assignee
                    </label>
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {assignees.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Description */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Description
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/5">
                    {selectedTask.description || 'No description provided.'}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                      Assignee
                    </span>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-medium text-slate-200">
                        {selectedTask.assignee?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                      Due Date
                    </span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-medium text-slate-200">
                        {format(new Date(selectedTask.dueDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                      Project
                    </span>
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {selectedTask.project?.name || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Task Audit Trail / Activity Log */}
                <div className="pt-3 border-t border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    Task Audit History
                  </h4>

                  <div className="space-y-2">
                    {taskActivities.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No transition history recorded for this task yet.</p>
                    ) : (
                      taskActivities.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-slate-300">
                              {log.actor?.name || 'User'}
                            </span>
                            <span className="text-slate-500">transitioned to</span>
                            <span className="font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              {log.toStatus}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

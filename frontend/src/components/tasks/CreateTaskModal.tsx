import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { projectsService } from '../../services/projects.service';
import { Priority, Role, TaskStatus } from '../../types/enums';
import { ProjectDto } from '../../types/projects';
import { UserDto } from '../../types/auth';
import { X, Plus, Calendar, AlertTriangle, User, Folder, Check } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
}) => {
  const { createTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [assignees, setAssignees] = useState<UserDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority(Priority.MEDIUM);
      setStatus(TaskStatus.TODO);
      setError(null);

      // Default due date: 7 days from now
      const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setDueDate(defaultDue);

      Promise.all([projectsService.getProjects(), projectsService.getUsers(Role.DEVELOPER)])
        .then(([projRes, devRes]) => {
          if (projRes.success && projRes.projects) {
            setProjects(projRes.projects);
            if (!projectId && projRes.projects.length > 0) {
              setProjectId(defaultProjectId || projRes.projects[0].id);
            }
          }
          if (devRes.success && devRes.users) {
            setAssignees(devRes.users);
            if (devRes.users.length > 0) {
              setAssigneeId(devRes.users[0].id);
            }
          }
        })
        .catch((err) => console.error('Failed to load task dependencies:', err));
    }
  }, [isOpen, defaultProjectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !assigneeId || !dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        projectId,
        assigneeId,
        priority,
        dueDate: new Date(dueDate).toISOString(),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 transition-opacity" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-white/10 shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create New Task</h3>
                <p className="text-xs text-slate-400">Assign deliverables & set milestone deadlines</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="my-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement OAuth2 Refresh Token Rotation"
                required
                className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed technical requirements, endpoints, or acceptance criteria..."
                className="w-full bg-slate-900 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Project & Assignee Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  Target Project *
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Assignee (Developer) *
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {assignees.map((dev) => (
                    <option key={dev.id} value={dev.id}>
                      {dev.name} ({dev.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Due Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={Priority.LOW}>Low Priority</option>
                  <option value={Priority.MEDIUM}>Medium Priority</option>
                  <option value={Priority.HIGH}>High Priority</option>
                  <option value={Priority.CRITICAL}>Critical Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {isLoading ? 'Creating Task...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

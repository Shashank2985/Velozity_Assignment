import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocketStore } from '../../store/useSocketStore';
import { projectsService } from '../../services/projects.service';
import { ProjectDto } from '../../types/projects';
import { Role } from '../../types/enums';
import {
  FolderKanban,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  ChevronDown,
  Building,
} from 'lucide-react';

interface ProjectHeaderProps {
  onOpenCreateTask: () => void;
  onOpenCreateProject: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  onOpenCreateTask,
  onOpenCreateProject,
}) => {
  const { user } = useAuthStore();
  const { filters, setFilters, tasks } = useTaskStore();
  const { joinProject, leaveProject } = useSocketStore();
  const [projects, setProjects] = useState<ProjectDto[]>([]);

  const fetchProjects = async () => {
    try {
      const res = await projectsService.getProjects();
      if (res.success) {
        setProjects(res.projects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const selectedProjectId = filters.projectId || '';
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleSelectProject = (projectId: string) => {
    if (projectId) {
      setFilters({ projectId });
      joinProject(projectId);
    } else {
      setFilters({ projectId: undefined });
      if (selectedProjectId) {
        leaveProject(selectedProjectId);
      }
    }
  };

  // Compute live KPI metrics from tasks store
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReviewTasks = tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
  const overdueTasks = tasks.filter((t) => t.isOverdue).length;

  const completionPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const canCreateTask = user?.role === Role.ADMIN || user?.role === Role.PM;
  const canCreateProject = user?.role === Role.ADMIN;

  return (
    <div className="glass-panel rounded-2xl p-5 mb-6 border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 pb-5 border-b border-white/10">
        {/* Left: Project Selector & Details */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <FolderKanban className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Project Select Dropdown */}
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="appearance-none bg-slate-900/90 text-white font-bold text-lg md:text-xl pl-3 pr-9 py-1.5 rounded-xl border border-white/15 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="">All Scoped Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {selectedProject?.client && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  Client: {selectedProject.client.name}
                </span>
              )}

              {selectedProject?.pm && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  PM: {selectedProject.pm.name}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {user?.role === Role.ADMIN
                ? 'Viewing all system-wide client workspaces'
                : user?.role === Role.PM
                ? 'Viewing managed client deliverables & milestone progress'
                : 'Viewing assigned tasks across project sprints'}
            </p>
          </div>
        </div>

        {/* Right: Actions (Create Task / Project) */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {canCreateProject && (
            <button
              onClick={onOpenCreateProject}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              New Project
            </button>
          )}

          {canCreateTask && (
            <button
              onClick={onOpenCreateTask}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards & Progress Bar */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {/* Total Tasks */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Tasks</span>
            <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <span className="text-xl font-bold text-white">{totalTasks}</span>
        </div>

        {/* In Progress */}
        <div className="p-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/20">
          <div className="flex items-center justify-between text-blue-400 text-xs mb-1">
            <span>In Progress</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-bold text-blue-300">{inProgressTasks}</span>
        </div>

        {/* In Review */}
        <div className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
            <span>In Review</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-bold text-amber-300">{inReviewTasks}</span>
        </div>

        {/* Completed */}
        <div className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span>Done</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-bold text-emerald-300">{doneTasks}</span>
        </div>

        {/* Overdue */}
        <div className="p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/20">
          <div className="flex items-center justify-between text-rose-400 text-xs mb-1">
            <span>Overdue</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-bold text-rose-300">{overdueTasks}</span>
        </div>

        {/* Completion Rate */}
        <div className="p-3 rounded-xl bg-purple-500/[0.04] border border-purple-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-400 text-xs mb-1">
            <span>Completion</span>
            <span className="font-bold">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

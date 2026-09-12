import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useAuthStore } from '../../store/useAuthStore';
import { projectsService } from '../../services/projects.service';
import { Priority, Role, TaskStatus } from '../../types/enums';
import { UserDto } from '../../types/auth';
import {
  Search,
  X,
  AlertTriangle,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react';

export const TaskFilterBar: React.FC = () => {
  const { user } = useAuthStore();
  const {
    filters,
    setFilters,
    resetFilters,
    isKanbanView,
    setKanbanView,
  } = useTaskStore();

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [assignees, setAssignees] = useState<UserDto[]>([]);

  // Load assignees list for Admin / PM filters
  useEffect(() => {
    if (user?.role !== Role.DEVELOPER) {
      projectsService.getUsers(Role.DEVELOPER).then((res) => {
        if (res.success) setAssignees(res.users);
      });
    }
  }, [user]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        setFilters({ search: searchTerm || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const activeStatus = (filters.status as TaskStatus) || '';
  const activePriority = (filters.priority as Priority) || '';
  const isOverdueFilter = filters.isOverdue === true;

  const hasActiveFilters =
    !!filters.search ||
    !!filters.status ||
    !!filters.priority ||
    !!filters.assigneeId ||
    filters.isOverdue === true;

  return (
    <div className="glass-panel rounded-2xl p-4 mb-6 border border-white/10 shadow-lg flex flex-col gap-3">
      {/* Top Row: Search & View Toggle */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks by title, keyword, or description..."
            className="w-full bg-slate-900/80 border border-white/15 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Mode Toggle & Sort */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Sorting */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters({ sortBy: sortBy as any, sortOrder: sortOrder as any });
              }}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="createdAt-desc" className="bg-slate-900">Newest Created</option>
              <option value="createdAt-asc" className="bg-slate-900">Oldest Created</option>
              <option value="dueDate-asc" className="bg-slate-900">Due Date (Soonest)</option>
              <option value="dueDate-desc" className="bg-slate-900">Due Date (Latest)</option>
              <option value="priority-desc" className="bg-slate-900">Priority (High to Low)</option>
            </select>
          </div>

          {/* Kanban / List Toggle Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/15">
            <button
              onClick={() => setKanbanView(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isKanbanView
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setKanbanView(false)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                !isKanbanView
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Filter Pills */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Pills */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setFilters({ status: undefined })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                !activeStatus ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilters({ status: TaskStatus.TODO })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                activeStatus === TaskStatus.TODO ? 'bg-slate-700/60 text-slate-200 border border-slate-600' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setFilters({ status: TaskStatus.IN_PROGRESS })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                activeStatus === TaskStatus.IN_PROGRESS ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilters({ status: TaskStatus.IN_REVIEW })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                activeStatus === TaskStatus.IN_REVIEW ? 'bg-amber-600/30 text-amber-200 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In Review
            </button>
            <button
              onClick={() => setFilters({ status: TaskStatus.DONE })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                activeStatus === TaskStatus.DONE ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Done
            </button>
          </div>

          {/* Priority Filter */}
          <select
            value={activePriority}
            onChange={(e) => setFilters({ priority: (e.target.value as Priority) || undefined })}
            className="bg-slate-900/90 border border-white/15 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value={Priority.LOW}>Low Priority</option>
            <option value={Priority.MEDIUM}>Medium Priority</option>
            <option value={Priority.HIGH}>High Priority</option>
            <option value={Priority.CRITICAL}>Critical Priority</option>
          </select>

          {/* Assignee Filter (Admin/PM only) */}
          {user?.role !== Role.DEVELOPER && (
            <select
              value={filters.assigneeId || ''}
              onChange={(e) => setFilters({ assigneeId: e.target.value || undefined })}
              className="bg-slate-900/90 border border-white/15 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="">All Assignees</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          {/* Overdue Only Filter */}
          <button
            onClick={() => setFilters({ isOverdue: isOverdueFilter ? undefined : true })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${
              isOverdueFilter
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950/40'
                : 'border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${isOverdueFilter ? 'text-rose-400 animate-pulse' : ''}`} />
            Overdue Only
          </button>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchTerm('');
              resetFilters();
            }}
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

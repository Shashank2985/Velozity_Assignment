import { create } from 'zustand';
import { TaskDto, TaskFilterParams, CreateTaskDto, UpdateTaskDto } from '../types/tasks';
import { TaskStatus } from '../types/enums';
import { tasksService } from '../services/tasks.service';

interface TaskState {
  tasks: TaskDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: TaskFilterParams;
  isLoading: boolean;
  isKanbanView: boolean;
  selectedTask: TaskDto | null;
  isDetailModalOpen: boolean;
  isCreateModalOpen: boolean;

  fetchTasks: () => Promise<void>;
  setFilters: (newFilters: Partial<TaskFilterParams>) => void;
  resetFilters: () => void;
  setKanbanView: (isKanban: boolean) => void;
  toggleViewMode: () => void;
  setSelectedTask: (task: TaskDto | null) => void;
  setDetailModalOpen: (open: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;

  createTask: (data: CreateTaskDto) => Promise<TaskDto>;
  updateTask: (id: string, data: UpdateTaskDto) => Promise<TaskDto>;
  moveTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  handleSocketTaskUpdated: (task: TaskDto) => void;
  handleSocketTaskCreated: (task: TaskDto) => void;
}

const initialFilters: TaskFilterParams = {
  page: 1,
  limit: 50,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
  filters: { ...initialFilters },
  isLoading: false,
  isKanbanView: true,
  selectedTask: null,
  isDetailModalOpen: false,
  isCreateModalOpen: false,

  setKanbanView: (isKanban) => set({ isKanbanView: isKanban }),
  toggleViewMode: () => set((state) => ({ isKanbanView: !state.isKanbanView })),
  setSelectedTask: (task) => set({ selectedTask: task }),
  setDetailModalOpen: (open) => set({ isDetailModalOpen: open }),
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, page: 1 },
    }));
    get().fetchTasks();
  },

  resetFilters: () => {
    set({ filters: { ...initialFilters } });
    get().fetchTasks();
  },

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const res = await tasksService.getTasks(get().filters);
      if (res.success) {
        set({
          tasks: res.tasks,
          meta: res.meta,
          isLoading: false,
        });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createTask: async (data: CreateTaskDto) => {
    const res = await tasksService.createTask(data);
    if (res.success && res.task) {
      set((state) => ({
        tasks: [res.task, ...state.tasks],
        meta: { ...state.meta, total: state.meta.total + 1 },
      }));
      return res.task;
    }
    throw new Error('Failed to create task');
  },

  updateTask: async (id: string, data: UpdateTaskDto) => {
    const res = await tasksService.updateTask(id, data);
    if (res.success && res.task) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? res.task : t)),
        selectedTask: state.selectedTask?.id === id ? res.task : state.selectedTask,
      }));
      return res.task;
    }
    throw new Error('Failed to update task');
  },

  moveTaskStatus: async (taskId: string, newStatus: TaskStatus) => {
    const previousTasks = get().tasks;
    const existing = previousTasks.find((t) => t.id === taskId);
    if (!existing || existing.status === newStatus) return;

    // Optimistic Update
    const isNowOverdue =
      newStatus === TaskStatus.DONE ? false : new Date(existing.dueDate) < new Date();

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, isOverdue: isNowOverdue } : t
      ),
      selectedTask:
        state.selectedTask?.id === taskId
          ? { ...state.selectedTask, status: newStatus, isOverdue: isNowOverdue }
          : state.selectedTask,
    }));

    try {
      const res = await tasksService.updateTaskStatus(taskId, newStatus);
      if (res.success && res.task) {
        // Confirmed server update
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? res.task : t)),
          selectedTask: state.selectedTask?.id === taskId ? res.task : state.selectedTask,
        }));
      }
    } catch (err) {
      // Rollback on error
      set({ tasks: previousTasks });
      console.error('Failed to move task status:', err);
      throw err;
    }
  },

  deleteTask: async (id: string) => {
    await tasksService.deleteTask(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
      isDetailModalOpen: state.selectedTask?.id === id ? false : state.isDetailModalOpen,
      meta: { ...state.meta, total: Math.max(0, state.meta.total - 1) },
    }));
  },

  handleSocketTaskUpdated: (updatedTask: TaskDto) => {
    set((state) => {
      const exists = state.tasks.some((t) => t.id === updatedTask.id);
      let updatedList = state.tasks;
      if (exists) {
        updatedList = state.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      } else {
        // Check if task matches active project filter
        if (!state.filters.projectId || state.filters.projectId === updatedTask.projectId) {
          updatedList = [updatedTask, ...state.tasks];
        }
      }

      return {
        tasks: updatedList,
        selectedTask:
          state.selectedTask?.id === updatedTask.id ? updatedTask : state.selectedTask,
      };
    });
  },

  handleSocketTaskCreated: (newTask: TaskDto) => {
    set((state) => {
      const exists = state.tasks.some((t) => t.id === newTask.id);
      if (exists) return state;

      if (state.filters.projectId && state.filters.projectId !== newTask.projectId) {
        return state;
      }

      return {
        tasks: [newTask, ...state.tasks],
        meta: { ...state.meta, total: state.meta.total + 1 },
      };
    });
  },
}));

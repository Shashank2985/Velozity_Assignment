import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore } from '../store/useTaskStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useActivityStore } from '../store/useActivityStore';
import { Header } from '../components/common/Header';
import { ProjectHeader } from '../components/projects/ProjectHeader';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { TaskFilterBar } from '../components/tasks/TaskFilterBar';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { NotificationDrawer } from '../components/common/NotificationDrawer';
import { LiveActivityFeed } from '../components/common/LiveActivityFeed';
import { ToastContainer } from '../components/common/ToastContainer';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { fetchTasks, isKanbanView, filters } = useTaskStore();
  const { fetchNotifications } = useNotificationStore();
  const { fetchActivities } = useActivityStore();

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchNotifications();
    fetchActivities();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* Project KPI & Switcher Header */}
        <ProjectHeader
          onOpenCreateTask={() => setIsCreateTaskOpen(true)}
          onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        />

        {/* Dynamic Multi-Field Filter & Search Bar */}
        <TaskFilterBar />

        {/* Task Board / List View */}
        {isKanbanView ? <KanbanBoard /> : <TaskListView />}
      </main>

      {/* Modals & Drawers */}
      <TaskDetailModal />
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        defaultProjectId={filters.projectId}
      />
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreated={() => {
          fetchTasks();
        }}
      />
      <NotificationDrawer />
      <LiveActivityFeed />
      <ToastContainer />
    </div>
  );
};

import React from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useTaskStore } from '../../store/useTaskStore';
import { Bell, CheckCheck, X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDrawer: React.FC = () => {
  const { notifications, unreadCount, isDrawerOpen, setDrawerOpen, markAsRead, markAllAsRead } =
    useNotificationStore();
  const { setSelectedTask, setDetailModalOpen, tasks } = useTaskStore();

  if (!isDrawerOpen) return null;

  const handleNotificationClick = (taskId?: string | null, notifId?: string) => {
    if (notifId) markAsRead(notifId);
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setDetailModalOpen(true);
        setDrawerOpen(false);
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      {/* Slide-out Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900/95 border-l border-white/10 backdrop-blur-2xl z-50 p-6 flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white font-medium">
                    {unreadCount} new
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Real-time alerts and state updates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Bell className="w-10 h-10 stroke-1 mb-2 opacity-40" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-slate-500 mt-1">
                You will be notified when tasks are assigned, moved to review, or overdue.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isOverdue = notif.message.toLowerCase().includes('overdue');
              const isReview = notif.message.toLowerCase().includes('in_review');

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.taskId, notif.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    !notif.read
                      ? 'bg-indigo-950/40 border-indigo-500/30 hover:bg-indigo-950/60 shadow-lg shadow-indigo-950/30'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {isOverdue ? (
                        <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : isReview ? (
                        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          <Clock className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-relaxed ${
                          !notif.read ? 'font-medium text-slate-200' : 'text-slate-300'
                        }`}
                      >
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                        <span className="text-[10px] text-slate-400">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

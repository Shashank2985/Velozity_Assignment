import React from 'react';
import { useActivityStore } from '../../store/useActivityStore';
import { useSocketStore } from '../../store/useSocketStore';
import { Activity, ArrowRight, RefreshCw, X, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { TaskStatus } from '../../types/enums';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  [TaskStatus.TODO]: { label: 'TODO', color: 'bg-slate-700/50 text-slate-300 border-slate-600/50' },
  [TaskStatus.IN_PROGRESS]: { label: 'IN PROGRESS', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  [TaskStatus.IN_REVIEW]: { label: 'IN REVIEW', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  [TaskStatus.DONE]: { label: 'DONE', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
};

export const LiveActivityFeed: React.FC = () => {
  const { activities, isFeedOpen, setFeedOpen, performCatchUpSync, isLoading } = useActivityStore();
  const { isConnected, activeProjectId } = useSocketStore();

  if (!isFeedOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setFeedOpen(false)}
      />

      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900/95 border-l border-white/10 backdrop-blur-2xl z-50 p-6 flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Live Activity Feed</h2>
                <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  LIVE
                </div>
              </div>
              <p className="text-xs text-slate-400">Real-time state transitions audit</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => performCatchUpSync(activeProjectId || undefined)}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Sync latest activities"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setFeedOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="py-2.5 px-3 rounded-lg bg-black/30 border border-white/5 my-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>Connection Status:</span>
          <span className={`font-semibold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isConnected ? 'Connected to Socket.io' : 'Reconnecting...'}
          </span>
        </div>

        {/* Activity Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activities.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Activity className="w-10 h-10 stroke-1 mb-2 opacity-40" />
              <p className="text-sm font-medium">No activity recorded yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Transitions between TODO, IN PROGRESS, IN REVIEW, and DONE will stream here live.
              </p>
            </div>
          ) : (
            activities.map((activity) => {
              const toStatusConf = STATUS_CONFIG[activity.toStatus] || STATUS_CONFIG[TaskStatus.TODO];
              const fromStatusConf = activity.fromStatus ? STATUS_CONFIG[activity.fromStatus] : null;

              return (
                <div
                  key={activity.id}
                  className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {activity.actor?.name || 'User'}
                    </span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium line-clamp-2 mb-2">
                    {activity.task?.title ? `"${activity.task.title}"` : 'Task status updated'}
                  </p>

                  <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                    {fromStatusConf && (
                      <>
                        <span className={`px-2 py-0.5 rounded-md border ${fromStatusConf.color}`}>
                          {fromStatusConf.label}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                      </>
                    )}
                    <span className={`px-2 py-0.5 rounded-md border font-medium ${toStatusConf.color}`}>
                      {toStatusConf.label}
                    </span>
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

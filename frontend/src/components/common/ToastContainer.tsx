import React from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let borderClasses = 'border-indigo-500/30 text-indigo-400';
        let bgGradient = 'from-indigo-950/90 to-slate-900/90';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          borderClasses = 'border-emerald-500/30 text-emerald-400';
          bgGradient = 'from-emerald-950/90 to-slate-900/90';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          borderClasses = 'border-amber-500/30 text-amber-400';
          bgGradient = 'from-amber-950/90 to-slate-900/90';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          borderClasses = 'border-rose-500/30 text-rose-400';
          bgGradient = 'from-rose-950/90 to-slate-900/90';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-gradient-to-br ${bgGradient} ${borderClasses} backdrop-blur-xl shadow-2xl shadow-black/50 animate-slide-up`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                {toast.title}
              </h4>
              <p className="text-sm text-slate-300 mt-0.5 leading-snug line-clamp-2">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors p-1"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocketStore } from '../../store/useSocketStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useActivityStore } from '../../store/useActivityStore';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';
import {
  Bell,
  Activity,
  LogOut,
  Users,
  Layers,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { logout } = useAuthStore();
  const { isConnected, onlineUsersCount } = useSocketStore();
  const { unreadCount, toggleDrawer } = useNotificationStore();
  const { toggleFeed } = useActivityStore();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25 p-0.5">
            <div className="w-full h-full bg-slate-950/80 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                VELOZITY
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ENTERPRISE
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Real-Time Project & Task Orchestration
            </p>
          </div>
        </div>

        {/* Right: Actions, Live Presence, Demo Switcher, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Live Presence Counter */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] glass-panel-subtle text-xs"
            title={`${onlineUsersCount} user(s) currently active on WebSocket server`}
          >
            <div className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isConnected ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-200">{onlineUsersCount}</span>
              <span className="text-slate-400 hidden md:inline">Online</span>
            </div>
          </div>

          {/* 1-Click Demo Persona Switcher */}
          <DemoRoleSwitcher />

          {/* Activity Feed Button */}
          <button
            onClick={toggleFeed}
            className="p-2 rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all relative glass-panel-subtle"
            title="Open Live Activity Feed"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Notification Bell Button */}
          <button
            onClick={toggleDrawer}
            className="p-2 rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all relative glass-panel-subtle"
            title="Open Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Logout button */}
          <button
            onClick={() => logout()}
            className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-all glass-panel-subtle"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

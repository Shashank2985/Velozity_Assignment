import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Layers, Shield, Briefcase, Code2, ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      // Error handled in store
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    clearError();
    setEmail(demoEmail);
    try {
      await login(demoEmail, 'Password123!');
      navigate('/');
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Gradients & Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/20 mb-4 p-0.5">
            <div className="bg-slate-950/80 p-3 rounded-[14px]">
              <Layers className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            VELOZITY
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">
            Real-Time Client Project Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl p-7 border border-white/10 shadow-2xl backdrop-blur-2xl">
          <h2 className="text-lg font-bold text-white mb-1">Welcome back</h2>
          <p className="text-xs text-slate-400 mb-6">
            Sign in to access your scoped project workspaces & live task boards.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@velozity.com"
                  required
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-900/90 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Personas */}
          <div className="mt-7 pt-5 border-t border-white/10">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Demo Personas</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@velozity.com')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-all text-center group active:scale-95"
              >
                <Shield className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-purple-400" />
                <span className="text-xs font-bold">Admin</span>
                <span className="text-[9px] text-purple-400/80 font-mono">Sarah</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('pm.alice@velozity.com')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-all text-center group active:scale-95"
              >
                <Briefcase className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-blue-400" />
                <span className="text-xs font-bold">PM</span>
                <span className="text-[9px] text-blue-400/80 font-mono">Alice</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('dev.carol@velozity.com')}
                disabled={isLoading}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all text-center group active:scale-95"
              >
                <Code2 className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform text-emerald-400" />
                <span className="text-xs font-bold">Developer</span>
                <span className="text-[9px] text-emerald-400/80 font-mono">Carol</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

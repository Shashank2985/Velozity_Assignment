import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center border border-white/10 shadow-2xl">
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-2">404</h1>
        <p className="text-sm font-semibold text-slate-300 mb-1">Page not found</p>
        <p className="text-xs text-slate-500 mb-6">
          The dashboard view you requested could not be located.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

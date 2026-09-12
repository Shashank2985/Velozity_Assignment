import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { Role } from '../../types/enums';
import { Shield, Briefcase, Code2, ChevronDown, Check, Sparkles } from 'lucide-react';

const DEMO_PERSONAS = [
  {
    name: 'Sarah Jenkins',
    email: 'admin@velozity.com',
    role: Role.ADMIN,
    description: 'System Administrator (Full Global Scoping & CRUD)',
    color: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
    icon: Shield,
  },
  {
    name: 'Alice Zhang',
    email: 'pm.alice@velozity.com',
    role: Role.PM,
    description: 'Project Manager (Apex & Nexus Projects)',
    color: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
    icon: Briefcase,
  },
  {
    name: 'Bob Martinez',
    email: 'pm.bob@velozity.com',
    role: Role.PM,
    description: 'Project Manager (Beacon Project)',
    color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
    icon: Briefcase,
  },
  {
    name: 'Carol Vance',
    email: 'dev.carol@velozity.com',
    role: Role.DEVELOPER,
    description: 'Senior Frontend Engineer (Assigned Tasks)',
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    icon: Code2,
  },
  {
    name: 'David Kim',
    email: 'dev.david@velozity.com',
    role: Role.DEVELOPER,
    description: 'Backend Engineer (Assigned Tasks)',
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    icon: Code2,
  },
  {
    name: 'Eva Rossi',
    email: 'dev.eva@velozity.com',
    role: Role.DEVELOPER,
    description: 'Full-Stack Engineer (Assigned Tasks)',
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    icon: Code2,
  },
  {
    name: 'Frank Patel',
    email: 'dev.frank@velozity.com',
    role: Role.DEVELOPER,
    description: 'Mobile / DevOps Engineer (Assigned Tasks)',
    color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    icon: Code2,
  },
];

export const DemoRoleSwitcher: React.FC = () => {
  const { user, switchDemoRole, isLoading } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentPersona = DEMO_PERSONAS.find((p) => p.email === user?.email) || {
    name: user?.name || 'Current User',
    email: user?.email || '',
    role: user?.role || Role.DEVELOPER,
    description: 'Active Session',
    color: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10',
    icon: user?.role === Role.ADMIN ? Shield : user?.role === Role.PM ? Briefcase : Code2,
  };

  const Icon = currentPersona.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 ${currentPersona.color} hover:opacity-90 active:scale-95 glass-panel-subtle shadow-lg`}
        title="1-Click Demo Persona Switcher (Instant RBAC testing)"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <Icon className="w-3.5 h-3.5" />
          <span className="font-semibold">{currentPersona.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-black/30">
            {currentPersona.role}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-dropdown z-50 p-2 shadow-2xl border border-white/10 animate-slide-up">
            <div className="px-3 py-2 border-b border-white/10 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  1-Click Role Switcher
                </span>
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  RBAC Playground
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Instantly switch account to test role permissions & real-time updates.
              </p>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {DEMO_PERSONAS.map((persona) => {
                const isSelected = user?.email === persona.email;
                const PersonaIcon = persona.icon;

                return (
                  <button
                    key={persona.email}
                    onClick={async () => {
                      setIsOpen(false);
                      if (!isSelected) {
                        await switchDemoRole(persona.email);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                        : 'hover:bg-white/5 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg border ${persona.color}`}>
                        <PersonaIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {persona.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded uppercase font-mono tracking-wider bg-black/40 text-slate-400">
                            {persona.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {persona.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

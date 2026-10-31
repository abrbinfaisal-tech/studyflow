import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Compass, 
  FileCheck2, 
  Timer, 
  TrendingUp, 
  FileText, 
  Sparkles,
  X,
  GraduationCap
} from 'lucide-react';
import { NavigationSection } from '../types';

interface SidebarProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: NavigationSection; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tutor', label: 'AI Tutor', icon: Bot, badge: 'Interactive' },
  { id: 'roadmap', label: 'Study Roadmap', icon: Compass, badge: 'AI Plan' },
  { id: 'paper', label: 'Paper Analyzer', icon: FileCheck2, badge: 'Exam' },
  { id: 'focus', label: 'Focus Tools', icon: Timer },
  { id: 'progress', label: 'My Progress', icon: TrendingUp },
  { id: 'notes', label: 'My Notes', icon: FileText },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-950/95 lg:bg-slate-950/80 border-r border-purple-500/20 backdrop-blur-xl z-50 flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/50">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  Study Flow
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                </h1>
                <p className="text-[10px] text-purple-300/80 font-medium tracking-wide">
                  Your Studies, Your Pace
                </p>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tagline Badge */}
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-center">
            <p className="text-[11px] font-semibold text-purple-200">
              Your Studies • Your Pace
            </p>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">
              Your Success
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSection(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-950/50'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-purple-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      isActive 
                        ? 'bg-purple-950/80 text-purple-200 border border-purple-400/40' 
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & student motivation */}
        <div className="pt-4 border-t border-slate-900 space-y-2">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-[11px] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-200 block text-xs">Student Hub</span>
              <span className="text-[10px] text-slate-500">Exam preparation mode</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

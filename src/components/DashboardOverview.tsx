import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Compass, 
  FileCheck2, 
  Timer, 
  ArrowRight, 
  Flame, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  ChevronRight,
  TrendingUp,
  Search
} from 'lucide-react';
import { NavigationSection, StudyRoadmap, UserProgressData } from '../types';
import { StorageService } from '../services/storage';

interface DashboardOverviewProps {
  onNavigate: (section: NavigationSection) => void;
  onAskTutorPrompt: (prompt: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate, onAskTutorPrompt }) => {
  const [roadmaps, setRoadmaps] = useState<StudyRoadmap[]>([]);
  const [progress, setProgress] = useState<UserProgressData | null>(null);
  const [quickQuestion, setQuickQuestion] = useState('');

  useEffect(() => {
    setRoadmaps(StorageService.getRoadmaps());
    setProgress(StorageService.getProgress());
  }, []);

  const activeRoadmap = roadmaps[0];
  const totalTasks = activeRoadmap?.days.reduce((acc, d) => acc + d.tasks.length, 0) || 0;
  const completedTasks = activeRoadmap?.days.reduce((acc, d) => acc + d.tasks.filter(t => t.completed).length, 0) || 0;
  const roadmapPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleQuickAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuestion.trim()) return;
    onAskTutorPrompt(quickQuestion);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/30 p-8 shadow-2xl overflow-hidden">
        {/* Soft glowing ambient circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Study Flow • AI Academic Corner</span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-violet-300 to-indigo-200">Study Flow</span>
            </h1>
            <p className="text-purple-200/90 font-medium text-sm sm:text-base mt-1">
              "Your Studies, Your Pace, Your Success"
            </p>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Understand difficult concepts with your personal AI Tutor, follow a realistic daily roadmap tailored to your exams, analyze past papers, and stay in deep focus.
          </p>

          {/* Quick AI Tutor Ask Bar */}
          <form onSubmit={handleQuickAsk} className="pt-2 flex items-center gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickQuestion}
                onChange={e => setQuickQuestion(e.target.value)}
                placeholder="Ask your AI Tutor anything (e.g. 'Explain the chain rule with a diagram')..."
                className="w-full bg-slate-950/90 border border-purple-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 flex items-center gap-1.5 transition-all shrink-0"
            >
              <span>Ask Tutor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Quick Overview Metric Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md flex items-center gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Study Time</span>
            <span className="text-lg font-bold text-white">
              {progress ? Math.round((progress.totalStudyMinutes / 60) * 10) / 10 : 0} hrs
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md flex items-center gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Streak</span>
            <span className="text-lg font-bold text-white">{progress?.streakDays || 0} Days</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md flex items-center gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Roadmaps</span>
            <span className="text-lg font-bold text-white">{roadmaps.length} Plans</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md flex items-center gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mastery Score</span>
            <span className="text-lg font-bold text-white">
              {progress && progress.assessmentRecords.length > 0 
                ? Math.round(progress.assessmentRecords.reduce((a, b) => a + b.percentage, 0) / progress.assessmentRecords.length) 
                : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* The 4 Main Feature Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Four Core Learning Pillars
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. AI Tutor Card */}
          <div 
            onClick={() => onNavigate('tutor')}
            className="group cursor-pointer p-6 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-purple-500/20 hover:border-purple-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Pillar 1</span>
                <h3 className="text-base font-bold text-white group-hover:text-purple-200 transition-colors">
                  AI Personal Tutor
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Interactive Socratic tutor. Simplifies difficult concepts, formats math equations, provides diagrams, and tests your mastery.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
              <span>Start Learning</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. AI Study Roadmap Card */}
          <div 
            onClick={() => onNavigate('roadmap')}
            className="group cursor-pointer p-6 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-purple-500/20 hover:border-purple-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-900/40 group-hover:scale-105 transition-transform">
                <Compass className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Pillar 2</span>
                <h3 className="text-base font-bold text-white group-hover:text-violet-200 transition-colors">
                  AI Study Roadmap
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Upload syllabus or chapters. Generates a balanced day-by-day study schedule matched to your available daily minutes and exam deadline.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-violet-400 group-hover:text-violet-300">
              <span>View / Plan Schedule</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. AI Paper Analyzer Card */}
          <div 
            onClick={() => onNavigate('paper')}
            className="group cursor-pointer p-6 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-purple-500/20 hover:border-purple-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Pillar 3</span>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-200 transition-colors">
                  AI Paper Analyzer
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Upload PDF or image exam papers. Classifies questions into Easy, Moderate, and Hard, and prioritises High-yield revision topics.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
              <span>Analyze Exam Paper</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 4. Focus Tools Card */}
          <div 
            onClick={() => onNavigate('focus')}
            className="group cursor-pointer p-6 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-purple-500/20 hover:border-purple-500/50 shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-700 to-pink-700 flex items-center justify-center text-white shadow-lg shadow-pink-900/40 group-hover:scale-105 transition-transform">
                <Timer className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Pillar 4</span>
                <h3 className="text-base font-bold text-white group-hover:text-purple-200 transition-colors">
                  Focus Tools
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Customizable Pomodoro timer, stopwatch with laps, and soothing ambient focus audio. Auto-logs completed sessions.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
              <span>Launch Focus Timer</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Roadmap Checkpoint & Quick Start Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Roadmap Checkpoint */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-400" />
              Current Study Roadmap Checkpoint
            </h3>
            {activeRoadmap && (
              <button
                onClick={() => onNavigate('roadmap')}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                View full schedule
              </button>
            )}
          </div>

          {activeRoadmap ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{activeRoadmap.roadmapTitle}</h4>
                  <p className="text-xs text-slate-400">{activeRoadmap.subject} • {activeRoadmap.days.length} Days Schedule</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-purple-300">{roadmapPct}% Complete</span>
                  <span className="text-[10px] text-slate-500 block">{completedTasks}/{totalTasks} tasks</span>
                </div>
              </div>

              {/* Show next uncompleted tasks */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">Upcoming Tasks for Today:</span>
                {activeRoadmap.days.flatMap(d => d.tasks).filter(t => !t.completed).slice(0, 3).map((task) => (
                  <div key={task.id} className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <div>
                        <span className="font-semibold text-slate-200">{task.title}</span>
                        <span className="text-[10px] text-slate-500 block">{task.durationMinutes} mins • {task.topic}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onAskTutorPrompt(task.tutorPrompt)}
                      className="px-2.5 py-1 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Study</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              No roadmap generated yet. Click "AI Study Roadmap" to generate one in seconds!
            </div>
          )}
        </div>

        {/* Quick Study Corner Tips */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-950/30 via-slate-900/80 to-slate-900 border border-purple-500/20 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Study Flow Smart Tips</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="font-semibold text-purple-300">Active Recall over Rereading:</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                After reading an AI Tutor explanation, click "Quiz Me" immediately. Retrieving concepts cements memory 3x faster than passive rereading.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="font-semibold text-purple-300">Tackle High-Priority Topics First:</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Use the Paper Analyzer to spot High Priority topics with large mark allocations before spending hours on low-weightage details.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('notes')}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Formula Bank & Notes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  TrendingUp, 
  Award, 
  Flame, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Layers, 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  ArrowUpRight, 
  RotateCcw,
  Play
} from 'lucide-react';
import { UserProgressData, StudyRoadmap } from '../types';
import { StorageService } from '../services/storage';

interface ProgressDashboardViewProps {
  onNavigate: (section: any) => void;
}

export const ProgressDashboardView: React.FC<ProgressDashboardViewProps> = ({ onNavigate }) => {
  const [progress, setProgress] = useState<UserProgressData | null>(null);
  const [roadmaps, setRoadmaps] = useState<StudyRoadmap[]>([]);

  useEffect(() => {
    setProgress(StorageService.getProgress());
    setRoadmaps(StorageService.getRoadmaps());
  }, []);

  if (!progress) return null;

  // Genuine student metrics
  const totalHours = Math.round((progress.totalStudyMinutes / 60) * 10) / 10;
  const totalTasks = roadmaps.reduce((acc, r) => acc + r.days.reduce((dAcc, d) => dAcc + d.tasks.length, 0), 0);
  const completedTasks = roadmaps.reduce((acc, r) => acc + r.days.reduce((dAcc, d) => dAcc + d.tasks.filter(t => t.completed).length, 0), 0);
  const roadmapPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const completedRoadmaps = roadmaps.filter(r => r.days.length > 0 && r.days.every(d => d.tasks.length > 0 && d.tasks.every(t => t.completed)));

  const averageQuizScore = progress.assessmentRecords.length > 0
    ? Math.round(progress.assessmentRecords.reduce((acc, q) => acc + q.percentage, 0) / progress.assessmentRecords.length)
    : 0;

  // Real 7-day study minutes calculation based on genuine session logs
  const getPast7DaysData = () => {
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysData: { label: string; minutes: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayLabel = daysName[d.getDay()];

      const minutesForDay = progress.sessionLogs
        .filter(s => new Date(s.completedAt).toISOString().split('T')[0] === dateKey)
        .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      daysData.push({ label: dayLabel, minutes: minutesForDay });
    }
    return daysData;
  };

  const past7Days = getPast7DaysData();
  const maxDayMinutes = Math.max(60, ...past7Days.map(d => d.minutes));

  const handleResetData = () => {
    if (window.confirm('Reset study progress to zero for a clean start?')) {
      const fresh = StorageService.resetProgress();
      setProgress(fresh);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-white shadow-lg shadow-purple-950/40">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              My Academic Progress Dashboard
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Analytics & Milestones
              </span>
            </h2>
            <p className="text-xs text-slate-400">Track your genuine study hours, consistency streak, roadmap checkpoints, and quiz mastery</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center gap-2 text-xs">
            <Flame className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-purple-200 font-bold">{progress.streakDays} Day Study Streak</span>
          </div>
          <button
            onClick={handleResetData}
            title="Reset progress to clean zero state"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-purple-300 transition-colors text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Data</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Study Time</span>
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalHours}</span>
            <span className="text-xs text-purple-300 font-medium">hours invested</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{progress.sessionsCompleted} focus blocks logged</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Roadmap Progress</span>
            <div className="w-8 h-8 rounded-lg bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{roadmapPercent}%</span>
            <span className="text-xs text-violet-300 font-medium">completed</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{completedTasks} of {totalTasks} tasks done</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Assessment Mastery</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{averageQuizScore}%</span>
            <span className="text-xs text-emerald-300 font-medium">avg score</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{progress.assessmentRecords.length} quizzes completed</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Daily Momentum</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{progress.streakDays}</span>
            <span className="text-xs text-amber-300 font-medium">days active</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Keep it up to build study consistency!</p>
        </div>
      </div>

      {/* Middle Row: Weekly Study Chart & Roadmap Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart className="w-4 h-4 text-purple-400" />
              Weekly Study Time Distribution (Minutes)
            </h3>
            <span className="text-xs text-slate-400">Past 7 Days</span>
          </div>

          {progress.totalStudyMinutes === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center rounded-xl bg-slate-950/60 border border-dashed border-purple-500/25 p-6 text-center space-y-3">
              <Clock className="w-8 h-8 text-purple-400/60" />
              <div>
                <p className="text-sm font-semibold text-slate-200">No study activity yet. Start your first learning session!</p>
                <p className="text-xs text-slate-400 mt-1">Focus timer sessions and roadmap completions will appear here automatically.</p>
              </div>
              <button
                onClick={() => onNavigate('focus')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Focus Timer</span>
              </button>
            </div>
          ) : (
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
              {past7Days.map((d) => {
                const heightPct = maxDayMinutes > 0 ? Math.min(100, Math.round((d.minutes / maxDayMinutes) * 100)) : 0;

                return (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] text-purple-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.minutes}m
                    </div>
                    <div className="w-full bg-slate-950 rounded-xl h-full flex items-end p-1 border border-slate-800">
                      <div 
                        className="w-full bg-gradient-to-t from-purple-600 via-violet-500 to-indigo-400 rounded-lg group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300 shadow-md shadow-purple-950/40"
                        style={{ height: `${Math.max(4, heightPct)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-purple-300 transition-colors">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Roadmaps Summary */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Active Roadmaps
              </h3>
              <button
                onClick={() => onNavigate('roadmap')}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {roadmaps.slice(0, 3).map((r) => {
                const total = r.days.reduce((acc, d) => acc + d.tasks.length, 0);
                const done = r.days.reduce((acc, d) => acc + d.tasks.filter(t => t.completed).length, 0);
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span className="truncate max-w-[170px]">{r.subject}</span>
                      <span className="text-purple-300 font-mono">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{done} of {total} tasks</span>
                      <span>{r.days.length} Days Plan</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">Completed Roadmaps:</span>
            {completedRoadmaps.length > 0 ? (
              <div className="text-xs text-emerald-300 font-medium">
                {completedRoadmaps.length} completed plan(s) archived
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Your completed roadmaps will appear here.</p>
            )}
          </div>

          <button
            onClick={() => onNavigate('focus')}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 flex items-center justify-center gap-1.5 transition-all mt-4"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Launch Pomodoro Session</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Recent Assessment Results & Session Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment Results Table */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              Recent Assessment & Quiz Results
            </h3>
            <button
              onClick={() => onNavigate('tutor')}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              Quiz me in Tutor
            </button>
          </div>

          <div className="space-y-2.5">
            {progress.assessmentRecords.length > 0 ? (
              progress.assessmentRecords.slice(0, 5).map((q) => (
                <div key={q.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-semibold text-slate-200">{q.topic}</h5>
                    <span className="text-[10px] text-slate-500">
                      {new Date(q.date).toLocaleDateString()} at {new Date(q.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      q.percentage >= 70
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {q.score}/{q.totalQuestions} ({q.percentage}%)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 p-4">
                <GraduationCap className="w-7 h-7 text-purple-400/50 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium">Your progress will grow as you study.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Complete a quiz in AI Tutor to test and record your concept mastery.</p>
              </div>
            )}
          </div>
        </div>

        {/* Study Session Log History */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/20 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Study Session Log History
            </h3>
            <span className="text-xs text-slate-400">{progress.sessionLogs.length} Sessions</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {progress.sessionLogs.length > 0 ? (
              progress.sessionLogs.slice(0, 8).map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${s.type === 'pomodoro' ? 'bg-purple-400' : 'bg-indigo-400'}`} />
                    <div>
                      <h5 className="font-semibold text-slate-200">{s.topic}</h5>
                      <span className="text-[10px] text-slate-500">
                        {s.type === 'pomodoro' ? 'Pomodoro Block' : 'Stopwatch Session'} • {new Date(s.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-purple-300 font-bold px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                    +{s.durationMinutes} mins
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 p-4">
                <Clock className="w-7 h-7 text-purple-400/50 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-medium">No sessions logged yet.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Use Focus Tools to time your study sessions and track deep work hours.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

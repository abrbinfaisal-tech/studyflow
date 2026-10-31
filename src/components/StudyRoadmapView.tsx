import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Sparkles, 
  Upload, 
  FileText, 
  ArrowRight, 
  Trash2, 
  BookOpen, 
  Layers, 
  Target, 
  Check, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Compass,
  AlertTriangle,
  MoreVertical
} from 'lucide-react';
import { StudyRoadmap, RoadmapDay, RoadmapTask } from '../types';
import { StorageService } from '../services/storage';
import { apiJson, ApiError, RetryCallbackInfo } from '../services/apiClient';
import confetti from 'canvas-confetti';

interface StudyRoadmapViewProps {
  onStartLearning: (prompt: string) => void;
}

const SAMPLE_SYLLABI = [
  {
    name: 'Calculus: Derivatives & Integrals',
    subject: 'AP Calculus AB',
    minutes: 60,
    days: 7,
    syllabus: 'Limits, continuity, power rule, product rule, quotient rule, chain rule, implicit differentiation, related rates, Riemann sums, Fundamental Theorem of Calculus, u-substitution.'
  },
  {
    name: 'Organic Chemistry Reactions',
    subject: 'Organic Chemistry',
    minutes: 75,
    days: 10,
    syllabus: 'Hybridization, resonance structures, stereochemistry (R/S), nucleophilic substitution (SN1 vs SN2), elimination reactions (E1 vs E2), alkene additions, Markovnikov rule, spectroscopy (IR & NMR).'
  },
  {
    name: 'Data Structures & Algorithms',
    subject: 'Computer Science',
    minutes: 90,
    days: 14,
    syllabus: 'Big-O notation, arrays and two-pointer techniques, linked lists, binary trees & BST, graph traversals (BFS, DFS), dynamic programming (memoization vs tabulation).'
  }
];

export const StudyRoadmapView: React.FC<StudyRoadmapViewProps> = ({ onStartLearning }) => {
  const [roadmaps, setRoadmaps] = useState<StudyRoadmap[]>([]);
  const [activeRoadmapId, setActiveRoadmapId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [roadmapToDelete, setRoadmapToDelete] = useState<StudyRoadmap | null>(null);

  // Form states for generating a new roadmap
  const [subject, setSubject] = useState('');
  const [targetDeadline, setTargetDeadline] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [knowledgeLevel, setKnowledgeLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [syllabusText, setSyllabusText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backoffStatus, setBackoffStatus] = useState<RetryCallbackInfo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const list = StorageService.getRoadmaps();
    setRoadmaps(list);
    if (list.length > 0) {
      setActiveRoadmapId(list[0].id);
    } else {
      setIsCreatingNew(false);
    }
  }, []);

  const activeRoadmap = roadmaps.find(r => r.id === activeRoadmapId) || (roadmaps.length > 0 ? roadmaps[0] : null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size must be under 25MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(',')[1];
      setAttachment({
        name: file.name,
        mimeType: file.type || 'application/pdf',
        data: base64Data,
      });
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleApplySample = (sample: typeof SAMPLE_SYLLABI[0]) => {
    setSubject(sample.subject);
    setDailyMinutes(sample.minutes);
    setSyllabusText(sample.syllabus);
    // calculate a date sample.days from now
    const d = new Date();
    d.setDate(d.getDate() + sample.days);
    setTargetDeadline(d.toISOString().split('T')[0]);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() && !syllabusText.trim() && !attachment) {
      setErrorMessage('Please provide a subject title, syllabus content, or upload a syllabus file.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setBackoffStatus(null);

    try {
      const generated = await apiJson<StudyRoadmap>('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject || 'Academic Syllabus',
          syllabusText,
          deadlineDate: targetDeadline || 'Within 2 weeks',
          dailyMinutes,
          knowledgeLevel,
          attachment: attachment ? { mimeType: attachment.mimeType, data: attachment.data } : undefined,
        }),
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (info) => {
          setBackoffStatus(info);
        },
      });

      setBackoffStatus(null);
      const newRoadmap: StudyRoadmap = {
        ...generated,
        id: 'roadmap-' + Date.now(),
        createdAt: Date.now(),
        deadlineDate: targetDeadline,
        knowledgeLevel,
        // Ensure completed flags are initialized
        days: generated.days.map(d => ({
          ...d,
          tasks: d.tasks.map(t => ({ ...t, completed: false })),
        })),
      };

      StorageService.saveRoadmap(newRoadmap);
      setRoadmaps(prev => [newRoadmap, ...prev]);
      setActiveRoadmapId(newRoadmap.id);
      setIsCreatingNew(false);

      // Reset form
      setSubject('');
      setSyllabusText('');
      setAttachment(null);

      // Milestone confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#6366f1', '#ec4899'],
        });
      } catch (e) {}
    } catch (err: any) {
      console.error('Roadmap generation error:', err);
      setBackoffStatus(null);
      setErrorMessage(err.message || 'Failed to generate study roadmap. Please try again.');
    } finally {
      setIsGenerating(false);
      setBackoffStatus(null);
    }
  };

  const handleToggleTask = (taskId: string) => {
    if (!activeRoadmap) return;
    const updated = StorageService.toggleRoadmapTask(activeRoadmap.id, taskId);
    if (updated) {
      setRoadmaps(prev => prev.map(r => r.id === updated.id ? updated : r));

      // Calculate new completion percentage
      const totalTasks = updated.days.reduce((acc, d) => acc + d.tasks.length, 0);
      const completedTasks = updated.days.reduce((acc, d) => acc + d.tasks.filter(t => t.completed).length, 0);
      if (completedTasks === totalTasks && totalTasks > 0) {
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.5 },
          });
        } catch (e) {}
      }
    }
  };

  const handleConfirmDeleteRoadmap = () => {
    if (!roadmapToDelete) return;
    const deletedId = roadmapToDelete.id;
    StorageService.deleteRoadmap(deletedId);
    const remaining = StorageService.getRoadmaps();
    setRoadmaps(remaining);

    if (activeRoadmapId === deletedId) {
      if (remaining.length > 0) {
        setActiveRoadmapId(remaining[0].id);
      } else {
        setActiveRoadmapId('');
        setIsCreatingNew(false);
      }
    }
    setRoadmapToDelete(null);
  };

  // Calculations for active roadmap progress
  const totalTasks = activeRoadmap?.days.reduce((acc, d) => acc + d.tasks.length, 0) || 0;
  const completedTasks = activeRoadmap?.days.reduce((acc, d) => acc + d.tasks.filter(t => t.completed).length, 0) || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const completedMinutes = activeRoadmap?.days.reduce((acc, d) => 
    acc + d.tasks.filter(t => t.completed).reduce((s, t) => s + (t.durationMinutes || 0), 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header & Roadmap Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-white shadow-lg shadow-purple-950/40">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              AI Study Roadmap Planner
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Paced Schedule
              </span>
            </h2>
            <p className="text-xs text-slate-400">Personalized day-by-day plan crafted for your deadline and available time</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {roadmaps.length > 0 && !isCreatingNew && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-purple-500/30 rounded-xl px-2 py-1">
              <select
                value={activeRoadmapId}
                onChange={e => setActiveRoadmapId(e.target.value)}
                className="text-xs bg-transparent text-purple-200 outline-none max-w-xs truncate py-1 pr-1 cursor-pointer"
              >
                {roadmaps.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-950 text-slate-200">
                    {r.roadmapTitle}
                  </option>
                ))}
              </select>
              {activeRoadmap && (
                <button
                  type="button"
                  onClick={() => setRoadmapToDelete(activeRoadmap)}
                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                  title="Delete current roadmap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-purple-950/30 transition-all cursor-pointer"
          >
            {isCreatingNew ? (
              <span>{roadmaps.length > 0 ? 'View Active Plan' : 'Cancel'}</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Roadmap</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Creation Modal / Form */}
      {isCreatingNew ? (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-md shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Generate Personalized Study Roadmap
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload your chapter syllabus, outline topics, set your deadline, and let Study Flow pace your daily study.
              </p>
            </div>
            {roadmaps.length > 0 && (
              <button
                onClick={() => setIsCreatingNew(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-xs font-semibold text-purple-300 block mb-2">
              Or Try an Example Syllabus:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SAMPLE_SYLLABI.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySample(sample)}
                  className="text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 hover:bg-purple-950/20 transition-all text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-purple-200 group-hover:text-white">{sample.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <span>{sample.days} Days</span>
                    <span>•</span>
                    <span>{sample.minutes}m/day</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Subject or Course Name *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. AP Calculus AB, Organic Chemistry II, Cell Biology"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Target Exam Date or Deadline
                </label>
                <input
                  type="date"
                  value={targetDeadline}
                  onChange={e => setTargetDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Daily Available Study Time: <span className="text-purple-400 font-bold">{dailyMinutes} minutes</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="240"
                  step="10"
                  value={dailyMinutes}
                  onChange={e => setDailyMinutes(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>20 mins (Quick)</span>
                  <span>60 mins (Standard)</span>
                  <span>120 mins (Intensive)</span>
                  <span>240 mins (Exam Mode)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Your Current Knowledge Level
                </label>
                <select
                  value={knowledgeLevel}
                  onChange={e => setKnowledgeLevel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="beginner">Beginner (Starting fresh, need full concepts)</option>
                  <option value="intermediate">Intermediate (Know basics, need problem-solving & mastery)</option>
                  <option value="advanced">Advanced (Speed revision & challenging mock problems)</option>
                </select>
              </div>
            </div>

            {/* Syllabus Text / File upload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Chapter Topics or Syllabus Outline
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Syllabus PDF / Image
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.doc"
                className="hidden"
              />

              {attachment && (
                <div className="mb-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Uploaded: {attachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              <textarea
                rows={4}
                value={syllabusText}
                onChange={e => setSyllabusText(e.target.value)}
                placeholder="Paste your chapter table of contents, syllabus bullet points, or list of exam topics here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 leading-relaxed font-mono"
              />
            </div>

            {backoffStatus && (
              <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-3 animate-pulse">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300">
                      {backoffStatus.status === 429 ? 'Rate Limit Encountered (HTTP 429)' : 'AI Service Busy'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/80 border border-amber-500/40 font-mono">
                      Attempt {backoffStatus.attempt} of {backoffStatus.maxRetries}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 mt-0.5">
                    Applying exponential backoff with jitter — retrying automatically in {(backoffStatus.delayMs / 1000).toFixed(1)}s...
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-rose-900/40 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-purple-900/60 text-purple-300 cursor-wait'
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-xl shadow-purple-950/50'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Personalized Study Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Day-by-Day Roadmap
                </>
              )}
            </button>
          </form>
        </div>
      ) : activeRoadmap ? (
        /* Active Roadmap Content */
        <div className="space-y-6">
          {/* Summary Banner Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/90 to-slate-900 border border-purple-500/30 shadow-xl shadow-purple-950/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
              <div className="max-w-2xl space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {activeRoadmap.subject}
                  </span>
                  {activeRoadmap.deadlineDate && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Target: {activeRoadmap.deadlineDate}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-extrabold text-white">
                    {activeRoadmap.roadmapTitle}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeRoadmap.summary}
                </p>

                {activeRoadmap.keyMilestones && activeRoadmap.keyMilestones.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {activeRoadmap.keyMilestones.map((m, idx) => (
                      <span key={idx} className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-purple-200 flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-purple-400" />
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Box & Delete Option */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/30 min-w-[220px] space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Overall Progress</span>
                  <span className="text-purple-300 text-sm font-bold">{progressPercent}%</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-violet-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Tasks Done</span>
                    <span className="font-bold text-white">{completedTasks} / {totalTasks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Time Invested</span>
                    <span className="font-bold text-purple-300">{Math.round(completedMinutes / 60 * 10) / 10}h</span>
                  </div>
                </div>

                {/* Visible Delete button on roadmap item */}
                <button
                  type="button"
                  onClick={() => setRoadmapToDelete(activeRoadmap)}
                  className="w-full text-center text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-500/30 rounded-lg py-1.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Roadmap</span>
                </button>
              </div>
            </div>
          </div>

          {/* Timeline / Days Cards */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              Daily Study Schedule ({activeRoadmap.days.length} Days)
            </h4>

            <div className="space-y-4">
              {activeRoadmap.days.map((day) => {
                const dayDone = day.tasks.every(t => t.completed);
                const dayProgress = day.tasks.filter(t => t.completed).length;

                return (
                  <div 
                    key={day.dayNumber}
                    className={`rounded-2xl border transition-all p-5 ${
                      dayDone
                        ? 'bg-slate-900/40 border-emerald-500/30'
                        : 'bg-slate-900/80 border-purple-500/20 shadow-lg shadow-purple-950/10'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          dayDone 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}>
                          D{day.dayNumber}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-white flex items-center gap-2">
                            {day.title}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-purple-300">
                              {day.phase}
                            </span>
                          </h5>
                          <p className="text-xs text-slate-400">{day.theme}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          {day.estimatedMinutes} mins
                        </span>
                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {dayProgress}/{day.tasks.length} Completed
                        </span>
                      </div>
                    </div>

                    {/* Task Checklist */}
                    <div className="space-y-2.5">
                      {day.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                            task.completed
                              ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                              : 'bg-slate-950/80 border-slate-800/90 hover:border-purple-500/30'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className="mt-0.5 text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                              title={task.completed ? 'Mark uncompleted' : 'Mark completed'}
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950/40" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-600 hover:text-purple-400" />
                              )}
                            </button>

                            <div className="space-y-1">
                              <p className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                                {task.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                                <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                                  {task.taskType}
                                </span>
                                <span>{task.durationMinutes} mins</span>
                                {task.learningObjectives && task.learningObjectives.length > 0 && (
                                  <span>• {task.learningObjectives[0]}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* "Start Learning" Button connected directly to AI Tutor */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => onStartLearning(task.tutorPrompt || `Please explain the concept and methods for: ${task.title}`)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-900/60 to-violet-900/60 hover:from-purple-800 hover:to-violet-800 border border-purple-500/30 text-purple-200 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            >
                              <span>Start Learning with AI Tutor</span>
                              <ArrowRight className="w-3 h-3 text-purple-300" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State when no roadmaps exist */
        <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/50 border border-purple-500/20 backdrop-blur-md space-y-4 max-w-xl mx-auto shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
            <Compass className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              No study roadmaps yet. Create your first roadmap to get started!
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Plan your exam preparation with a day-by-day roadmap tailored to your available study time and syllabus.
            </p>
          </div>
          <button
            onClick={() => setIsCreatingNew(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Roadmap</span>
          </button>
        </div>
      )}

      {/* Roadmap Delete Confirmation Modal */}
      {roadmapToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Study Roadmap</h3>
                <p className="text-xs text-slate-400 truncate max-w-[260px]">{roadmapToDelete.roadmapTitle}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this study roadmap? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRoadmapToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoadmap}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Roadmap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

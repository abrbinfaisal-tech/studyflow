import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCheck2, 
  Upload, 
  FileText, 
  Sparkles, 
  BarChart3, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Loader2, 
  BookOpen, 
  Trash2, 
  Flame, 
  ShieldAlert, 
  Award,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { PaperAnalysis, PaperTopic, PaperQuestion } from '../types';
import { StorageService } from '../services/storage';
import { apiJson, ApiError, RetryCallbackInfo } from '../services/apiClient';

interface PaperAnalyzerViewProps {
  onAskTutor: (prompt: string) => void;
}

const SAMPLE_EXAM_PAPERS = [
  {
    title: 'AP Physics 1: Mechanics & Energy Exam',
    type: 'AP High School Exam',
    text: `Section I & II Sample Questions:
Question 1 (7 Marks): A 2.0 kg block is released from rest at the top of an inclined plane of angle 30 degrees and height 4.0 meters. The coefficient of kinetic friction between the block and the incline is mu_k = 0.20. Calculate the speed of the block when it reaches the bottom of the incline.
Question 2 (12 Marks): A mass m is attached to a vertical spring of spring constant k. It is pulled down by distance A and released into simple harmonic motion. Derive the period of oscillation T = 2pi*sqrt(m/k) and determine the total mechanical energy in terms of k and A.
Question 3 (5 Marks): State Newton's third law of motion. A horse pulls a cart. By Newton's third law, the cart pulls back on the horse with equal and opposite force. Explain why the horse and cart are still able to accelerate forward.
Question 4 (15 Marks): Two gliders of mass m1 = 0.5 kg and m2 = 1.0 kg collide on a frictionless air track. Before collision, m1 moves at 2.0 m/s and m2 is at rest. After collision, they stick together (completely inelastic collision). Calculate the final velocity and determine the percentage of kinetic energy lost during the collision.
Question 5 (10 Marks): A solid cylinder and a thin hoop of equal mass and radius roll down an incline from rest without slipping. Which reaches the bottom first? Justify using rotational inertia and conservation of mechanical energy.`
  },
  {
    title: 'University Calculus I: Final Exam',
    type: 'College Examination',
    text: `Part A - Conceptual Limits & Derivatives (20 Marks):
1. Evaluate limit as x approaches 0 of (sin(3x) - 3x) / x^3 using L'Hopital's Rule.
2. Find the derivative dy/dx of y = (x^2 + 1)^(cos x) using logarithmic differentiation.
Part B - Optimization & Related Rates (30 Marks):
3. A rectangular box with an open top is to have a volume of 32 cubic feet. The length of its base is twice its width. Material for the base costs $10 per sq foot, and sides cost $6 per sq foot. Find dimensions that minimize cost.
4. A ladder 10 ft long rests against a vertical wall. If the bottom of the ladder slides away from the wall at 1 ft/s, how fast is the top sliding down when the bottom is 6 ft from the wall?
Part C - Integration & Applications (30 Marks):
5. Evaluate the definite integral from 0 to 1 of x * sqrt(1 - x^2) dx.
6. Find the area enclosed by the curves y = x^2 and y = 2x - x^2.`
  },
  {
    title: 'General Chemistry: Equilibrium & Kinetics',
    type: 'High School / AP Chemistry',
    text: `Question 1 (10 Marks): Consider the reaction N2(g) + 3H2(g) <=> 2NH3(g) with Delta H = -92.4 kJ/mol. What happens to the equilibrium concentration of NH3 when (a) temperature is increased, (b) total volume is halved, (c) a catalyst is added? Use Le Chatelier's Principle.
Question 2 (15 Marks): For the reaction 2NO(g) + O2(g) -> 2NO2(g), experimental data shows that doubling [NO] quadruples the rate, while doubling [O2] doubles the rate. Write the differential rate law, calculate the overall reaction order, and determine units for the rate constant k.
Question 3 (8 Marks): Calculate the pH of a buffer solution composed of 0.25 M acetic acid (CH3COOH) and 0.15 M sodium acetate (CH3COONa). Given Ka = 1.8 x 10^-5.`
  }
];

export const PaperAnalyzerView: React.FC<PaperAnalyzerViewProps> = ({ onAskTutor }) => {
  const [papers, setPapers] = useState<PaperAnalysis[]>([]);
  const [activePaperId, setActivePaperId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backoffStatus, setBackoffStatus] = useState<RetryCallbackInfo | null>(null);

  // Form inputs
  const [paperTitle, setPaperTitle] = useState('');
  const [examType, setExamType] = useState('High School / College Board');
  const [paperText, setPaperText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = StorageService.getPapers();
    if (stored.length > 0) {
      setPapers(stored);
      setActivePaperId(stored[0].id);
    } else {
      // Trigger a default pre-analyzed sample on first visit
      const sample = SAMPLE_EXAM_PAPERS[0];
      setPaperTitle(sample.title);
      setExamType(sample.type);
      setPaperText(sample.text);
    }
  }, []);

  const activePaper = papers.find(p => p.id === activePaperId) || papers[0];

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

  const handleApplySample = (sample: typeof SAMPLE_EXAM_PAPERS[0]) => {
    setPaperTitle(sample.title);
    setExamType(sample.type);
    setPaperText(sample.text);
    setAttachment(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paperText.trim() && !attachment) {
      setErrorMessage('Please paste exam questions or upload an exam paper PDF/image.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setBackoffStatus(null);

    try {
      const analyzed = await apiJson<PaperAnalysis>('/api/paper/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperTitle: paperTitle || 'Exam Paper',
          examType,
          paperText,
          attachment: attachment ? { mimeType: attachment.mimeType, data: attachment.data } : undefined,
        }),
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (info) => {
          setBackoffStatus(info);
        },
      });

      setBackoffStatus(null);
      const newRecord: PaperAnalysis = {
        ...analyzed,
        id: 'paper-' + Date.now(),
        paperTitle: paperTitle || analyzed.identifiedSubject || 'Analyzed Examination Paper',
        examType: examType || 'General Exam',
        createdAt: Date.now(),
      };

      StorageService.savePaper(newRecord);
      setPapers(prev => [newRecord, ...prev]);
      setActivePaperId(newRecord.id);

      // Clean inputs
      setPaperText('');
      setAttachment(null);
    } catch (err: any) {
      console.error('Paper analysis error:', err);
      setBackoffStatus(null);
      setErrorMessage(err.message || 'Failed to analyze exam paper. Please check inputs.');
    } finally {
      setIsAnalyzing(false);
      setBackoffStatus(null);
    }
  };

  const handleDeletePaper = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.deletePaper(id);
    const remaining = papers.filter(p => p.id !== id);
    setPapers(remaining);
    if (remaining.length > 0) {
      setActivePaperId(remaining[0].id);
    }
  };

  const filteredTopics = activePaper?.topics.filter(t => {
    if (selectedTopicFilter === 'All') return true;
    return t.priority === selectedTopicFilter;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & History Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-purple-950/40">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              AI Exam Paper Analyzer
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Difficulty & Topic Priority
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Upload past exams or question papers to classify Easy, Moderate, and Hard questions and pinpoint high-yield revision topics
            </p>
          </div>
        </div>

        {papers.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={activePaperId}
              onChange={e => setActivePaperId(e.target.value)}
              className="text-xs bg-slate-950 border border-purple-500/30 rounded-xl px-3 py-2 text-purple-200 outline-none max-w-xs truncate"
            >
              {papers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.paperTitle}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Upload & Form Section */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-purple-500/30 backdrop-blur-md shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-500/20">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Analyze New Examination Paper
            </h3>
            <p className="text-xs text-slate-400">
              Paste questions or upload a full PDF/image document. The AI analyzes actual questions, weights, and difficulties.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-300 font-medium">Quick Examples:</span>
            {SAMPLE_EXAM_PAPERS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplySample(s)}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/40 text-purple-200 text-xs transition-colors"
              >
                {s.title.split(':')[0]}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Exam Paper Title / Subject
              </label>
              <input
                type="text"
                value={paperTitle}
                onChange={e => setPaperTitle(e.target.value)}
                placeholder="e.g. 2024 AP Physics 1 Midterm, Organic Chemistry Final"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Examination Level
              </label>
              <select
                value={examType}
                onChange={e => setExamType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="High School / College Board">High School (AP, IB, GCSE, A-Level)</option>
                <option value="College / University Course">College / University Final Exam</option>
                <option value="National Entrance / Competitive">National Entrance / Competitive Exam (SAT, MCAT, JEE)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Exam Content (Paste Questions or Upload PDF/Image)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload PDF / Image File
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
                  <span>Attached: {attachment.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-slate-400 hover:text-white"
                >
                  Remove
                </button>
              </div>
            )}

            <textarea
              rows={4}
              value={paperText}
              onChange={e => setPaperText(e.target.value)}
              placeholder="Paste exam questions, sections, marks breakdown, or problem statements here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
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
                  Exponential backoff with jitter in progress — retrying automatically in {(backoffStatus.delayMs / 1000).toFixed(1)}s...
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
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
            disabled={isAnalyzing}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              isAnalyzing
                ? 'bg-purple-900/60 text-purple-300 cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-950/40'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Paper Questions, Topics & Difficulties...
              </>
            ) : (
              <>
                <FileCheck2 className="w-4 h-4" />
                Analyze Exam Paper & Generate Priority Matrix
              </>
            )}
          </button>
        </form>
      </div>

      {/* Analysis Results Display */}
      {activePaper && (
        <div className="space-y-6">
          {/* Top Results Overview Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-purple-500/30 shadow-xl space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {activePaper.identifiedSubject || 'Exam Analysis'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {activePaper.totalQuestionsAnalyzed} Questions Analyzed
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  {activePaper.paperTitle}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activePaper.paperSummary}
                </p>
              </div>

              <button
                onClick={(e) => handleDeletePaper(activePaper.id, e)}
                className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 p-2 rounded-lg hover:bg-slate-800 transition-colors"
                title="Delete analysis"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>

            {/* Difficulty Breakdown Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">Easy Questions</span>
                  <span className="text-lg font-bold text-white">{activePaper.difficultyStats.easyPercentage}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${activePaper.difficultyStats.easyPercentage}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Foundational definitions, formula recall, single-step arithmetic</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">Moderate Questions</span>
                  <span className="text-lg font-bold text-white">{activePaper.difficultyStats.moderatePercentage}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${activePaper.difficultyStats.moderatePercentage}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Multi-step derivations, standard applications, word problems</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-400">Hard Questions</span>
                  <span className="text-lg font-bold text-white">{activePaper.difficultyStats.hardPercentage}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${activePaper.difficultyStats.hardPercentage}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Novel twists, cross-topic integration, proofs, and tricky constraints</p>
              </div>
            </div>
          </div>

          {/* Strategic Revision Plan Timeline */}
          {activePaper.strategicRevisionPlan && activePaper.strategicRevisionPlan.length > 0 && (
            <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
              <h4 className="text-sm font-bold text-purple-200 flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-400" />
                Strategic High-Yield Revision Recommendations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activePaper.strategicRevisionPlan.map((rec, rIdx) => (
                  <div key={rIdx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {rIdx + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topic Priority Matrix */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                Topics Prioritisation & Weightage
              </h4>

              {/* Priority Filters */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                {(['All', 'High', 'Medium', 'Low'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedTopicFilter(p)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      selectedTopicFilter === p
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p} {p !== 'All' ? 'Priority' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTopics.map((topic, tIdx) => {
                const isHigh = topic.priority === 'High';
                const isMed = topic.priority === 'Medium';

                return (
                  <div
                    key={tIdx}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      isHigh
                        ? 'bg-purple-950/30 border-purple-500/40 shadow-lg shadow-purple-950/20'
                        : isMed
                          ? 'bg-slate-900/80 border-amber-500/30'
                          : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isHigh
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : isMed
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {topic.priority} Priority
                        </span>
                        <h5 className="text-sm font-bold text-white mt-1.5">{topic.topicName}</h5>
                      </div>

                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {topic.difficultyTendency}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1.5">
                      <p className="leading-relaxed">
                        <strong className="text-purple-300">Why Prioritized: </strong>
                        {topic.priorityReason}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        <strong className="text-slate-300">Action Plan: </strong>
                        {topic.actionableAdvice}
                      </p>
                    </div>

                    {topic.keyFormulasOrConcepts && topic.keyFormulasOrConcepts.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Key Formulas / Rules</span>
                        <div className="flex flex-wrap gap-1">
                          {topic.keyFormulasOrConcepts.map((f, fIdx) => (
                            <span key={fIdx} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-purple-200 border border-slate-800 font-mono">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => onAskTutor(`Tutor, please give me a comprehensive revision session on the topic "${topic.topicName}" which is high priority in my upcoming exam. Include core rules, common traps, and 2 solved practice questions.`)}
                      className="w-full py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mt-2"
                    >
                      <span>Study This Topic with AI Tutor</span>
                      <ArrowRight className="w-3 h-3 text-purple-300" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question-by-Question Difficulty Classification */}
          {activePaper.questions && activePaper.questions.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/20 space-y-4">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Question-by-Question Difficulty Classification ({activePaper.questions.length} Items)
              </h4>

              <div className="space-y-3">
                {activePaper.questions.map((q, qIdx) => {
                  const isEasy = q.difficulty === 'Easy';
                  const isMod = q.difficulty === 'Moderate';
                  const isHard = q.difficulty === 'Hard';

                  return (
                    <div
                      key={qIdx}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-purple-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{q.questionNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isEasy
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : isMod
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            {q.difficulty}
                          </span>
                          <span className="text-[11px] text-slate-400">Topic: {q.topic}</span>
                          {q.marks && <span className="text-[10px] text-slate-500 font-mono">({q.marks})</span>}
                        </div>
                        <p className="text-slate-300 leading-relaxed font-mono text-[11px] line-clamp-2">
                          {q.questionSnippet}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          <strong className="text-slate-300">Classification Reason: </strong>
                          {q.difficultyReason}
                        </p>
                      </div>

                      <button
                        onClick={() => onAskTutor(q.tutorPrompt || `Please walk me through the step-by-step solution to ${q.questionNumber}: "${q.questionSnippet}". Explain every step clearly.`)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-900/50 border border-slate-700 hover:border-purple-500/40 text-purple-200 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 transition-all"
                      >
                        <span>Ask Tutor to Solve</span>
                        <ArrowRight className="w-3 h-3 text-purple-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

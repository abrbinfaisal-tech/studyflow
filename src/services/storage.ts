import { 
  ChatSession, 
  StudyRoadmap, 
  PaperAnalysis, 
  StudyNote, 
  UserProgressData, 
  FocusSessionLog, 
  AssessmentRecord 
} from '../types';

const CHATS_KEY = 'studyflow_chats';
const ROADMAPS_KEY = 'studyflow_roadmaps';
const PAPERS_KEY = 'studyflow_papers';
const NOTES_KEY = 'studyflow_notes';
const PROGRESS_KEY = 'studyflow_progress';

const initialRoadmap: StudyRoadmap = {
  id: 'sample-calc-roadmap',
  roadmapTitle: 'AP Calculus AB: Derivatives & Applications Sprint',
  subject: 'Calculus & Advanced Mathematics',
  summary: 'A structured 7-day preparation plan mastering limits, differential calculus, chain rule, related rates, and optimization with targeted practice.',
  totalDays: 7,
  dailyMinutes: 60,
  totalHoursEstimated: 7,
  createdAt: Date.now() - 86400000 * 2,
  deadlineDate: '2026-11-15',
  knowledgeLevel: 'Intermediate',
  keyMilestones: [
    'Master Product, Quotient & Chain Rules',
    'Conquer Related Rates word problems',
    'Perfect Curve Sketching & Optimization'
  ],
  days: [
    {
      dayNumber: 1,
      title: 'Limits & Definition of Derivative',
      theme: 'Calculus Foundations',
      phase: 'Fundamentals',
      estimatedMinutes: 60,
      tasks: [
        {
          id: 'task-1-1',
          title: 'Review limit definitions and difference quotient',
          topic: 'Limits & Tangent Lines',
          taskType: 'theory',
          durationMinutes: 25,
          completed: false,
          learningObjectives: ['Understand limit definition of f\'(x)', 'Differentiate between continuity and differentiability'],
          tutorPrompt: 'Explain the limit definition of a derivative intuitively with geometric tangents and a concrete quadratic example.'
        },
        {
          id: 'task-1-2',
          title: 'Solve 6 limit evaluation & continuity problems',
          topic: 'Limits Practice',
          taskType: 'problem-solving',
          durationMinutes: 35,
          completed: false,
          learningObjectives: ['Apply L\'Hopital\'s rule and factoring techniques'],
          tutorPrompt: 'Give me 3 tricky limit problems with solutions and common exam pitfalls.'
        }
      ]
    },
    {
      dayNumber: 2,
      title: 'Power, Product, Quotient & Trig Rules',
      theme: 'Core Differentiation Techniques',
      phase: 'Deep Dive',
      estimatedMinutes: 60,
      tasks: [
        {
          id: 'task-2-1',
          title: 'Master product and quotient rule derivations',
          topic: 'Differentiation Rules',
          taskType: 'theory',
          durationMinutes: 25,
          completed: false,
          learningObjectives: ['Memorize and derive (uv)\' and (u/v)\'', 'Avoid common sign flip mistakes'],
          tutorPrompt: 'Teach me the product and quotient rules with foolproof memory tricks and examples.'
        },
        {
          id: 'task-2-2',
          title: 'Solve 10 mixed differentiation problems',
          topic: 'Rules Practice',
          taskType: 'problem-solving',
          durationMinutes: 35,
          completed: false,
          learningObjectives: ['Speed up calculation speed for polynomials, exponentials, and trig functions'],
          tutorPrompt: 'Give me a quiz on product and quotient rules with step-by-step explanations.'
        }
      ]
    },
    {
      dayNumber: 3,
      title: 'The Chain Rule & Implicit Differentiation',
      theme: 'Composite Functions',
      phase: 'Deep Dive',
      estimatedMinutes: 60,
      tasks: [
        {
          id: 'task-3-1',
          title: 'Unpack the "onion layers" of the chain rule',
          topic: 'Chain Rule',
          taskType: 'theory',
          durationMinutes: 30,
          completed: false,
          learningObjectives: ['Handle nested composite functions f(g(h(x)))'],
          tutorPrompt: 'Explain the chain rule using an intuitive layers analogy and walk through d/dx [sin^3(4x^2)].'
        },
        {
          id: 'task-3-2',
          title: 'Implicit differentiation on curves & circles',
          topic: 'Implicit Differentiation',
          taskType: 'problem-solving',
          durationMinutes: 30,
          completed: false,
          learningObjectives: ['Differentiate with respect to x treating y as y(x)', 'Find tangent lines to implicit curves'],
          tutorPrompt: 'Show me step-by-step how to find dy/dx for x^3 + y^3 = 6xy and evaluate at (3,3).'
        }
      ]
    }
  ]
};

const initialSampleNotes: StudyNote[] = [
  {
    id: 'note-1',
    title: 'Essential Calculus Derivatives Cheat Sheet',
    subject: 'Mathematics',
    tags: ['Formulas', 'Calculus', 'Exam Prep'],
    isFormulaSheet: true,
    content: `# Key Derivatives Cheatsheet

1. **Power Rule**: $\\frac{d}{dx}[x^n] = n x^{n-1}$
2. **Product Rule**: $\\frac{d}{dx}[u \\cdot v] = u'v + uv'$
3. **Quotient Rule**: $\\frac{d}{dx}\\left[\\frac{u}{v}\\right] = \\frac{u'v - uv'}{v^2}$ (Low d-High minus High d-Low over Low squared)
4. **Chain Rule**: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$

### Trigonometric Derivatives:
- $\\frac{d}{dx}[\\sin x] = \\cos x$
- $\\frac{d}{dx}[\\cos x] = -\\sin x$
- $\\frac{d}{dx}[\\tan x] = \\sec^2 x$
- $\\frac{d}{dx}[\\ln(x)] = \\frac{1}{x}$
- $\\frac{d}{dx}[e^x] = e^x$

*Exam Tip: Always check if the inner function requires chain rule!*`,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'note-2',
    title: 'Cellular Respiration & ATP Yield Summary',
    subject: 'Biology',
    tags: ['Biochemistry', 'Metabolism', 'High Yield'],
    isFormulaSheet: false,
    content: `# Cellular Respiration 4 Stages

1. **Glycolysis** (Cytoplasm)
   - Glucose (6C) -> 2 Pyruvate (3C)
   - Net yield: **2 ATP + 2 NADH**
   - Anaerobic (requires no O2)

2. **Pyruvate Decarboxylation** (Mitochondrial Matrix)
   - 2 Pyruvate -> 2 Acetyl-CoA + 2 CO2 + 2 NADH

3. **Krebs / Citric Acid Cycle** (Mitochondrial Matrix)
   - Per glucose (2 turns): **2 ATP (GTP) + 6 NADH + 2 FADH2 + 4 CO2**

4. **Oxidative Phosphorylation & Electron Transport Chain** (Inner Membrane)
   - Chemiosmosis driven by proton gradient across inner membrane.
   - Theoretical yield: ~30-32 ATP per glucose molecule.
   - Final electron acceptor: **Oxygen (O2)**, forming H2O!`,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  }
];

export const cleanInitialProgress: UserProgressData = {
  totalStudyMinutes: 0,
  sessionsCompleted: 0,
  streakDays: 0,
  lastStudyDate: '',
  sessionLogs: [],
  assessmentRecords: []
};

export const StorageService = {
  // Roadmaps
  getRoadmaps: (): StudyRoadmap[] => {
    try {
      const data = localStorage.getItem(ROADMAPS_KEY);
      if (data === null) {
        localStorage.setItem(ROADMAPS_KEY, JSON.stringify([initialRoadmap]));
        return [initialRoadmap];
      }
      const list: StudyRoadmap[] = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      // Ensure no legacy pre-completed sample tasks from earlier versions
      let changed = false;
      list.forEach(r => {
        if (r.id === 'sample-calc-roadmap') {
          r.days.forEach(d => {
            d.tasks.forEach(t => {
              if (t.id === 'task-1-1' || t.id === 'task-1-2') {
                if (t.completed && (!t.completedAt || t.completedAt < 1700000000000)) {
                  t.completed = false;
                  t.completedAt = undefined;
                  changed = true;
                }
              }
            });
          });
        }
      });
      if (changed) {
        localStorage.setItem(ROADMAPS_KEY, JSON.stringify(list));
      }
      return list;
    } catch {
      return [];
    }
  },

  saveRoadmap: (roadmap: StudyRoadmap) => {
    const list = StorageService.getRoadmaps();
    const existingIndex = list.findIndex(r => r.id === roadmap.id);
    if (existingIndex >= 0) {
      list[existingIndex] = roadmap;
    } else {
      list.unshift(roadmap);
    }
    localStorage.setItem(ROADMAPS_KEY, JSON.stringify(list));
  },

  deleteRoadmap: (id: string) => {
    const list = StorageService.getRoadmaps();
    const target = list.find(r => r.id === id);
    const remaining = list.filter(r => r.id !== id);
    localStorage.setItem(ROADMAPS_KEY, JSON.stringify(remaining));

    // Remove any associated progress logs and recalculate study progress
    if (target) {
      try {
        const progress = StorageService.getProgress();
        const targetTitle = target.roadmapTitle?.toLowerCase() || '';
        const targetSubject = target.subject?.toLowerCase() || '';
        
        const matchedSessions = progress.sessionLogs.filter(s => 
          s.topic && (
            (targetTitle && s.topic.toLowerCase().includes(targetTitle)) || 
            (targetSubject && s.topic.toLowerCase().includes(targetSubject))
          )
        );

        if (matchedSessions.length > 0) {
          const removedMinutes = matchedSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
          progress.sessionLogs = progress.sessionLogs.filter(s => !matchedSessions.includes(s));
          progress.totalStudyMinutes = Math.max(0, progress.totalStudyMinutes - removedMinutes);
          progress.sessionsCompleted = Math.max(0, progress.sessionsCompleted - matchedSessions.length);
          localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        }
      } catch (e) {
        console.error('Error recalculating progress on roadmap delete:', e);
      }
    }
  },

  toggleRoadmapTask: (roadmapId: string, taskId: string): StudyRoadmap | null => {
    const list = StorageService.getRoadmaps();
    const roadmap = list.find(r => r.id === roadmapId);
    if (!roadmap) return null;

    for (const day of roadmap.days) {
      const task = day.tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : undefined;
        break;
      }
    }
    localStorage.setItem(ROADMAPS_KEY, JSON.stringify(list));
    return roadmap;
  },

  // Notes
  getNotes: (): StudyNote[] => {
    try {
      const data = localStorage.getItem(NOTES_KEY);
      if (data === null) {
        localStorage.setItem(NOTES_KEY, JSON.stringify(initialSampleNotes));
        return initialSampleNotes;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveNote: (note: StudyNote) => {
    const list = StorageService.getNotes();
    const existingIndex = list.findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      list[existingIndex] = note;
    } else {
      list.unshift(note);
    }
    localStorage.setItem(NOTES_KEY, JSON.stringify(list));
  },

  deleteNote: (id: string) => {
    const list = StorageService.getNotes().filter(n => n.id !== id);
    localStorage.setItem(NOTES_KEY, JSON.stringify(list));
  },

  // Paper Analyses
  getPapers: (): PaperAnalysis[] => {
    try {
      const data = localStorage.getItem(PAPERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePaper: (paper: PaperAnalysis) => {
    const list = StorageService.getPapers();
    const idx = list.findIndex(p => p.id === paper.id);
    if (idx >= 0) {
      list[idx] = paper;
    } else {
      list.unshift(paper);
    }
    localStorage.setItem(PAPERS_KEY, JSON.stringify(list));
  },

  deletePaper: (id: string) => {
    const list = StorageService.getPapers().filter(p => p.id !== id);
    localStorage.setItem(PAPERS_KEY, JSON.stringify(list));
  },

  // Progress
  getProgress: (): UserProgressData => {
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      if (!data) {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(cleanInitialProgress));
        return cleanInitialProgress;
      }
      const parsed: UserProgressData = JSON.parse(data);
      // Clean legacy fake test logs if present (e.g. session-1, session-2, quiz-1 or initial 185 minutes)
      if (
        parsed.sessionLogs?.some(s => s.id === 'session-1' || s.id === 'session-2') ||
        (parsed.totalStudyMinutes === 185 && parsed.streakDays === 4)
      ) {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(cleanInitialProgress));
        return cleanInitialProgress;
      }
      return parsed;
    } catch {
      return cleanInitialProgress;
    }
  },

  resetProgress: (): UserProgressData => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(cleanInitialProgress));
    return cleanInitialProgress;
  },

  logStudySession: (durationMinutes: number, topic: string, type: 'pomodoro' | 'stopwatch') => {
    const progress = StorageService.getProgress();
    const today = new Date().toISOString().split('T')[0];
    
    // Check streak
    if (progress.lastStudyDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (progress.lastStudyDate === yesterday) {
        progress.streakDays += 1;
      } else {
        progress.streakDays = 1;
      }
      progress.lastStudyDate = today;
    }

    progress.totalStudyMinutes += durationMinutes;
    progress.sessionsCompleted += 1;
    progress.sessionLogs.unshift({
      id: 'session-' + Date.now(),
      type,
      durationMinutes,
      topic: topic || 'Independent Study',
      completedAt: Date.now(),
    });

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return progress;
  },

  logQuizResult: (topic: string, score: number, totalQuestions: number) => {
    const progress = StorageService.getProgress();
    const percentage = Math.round((score / totalQuestions) * 100);
    progress.assessmentRecords.unshift({
      id: 'quiz-' + Date.now(),
      topic,
      score,
      totalQuestions,
      percentage,
      date: Date.now(),
    });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return progress;
  },

  // Chats
  getChats: (): ChatSession[] => {
    try {
      const data = localStorage.getItem(CHATS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveChat: (chat: ChatSession) => {
    const list = StorageService.getChats();
    const idx = list.findIndex(c => c.id === chat.id);
    if (idx >= 0) {
      list[idx] = chat;
    } else {
      list.unshift(chat);
    }
    localStorage.setItem(CHATS_KEY, JSON.stringify(list));
  },

  deleteChat: (id: string) => {
    const list = StorageService.getChats().filter(c => c.id !== id);
    localStorage.setItem(CHATS_KEY, JSON.stringify(list));
  }
};

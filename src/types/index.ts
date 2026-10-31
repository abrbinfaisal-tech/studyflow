export type NavigationSection = 
  | 'dashboard'
  | 'tutor'
  | 'roadmap'
  | 'paper'
  | 'focus'
  | 'progress'
  | 'notes';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  suggestions?: string[];
  quiz?: QuizQuestion[];
  attachmentName?: string;
  diagramSvg?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  subject: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface RoadmapTask {
  id: string;
  title: string;
  topic: string;
  taskType: 'theory' | 'problem-solving' | 'revision' | 'formula-memorization' | 'quiz' | string;
  durationMinutes: number;
  learningObjectives?: string[];
  tutorPrompt: string;
  completed: boolean;
  completedAt?: number;
}

export interface RoadmapDay {
  dayNumber: number;
  title: string;
  theme: string;
  phase: string;
  estimatedMinutes: number;
  tasks: RoadmapTask[];
}

export interface StudyRoadmap {
  id: string;
  roadmapTitle: string;
  subject: string;
  summary: string;
  totalDays: number;
  dailyMinutes: number;
  totalHoursEstimated: number;
  keyMilestones: string[];
  days: RoadmapDay[];
  createdAt: number;
  deadlineDate?: string;
  knowledgeLevel?: string;
}

export interface PaperTopic {
  topicName: string;
  priority: 'High' | 'Medium' | 'Low';
  difficultyTendency: 'Easy' | 'Moderate' | 'Hard';
  questionCount?: number;
  estimatedMarksWeightage?: string;
  priorityReason: string;
  actionableAdvice: string;
  keyFormulasOrConcepts?: string[];
}

export interface PaperQuestion {
  questionNumber: string;
  questionSnippet: string;
  topic: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  difficultyReason: string;
  marks?: string;
  tutorPrompt: string;
}

export interface PaperAnalysis {
  id: string;
  paperTitle: string;
  examType: string;
  paperSummary: string;
  identifiedSubject: string;
  totalQuestionsAnalyzed: number;
  createdAt: number;
  difficultyStats: {
    easyPercentage: number;
    moderatePercentage: number;
    hardPercentage: number;
    summary: string;
  };
  topics: PaperTopic[];
  questions: PaperQuestion[];
  strategicRevisionPlan: string[];
}

export interface StudyNote {
  id: string;
  title: string;
  subject: string;
  tags: string[];
  content: string;
  isFormulaSheet?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FocusSessionLog {
  id: string;
  type: 'pomodoro' | 'stopwatch';
  durationMinutes: number;
  topic: string;
  completedAt: number;
}

export interface AssessmentRecord {
  id: string;
  topic: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: number;
}

export interface UserProgressData {
  totalStudyMinutes: number;
  sessionsCompleted: number;
  streakDays: number;
  lastStudyDate: string;
  sessionLogs: FocusSessionLog[];
  assessmentRecords: AssessmentRecord[];
}

import React, { useState } from 'react';
import { 
  Menu, 
  Sparkles, 
  Flame, 
  Clock, 
  Bell, 
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { NavigationSection, StudyNote } from './types';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { AITutorView } from './components/AITutorView';
import { StudyRoadmapView } from './components/StudyRoadmapView';
import { PaperAnalyzerView } from './components/PaperAnalyzerView';
import { FocusToolsView } from './components/FocusToolsView';
import { ProgressDashboardView } from './components/ProgressDashboardView';
import { NotesView } from './components/NotesView';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavigationSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Cross-feature states
  const [tutorInitialPrompt, setTutorInitialPrompt] = useState<string>('');
  const [noteToSave, setNoteToSave] = useState<Partial<StudyNote> | undefined>(undefined);

  const handleNavigateToTutor = (prompt: string) => {
    setTutorInitialPrompt(prompt);
    setCurrentSection('tutor');
  };

  const handleSaveToNotes = (note: Partial<StudyNote>) => {
    setNoteToSave(note);
    setCurrentSection('notes');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-purple-600 selection:text-white font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(sec) => {
          setCurrentSection(sec);
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${currentSection === 'tutor' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
        {/* Top Navbar */}
        <header className="shrink-0 sticky top-0 z-30 bg-[#0b0f19]/80 backdrop-blur-xl border-b border-purple-500/15 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block">
                Study Flow Companion
              </span>
              <h2 className="text-base sm:text-lg font-black text-white capitalize tracking-tight flex items-center gap-2">
                {currentSection === 'dashboard' && 'Dashboard Overview'}
                {currentSection === 'tutor' && 'AI Personal Tutor'}
                {currentSection === 'roadmap' && 'AI Study Roadmap Planner'}
                {currentSection === 'paper' && 'AI Exam Paper Analyzer'}
                {currentSection === 'focus' && 'Focus Tools & Timers'}
                {currentSection === 'progress' && 'My Academic Progress'}
                {currentSection === 'notes' && 'My Study Notes & Formulas'}
              </h2>
            </div>
          </div>

          {/* Quick Header Widgets */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Focus Button */}
            <button
              onClick={() => setCurrentSection('focus')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-xs font-semibold shadow-sm transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Pomodoro</span>
            </button>

            {/* AI Tutor shortcut */}
            <button
              onClick={() => {
                setTutorInitialPrompt('');
                setCurrentSection('tutor');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI Tutor</span>
              <span className="sm:hidden">Tutor</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className={`flex-1 min-w-0 ${currentSection === 'tutor' ? 'p-2 sm:p-4 flex flex-col min-h-0 overflow-hidden' : 'p-4 sm:p-8'}`}>
          {currentSection === 'dashboard' && (
            <DashboardOverview
              onNavigate={setCurrentSection}
              onAskTutorPrompt={handleNavigateToTutor}
            />
          )}

          {currentSection === 'tutor' && (
            <AITutorView
              initialPrompt={tutorInitialPrompt}
              onSaveToNotes={handleSaveToNotes}
            />
          )}

          {currentSection === 'roadmap' && (
            <StudyRoadmapView
              onStartLearning={handleNavigateToTutor}
            />
          )}

          {currentSection === 'paper' && (
            <PaperAnalyzerView
              onAskTutor={handleNavigateToTutor}
            />
          )}

          {currentSection === 'focus' && (
            <FocusToolsView />
          )}

          {currentSection === 'progress' && (
            <ProgressDashboardView
              onNavigate={setCurrentSection}
            />
          )}

          {currentSection === 'notes' && (
            <NotesView
              initialNote={noteToSave}
            />
          )}
        </main>
      </div>
    </div>
  );
}

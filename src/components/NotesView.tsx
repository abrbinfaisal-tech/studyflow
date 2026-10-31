import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Tag, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  BookmarkCheck, 
  Sparkles, 
  Copy, 
  Check, 
  Share2,
  FolderOpen,
  AlertTriangle
} from 'lucide-react';
import { StudyNote } from '../types';
import { StorageService } from '../services/storage';
import { FormattedContent } from './FormattedContent';

interface NotesViewProps {
  initialNote?: Partial<StudyNote>;
}

const SUBJECT_LIST = ['All Subjects', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'General'];

export const NotesView: React.FC<NotesViewProps> = ({ initialNote }) => {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFormulas, setOnlyFormulas] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('Mathematics');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editIsFormula, setEditIsFormula] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete Confirmation State
  const [noteToDelete, setNoteToDelete] = useState<StudyNote | null>(null);

  useEffect(() => {
    const list = StorageService.getNotes();
    setNotes(list);
    if (initialNote && initialNote.content) {
      // Create new note pre-filled from AI Tutor
      startNewNote(initialNote.title, initialNote.subject, initialNote.content, initialNote.tags);
    } else if (list.length > 0) {
      setActiveNoteId(list[0].id);
    }
  }, [initialNote]);

  const activeNote = notes.find(n => n.id === activeNoteId) || (notes.length > 0 ? notes[0] : null);

  const startNewNote = (title?: string, subject?: string, content?: string, tags?: string[]) => {
    setEditingNoteId(null);
    setEditTitle(title || '');
    setEditSubject(subject || (selectedSubject !== 'All Subjects' ? selectedSubject : 'Mathematics'));
    setEditContent(content || '');
    setEditTags(tags ? tags.join(', ') : '');
    setEditIsFormula(false);
    setIsEditing(true);
  };

  const handleEditActive = () => {
    if (!activeNote) return;
    setEditingNoteId(activeNote.id);
    setEditTitle(activeNote.title);
    setEditSubject(activeNote.subject);
    setEditContent(activeNote.content);
    setEditTags(activeNote.tags ? activeNote.tags.join(', ') : '');
    setEditIsFormula(!!activeNote.isFormulaSheet);
    setIsEditing(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTitle.trim() && !editContent.trim()) return;

    const tagsArray = editTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const isExisting = editingNoteId !== null;
    const noteId = isExisting 
      ? editingNoteId 
      : 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const existingTarget = isExisting ? notes.find(n => n.id === editingNoteId) : null;

    const noteToSave: StudyNote = {
      id: noteId,
      title: editTitle.trim() || 'Untitled Note',
      subject: editSubject,
      content: editContent,
      tags: tagsArray,
      isFormulaSheet: editIsFormula,
      createdAt: existingTarget ? existingTarget.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    StorageService.saveNote(noteToSave);
    const updatedList = StorageService.getNotes();
    setNotes(updatedList);
    setActiveNoteId(noteToSave.id);
    setIsEditing(false);
    setEditingNoteId(null);
  };

  const handleConfirmDelete = () => {
    if (!noteToDelete) return;
    const id = noteToDelete.id;
    StorageService.deleteNote(id);
    const updated = StorageService.getNotes();
    setNotes(updated);
    if (activeNoteId === id) {
      setActiveNoteId(updated.length > 0 ? updated[0].id : null);
    }
    setNoteToDelete(null);
    if (isEditing && editingNoteId === id) {
      setIsEditing(false);
      setEditingNoteId(null);
    }
  };

  const handleCopyNote = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const matchesSubject = selectedSubject === 'All Subjects' || n.subject === selectedSubject;
    const matchesFormula = !onlyFormulas || n.isFormulaSheet;
    const matchesSearch = 
      !searchQuery.trim() || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesFormula && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with prominent "+ Create New Note" Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-white shadow-lg shadow-purple-950/40">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              My Study Notes & Formulas
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Formula Bank
              </span>
            </h2>
            <p className="text-xs text-slate-400">Organise concept summaries, save key equations, and review high-yield flash formulas</p>
          </div>
        </div>

        {/* Prominent "+ Create New Note" button */}
        <button
          onClick={() => startNewNote()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-950/40 hover:shadow-purple-900/60 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Create New Note</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes, formulas, or tags..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-purple-500"
          >
            {SUBJECT_LIST.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={() => setOnlyFormulas(!onlyFormulas)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              onlyFormulas
                ? 'bg-purple-950 border-purple-500 text-purple-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Formulas Only
          </button>
        </div>

        <span className="text-xs text-slate-500">
          Showing {filteredNotes.length} of {notes.length} notes
        </span>
      </div>

      {/* 2-Column Note Layout: List & Reader/Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-16rem)] min-h-[550px]">
        {/* Notes List Column */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md p-3.5 flex flex-col overflow-hidden shadow-xl">
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredNotes.map(n => {
              const isActive = !isEditing && n.id === activeNote?.id;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    setActiveNoteId(n.id);
                    setIsEditing(false);
                    setEditingNoteId(null);
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border group relative ${
                    isActive
                      ? 'bg-purple-950/60 border-purple-500/50 text-white shadow-sm'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-purple-500/30 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-xs text-slate-100 group-hover:text-purple-200 line-clamp-1">
                      {n.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(n);
                      }}
                      className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-all"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {n.content ? n.content.replace(/[#*`$]/g, '') : 'No content'}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-800/60 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-purple-300 border border-slate-800">
                      {n.subject}
                    </span>
                    <span className="text-slate-500">
                      {new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredNotes.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center space-y-3">
                <FolderOpen className="w-10 h-10 opacity-40 text-purple-400" />
                <p>No study notes match your filter.</p>
                <button
                  onClick={() => startNewNote()}
                  className="px-3 py-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-800 border border-purple-500/40 text-purple-200 text-xs font-semibold"
                >
                  + Create New Note
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reader / Editor Column */}
        <div className="lg:col-span-8 rounded-2xl bg-slate-900/80 border border-purple-500/20 backdrop-blur-md p-6 flex flex-col shadow-2xl overflow-hidden relative">
          {isEditing ? (
            /* Note Editor Form */
            <form onSubmit={handleSave} className="flex-1 flex flex-col space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Enter note title (e.g. Fundamental Theorem of Calculus)..."
                  className="bg-transparent text-base sm:text-lg font-bold text-white focus:outline-none placeholder:text-slate-600 flex-1 min-w-[200px]"
                  required
                  autoFocus
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingNoteId(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Subject or Category *</label>
                  <select
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none focus:border-purple-500"
                  >
                    {SUBJECT_LIST.filter(s => s !== 'All Subjects').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                    placeholder="Formulas, High-Yield, Exam"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={editIsFormula}
                      onChange={e => setEditIsFormula(e.target.checked)}
                      className="accent-purple-500 rounded"
                    />
                    <span>Mark as Formula Sheet</span>
                  </label>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                  Main Note Text (Supports Markdown and Math: $E = mc^2$ or $$block$$)
                </label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Type your notes, equations ($...$), definitions, and summaries here..."
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500 resize-none leading-relaxed custom-scrollbar"
                />
              </div>
            </form>
          ) : activeNote ? (
            /* Note Reader View */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-purple-500/20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {activeNote.subject}
                    </span>
                    {activeNote.isFormulaSheet && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Formula Bank
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      Last edited {new Date(activeNote.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{activeNote.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyNote(activeNote.content, activeNote.id)}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
                    title="Copy note content"
                  >
                    {copiedId === activeNote.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === activeNote.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleEditActive}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-800/70 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setNoteToDelete(activeNote)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-medium transition-all cursor-pointer"
                    title="Delete this note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Note Tags */}
              {activeNote.tags && activeNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {activeNote.tags.map((t, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Rendered Content */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <FormattedContent content={activeNote.content} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs space-y-3">
              <FileText className="w-12 h-12 opacity-30 text-purple-400" />
              <span>No note selected. Select a note or create a new one to begin.</span>
              <button
                onClick={() => startNewNote()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold text-xs shadow-md shadow-purple-950/40"
              >
                + Create New Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Note Confirmation Dialog */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Note</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">"{noteToDelete.title}"</span>? This note will be permanently removed from your personal storage.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

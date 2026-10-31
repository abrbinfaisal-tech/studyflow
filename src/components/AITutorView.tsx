import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Plus, 
  Trash2, 
  Sparkles, 
  FileText, 
  Paperclip, 
  CheckCircle2, 
  HelpCircle, 
  BookOpen, 
  GraduationCap, 
  Zap, 
  Layers, 
  X,
  MessageSquare,
  Loader2,
  BookmarkPlus,
  RotateCcw,
  AlertCircle,
  ShieldAlert,
  Clock,
  FlaskConical,
  WifiOff,
  ArrowDown
} from 'lucide-react';
import { ChatSession, ChatMessage, QuizQuestion, StudyNote } from '../types';
import { StorageService } from '../services/storage';
import { FormattedContent } from './FormattedContent';
import { AssessmentQuiz } from './AssessmentQuiz';
import { apiFetch, ApiError, RetryCallbackInfo } from '../services/apiClient';

export interface TutorErrorState {
  message: string;
  errorCode: string;
  statusCode: number;
  failedMessageId: string;
  pendingText: string;
  pendingAttachment?: { name: string; mimeType: string; data: string } | null;
  pendingAssessment?: boolean;
}

interface AITutorViewProps {
  initialPrompt?: string;
  onSaveToNotes?: (note: Partial<StudyNote>) => void;
}

const STARTER_TOPICS = [
  { label: 'Limits & Derivatives', subject: 'Math', prompt: 'Explain the chain rule for derivatives using intuitive step-by-step analogies and show a diagram if helpful.' },
  { label: 'Newton\'s Laws', subject: 'Physics', prompt: 'Explain Newton\'s three laws of motion and draw a free body diagram showing forces on an inclined plane.' },
  { label: 'Photosynthesis vs Respiration', subject: 'Biology', prompt: 'Compare cellular respiration and photosynthesis, including ATP yield and key chemical formulas.' },
  { label: 'Reaction Mechanisms (SN1 vs SN2)', subject: 'Chemistry', prompt: 'Break down the differences between SN1 and SN2 nucleophilic substitution reactions with carbocation stability.' },
  { label: 'Big-O & Recursion', subject: 'CS', prompt: 'Explain Big-O time complexity and recursion using a Fibonacci tree diagram.' },
];

export const AITutorView: React.FC<AITutorViewProps> = ({ initialPrompt, onSaveToNotes }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('General');
  const [gradeLevel, setGradeLevel] = useState('High School / College');
  const [loading, setLoading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<TutorErrorState | null>(null);
  const [backoffStatus, setBackoffStatus] = useState<RetryCallbackInfo | null>(null);
  const [simulatedErrorMode, setSimulatedErrorMode] = useState<string>('none');
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Load chat sessions from storage
  useEffect(() => {
    const loadedSessions = StorageService.getChats();
    if (loadedSessions.length === 0) {
      // Create first welcome session
      const welcomeSession: ChatSession = {
        id: 'session-welcome-' + Date.now(),
        title: 'Welcome to AI Tutor',
        subject: 'General Study',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          {
            id: 'msg-welcome',
            role: 'model',
            content: `# Welcome to your Study Flow AI Tutor! 🎓

I am here to help you break down difficult concepts, solve step-by-step problems, understand mathematical equations, and test your understanding at your own pace.

### How I can help you:
- **Simplify Complex Topics**: Ask me anything from differential equations to organic chemistry and cellular pathways.
- **Formulas & Math**: We can derive equations together, with clear step-by-step explanations.
- **Conceptual Diagrams**: When a visual helps, I will generate an interactive diagram.
- **Knowledge Assessments**: Click **"Test My Understanding"** anytime you want an interactive quiz to verify your mastery!

What would you like to learn today? Pick one of the suggested topics below or type your question.`,
            timestamp: Date.now(),
            suggestions: [
              'Explain the chain rule for derivatives',
              'How does cellular respiration create ATP?',
              'What is the difference between speed and velocity?'
            ]
          }
        ]
      };
      StorageService.saveChat(welcomeSession);
      setSessions([welcomeSession]);
      setCurrentSessionId(welcomeSession.id);
    } else {
      setSessions(loadedSessions);
      setCurrentSessionId(loadedSessions[0].id);
    }
  }, []);

  // Handle incoming initialPrompt from roadmap or other sections
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 100;
    shouldAutoScrollRef.current = isNearBottom;
    setShowScrollBottomBtn(!isNearBottom);
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
    shouldAutoScrollRef.current = true;
    setShowScrollBottomBtn(false);
  };

  // Only auto-scroll when new messages arrive if the student is already at the bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom(false);
    }
  }, [currentSession?.messages]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const createNewChat = (topicTitle?: string) => {
    const newSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: topicTitle || 'New Study Session',
      subject: selectedSubject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: 'welcome-' + Date.now(),
          role: 'model',
          content: `Hello! I'm ready to help you with **${selectedSubject}**. Ask any question, paste a homework problem, or ask me to explain a concept step-by-step!`,
          timestamp: Date.now(),
          suggestions: [
            `What are the most important formulas in ${selectedSubject}?`,
            `Give me a fundamental overview of ${selectedSubject}`,
            `Give me a practice problem in ${selectedSubject}`
          ]
        }
      ]
    };
    StorageService.saveChat(newSession);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.deleteChat(id);
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (remaining.length > 0) {
      setCurrentSessionId(remaining[0].id);
    } else {
      createNewChat();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setActiveError({
        message: 'File size is too large. Please select a file under 20MB.',
        errorCode: 'FILE_SIZE_ERROR',
        statusCode: 400,
        failedMessageId: '',
        pendingText: '',
      });
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
      setActiveError(null);
    };
    reader.readAsDataURL(file);
  };

  // Helper to map error response to clean friendly message
  const getFriendlyErrorMessage = (status: number, errData: any): { friendlyMsg: string; code: string } => {
    let raw = errData?.error;
    let code = errData?.errorCode;

    // Check for 503 / High Demand
    if (status === 503 || code === 'MODEL_BUSY_503' || String(raw).includes('503') || String(raw).includes('high demand') || String(raw).includes('UNAVAILABLE')) {
      return {
        friendlyMsg: 'Our AI tutor is temporarily busy. Please try again in a moment.',
        code: 'MODEL_BUSY_503',
      };
    }

    // Check for 429 / Rate Limit / Quota
    if (status === 429 || code === 'USAGE_LIMIT_429' || String(raw).includes('429') || String(raw).includes('RESOURCE_EXHAUSTED')) {
      return {
        friendlyMsg: 'The usage limit has been reached. Please wait a moment before trying again.',
        code: 'USAGE_LIMIT_429',
      };
    }

    // Check for 401/403 Auth
    if (status === 401 || status === 403 || code === 'AUTH_ERROR_401' || String(raw).includes('401') || String(raw).includes('PERMISSION_DENIED')) {
      return {
        friendlyMsg: 'API authentication needs attention. Please verify your API key in Settings > Secrets.',
        code: 'AUTH_ERROR_401',
      };
    }

    // Network error
    if (status === 502 || code === 'NETWORK_ERROR' || String(raw).includes('network') || String(raw).includes('fetch failed')) {
      return {
        friendlyMsg: 'Connection to the AI service failed. Please check your network connection and try again.',
        code: 'NETWORK_ERROR',
      };
    }

    // Default clean message (never raw JSON!)
    if (typeof raw === 'string' && !raw.trim().startsWith('{') && raw.length < 150) {
      return { friendlyMsg: raw, code: code || 'SERVICE_ERROR' };
    }

    return {
      friendlyMsg: 'Our AI tutor is temporarily busy. Please try again in a moment.',
      code: 'MODEL_BUSY_503',
    };
  };

  const sendMessage = async (customMessage?: string, requestAssessment = false) => {
    const textToSend = customMessage !== undefined ? customMessage : inputMessage;
    if ((!textToSend.trim() && !attachment) || loading || !currentSession) return;

    setActiveError(null);
    setLoading(true);

    const userMsgId = 'msg-' + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend || (attachment ? `Please examine this uploaded document: ${attachment.name}` : ''),
      timestamp: Date.now(),
      attachmentName: attachment ? attachment.name : undefined,
    };

    // Preserve the student's question in session and storage immediately
    const updatedSessionMessages = [...currentSession.messages, newUserMsg];

    // Placeholder message for progressive streaming
    const aiMsgId = 'msg-ai-' + Date.now();
    setStreamingMsgId(aiMsgId);
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      suggestions: [],
    };

    const sessionWithPlaceholder: ChatSession = {
      ...currentSession,
      title: currentSession.messages.length <= 1 ? (textToSend.slice(0, 32) || 'Study Session') : currentSession.title,
      updatedAt: Date.now(),
      messages: [...updatedSessionMessages, initialAiMsg],
    };

    setSessions(prev => prev.map(s => s.id === currentSession.id ? sessionWithPlaceholder : s));
    StorageService.saveChat(sessionWithPlaceholder);

    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    shouldAutoScrollRef.current = true;
    setShowScrollBottomBtn(false);
    setTimeout(() => scrollToBottom(true), 50);

    const currentAttach = attachment;
    setAttachment(null);

    let accumulatedText = '';
    let parsedSuggestions: string[] = [];
    let parsedQuiz: any[] | undefined = undefined;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (simulatedErrorMode !== 'none') {
        headers['x-simulate-error'] = simulatedErrorMode;
      }

      setBackoffStatus(null);

      // Resilient stream fetch with exponential backoff & jitter for 429 and transient errors
      const response = await apiFetch('/api/tutor/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedSessionMessages.map(m => ({ role: m.role, content: m.content })),
          userMessage: textToSend,
          gradeLevel,
          topic: selectedSubject,
          requestAssessment,
          attachment: currentAttach ? { mimeType: currentAttach.mimeType, data: currentAttach.data } : undefined,
        }),
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (info) => {
          setBackoffStatus(info);
        },
      });

      setBackoffStatus(null);

      // Read SSE stream progressively
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (!reader) throw new Error('ReadableStream not supported');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              throw { status: data.statusCode || 500, message: data.error, errorCode: data.errorCode };
            }

            if (data.chunk) {
              accumulatedText += data.chunk;
              // Clean out raw meta tags while streaming
              const cleanPreview = accumulatedText
                .replace(/<<<SUGGESTIONS:[\s\S]*?>>>/g, '')
                .replace(/<<<QUIZ:[\s\S]*?>>>/g, '');

              setSessions(prev => prev.map(s => {
                if (s.id !== currentSession.id) return s;
                return {
                  ...s,
                  messages: s.messages.map(m => m.id === aiMsgId ? { ...m, content: cleanPreview } : m)
                };
              }));
            }

            if (data.done) {
              if (data.fullText) accumulatedText = data.fullText;
              if (data.suggestions) parsedSuggestions = data.suggestions;
              if (data.quiz) parsedQuiz = data.quiz;
            }
          } catch (parseErr: any) {
            if (parseErr?.errorCode) throw parseErr;
          }
        }
      }

      const finalCleanText = accumulatedText
        .replace(/<<<SUGGESTIONS:[\s\S]*?>>>/g, '')
        .replace(/<<<QUIZ:[\s\S]*?>>>/g, '')
        .trim();

      const finalAiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'model',
        content: finalCleanText || accumulatedText,
        timestamp: Date.now(),
        suggestions: parsedSuggestions,
        quiz: parsedQuiz,
      };

      const finalSession: ChatSession = {
        ...sessionWithPlaceholder,
        updatedAt: Date.now(),
        messages: [...updatedSessionMessages, finalAiMsg],
      };

      setSessions(prev => prev.map(s => s.id === currentSession.id ? finalSession : s));
      StorageService.saveChat(finalSession);
      setActiveError(null);
    } catch (err: any) {
      console.error('Chat stream error:', err);
      // Clean up placeholder if empty
      const fallbackSession: ChatSession = {
        ...sessionWithPlaceholder,
        messages: updatedSessionMessages,
      };
      setSessions(prev => prev.map(s => s.id === currentSession.id ? fallbackSession : s));
      StorageService.saveChat(fallbackSession);

      const status = err?.status || err?.statusCode || 502;
      const { friendlyMsg, code } = getFriendlyErrorMessage(status, err);

      setActiveError({
        message: friendlyMsg,
        errorCode: code,
        statusCode: status,
        failedMessageId: userMsgId,
        pendingText: textToSend,
        pendingAttachment: currentAttach,
        pendingAssessment: requestAssessment,
      });
    } finally {
      setLoading(false);
      setStreamingMsgId(null);
    }
  };

  // Retry the failed response without duplicating the user question in the conversation
  const handleRetry = async () => {
    if (!activeError || loading || !currentSession) return;
    const { pendingText, pendingAttachment, pendingAssessment, failedMessageId } = activeError;

    setActiveError(null);
    setLoading(true);
    shouldAutoScrollRef.current = true;
    setShowScrollBottomBtn(false);
    setTimeout(() => scrollToBottom(true), 50);

    const aiMsgId = 'msg-ai-' + Date.now();
    setStreamingMsgId(aiMsgId);
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      suggestions: [],
    };

    // Append streaming placeholder without re-adding the user's question
    const sessionWithPlaceholder: ChatSession = {
      ...currentSession,
      updatedAt: Date.now(),
      messages: [...currentSession.messages, initialAiMsg],
    };

    setSessions(prev => prev.map(s => s.id === currentSession.id ? sessionWithPlaceholder : s));

    let accumulatedText = '';
    let parsedSuggestions: string[] = [];
    let parsedQuiz: any[] | undefined = undefined;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (simulatedErrorMode !== 'none') {
        headers['x-simulate-error'] = simulatedErrorMode;
      }

      setBackoffStatus(null);

      // Resilient stream fetch with exponential backoff & jitter for 429 and transient errors
      const response = await apiFetch('/api/tutor/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: currentSession.messages.map(m => ({ role: m.role, content: m.content })),
          userMessage: pendingText,
          gradeLevel,
          topic: selectedSubject,
          requestAssessment: pendingAssessment,
          attachment: pendingAttachment ? { mimeType: pendingAttachment.mimeType, data: pendingAttachment.data } : undefined,
        }),
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry: (info) => {
          setBackoffStatus(info);
        },
      });

      setBackoffStatus(null);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('ReadableStream not supported');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              throw { status: data.statusCode || 500, message: data.error, errorCode: data.errorCode };
            }

            if (data.chunk) {
              accumulatedText += data.chunk;
              const cleanPreview = accumulatedText
                .replace(/<<<SUGGESTIONS:[\s\S]*?>>>/g, '')
                .replace(/<<<QUIZ:[\s\S]*?>>>/g, '');

              setSessions(prev => prev.map(s => {
                if (s.id !== currentSession.id) return s;
                return {
                  ...s,
                  messages: s.messages.map(m => m.id === aiMsgId ? { ...m, content: cleanPreview } : m)
                };
              }));
            }

            if (data.done) {
              if (data.fullText) accumulatedText = data.fullText;
              if (data.suggestions) parsedSuggestions = data.suggestions;
              if (data.quiz) parsedQuiz = data.quiz;
            }
          } catch (parseErr: any) {
            if (parseErr?.errorCode) throw parseErr;
          }
        }
      }

      const finalCleanText = accumulatedText
        .replace(/<<<SUGGESTIONS:[\s\S]*?>>>/g, '')
        .replace(/<<<QUIZ:[\s\S]*?>>>/g, '')
        .trim();

      const finalAiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'model',
        content: finalCleanText || accumulatedText,
        timestamp: Date.now(),
        suggestions: parsedSuggestions,
        quiz: parsedQuiz,
      };

      const finalSession: ChatSession = {
        ...currentSession,
        updatedAt: Date.now(),
        messages: [...currentSession.messages, finalAiMsg],
      };

      setSessions(prev => prev.map(s => s.id === currentSession.id ? finalSession : s));
      StorageService.saveChat(finalSession);
      setActiveError(null);
    } catch (err: any) {
      console.error('Retry stream error:', err);
      // Remove placeholder message
      setSessions(prev => prev.map(s => s.id === currentSession.id ? currentSession : s));

      const status = err?.status || err?.statusCode || 502;
      const { friendlyMsg, code } = getFriendlyErrorMessage(status, err);

      setActiveError({
        message: friendlyMsg,
        errorCode: code,
        statusCode: status,
        failedMessageId,
        pendingText,
        pendingAttachment,
        pendingAssessment,
      });
    } finally {
      setLoading(false);
      setStreamingMsgId(null);
    }
  };

  const handleSaveToNotesClick = (messageContent: string) => {
    if (onSaveToNotes) {
      onSaveToNotes({
        title: `${selectedSubject} Notes - ${new Date().toLocaleDateString()}`,
        subject: selectedSubject,
        content: messageContent,
        tags: [selectedSubject, 'Tutor Explanation'],
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-0 h-full w-full max-w-7xl mx-auto gap-3 sm:gap-4 overflow-hidden relative">
      {/* Mobile Saved Sessions Modal */}
      {mobileSessionsOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden flex justify-start p-4"
          onClick={() => setMobileSessionsOpen(false)}
        >
          <div 
            className="w-72 max-w-[85vw] h-full rounded-2xl bg-slate-900 border border-purple-500/30 p-4 shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Saved Study Sessions ({sessions.length})
              </span>
              <button 
                onClick={() => setMobileSessionsOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                createNewChat();
                setMobileSessionsOpen(false);
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-medium text-xs shadow-md mb-3"
            >
              <Plus className="w-4 h-4" />
              New Study Session
            </button>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {sessions.map(s => {
                const isActive = s.id === currentSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setCurrentSessionId(s.id);
                      setMobileSessionsOpen(false);
                    }}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs border ${
                      isActive
                        ? 'bg-purple-950/60 border-purple-500/50 text-white'
                        : 'bg-slate-900/40 border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                      <span className="truncate font-medium">{s.title || 'Untitled Session'}</span>
                    </div>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Left Chat Sessions Drawer / Sidebar (Desktop) */}
      <div className="hidden md:flex flex-col w-64 shrink-0 rounded-2xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-md p-3.5 shadow-xl h-full min-h-0">
        <button
          onClick={() => createNewChat()}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium text-xs shadow-md shadow-purple-950/40 transition-all mb-3 shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Study Session
        </button>

        <div className="text-[11px] font-semibold text-purple-300/70 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between shrink-0">
          <span>Saved Sessions</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {sessions.length}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {sessions.map(s => {
            const isActive = s.id === currentSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs border ${
                  isActive
                    ? 'bg-purple-950/60 border-purple-500/50 text-white shadow-sm'
                    : 'bg-slate-900/40 border-transparent hover:border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span className="truncate font-medium">{s.title || 'Untitled Session'}</span>
                </div>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-slate-500 transition-opacity p-1"
                  title="Delete session"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Quick controls in sidebar footer */}
        <div className="pt-3 border-t border-slate-800 space-y-2 shrink-0">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
              Academic Level
            </label>
            <select
              value={gradeLevel}
              onChange={e => setGradeLevel(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 focus:border-purple-500 outline-none"
            >
              <option value="Middle School">Middle School</option>
              <option value="High School">High School (AP / IB / A-Level)</option>
              <option value="High School / College">College / University</option>
              <option value="Competitive Exam">Competitive Exam Prep</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Chat Interface: Proper flex-column layout with fixed bottom composer */}
      <div className="flex-1 min-h-0 flex flex-col h-full rounded-2xl bg-slate-900/80 border border-purple-500/20 backdrop-blur-md shadow-2xl overflow-hidden relative">
        {/* Chat Header (Fixed at top of chat panel) */}
        <div className="shrink-0 flex flex-wrap items-center justify-between px-4 sm:px-5 py-3 border-b border-purple-500/20 bg-slate-950/60 z-10 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Mobile Sessions Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileSessionsOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-purple-500/30 text-purple-200 hover:text-white transition-colors"
              title="View saved study sessions"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-purple-900/30 shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white">AI Personal Tutor</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs">{currentSession?.title || 'Interactive Session'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Subject Selector */}
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="text-xs bg-slate-900/90 border border-purple-500/30 rounded-lg px-2 sm:px-2.5 py-1.5 text-purple-200 outline-none hover:border-purple-500"
            >
              <option value="General">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Economics">Economics</option>
              <option value="Literature & History">Humanities</option>
            </select>

            {/* Error Simulation Selector for testing error recovery and retry */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-purple-500/30 text-[11px] text-slate-300">
              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={simulatedErrorMode}
                onChange={e => setSimulatedErrorMode(e.target.value)}
                className="bg-transparent text-purple-200 outline-none text-xs cursor-pointer font-medium"
                title="Select simulation mode to test error recovery"
              >
                <option value="none" className="bg-slate-900 text-slate-200">Mode: Live AI</option>
                <option value="503" className="bg-slate-900 text-amber-300">Test 503 (High Demand)</option>
                <option value="429" className="bg-slate-900 text-amber-300">Test 429 (Usage Limit)</option>
                <option value="401" className="bg-slate-900 text-rose-300">Test 401 (Auth Notice)</option>
                <option value="network" className="bg-slate-900 text-rose-300">Test Network Error</option>
              </select>
            </div>

            {/* Assessment Request Button */}
            <button
              onClick={() => sendMessage(`Please give me an assessment quiz on the concepts we have been discussing to check my understanding.`, true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 text-xs font-semibold shadow-sm transition-all"
              title="Generate a 3-question knowledge quiz"
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden sm:inline">Quiz Me</span>
            </button>
          </div>
        </div>

        {/* Conversation History: Flexible, independently scrollable area */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar relative"
        >
          {/* Starter prompts if fresh session */}
          {currentSession?.messages.length === 1 && (
            <div className="mb-6 p-4 rounded-xl bg-purple-950/20 border border-purple-500/20">
              <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Quick Concept Jumpstarts:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {STARTER_TOPICS.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(topic.prompt)}
                    className="text-left p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/80 transition-all text-xs group"
                  >
                    <div className="font-semibold text-purple-200 group-hover:text-white flex items-center justify-between">
                      <span>{topic.label}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">{topic.subject}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-1">{topic.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentSession?.messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-purple-700/50 border border-purple-500/40 flex items-center justify-center text-purple-200 shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-3xl ${isUser ? 'w-auto' : 'w-full'}`}>
                  <div
                    className={`p-4 rounded-2xl ${
                      isUser
                        ? 'bg-gradient-to-r from-purple-700 to-violet-700 text-white rounded-tr-sm shadow-lg shadow-purple-950/30'
                        : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 rounded-tl-sm shadow-md'
                    }`}
                  >
                    {msg.attachmentName && (
                      <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/30 border border-white/10 text-xs text-purple-200">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Attached: {msg.attachmentName}</span>
                      </div>
                    )}

                    {isUser ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <div>
                        {msg.content === '' ? (
                          <div className="flex items-center gap-2.5 py-1 text-purple-300 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            <span>AI Tutor is preparing your step-by-step breakdown...</span>
                          </div>
                        ) : (
                          <>
                            <FormattedContent content={msg.content} />
                            {streamingMsgId === msg.id && (
                              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-purple-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                <span className="text-purple-300">Explaining step-by-step...</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Save to Notes action button */}
                        {msg.content !== '' && !streamingMsgId && (
                          <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-end">
                            <button
                              onClick={() => handleSaveToNotesClick(msg.content)}
                              className="inline-flex items-center gap-1 text-[11px] text-purple-300/80 hover:text-purple-200 transition-colors"
                            >
                              <BookmarkPlus className="w-3 h-3" />
                              Save to My Notes
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Render assessment quiz if provided by AI Tutor */}
                  {!isUser && msg.quiz && msg.quiz.length > 0 && (
                    <AssessmentQuiz
                      quiz={msg.quiz}
                      topicTitle={selectedSubject}
                      onAskTutor={prompt => sendMessage(prompt)}
                    />
                  )}

                  {/* Follow-up suggestions */}
                  {!isUser && msg.suggestions && msg.suggestions.length > 0 && !streamingMsgId && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => sendMessage(suggestion)}
                          className="px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/25 text-purple-200 text-xs flex items-center gap-1 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 mt-1 block px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-violet-600/50 border border-violet-400/30 flex items-center justify-center text-white shrink-0 mt-1">
                    <span className="text-xs font-bold">You</span>
                  </div>
                )}
              </div>
            );
          })}

          {loading && !streamingMsgId && (
            <div className="flex gap-3.5 items-start">
              <div className="w-8 h-8 rounded-xl bg-purple-700/50 border border-purple-500/40 flex items-center justify-center text-purple-200 shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 rounded-tl-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                <span className="text-xs font-medium text-purple-300">
                  AI Tutor is analyzing your question and preparing a step-by-step breakdown...
                </span>
              </div>
            </div>
          )}

          {/* Real-time Backoff Notification when automatically retrying HTTP 429 */}
          {backoffStatus && (
            <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/50 backdrop-blur-md flex items-center justify-between gap-3 text-xs text-amber-200 animate-pulse shadow-xl shadow-amber-950/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-900/60 border border-amber-500/40 text-amber-300 shrink-0">
                  <Clock className="w-4 h-4 animate-spin text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300">
                      {backoffStatus.status === 429 ? 'Rate Limit Encountered (HTTP 429)' : 'AI Service Busy'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/80 border border-amber-500/40 font-mono text-amber-300">
                      Auto-Retry {backoffStatus.attempt} / {backoffStatus.maxRetries}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/90 mt-0.5">
                    Exponential backoff with jitter in progress — retrying in {(backoffStatus.delayMs / 1000).toFixed(1)}s without losing your question...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User-Friendly Error Notice Card (No Raw JSON) with Preserved Question & Retry */}
          {activeError && (
            <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all ${
              activeError.errorCode === 'MODEL_BUSY_503' || activeError.statusCode === 503
                ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
                : activeError.errorCode === 'USAGE_LIMIT_429' || activeError.statusCode === 429
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : activeError.errorCode === 'AUTH_ERROR_401' || activeError.statusCode === 401
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                    : 'bg-slate-900/95 border-purple-500/30 text-slate-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                  activeError.errorCode === 'MODEL_BUSY_503' || activeError.statusCode === 503
                    ? 'bg-purple-900/50 border-purple-400/40 text-purple-300'
                    : activeError.errorCode === 'USAGE_LIMIT_429'
                      ? 'bg-amber-900/50 border-amber-400/40 text-amber-300'
                      : activeError.errorCode === 'AUTH_ERROR_401'
                        ? 'bg-rose-900/50 border-rose-400/40 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}>
                  {activeError.errorCode === 'MODEL_BUSY_503' || activeError.statusCode === 503 ? (
                    <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                  ) : activeError.errorCode === 'USAGE_LIMIT_429' ? (
                    <Clock className="w-4 h-4 text-amber-300" />
                  ) : activeError.errorCode === 'AUTH_ERROR_401' ? (
                    <ShieldAlert className="w-4 h-4 text-rose-300" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-purple-300" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-xs text-white">
                      {activeError.errorCode === 'MODEL_BUSY_503' || activeError.statusCode === 503
                        ? 'AI Tutor Temporarily Busy'
                        : activeError.errorCode === 'USAGE_LIMIT_429'
                          ? 'Usage Limit Notice'
                          : activeError.errorCode === 'AUTH_ERROR_401'
                            ? 'Authentication Required'
                            : 'Connection Notice'}
                    </h5>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10 font-mono">
                      {activeError.statusCode}
                    </span>
                  </div>

                  <p className="text-xs mt-1 leading-relaxed text-slate-200 font-medium">
                    {activeError.message}
                  </p>

                  {activeError.pendingText && (
                    <p className="text-[11px] text-purple-300/80 mt-1 italic line-clamp-1">
                      Preserved question: "{activeError.pendingText}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {activeError.statusCode !== 401 && (
                  <button
                    onClick={handleRetry}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-purple-950/40 flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Retry Question</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveError(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
                  title="Dismiss notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Spacer to guarantee the bottom message is never covered */}
          <div ref={messagesEndRef} className="h-4 shrink-0" />
        </div>

        {/* Floating Jump to Latest Button (visible when student has scrolled up) */}
        {showScrollBottomBtn && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-24 right-5 sm:right-7 z-20 px-3.5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-2xl shadow-purple-950/80 backdrop-blur-md flex items-center gap-1.5 transition-all border border-purple-400/40 cursor-pointer animate-fade-in"
          >
            <span>Jump to latest</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Attachment preview if selected */}
        {attachment && (
          <div className="shrink-0 px-4 py-2 bg-purple-950/70 border-t border-purple-500/20 flex items-center justify-between text-xs text-purple-200 z-10">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="font-medium truncate">{attachment.name}</span>
            </div>
            <button
              onClick={() => setAttachment(null)}
              className="p-1 hover:text-white text-purple-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Composer Footer: Fixed at the bottom of the chat panel */}
        <div className="shrink-0 border-t border-purple-500/20 bg-slate-950/95 backdrop-blur-md p-3 sm:p-4 z-10">
          <form
            onSubmit={e => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-end gap-2 max-w-full"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 sm:p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-slate-400 hover:text-purple-300 transition-colors shrink-0 self-end mb-0.5"
              title="Upload question sheet or PDF/image (up to 20MB)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Multiline input box accessible even while AI is generating */}
            <div className="flex-1 relative flex items-center min-w-0">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI Tutor anything (Shift + Enter for new line)..."
                className="w-full bg-slate-900/95 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none resize-none max-h-36 min-h-[44px] leading-relaxed custom-scrollbar transition-all"
              />
            </div>

            {/* Send button beside the input box */}
            <button
              type="submit"
              disabled={loading || (!inputMessage.trim() && !attachment)}
              className={`p-2.5 sm:p-3 rounded-xl font-medium text-xs flex items-center justify-center transition-all shrink-0 self-end mb-0.5 ${
                loading || (!inputMessage.trim() && !attachment)
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-950/40'
              }`}
              title={loading ? 'AI Tutor is generating...' : 'Send message (Enter)'}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 px-1">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Shift + Enter</kbd> for new line</span>
            <span className="hidden sm:inline">AI Tutor ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle2, XCircle, Award, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StorageService } from '../services/storage';

interface AssessmentQuizProps {
  quiz: QuizQuestion[];
  topicTitle: string;
  onAskTutor?: (prompt: string) => void;
  onComplete?: (score: number, total: number) => void;
}

export const AssessmentQuiz: React.FC<AssessmentQuizProps> = ({
  quiz,
  topicTitle,
  onAskTutor,
  onComplete,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [logged, setLogged] = useState(false);

  const handleSelect = (qIdx: number, optionIdx: number) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: optionIdx,
    }));
  };

  const calculateScore = () => {
    let score = 0;
    quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score++;
      }
    });
    return score;
  };

  const handleSubmit = () => {
    const score = calculateScore();
    setSubmitted(true);
    if (!logged) {
      StorageService.logQuizResult(topicTitle || 'Quiz Assessment', score, quiz.length);
      setLogged(true);
      if (onComplete) {
        onComplete(score, quiz.length);
      }
    }

    if (score >= Math.ceil(quiz.length * 0.7)) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#8b5cf6', '#ec4899', '#3b82f6'],
        });
      } catch (e) {}
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const allAnswered = Object.keys(selectedAnswers).length === quiz.length;
  const score = calculateScore();
  const percentage = Math.round((score / quiz.length) * 100);

  return (
    <div className="my-4 p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 via-slate-900/80 to-slate-950 border border-purple-500/30 shadow-xl shadow-purple-950/20">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Concept Mastery Assessment
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {quiz.length} Questions
              </span>
            </h4>
            <p className="text-xs text-purple-300/70">{topicTitle || 'Topic Check'}</p>
          </div>
        </div>

        {submitted && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              percentage >= 70 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              Score: {score}/{quiz.length} ({percentage}%)
            </span>
            <button
              onClick={handleReset}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Retake quiz"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {quiz.map((item, qIdx) => {
          const isSelected = selectedAnswers[qIdx] !== undefined;
          const isCorrect = submitted && selectedAnswers[qIdx] === item.correctIndex;
          const isWrong = submitted && isSelected && selectedAnswers[qIdx] !== item.correctIndex;

          return (
            <div 
              key={qIdx} 
              className={`p-4 rounded-xl border transition-all ${
                submitted 
                  ? isCorrect 
                    ? 'border-emerald-500/40 bg-emerald-950/15' 
                    : isWrong 
                      ? 'border-rose-500/40 bg-rose-950/15' 
                      : 'border-slate-800 bg-slate-900/40'
                  : 'border-slate-800/80 bg-slate-900/60'
              }`}
            >
              <p className="text-sm font-semibold text-slate-100 mb-3 flex items-start gap-2">
                <span className="text-purple-400 text-xs font-bold px-2 py-0.5 rounded bg-purple-950 border border-purple-800">
                  Q{qIdx + 1}
                </span>
                <span>{item.question}</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {item.options.map((option, optIdx) => {
                  const isThisSelected = selectedAnswers[qIdx] === optIdx;
                  const isThisCorrect = submitted && optIdx === item.correctIndex;
                  const isThisMistake = submitted && isThisSelected && optIdx !== item.correctIndex;

                  return (
                    <button
                      key={optIdx}
                      disabled={submitted}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`text-left p-3 rounded-lg text-xs leading-relaxed transition-all flex items-start gap-2.5 border ${
                        submitted
                          ? isThisCorrect
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-medium'
                            : isThisMistake
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                              : 'bg-slate-900/40 border-slate-800/80 text-slate-400 opacity-70'
                          : isThisSelected
                            ? 'bg-purple-600/30 border-purple-500 text-white shadow-sm shadow-purple-900/40'
                            : 'bg-slate-900/60 border-slate-800 hover:border-purple-500/40 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                        submitted
                          ? isThisCorrect
                            ? 'bg-emerald-500 text-slate-950'
                            : isThisMistake
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-800 text-slate-400'
                          : isThisSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {submitted && isThisCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {submitted && isThisMistake && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-purple-300">Explanation: </span>
                    {item.explanation}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-purple-500/20">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              allAnswered
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-900/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Submit Assessment
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
            <span className="text-xs text-purple-300 font-medium">
              Saved to your progress dashboard!
            </span>
            {onAskTutor && score < quiz.length && (
              <button
                onClick={() => onAskTutor(`Tutor, I just took the assessment on "${topicTitle}" and scored ${score}/${quiz.length}. Can you explain where I might have gone wrong and walk through the harder questions step by step?`)}
                className="px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                Ask Tutor to Review Mistakes
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

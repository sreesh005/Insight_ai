import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, HelpCircle, RotateCcw, Trophy, Sparkles } from 'lucide-react';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  timestamp?: string;
}

interface InteractiveQuizWidgetProps {
  questions: QuizQuestion[];
  onSeek: (seconds: number) => void;
}

const timeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  return hours * 3600 + minutes * 60 + seconds;
};

export const InteractiveQuizWidget: React.FC<InteractiveQuizWidgetProps> = ({ questions, onSeek }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (selectedAnswers[questionIndex] !== undefined) return; // Prevent changing once answered
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = Object.entries(selectedAnswers).filter(
    ([qIdx, selected]) => questions[Number(qIdx)]?.correctIndex === selected
  ).length;

  return (
    <div className="mt-3 my-2 p-4 rounded-2xl bg-[#111116] border border-indigo-500/30 shadow-xl space-y-5">
      {/* Quiz Banner Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>Interactive Video Quiz</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-mono">
                {questions.length} Questions
              </span>
            </h4>
            <p className="text-[10px] text-white/50">Test your comprehension of key video concepts</p>
          </div>
        </div>

        {answeredCount > 0 && (
          <button
            onClick={resetQuiz}
            className="flex items-center gap-1 text-[10px] font-mono text-white/50 hover:text-indigo-300 transition-colors px-2 py-1 rounded bg-white/5 hover:bg-white/10"
            title="Reset answers"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Score Tracker (When all answered) */}
      {answeredCount === questions.length && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-emerald-900/40 border border-indigo-500/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">
                Quiz Complete: {correctCount} / {questions.length} Correct ({Math.round((correctCount / questions.length) * 100)}%)
              </p>
              <p className="text-[10px] text-white/70">
                {correctCount === questions.length
                  ? '🌟 Perfect score! You mastered this video content!'
                  : correctCount >= questions.length / 2
                  ? '👍 Great job! Click timestamps below to review missed topics.'
                  : '💡 Good effort! Review the video timestamps to strengthen key points.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => {
          const userSelected = selectedAnswers[qIdx];
          const isAnswered = userSelected !== undefined;
          const isCorrect = userSelected === q.correctIndex;

          return (
            <div key={qIdx} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-white/90 leading-snug">
                  <span className="text-indigo-400 font-mono mr-1.5">Q{qIdx + 1}.</span>
                  {q.question}
                </p>
                {q.timestamp && (
                  <button
                    onClick={() => onSeek(timeToSeconds(q.timestamp!))}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all"
                    title={`Jump to video at [${q.timestamp}]`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>[{q.timestamp}]</span>
                  </button>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-1.5">
                {q.options.map((opt, oIdx) => {
                  let btnStyle = 'bg-white/5 border-white/10 text-white/80 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-white';
                  let icon = null;

                  if (isAnswered) {
                    if (oIdx === q.correctIndex) {
                      btnStyle = 'bg-emerald-500/20 border-emerald-500/80 text-emerald-200 font-medium';
                      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                    } else if (oIdx === userSelected) {
                      btnStyle = 'bg-rose-500/20 border-rose-500/80 text-rose-200';
                      icon = <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
                    } else {
                      btnStyle = 'bg-white/[0.02] border-white/5 text-white/40 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(qIdx, oIdx)}
                      className={`w-full text-left text-xs p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${btnStyle}`}
                    >
                      <span className="leading-snug">{opt}</span>
                      {icon}
                    </button>
                  );
                })}
              </div>

              {/* Instant Feedback & Explanation */}
              {isAnswered && (
                <div
                  className={`p-2.5 rounded-lg text-xs leading-relaxed border mt-2 space-y-1.5 ${
                    isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Correct Answer!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Incorrect</span>
                        </>
                      )}
                    </span>
                    {q.timestamp && (
                      <button
                        onClick={() => onSeek(timeToSeconds(q.timestamp!))}
                        className="text-[10px] font-mono underline text-indigo-300 hover:text-white"
                      >
                        Review video at [{q.timestamp}]
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] opacity-90">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ChatMessage, CitationTimestamp, AnswerLength, AIProvider } from '../types';
import { Sparkles, Send, Play, Clock, CornerDownLeft, Bot, User, Check, RefreshCw, HelpCircle, ChevronDown, ChevronUp, Cpu, Settings2, Key, AlertTriangle, ArrowRight } from 'lucide-react';
import { AI_PROVIDERS } from '../data/providers';
import { InteractiveQuizWidget, QuizQuestion } from './InteractiveQuizWidget';

interface AIChatSidebarProps {
  messages: ChatMessage[];
  onSendMessage: (question: string, answerLength?: AnswerLength) => void;
  isLoading: boolean;
  onSeek: (seconds: number) => void;
  wordCount: number;
  suggestedQuestions?: string[];
  transcriptLoaded?: boolean;
  activeProvider?: AIProvider;
  activeModel?: string;
  hasActiveKey?: boolean;
  onOpenAIProvider?: () => void;
}

// Helper to convert formatted time string like "12:30" or "01:15:20" to seconds
const timeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  return hours * 3600 + minutes * 60 + seconds;
};

// Helper to clean timestamp from raw or link formats like "[10:15]", " [10:15](#timestamp-615) ", "10:15", "01:15:20"
const cleanTimestamp = (ts?: string): string => {
  if (!ts) return '';
  const match = ts.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
  return match ? match[1] : ts.replace(/[[\]()#]/g, '').trim();
};

// Helper to sanitize quiz questions parsed from LLM JSON
const sanitizeQuizQuestions = (rawQuestions: any[]): QuizQuestion[] => {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions
    .filter((q) => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length >= 2)
    .map((q) => {
      let correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
      if (typeof q.correctIndex === 'string') {
        const parsed = parseInt(q.correctIndex, 10);
        if (!isNaN(parsed)) correctIdx = parsed;
        else if (/^[A-D]$/i.test(q.correctIndex)) {
          correctIdx = q.correctIndex.toUpperCase().charCodeAt(0) - 65;
        }
      }
      return {
        question: q.question.trim(),
        options: q.options.map((opt: any) => String(opt).trim()),
        correctIndex: Math.min(Math.max(0, correctIdx), q.options.length - 1),
        explanation: (q.explanation || 'Refer to the video timestamp to review this concept.').trim(),
        timestamp: cleanTimestamp(q.timestamp)
      };
    });
};

// Helper to detect and extract Quiz data from assistant text (code fence, raw JSON, or markdown quiz)
const extractQuizFromText = (text: string): { markdownText: string; quizQuestions: QuizQuestion[] | null } => {
  if (!text) return { markdownText: '', quizQuestions: null };

  // 1. Try code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      const sanitized = sanitizeQuizQuestions(parsed);
      if (sanitized.length > 0) {
        let cleanedText = text.replace(/```(?:json)?\s*[\s\S]*?\s*```/i, '').trim();
        // Clean leading/trailing horizontal rules or orphan headers
        cleanedText = cleanedText.replace(/^(\s*[-*_]{3,}\s*)+/g, '').replace(/(\s*[-*_]{3,}\s*)+$/g, '').trim();
        return { markdownText: cleanedText || 'Here is your interactive quiz:', quizQuestions: sanitized };
      }
    } catch (e) {}
  }

  // 2. Try raw JSON array starting with [ and ending with ] containing "question"
  const rawArrayMatch = text.match(/\[\s*\{\s*"question"[\s\S]*\}\s*\]/);
  if (rawArrayMatch && rawArrayMatch[0]) {
    try {
      const parsed = JSON.parse(rawArrayMatch[0]);
      const sanitized = sanitizeQuizQuestions(parsed);
      if (sanitized.length > 0) {
        let cleanedText = text.replace(rawArrayMatch[0], '').trim();
        cleanedText = cleanedText.replace(/^(\s*[-*_]{3,}\s*)+/g, '').replace(/(\s*[-*_]{3,}\s*)+$/g, '').trim();
        return { markdownText: cleanedText || 'Here is your interactive quiz:', quizQuestions: sanitized };
      }
    } catch (e) {
      // Try relaxed cleanup (trailing commas or escaped quotes)
      try {
        const sanitizedStr = rawArrayMatch[0]
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/\\'/g, "'");
        const parsed = JSON.parse(sanitizedStr);
        const sanitized = sanitizeQuizQuestions(parsed);
        if (sanitized.length > 0) {
          let cleanedText = text.replace(rawArrayMatch[0], '').trim();
          cleanedText = cleanedText.replace(/^(\s*[-*_]{3,}\s*)+/g, '').replace(/(\s*[-*_]{3,}\s*)+$/g, '').trim();
          return { markdownText: cleanedText || 'Here is your interactive quiz:', quizQuestions: sanitized };
        }
      } catch (e2) {}
    }
  }

  // 3. Fallback: Parse individual question objects using regex in case array syntax was broken
  const objectMatches = text.match(/\{\s*"question"\s*:\s*"[^"]+"[\s\S]*?"options"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g);
  if (objectMatches && objectMatches.length > 0) {
    const extractedList: any[] = [];
    for (const objStr of objectMatches) {
      try {
        const parsedObj = JSON.parse(objStr);
        if (parsedObj && parsedObj.question && Array.isArray(parsedObj.options)) {
          extractedList.push(parsedObj);
        }
      } catch (e) {}
    }
    const sanitized = sanitizeQuizQuestions(extractedList);
    if (sanitized.length > 0) {
      let cleanedText = text;
      for (const objStr of objectMatches) {
        cleanedText = cleanedText.replace(objStr, '');
      }
      cleanedText = cleanedText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
      cleanedText = cleanedText.replace(/^(\s*[-*_]{3,}\s*)+/g, '').replace(/(\s*[-*_]{3,}\s*)+$/g, '').trim();
      return { markdownText: cleanedText || 'Here is your interactive quiz:', quizQuestions: sanitized };
    }
  }

  // 4. Fallback: Parse plain Markdown Multiple Choice Quiz (e.g. Q1. ... A) ... B) ...)
  const markdownQuestionRegex = /(?:^|\n)(?:(?:Q|\*\*Q|Question|\d+\.)\s*(\d+)?[:.]?\s*)([^\n]+)\n+([A-D]\)?[^\n]+\n+[A-D]\)?[^\n]+(?:\n+[A-D]\)?[^\n]+)?(?:\n+[A-D]\)?[^\n]+)?)/gi;
  const mdMatches = [...text.matchAll(markdownQuestionRegex)];
  if (mdMatches.length >= 2) {
    const mdQuestions: QuizQuestion[] = [];
    for (const match of mdMatches) {
      const qText = (match[2] || '').replace(/\*\*/g, '').trim();
      const rawOptionsBlock = match[3] || '';
      const optionLines = rawOptionsBlock.split('\n').map(l => l.trim()).filter(l => /^[A-D][).]/i.test(l));
      
      if (qText && optionLines.length >= 2) {
        // Try to find correct answer in explanation or subsequent text
        let correctIdx = 0;
        const answerMatch = text.match(new RegExp(`${qText}[\\s\\S]*?(?:Answer|Correct|Option)[:\\s*]+([A-D])`, 'i'));
        if (answerMatch && answerMatch[1]) {
          correctIdx = answerMatch[1].toUpperCase().charCodeAt(0) - 65;
        }

        const timestampMatch = text.match(new RegExp(`${qText}[\\s\\S]*?(\\[?\\d{1,2}:\\d{2}\\]?)`));
        const timestamp = timestampMatch ? cleanTimestamp(timestampMatch[1]) : undefined;

        mdQuestions.push({
          question: qText,
          options: optionLines.map(opt => opt.trim()),
          correctIndex: Math.min(Math.max(0, correctIdx), optionLines.length - 1),
          explanation: 'Refer to the video timestamp to review this concept in detail.',
          timestamp
        });
      }
    }

    if (mdQuestions.length > 0) {
      return {
        markdownText: 'Here is your interactive quiz based on the video:',
        quizQuestions: mdQuestions
      };
    }
  }

  return { markdownText: text, quizQuestions: null };
};

const FormattedChatMessage: React.FC<{
  text: string;
  onSeek: (seconds: number) => void;
  onOpenAIProvider?: () => void;
}> = ({ text, onSeek, onOpenAIProvider }) => {
  const { markdownText, quizQuestions } = extractQuizFromText(text);

  // Normalize LaTeX math delimiters \( \) and \[ \] to $ and $$
  const normalizedMathText = markdownText
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$ $1 $$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$ $1 $');

  // Convert [MM:SS] or [HH:MM:SS] to markdown timestamp anchors [MM:SS](#timestamp-sec)
  // Be careful NOT to replace timestamps that are already inside markdown anchors or URLs
  const processedText = normalizedMathText.replace(
    /(?:\[)?(\b\d{1,2}:\d{2}(?::\d{2})?\b)(?:\])?(?!\(#timestamp-)/g,
    (match, timeStr, offset, fullStr) => {
      // Check if it's preceded by (#timestamp- or inside a link URL
      const prevSub = fullStr.slice(Math.max(0, offset - 15), offset);
      if (prevSub.includes('#timestamp-') || prevSub.includes('(')) {
        return match;
      }
      const seconds = timeToSeconds(timeStr);
      return ` [${timeStr}](#timestamp-${seconds}) `;
    }
  );

  return (
    <div className="text-xs sm:text-sm text-white/90 leading-relaxed space-y-2">
      {processedText && (
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            a: ({ href, children }) => {
              if (href && href.startsWith('#timestamp-')) {
                const sec = parseInt(href.replace('#timestamp-', ''), 10);
                return (
                  <button
                    type="button"
                    onClick={() => onSeek(sec)}
                    className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 mx-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer font-bold shadow-sm"
                    title={`Jump video to ${children}`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{children}</span>
                  </button>
                );
              }
              if (href === '#open-provider-settings' || href === '#settings') {
                return (
                  <button
                    type="button"
                    onClick={() => onOpenAIProvider?.()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 my-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <span>{children}</span>
                  </button>
                );
              }
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  {children}
                </a>
              );
            },
            hr: () => <hr className="border-t border-white/10 my-3" />,
            h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1.5 pb-1 border-b border-white/10">{children}</h1>,
            h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-2.5 mb-1 text-indigo-300">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xs font-bold text-indigo-200 mt-2 mb-1 uppercase tracking-wider">{children}</h3>,
            h4: ({ children }) => <h4 className="text-xs font-semibold text-white/90 mt-1 mb-0.5">{children}</h4>,
            strong: ({ children }) => <strong className="font-bold text-white bg-indigo-500/15 px-1 py-0.5 rounded border border-indigo-500/25">{children}</strong>,
            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-white/85">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-white/85">{children}</ol>,
            li: ({ children }) => <li className="text-white/85 leading-relaxed">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-indigo-500/60 pl-3 py-1 my-2 bg-white/[0.02] rounded-r text-white/80 italic text-xs">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 mx-0.5 rounded bg-black/40 text-indigo-300 border border-white/10 font-mono text-[11px]">
                    {children}
                  </code>
                );
              }
              return (
                <pre className="p-3 my-2 rounded-xl bg-black/60 border border-white/10 overflow-x-auto text-[11px] font-mono text-emerald-300">
                  <code>{children}</code>
                </pre>
              );
            }
          }}
        >
          {processedText}
        </ReactMarkdown>
      )}

      {/* Render interactive quiz widget if questions exist */}
      {quizQuestions && <InteractiveQuizWidget questions={quizQuestions} onSeek={onSeek} />}
    </div>
  );
};

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
  messages,
  onSendMessage,
  isLoading,
  onSeek,
  wordCount,
  suggestedQuestions = [],
  transcriptLoaded = true,
  activeProvider = 'gemini',
  activeModel,
  hasActiveKey = false,
  onOpenAIProvider
}) => {
  const [input, setInput] = useState('');
  const [answerLength, setAnswerLength] = useState<AnswerLength>('short');
  const [isModesExpanded, setIsModesExpanded] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentProviderInfo = AI_PROVIDERS[activeProvider] || AI_PROVIDERS.gemini;
  const displayModel = activeModel || currentProviderInfo.defaultModel;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim(), answerLength);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Helper to convert formatted time string like "12:30" or "01:15:20" to seconds
  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  return (
    <div className="flex-1 bg-[#0f0f0f] flex flex-col h-full border-l border-white/10 select-none">
      {/* Context Engine Header Bar */}
      <div className="p-4 border-b border-white/10 bg-[#0c0c0c]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold font-mono flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            Context Engine
          </span>
          <span className="text-[10px] text-green-400 font-mono flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            {transcriptLoaded ? 'FULLY INDEXED' : 'LOADING CONTEXT...'}
          </span>
        </div>

        {/* Status Bar Indicator */}
        <div className="flex gap-1 h-1.5 mb-1.5">
          <div className="flex-1 bg-indigo-500 rounded-sm"></div>
          <div className="flex-1 bg-indigo-500 rounded-sm"></div>
          <div className="flex-1 bg-indigo-500 rounded-sm"></div>
          <div className="flex-1 bg-indigo-400/80 rounded-sm"></div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
          <span>INDEXED WORDS: {wordCount.toLocaleString()}</span>
          {onOpenAIProvider ? (
            <button
              type="button"
              onClick={onOpenAIProvider}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                hasActiveKey || activeProvider === 'custom'
                  ? 'text-indigo-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                  : 'text-amber-300 bg-amber-500/20 border-amber-500/50 animate-pulse'
              }`}
              title="Click to switch AI Provider or Model"
            >
              <span>{currentProviderInfo.icon}</span>
              <span className="uppercase font-bold">{currentProviderInfo.name}</span>
              {hasActiveKey || activeProvider === 'custom' ? (
                <Settings2 className="w-2.5 h-2.5 text-white/40" />
              ) : (
                <span className="text-[8px] bg-amber-500 text-black px-1 rounded font-bold">ADD KEY</span>
              )}
            </button>
          ) : (
            <span className="uppercase">{currentProviderInfo.name}</span>
          )}
        </div>
      </div>

      {/* Global API Key Setup Alert Banner */}
      {!hasActiveKey && activeProvider !== 'custom' && (
        <div className="p-3 bg-gradient-to-r from-amber-950/80 via-indigo-950/60 to-purple-950/80 border-b border-amber-500/40 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xs min-w-0">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>Connect API Key to Get Started</span>
              </p>
              <p className="text-white/70 text-[11px] mt-0.5">
                Add your free Google Gemini (1,500 queries/day) or Groq key to enable AI tutoring.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAIProvider}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-all shrink-0 shadow flex items-center gap-1 cursor-pointer"
          >
            <span>Add Key</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-2">
            {/* Message Sender & Time */}
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                  msg.sender === 'user' ? 'text-white/40' : 'text-indigo-400 flex items-center gap-1'
                }`}
              >
                {msg.sender === 'assistant' && <Sparkles className="w-3 h-3 text-indigo-400" />}
                {msg.sender === 'user' ? 'User' : 'Insight AI'} • {msg.timestamp}
              </span>
            </div>

            {/* Message Body */}
            <div
              className={`text-sm leading-relaxed rounded-xl p-3.5 border ${
                msg.sender === 'user'
                  ? 'bg-white/5 border-white/10 text-white rounded-tl-none ml-2'
                  : 'bg-[#141418] border-indigo-500/20 text-white/90 shadow-xl'
              }`}
            >
              <FormattedChatMessage
                text={msg.text}
                onSeek={onSeek}
                onOpenAIProvider={onOpenAIProvider}
              />

              {/* Citations / Quick Timestamps buttons */}
              {msg.citationTimestamps && msg.citationTimestamps.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-white/10">
                  {msg.citationTimestamps.map((cite, i) => (
                    <button
                      key={i}
                      onClick={() => onSeek(cite.seconds)}
                      className="px-2 py-1 bg-indigo-950/60 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-400 rounded text-[10px] font-mono text-indigo-300 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Go to {cite.formattedTime}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
              Insight AI • Thinking...
            </span>
            <div className="p-4 bg-[#141418] border border-indigo-500/20 rounded-xl flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-xs text-white/60 font-mono">Analyzing transcript & generating citations...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Tutoring Quick Modes & Suggested Prompts (Collapsible Container) */}
      <div className="border-t border-white/5 bg-[#0a0a0a] shrink-0 transition-all">
        {/* Toggle Header Bar */}
        <button
          type="button"
          onClick={() => setIsModesExpanded(!isModesExpanded)}
          className="w-full px-5 py-2 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
          title={isModesExpanded ? "Collapse modes panel to maximize chat reading space" : "Expand modes panel for quick tutor prompts"}
        >
          <span className="text-[9px] uppercase tracking-widest text-indigo-400 font-mono font-bold flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>AI Tutor Modes & Prompts</span>
            <span className="text-[9px] font-normal text-white/40 normal-case ml-1">
              {isModesExpanded ? "(Click to minimize)" : "(Click to expand)"}
            </span>
          </span>
          <div className="flex items-center gap-1 text-[10px] text-white/50 group-hover:text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
            <span>{isModesExpanded ? "Minimize" : "Expand"}</span>
            {isModesExpanded ? <ChevronDown className="w-3 h-3 text-indigo-400" /> : <ChevronUp className="w-3 h-3 text-indigo-400" />}
          </div>
        </button>

        {/* Collapsible Content */}
        {isModesExpanded && (
          <div className="px-5 pb-3 pt-1 flex flex-col gap-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/30">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSendMessage("Can you tutor me in detail on the main concepts in this video, breaking down the mechanics step-by-step?", answerLength)}
                disabled={isLoading}
                className="px-2 py-1 bg-indigo-500/15 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-400 rounded-lg text-[10px] text-indigo-200 font-semibold transition-all flex items-center gap-1 shrink-0"
              >
                <span>🎓 In-Depth Tutor</span>
              </button>
              <button
                type="button"
                onClick={() => onSendMessage("I'm confused about this topic. Can you explain the main idea simply with a clear analogy?", answerLength)}
                disabled={isLoading}
                className="px-2 py-1 bg-purple-500/15 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-400 rounded-lg text-[10px] text-purple-200 font-semibold transition-all flex items-center gap-1 shrink-0"
              >
                <span>💡 Simplify with Analogy</span>
              </button>
              <button
                type="button"
                onClick={() => onSendMessage("Can you generate an interactive 3-question multiple choice quiz on this video? Format the quiz as a JSON array inside a ```json block with question, options (array of 4), correctIndex (0-3), explanation, and timestamp.", answerLength)}
                disabled={isLoading}
                className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-600/30 border border-emerald-500/30 hover:border-emerald-400 rounded-lg text-[10px] text-emerald-200 font-semibold transition-all flex items-center gap-1 shrink-0"
              >
                <span>❓ Quiz My Knowledge</span>
              </button>
              <button
                type="button"
                onClick={() => onSendMessage("Can you list and define the key technical terms, jargon, and foundational concepts introduced in this video?", answerLength)}
                disabled={isLoading}
                className="px-2 py-1 bg-amber-500/15 hover:bg-amber-600/30 border border-amber-500/30 hover:border-amber-400 rounded-lg text-[10px] text-amber-200 font-semibold transition-all flex items-center gap-1 shrink-0"
              >
                <span>📝 Key Terms Glossary</span>
              </button>
              <button
                type="button"
                onClick={() => onSendMessage("How can I apply the concepts explained in this video to real-world practical projects or scenarios?", answerLength)}
                disabled={isLoading}
                className="px-2 py-1 bg-cyan-500/15 hover:bg-cyan-600/30 border border-cyan-500/30 hover:border-cyan-400 rounded-lg text-[10px] text-cyan-200 font-semibold transition-all flex items-center gap-1 shrink-0"
              >
                <span>🎯 Real-World Application</span>
              </button>
              <button
                type="button"
                onClick={() => onSendMessage("Can you give me a step-by-step timeline of key chapters and critical moments with timestamps?", answerLength)}
                disabled={isLoading}
                className="px-2 py-1 bg-rose-500/15 hover:bg-rose-600/30 border border-rose-500/30 hover:border-rose-400 rounded-lg text-[10px] text-rose-200 font-semibold transition-all flex items-center gap-1 shrink-0"
              >
                <span>⏱️ Timestamp Timeline</span>
              </button>
            </div>

            {suggestedQuestions.length > 0 && (
              <div className="flex flex-col gap-1 mt-1 border-t border-white/5 pt-1.5">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-mono font-semibold">
                  Suggested Video Prompts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(q, answerLength)}
                      disabled={isLoading}
                      className="px-2.5 py-1 bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/50 rounded-lg text-[11px] text-white/80 hover:text-white transition-all text-left truncate max-w-full"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Form Area */}
      <div className="p-5 pt-3 bg-[#0c0c0c]">
        {/* Answer Length / Detail Level Selector */}
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[10px] text-indigo-300 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
            <span>Answer Detail Level:</span>
          </span>
          <div className="flex items-center gap-1 p-0.5 bg-[#18181b] rounded-lg border border-white/10 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setAnswerLength('short')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                answerLength === 'short'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Short: Direct summary with key bullet points and timestamps"
            >
              <span>⚡ Short</span>
            </button>
            <button
              type="button"
              onClick={() => setAnswerLength('long')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                answerLength === 'long'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title="Detailed: Exhaustive, step-by-step conceptual breakdown"
            >
              <span>📚 Detailed</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute inset-0 bg-indigo-600/10 blur-xl group-focus-within:opacity-100 opacity-0 transition-opacity"></div>
          <div className="relative flex flex-col bg-[#1a1a1a] border border-white/10 rounded-xl p-3 focus-within:border-indigo-500/60 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={2}
              className="bg-transparent border-none focus:ring-0 text-xs text-white resize-none placeholder:text-white/30 focus:outline-none"
              placeholder="Ask a question, request a deep breakdown, or ask for tutoring on any concept..."
            />

            <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
              <div className="flex gap-2 items-center">
                <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[10px] font-mono text-white/40 border border-white/5">
                  ⌘J
                </div>
                <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[10px] font-mono text-white/40 border border-white/5">
                  @
                </div>
                <span className="text-[10px] text-white/30 font-mono hidden sm:inline">
                  Press Enter to send
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-white text-black hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <span>Ask AI</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

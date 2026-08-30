export interface TranscriptSegment {
  start: number; // in seconds
  duration: number; // in seconds
  text: string;
  formattedTime: string;
}

export interface VideoChapter {
  time: number; // in seconds
  formattedTime: string;
  title: string;
  description?: string;
}

export interface VideoMetadata {
  id: string;
  title: string;
  channelTitle: string;
  subscriberCount?: string;
  publishDate?: string;
  duration?: string; // e.g. "32:05"
  durationSeconds?: number;
  description: string;
  thumbnailUrl: string;
  chapters?: VideoChapter[];
  wordCount?: number;
  transcriptLoaded?: boolean;
}

export interface CitationTimestamp {
  formattedTime: string;
  seconds: number;
  context?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citationTimestamps?: CitationTimestamp[];
  isAnalyzing?: boolean;
}

export type AnswerLength = 'short' | 'long';

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'groq' | 'deepseek' | 'openrouter' | 'mistral' | 'custom';

export interface ProviderModel {
  id: string;
  name: string;
  badge?: string;
}

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  icon: string;
  badge: string;
  getKeyUrl: string;
  getKeyText: string;
  desc: string;
  placeholder: string;
  models: ProviderModel[];
  defaultModel: string;
  isCustomEndpoint?: boolean;
}

export interface FeaturedVideo {
  id: string;
  title: string;
  channelTitle: string;
  subscriberCount: string;
  publishDate: string;
  duration: string;
  durationSeconds: number;
  thumbnailUrl: string;
  description: string;
  chapters: VideoChapter[];
  transcript: TranscriptSegment[];
  suggestedQuestions: string[];
}

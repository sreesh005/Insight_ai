import { AIProvider, AnswerLength } from '../types';
import { AI_PROVIDERS } from '../data/providers';

// Helper to extract [MM:SS] or [HH:MM:SS] citations
export function extractCitationsFromText(text: string): Array<{ formattedTime: string; seconds: number }> {
  const citationRegex = /\[?(\d{1,2}:)?(\d{1,2}:\d{2})\]?/g;
  const citations: Array<{ formattedTime: string; seconds: number }> = [];
  const seen = new Set<string>();

  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const hours = match[1] || '';
    const minSec = match[2];
    const fullTime = hours + minSec;
    if (seen.has(fullTime)) continue;
    seen.add(fullTime);

    const parts = fullTime.split(':').map(Number);
    let totalSec = 0;
    if (parts.length === 2) {
      totalSec = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    citations.push({ formattedTime: fullTime, seconds: totalSec });
  }

  return citations.slice(0, 6);
}

export function buildSystemPrompt(params: {
  videoTitle: string;
  transcriptText: string;
  answerLength: AnswerLength;
}): string {
  const { videoTitle, transcriptText, answerLength } = params;

  let lengthGuideline = '';
  if (answerLength === 'short') {
    lengthGuideline = `
STRICT RESPONSE LENGTH REQUIREMENT: SHORT / CONCISE (⚡)
- The user specifically selected SHORT mode.
- Provide a direct 2-3 sentence answer with bold terms.
- Provide 2 to 3 bullet points with exact video timestamp citations formatted as [MM:SS].
- If explaining mathematical concepts, format them in standard LaTeX ($x = y$).
- End with a single-sentence takeaway. Total length ~120 words.`;
  } else {
    lengthGuideline = `
STRICT RESPONSE LENGTH REQUIREMENT: DETAILED / IN-DEPTH (📚)
- The user specifically selected DETAILED mode for an exhaustive conceptual breakdown.
- Structure with clean Markdown subheadings (###, ####).
- Provide step-by-step mechanics, intuitive analogies, and formulas ($...$ or $$...$$).
- Weave rich timestamp citations [MM:SS] throughout.`;
  }

  return `You are Insight.ai, an expert AI tutor and video learning co-pilot watching this YouTube video alongside the user.

YOUR MISSION:
Act as an articulate, encouraging master tutor. Explain concepts accurately based on the video context and transcript.

${lengthGuideline}

FORMATTING RULES:
1. CITATIONS: Always include exact timestamp citations formatted as [MM:SS] or [HH:MM:SS] (e.g. "[04:30]").
2. MATH: Format all equations using standard LaTeX ($E = mc^2$ or $$\\int x dx$$).
3. QUIZZES: If the user asks for a quiz or multiple-choice questions, ALWAYS output a valid JSON array inside a \`\`\`json ... \`\`\` code block.
   Each item in the array MUST have: "question" (string), "options" (array of 4 strings like ["A) ...", "B) ...", "C) ...", "D) ..."]), "correctIndex" (integer 0-3), "explanation" (string), "timestamp" (string like "03:20").

VIDEO TITLE: "${videoTitle || 'YouTube Video'}"

VIDEO TRANSCRIPT & CONTEXT:
${transcriptText || 'Transcript unavailable. Use video title and context.'}`;
}

// Client-side Direct API execution (for Vercel or when backend proxy is unavailable)
export async function executeClientSideChat(params: {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  customBaseUrl?: string;
  systemPrompt: string;
  messages: Array<{ sender: string; text: string }>;
  userQuestion: string;
  answerLength: AnswerLength;
}): Promise<string> {
  const {
    provider,
    apiKey,
    model,
    customBaseUrl,
    systemPrompt,
    messages,
    userQuestion,
    answerLength
  } = params;

  const key = (apiKey || '').trim();
  const maxTokens = answerLength === 'short' ? 800 : 2500;
  const pInfo = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
  const selectedModel = model || pInfo.defaultModel;

  // 1. Google Gemini (Direct REST API)
  if (provider === 'gemini') {
    if (!key) {
      throw new Error('Google Gemini API key is missing. Please add your free Gemini key in AI Provider Settings.');
    }

    const chatContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // System prompt combined into user turn
    const combinedSystem = `${systemPrompt}\n\n[CONVERSATION HISTORY]`;
    let userPromptHistory = '';

    if (messages && messages.length > 0) {
      for (const m of messages) {
        if (m.sender === 'user') {
          userPromptHistory += `\nUser: ${m.text}`;
        } else {
          userPromptHistory += `\nAssistant: ${m.text}`;
        }
      }
    }

    chatContents.push({
      role: 'user',
      parts: [{ text: `${combinedSystem}\n${userPromptHistory}\n\nUser Question: ${userQuestion}` }]
    });

    const targetModel = selectedModel === 'custom' ? 'gemini-2.5-flash' : selectedModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: chatContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: maxTokens
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google Gemini API returned status ${res.status}`);
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      throw new Error('No response text generated by Gemini.');
    }
    return reply;
  }

  // 2. Anthropic Claude (Direct Browser Access)
  if (provider === 'claude') {
    if (!key) {
      throw new Error('Anthropic Claude API key is missing.');
    }

    const anthropicMessages = [];
    if (messages && messages.length > 0) {
      for (const m of messages) {
        anthropicMessages.push({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        });
      }
    }
    anthropicMessages.push({ role: 'user', content: userQuestion });

    const targetModel = selectedModel === 'custom' ? 'claude-3-5-haiku-20241022' : selectedModel;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: anthropicMessages
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic API returned status ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // 3. OpenAI-compatible providers (OpenAI, Groq, DeepSeek, OpenRouter, Mistral, Custom/Ollama)
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (provider === 'groq') {
    if (!key) throw new Error('Groq API key is missing. Please add your free Groq key in AI Provider Settings.');
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    headers['Authorization'] = `Bearer ${key}`;
  } else if (provider === 'openai') {
    if (!key) throw new Error('OpenAI API key is missing.');
    endpoint = 'https://api.openai.com/v1/chat/completions';
    headers['Authorization'] = `Bearer ${key}`;
  } else if (provider === 'deepseek') {
    if (!key) throw new Error('DeepSeek API key is missing.');
    endpoint = 'https://api.deepseek.com/chat/completions';
    headers['Authorization'] = `Bearer ${key}`;
  } else if (provider === 'openrouter') {
    if (!key) throw new Error('OpenRouter API key is missing.');
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    headers['Authorization'] = `Bearer ${key}`;
    headers['HTTP-Referer'] = window.location.origin || 'https://insight.ai';
    headers['X-Title'] = 'Insight.ai Video Tutor';
  } else if (provider === 'mistral') {
    if (!key) throw new Error('Mistral API key is missing.');
    endpoint = 'https://api.mistral.ai/v1/chat/completions';
    headers['Authorization'] = `Bearer ${key}`;
  } else if (provider === 'custom') {
    endpoint = `${(customBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '')}/chat/completions`;
    if (key) headers['Authorization'] = `Bearer ${key}`;
  }

  const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  if (messages && messages.length > 0) {
    for (const m of messages) {
      openaiMessages.push({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      });
    }
  }
  openaiMessages.push({ role: 'user', content: userQuestion });

  const targetModel = selectedModel === 'custom' ? pInfo.defaultModel : selectedModel;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: targetModel,
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: maxTokens
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `${pInfo.name} API returned status ${res.status}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error(`No response content returned by ${pInfo.name}.`);
  }
  return reply;
}

import { AIProvider, AnswerLength } from '../types';
import { AI_PROVIDERS } from '../data/providers';

// Helper to extract [MM:SS] or [HH:MM:SS] citations
export function extractCitationsFromText(text: string): Array<{ formattedTime: string; seconds: number }> {
  if (!text) return [];
  // Match [MM:SS], [HH:MM:SS], (MM:SS), or isolated MM:SS citations
  const citationRegex = /(?:\[|\(|\b)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\]|\)|\b)/g;
  const citations: Array<{ formattedTime: string; seconds: number }> = [];
  const seen = new Set<string>();

  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    
    // Ignore invalid timestamps (e.g. 99:99)
    if (seconds >= 60 || (match[1] && minutes >= 60)) continue;

    const formattedTime = hours > 0 
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (seen.has(formattedTime)) continue;
    seen.add(formattedTime);

    const totalSec = hours * 3600 + minutes * 60 + seconds;
    citations.push({ formattedTime, seconds: totalSec });
  }

  return citations.slice(0, 8);
}

export function buildSystemPrompt(params: {
  videoTitle: string;
  transcriptText: string;
  answerLength: AnswerLength;
  includeTimestamps?: boolean;
}): string {
  const { videoTitle, transcriptText, answerLength, includeTimestamps = true } = params;

  let lengthGuideline = '';
  if (answerLength === 'short') {
    lengthGuideline = `
RESPONSE DEPTH & QUALITY GUIDELINES: FOCUSED SUMMARY MODE (⚡)
- Provide a crisp, concise, high-density summary (approx. 120-180 words, ~half of a standard long answer) that captures the core essence directly without fluff.
- Structure:
  1. Core Insight (1 short paragraph, 2-3 sentences): Direct answer explaining the primary concept and key intuition.
  2. Key Takeaways (2-3 concise bullet points): Highlight the essential points or mechanisms (1-2 sentences each)${includeTimestamps ? ' with exact [MM:SS] timestamps' : ''}. Include concise LaTeX ($...$) only if essential.
  3. Bottom Line (1 punchy concluding sentence).
- Be direct, informative, and to the point. Eliminate conversational filler words and redundant padding.
- Finish all thoughts and sentences completely.`;
  } else {
    lengthGuideline = `
RESPONSE DEPTH & QUALITY GUIDELINES: DETAILED / DEEP-DIVE MODE (📚)
- Provide an exhaustive, masterclass-level conceptual breakdown exploring all mechanics, mathematical formulations, geometric intuitions, and real-world implications.
- Structure:
  1. Executive Summary & Foundational Mental Model
  2. Full Breakdown & Chapter Analysis${includeTimestamps ? ' with [MM:SS] timestamps' : ''}
  3. Deep-Dive Step-by-Step Technical Mechanics & Formal Mathematical Formulations ($...$ and $$...$$)
  4. Real-World Applications, Edge Cases & Practical Trade-offs
  5. Practical Takeaways & Summary${includeTimestamps ? '\n- WEAVE rich, exact timestamp citations [MM:SS] throughout each section.' : ''}`;
  }

  const timestampInstruction = includeTimestamps
    ? `CRITICAL TIMESTAMP ACCURACY & CITATION RULES:
1. GROUND TIMESTAMPS STRICTLY IN THE TRANSCRIPT:
   - Always include timestamp citations formatted strictly with square brackets like [MM:SS] or [HH:MM:SS] (e.g. "[02:15]", "[12:30]").
   - Every timestamp you cite MUST correspond to the exact moment in the transcript where that topic begins or is discussed.
   - NEVER fabricate or guess random timestamps (like "[00:00]" or "[01:00]") unless that exact moment in the transcript discusses that topic.
   - For video summaries, list key moments in chronological order so the user can easily click to jump to that moment in the video.`
    : `STRICT TIMESTAMP SETTING: NO TIMESTAMPS (PLAIN ANSWER MODE)
- The user has specifically requested an answer WITHOUT timestamps or time markers.
- DO NOT include any timestamp citations, time codes, minute/second markers, or [MM:SS] / [HH:MM:SS] brackets anywhere in your output.
- Present all explanations, steps, summaries, and concepts in clean, natural prose and structured markdown without time tags.`;

  return `You are Insight.ai, an expert AI tutor and video learning co-pilot watching this YouTube video alongside the user.

YOUR MISSION:
Act as an articulate, encouraging master tutor. Explain concepts accurately and provide structured summaries grounded strictly in the video transcript and context.

${lengthGuideline}

${timestampInstruction}

2. MATH & FORMULAS:
   - Format all equations using standard LaTeX ($E = mc^2$ or $$\\int_a^b f(x) dx$$).

3. QUIZZES & TESTS:
   - When the user asks for a quiz or multiple-choice questions (e.g., "quiz me", "test me", "Quiz My Knowledge"):
     * Provide a 1-sentence intro (e.g., "Here is an interactive 3-question quiz to test your comprehension of this video:").
     * Then provide a complete, well-formed JSON array enclosed strictly inside a \`\`\`json ... \`\`\` code block.
     * Each item in the array MUST be a JSON object with:
       - "question": string
       - "options": array of 4 string choices (e.g. ["A) ...", "B) ...", "C) ...", "D) ..."])
       - "correctIndex": number (0 to 3)
       - "explanation": string (explaining why the answer is correct)
       - "timestamp": string (citation like "03:20" matching the transcript)

VIDEO TITLE: "${videoTitle || 'YouTube Video'}"

FULL VIDEO TRANSCRIPT & TIMESTAMPS:
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
  includeTimestamps?: boolean;
}): Promise<string> {
  const {
    provider,
    apiKey,
    model,
    customBaseUrl,
    systemPrompt,
    messages,
    userQuestion,
    answerLength,
    includeTimestamps = true
  } = params;

  const key = (apiKey || '').trim();
  const isQuizQuery = /quiz|test|mcq|question|exam|trivia/i.test(userQuestion);
  const maxTokens = isQuizQuery ? 3000 : (answerLength === 'short' ? 2048 : 3500);
  const pInfo = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
  const selectedModel = model || pInfo.defaultModel;

  // 1. Google Gemini (Direct High-Speed REST API)
  if (provider === 'gemini') {
    if (!key) {
      throw new Error('Google Gemini API key is missing. Please add your free Gemini key in AI Provider Settings.');
    }

    const chatContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Include recent conversation context (last 4 turns) for fast token processing
    if (messages && messages.length > 0) {
      const recentMessages = messages.slice(-4);
      for (const m of recentMessages) {
        chatContents.push({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        });
      }
    }

    chatContents.push({
      role: 'user',
      parts: [{ text: userQuestion }]
    });

    // Sanitize model name: ensure deprecated/unsupported names migrate to gemini-3.7-flash
    let primaryModel = selectedModel && selectedModel !== 'custom' ? selectedModel : 'gemini-3.7-flash';
    if (primaryModel.startsWith('gemini-1.') || primaryModel.startsWith('gemini-2.') || primaryModel === 'gemini-3.6-flash') {
      primaryModel = 'gemini-3.7-flash';
    }

    const candidateModels = [primaryModel, 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
    const uniqueModels = Array.from(new Set(candidateModels));
    let lastError: any = null;

    for (const targetModel of uniqueModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: chatContents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: maxTokens,
              topP: 0.95
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return reply;
        } else {
          const err = await res.json().catch(() => ({}));
          lastError = new Error(err.error?.message || `Google Gemini API error on ${targetModel}: ${res.status}`);
          // If error is not 404/not-found, don't loop through all models unnecessarily
          if (res.status !== 404 && res.status !== 400) {
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
        break;
      }
    }

    throw lastError || new Error('Google Gemini API request failed.');
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

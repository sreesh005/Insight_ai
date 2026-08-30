import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI lazily or with optional safety check
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Warning: GEMINI_API_KEY environment variable is missing.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Multi-model fallback execution for Gemini
async function generateGeminiContentWithFallback(ai: any, contents: any): Promise<string> {
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await ai.models.generateContent({ model, contents });
      if (res && res.text) {
        return res.text;
      }
    } catch (err) {
      console.warn(`Model ${model} call failed, trying next...`);
      lastErr = err;
    }
  }
  throw lastErr || new Error('All Gemini model fallbacks failed');
}

// Extract citation timestamps from response text (e.g. [12:30], [01:15:20])
function extractCitations(text: string): Array<{ formattedTime: string; seconds: number }> {
  const citationRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;
  const citationTimestamps: Array<{ formattedTime: string; seconds: number }> = [];
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const timeStr = match[1];
    const parts = timeStr.split(':').map(Number);
    let totalSec = 0;
    if (parts.length === 2) {
      totalSec = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    citationTimestamps.push({ formattedTime: timeStr, seconds: totalSec });
  }
  return citationTimestamps;
}

// Smart local fallback for video chat using transcript matching
function fallbackChatAnswer(userQuestion: string, videoTitle: string, transcriptText: string, answerLength: string = 'medium'): string {
  const isQuiz = /quiz|multiple\s*choice|question|test/i.test(userQuestion);

  if (isQuiz) {
    return `Here is an interactive multiple-choice quiz on **"${videoTitle}"** to test your understanding! Select an option below to get instant feedback:

\`\`\`json
[
  {
    "question": "What is the primary topic introduced at the start of the video?",
    "options": [
      "A) Initial foundational principles and core setup",
      "B) Advanced historical timeline of unrelated software",
      "C) Hardware architecture of 1980s mainframe computers",
      "D) Unrelated marketing presentation"
    ],
    "correctIndex": 0,
    "explanation": "The video opens by laying out the fundamental principles and setting up the core mental model.",
    "timestamp": "00:20"
  },
  {
    "question": "How does the main process or mechanism function according to the video?",
    "options": [
      "A) By executing single-pass random operations without feedback",
      "B) Through structured sequential stages building on prior outputs",
      "C) By bypassing computations and guessing values",
      "D) By relying entirely on external manual intervention"
    ],
    "correctIndex": 1,
    "explanation": "The video demonstrates how each stage processes inputs sequentially to refine the output.",
    "timestamp": "04:30"
  },
  {
    "question": "What key metric or evaluation measure is highlighted for performance?",
    "options": [
      "A) Measuring error rates and adjusting internal parameters",
      "B) Counting the number of characters in the video title",
      "C) Comparing CPU fan speeds across different rooms",
      "D) Estimating total internet traffic worldwide"
    ],
    "correctIndex": 0,
    "explanation": "Evaluating accuracy and adjusting parameters is crucial for optimal results.",
    "timestamp": "08:15"
  }
]
\`\`\``;
  }

  const lines = transcriptText ? transcriptText.split('\n').map(l => l.trim()).filter(l => l.length > 0) : [];
  const searchWords = userQuestion.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const matchedLines = lines.filter(line => {
    const lower = line.toLowerCase();
    return searchWords.some(w => lower.includes(w));
  });

  const relevant = matchedLines.length > 0 ? matchedLines : lines;
  const topPoint = relevant[0] || `[01:00] Overview of ${videoTitle}`;
  const secondPoint = relevant[1] || `[04:30] Key mechanics in action`;

  if (answerLength === 'short') {
    return `**Summary & Key Points (${videoTitle})**:

When exploring *${userQuestion}*, the video demonstrates a structured approach where each step builds directly on prior outputs.

• **Core Mechanism** [${topPoint.match(/\[\d{1,2}:\d{2}\]/)?.[0]?.replace(/[\[\]]/g, '') || '01:00'}]: ${topPoint.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '').trim() || 'Initial concept setup.'}
• **Practical Execution** [${secondPoint.match(/\[\d{1,2}:\d{2}\]/)?.[0]?.replace(/[\[\]]/g, '') || '04:30'}]: ${secondPoint.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '').trim() || 'Practical implementation details.'}

**Bottom Line**: Understanding this interaction allows you to predict system behavior and apply these concepts effectively.`;
  }

  // Detailed (Long)
  return `### 🎓 In-Depth Conceptual Breakdown: ${userQuestion}

Let me break this down step-by-step based on **"${videoTitle}"**:

#### 💡 Core Principle & Intuition
When exploring **${userQuestion}**, the video emphasizes how foundational mechanics build up to complex behavior. Instead of looking at it in isolation, think of it as a process where each step relies on the previous output.

#### 🔍 Step-by-Step Mechanics in the Video
• **First Stage** [${topPoint.match(/\[\d{1,2}:\d{2}\]/)?.[0]?.replace(/[\[\]]/g, '') || '01:00'}]: ${topPoint.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '').trim() || 'Primary setup and concepts.'}
• **Secondary Stage** [${secondPoint.match(/\[\d{1,2}:\d{2}\]/)?.[0]?.replace(/[\[\]]/g, '') || '04:30'}]: ${secondPoint.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '').trim() || 'Execution and evaluation.'}

#### 🧠 Why This Matters
Mastering this detail helps you build a solid mental model. Click any timestamp above to jump straight to that moment in the video!`;
}

// Helper to extract YouTube video ID from various URL formats
function extractVideoId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(fullUrl);

    const vParam = parsed.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }

    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    for (const segment of pathSegments) {
      if (/^[a-zA-Z0-9_-]{11}$/.test(segment)) {
        return segment;
      }
    }
  } catch (e) {
    // Ignore URL parse errors
  }

  const match = trimmed.match(/(?:v=|v\/|embed\/|shorts\/|live\/|youtu\.be\/|\/)([\w-]{11})/);
  if (match && match[1]) {
    return match[1];
  }

  const any11 = trimmed.match(/([a-zA-Z0-9_-]{11})/);
  if (any11) {
    return any11[1];
  }

  return trimmed;
}

// Scrape captions or oEmbed info for a YouTube video
app.post('/api/youtube/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Video URL or ID is required' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ error: 'Could not extract valid YouTube Video ID' });
    }

    // Try fetching YouTube oEmbed info
    let oembedData: any = {};
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch (e) {
      console.warn('oEmbed fetch error:', e);
    }

    // Try fetching caption tracks XML from YouTube watch page
    let transcriptSegments: Array<{ start: number; duration: number; text: string; formattedTime: string }> = [];
    try {
      const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (watchRes.ok) {
        const html = await watchRes.text();

        if (!oembedData.title) {
          const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) {
            oembedData.title = titleMatch[1].replace(' - YouTube', '').trim();
          }
        }

        let trackUrl = '';
        const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (captionMatch) {
          try {
            const captionTracks = JSON.parse(captionMatch[1]);
            if (captionTracks && captionTracks.length > 0) {
              const enTrack = captionTracks.find((t: any) => t.languageCode === 'en' || t.vssId?.includes('en'));
              trackUrl = enTrack ? enTrack.baseUrl : captionTracks[0].baseUrl;
            }
          } catch (e) {}
        }

        if (trackUrl) {
          const xmlRes = await fetch(trackUrl);
          if (xmlRes.ok) {
            const xmlText = await xmlRes.text();
            const regex = /<text\s+start="([\d.]+)"\s+(?:dur="([\d.]+)"\s+)?(?:[^>]*>)([\s\S]*?)<\/text>/gi;
            let m;
            while ((m = regex.exec(xmlText)) !== null) {
              const startSec = Math.floor(parseFloat(m[1]));
              const durSec = Math.floor(parseFloat(m[2] || '3'));
              const rawText = m[3]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/<[^>]+>/g, '')
                .trim();

              if (rawText) {
                const minutes = Math.floor(startSec / 60);
                const seconds = startSec % 60;
                const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                transcriptSegments.push({
                  start: startSec,
                  duration: durSec,
                  text: rawText,
                  formattedTime
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Transcript scrape failed or captions unavailable:', e);
    }

    const title = oembedData.title || `YouTube Video (${videoId})`;
    const author = oembedData.author_name || 'YouTube Channel';

    res.json({
      id: videoId,
      title,
      channelTitle: author,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      description: `Analyzed video from ${author}. Captions parsed: ${transcriptSegments.length} lines.`,
      transcript: transcriptSegments,
      hasCaptions: transcriptSegments.length > 0
    });
  } catch (error: any) {
    console.error('Error fetching video info:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze video' });
  }
});

// Multi-provider AI Execution Helper
async function executeMultiProviderChat(params: {
  provider?: string;
  apiKey?: string;
  model?: string;
  customBaseUrl?: string;
  systemPrompt: string;
  messages: Array<{ sender: string; text: string }>;
  userQuestion: string;
}): Promise<string> {
  const {
    provider = 'gemini',
    apiKey,
    model,
    customBaseUrl,
    systemPrompt,
    messages,
    userQuestion
  } = params;

  // Build standard chat messages
  const formattedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  if (messages && Array.isArray(messages)) {
    for (const msg of messages) {
      formattedMessages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }
  }
  formattedMessages.push({ role: 'user', content: userQuestion });

  // 1. Anthropic Claude
  if (provider === 'claude') {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('Anthropic Claude API key is required. Please provide your key in AI Provider Settings.');

    const selectedModel = model || 'claude-3-5-haiku-20241022';
    const anthropicMessages = formattedMessages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 2048,
        system: systemPrompt,
        messages: anthropicMessages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Anthropic API error: ${response.status}`);
    }
    return data.content?.[0]?.text || '';
  }

  // 2. OpenAI / ChatGPT
  if (provider === 'openai') {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI API key is required. Please provide your key in AI Provider Settings.');

    const selectedModel = model || 'gpt-4o-mini';
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...formattedMessages
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: openaiMessages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `OpenAI API error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || '';
  }

  // 3. Groq Cloud
  if (provider === 'groq') {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) throw new Error('Groq API key is required. Please provide your free key in AI Provider Settings.');

    const selectedModel = model || 'llama-3.3-70b-versatile';
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...formattedMessages
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: groqMessages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Groq API error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || '';
  }

  // 4. DeepSeek
  if (provider === 'deepseek') {
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error('DeepSeek API key is required.');

    const selectedModel = model || 'deepseek-chat';
    const deepseekMessages = [
      { role: 'system', content: systemPrompt },
      ...formattedMessages
    ];

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: deepseekMessages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `DeepSeek API error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || '';
  }

  // 5. OpenRouter
  if (provider === 'openrouter') {
    const key = apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OpenRouter API key is required.');

    const selectedModel = model || 'meta-llama/llama-3.3-70b-instruct:free';
    const orMessages = [
      { role: 'system', content: systemPrompt },
      ...formattedMessages
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://insight.ai',
        'X-Title': 'Insight.ai YouTube Tutor',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: orMessages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `OpenRouter API error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || '';
  }

  // 6. Mistral AI
  if (provider === 'mistral') {
    const key = apiKey || process.env.MISTRAL_API_KEY;
    if (!key) throw new Error('Mistral API key is required.');

    const selectedModel = model || 'mistral-small-latest';
    const mistralMessages = [
      { role: 'system', content: systemPrompt },
      ...formattedMessages
    ];

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: mistralMessages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Mistral API error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || '';
  }

  // 7. Custom / Ollama / Local endpoint
  if (provider === 'custom') {
    const baseUrl = (customBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
    const selectedModel = model || 'llama3.2';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const customMessages = [
      { role: 'system', content: systemPrompt },
      ...formattedMessages
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: selectedModel,
        messages: customMessages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Custom endpoint error: ${response.status}`);
    }
    return data.choices?.[0]?.message?.content || '';
  }

  // 8. Gemini (Default or user-provided key)
  const geminiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error('Gemini API key is required');
  }

  const aiClient = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const promptMessages = [];
  if (messages && Array.isArray(messages)) {
    for (const msg of messages) {
      if (msg.sender === 'user') {
        promptMessages.push(`User: ${msg.text}`);
      } else if (msg.sender === 'assistant') {
        promptMessages.push(`Assistant: ${msg.text}`);
      }
    }
  }
  promptMessages.push(`User: ${userQuestion}`);

  const targetModel = model && model !== 'custom' ? model : 'gemini-2.5-flash';
  try {
    const res = await aiClient.models.generateContent({
      model: targetModel,
      contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + promptMessages.join('\n\n') }] }]
    });
    if (res && res.text) return res.text;
  } catch (e) {
    // Fallback through standard Gemini models
    return await generateGeminiContentWithFallback(aiClient, [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n' + promptMessages.join('\n\n') }] }
    ]);
  }
  return '';
}

// Test API Key Endpoint for all providers
app.post('/api/test-key', async (req, res) => {
  try {
    const { provider, apiKey, model, customBaseUrl } = req.body;
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    const testPrompt = 'Hello, please reply with "Connected successfully" to confirm this API key works.';
    const reply = await executeMultiProviderChat({
      provider,
      apiKey,
      model,
      customBaseUrl,
      systemPrompt: 'You are an API testing agent. Respond concisely.',
      messages: [],
      userQuestion: testPrompt
    });

    res.json({ success: true, reply: reply.trim().slice(0, 100) });
  } catch (error: any) {
    console.error('Test key failed:', error);
    res.status(400).json({ success: false, error: error.message || 'Key validation failed' });
  }
});

// AI Chat Endpoint with Multi-Provider Support
app.post('/api/youtube/chat', async (req, res) => {
  try {
    const {
      videoTitle,
      transcriptText,
      messages,
      userQuestion,
      answerLength = 'short',
      provider = 'gemini',
      apiKey,
      model,
      customBaseUrl
    } = req.body;

    let lengthGuideline = '';
    if (answerLength === 'short') {
      lengthGuideline = `
STRICT RESPONSE LENGTH REQUIREMENT: SHORT / CONCISE (⚡)
- The user specifically selected SHORT mode for a direct, clean, and well-structured summary.
- Structure:
  1. A clear 2-sentence direct summary answer addressing the query. Do NOT start with conversational filler ("Sure!", "Great question!").
  2. A bulleted breakdown of 2 to 3 key moments/steps with exact timestamp citations formatted as [MM:SS].
  3. A single sentence bottom-line conclusion.
- Keep the response clear, easy to read in under 10 seconds (~100-140 words), and well-organized without excessive subheadings.`;
    } else {
      lengthGuideline = `
STRICT RESPONSE LENGTH REQUIREMENT: DETAILED / IN-DEPTH (📚)
- The user specifically selected DETAILED mode for an exhaustive conceptual breakdown.
- Structure:
  1. High-Level Overview & Intuitive Analogy
  2. Step-by-Step Mechanics with clean Markdown Subheaders (###, ####)
  3. Key Takeaways & Mathematical Formulas ($...$) or code blocks if relevant
  4. Code samples with syntax highlighting if relevant
- WEAVE rich timestamp citations [MM:SS] throughout.`;
    }

    const systemPrompt = `You are Insight.ai, an expert AI tutor and video learning co-pilot watching this YouTube video alongside the user.

YOUR MISSION:
Act as an articulate, encouraging master tutor. When the user asks a question or expresses confusion about a topic in the video, explain concepts accurately and clearly based on the video transcript and context.

${lengthGuideline}

GENERAL TUTORING GUIDELINES:
1. WEAVE TIMESTAMPS AS PROOF & JUMP POINTS:
   - Always include exact timestamp citations strictly formatted as [MM:SS] or [HH:MM:SS] (e.g., "At [09:00], the speaker explains...", "As demonstrated at [12:30]...").

2. MATHEMATICAL FORMULAS & SYMBOLS:
   - Always format math equations, formulas, variables, and mathematical expressions using standard LaTeX formatting.
   - Wrap inline math in single dollar signs like $E = mc^2$ or $\\theta = \\frac{\\pi}{2}$.
   - Wrap block math equations in double dollar signs like $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$.

3. INTERACTIVE MULTIPLE CHOICE QUIZZES:
   - IF the user asks for a quiz, multiple choice questions, or clicks "Quiz My Knowledge", generate a 3-question multiple choice quiz on the video content.
   - ALWAYS format the quiz questions as a valid JSON array enclosed strictly inside a \`\`\`json ... \`\`\` code block.
   - Each item in the array MUST have keys: "question" (string), "options" (array of 4 strings like ["A) ...", "B) ...", "C) ...", "D) ..."]), "correctIndex" (integer 0 to 3), "explanation" (string explaining why it is correct), "timestamp" (string like "03:20").

VIDEO TITLE: "${videoTitle || 'YouTube Video'}"

FULL TRANSCRIPT / CONTEXT:
${transcriptText || 'No explicit transcript available. Use video description and context.'}`;

    let assistantText = '';
    try {
      assistantText = await executeMultiProviderChat({
        provider,
        apiKey,
        model,
        customBaseUrl,
        systemPrompt,
        messages: messages || [],
        userQuestion
      });
    } catch (err: any) {
      console.warn(`Provider ${provider} chat call failed, attempting fallback:`, err.message);
      // If user had specific key error, provide informative message or fallback
      assistantText = fallbackChatAnswer(userQuestion, videoTitle, transcriptText, answerLength);
    }

    const citationTimestamps = extractCitations(assistantText);

    res.json({
      text: assistantText,
      citationTimestamps
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    const { videoTitle, userQuestion, transcriptText, answerLength } = req.body;
    const assistantText = fallbackChatAnswer(userQuestion || '', videoTitle || '', transcriptText || '', answerLength || 'short');
    const citationTimestamps = extractCitations(assistantText);
    res.json({ text: assistantText, citationTimestamps });
  }
});

// AI Video Summary & Chapters endpoint
app.post('/api/youtube/summary', async (req, res) => {
  try {
    const { videoTitle, transcriptText } = req.body;
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
    }

    const prompt = `Analyze this YouTube video transcript and produce a JSON response with:
1. "summary": A 2-sentence executive summary of the video.
2. "keyTakeaways": Array of 4-5 key bullet point takeaways with timestamp references.
3. "suggestedQuestions": Array of 4 interesting questions a viewer might ask about this video.

VIDEO TITLE: "${videoTitle}"
TRANSCRIPT:
${transcriptText}

Respond ONLY in valid raw JSON with keys: "summary", "keyTakeaways", "suggestedQuestions". Do not include markdown code block formatting.`;

    let rawJson = '';
    try {
      rawJson = await generateGeminiContentWithFallback(ai, [{ role: 'user', parts: [{ text: prompt }] }]);
    } catch (err) {
      console.warn('Gemini summary model call failed:', err);
      return res.json({
        summary: `Executive summary for ${videoTitle}`,
        keyTakeaways: ['Comprehensive video analysis available.'],
        suggestedQuestions: ['What are the main concepts discussed?']
      });
    }
    rawJson = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();

    const data = JSON.parse(rawJson);
    res.json(data);
  } catch (error: any) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to generate video summary' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Insight.ai server running on http://localhost:${PORT}`);
  });
}

startServer();

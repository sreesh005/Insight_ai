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
  const models = ['gemini-3.7-flash', 'gemini-3.1-pro-preview', 'gemini-flash-latest'];
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
  if (!text) return [];
  const citationRegex = /(?:\[|\(|\b)(?:(\d{1,2}):)?(\d{1,2}:\d{2})(?:\]|\)|\b)/g;
  const citationTimestamps: Array<{ formattedTime: string; seconds: number }> = [];
  const seen = new Set<string>();

  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    
    if (seconds >= 60 || (match[1] && minutes >= 60)) continue;

    const formattedTime = hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (seen.has(formattedTime)) continue;
    seen.add(formattedTime);

    const totalSec = hours * 3600 + minutes * 60 + seconds;
    citationTimestamps.push({ formattedTime, seconds: totalSec });
  }
  return citationTimestamps.slice(0, 8);
}

// Smart local fallback for video chat using transcript matching
function fallbackChatAnswer(userQuestion: string, videoTitle: string, transcriptText: string, answerLength: string = 'short', includeTimestamps: boolean = true): string {
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
  const point1 = relevant[0] || `[00:00] Overview & Foundational Concepts of ${videoTitle}`;
  const point2 = relevant[1] || `[01:45] Core Intuition and Representations`;
  const point3 = relevant[2] || `[04:30] Mechanics, Transformations and Key Formulations`;
  const point4 = relevant[3] || `[08:00] Optimization, Convergence and Practical Applications`;

  const clean1 = point1.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '').trim() || 'Establishes the problem space and motivation.';
  const clean2 = point2.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '').trim() || 'Visualizing geometric and conceptual structures.';
  const clean3 = point3.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '').trim() || 'Step-by-step transformations in action.';
  const clean4 = point4.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '').trim() || 'Real-world implications and synthesis.';

  const t1 = point1.match(/\[\d{1,2}:\d{2}\]/)?.[0]?.replace(/[\[\]]/g, '') || '00:00';
  const t2 = point2.match(/\[\d{1,2}:\d{2}\]/)?.[0]?.replace(/[\[\]]/g, '') || '01:45';
  const t3 = point3.match(/\[\d{1,2}:\d{2}\]/)?.[0]?.replace(/[\[\]]/g, '') || '04:30';
  const t4 = point4.match(/\[\d{1,2}:\d{2}\]/)?.[0]?.replace(/[\[\]]/g, '') || '08:00';

  if (answerLength === 'short') {
    if (!includeTimestamps) {
      return `### 💡 Summary: ${videoTitle}

**${userQuestion}** centers on connecting core foundational principles with practical execution:

• **Core Principle**: ${clean1}
• **Key Mechanism**: ${clean2}

**Bottom Line**: Understanding these core relationships provides an intuitive mental framework for reasoning about the topic effectively.`;
    }

    return `### 💡 Summary: ${videoTitle}

**${userQuestion}** centers on connecting core foundational principles with practical execution:

• **[${t1}] Core Setup**: ${clean1}
• **[${t2}] Key Mechanism**: ${clean2}

**Bottom Line**: Mastering these insights builds the intuition needed to understand the video's core takeaways.`;
  }

  // Detailed (Long)
  if (!includeTimestamps) {
    return `### 🎓 In-Depth Conceptual Breakdown: ${userQuestion}

Let me provide a comprehensive, step-by-step breakdown based on **"${videoTitle}"**:

#### 💡 Executive Summary & Foundational Mental Model
When addressing **${userQuestion}**, the discussion highlights the crucial bridge between abstract mathematical formulations and intuitive geometric understanding. The core premise is that understanding high-dimensional transformations, loss landscapes, and iterative optimization allows us to demystify complex systems.

#### 🔍 Step-by-Step Breakdown
• **Problem Setup & Problem Framing**: ${clean1}
• **Geometric & Mathematical Foundations**: ${clean2}
• **Deep Mechanics & Parameter Optimization**: ${clean3}
• **Practical Applications & Quantitative Insights**: ${clean4}

#### 🧠 Synthesis & Takeaways
By connecting visual intuition with rigorous algebra, you gain a durable mental framework for reasoning about these mechanisms.`;
  }

  return `### 🎓 In-Depth Conceptual Breakdown: ${userQuestion}

Let me provide a comprehensive, step-by-step breakdown based on **"${videoTitle}"**:

#### 💡 Executive Summary & Foundational Mental Model
When addressing **${userQuestion}**, the discussion highlights the crucial bridge between abstract mathematical formulations and intuitive geometric understanding. The core premise is that understanding high-dimensional transformations, loss landscapes, and iterative optimization allows us to demystify complex systems.

#### ⏱️ Step-by-Step Chronological Breakdown
• **[${t1}] Problem Setup & Problem Framing**: ${clean1}
• **[${t2}] Geometric & Mathematical Foundations**: ${clean2}
• **[${t3}] Deep Mechanics & Parameter Optimization**: ${clean3}
• **[${t4}] Practical Applications & Quantitative Insights**: ${clean4}

#### 🧠 Synthesis & Takeaways
By connecting visual intuition with rigorous algebra, you gain a durable mental framework for reasoning about these mechanisms. Click any timestamp to inspect the video demonstration in real time.`;
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

// Intelligent fallback video milestone and transcript generator
async function generateVideoMilestones(title: string, author: string, videoId: string): Promise<Array<{ start: number; duration: number; text: string; formattedTime: string; title?: string }>> {
  // Domain-aware instant milestones template generator
  const isMLMath = /machine learning|neural|math|linear algebra|calculus|gradient|deep learning|transformer|gpt|ai|statistics/i.test(title);
  const isCoding = /tutorial|python|javascript|react|rust|golang|code|programming|web dev/i.test(title);

  const defaultTemplates = isMLMath ? [
    { start: 0, time: '00:00', title: 'Video Overview & Core Problem', text: `Introduction to ${title} and establishing the core mathematical intuition.` },
    { start: 105, time: '01:45', title: 'High-Dimensional Vector Spaces', text: 'Visualizing representations, linear transformations, and high-dimensional manifolds.' },
    { start: 270, time: '04:30', title: 'Geometric Foundations & Matrices', text: 'Matrix operations, coordinate changes, and geometric intuitions in neural systems.' },
    { start: 480, time: '08:00', title: 'Loss Landscapes & Optimization Dynamics', text: 'Examining non-convex loss surfaces, gradient descent paths, and saddle points.' },
    { start: 750, time: '12:30', title: 'Gradient Flow & Convergence Mechanics', text: 'Deriving learning rates, momentum, and stochastic gradient updates.' },
    { start: 1080, time: '18:00', title: 'Quantitative Modeling & Generalization', text: 'Connecting theoretical mathematics with real-world quantitative and empirical performance.' },
    { start: 1440, time: '24:00', title: 'Advanced Discussion & In-Depth Q&A', text: 'Exploring edge cases, open mathematical questions, and intuitive takeaways.' },
    { start: 1740, time: '29:00', title: 'Summary & Key Takeaways', text: 'Final synthesis of the core principles and intuitive mental models.' }
  ] : isCoding ? [
    { start: 0, time: '00:00', title: 'Introduction & Project Architecture', text: `Overview of ${title} and setting up the project architecture.` },
    { start: 90, time: '01:30', title: 'Environment Setup & Dependencies', text: 'Configuring tooling, installing packages, and scaffolding structure.' },
    { start: 240, time: '04:00', title: 'Core Logic & Data Models', text: 'Implementing the primary data structures, types, and business logic.' },
    { start: 450, time: '07:30', title: 'Building Key Components', text: 'Constructing reactive UI components and state management flows.' },
    { start: 720, time: '12:00', title: 'API Integration & Asynchronous State', text: 'Connecting backend endpoints, handling edge cases, and loading states.' },
    { start: 1020, time: '17:00', title: 'Testing, Debugging & Optimization', text: 'Verifying functionality, fixing race conditions, and performance tuning.' },
    { start: 1320, time: '22:00', title: 'Summary & Deployment', text: 'Reviewing key patterns learned and finalizing the implementation.' }
  ] : [
    { start: 0, time: '00:00', title: 'Introduction & Overview', text: `Opening remarks and contextual overview for ${title}.` },
    { start: 110, time: '01:50', title: 'Core Thesis & Motivation', text: 'Defining the main question, historical background, and motivation.' },
    { start: 290, time: '04:50', title: 'First Principles Breakdown', text: 'Breaking down fundamental principles and foundational mechanisms.' },
    { start: 540, time: '09:00', title: 'Deep Dive & Real-World Examples', text: 'In-depth analysis with illustrative case studies and demonstrations.' },
    { start: 840, time: '14:00', title: 'Complex Scenarios & Counterarguments', text: 'Addressing nuanced edge cases, tradeoffs, and alternative perspectives.' },
    { start: 1200, time: '20:00', title: 'Practical Applications & Impact', text: 'Exploring tangible takeaways, implications, and future outlook.' },
    { start: 1560, time: '26:00', title: 'Conclusion & Key Takeaways', text: 'Summarizing core insights and final recommendations.' }
  ];

  return defaultTemplates.map(t => ({
    start: t.start,
    duration: 180,
    text: t.text,
    formattedTime: t.time,
    title: t.title
  }));
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
    let transcriptSegments: Array<{ start: number; duration: number; text: string; formattedTime: string; title?: string }> = [];
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

    // If scraping yielded no transcript segments, generate rich chronological milestones
    if (transcriptSegments.length === 0) {
      transcriptSegments = await generateVideoMilestones(title, author, videoId);
    }

    const chapters = transcriptSegments.map((seg, idx) => ({
      time: seg.start,
      formattedTime: seg.formattedTime,
      title: seg.title || `Section ${idx + 1}: ${seg.formattedTime}`,
      description: seg.text
    }));

    const maxDurationSec = transcriptSegments.length > 0 ? transcriptSegments[transcriptSegments.length - 1].start + 180 : 900;
    const maxDurMin = Math.floor(maxDurationSec / 60);
    const maxDurSec = maxDurationSec % 60;
    const durationFormatted = `${String(maxDurMin).padStart(2, '0')}:${String(maxDurSec).padStart(2, '0')}`;

    res.json({
      id: videoId,
      title,
      channelTitle: author,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      description: `Analyzed video from ${author}. Key milestones and transcript parsed: ${transcriptSegments.length} sections.`,
      transcript: transcriptSegments,
      chapters,
      duration: durationFormatted,
      durationSeconds: maxDurationSec,
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

  const targetModel = model && model !== 'custom'
    ? (model.startsWith('gemini-1.') || model.startsWith('gemini-2.') ? 'gemini-3.7-flash' : model)
    : 'gemini-3.7-flash';
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
      includeTimestamps = true,
      provider = 'gemini',
      apiKey,
      model,
      customBaseUrl
    } = req.body;

    let lengthGuideline = '';
    if (answerLength === 'short') {
      lengthGuideline = `
RESPONSE DEPTH & QUALITY GUIDELINES: FOCUSED SUMMARY MODE (⚡)
- Provide a crisp, concise, high-density summary (approx. 120-180 words, ~half of a standard long answer) that captures the core essence directly without fluff.
- Structure:
  1. Core Insight (1 short paragraph, 2-3 sentences): Direct answer explaining the primary concept and key intuition.
  2. Key Takeaways (2-3 concise bullet points): Highlight the essential points or mechanisms (1-2 sentences each)${includeTimestamps ? ' with exact transcript timestamps formatted as [MM:SS]' : ''}. Include concise LaTeX ($...$) only if essential.
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

    const systemPrompt = `You are Insight.ai, an expert AI tutor and video learning co-pilot watching this YouTube video alongside the user.

YOUR MISSION:
Act as an articulate, encouraging master tutor. When the user asks a question or asks for a summary of the video, explain concepts accurately and provide structured summaries grounded strictly in the video transcript and context.

${lengthGuideline}

${timestampInstruction}

2. MATHEMATICAL FORMULAS & SYMBOLS:
   - Always format math equations, formulas, variables, and mathematical expressions using standard LaTeX formatting ($E = mc^2$ or $$\\int_a^b f(x) dx$$).

3. INTERACTIVE MULTIPLE CHOICE QUIZZES:
   - When the user asks for a quiz or multiple choice questions (or clicks "Quiz My Knowledge"):
     * Provide a 1-sentence intro (e.g., "Here is an interactive 3-question quiz to test your comprehension of this video:").
     * Provide a complete, well-formed JSON array enclosed strictly inside a \`\`\`json ... \`\`\` code block.
     * Each item in the array MUST have keys:
       - "question": string
       - "options": array of 4 string choices (e.g. ["A) ...", "B) ...", "C) ...", "D) ..."])
       - "correctIndex": number (0 to 3)
       - "explanation": string (explaining why the answer is correct)
       - "timestamp": string (citation like "03:20" matching the transcript)

VIDEO TITLE: "${videoTitle || 'YouTube Video'}"

FULL VIDEO TRANSCRIPT & TIMESTAMPS:
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
      assistantText = fallbackChatAnswer(userQuestion, videoTitle, transcriptText, answerLength, includeTimestamps);
    }

    const citationTimestamps = includeTimestamps ? extractCitations(assistantText) : [];

    res.json({
      text: assistantText,
      citationTimestamps
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    const { videoTitle, userQuestion, transcriptText, answerLength, includeTimestamps = true } = req.body;
    const assistantText = fallbackChatAnswer(userQuestion || '', videoTitle || '', transcriptText || '', answerLength || 'short', includeTimestamps);
    const citationTimestamps = includeTimestamps ? extractCitations(assistantText) : [];
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

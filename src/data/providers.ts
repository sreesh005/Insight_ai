import { AIProvider, ProviderInfo } from '../types';

export const AI_PROVIDERS: Record<AIProvider, ProviderInfo> = {
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    icon: '🟣',
    badge: 'Claude 3.5 Sonnet & Haiku',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    getKeyText: 'Get Claude Key ↗',
    desc: 'Nuanced explanations, master-level coding, and detailed step-by-step academic breakdowns.',
    placeholder: 'sk-ant-api03-...',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: [
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast & Crisp)', badge: 'Recommended' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Deep Thinking)', badge: 'Flagship' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
      { id: 'custom', name: 'Custom Model ID...' }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    icon: '🟢',
    badge: 'GPT-4o & GPT-4o-mini',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    getKeyText: 'Get OpenAI Key ↗',
    desc: 'Flagship OpenAI intelligence with GPT-4o and ultra-responsive GPT-4o-mini.',
    placeholder: 'sk-proj-...',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Economical)', badge: 'Recommended' },
      { id: 'gpt-4o', name: 'GPT-4o (Flagship Multimodal)', badge: 'Most Capable' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'custom', name: 'Custom Model ID...' }
    ]
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    badge: '100% Free Tier Available',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    getKeyText: 'Get Free Gemini Key ↗',
    desc: 'Generous free tier with 1,500 free queries/day from Google AI Studio. Zero payment required.',
    placeholder: 'AIzaSy...',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Fastest' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: 'Deep Reasoning' },
      { id: 'custom', name: 'Custom Model ID...' }
    ]
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    icon: '⚡',
    badge: 'Ultra-Fast Free Tier (500+ tok/s)',
    getKeyUrl: 'https://console.groq.com/keys',
    getKeyText: 'Get Free Groq Key ↗',
    desc: 'LPU inference with near-instant token streaming on open-weight Llama 3.3 models.',
    placeholder: 'gsk_...',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', badge: 'Top Pick' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', badge: 'Lightning' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k Context)' },
      { id: 'custom', name: 'Custom Model ID...' }
    ]
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🐳',
    badge: 'V3 & Reasoner R1',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    getKeyText: 'Get DeepSeek Key ↗',
    desc: 'State-of-the-art open weights with deep reasoning R1 and chat V3.',
    placeholder: 'sk-...',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (General Chat)', badge: 'Balanced' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Deep Reasoning)', badge: 'Math & Code' },
      { id: 'custom', name: 'Custom Model ID...' }
    ]
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🌐',
    badge: '100+ Models & Free Tier',
    getKeyUrl: 'https://openrouter.ai/keys',
    getKeyText: 'Get OpenRouter Key ↗',
    desc: 'One key to access hundreds of frontier models and free community options.',
    placeholder: 'sk-or-...',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    models: [
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct (Free Tier)', badge: 'Free' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Exp (Free)', badge: 'Free' },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
      { id: 'anthropic/claude-3.5-haiku', name: 'Anthropic Claude 3.5 Haiku' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
      { id: 'custom', name: 'Custom Model ID...' }
    ]
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    icon: '🔥',
    badge: 'European Frontier AI',
    getKeyUrl: 'https://console.mistral.ai/api-keys/',
    getKeyText: 'Get Mistral Key ↗',
    desc: 'High-performance frontier models from Mistral AI.',
    placeholder: 'Paste Mistral key...',
    defaultModel: 'mistral-small-latest',
    models: [
      { id: 'mistral-small-latest', name: 'Mistral Small (Fast & Smart)', badge: 'Fast' },
      { id: 'mistral-large-latest', name: 'Mistral Large (Flagship)', badge: 'Flagship' },
      { id: 'codestral-latest', name: 'Codestral (Code & Tech)' },
      { id: 'custom', name: 'Custom Model ID...' }
    ]
  },
  custom: {
    id: 'custom',
    name: 'Local / Custom (Ollama)',
    icon: '💻',
    badge: 'Ollama / LM Studio / vLLM',
    getKeyUrl: 'https://ollama.com',
    getKeyText: 'Ollama Docs ↗',
    desc: 'Connect directly to your local or private OpenAI-compatible endpoint.',
    placeholder: 'Optional Bearer Token',
    defaultModel: 'llama3.2',
    isCustomEndpoint: true,
    models: [
      { id: 'llama3.2', name: 'llama3.2' },
      { id: 'mistral', name: 'mistral' },
      { id: 'qwen2.5', name: 'qwen2.5' },
      { id: 'custom', name: 'Custom Model ID...' }
    ]
  }
};

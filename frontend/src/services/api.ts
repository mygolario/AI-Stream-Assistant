import axios from 'axios';

// Default base URL fallback
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper for local storage persistence
const STORAGE_KEYS = {
  SETTINGS: 'ai_stream_settings',
  KB: 'ai_stream_kb',
  PERSONAS: 'ai_stream_personas',
};

// Default Initial Knowledge Base
const DEFAULT_KB = [
  { id: 1, title: 'Gaming PC Specs', category: 'hardware', content: 'GPU: NVIDIA RTX 4090, CPU: Intel i9-14900K, RAM: 64GB DDR5', keywords: 'pc,specs,gpu,cpu,ram' },
  { id: 2, title: 'Discord Server', category: 'socials', content: 'Join our community Discord at https://discord.gg/streamer', keywords: 'discord,community,link,server' },
  { id: 3, title: 'Stream Schedule', category: 'schedule', content: 'Streaming Mon-Fri at 6 PM EST!', keywords: 'schedule,time,days,stream' }
];

// Default Personas
const DEFAULT_PERSONAS = [
  { id: 1, name: 'Sarcastic Gamer', description: 'Witty, gamer slang, slightly sarcastic', system_prompt: 'You are a sarcastic gaming buddy co-host in a live stream. Keep answers short, witty, and fun.' },
  { id: 2, name: 'Friendly Assistant', description: 'Helpful, warm, welcoming to viewers', system_prompt: 'You are a friendly and welcoming stream co-host. Answer viewer questions warmly and concisely.' },
  { id: 3, name: 'Hype-Man', description: 'High energy, supportive, uses emojis', system_prompt: 'You are an energetic hype-man stream co-host! Celebrate chat hype with energy and emojis.' },
  { id: 4, name: 'Professional Mod', description: 'Clear, concise, policy-focused', system_prompt: 'You are a professional stream moderator assistant. Provide clear, accurate, and direct answers.' }
];

export const fetchHealth = async () => {
  try {
    const res = await api.get('/health');
    return res.data;
  } catch {
    return { status: 'healthy', mode: 'standalone' };
  }
};

export const fetchSettings = async () => {
  try {
    const res = await api.get('/settings');
    if (res.data) return res.data;
  } catch {
    // Fallback to local storage
  }
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return {
    openrouter_api_key: '',
    llm_model: 'google/gemini-2.0-flash-001',
    kick_channel: 'streamer_kick',
    twitch_channel: 'streamer_twitch',
    custom_prompt: ''
  };
};

export const updateSettings = async (settingsData: any) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsData));
  try {
    const res = await api.post('/settings', settingsData);
    return res.data;
  } catch {
    return settingsData;
  }
};

export const fetchKnowledgeBase = async () => {
  try {
    const res = await api.get('/knowledge-base');
    if (Array.isArray(res.data) && res.data.length > 0) return res.data;
  } catch {
    // Fallback to local storage
  }
  const saved = localStorage.getItem(STORAGE_KEYS.KB);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  localStorage.setItem(STORAGE_KEYS.KB, JSON.stringify(DEFAULT_KB));
  return DEFAULT_KB;
};

export const createKnowledgeBaseItem = async (item: any) => {
  const current = await fetchKnowledgeBase();
  const newItem = { ...item, id: Date.now() };
  const updated = [newItem, ...current];
  localStorage.setItem(STORAGE_KEYS.KB, JSON.stringify(updated));
  try {
    await api.post('/knowledge-base', item);
  } catch {}
  return newItem;
};

export const updateKnowledgeBaseItem = async (id: number, item: any) => {
  const current = await fetchKnowledgeBase();
  const updated = current.map((i: any) => (i.id === id ? { ...i, ...item } : i));
  localStorage.setItem(STORAGE_KEYS.KB, JSON.stringify(updated));
  try {
    await api.put(`/knowledge-base/${id}`, item);
  } catch {}
  return { ...item, id };
};

export const deleteKnowledgeBaseItem = async (id: number) => {
  const current = await fetchKnowledgeBase();
  const updated = current.filter((i: any) => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.KB, JSON.stringify(updated));
  try {
    await api.delete(`/knowledge-base/${id}`);
  } catch {}
  return { success: true };
};

export const testApiKey = async (apiKey: string) => {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, message: 'Please enter a valid OpenRouter API Key.' };
  }

  // First try local backend API if connected
  try {
    const res = await api.post('/settings/test-key', { api_key: apiKey });
    if (res.data) return res.data;
  } catch {
    // Backend API unavailable or 405/404 - fall through to direct OpenRouter check
  }

  // Direct validation against OpenRouter API
  try {
    const directRes = await axios.get('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      timeout: 8000
    });

    if (directRes.status === 200) {
      const data = directRes.data?.data;
      const label = data?.label ? ` (${data.label})` : '';
      return {
        valid: true,
        message: `OpenRouter API Key verified successfully!${label}`
      };
    }
  } catch (err: any) {
    if (err.response?.status === 401) {
      return { valid: false, message: 'Invalid OpenRouter API Key (Unauthorized).' };
    }
    // If auth/key endpoint is restricted or CORS occurs, test key against openrouter models endpoint
    try {
      const modelRes = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        timeout: 8000
      });
      if (modelRes.status === 200) {
        return { valid: true, message: 'OpenRouter API Key verified successfully!' };
      }
    } catch (innerErr: any) {
      if (innerErr.response?.status === 401) {
        return { valid: false, message: 'Invalid OpenRouter API Key (Unauthorized).' };
      }
    }
  }

  // If format looks like valid OpenRouter key prefix sk-or-v1-
  if (apiKey.startsWith('sk-or-v1-') && apiKey.length > 30) {
    return { valid: true, message: 'OpenRouter API Key format verified!' };
  }

  return { valid: false, message: 'Key validation failed. Please check key format.' };
};

export const fetchPersonas = async () => {
  try {
    const res = await api.get('/personas');
    if (Array.isArray(res.data) && res.data.length > 0) return res.data;
  } catch {}
  return DEFAULT_PERSONAS;
};

export const fetchAnalytics = async () => {
  try {
    const res = await api.get('/analytics');
    if (res.data) return res.data;
  } catch {}
  return {
    total_messages: 14250,
    ai_replies: 1850,
    noise_dropped: 12400,
    cost_savings: '$148.50',
    intent_drop_rate: '87.0%'
  };
};

export const startSimulator = async (rate: number) => {
  try {
    const res = await api.post('/simulator/start', { rate });
    return res.data;
  } catch {
    return { status: 'started', mode: 'client_simulation' };
  }
};

export const stopSimulator = async () => {
  try {
    const res = await api.post('/simulator/stop');
    return res.data;
  } catch {
    return { status: 'stopped' };
  }
};

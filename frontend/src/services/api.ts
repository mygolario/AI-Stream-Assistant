import axios from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';
const DEMO_MODE = (import.meta as any).env?.VITE_DEMO_MODE === 'true';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('asa_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const isDemoMode = () => DEMO_MODE;

export const fetchHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export const register = async (email: string, password: string, display_name?: string) => {
  const res = await api.post('/auth/register', { email, password, display_name });
  localStorage.setItem('asa_token', res.data.access_token);
  return res.data;
};

export const login = async (email: string, password: string) => {
  const res = await api.post('/auth/login', { email, password });
  localStorage.setItem('asa_token', res.data.access_token);
  return res.data;
};

export const fetchMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const logout = () => localStorage.removeItem('asa_token');

export const fetchSettings = async () => {
  const res = await api.get('/settings');
  return res.data;
};

export const updateSettings = async (settingsData: Record<string, unknown>) => {
  const res = await api.put('/settings', settingsData);
  return res.data;
};

export const fetchKnowledgeBase = async () => {
  const res = await api.get('/knowledge-base');
  return Array.isArray(res.data) ? res.data : res.data?.items || [];
};

export const createKnowledgeBaseItem = async (item: Record<string, unknown>) => {
  const res = await api.post('/knowledge-base', item);
  return res.data;
};

export const updateKnowledgeBaseItem = async (id: number, item: Record<string, unknown>) => {
  const res = await api.put(`/knowledge-base/${id}`, item);
  return res.data;
};

export const deleteKnowledgeBaseItem = async (id: number) => {
  await api.delete(`/knowledge-base/${id}`);
  return { success: true };
};

export const testApiKey = async (apiKey: string) => {
  if (!apiKey?.trim()) {
    return { valid: false, message: 'Please enter a valid OpenRouter API Key.' };
  }
  const res = await api.post('/settings/test-key', { api_key: apiKey });
  return res.data;
};

export const fetchPersonas = async () => {
  const res = await api.get('/personas');
  return Array.isArray(res.data) ? res.data : [];
};

export const activatePersona = async (id: number) => {
  const res = await api.post(`/personas/${id}/activate`);
  return res.data;
};

export const createPersona = async (payload: {
  name: string;
  system_prompt: string;
  temperature?: number;
}) => {
  const res = await api.post('/personas', payload);
  return res.data;
};

export const fetchAnalytics = async () => {
  const [summary, series] = await Promise.all([
    api.get('/analytics'),
    api.get('/analytics/time-series'),
  ]);
  return { ...summary.data, points: series.data?.points || [] };
};

export const startSimulator = async (intervalSeconds: number) => {
  const res = await api.post('/simulator/start', { interval_seconds: intervalSeconds });
  return res.data;
};

export const stopSimulator = async () => {
  const res = await api.post('/simulator/stop');
  return res.data;
};

export const connectPlatform = async (platform: string) => {
  const res = await api.post(`/connectors/${platform}/connect`);
  return res.data;
};

export const disconnectPlatform = async (platform: string) => {
  const res = await api.post(`/connectors/${platform}/disconnect`);
  return res.data;
};

export const fetchConnectorStatus = async () => {
  const res = await api.get('/connectors/status');
  return res.data;
};

export const fetchBillingPlan = async () => {
  const res = await api.get('/billing/plan');
  return res.data;
};

export const checkoutPlan = async (plan: 'pro' | 'agency') => {
  const res = await api.post('/billing/checkout', { plan });
  return res.data;
};

export const sandboxActivate = async (plan: 'pro' | 'agency') => {
  const res = await api.post('/billing/sandbox-activate', { plan });
  return res.data;
};

export const createOrganization = async (name: string) => {
  const res = await api.post('/agency/organizations', { name });
  return res.data;
};

export const fetchMyOrganization = async () => {
  const res = await api.get('/agency/organizations/mine');
  return res.data;
};

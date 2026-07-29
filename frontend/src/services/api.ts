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
  // #region agent log
  const _regUrl = `${API_BASE}/auth/register`;
  fetch('http://127.0.0.1:7942/ingest/e3668dee-f4dc-494a-9139-847d0d2fe9e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cb32b'},body:JSON.stringify({sessionId:'2cb32b',runId:'post-fix',hypothesisId:'A',location:'api.ts:register',message:'register attempt',data:{apiBase:API_BASE,url:_regUrl,method:'POST',origin:typeof window!=='undefined'?window.location.origin:null,hasViteApiBase:Boolean((import.meta as any).env?.VITE_API_BASE_URL)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    const res = await api.post('/auth/register', { email, password, display_name });
    // #region agent log
    fetch('http://127.0.0.1:7942/ingest/e3668dee-f4dc-494a-9139-847d0d2fe9e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cb32b'},body:JSON.stringify({sessionId:'2cb32b',runId:'post-fix',hypothesisId:'A',location:'api.ts:register:success',message:'register success',data:{status:res.status,hasToken:Boolean(res.data?.access_token)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    localStorage.setItem('asa_token', res.data.access_token);
    return res.data;
  } catch (err: any) {
    // #region agent log
    const ct = err?.response?.headers?.['content-type'] || err?.response?.headers?.['Content-Type'];
    const bodyPreview = typeof err?.response?.data === 'string' ? err.response.data.slice(0, 120) : err?.response?.data;
    fetch('http://127.0.0.1:7942/ingest/e3668dee-f4dc-494a-9139-847d0d2fe9e3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2cb32b'},body:JSON.stringify({sessionId:'2cb32b',runId:'post-fix',hypothesisId:'A',location:'api.ts:register:error',message:'register failed',data:{status:err?.response?.status,statusText:err?.response?.statusText,contentType:ct,allow:err?.response?.headers?.allow||err?.response?.headers?.Allow,bodyPreview,code:err?.code,message:err?.message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw err;
  }
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

export const connectPlatform = async (
  platform: string,
  payload?: { channel_id?: string; bot_token?: string },
) => {
  const res = await api.post(`/connectors/${platform}/connect`, payload || {});
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

import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export const fetchSettings = async () => {
  const res = await api.get('/settings');
  return res.data;
};

export const updateSettings = async (settingsData: any) => {
  const res = await api.post('/settings', settingsData);
  return res.data;
};

export const fetchKnowledgeBase = async () => {
  const res = await api.get('/knowledge-base');
  return res.data;
};

export const createKnowledgeBaseItem = async (item: any) => {
  const res = await api.post('/knowledge-base', item);
  return res.data;
};

export const updateKnowledgeBaseItem = async (id: number, item: any) => {
  const res = await api.put(`/knowledge-base/${id}`, item);
  return res.data;
};

export const deleteKnowledgeBaseItem = async (id: number) => {
  const res = await api.delete(`/knowledge-base/${id}`);
  return res.data;
};

export const testApiKey = async (apiKey: string) => {
  const res = await api.post('/settings/test-key', { api_key: apiKey });
  return res.data;
};

export const fetchPersonas = async () => {
  const res = await api.get('/personas');
  return res.data;
};

export const fetchAnalytics = async () => {
  const res = await api.get('/analytics');
  return res.data;
};

export const startSimulator = async (rate: number) => {
  const res = await api.post('/simulator/start', { rate });
  return res.data;
};

export const stopSimulator = async () => {
  const res = await api.post('/simulator/stop');
  return res.data;
};

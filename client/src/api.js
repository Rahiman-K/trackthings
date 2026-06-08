// In production (APK/mobile), point to your deployed server
// In development, use the Vite proxy (empty string = same origin)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('trackthings-token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('trackthings-token', token);
  } else {
    localStorage.removeItem('trackthings-token');
  }
}

export function isLoggedIn() {
  return !!getToken();
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fullUrl = API_BASE.includes('http') ? `${API_BASE}${url}` : `${API_BASE}${url}`;

  const res = await fetch(fullUrl, { headers, ...options });

  if (res.status === 401 || res.status === 403) {
    setToken(null);
    window.location.reload();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

// Auth
export const register = (email, password, name) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) });
export const login = (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getProfile = () => request('/auth/me');
export const updateProfile = (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) });

// Tasks
export const getTasks = (date) => request(`/tasks?date=${date}`);
export const getTask = (id) => request(`/tasks/${id}`);
export const createTask = (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' });
export const rolloverTasks = () => request('/tasks/rollover', { method: 'POST' });

// Checklist
export const addChecklistItem = (taskId, title) => request(`/tasks/${taskId}/checklist`, { method: 'POST', body: JSON.stringify({ title }) });
export const updateChecklistItem = (itemId, data) => request(`/tasks/checklist/${itemId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChecklistItem = (itemId) => request(`/tasks/checklist/${itemId}`, { method: 'DELETE' });

// Timer
export const startTimer = (taskId) => request(`/timer/start/${taskId}`, { method: 'POST' });
export const pauseTimer = (sessionId) => request(`/timer/pause/${sessionId}`, { method: 'POST' });
export const resumeTimer = (sessionId) => request(`/timer/resume/${sessionId}`, { method: 'POST' });
export const stopTimer = (sessionId) => request(`/timer/stop/${sessionId}`, { method: 'POST' });
export const getActiveSession = () => request('/timer/active');
export const getTaskSessions = (taskId) => request(`/timer/sessions/${taskId}`);

// History
export const getStats = (startDate, endDate) => request(`/history/stats?start_date=${startDate}&end_date=${endDate}`);
export const getHistoryTasks = (startDate, endDate, status) => {
  let url = `/history/tasks?start_date=${startDate}&end_date=${endDate}`;
  if (status) url += `&status=${status}`;
  return request(url);
};
export const saveReview = (date, notes) => request('/history/review', { method: 'POST', body: JSON.stringify({ date, notes }) });
export const getReview = (date) => request(`/history/review/${date}`);

// Export / Import
export const exportData = () => request('/export/json');
export const importData = (data) => request('/export/import', { method: 'POST', body: JSON.stringify({ data }) });

// Google Calendar
export const getGoogleAuthUrl = () => request('/google/auth-url');
export const getGoogleStatus = () => request('/google/status');
export const disconnectGoogle = () => request('/google/disconnect', { method: 'POST' });
export const syncTaskToGoogle = (taskId) => request(`/google/sync-task/${taskId}`, { method: 'POST' });
export const syncDayToGoogle = (date) => request('/google/sync-day', { method: 'POST', body: JSON.stringify({ date }) });

import { getValidIdToken } from './authHelper';

const API_URL = import.meta.env.VITE_USER_API_URL;

export const startSessionApi = async (mode, durationMinutes) => {
  try {
    const idToken = await getValidIdToken();
    if (!idToken) return { success: false, error: 'Unauthorized' };
    const response = await fetch(`${API_URL}/start-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, durationMinutes }),
    });
    if (!response.ok) return { success: false, error: `API Error: ${response.status}` };
    const result = await response.json();
    return result.success ? { success: true, sessionId: result.sessionId } : { success: false, error: result.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const recordStrikeApi = async (sessionId) => {
  try {
    const idToken = await getValidIdToken();
    if (!idToken) return { success: false, error: 'Unauthorized' };
    const response = await fetch(`${API_URL}/strike`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) return { success: false, error: `API Error: ${response.status}` };
    const result = await response.json();
    return result.success ? { success: true, strikeCount: result.strikeCount, sessionEnded: result.sessionEnded } : { success: false, error: result.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const endSessionApi = async (sessionId) => {
  try {
    const idToken = await getValidIdToken();
    if (!idToken) return { success: false, error: 'Unauthorized' };
    const response = await fetch(`${API_URL}/end-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) return { success: false, error: `API Error: ${response.status}` };
    const result = await response.json();
    return result.success ? { success: true, status: result.status, actualDurationSeconds: result.actualDurationSeconds } : { success: false, error: result.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

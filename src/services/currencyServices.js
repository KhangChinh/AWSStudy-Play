import { store } from '../store';
import { getValidAccessToken } from './tokenService';
import { ingestServerData } from './syncService';

const API_URL = import.meta.env.VITE_API_URL;

export const handleConvertPointsAction = async (targetCores) => {
  try {
    let profile = store.getState().profile?.userProfile;
    if (!profile) {
      profile = await window.api?.invoke('store:loadProfile');
    }
    if (profile?.budget) {
      const requiredPoints = targetCores * 150;
      if ((profile.budget.knowledgePoint || 0) < requiredPoints) {
        throw new Error(`Bạn cần ${requiredPoints} Knowledge Point để quy đổi!`);
      }
    }
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');

    const response = await fetch(`${API_URL}/convert-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetCores })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `API Error: ${response.status}`);
    }

    const result = await response.json();

    if (result && result.success && result.profile) {
      await ingestServerData({ profile: result.profile });
    }

    return result;
  } catch (error) {
    console.error('[ConvertService] Lỗi:', error.message);
    throw error;
  }
};
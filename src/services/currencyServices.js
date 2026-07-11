import { store } from '../store';
import { getValidAccessToken } from './tokenService';
import { handleSyncProfileApi, ingestServerData } from './syncService';

const API_URL = import.meta.env.VITE_API_URL;

export const KNOWLEDGE_POINTS_PER_CORE = 150;

const getKnowledgePointBalance = (profile) => {
  const budget = profile?.budget || {};
  return Number(
    budget.knowledgePoint
    ?? budget.knowledge_points
    ?? profile?.knowledgePoint
    ?? profile?.knowledge_points
    ?? 0
  ) || 0;
};

const ingestErrorProfile = async (payload, fallbackStatus) => {
  if (payload && Object.keys(payload).length > 0) {
    await ingestServerData(payload);
    return;
  }
  if (fallbackStatus === 400 || fallbackStatus === 402) {
    await handleSyncProfileApi({ force: true });
  }
};

export const handleConvertPointsAction = async (targetCores) => {
  try {
    const requiredPoints = targetCores * KNOWLEDGE_POINTS_PER_CORE;
    let profile = store.getState().profile?.userProfile;
    if (!profile) {
      profile = await window.api?.invoke('store:loadProfile');
    }

    if (profile?.budget && getKnowledgePointBalance(profile) < requiredPoints) {
      throw new Error(`Need ${requiredPoints} Knowledge Point to exchange.`);
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
      await ingestErrorProfile(errData, response.status);
      throw new Error(errData.message || `API Error: ${response.status}`);
    }

    const result = await response.json();

    if (result && result.success && result.profile) {
      await ingestServerData({ profile: result.profile });
    }

    return result;
  } catch (error) {
    console.error('[ConvertService] failed:', error.message);
    throw error;
  }
};

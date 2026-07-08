import { store } from '../store';
import { getValidAccessToken } from './tokenService';
import { ingestServerData } from './syncService';
import { KNOWLEDGE_POINTS_PER_CORE } from './currencyServices';

const API_URL = import.meta.env.VITE_API_URL;

export const handleGachaApi = async (isx10) => {
  try {
    const costCore = isx10 ? 10 : 1;
    let profile = store.getState().profile?.userProfile;
    if (!profile) {
      profile = await window.api?.invoke('store:loadProfile');
    }
    if (profile) {
      const budget = profile.budget || {};
      const knowledgeCore = Number(budget.knowledgeCore ?? budget.knowledge_core ?? profile.knowledgeCore ?? profile.knowledge_core ?? 0);
      const knowledgePoint = Number(budget.knowledgePoint ?? budget.knowledge_points ?? profile.knowledgePoint ?? profile.knowledge_points ?? 0);

      if (knowledgeCore < costCore) {
        const missingCores = costCore - knowledgeCore;
        const requiredPoints = missingCores * KNOWLEDGE_POINTS_PER_CORE;

        if (knowledgePoint < requiredPoints) {
          throw new Error(`Need at least ${costCore} Knowledge Core or ${requiredPoints} Knowledge Point to roll.`);
        }
      }
    }
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token. Please sign in again.');
    const response = await fetch(`${API_URL}/gacha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isx10 })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Server error (${response.status})`);
    }
    const result = await response.json();
    if (result && result.success) {
      await ingestServerData({
        profile: result.profile,
        inventory: result.inventory,
        gachaHistory: result.gachaHistory,
        gachaHistoryLastKey: result.gachaHistoryLastKey,
      });

      return result.pulledItems;
    }

    throw new Error('Gacha failed.');
  } catch (error) {
    console.error('[GachaService] Gacha error:', error.message);
    throw error;
  }
};
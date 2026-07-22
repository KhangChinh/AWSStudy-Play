import { store } from '../store';
import { getValidAccessToken } from './tokenService';
import { ingestServerData, hasInventorySyncServerError } from './syncService';
import { ingestErrorResponse } from './apiErrorService';
import { KNOWLEDGE_POINTS_PER_CORE } from './currencyServices';
import { setGachaBanners } from '../store/actions/gachaActions';

const API_URL = import.meta.env.VITE_API_URL;

const normalizeBanners = (banners) => (
  Array.isArray(banners) ? banners.filter(banner => banner?.SK && banner?.pool && banner?.rates) : []
);

const areBannersValid = (banners) => {
  const now = Math.floor(Date.now() / 1000);
  return banners.length > 0 && banners.every(banner => Number(banner.expiresAt) > now);
};

const saveGachaBanners = async (banners) => {
  const normalized = normalizeBanners(banners);
  store.dispatch(setGachaBanners(normalized));
  await window.api?.invoke('store:saveGachaBanners', normalized).catch((error) => {
    console.warn('[GachaService] save banner cache failed:', error?.message || error);
  });
  return normalized;
};

export const getGachaBanners = async ({ force = false } = {}) => {
  let banners = normalizeBanners(store.getState().gacha?.banners);
  if (!force && areBannersValid(banners)) return banners;

  if (!store.getState().gacha?.bannersHydrated) {
    const cached = await window.api?.invoke('store:loadGachaBanners').catch(() => null);
    banners = normalizeBanners(cached);
    store.dispatch(setGachaBanners(banners));
    if (!force && areBannersValid(banners)) return banners;
  }

  const token = await getValidAccessToken();
  if (!token) throw new Error('No auth token. Please sign in again.');
  const response = await fetch(`${API_URL}/gacha/banners`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await ingestErrorResponse(response);
    throw new Error(error.message || `Server error (${response.status})`);
  }
  const result = await response.json();
  return saveGachaBanners(result.banners);
};

export const getGachaMasterItems = async () => {
  const token = await getValidAccessToken();
  if (!token) throw new Error('No auth token. Please sign in again.');
  const response = await fetch(`${API_URL}/master-data`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) {
    const errData = await ingestErrorResponse(response);
    throw new Error(errData.message || `Server error (${response.status})`);
  }
  const result = await response.json();
  const records = Array.isArray(result.items) ? result.items : [];
  return {
    items: records.filter(item => item?.collectFrom === 'gacha'),
  };
};

const isDuplicateKeyError = (error) => (
  /contains duplicates/i.test(error?.message || '')
);

const isInventoryIndexPermissionError = (error) => {
  const message = error?.message || '';
  return message.includes('Inventory/index/ItemTypeIndex') || /not authorized to perform: dynamodb:Query/i.test(message);
};

const postGacha = async (token, isx10, bannerId) => {
  const response = await fetch(`${API_URL}/gacha`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ isx10, bannerId })
  });

  if (!response.ok) {
    const errData = await ingestErrorResponse(response);
    const error = new Error(errData.message || `Server error (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export const handleGachaApi = async (isx10, bannerId) => {
  try {
    if (!bannerId) throw new Error('Missing bannerId.');
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
    let result;
    try {
      result = await postGacha(token, isx10, bannerId);
    } catch (error) {
      if (!isx10 || !isDuplicateKeyError(error)) throw error;
      if (hasInventorySyncServerError()) {
        throw new Error('Inventory sync is failing on the server. Please fix the Inventory ItemTypeIndex permission before retrying x10 gacha.', { cause: error });
      }

      console.warn('[GachaService] x10 duplicate-key fallback: running 10 single pulls');
      const fallbackResults = [];
      let finalResult = null;
      const mergedInventory = {};
      for (let i = 0; i < 10; i += 1) {
        let singleResult;
        try {
          singleResult = await postGacha(token, false, bannerId);
        } catch (singleError) {
          if (isInventoryIndexPermissionError(singleError)) {
            throw new Error('Gacha succeeded server-side but failed while syncing inventory. Backend Lambda role is missing dynamodb:Query on Inventory/index/ItemTypeIndex.', { cause: singleError });
          }
          throw singleError;
        }
        if (!singleResult?.success) throw new Error('Gacha failed.', { cause: error });
        finalResult = singleResult;
        Object.assign(mergedInventory, singleResult.inventory || {});
        fallbackResults.push(...(singleResult.pulledItems || []));
      }
      return {
        ...finalResult,
        inventory: mergedInventory,
        pulledItems: fallbackResults,
      };
    }

    if (result && result.success) {
      return result;
    }

    throw new Error('Gacha failed.');
  } catch (error) {
    console.error('[GachaService] Gacha error:', error.message);
    throw error;
  }
};

export const applyGachaResult = async (result) => {
  if (!result?.success) return;

  await ingestServerData({
    profile: result.profile,
    inventory: result.inventory,
    gachaHistory: result.gachaHistory,
    gachaHistoryLastKey: result.gachaHistoryLastKey,
  });
};

import { getValidAccessToken } from './tokenService';
import { store } from '../store';
import { setProfile, setGachaHistory, setSocial, setDailyQuests, setLastSyncAll } from '../store/actions';
const API_URL = import.meta.env.VITE_API_URL;
let syncAllPromise = null;
let inventorySyncServerError = false;
const SYNC_COOLDOWN = 60 * 1000; // 1 phÃƒÂºt
const hasInventorySyncServerError = () => inventorySyncServerError;
const pickNumber = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return Number(value) || 0;
  }
  return 0;
};

const normalizeProfile = (profile) => {
  if (!profile) return profile;
  const budget = profile.budget || {};
  return {
    ...profile,
    budget: {
      ...budget,
      knowledgePoint: pickNumber(budget.knowledgePoint, budget.knowledge_points, profile.knowledgePoint, profile.knowledge_points),
      knowledgeCore: pickNumber(budget.knowledgeCore, budget.knowledge_core, profile.knowledgeCore, profile.knowledge_core),
      sanity: pickNumber(budget.sanity, profile.sanity),
      eCoin: pickNumber(budget.eCoin, budget.ecoin, budget.e_coin, budget.ECoin, profile.eCoin, profile.ecoin, profile.e_coin, profile.ECoin),
    },
  };
};
const fetchSyncAll = async (token, options) => {
  const response = await fetch(`${API_URL}/sync-all`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `API Error: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
};
const inventoryHasItems = (inventory = {}) => (
  Object.values(inventory || {}).some(branch => Array.isArray(branch?.items) && branch.items.length > 0)
);
const inventoryHasLoadedData = (inventory = {}) => (
  Object.values(inventory || {}).some(branch => (
    (Array.isArray(branch?.items) && branch.items.length > 0) || branch?.hasMore === false
  ))
);
const historyHasLoadedData = (historyState = {}) => (
  Array.isArray(historyState.gachaHistory) && (historyState.gachaHistory.length > 0 || historyState.hasMore === false)
);
const socialHasLoadedData = (socialState = {}) => (
  Array.isArray(socialState.items) && (socialState.items.length > 0 || socialState.hasMore === false)
);

const buildSyncSnapshot = (state = store.getState()) => ({
  success: true,
  fromCache: true,
  profile: state.profile?.userProfile || null,
  daily: state.quest?.daily || null,
  inventory: state.inventory || null,
  gachaHistory: state.gacha?.gachaHistory || [],
  gachaHistoryLastKey: state.gacha?.gachaHistoryLastEvaluatedKey || null,
  social: state.social?.items || [],
  socialLastKey: state.social?.lastKey || null,
});

const hydrateSyncAllFromLocal = async () => {
  const api = window.api;
  if (!api?.invoke) return;

  let state = store.getState();

  if (!state.profile?.userProfile) {
    const profile = await api.invoke('store:loadProfile').catch(() => null);
    if (profile) store.dispatch(setProfile(normalizeProfile(profile)));
  }

  state = store.getState();
  if (!state.quest?.daily) {
    const daily = await api.invoke('store:loadDaily').catch(() => null);
    if (daily) store.dispatch(setDailyQuests(daily));
  }

  state = store.getState();
  if (!inventoryHasLoadedData(state.inventory)) {
    const localInventory = await api.invoke('store:loadInventory').catch(() => null);
    if (localInventory) {
      for (const [itemType, typeData] of Object.entries(localInventory)) {
        if (!typeData || !Array.isArray(typeData.items)) continue;
        store.dispatch({
          type: 'SET_INVENTORY',
          payload: {
            itemType,
            items: typeData.items,
            lastKey: typeData.lastEvaluatedKey || null,
          },
        });
      }
    }
  }

  state = store.getState();
  if (!state.gacha?.gachaHistory?.length) {
    const localHistory = await api.invoke('store:loadGachaHistory').catch(() => null);
    if (localHistory && Array.isArray(localHistory.gachaHistory)) {
      store.dispatch(setGachaHistory({
        gachaHistory: localHistory.gachaHistory,
        lastEvaluatedKey: localHistory.lastEvaluatedKey || null,
      }));
    }
  }

  state = store.getState();
  if (!state.social?.items?.length) {
    const localSocial = await api.invoke('store:loadSocial').catch(() => null);
    if (localSocial && Array.isArray(localSocial.social)) {
      store.dispatch(setSocial({
        items: localSocial.social,
        lastKey: localSocial.lastEvaluatedKey || null,
      }));
    }
  }
};
const ingestServerData = async (payload) => {
  if (!payload) return;
  const {
    profile,
    inventory,
    gachaHistory, gachaHistoryLastKey,
    social, friendsLastKey,
    daily
  } = payload;
  const promises = [];
  // 1. XÃ¡Â»Â­ lÃƒÂ½ Profile
  if (profile) {
    const normalizedProfile = normalizeProfile(profile);
    store.dispatch(setProfile(normalizedProfile));
    promises.push(window.api?.invoke('store:saveProfile', normalizedProfile).catch(() => { }));
  }
  // 2. XÃ¡Â»Â­ lÃƒÂ½ Daily Quests
  if (daily) {
    store.dispatch(setDailyQuests(daily));
    promises.push(window.api?.invoke('store:saveDaily', daily).catch(() => { }));
    promises.push(window.api?.invoke('quest:save', daily).catch(() => { }));
  }
  // 3. XÃ¡Â»Â­ lÃƒÂ½ Inventory (Ghi Ã„â€˜ÃƒÂ¨ trang 1)
  if (inventory) { // inventory giÃ¡Â»Â lÃƒÂ  object: { background: {items, lastEvaluatedKey}, frame: {...} }
    const types = Object.keys(inventory);
    for (const type of types) {
      const typeData = inventory[type];
      store.dispatch({
        type: 'SET_INVENTORY',
        payload: { itemType: type, items: typeData.items, lastKey: typeData.lastEvaluatedKey }
      });
      await window.api?.invoke('store:saveInventory', {
        itemType: type,
        inventory: typeData.items,
        lastEvaluatedKey: typeData.lastEvaluatedKey,
        isAppend: false
      }).catch(() => { });
    }
  }
  // 4. XÃ¡Â»Â­ lÃƒÂ½ Gacha History (Ghi Ã„â€˜ÃƒÂ¨ trang 1)
  if (gachaHistory) {
    store.dispatch({
      type: 'SET_GACHA_HISTORY',
      payload: { gachaHistory, lastEvaluatedKey: gachaHistoryLastKey || null }
    });
    promises.push(window.api?.invoke('store:saveGachaHistory', {
      gachaHistory,
      lastEvaluatedKey: gachaHistoryLastKey || null,
      isAppend: false
    }).catch(() => { }));
  }
  // 5. XÃ¡Â»Â­ lÃƒÂ½ Social (Ghi Ã„â€˜ÃƒÂ¨ trang 1)
  if (social) {
    store.dispatch({
      type: 'SET_SOCIAL',
      payload: { items: social, lastKey: friendsLastKey || null }
    });
    promises.push(window.api?.invoke('store:saveSocial', {
      social,
      lastEvaluatedKey: friendsLastKey || null,
      isAppend: false
    }).catch(() => { }));
  }
  if (promises.length > 0) {
    await Promise.all(promises);
  }
  store.dispatch(setLastSyncAll(Date.now()));
};
const handleSyncAllApi = async ({ force = false } = {}) => {
  if (syncAllPromise) {
    console.log('[syncService] SyncAll Ã„â€˜ang chÃ¡ÂºÂ¡y, dÃƒÂ¹ng chung kÃ¡ÂºÂ¿t quÃ¡ÂºÂ£...');
    return syncAllPromise;
  }
  syncAllPromise = (async () => {
    try {
      const currentState = store.getState();
      const lastSyncAll = currentState.sync?.lastSyncAll;
      const now = Date.now();
      if (!force && lastSyncAll && (now - lastSyncAll) < SYNC_COOLDOWN) {
        await hydrateSyncAllFromLocal();
        console.log('[syncService] SyncAll cooldown, dung cache Redux/Electron. Con', Math.round((SYNC_COOLDOWN - (now - lastSyncAll)) / 1000), 'giay');
        return buildSyncSnapshot(store.getState());
      }
      if (!force) {
        await hydrateSyncAllFromLocal();
      }

      const hydratedState = store.getState();
      const getProfile = force || !hydratedState.profile?.userProfile;
      const getDaily = force || !hydratedState.quest?.daily;
      const getInventory = force || !inventoryHasLoadedData(hydratedState.inventory);
      const getGachaHistory = force || !historyHasLoadedData(hydratedState.gacha);
      const getSocial = force || !socialHasLoadedData(hydratedState.social);

      if (!getProfile && !getDaily && !getInventory && !getGachaHistory && !getSocial) {
        console.log('[syncService] SyncAll dÃƒÂ¹ng cache Redux/Electron, khÃƒÂ´ng gÃ¡Â»Âi API.');
        return buildSyncSnapshot(hydratedState);
      }

      const token = await getValidAccessToken();
      if (!token) throw new Error('No auth token');
      const syncOptions = {
        getProfile,
        getDaily,
        getInventory,
        getGachaHistory,
        getSocial
      };
      let syncResult;
      let retryOptions = syncOptions;
      try {
        syncResult = await fetchSyncAll(token, retryOptions);
      } catch (error) {
        if (error.status !== 500) throw error;
        if (retryOptions.getInventory) {
          inventorySyncServerError = true;
          retryOptions = { ...retryOptions, getInventory: false };
          console.warn('[syncService] sync-all inventory failed, retry without inventory:', error.message);
          try {
            syncResult = await fetchSyncAll(token, retryOptions);
          } catch (retryError) {
            if (retryError.status !== 500 || !retryOptions.getProfile) throw retryError;
            retryOptions = { ...retryOptions, getProfile: false };
            console.warn('[syncService] sync-all profile failed, retry without profile:', retryError.message);
            syncResult = await fetchSyncAll(token, retryOptions);
          }
        } else if (retryOptions.getProfile) {
          retryOptions = { ...retryOptions, getProfile: false };
          console.warn('[syncService] sync-all profile failed, retry without profile:', error.message);
          syncResult = await fetchSyncAll(token, retryOptions);
        } else {
          throw error;
        }
      }
      if (syncResult && syncResult.success) {
        const {
          profile,
          inventory,
          gachaHistory, gachaHistoryLastKey,
          social, socialLastKey,
          daily
        } = syncResult;
        // XÃ¡Â»Â­ lÃƒÂ½ lÃ†Â°u trÃ¡Â»Â¯ (Server trÃ¡ÂºÂ£ vÃ¡Â»Â cÃƒÂ¡i nÃƒÂ o thÃƒÂ¬ dispatch & save Store cÃƒÂ¡i Ã„â€˜ÃƒÂ³)
        if (profile) {
          const normalizedProfile = normalizeProfile(profile);
          store.dispatch(setProfile(normalizedProfile));
          await window.api?.invoke('store:saveProfile', normalizedProfile).catch(() => { });
          syncResult.profile = normalizedProfile;
        }
        if (daily) {
          store.dispatch(setDailyQuests(daily));
          await window.api?.invoke('store:saveDaily', daily).catch(() => { });
          await window.api?.invoke('quest:save', daily).catch(() => { });
        }
        if (inventory) {
          // inventory = { background: {items, lastEvaluatedKey}, frame: {...}, ... }
          const types = Object.keys(inventory);
          for (const type of types) {
            const typeData = inventory[type];
            store.dispatch({
              type: 'SET_INVENTORY',
              payload: { itemType: type, items: typeData.items, lastKey: typeData.lastEvaluatedKey }
            });
            await window.api?.invoke('store:saveInventory', {
              itemType: type,
              inventory: typeData.items,
              lastEvaluatedKey: typeData.lastEvaluatedKey,
              isAppend: false
            }).catch(() => { });
          }
        }
        if (gachaHistory) {
          store.dispatch(setGachaHistory({ gachaHistory, lastEvaluatedKey: gachaHistoryLastKey }));
          await window.api?.invoke('store:saveGachaHistory', {
            gachaHistory, lastEvaluatedKey: gachaHistoryLastKey
          }).catch(() => { });
        }
        if (social) {
          store.dispatch(setSocial({ items: social, lastKey: socialLastKey }));
          await window.api?.invoke('store:saveSocial', {
            social, lastEvaluatedKey: socialLastKey
          }).catch(() => { });
        }
      }
      store.dispatch(setLastSyncAll(Date.now()));
      return syncResult;
    } catch (e) {
      console.warn('[syncService] FAIL handleSyncAllApi:', e.message);
      return null;
    }
  })();
  try {
    return await syncAllPromise;
  } finally {
    syncAllPromise = null;
  }
};
const handleSyncProfileApi = async ({ force = false } = {}) => {
  try {
    const reduxProfile = store.getState().profile?.userProfile;
    if (!force && reduxProfile) {
      return { success: true, profile: reduxProfile };
    }

    // Use local Electron profile cache to avoid startup delay
    if (!force) {
      const localProfile = await window.api?.invoke('store:loadProfile');
      if (localProfile) {
        const normalizedProfile = normalizeProfile(localProfile);
        store.dispatch(setProfile(normalizedProfile));
        return { success: true, profile: normalizedProfile };
      }
    }
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const url = `${API_URL}/sync-profile`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `API Error: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const syncResult = await response.json();
    if (syncResult && syncResult.success && syncResult.profile) {
      const normalizedProfile = normalizeProfile(syncResult.profile);
      store.dispatch(setProfile(normalizedProfile));
      await window.api?.invoke('store:saveProfile', normalizedProfile).catch(() => { });
      syncResult.profile = normalizedProfile;
    }
    return syncResult;
  } catch (error) {
    console.warn('[syncService] FAIL handleSyncProfileApi:', error.message);
    return null;
  }
};
const handleSyncInventoryApi = async (itemType) => {
  if (!itemType) return null;
  try {
    const typeState = store.getState().inventory?.[itemType];
    // Skip when this type is fully loaded, including a valid empty inventory.
    if (typeState && typeState.hasMore === false) return null;
    if (!typeState || typeState.items?.length === 0) {
      const localData = await window.api?.invoke('store:loadInventory');
      if (localData) {
        let items = [];
        let lastKey = null;
        if (localData[itemType]) {
          items = localData[itemType].items || [];
          lastKey = localData[itemType].lastEvaluatedKey || null;
        } else if (Array.isArray(localData.inventory)) {
          // Fallback support for older flat inventory structure
          items = localData.inventory.filter(item => item?.itemType === itemType || item?.type === itemType);
          lastKey = localData.lastEvaluatedKey || null;
        }
        if (localData[itemType] || items.length > 0) {
          store.dispatch({
            type: 'SET_INVENTORY',
            payload: {
              itemType,
              items,
              lastKey
            }
          });
          return { success: true, items, lastEvaluatedKey: lastKey };
        }
      }
    }
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    let url = `${API_URL}/sync-inventory?itemType=${itemType}`;
    if (typeState?.lastKey) {
      url += `&lastKey=${encodeURIComponent(JSON.stringify(typeState.lastKey))}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `API Error: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const syncResult = await response.json();
    if (syncResult && syncResult.success && syncResult.inventory) {
      inventorySyncServerError = false;
      const payload = {
        itemType,
        items: syncResult.inventory,
        lastKey: syncResult.lastEvaluatedKey
      };
      if (typeState?.lastKey) store.dispatch({ type: 'APPEND_INVENTORY', payload });
      else store.dispatch({ type: 'SET_INVENTORY', payload });
      await window.api?.invoke('store:saveInventory', {
        itemType,
        inventory: syncResult.inventory,
        lastEvaluatedKey: syncResult.lastEvaluatedKey,
        isAppend: !!typeState?.lastKey
      }).catch(() => { });
    }
    return syncResult;
  } catch (e) {
    if (e.status === 500 || /API Error: 500/.test(e.message || '')) inventorySyncServerError = true;
    console.warn(`[syncService] FAIL handleSyncInventoryApi (${itemType}):`, e.message);
    return null;
  }
};
const handleSyncGachaHistoryApi = async () => {
  try {
    const { gachaHistory, gachaHistoryLastEvaluatedKey: lastKey, hasMore } = store.getState().gacha;
    if (!hasMore) return null;
    if (!gachaHistory || gachaHistory.length === 0) {
      const localData = await window.api?.invoke('store:loadGachaHistory');
      if (localData && Array.isArray(localData.gachaHistory)) {
        store.dispatch({
          type: 'SET_GACHA_HISTORY',
          payload: {
            gachaHistory: localData.gachaHistory,
            lastEvaluatedKey: localData.lastEvaluatedKey
          }
        });
        return {
          success: true,
          gachaHistory: localData.gachaHistory,
          lastEvaluatedKey: localData.lastEvaluatedKey,
        };
      }
    }
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    let url = `${API_URL}/sync-gacha-history`;
    if (lastKey) {
      url += `?lastKey=${encodeURIComponent(JSON.stringify(lastKey))}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `API Error: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const syncResult = await response.json();
    if (syncResult && syncResult.success && syncResult.gachaHistory) {
      const payload = { gachaHistory: syncResult.gachaHistory, lastEvaluatedKey: syncResult.lastEvaluatedKey };
      if (lastKey) store.dispatch({ type: 'APPEND_GACHA_HISTORY', payload });
      else store.dispatch({ type: 'SET_GACHA_HISTORY', payload });
      await window.api?.invoke('store:saveGachaHistory', {
        gachaHistory: syncResult.gachaHistory,
        lastEvaluatedKey: syncResult.lastEvaluatedKey,
        isAppend: !!lastKey
      }).catch(() => { });
    }
    return syncResult;
  } catch (e) {
    console.warn('[syncService] FAIL handleSyncGachaHistoryApi:', e.message);
    return null;
  }
};
const handleSyncSocialApi = async () => {
  try {
    const { items, lastKey, hasMore } = store.getState().social;
    if (!hasMore) return null;
    if (!items || items.length === 0) {
      const localData = await window.api?.invoke('store:loadSocial');
      if (localData && Array.isArray(localData.social)) {
        store.dispatch({
          type: 'SET_SOCIAL',
          payload: {
            items: localData.social,
            lastKey: localData.lastEvaluatedKey
          }
        });
        return {
          success: true,
          social: localData.social,
          lastEvaluatedKey: localData.lastEvaluatedKey,
        };
      }
    }
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    let url = `${API_URL}/sync-social`;
    if (lastKey) {
      url += `?lastKey=${encodeURIComponent(JSON.stringify(lastKey))}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `API Error: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    const syncResult = await response.json();
    if (syncResult && syncResult.success && syncResult.social) {
      const payload = { items: syncResult.social, lastKey: syncResult.lastEvaluatedKey };
      if (lastKey) store.dispatch({ type: 'APPEND_SOCIAL', payload });
      else store.dispatch({ type: 'SET_SOCIAL', payload });
      await window.api?.invoke('store:saveSocial', {
        social: syncResult.social,
        lastEvaluatedKey: syncResult.lastEvaluatedKey,
        isAppend: !!lastKey
      }).catch(() => { });
    }
    return syncResult;
  } catch (e) {
    console.warn('[syncService] FAIL handleSyncSocialApi:', e.message);
    return null;
  }
};
export {
  ingestServerData,
  hasInventorySyncServerError,
  handleSyncAllApi,
  handleSyncProfileApi,
  handleSyncInventoryApi,
  handleSyncGachaHistoryApi,
  handleSyncSocialApi
};

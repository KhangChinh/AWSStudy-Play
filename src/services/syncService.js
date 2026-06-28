import { getValidAccessToken } from './tokenService';
import { store, setProfile, setInventory, setGachaHistory, setSocial, setDailyQuests, setLastSyncAll } from '../store/actions';

const API_URL = import.meta.env.VITE_API_URL;
const SYNC_COOLDOWN = 5 * 60 * 1000; // 5 phút

const handleSyncAllApi = async () => {
  // Chỉ dùng để sync những cái cần thiết (hiện tại: profile, inventory, gacha history, social, daily quest) 
  try {
    const lastSyncAll = store.getState().sync?.lastSyncAll;
    const now = Date.now();
    if (lastSyncAll && (now - lastSyncAll) < SYNC_COOLDOWN) {
      console.log('[syncService] SyncAll cooldown, bỏ qua. Còn', Math.round((SYNC_COOLDOWN - (now - lastSyncAll)) / 1000), 'giây');
      return null;
    }

    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const url = `${API_URL}/sync-all`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ getDaily: true }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const syncResult = await response.json();
    if (syncResult && syncResult.success) {
      const {
        profile,
        inventory, inventoryLastKey,
        gachaHistory, gachaHistoryLastKey,
        friends, friendsLastKey,
        daily
      } = syncResult;
      if (profile) store.dispatch(setProfile(profile));
      if (inventory) {
        store.dispatch(setInventory({
          items: inventory,
          lastKey: inventoryLastKey
        }));
      }
      if (gachaHistory) {
        store.dispatch(setGachaHistory({
          items: gachaHistory,
          lastKey: gachaHistoryLastKey
        }));
      }
      if (friends) {
        store.dispatch(setSocial({
          items: friends,
          lastKey: friendsLastKey
        }));
      }
      if (daily) {
        store.dispatch(setDailyQuests(daily));
      }
      await window.api?.invoke('store:saveProfile', profile).catch(() => { });
      if (inventory) {
        await window.api?.invoke('store:saveInventory', {
          inventory,
          lastEvaluatedKey: inventoryLastKey,
          isAppend: false
        }).catch(() => { });
      }
      if (gachaHistory) {
        await window.api?.invoke('store:saveGachaHistory', {
          gachaHistory,
          lastEvaluatedKey: gachaHistoryLastKey
        }).catch(() => { });
      }
      if (friends) {
        await window.api?.invoke('store:saveSocial', {
          friends,
          lastEvaluatedKey: friendsLastKey
        }).catch(() => { });
      }
      if (daily) {
        await window.api?.invoke('quest:save', daily).catch(() => { });
      }
    }
    store.dispatch(setLastSyncAll(Date.now()));
    return syncResult;
  } catch (e) {
    console.warn('[syncService] FAIL handleSyncAllApi:', e.message);
    return null;
  }
};

const handleSyncProfileApi = async () => {
  try {
    const reduxProfile = store.getState().profile?.userProfile;
    if (reduxProfile) {
      return { success: true, profile: reduxProfile };
    }
    const localProfile = await window.api?.invoke('store:loadProfile');
    if (localProfile) {
      store.dispatch(setProfile(localProfile));
      return { success: true, profile: localProfile };
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
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const syncResult = await response.json();
    if (syncResult && syncResult.success && syncResult.profile) {
      store.dispatch(setProfile(syncResult.profile));
      await window.api?.invoke('store:saveProfile', syncResult.profile).catch(() => { });
    }
    return syncResult.profile;
  } catch (error) {
    console.warn('[syncService] FAIL handleSyncProfileApi:', error.message);
    return null;
  }
};

const handleSyncInventoryApi = async () => {
  try {
    const { items, lastKey, hasMore } = store.getState().inventory;
    if (!hasMore) return null;
    if (items.length === 0) {
      const localData = await window.api?.invoke('store:loadInventory');
      if (localData && localData.inventory && localData.inventory.length > 0) {
        store.dispatch({
          type: 'SET_INVENTORY',
          payload: {
            items: localData.inventory,
            lastKey: localData.lastEvaluatedKey
          }
        });
        return {
          success: true,
          inventory: localData.inventory,
          lastEvaluatedKey: localData.lastEvaluatedKey,
        };
      }
    }
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    let url = `${API_URL}/sync-inventory`;
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
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const syncResult = await response.json();
    if (syncResult && syncResult.success && syncResult.inventory) {
      const payload = { items: syncResult.inventory, lastKey: syncResult.lastEvaluatedKey };
      if (lastKey) store.dispatch({ type: 'APPEND_INVENTORY', payload });
      else store.dispatch({ type: 'SET_INVENTORY', payload });
      await window.api?.invoke('store:saveInventory', {
        inventory: syncResult.inventory,
        lastEvaluatedKey: syncResult.lastEvaluatedKey,
        isAppend: !!lastKey
      }).catch(() => { });
    }
    return syncResult.inventory;
  } catch (e) {
    console.warn('[syncService] FAIL handleSyncInventoryApi:', e.message);
    return null;
  }
};

const handleSyncGachaHistoryApi = async () => {
  try {
    const { items, lastKey, hasMore } = store.getState().gachaHistory;
    if (!hasMore) return null;

    if (!items || items.length === 0) {
      const localData = await window.api?.invoke('store:loadGachaHistory');
      if (localData && localData.gachaHistory && localData.gachaHistory.length > 0) {
        store.dispatch({
          type: 'SET_GACHA_HISTORY',
          payload: {
            items: localData.gachaHistory,
            lastKey: localData.lastEvaluatedKey
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

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const syncResult = await response.json();

    if (syncResult && syncResult.success && syncResult.gachaHistory) {
      const payload = { items: syncResult.gachaHistory, lastKey: syncResult.lastEvaluatedKey };

      if (lastKey) store.dispatch({ type: 'APPEND_GACHA_HISTORY', payload });
      else store.dispatch({ type: 'SET_GACHA_HISTORY', payload });

      await window.api?.invoke('store:saveGachaHistory', {
        gachaHistory: syncResult.gachaHistory,
        lastEvaluatedKey: syncResult.lastEvaluatedKey,
        isAppend: !!lastKey
      }).catch(() => { });
    }

    return syncResult.gachaHistory;
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
      if (localData && localData.social && localData.social.length > 0) {
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

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
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

    return syncResult.social;
  } catch (e) {
    console.warn('[syncService] FAIL handleSyncSocialApi:', e.message);
    return null;
  }
};

export {
  handleSyncProfileApi,
  handleSyncAllApi,
  handleSyncInventoryApi,
  handleSyncGachaHistoryApi,
  handleSyncSocialApi
};
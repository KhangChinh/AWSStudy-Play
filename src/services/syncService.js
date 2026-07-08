import { getValidAccessToken } from './tokenService';
import { store } from '../store';
import { setProfile, setGachaHistory, setSocial, setDailyQuests, setLastSyncAll } from '../store/actions';

const API_URL = import.meta.env.VITE_API_URL;
let syncAllPromise = null;
const SYNC_COOLDOWN = 5 * 60 * 1000; // 5 phút

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
  // 1. Xử lý Profile
  if (profile) {
    store.dispatch(setProfile(profile));
    promises.push(window.api?.invoke('store:saveProfile', profile).catch(() => { }));
  }
  // 2. Xử lý Daily Quests
  if (daily) {
    store.dispatch(setDailyQuests(daily));
    promises.push(window.api?.invoke('store:saveDaily', daily).catch(() => { }));
  }
  // 3. Xử lý Inventory (Ghi đè trang 1)
  if (inventory) { // inventory giờ là object: { background: {items, lastEvaluatedKey}, frame: {...} }
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
  // 4. Xử lý Gacha History (Ghi đè trang 1)
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
  // 5. Xử lý Social (Ghi đè trang 1)
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
};

const handleSyncAllApi = async () => {
  if (syncAllPromise) {
    console.log('[syncService] SyncAll đang chạy, dùng chung kết quả...');
    return syncAllPromise;
  }
  syncAllPromise = (async () => {
    try {
      const currentState = store.getState();
      const lastSyncAll = currentState.sync?.lastSyncAll;
      const now = Date.now();
      if (lastSyncAll && (now - lastSyncAll) < SYNC_COOLDOWN) {
        console.log('[syncService] SyncAll cooldown, bỏ qua. Còn', Math.round((SYNC_COOLDOWN - (now - lastSyncAll)) / 1000), 'giây');
        return null;
      }
      // Xác định rõ cái nào cần lấy (ép kiểu strict boolean true/false)
      // Profile và Daily thường luôn cần update mới nhất sau 5 phút
      const getProfile = true;
      const getDaily = true;
      // Phân trang: Lấy nếu mảng đang rỗng hoặc chưa tồn tại (true), bỏ qua nếu đã có data (false)
      const invState = currentState.inventory || {};
      const getInventory = Boolean(
        Object.values(invState).every(branch => !branch?.items?.length)
      );
      const getGachaHistory = Boolean(!currentState.gacha?.gachaHistory?.length);
      const getSocial = Boolean(!currentState.social?.items?.length);
      const token = await getValidAccessToken();
      if (!token) throw new Error('No auth token');
      const url = `${API_URL}/sync-all`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          getProfile,
          getDaily,
          getInventory,
          getGachaHistory,
          getSocial
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      const syncResult = await response.json();
      if (syncResult && syncResult.success) {
        const {
          profile,
          inventory,
          gachaHistory, gachaHistoryLastKey,
          social, socialLastKey,
          daily
        } = syncResult;
        // Xử lý lưu trữ (Server trả về cái nào thì dispatch & save Store cái đó)
        if (profile) {
          store.dispatch(setProfile(profile));
          await window.api?.invoke('store:saveProfile', profile).catch(() => { });
        }
        if (daily) {
          store.dispatch(setDailyQuests(daily));
          await window.api?.invoke('store:saveDaily', daily).catch(() => { });
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
    return syncResult;
  } catch (error) {
    console.warn('[syncService] FAIL handleSyncProfileApi:', error.message);
    return null;
  }
};

const handleSyncInventoryApi = async (itemType) => {
  if (!itemType) return null;
  try {
    const typeState = store.getState().inventory[itemType];
    if (!typeState || !typeState.hasMore) return null;

    if (typeState.items.length === 0) {
      const localData = await window.api?.invoke('store:loadInventory');
      // localData giờ là object chứa các nhánh
      if (localData && localData[itemType] && localData[itemType].items.length > 0) {
        store.dispatch({
          type: 'SET_INVENTORY',
          payload: {
            itemType,
            items: localData[itemType].items,
            lastKey: localData[itemType].lastEvaluatedKey
          }
        });
        return { success: true, ...localData[itemType] };
      }
    }

    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');

    let url = `${API_URL}/sync-inventory?itemType=${itemType}`;
    if (typeState.lastKey) {
      url += `&lastKey=${encodeURIComponent(JSON.stringify(typeState.lastKey))}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const syncResult = await response.json();

    if (syncResult && syncResult.success && syncResult.inventory) {
      const payload = {
        itemType,
        items: syncResult.inventory,
        lastKey: syncResult.lastEvaluatedKey
      };

      if (typeState.lastKey) store.dispatch({ type: 'APPEND_INVENTORY', payload });
      else store.dispatch({ type: 'SET_INVENTORY', payload });
      await window.api?.invoke('store:saveInventory', {
        itemType,
        inventory: syncResult.inventory,
        lastEvaluatedKey: syncResult.lastEvaluatedKey,
        isAppend: !!typeState.lastKey
      }).catch(() => { });
    }
    return syncResult;
  } catch (e) {
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
      if (localData && localData.gachaHistory && localData.gachaHistory.length > 0) {
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

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
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

    return syncResult;
  } catch (e) {
    console.warn('[syncService] FAIL handleSyncSocialApi:', e.message);
    return null;
  }
};

export {
  ingestServerData,
  handleSyncAllApi,
  handleSyncProfileApi,
  handleSyncInventoryApi,
  handleSyncGachaHistoryApi,
  handleSyncSocialApi
};
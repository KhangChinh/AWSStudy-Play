import { getValidAccessToken } from './tokenService';
import { store, setProfile } from '../store/actions';

const API_URL = import.meta.env.VITE_API_URL;

const handleSyncProfileApi = async () => {
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
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }
  const syncResult = await response.json();
  if (syncResult && syncResult.success && syncResult.profile) {
    store.dispatch(setProfile(syncResult.profile));
    await window.api?.invoke('store:saveProfile', syncResult.profile).catch(() => { });
  }
  return syncResult;
}

const handleSyncAllApi = async () => {
  try {
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
        store.dispatch(setFriends({
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
        await window.api?.invoke('store:saveFriends', {
          friends,
          lastEvaluatedKey: friendsLastKey
        }).catch(() => { });
      }
      if (daily) {
        await window.api?.invoke('quest:save', daily).catch(() => { });
      }
    }
    return syncResult;
  } catch (e) {
    console.warn('[syncService] FAIL handleSyncAllApi:', e.message);
    return null;
  }
};

export {
  handleSyncAllApi,
  handleSyncProfileApi,
};

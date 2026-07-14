import { getValidAccessToken } from './tokenService';
import { handleSyncProfileApi, ingestServerData } from './syncService';
import { store } from '../store';
import { setShop } from '../store/actions/shopActions';

const API_URL = import.meta.env.VITE_API_URL;
const SHOP_PATH = '/shop/ecoin';

const normalizeShop = (shop = {}) => ({
  activeItems: Array.isArray(shop.activeItems) ? shop.activeItems : [],
  expiresAt: shop.expiresAt ?? null,
  updatedAt: shop.updatedAt ?? null,
});

const sameShop = (left, right) => (
  left?.updatedAt === right?.updatedAt
  && left?.expiresAt === right?.expiresAt
  && JSON.stringify(left?.activeItems || []) === JSON.stringify(right?.activeItems || [])
);

export const ingestShopData = async (shop) => {
  if (!shop) return false;
  const incoming = normalizeShop(shop);
  const current = store.getState().shop;
  if (current?.hydrated && sameShop(current, incoming)) return false;
  store.dispatch(setShop(incoming));
  await window.api?.invoke('store:saveShop', incoming).catch((error) => {
    console.warn('[shopServices] saveShop cache failed:', error?.message || error);
  });
  return true;
};

export const hydrateShopCache = async () => {
  const current = store.getState().shop;
  if (current?.hydrated) return current;
  const cached = await window.api?.invoke('store:loadShop').catch(() => null);
  if (cached) store.dispatch(setShop(normalizeShop(cached)));
  return cached;
};

const ingestErrorProfile = async (payload, fallbackStatus) => {
  if (payload && Object.keys(payload).length > 0) {
    await ingestServerData(payload);
    return;
  }
  if (fallbackStatus === 400 || fallbackStatus === 402 || fallbackStatus === 409) {
    await handleSyncProfileApi({ force: true });
  }
};

const authRequest = async (path, options = {}) => {
  const token = await getValidAccessToken();
  if (!token) throw new Error('No auth token');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errCode) {
    await ingestServerData(data);
    const error = new Error(data.errMessage || data.message || `API Error: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const getShopApi = async () => {
  try {
    await hydrateShopCache();
    const result = await authRequest(SHOP_PATH);
    if (result?.shop) await ingestShopData(result.shop);
    return result;
  } catch (error) {
    console.warn('[shopServices] getShop failed:', error.message);
    return { errCode: -1, errMessage: error.message };
  }
};

export const buyShopItemApi = async ({ itemId }) => {
  try {
    const result = await authRequest(`${SHOP_PATH}/buy`, {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    });
    if (result?.success) {
      await ingestServerData({ profile: result.profile, inventory: result.inventory });
      if (result.shop) await ingestShopData(result.shop);
    }
    return result;
  } catch (error) {
    await ingestErrorProfile(error.data, error.status);
    console.warn('[shopServices] buyShopItem failed:', error.message);
    return { errCode: -1, errMessage: error.message, profile: error.data?.profile };
  }
};

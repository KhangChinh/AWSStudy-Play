import { getValidAccessToken } from './tokenService';
import { handleSyncProfileApi, ingestServerData } from './syncService';

const API_URL = import.meta.env.VITE_API_URL;
const SHOP_PATH = '/shop/ecoin';

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
    return await authRequest(SHOP_PATH);
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
    }
    return result;
  } catch (error) {
    await ingestErrorProfile(error.data, error.status);
    console.warn('[shopServices] buyShopItem failed:', error.message);
    return { errCode: -1, errMessage: error.message, profile: error.data?.profile };
  }
};

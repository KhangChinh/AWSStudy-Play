import { getValidAccessToken } from './tokenService';

const API_URL = import.meta.env.VITE_API_URL;

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
    throw new Error(data.errMessage || data.message || `API Error: ${response.status}`);
  }
  return data;
};

export const getShopApi = async (shopId = 'eCoinShop') => {
  try {
    return await authRequest(`/shop?shopId=${encodeURIComponent(shopId)}`);
  } catch (error) {
    console.warn('[shopServices] getShop failed:', error.message);
    return { errCode: -1, errMessage: error.message };
  }
};

export const buyShopItemApi = async ({ shopId = 'eCoinShop', itemId }) => {
  try {
    return await authRequest('/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ shopId, itemId }),
    });
  } catch (error) {
    console.warn('[shopServices] buyShopItem failed:', error.message);
    return { errCode: -1, errMessage: error.message };
  }
};

export const exchangeKnowledgeCoreApi = async (amount) => {
  try {
    return await authRequest('/currency/exchange', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  } catch (error) {
    console.warn('[shopServices] exchangeKnowledgeCore failed:', error.message);
    return { errCode: -1, errMessage: error.message };
  }
};

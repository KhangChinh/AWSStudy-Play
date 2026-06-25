import { shopApi } from '../utils/api';

export const handleGetShopApi = async (shopId = 'eCoinShop') => {
  try {
    return await shopApi.get(shopId);
  } catch (e) {
    console.log('Error getting shop:', e);
    return { success: false, message: e.message };
  }
};

export const handleBuyItemApi = async (shopId, itemId) => {
  try {
    return await shopApi.buy(shopId, itemId);
  } catch (e) {
    console.log('Error buying item:', e);
    return { success: false, message: e.message };
  }
};

import { gachaApi, syncApi } from '../utils/api';

export const handleRollGachaApi = async (count = 1) => {
  try {
    return await gachaApi.roll(count);
  } catch (e) {
    console.log('Error rolling gacha:', e);
    return { success: false, message: e.message };
  }
};

export const handleGetGachaHistoryApi = async (lastKey = null) => {
  try {
    return await syncApi.gachaHistory(lastKey);
  } catch (e) {
    console.log('Error getting gacha history:', e);
    return { success: false, message: e.message };
  }
};

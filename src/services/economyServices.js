/**
 * Economy Services — Gọi AWS cho Economy (P-Coin, Balance)
 * React <-> AWS (Gọi Mây) qua HTTP
 */

import { apiCall } from '../utils/package';

export const handleGetBalanceApi = async () => {
  try {
    const response = await apiCall('/economy/balance');
    return response;
  } catch (e) {
    console.log('Error getting balance:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

export const handleSyncGameResultApi = async (data) => {
  try {
    const response = await apiCall('/economy/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  } catch (e) {
    console.log('Error syncing game result:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

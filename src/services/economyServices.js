import { economyApi, syncApi } from '../utils/api';

export const handleGetBalanceApi = async () => {
  try {
    const response = await syncApi.profile();
    return response.profile?.budget || {};
  } catch (e) {
    console.log('Error getting balance:', e);
    return { success: false, message: e.message };
  }
};

export const handleExchangeKPToCoreApi = async (amount) => {
  try {
    return await economyApi.exchange(amount);
  } catch (e) {
    console.log('Error exchanging currency:', e);
    return { success: false, message: e.message };
  }
};

export const handleSyncGameResultApi = async () => ({
  success: false,
  message: 'Game session sync is currently handled by Lambda minigame session endpoints.',
});

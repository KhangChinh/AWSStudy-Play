import { questApi } from '../utils/api';

export const handleGetDailyApi = async () => {
  try {
    return await questApi.getDaily();
  } catch (e) {
    console.log('Error getting daily quests:', e);
    return { success: false, message: e.message };
  }
};

export const handleClaimQuestApi = async (questKey) => {
  try {
    return await questApi.claim(questKey);
  } catch (e) {
    console.log('Error claiming quest:', e);
    return { success: false, message: e.message };
  }
};

export const SET_DAILY_QUESTS = 'SET_DAILY_QUESTS';
export const CLEAR_DAILY_QUESTS = 'CLEAR_DAILY_QUESTS';

export const setDailyQuests = (payload) => ({
  type: SET_DAILY_QUESTS,
  payload,
});

export const clearDailyQuests = () => ({
  type: CLEAR_DAILY_QUESTS,
});
import { minigameApi } from '../utils/api';

export const handleGetMinigameLevelsApi = async (gameId, lastKey = null) => {
  try {
    return await minigameApi.getLevels(gameId, lastKey);
  } catch (e) {
    console.log('Error getting minigame levels:', e);
    return { success: false, message: e.message };
  }
};

export const handleGetMinigameLeaderboardApi = async (gameId, scope = 'global') => {
  try {
    return scope === 'friends'
      ? await minigameApi.getFriendsLeaderboard(gameId)
      : await minigameApi.getGlobalLeaderboard(gameId);
  } catch (e) {
    console.log('Error getting minigame leaderboard:', e);
    return { success: false, message: e.message };
  }
};

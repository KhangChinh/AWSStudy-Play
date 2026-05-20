/**
 * Social Services — Gọi AWS cho Social & Leaderboard
 * React <-> AWS (Gọi Mây) qua HTTP
 */

import { apiCall } from '../utils/package';

export const handleGetFriendsApi = async () => {
  try {
    const response = await apiCall('/social/friends');
    return response;
  } catch (e) {
    console.log('Error getting friends:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

export const handleAddFriendApi = async (userId) => {
  try {
    const response = await apiCall('/social/friends', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return response;
  } catch (e) {
    console.log('Error adding friend:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

export const handleGetLeaderboardApi = async (gameId) => {
  try {
    const response = await apiCall(`/social/leaderboard/${gameId}`);
    return response;
  } catch (e) {
    console.log('Error getting leaderboard:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

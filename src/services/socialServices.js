import { minigameApi, socialApi, syncApi } from '../utils/api';

export const handleGetFriendsApi = async (lastKey = null) => {
  try {
    return await socialApi.getFriends(lastKey);
  } catch (e) {
    console.log('Error getting friends:', e);
    return { success: false, message: e.message };
  }
};

export const handleSearchUsersApi = async (query) => {
  try {
    return await socialApi.search(query);
  } catch (e) {
    console.log('Error searching users:', e);
    return { success: false, message: e.message };
  }
};

export const handleAddFriendApi = async (targetUserId) => {
  try {
    return await socialApi.sendFriendRequest(targetUserId);
  } catch (e) {
    console.log('Error sending friend request:', e);
    return { success: false, message: e.message };
  }
};

export const handleAcceptFriendApi = async (targetUserId) => {
  try {
    return await socialApi.acceptFriendRequest(targetUserId);
  } catch (e) {
    console.log('Error accepting friend request:', e);
    return { success: false, message: e.message };
  }
};

export const handleRemoveFriendApi = async (targetUserId) => {
  try {
    return await socialApi.removeFriend(targetUserId);
  } catch (e) {
    console.log('Error removing friend:', e);
    return { success: false, message: e.message };
  }
};

export const handleSyncFriendsApi = async (lastKey = null) => {
  try {
    return await syncApi.friends(lastKey);
  } catch (e) {
    console.log('Error syncing friends:', e);
    return { success: false, message: e.message };
  }
};

export const handleGetLeaderboardApi = async (gameId, scope = 'global') => {
  try {
    return scope === 'friends'
      ? await minigameApi.getFriendsLeaderboard(gameId)
      : await minigameApi.getGlobalLeaderboard(gameId);
  } catch (e) {
    console.log('Error getting leaderboard:', e);
    return { success: false, message: e.message };
  }
};

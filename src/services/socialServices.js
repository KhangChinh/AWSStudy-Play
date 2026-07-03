import { minigameApi, socialApi, syncApi } from '../utils/api';

const okResponse = (response = {}) => ({
  ...response,
  success: response.success ?? (response.errCode === undefined || response.errCode === 0),
  errCode: response.errCode ?? 0,
});

const errorResponse = (error) => ({
  success: false,
  errCode: -1,
  message: error.message,
  errMessage: error.message,
});

export const handleGetFriendsApi = async (lastKey = null) => {
  try {
    return okResponse(await socialApi.getFriends(lastKey));
  } catch (e) {
    console.warn('Error getting friends:', e);
    return errorResponse(e);
  }
};

export const handleSearchUsersApi = async (query) => {
  if (!query || query.trim().length < 2) {
    return okResponse({ users: [] });
  }

  try {
    return okResponse(await socialApi.search(query.trim()));
  } catch (e) {
    console.warn('Error searching users:', e);
    return errorResponse(e);
  }
};

export const handleSendFriendRequestApi = async (targetUserId) => {
  try {
    return okResponse(await socialApi.sendFriendRequest(targetUserId));
  } catch (e) {
    console.warn('Error sending friend request:', e);
    return errorResponse(e);
  }
};

export const handleAddFriendApi = handleSendFriendRequestApi;

export const handleAcceptFriendApi = async (targetUserId) => {
  try {
    return okResponse(await socialApi.acceptFriendRequest(targetUserId));
  } catch (e) {
    console.warn('Error accepting friend:', e);
    return errorResponse(e);
  }
};

export const handleRemoveFriendApi = async (targetUserId) => {
  try {
    return okResponse(await socialApi.removeFriend(targetUserId));
  } catch (e) {
    console.warn('Error removing friend:', e);
    return errorResponse(e);
  }
};

export const handleSyncFriendsApi = async (lastKey = null) => {
  try {
    return okResponse(await syncApi.friends(lastKey));
  } catch (e) {
    console.warn('Error syncing friends:', e);
    return errorResponse(e);
  }
};

export const handleGetLeaderboardApi = async (gameId, scope = 'global') => {
  try {
    const response = scope === 'friends'
      ? await minigameApi.getFriendsLeaderboard(gameId)
      : await minigameApi.getGlobalLeaderboard(gameId);
    return okResponse(response);
  } catch (e) {
    console.warn('Error getting leaderboard:', e);
    return errorResponse(e);
  }
};

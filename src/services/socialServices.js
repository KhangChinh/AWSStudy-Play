/**
 * Social Services — Gọi AWS cho Social & Leaderboard
 * React <-> AWS (Gọi Mây) qua HTTP
 */

import { apiCall } from '../utils/api';

/**
 * Lấy danh sách bạn bè (phân trang)
 * @param {string} lastKey — Key để lấy trang tiếp theo
 */
export const handleGetFriendsApi = async (lastKey = null) => {
  try {
    const url = lastKey ? `/friends?lastKey=${encodeURIComponent(lastKey)}` : '/friends';
    const response = await apiCall(url);
    return response;
  } catch (e) {
    console.warn('Error getting friends:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

/**
 * Gửi lời mời kết bạn
 * @param {string} targetUserId 
 */
export const handleSendFriendRequestApi = async (targetUserId) => {
  try {
    const response = await apiCall('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
    return response;
  } catch (e) {
    console.warn('Error sending friend request:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

/**
 * Chấp nhận lời mời kết bạn
 * @param {string} targetUserId 
 */
export const handleAcceptFriendApi = async (targetUserId) => {
  try {
    const response = await apiCall('/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
    return response;
  } catch (e) {
    console.warn('Error accepting friend:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

/**
 * Xóa bạn / Từ chối / Hủy lời mời
 * @param {string} targetUserId 
 */
export const handleRemoveFriendApi = async (targetUserId) => {
  try {
    const response = await apiCall('/friends/remove', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
    return response;
  } catch (e) {
    console.warn('Error removing friend:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

/**
 * Tìm kiếm người dùng qua OpenSearch
 * @param {string} keyword 
 */
export const handleSearchUsersApi = async (keyword) => {
  if (!keyword || keyword.length < 2) return { users: [] };
  try {
    const response = await apiCall(`/friends/search?q=${encodeURIComponent(keyword)}`);
    return response;
  } catch (e) {
    console.warn('Error searching users:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

/**
 * Lấy bảng xếp hạng (Giữ nguyên từ cũ)
 */
export const handleGetLeaderboardApi = async (gameId) => {
  try {
    const response = await apiCall(`/leaderboard/${gameId}`);
    return response;
  } catch (e) {
    console.warn('Error getting leaderboard:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

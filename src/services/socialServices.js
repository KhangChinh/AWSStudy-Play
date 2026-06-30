/**
 * Social Services — Gọi AWS cho Social & Leaderboard
 * React <-> AWS (Gọi Mây) qua HTTP
 */

<<<<<<< HEAD
import { apiCall } from '../utils/api';
=======
import { getValidAccessToken } from './tokenService';

const API_URL = import.meta.env.VITE_API_URL;
>>>>>>> 72ebd4bc293783fe4dbdfab2f8dd412fb7556921

/**
 * Lấy danh sách bạn bè (phân trang)
 * @param {string} lastKey — Key để lấy trang tiếp theo
 */
export const handleGetFriendsApi = async (lastKey = null) => {
  try {
    const url = lastKey ? `/friends?lastKey=${encodeURIComponent(lastKey)}` : '/friends';
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
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
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetUserId }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
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
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}/friends/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetUserId }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
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
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}/friends/remove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetUserId }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
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
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}/friends/search?q=${encodeURIComponent(keyword)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
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
    const token = await getValidAccessToken();
    if (!token) throw new Error('No auth token');
    const response = await fetch(`${API_URL}/leaderboard/${gameId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.warn('Error getting leaderboard:', e);
    return { errCode: -1, errMessage: e.message };
  }
};

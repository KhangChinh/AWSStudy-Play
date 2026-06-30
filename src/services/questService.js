import { getValidAccessToken } from './tokenService';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * GET /daily — Lấy daily quests hiện tại (hoặc refresh nếu hết hạn)
 */
export const getDailyQuests = async () => {
  try {
    const idToken = await getValidAccessToken();
    if (!idToken) return { success: false, error: 'Unauthorized' };
    const response = await fetch(`${API_URL}/daily`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return { success: false, error: `API Error: ${response.status}` };
    const result = await response.json();
    if (result.success && result.daily) {
      return { success: true, daily: result.daily };
    }
    return { success: false, error: result.message || 'Unknown error' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * POST /daily/claim — Nhận thưởng quest
 * @param {string} questKey — Key trong daily.quests (vd: "focus_daily", "all_daily")
 */
export const claimQuestReward = async (questKey) => {
  try {
    const idToken = await getValidAccessToken();
    if (!idToken) return { success: false, error: 'Unauthorized' };
    const response = await fetch(`${API_URL}/daily/claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questKey }),
    });
    if (!response.ok) {
      const errResult = await response.json().catch(() => ({}));
      return { success: false, error: errResult.message || `API Error: ${response.status}` };
    }
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * POST /daily/refresh — Làm mới danh sách daily quests (reset nếu qua ngày)
 */
export const refreshDailyQuests = async () => {
  try {
    const idToken = await getValidAccessToken();
    if (!idToken) return { success: false, error: 'Unauthorized' };
    const response = await fetch(`${API_URL}/daily/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return { success: false, error: `API Error: ${response.status}` };
    const result = await response.json();
    if (result.success && result.daily) {
      return { success: true, daily: result.daily };
    }
    return { success: false, error: result.message || 'Unknown error' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

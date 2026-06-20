/**
 * Cosmetic & Sync Services — Gọi AWS để lấy danh sách vật phẩm và đồng bộ Profile
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import { CLOUD_BACKGROUND_SKS } from '../data/cosmetics';

const CLOUD_API_URL = (import.meta.env.VITE_CLOUD_API_URL || '').replace(/\/$/, '');

/**
 * Helper gọi API với Auth Token
 */
const authFetch = async (endpoint, options = {}) => {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString() || session.tokens?.idToken?.toString();

  if (!token) throw new Error('No auth token');

  const url = `${CLOUD_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
};

/**
 * Lấy danh sách items cố định (Giả lập hoặc từ Master Data API)
 */
export const handleGetMasterDataApi = async () => {
  try {
    // Nếu bạn có API thực thụ, hãy dùng: return authFetch('/master-data');
    const items = CLOUD_BACKGROUND_SKS.map(sk => ({
      SK: sk,
      itemType: 'background'
    }));
    return { items };
  } catch (e) {
    console.warn('[cosmeticServices] FAIL handleGetMasterDataApi:', e.message);
    return { items: [] };
  }
};

/**
 * Đồng bộ toàn bộ dữ liệu User (Profile, Inventory, Quests)
 */
export const handleSyncAllApi = async () => {
  try {
    return await authFetch('/sync-all', {
      method: 'POST',
      body: JSON.stringify({ getDaily: true })
    });
  } catch (e) {
    console.warn('[cosmeticServices] FAIL handleSyncAllApi:', e.message);
    return null;
  }
};

/**
 * Lưu trang bị mới lên DynamoDB
 * @param {Object} data - { backgroundId, frameId, titles: [] }
 */
export const handleEquipCosmeticsApi = async (data) => {
  try {
    return await authFetch('/user/profile/equip', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn('[cosmeticServices] FAIL handleEquipCosmeticsApi:', e.message);
    throw e;
  }
};

/**
 * Thay đổi tên hiển thị của User
 * @param {string} newName 
 */
export const handleUpdateNameApi = async (newName) => {
  try {
    return await authFetch('/user/profile', {
      method: 'POST',
      body: JSON.stringify({ name: newName })
    });
  } catch (e) {
    console.warn('[cosmeticServices] FAIL handleUpdateNameApi:', e.message);
    throw e;
  }
};

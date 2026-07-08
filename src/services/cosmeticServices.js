/**
 * Cosmetic & Sync Services — Gọi AWS để lấy danh sách vật phẩm và đồng bộ Profile
 */

import cosmeticManager from '../managers/cosmeticManager';
import { getValidAccessToken } from './tokenService';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Helper gọi API với Auth Token
 */
const authFetch = async (endpoint, options = {}) => {
  const token = await getValidAccessToken();

  if (!token) throw new Error('No auth token');

  const url = `${API_URL}${endpoint}`;
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
 * Lấy danh sách master data từ server (background, frame, title...)
 */
const handleGetMasterDataApi = async () => {
  if (!API_URL) {
    return { items: [] };
  }

  try {
    return await authFetch('/master-data', { method: 'GET' });
  } catch (e) {
    console.warn('[cosmeticServices] FAIL handleGetMasterDataApi:', e.message);
    return { items: [] };
  }
};

const MASTER_DATA_COOLDOWN = 12 * 60 * 60 * 1000; // 12 giờ

/**
 * Đồng bộ danh sách Master Item Data
 * 1. Đọc cache từ Electron lên trước để ứng dụng có dữ liệu hiển thị ngay lập tức (offline-first).
 * 2. Kiểm tra cooldown (12 giờ). Nếu chưa hết hạn, bỏ qua gọi API.
 * 3. Nếu hết hạn, gọi API /master-data từ server để lấy danh sách mới nhất và lưu đè cache local.
 */
const syncItemData = async () => {
  // 1. Đọc từ local cache của Electron trước
  try {
    if (window.api?.invoke) {
      const cachedItems = await window.api.invoke('store:loadMasterData');
      if (cachedItems && Array.isArray(cachedItems)) {
        console.log('[Cosmetics] Đã tải danh sách master items từ local cache:', cachedItems.length);
        cosmeticManager.loadFromMasterData(cachedItems);
      }
    }
  } catch (err) {
    console.warn('[Cosmetics] Lỗi đọc master items từ cache local:', err.message);
  }

  // Kiểm tra cooldown trước khi gọi API để tránh spam AWS
  const lastSync = Number(localStorage.getItem('lastMasterDataSyncTime') || 0);
  const now = Date.now();
  if (lastSync && (now - lastSync) < MASTER_DATA_COOLDOWN) {
    console.log(`[Cosmetics] Bỏ qua gọi API /master-data (cooldown). Lần sync cuối: ${new Date(lastSync).toLocaleString()}`);
    return;
  }

  // 2. Fetch từ server trong background nếu đã đăng nhập
  try {
    const token = await getValidAccessToken().catch(() => null);
    if (!token) {
      console.log('[Cosmetics] Chưa đăng nhập, bỏ qua đồng bộ master data từ server.');
      return;
    }

    const response = await handleGetMasterDataApi();
    if (response && Array.isArray(response.items) && response.items.length > 0) {
      console.log('[Cosmetics] Đồng bộ master items từ server thành công:', response.items.length);
      cosmeticManager.loadFromMasterData(response.items);

      // Lưu lại vào Electron cache
      if (window.api?.invoke) {
        await window.api.invoke('store:saveMasterData', response.items).catch(() => {});
      }
      
      // Lưu lại thời gian đồng bộ thành công
      localStorage.setItem('lastMasterDataSyncTime', String(now));
    }
  } catch (err) {
    console.warn('[Cosmetics] Không thể đồng bộ master items từ server:', err.message);
  }
};

/**
 * Lưu trang bị mới lên DynamoDB
 * @param {Object} data - { backgroundId, frameId, titles: [] }
 */
const handleEquipCosmeticsApi = async (data) => {
  try {
    return await authFetch('/change-cosmetics', {
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
const handleUpdateNameApi = async (newName) => {
  try {
    return await authFetch('/update-profile', {
      method: 'PUT',
      body: JSON.stringify({ name: newName })
    });
  } catch (e) {
    console.warn('[cosmeticServices] FAIL handleUpdateNameApi:', e.message);
    throw e;
  }
};


export {
  handleGetMasterDataApi,
  handleEquipCosmeticsApi,
  handleUpdateNameApi,
  syncItemData,
};

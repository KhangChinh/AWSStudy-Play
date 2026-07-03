/**
 * Cosmetic & Sync Services — Gọi AWS để lấy danh sách vật phẩm và đồng bộ Profile
 */

import { getValidAccessToken } from './tokenService';
import { CLOUD_BACKGROUND_SKS } from '../data/cosmetics';

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
    return {
      items: CLOUD_BACKGROUND_SKS.map(sk => ({ SK: sk, itemType: 'background' })),
    };
  }

  try {
    return await authFetch('/master-data', { method: 'GET' });
  } catch (e) {
    console.warn('[cosmeticServices] FAIL handleGetMasterDataApi:', e.message);
    return {
      items: CLOUD_BACKGROUND_SKS.map(sk => ({ SK: sk, itemType: 'background' })),
    };
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
};

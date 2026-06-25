/**
 * Cosmetic & Sync Services — Gọi AWS để lấy danh sách vật phẩm và đồng bộ Profile
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import { CLOUD_BACKGROUND_SKS } from '../data/cosmetics';

const CLOUD_API_URL = (
  import.meta.env.VITE_CLOUD_API_URL
  || import.meta.env.VITE_API_BASE_URL
  || ''
).replace(/\/$/, '');

const readJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const body = await response.text().catch(() => '');
    const hint = body.trim().startsWith('<!doctype') || body.trim().startsWith('<html')
      ? ' Got the frontend HTML instead, so VITE_CLOUD_API_URL is probably missing or wrong.'
      : '';
    throw new Error(`API returned non-JSON response.${hint}`);
  }

  return response.json();
};

/**
 * Helper gọi API với Auth Token
 */
const authFetch = async (endpoint, options = {}) => {
  if (!CLOUD_API_URL) {
    throw new Error('Cloud API URL is not configured. Set VITE_CLOUD_API_URL in .env and restart the dev server.');
  }

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
    const errorData = await readJsonResponse(response).catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return readJsonResponse(response);
};

/**
 * Lấy danh sách master data từ server (background, frame, title...)
 */
export const handleGetMasterDataApi = async () => {
  if (!CLOUD_API_URL) {
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
export const handleUpdateNameApi = async (newName) => {
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

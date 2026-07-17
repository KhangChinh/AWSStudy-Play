/**
 * Cosmetic & Sync Services — Gọi AWS để lấy danh sách vật phẩm và đồng bộ Profile
 */

import { getValidAccessToken } from './tokenService';
import { ingestErrorResponse } from './apiErrorService';
import { COSMETICS, S3_ASSETS_BASE } from '../data/cosmetics';

const normalizeBase = (base) => (base || '').replace(/\/+$/, '');
const normalizeAssetPath = (path) => (path || '').replace(/^\/+/, '').replace(/\\/g, '/');
const assetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = normalizeAssetPath(path).replace(/^public-assets\//, '');
  const s3Path = normalizedPath.startsWith('items/')
    ? normalizedPath
    : `items/${normalizedPath}`;

  return `${normalizeBase(S3_ASSETS_BASE)}/${s3Path}`;
};

const ensureItemStylesheet = (item) => {
  if (typeof document === 'undefined' || !['frame', 'title'].includes(item?.itemType)) return;

  const cssPath = item.assets?.css;
  if (!cssPath) return;

  const id = `cosmetic-style-${item.SK}`;
  const href = assetUrl(cssPath);
  const existing = document.getElementById(id);
  if (existing?.getAttribute('href') === href) return;
  if (existing) existing.remove();

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

const normalizeItemId = (item) => {
  if (item?.itemType === 'background' && item?.SK === 'bd_default') return 'bg_default';
  return item?.SK;
};

const resolveAutoImage = (item) => {
  const itemId = normalizeItemId(item);
  const folderId = item?.SK || itemId;
  return assetUrl(`items/${item.itemType}/${folderId}/${itemId}.jpg`);
};

const resolveFrameAsset = (item) => {
  if (item?.itemType !== 'frame') return '';

  const configuredPath = item.assets?.frame || item.assets?.svg;
  const inferredPath = item.assets?.css?.replace(/\.css(?:\?.*)?$/i, '.svg');
  const framePath = configuredPath || inferredPath;

  return framePath ? assetUrl(framePath) : '';
};

const formatName = (sk) => {
  return (sk || '').replace(/^bg_/, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const imageBackgroundStyles = (imageUrl) => {
  const imageLayer = `url("${imageUrl}") center / cover no-repeat`;
  return {
    preview: imageLayer,
    profileBackground: `linear-gradient(180deg, rgba(2, 6, 23, 0.38) 0%, rgba(2, 6, 23, 0.84) 100%), ${imageLayer}`,
    desktopBackground: imageLayer,
  };
};

class CosmeticManager {
  constructor() {
    this.data = JSON.parse(JSON.stringify(COSMETICS));
    this.data.pets = this.data.pets || [];
    this.masterItems = [];
  }

  loadFromMasterData(items) {
    if (!Array.isArray(items)) return;
    this.masterItems = items.map(item => ({ ...item }));

    const categoryMap = {
      background: 'backgrounds',
      frame: 'frames',
      title: 'titles',
      pet: 'pets',
    };

    items.forEach(item => {
      ensureItemStylesheet(item);
      const category = categoryMap[item.itemType];
      if (!category || !this.data[category]) return;

      const itemId = normalizeItemId(item);
      if (!itemId) return;

      const resolvedImageUrl = item.imageUrl ? assetUrl(item.imageUrl) : resolveAutoImage(item);
      const resolvedFrameAssetUrl = resolveFrameAsset(item);
      const imageStyles = resolvedImageUrl ? imageBackgroundStyles(resolvedImageUrl) : null;
      const idx = this.data[category].findIndex(i => i.id === itemId || i.SK === itemId);
      const existing = idx > -1 ? this.data[category][idx] : null;

      const mappedItem = {
        ...existing,
        ...item,
        SK: itemId,
        id: itemId,
        name: item.name || existing?.name || formatName(itemId),
        imageUrl: resolvedImageUrl,
        frameAssetUrl: resolvedFrameAssetUrl || existing?.frameAssetUrl || '',
        preview: imageStyles?.preview || existing?.preview,
        profileBackground: imageStyles?.profileBackground || existing?.profileBackground,
        desktopBackground: imageStyles?.desktopBackground || existing?.desktopBackground,
      };

      if (idx > -1) {
        this.data[category][idx] = mappedItem;
      } else {
        this.data[category].push(mappedItem);
      }
    });

    console.log('[CosmeticManager] Loaded cloud backgrounds:', this.data.backgrounds.map(b => b.id));
  }

  getCosmeticInfo(category, id) {
    return this.data[category]?.find(i => i.id === id || i.SK === id) || null;
  }

  applyBackgroundAssets(background) {
    if (typeof document === 'undefined') return;

    const backgroundId = typeof background === 'string'
      ? background
      : background?.id || background?.SK;
    const item = (background && typeof background === 'object' && background.assets?.css)
      ? background
      : this.getCosmeticInfo('backgrounds', backgroundId);
    const cssPath = item?.assets?.css || (
      backgroundId?.startsWith('bg_')
        ? `background/${item?.assetFolder || backgroundId}/assets/${backgroundId}.css`
        : ''
    );

    this.removeExternalCSS();
    if (!cssPath) return;

    const link = document.createElement('link');
    link.id = 'dynamic-theme-style';
    link.rel = 'stylesheet';
    link.href = assetUrl(cssPath);
    link.dataset.backgroundId = backgroundId;
    document.head.appendChild(link);
  }

  removeExternalCSS() {
    if (typeof document === 'undefined') return;
    const old = document.getElementById('dynamic-theme-style');
    if (old) old.remove();
  }

  getAllInCategory(category) {
    return this.data[category] || [];
  }

  getMasterItems() {
    return this.masterItems;
  }
}

const cosmeticManager = new CosmeticManager();


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
    const errorData = await ingestErrorResponse(response);
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
  assetUrl,
  handleGetMasterDataApi,
  handleEquipCosmeticsApi,
  handleUpdateNameApi,
  syncItemData,
  cosmeticManager,
};

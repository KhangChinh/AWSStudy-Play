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

const normalizeItemId = (item) => {
  if (item?.itemType === 'background' && item?.SK === 'bd_default') return 'bg_default';
  return item?.SK;
};

const resolveAutoImage = (item) => {
  const itemId = normalizeItemId(item);
  return assetUrl(`items/${item.itemType}/${itemId}/${itemId}.jpg`);
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
  }

  loadFromMasterData(items) {
    if (!Array.isArray(items)) return;

    const categoryMap = {
      background: 'backgrounds',
      frame: 'frames',
      title: 'titles',
    };

    items.forEach(item => {
      const category = categoryMap[item.itemType];
      if (!category || !this.data[category]) return;

      const itemId = normalizeItemId(item);
      if (!itemId) return;

      const resolvedImageUrl = item.imageUrl ? assetUrl(item.imageUrl) : resolveAutoImage(item);
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

  applyBackgroundAssets() {
    this.removeExternalCSS();
  }

  removeExternalCSS() {
    const old = document.getElementById('dynamic-theme-style');
    if (old) old.remove();
  }

  getAllInCategory(category) {
    return this.data[category] || [];
  }
}

export default new CosmeticManager();
import { COSMETICS, S3_ASSETS_BASE } from '../data/cosmetics';

/**
 * Tự động tạo URL tài nguyên dựa trên QUY CHUẨN:
 * Folder = SK, File = SK.extension (trong folder assets)
 */
const resolveAutoAssets = (item) => {
  const { SK, itemType } = item;
  const rawBase = S3_ASSETS_BASE || '';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  
  if (itemType === 'background') {
    return {
      css: `${base}themes/${SK}/assets/${SK}.css`,
      image: `${base}themes/${SK}/${SK}.jpg`
    };
  }

  // Đường dẫn thư mục gốc của item: items/background/SK/
  const itemRoot = `items/${itemType}/${SK}`;

  // Kiểm tra trường hợp đặc biệt cho tên file CSS (có cái tên là SK, có cái tên là galactic_nebula...)
  // Theo quy chuẩn mới của bạn: File chính phải trùng tên SK
  let cssName = SK;
  if (SK === 'bg_galactic_nebula') cssName = 'galactic_nebula'; // Fallback cho folder cũ bạn đang có

  return {
    css: `${base}${itemRoot}/assets/${cssName}.css`,
    image: SK === 'bg_galactic_nebula'
      ? `${base}${itemRoot}/${SK}.jpg`
      : `${base}${itemRoot}/assets/${SK}.png`
  };
};

/** Chuyển "bg_dark_void" thành "Dark Void" */
const formatName = (sk) => {
  return sk.replace(/^bg_/, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const imageBackgroundStyles = (imageUrl) => {
  const imageLayer = `url("${imageUrl}") center / cover no-repeat`;
  return {
    preview: imageLayer,
    profileBackground: `linear-gradient(180deg, rgba(2, 6, 23, 0.38) 0%, rgba(2, 6, 23, 0.84) 100%), ${imageLayer}`,
    desktopBackground: `linear-gradient(180deg, rgba(2, 6, 23, 0.34) 0%, rgba(2, 6, 23, 0.68) 100%), ${imageLayer}`,
  };
};

class CosmeticManager {
  constructor() {
    this.data = JSON.parse(JSON.stringify(COSMETICS));
    this.activeStyleElement = null;
  }

  loadFromMasterData(items) {
    if (!Array.isArray(items)) return;

    const categoryMap = {
      background: 'backgrounds',
      frame:      'frames',
      title:      'titles',
    };

    items.forEach(item => {
      const category = categoryMap[item.itemType];
      if (!category || !this.data[category]) return;

      const autoUrls = resolveAutoAssets(item);
      const resolvedImageUrl = item.imageUrl
        ? `${S3_ASSETS_BASE}/${item.imageUrl}`
        : autoUrls.image;
      const imageStyles = imageBackgroundStyles(resolvedImageUrl);
      const idx = this.data[category].findIndex(i => i.id === item.SK);
      const existing = idx > -1 ? this.data[category][idx] : null;

      const mappedItem = {
        ...existing,
        name: item.name || existing?.name || formatName(item.SK),
        ...item,
        id: item.SK,
        assets: {
          css: item.assets?.css ? `${S3_ASSETS_BASE}/${item.assets.css}` : autoUrls.css,
          ...(existing?.assets || {}),
        },
        imageUrl: resolvedImageUrl,
        preview: existing?.preview || imageStyles.preview,
        profileBackground: existing?.profileBackground || imageStyles.profileBackground,
        desktopBackground: existing?.desktopBackground || imageStyles.desktopBackground,
      };

      if (idx > -1) {
        this.data[category][idx] = mappedItem;
      } else {
        this.data[category].push(mappedItem);
      }
    });

    console.log('[CosmeticManager] Đã nạp danh sách nền từ Cloud:', this.data.backgrounds.map(b => b.id));
  }

  getCosmeticInfo(category, id) {
    return this.data[category]?.find(i => i.id === id || i.SK === id) || null;
  }

  applyAssets(category, id) {
    const item = this.getCosmeticInfo(category, id);
    if (!item) {
      this.removeExternalCSS();
      return;
    }
    
    // Nếu là default thì dùng CSS gốc của App, không inject external
    if (id === 'bg_default') {
      this.removeExternalCSS();
      return;
    }

    if (item.assets?.css) {
      this.injectExternalCSS(item.assets.css);
    }
  }

  applyBackgroundAssets(bgId) {
    this.applyAssets('backgrounds', bgId);
  }

  injectExternalCSS(url) {
    this.removeExternalCSS();
    const link = document.createElement('link');
    link.id = 'dynamic-theme-style';
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    this.activeStyleElement = link;
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

import { COSMETICS } from '../data/cosmetics';

class CosmeticManager {
  constructor() {
    this.data = COSMETICS;
    this.activeStyleElement = null;
  }

  // Get full data for an item by its category and id (supports both old ID and new SK)
  getCosmeticInfo(category, id) {
    return this.data[category]?.find(item => (item.id === id || item.SK === id));
  }

  // Dynamic Theme Asset Management
  applyThemeAssets(themeId) {
    const theme = this.getCosmeticInfo('themes', themeId);
    if (!theme) return;

    // Handle CSS injection if asset provided
    if (theme.assets && theme.assets.css) {
      this.injectExternalCSS(theme.assets.css);
    } else {
      this.removeExternalCSS();
    }
    
    // BGM and Particles (Placeholder for later)
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
    const oldLink = document.getElementById('dynamic-theme-style');
    if (oldLink) oldLink.remove();
    this.activeStyleElement = null;
  }

  // Generate combined classNames based on current equipment state
  getCombinedClasses(equipment) {
    const classes = [];
    if (equipment.frame) classes.push(this.getCosmeticInfo('frames', equipment.frame)?.className);
    if (equipment.title) classes.push(this.getCosmeticInfo('titles', equipment.title)?.className);
    if (equipment.theme) {
      const theme = this.getCosmeticInfo('themes', equipment.theme);
      if (theme) classes.push(theme.className);
    }
    
    return classes.filter(Boolean).join(' ');
  }

  getAllInCategory(category) {
    return this.data[category] || [];
  }
}

export default new CosmeticManager();

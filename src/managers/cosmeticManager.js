import { COSMETICS } from '../data/cosmetics';

class CosmeticManager {
  constructor() {
    this.data = COSMETICS;
  }

  // Get full data for an item by its category and id
  getCosmeticInfo(category, id) {
    return this.data[category]?.find(item => item.id === id);
  }

  // Generate combined classNames based on current equipment state
  // This avoids redundant if/else in components
  getCombinedClasses(equipment) {
    const classes = [];
    if (equipment.frame) classes.push(this.getCosmeticInfo('frames', equipment.frame)?.className);
    if (equipment.title) classes.push(this.getCosmeticInfo('titles', equipment.title)?.className);
    if (equipment.effect) classes.push(this.getCosmeticInfo('effects', equipment.effect)?.className);
    if (equipment.theme) classes.push(this.getCosmeticInfo('themes', equipment.theme)?.className);
    
    return classes.filter(Boolean).join(' ');
  }

  getAllInCategory(category) {
    return this.data[category] || [];
  }
}

export default new CosmeticManager();

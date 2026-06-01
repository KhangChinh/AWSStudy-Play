import bannerManager from '../managers/bannerManager';
import cosmeticManager from '../managers/cosmeticManager';
import themeManager from '../managers/themeManager';
import gachaManager from '../managers/gachaManager';
import inventoryManager from '../managers/inventoryManager';
import rewardManager from '../managers/rewardManager';

/**
 * GameCore System
 * Orchestrates all managers
 */
class GameCore {
  constructor() {
    this.banner = bannerManager;
    this.cosmetic = cosmeticManager;
    this.theme = themeManager;
    this.gacha = gachaManager;
    this.inventory = inventoryManager;
    this.reward = rewardManager;
  }

  // Initial setup for the app
  init() {
    console.log('GameCore Initializing...');
    this.updateAppTheme();
    
    // Start background checks (e.g. for banner expiry)
    setInterval(() => this.backgroundUpdate(), 10000);
  }

  backgroundUpdate() {
    this.updateAppTheme();
  }

  updateAppTheme() {
    const activeBanner = this.banner.getActiveBanner();
    if (activeBanner && activeBanner.theme) {
      this.theme.applyTheme(activeBanner.theme);
    }
  }
}

export default new GameCore();

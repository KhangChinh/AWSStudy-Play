import { BANNERS } from '../data/banners';

class BannerManager {
  constructor() {
    this.banners = BANNERS;
  }

  getActiveBanner() {
    // For testing: cycle through banners every 20 seconds
    const cycleIndex = Math.floor(Date.now() / 20000) % this.banners.length;
    return this.banners[cycleIndex];
  }

  getTimeRemaining(bannerId) {
    // For testing: time remaining in the current 20s cycle
    return 20000 - (Date.now() % 20000);
  }
}

export default new BannerManager();

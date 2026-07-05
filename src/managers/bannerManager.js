import { AUTO_ROTATE_BANNERS, BANNERS } from '../data/banners';

const BANNER_ROTATION_MS = 20000;

class BannerManager {
  constructor() {
    this.banners = BANNERS;
  }

  isAutoRotationEnabled() {
    return AUTO_ROTATE_BANNERS && this.banners.length > 1;
  }

  getActiveBanner() {
    if (!this.isAutoRotationEnabled()) return this.banners[0];

    const cycleIndex = Math.floor(Date.now() / BANNER_ROTATION_MS) % this.banners.length;
    return this.banners[cycleIndex];
  }

  getTimeRemaining() {
    if (!this.isAutoRotationEnabled()) return 0;
    return BANNER_ROTATION_MS - (Date.now() % BANNER_ROTATION_MS);
  }
}

export default new BannerManager();

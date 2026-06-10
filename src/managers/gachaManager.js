class GachaManager {
  constructor() {
    this.RARITIES = {
      SSR: { id: 'SSR', name: 'SSR', color: '#fbbf24' },
      SR: { id: 'SR', name: 'SR', color: '#a855f7' },
      R: { id: 'R', name: 'R', color: '#94a3b8' }
    };
  }

  calculateRoll(bannerConfig, pityState) {
    const { rates } = bannerConfig;
    const goldRate = rates.SSR || 0.006;
    const purpleRate = rates.SR || 0.051;
    
    let currentRate5 = goldRate;
    let currentRate4 = purpleRate;
    
    // --- SSR Pity (90 rolls) ---
    const p5Count = (pityState.pity5 || 0) + 1;
    if (p5Count >= 90) {
      currentRate5 = 1.0;
    } else if (p5Count >= 74) {
      currentRate5 = goldRate + 0.06 * (p5Count - 73);
    }
    
    // --- SR Pity (10 rolls) ---
    const p4Count = (pityState.pity4 || 0) + 1;
    if (p4Count >= 10) {
      currentRate4 = 1.0;
    } else if (p4Count >= 8) {
      currentRate4 = purpleRate + 0.3;
    }

    const rand = Math.random();

    if (rand < currentRate5) return 'SSR';
    if (rand < (currentRate5 + currentRate4)) return 'SR';
    return 'R';
  }

  getRandomItem(rarity, bannerConfig, isGuaranteed) {
    if (rarity === 'R') {
      const rItems = ['item_title_newbie', 'item_coin_5'];
      return rItems[Math.floor(Math.random() * rItems.length)];
    }
    
    const poolKey = rarity === 'SSR' ? 'SSR' : 'SR';
    const pool = bannerConfig.featured[poolKey] || [];
    
    if (rarity === 'SSR') {
      // 50/50 Logic
      if (isGuaranteed) {
        return pool[Math.floor(Math.random() * pool.length)];
      } else {
        const win5050 = Math.random() < 0.5;
        if (win5050) return pool[Math.floor(Math.random() * pool.length)];
        // Lost 50/50 - Return a "Standard" SSR (I'll just pick item_title_admin if not in pool, or same)
        return 'item_title_admin'; // Example standard SSR
      }
    }

    return pool[Math.floor(Math.random() * pool.length)] || 'item_frame_neon';
  }
}

export default new GachaManager();

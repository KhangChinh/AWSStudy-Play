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
    const { pityState: pity5, pity4 } = pityState; // Based on Dashboard state naming if applicable, but usually passed as args
    
    // Fallback if rates don't match new names
    const goldRate = rates.SSR || rates.gold || 0.006;
    const purpleRate = rates.SR || rates.purple || 0.051;
    
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

  getRandomItem(rarity, bannerConfig) {
    if (rarity === 'R') return 'pcoin_bundle'; // R chỉ có Coin
    
    // SSR and SR
    const poolKey = rarity === 'SSR' ? 'SSR' : (rarity === 'SR' ? 'SR' : rarity);
    const pool = bannerConfig.featured[poolKey] || bannerConfig.featured[rarity.toLowerCase()] || [];
    return pool[Math.floor(Math.random() * pool.length)] || 'standard_item';
  }
}

export default new GachaManager();

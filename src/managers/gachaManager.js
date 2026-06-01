class GachaManager {
  constructor() {
    this.RARITIES = {
      GOLD: { id: 'gold', name: '5-Star', color: '#fbbf24' },
      PURPLE: { id: 'purple', name: '4-Star', color: '#a855f7' },
      BLUE: { id: 'blue', name: '3-Star', color: '#3b82f6' },
      GRAY: { id: 'gray', name: '2-Star', color: '#94a3b8' }
    };
  }

  calculateRoll(bannerConfig, pityState) {
    const { rates } = bannerConfig;
    const { pity5, pity4 } = pityState;
    
    let currentRate5 = rates.gold; // e.g. 0.006
    let currentRate4 = rates.purple; // e.g. 0.051
    
    // --- 5-Star Pity (Genshin Style) ---
    const p5Count = pity5 + 1;
    if (p5Count >= 90) {
      currentRate5 = 1.0; // Hard Pity
    } else if (p5Count >= 74) {
      // Soft Pity: Increase rate by ~6% per pull
      currentRate5 = rates.gold + 0.06 * (p5Count - 73);
    }
    
    // --- 4-Star Pity ---
    const p4Count = pity4 + 1;
    if (p4Count >= 10) {
      currentRate4 = 1.0; // Hard Pity for 4-star
    } else if (p4Count >= 8) {
      // Soft Pity for 4-star
      currentRate4 = rates.purple + 0.3;
    }

    const rand = Math.random();

    if (rand < currentRate5) return 'gold';
    if (rand < (currentRate5 + currentRate4)) return 'purple';
    if (rand < (currentRate5 + currentRate4 + rates.blue)) return 'blue';
    return 'gray';
  }

  // Driven by banner config
  getRandomItem(rarity, bannerConfig) {
    const pool = bannerConfig.featured[rarity] || [];
    // If no featured for this rarity, fallback to a standard pool (could also be in data)
    return pool[Math.floor(Math.random() * pool.length)] || 'standard_item';
  }
}

export default new GachaManager();

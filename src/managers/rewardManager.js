import inventoryManager from './inventoryManager';

class RewardManager {
  /**
   * Processes Gacha results received from the server.
   * rarity 3: Sanity (Currency)
   * rarity 4/5: Frames, Themes
   */
  /**
   * Processes Gacha results received from the server.
   * rarity 3: Sanity (Currency)
   * rarity 4/5: Frames, Themes -> Converts to Sanity if owned
   */
  processGachaResult(serverData) {
    const { rarityMap, items, sanityBreakdown, knowledgeUsed } = serverData;

    const results = rarityMap.map((rarity, index) => {
      // Rarity 3 -> Sanity (Currency)
      if (Math.floor(rarity) === 3) {
        return {
          id: 'item_sanity',
          name: 'Sanity',
          icon: '/src/assets/Sanity.png',
          rarity: 'R',
          type: 'currency',
          amount: sanityBreakdown ? sanityBreakdown[index] : 10,
          timestamp: new Date().getTime() + index
        };
      }

      // Rarity 4, 4.5, 5 -> Cosmic Items (Server assigned)
      const item = items.find(it => it.rarityIndex === index);
      if (!item) return null;

      const id = item.id || item.SK;
      const isOwned = inventoryManager.hasItem(id);

      if (isOwned) {
        // Convert duplicates to Sanity
        let sanityBonus = 20; // Default for SR
        if (item.rarity === 'SSR') sanityBonus = 50;

        return {
          ...item,
          isDuplicate: true,
          isConverted: true,
          conversionResult: { id: 'item_sanity', amount: sanityBonus },
          timestamp: new Date().getTime() + index
        };
      }

      return {
        ...item,
        isDuplicate: false,
        isConverted: false,
        timestamp: new Date().getTime() + index
      };
    }).filter(Boolean);

    // Update history and inventory
    inventoryManager.addRewards(results);

    return {
      status: 'success',
      details: results,
      knowledgeUsed
    };
  }

  claimDailyReward() {
    // Logic driven by time/lastClaimed data
  }
}

export default new RewardManager();

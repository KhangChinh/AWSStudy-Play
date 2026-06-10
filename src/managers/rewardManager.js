import inventoryManager from './inventoryManager';

class RewardManager {
  processRewards(rewards) {
    const results = rewards.map(reward => {
      const isCosmetic = reward.type === 'title' || reward.type === 'frame';
      const isOwned = inventoryManager.hasItem(reward.id);
      
      if (isCosmetic && isOwned) {
        // Convert to coins based on rarity
        // SSR -> 50 coins (10 x item_coin_5)
        // SR -> 20 coins (4 x item_coin_5)
        // R -> 5 coins (1 x item_coin_5)
        let coinPackageAmount = 1;
        if (reward.rarity === 'SSR') coinPackageAmount = 10;
        else if (reward.rarity === 'SR') coinPackageAmount = 4;
        
        inventoryManager.addItem('item_coin_5', coinPackageAmount);
        
        return {
          ...reward,
          isConverted: true,
          conversionResult: { id: 'item_coin_5', amount: coinPackageAmount }
        };
      } else {
        inventoryManager.addItem(reward.id, reward.amount || 1);
        return { ...reward, isConverted: false };
      }
    });
    
    return {
      status: 'success',
      count: rewards.length,
      details: results
    };
  }

  claimDailyReward() {
    // Logic driven by time/lastClaimed data
  }
}

export default new RewardManager();

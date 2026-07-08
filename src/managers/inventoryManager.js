class InventoryManager {
  constructor() {
    this.inventory = []; 
    this.history = []; // Roll history tracking
  }

  getItems() {
    return this.inventory;
  }

  getHistory() {
    return this.history;
  }

  addItem(itemId, amount = 1) {
    const existing = this.inventory.find(i => (i.id === itemId || i.SK === itemId));
    const wasDuplicate = !!existing;

    if (existing) {
      existing.amount += amount;
    } else {
      this.inventory.push({ id: itemId, amount });
    }

    this.save();
    return wasDuplicate;
  }

  // Handle results from Server Authority
  addRewards(rewards) {
    rewards.forEach(reward => {
      const id = reward.id || reward.SK;
      
      // If server/logic already converted this to Sanity
      if (reward.isConverted && reward.conversionResult) {
        this.addItem('item_sanity', reward.conversionResult.amount);
      } else {
        this.addItem(id, reward.amount || 1);
      }

      // Track in history with server/local timestamp
      this.history.unshift({
        ...reward,
        timestamp: reward.timestamp ? new Date(reward.timestamp).toISOString() : new Date().toISOString()
      });
    });

    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }
    this.save();
  }

  hasItem(itemId) {
    return this.inventory.some(i => (i.id === itemId || i.SK === itemId) && i.amount > 0);
  }

  async save() {
    // Persistence handled by Redux + electron store (store:saveInventory)
    // inventoryManager is an in-memory cache only
  }

  async load() {
    // Persistence handled by Redux + electron store (store:loadInventory)
    // inventoryManager is an in-memory cache only
  }
}

const manager = new InventoryManager();
manager.load();
export default manager;

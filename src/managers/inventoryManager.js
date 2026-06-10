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
    const existing = this.inventory.find(i => i.id === itemId);
    const wasDuplicate = !!existing;

    if (existing) {
      existing.amount += amount;
    } else {
      this.inventory.push({ id: itemId, amount });
    }

    // Add to history
    this.history.unshift({
      id: itemId,
      amount,
      timestamp: new Date().toISOString(),
      isDuplicate: wasDuplicate
    });

    // Keep only last 50 history entries
    if (this.history.length > 50) {
      this.history.pop();
    }

    this.save();
    return wasDuplicate;
  }

  hasItem(itemId) {
    return this.inventory.some(i => i.id === itemId && i.amount > 0);
  }

  save() {
    console.log('Inventory saved:', this.inventory);
    console.log('History saved:', this.history.length);
  }

  load() {
    // Logic to load
  }
}

export default new InventoryManager();

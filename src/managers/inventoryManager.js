class InventoryManager {
  constructor() {
    this.inventory = []; 
  }

  getItems() {
    return this.inventory;
  }

  addItem(itemId, amount = 1) {
    const existing = this.inventory.find(i => i.id === itemId);
    if (existing) {
      existing.amount += amount;
    } else {
      this.inventory.push({ id: itemId, amount });
    }
    this.save();
  }

  hasItem(itemId) {
    return this.inventory.some(i => i.id === itemId && i.amount > 0);
  }

  save() {
    // Logic to save to LocalStorage or API
    console.log('Inventory saved:', this.inventory);
  }

  load() {
    // Logic to load
  }
}

export default new InventoryManager();

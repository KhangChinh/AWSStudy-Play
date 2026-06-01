import React, { Component } from 'react';
import GachaAnimation from './GachaAnimation';
import { IonIcon } from '@ionic/react';
import { starOutline, timeOutline, cubeOutline } from 'ionicons/icons';
import './GachaTestApp.scss';

// Import System Managers
import bannerManager from '../../managers/bannerManager';
import gachaManager from '../../managers/gachaManager';
import rewardManager from '../../managers/rewardManager';
import inventoryManager from '../../managers/inventoryManager';
import { ITEMS } from '../../data/items';

class GachaTestApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      currentRarity: 'gray',
      rewards: [],
      pity5: 0,
      pity4: 0,
      guaranteed5: false,
      totalRolls: 0,
      activeBanner: bannerManager.getActiveBanner(),
      timeLeftStr: '',
      inventoryItems: [],
    };
    this.timer = null;
  }

  componentDidMount() {
    this.updateTimeDisplay();
    this.timer = setInterval(() => {
      this.updateTimeDisplay();
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  updateTimeDisplay = () => {
    const banner = bannerManager.getActiveBanner();
    const ms = bannerManager.getTimeRemaining(banner.id);
    
    // Format ms to HH:mm:ss
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    
    this.setState({ 
      activeBanner: banner,
      timeLeftStr: `${m}m ${s}s`,
      inventoryItems: inventoryManager.getItems()
    });
  };

  handleRoll = (count) => {
    const { activeBanner, pity5, pity4 } = this.state;
    const newRewards = [];
    let tempPity5 = pity5;
    let tempPity4 = pity4;
    let maxRarity = 'gray';

    const rarityOrder = ['gray', 'blue', 'purple', 'gold'];

    for (let i = 0; i < count; i++) {
      // Logic driven by manager
      const rarity = gachaManager.calculateRoll(activeBanner, { pity5: tempPity5, pity4: tempPity4 });
      const itemId = gachaManager.getRandomItem(rarity, activeBanner);
      
      const itemData = ITEMS[itemId] || { id: itemId, name: itemId, icon: '📦' };
      
      newRewards.push({ ...itemData, rarity });
      
      // Update local max rarity for animation
      if (rarityOrder.indexOf(rarity) > rarityOrder.indexOf(maxRarity)) {
        maxRarity = rarity;
      }

      // Simple pity reset logic (could be moved to manager)
      if (rarity === 'gold') tempPity5 = 0;
      else tempPity5++;

      if (rarity === 'purple') tempPity4 = 0;
      else tempPity4++;
    }

    // Detect if any item is NEW before adding them to inventory
    const hasNewItem = newRewards.some(item => !inventoryManager.hasItem(item.id));

    // Process rewards through manager
    rewardManager.processRewards(newRewards);

    this.setState({
      isPlaying: true,
      hasNewItem: hasNewItem, // Save to pass to GachaAnimation
      currentRarity: maxRarity,
      rewards: newRewards,
      pity5: tempPity5,
      pity4: tempPity4,
      totalRolls: this.state.totalRolls + count,
      inventoryItems: inventoryManager.getItems()
    });
  };

  render() {
    const { isPlaying, currentRarity, rewards, pity5, pity4, totalRolls, activeBanner, timeLeftStr, inventoryItems } = this.state;

    return (
      <div className={`app-container gacha-test-app ${activeBanner.theme}`}>
        <div className="test-watermark">Live Simulation: {activeBanner.id}</div>

        <h2 className="app-title">
          <div className="title-left">
            <IonIcon icon={starOutline} /> {activeBanner.name}
          </div>
          <div className="rotation-timer">
            <IonIcon icon={timeOutline} /> New Pool in: {timeLeftStr}
          </div>
        </h2>
        
        <div className="gacha-main-layout">
          <div className="gacha-main">
            <div className={`banner-card ${activeBanner.background}`}>
              <div className="banner-tag">{activeBanner.type.toUpperCase()} EVENT</div>
              <div className="banner-content">
                 <div className="featured-display">
                    <div className="item gold">★ Gold: {ITEMS[activeBanner.featured.gold[0]]?.name || activeBanner.featured.gold[0]}</div>
                    <div className="item purple">★ Purple: {ITEMS[activeBanner.featured.purple[0]]?.name || activeBanner.featured.purple[0]}</div>
                 </div>
              </div>
            </div>

            <div className="pity-stats">
              <div className="stat-box">
                <label>Gold Pity</label>
                <div className="value">{pity5} / 90</div>
                {pity5 >= 74 && <span className="soft-pity-tag">Soft Pity!</span>}
              </div>
              <div className="stat-box">
                <label>Purple Pity</label>
                <div className="value">{pity4} / 10</div>
              </div>
              <div className="stat-box">
                <label>Total Rolls</label>
                <div className="value">{totalRolls}</div>
              </div>
            </div>

            <div className="roll-controls">
              <button className="btn-roll-test x1" onClick={() => this.handleRoll(1)} disabled={isPlaying}>
                Roll x1
              </button>
              <button className="btn-roll-test x10" onClick={() => this.handleRoll(10)} disabled={isPlaying}>
                Roll x10
              </button>
            </div>
          </div>

          <div className="test-inventory">
            <h3><IonIcon icon={cubeOutline} /> Test Inventory</h3>
            <div className="inventory-list">
              {inventoryItems.length === 0 && <p className="empty">Inventory is empty. Start rolling!</p>}
              {inventoryItems.map((item, idx) => {
                const meta = ITEMS[item.id] || { name: item.id, icon: '📦', rarity: 'gray' };
                return (
                  <div key={`${item.id}-${idx}`} className={`inv-item ${meta.rarity}`}>
                    <span className="icon">{meta.icon}</span>
                    <div className="details">
                      <span className="name">{meta.name}</span>
                      <span className="count">x{item.amount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <GachaAnimation
          isPlaying={isPlaying}
          hasNewItem={this.state.hasNewItem}
          rarity={currentRarity}
          rewards={rewards}
          onComplete={() => this.setState({ isPlaying: false })}
        />
      </div>
    );
  }
}

export default GachaTestApp;

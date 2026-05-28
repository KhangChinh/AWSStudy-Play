import React, { Component } from 'react';
import GachaAnimation from './GachaAnimation';
import { IonIcon } from '@ionic/react';
import { starOutline } from 'ionicons/icons';
import './GachaTestApp.scss';

const BANNER_CONFIG = {
  featured5: { name: 'Super Nova Wings', icon: '🌌', rarity: 5 },
  featured4: { name: 'Pulse Blade', icon: '⚔️', rarity: 4 },
  others5: [
    { name: 'Golden Crown', icon: '👑', rarity: 5 },
    { name: 'Phoenix Spirit', icon: '🔥', rarity: 5 }
  ],
  others4: [
    { name: 'Neon Frame', icon: '🖼️', rarity: 4 },
    { name: 'Cosmic Dust', icon: '💫', rarity: 4 }
  ],
  standard3: [
    { name: 'P-Coin Bundle', icon: '🪙', rarity: 3 },
    { name: 'XP Potion', icon: '🧪', rarity: 3 }
  ],
};

class GachaTestApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      currentRarity: 3,
      rewards: [],
      pity5: 0,
      pity4: 0,
      guaranteed5: false, // For 50/50 system
      totalRolls: 0,
    };
  }

  //đưa lên lambda
  // Gacha Math Logic
  getRollResult = (currentP5, currentP4, forced) => {
    let p5 = currentP5 + 1;
    let p4 = currentP4 + 1;
    let { guaranteed5 } = this.state;

    let rarity = 3;
    
    // 5-Star Logic
    let rate5 = 0.006;
    if (p5 >= 74) rate5 += 0.06 * (p5 - 73); 
    if (p5 >= 90) rate5 = 1.0; 

    // 4-Star Logic
    let rate4 = 0.051;
    if (p4 >= 8) rate4 += 0.3; 
    if (p4 >= 10) rate4 = 1.0; 

    const rand = Math.random();

    if (forced) {
        rarity = forced;
    } else if (rand < rate5) {
        rarity = 5;
    } else if (rand < rate5 + rate4) {
        rarity = 4;
    }

    // Determine Item and Reset Pity
    let item;
    if (rarity === 5) {
      const isOnBanner = guaranteed5 || Math.random() < 0.5;
      if (isOnBanner) {
        item = BANNER_CONFIG.featured5;
        this.setState({ guaranteed5: false });
      } else {
        item = BANNER_CONFIG.others5[Math.floor(Math.random() * BANNER_CONFIG.others5.length)];
        this.setState({ guaranteed5: true });
      }
      p5 = 0;
    } else if (rarity === 4) {
      const isOnBanner = Math.random() < 0.5;
      item = isOnBanner ? BANNER_CONFIG.featured4 : BANNER_CONFIG.others4[Math.floor(Math.random() * BANNER_CONFIG.others4.length)];
      p4 = 0;
    } else {
      item = BANNER_CONFIG.standard3[Math.floor(Math.random() * BANNER_CONFIG.standard3.length)];
    }

    return { item, rarity, newP5: p5, newP4: p4 };
  };

  handleRoll = (count, forcedRarity) => {
    let maxRarity = 3;
    const newRewards = [];
    let tempPity5 = this.state.pity5;
    let tempPity4 = this.state.pity4;
    
    for (let i = 0; i < count; i++) {
        const res = this.getRollResult(tempPity5, tempPity4, forcedRarity);
        newRewards.push({ ...res.item, rarity: res.rarity });
        if (res.rarity > maxRarity) maxRarity = res.rarity;
        tempPity5 = res.newP5;
        tempPity4 = res.newP4;
    }
    
    this.setState({
      isPlaying: true,
      currentRarity: maxRarity,
      rewards: newRewards,
      pity5: tempPity5,
      pity4: tempPity4,
      totalRolls: this.state.totalRolls + count,
    });
  };

  render() {
    const { isPlaying, currentRarity, rewards, pity5, pity4, totalRolls, guaranteed5 } = this.state;

    return (
      <div className="app-container gacha-test-app">
        <div className="test-watermark">File này đang dùng test thiệt (Gacha System & Pity)</div>
        <h2 className="app-title"><IonIcon icon={starOutline} /> Gacha System Dashboard</h2>
        
        <div className="gacha-main">
          {/* Banner Display */}
          <div className="banner-card">
            <div className="banner-tag">Limited Banner</div>
            <div className="banner-content">
              <div className="featured-item f5">
                <div className="icon-wrap">{BANNER_CONFIG.featured5.icon}</div>
                <div className="info">
                  <span className="stars">★★★★★</span>
                  <span className="name">{BANNER_CONFIG.featured5.name}</span>
                </div>
              </div>
              <div className="featured-item f4">
                <div className="icon-wrap">{BANNER_CONFIG.featured4.icon}</div>
                <div className="info">
                  <span className="stars">★★★★</span>
                  <span className="name">{BANNER_CONFIG.featured4.name}</span>
                </div>
              </div>
            </div>
            
            <div className="banner-rates">
              <div className="rate">5★: 0.6% <span className="pity-note">(Pity 90)</span></div>
              <div className="rate">4★: 5.1% <span className="pity-note">(Pity 10)</span></div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="pity-stats">
            <div className="stat-box">
              <label>5★ Pity</label>
              <div className="value">{pity5} / 90</div>
              {pity5 >= 74 && <span className="soft-pity">Soft Pity!</span>}
            </div>
            <div className="stat-box">
              <label>4★ Pity</label>
              <div className="value">{pity4} / 10</div>
            </div>
            <div className="stat-box">
              <label>Next 5★</label>
              <div className={`value ${guaranteed5 ? 'guaranteed' : ''}`}>
                {guaranteed5 ? 'GUARANTEED' : '50/50'}
              </div>
            </div>
            <div className="stat-box">
              <label>Total Rolls</label>
              <div className="value">{totalRolls}</div>
            </div>
          </div>

          <div className="roll-controls">
            <button className="btn-roll-test x1" onClick={() => this.handleRoll(1)} disabled={isPlaying}>
              Quay x1
            </button>
            <button className="btn-roll-test x10" onClick={() => this.handleRoll(10)} disabled={isPlaying}>
              Quay x10
            </button>
          </div>
        </div>

        <GachaAnimation
          isPlaying={isPlaying}
          rarity={currentRarity}
          rewards={rewards}
          onComplete={() => this.setState({ isPlaying: false })}
        />
      </div>
    );
  }
}

export default GachaTestApp;

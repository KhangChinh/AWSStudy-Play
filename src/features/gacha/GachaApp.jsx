import React, { Component } from 'react';
import GachaAnimation from './GachaAnimation';
import { IonIcon } from '@ionic/react';
import { starOutline, timeOutline, cubeOutline, listOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import './GachaApp.scss';

// Import System Managers
import bannerManager from '../../managers/bannerManager';
import gachaManager from '../../managers/gachaManager';
import rewardManager from '../../managers/rewardManager';
import inventoryManager from '../../managers/inventoryManager';
import { ITEMS } from '../../data/items';

class GachaApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      currentRarity: 'gray',
      rewards: [],
      pity5: 0,
      pity4: 0,
      guaranteedSSR: false, // 50/50 state
      totalRolls: 0,
      activeBanner: bannerManager.getActiveBanner(),
      timeLeftStr: '',
      inventoryItems: [],
      pendingRolls: null,
      showDetails: false,
      detailPage: 0,
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
    let tempGuaranteed = this.state.guaranteedSSR;
    let maxRarity = 'gray';

    const rarityOrder = ['R', 'SR', 'SSR'];

    for (let i = 0; i < count; i++) {
      const rarity = gachaManager.calculateRoll(activeBanner, { pity5: tempPity5, pity4: tempPity4 });
      const itemId = gachaManager.getRandomItem(rarity, activeBanner, tempGuaranteed);

      if (rarity === 'SSR') {
        const isFeatured = activeBanner.featured.SSR.includes(itemId);
        tempGuaranteed = !isFeatured; // If didn't get featured, next is guaranteed
        tempPity5 = 0;
      } else {
        tempPity5++;
      }

      if (rarity === 'SR') tempPity4 = 0;
      else tempPity4++;

      const itemData = ITEMS[itemId] || { id: itemId, name: itemId, icon: '📦' };
      newRewards.push({ ...itemData, rarity });

      // Update local max rarity for animation
      if (rarityOrder.indexOf(rarity) > rarityOrder.indexOf(maxRarity)) {
        maxRarity = rarity;
      }

      // Simple pity reset logic (could be moved to manager)
      if (rarity === 'SSR') tempPity5 = 0;
      else tempPity5++;

      if (rarity === 'SR') tempPity4 = 0;
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
      // Store pending updates but don't show yet
      pendingRolls: {
        pity5: tempPity5,
        pity4: tempPity4,
        guaranteedSSR: tempGuaranteed,
        totalRolls: this.state.totalRolls + count,
        inventory: inventoryManager.getItems()
      }
    });
  };

  render() {
    const { isPlaying, currentRarity, rewards, pity5, pity4, totalRolls, activeBanner, timeLeftStr, inventoryItems } = this.state;

    return (
      <div className={`app-container gacha-app ${activeBanner.theme}`}>
        <div className="banner-tag upper-left">{activeBanner.type.toUpperCase()} {this.props.t('gacha.event')}</div>

        <div className="gacha-main-layout">
          <div className={`banner-backdrop ${activeBanner.background}`} style={{ backgroundImage: `url(${activeBanner.image})` }}>
            <div className="banner-overlay" />
          </div>

          <div className="banner-info-panel">
            <h1 className="banner-name">{activeBanner.name}</h1>
            <div className="banner-description">
              <p dangerouslySetInnerHTML={{ __html: this.props.t('gacha.rate_up_desc') }} />
              <div className="featured-list">
                <div className="featured-item gold">★ SSR: {ITEMS[activeBanner.featured.SSR[0]]?.name}</div>
                {activeBanner.featured.SR.map(id => (
                  <div key={id} className="featured-item purple">★ SR: {ITEMS[id]?.name}</div>
                ))}
              </div>
            </div>
            
            <div className="rotation-timer">
              <IonIcon icon={timeOutline} /> {this.props.t('gacha.remaining')}: {timeLeftStr}
            </div>
          </div>
        </div>

        <div className="bottom-bar">
          <div className="bottom-left">
            <button className="btn-detail-inv" onClick={() => this.setState({ showDetails: true, detailPage: 0 })}>
              {this.props.t('gacha.details')}
            </button>
            <div className="pity-summary">
              <div className="pity-line purple">
                {this.props.t('gacha.pull')}: <span className="count">{10 - pity4}</span> <span className="rank">SR-Rank</span> {this.props.t('gacha.guaranteed')}!
              </div>
              <div className="pity-line gold">
                {this.props.t('gacha.pull')}: <span className="count">{90 - pity5}</span> <span className="rank">SSR-Rank</span> {this.props.t('gacha.guaranteed')}!
              </div>
            </div>
          </div>

          <div className="bottom-right">
            <div className="roll-actions">
              <div className="roll-btn-group">
                <div className="cost-tag">🪙 x1</div>
                <button className="btn-roll x1" onClick={() => this.handleRoll(1)} disabled={isPlaying}>
                  {this.props.t('gacha.single_roll')}
                </button>
              </div>
              <div className="roll-btn-group">
                <div className="cost-tag">🪙 x10</div>
                <button className="btn-roll x10" onClick={() => this.handleRoll(10)} disabled={isPlaying}>
                  {this.props.t('gacha.ten_rolls')}
                </button>
              </div>
            </div>
          </div>
        </div>



        {this.state.showDetails && (
          <div className="gacha-details-modal">
            <div className="modal-overlay" onClick={() => this.setState({ showDetails: false })} />
            <div className="modal-content">
              <div className="modal-header">
                <h3><IonIcon icon={cubeOutline} /> {this.props.t('gacha.roll')} {this.props.t('gacha.history')} / {this.props.t('gacha.inventory')}</h3>
                <button className="close-btn" onClick={() => this.setState({ showDetails: false })}>&times;</button>
              </div>
              <div className="detail-list">
                {(() => {
                  const start = this.state.detailPage * 5;
                  const pageItems = inventoryItems.slice(start, start + 5);
                  if (inventoryItems.length === 0) return <p className="empty">{this.props.t('gacha.no_items')}</p>;
                  return pageItems.map((item, idx) => {
                    const meta = ITEMS[item.id] || { name: item.id, icon: '📦', rarity: 'R' };
                    return (
                      <div key={item.id} className={`detail-item ${meta.rarity}`}>
                        <span className="item-icon">{meta.icon}</span>
                        <div className="item-info">
                          <span className="name">{meta.name}</span>
                          <span className="rarity-tag">{meta.rarity}</span>
                        </div>
                        <span className="qty">x{item.amount}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="pagination">
                <button
                  disabled={this.state.detailPage === 0}
                  onClick={() => this.setState({ detailPage: this.state.detailPage - 1 })}
                >
                  <IonIcon icon={chevronBackOutline} />
                </button>
                <span>{this.props.t('gacha.page')} {this.state.detailPage + 1} / {Math.ceil(inventoryItems.length / 5) || 1}</span>
                <button
                  disabled={this.state.detailPage >= Math.ceil(inventoryItems.length / 5) - 1}
                  onClick={() => this.setState({ detailPage: this.state.detailPage + 1 })}
                >
                  <IonIcon icon={chevronForwardOutline} />
                </button>
              </div>
            </div>
          </div>
        )}

        <GachaAnimation
          isPlaying={isPlaying}
          hasNewItem={this.state.hasNewItem}
          rarity={currentRarity}
          rewards={rewards}
          onComplete={() => {
            const { pendingRolls } = this.state;
            this.setState({
              isPlaying: false,
              pity5: pendingRolls.pity5,
              pity4: pendingRolls.pity4,
              guaranteedSSR: pendingRolls.guaranteedSSR,
              totalRolls: pendingRolls.totalRolls,
              inventoryItems: pendingRolls.inventory
            });
          }}
        />
      </div>
    );
  }
}

export default GachaApp;

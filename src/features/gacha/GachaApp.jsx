import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { setEconomy } from '../../store/actions';
import GachaAnimation from './GachaAnimation';
import { IonIcon } from '@ionic/react';
import { timeOutline, cubeOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { toast } from 'react-toastify';
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
      historyItems: [],
      pendingRolls: null,
      showDetails: false,
      detailPage: 0,
      activeDetailTab: 'history', // 'history' or 'inventory'
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
      inventoryItems: inventoryManager.getItems(),
      historyItems: inventoryManager.getHistory(),
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
    }

    // Detecting sanity amounts for Rarity 3 rolls (simulation)
    const sanityBreakdown = newRewards.map(r => r.rarity === 'R' ? Math.floor(Math.random() * 11) + 10 : 0);

    // Process rewards through manager (Simulating server-authority flow)
    const processResult = rewardManager.processGachaResult({
      rarityMap: newRewards.map(r => r.rarity === 'SSR' ? 5 : r.rarity === 'SR' ? 4 : 3),
      items: newRewards.map((r, i) => ({ ...r, rarityIndex: i })),
      sanityBreakdown: sanityBreakdown,
      knowledgeUsed: count * 10
    });

    // Detect if any item is NEW based on processed results
    const hasNewItem = processResult.details.some(res => !res.isDuplicate && res.type !== 'currency');

    // Deduct KnowledgePoints/Sanity in Redux
    if (this.props.economy) {
      const cost = count * 10;
      if (this.props.economy.knowledgePoint < cost) {
        toast.error('Not enough Knowledge Points!');
        return;
      }

      this.props.dispatchSetEconomy({
        knowledgePoint: this.props.economy.knowledgePoint - cost
      });
    }

    this.setState({
      isPlaying: true,
      hasNewItem: hasNewItem, // Save to pass to GachaAnimation
      currentRarity: maxRarity,
      rewards: processResult.details, // Use details which include conversion info
      // Store pending updates but don't show yet
      pendingRolls: {
        pity5: tempPity5,
        pity4: tempPity4,
        guaranteedSSR: tempGuaranteed,
        totalRolls: this.state.totalRolls + count,
        inventory: inventoryManager.getItems(),
        history: inventoryManager.getHistory()
      }
    });
  };

  render() {
    const { isPlaying, currentRarity, rewards, pity5, pity4, activeBanner, timeLeftStr, inventoryItems } = this.state;

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
                <div className="cost-tag">
                  <img src="/src/assets/Sanity.png" alt="Sanity" className="cost-icon" /> x1
                </div>
                <button className="btn-roll x1" onClick={() => this.handleRoll(1)} disabled={isPlaying}>
                  {this.props.t('gacha.single_roll')}
                </button>
              </div>
              <div className="roll-btn-group">
                <div className="cost-tag">
                  <img src="/src/assets/Sanity.png" alt="Sanity" className="cost-icon" /> x10
                </div>
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
                <h3><IonIcon icon={cubeOutline} /> {this.props.t('gacha.details')}</h3>
                <button className="close-btn" onClick={() => this.setState({ showDetails: false })}>&times;</button>
              </div>

              <div className="modal-tabs">
                <button
                  className={this.state.activeDetailTab === 'history' ? 'active' : ''}
                  onClick={() => this.setState({ activeDetailTab: 'history', detailPage: 0 })}
                >
                  {this.props.t('gacha.history')}
                </button>
                <button
                  className={this.state.activeDetailTab === 'inventory' ? 'active' : ''}
                  onClick={() => this.setState({ activeDetailTab: 'inventory', detailPage: 0 })}
                >
                  {this.props.t('gacha.inventory')}
                </button>
              </div>

              <div className="detail-list">
                {(() => {
                  const isHistory = this.state.activeDetailTab === 'history';
                  const list = isHistory ? this.state.historyItems : inventoryItems;
                  const start = this.state.detailPage * 5;
                  const pageItems = list.slice(start, start + 5);

                  if (list.length === 0) return <p className="empty">{this.props.t('gacha.no_items')}</p>;

                  return pageItems.map((item, idx) => {
                    const meta = ITEMS[item.id] || { name: item.id, icon: '📦', rarity: 'R' };
                    return (
                      <div key={item.id + idx} className={`detail-item ${meta.rarity}`}>
                        <div className="item-main">
                          <div className="item-info">
                            <span className="name">{meta.name}</span>
                            <span className="rarity-tag">{meta.rarity}</span>
                          </div>
                          {!isHistory && <span className="qty">x{item.amount}</span>}
                        </div>
                        {isHistory && (
                          <div className="item-footer">
                            <span className="timestamp">
                              {new Date(item.timestamp).toLocaleString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                              })}
                            </span>
                            {item.isDuplicate && <span className="dup-label">({this.props.t('gacha.duplicate')})</span>}
                          </div>
                        )}
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
                <span>{this.props.t('gacha.page')} {this.state.detailPage + 1} / {Math.ceil((this.state.activeDetailTab === 'history' ? this.state.historyItems.length : inventoryItems.length) / 5) || 1}</span>
                <button
                  disabled={this.state.detailPage >= Math.ceil((this.state.activeDetailTab === 'history' ? this.state.historyItems.length : inventoryItems.length) / 5) - 1}
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
            if (!pendingRolls) {
              this.setState({ isPlaying: false });
              return;
            }
            this.setState({
              isPlaying: false,
              pity5: pendingRolls.pity5,
              pity4: pendingRolls.pity4,
              guaranteedSSR: pendingRolls.guaranteedSSR,
              totalRolls: pendingRolls.totalRolls,
              inventoryItems: pendingRolls.inventory,
              historyItems: pendingRolls.history
            });
          }}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  economy: state.economy
});

const mapDispatchToProps = (dispatch) => ({
  dispatchSetEconomy: (data) => dispatch(setEconomy(data))
});

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(GachaApp));

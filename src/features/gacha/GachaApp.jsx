import React, { Component } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, cubeOutline, timeOutline } from 'ionicons/icons';
import GachaAnimation from './GachaAnimation';
import bannerManager from '../../managers/bannerManager';
import inventoryManager from '../../managers/inventoryManager';
import { handleRollGachaApi } from '../../services/gachaServices';
import { resolveAssetUrl } from '../../services/profileServices';
import { setEconomy, setGachaHistory, setInventory } from '../../store/actions';
import './GachaApp.scss';

const rarityLabel = (rarity) => {
  const value = Number(rarity || 3);
  if (value >= 5) return 'SSR';
  if (value >= 4) return 'SR';
  return 'R';
};

const maxRarity = (rewards) => {
  const order = ['R', 'SR', 'SSR'];
  return rewards.reduce((best, reward) => (
    order.indexOf(reward.rarity) > order.indexOf(best) ? reward.rarity : best
  ), 'R');
};

const mapReward = (item, index) => {
  const sanityAmount = item.sanityAmount || 0;
  return {
    id: item.SK || item.name || `reward_${index}`,
    SK: item.SK,
    name: sanityAmount ? `Sanity +${sanityAmount}` : (item.name || 'Mystery Item'),
    rarity: rarityLabel(item.rarity),
    icon: item.imageUrl ? resolveAssetUrl(item.imageUrl) : (sanityAmount ? '/src/assets/Sanity.png' : undefined),
    sanityAmount,
    timestamp: Date.now() + index,
  };
};

class GachaApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      currentRarity: 'R',
      rewards: [],
      isRolling: false,
      pity5: 0,
      pity4: 0,
      guaranteedSSR: false,
      totalRolls: 0,
      activeBanner: bannerManager.getActiveBanner(),
      timeLeftStr: '',
      inventoryItems: inventoryManager.getItems(),
      historyItems: inventoryManager.getHistory(),
      pendingRolls: null,
      showDetails: false,
      detailPage: 0,
      activeDetailTab: 'history',
    };
    this.timer = null;
  }

  componentDidMount() {
    this.updateTimeDisplay();
    this.timer = setInterval(this.updateTimeDisplay, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  updateTimeDisplay = () => {
    const banner = bannerManager.getActiveBanner();
    const ms = bannerManager.getTimeRemaining(banner.id);
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

  applyRewards = (rewards) => {
    const itemRewards = rewards.filter(reward => !reward.sanityAmount);

    itemRewards.forEach(reward => {
      inventoryManager.addItem(reward.SK || reward.id, reward.amount || 1);
    });

    rewards.forEach(reward => {
      inventoryManager.history.unshift({
        ...reward,
        timestamp: reward.timestamp ? new Date(reward.timestamp).toISOString() : new Date().toISOString(),
      });
    });

    if (inventoryManager.history.length > 50) {
      inventoryManager.history = inventoryManager.history.slice(0, 50);
    }
  };

  handleRoll = async (count) => {
    this.setState({ isRolling: true, rewards: [], pendingRolls: null });

    try {
      const response = await handleRollGachaApi(count);
      if (!response?.success) throw new Error(response?.message || 'Roll failed');

      const rewards = (response.results || []).map(mapReward);
      this.applyRewards(rewards);

      if (response.newBudget) {
        this.props.setEconomy({
          pCoins: response.newBudget.eCoin ?? this.props.economy?.pCoins,
          eCoin: response.newBudget.eCoin,
          knowledgeCore: response.newBudget.knowledgeCore,
          knowledgePoint: response.newBudget.knowledgePoint,
          sanity: response.newBudget.sanity,
        });
      }

      this.props.setInventory({ items: inventoryManager.getItems() });
      this.props.setGachaHistory({ items: inventoryManager.getHistory() });

      this.setState({
        isPlaying: true,
        isRolling: false,
        currentRarity: maxRarity(rewards),
        rewards,
        hasNewItem: rewards.some(reward => reward.rarity !== 'R'),
        pendingRolls: {
          pity5: response.newGachaStats?.pity5Star ?? this.state.pity5,
          pity4: response.newGachaStats?.pity4Star ?? this.state.pity4,
          guaranteedSSR: !!response.newGachaStats?.is5StarGuaranteed,
          totalRolls: this.state.totalRolls + count,
          inventory: inventoryManager.getItems(),
          history: inventoryManager.getHistory(),
        },
      });
    } catch (error) {
      toast.error(error.message || 'Roll failed');
      this.setState({ isPlaying: false, isRolling: false, pendingRolls: null });
    }
  };

  renderDetailsModal = () => {
    const { activeDetailTab, detailPage, historyItems, inventoryItems } = this.state;
    const isHistory = activeDetailTab === 'history';
    const list = isHistory ? historyItems : inventoryItems;
    const start = detailPage * 5;
    const pageItems = list.slice(start, start + 5);
    const totalPages = Math.ceil(list.length / 5) || 1;

    return (
      <div className="gacha-details-modal">
        <div className="modal-overlay" onClick={() => this.setState({ showDetails: false })} />
        <div className="modal-content">
          <div className="modal-header">
            <h3><IonIcon icon={cubeOutline} /> {this.props.t('gacha.details')}</h3>
            <button className="close-btn" onClick={() => this.setState({ showDetails: false })}>&times;</button>
          </div>

          <div className="modal-tabs">
            <button
              className={activeDetailTab === 'history' ? 'active' : ''}
              onClick={() => this.setState({ activeDetailTab: 'history', detailPage: 0 })}
            >
              {this.props.t('gacha.history')}
            </button>
            <button
              className={activeDetailTab === 'inventory' ? 'active' : ''}
              onClick={() => this.setState({ activeDetailTab: 'inventory', detailPage: 0 })}
            >
              {this.props.t('gacha.inventory')}
            </button>
          </div>

          <div className="detail-list">
            {pageItems.length === 0 ? (
              <p className="empty">{this.props.t('gacha.no_items')}</p>
            ) : pageItems.map((item, idx) => (
              <div key={`${item.id || item.SK || item.name}-${idx}`} className={`detail-item ${item.rarity || 'R'}`}>
                <div className="item-main">
                  <div className="item-info">
                    <span className="name">{item.name || item.SK || item.id}</span>
                    <span className="rarity-tag">{item.rarity || '-'}</span>
                  </div>
                  {!isHistory && <span className="qty">x{item.amount || 1}</span>}
                </div>
                {isHistory && (
                  <div className="item-footer">
                    <span className="timestamp">{new Date(item.timestamp || Date.now()).toLocaleString('vi-VN')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pagination">
            <button disabled={detailPage === 0} onClick={() => this.setState({ detailPage: detailPage - 1 })}>
              <IonIcon icon={chevronBackOutline} />
            </button>
            <span>{this.props.t('gacha.page')} {detailPage + 1} / {totalPages}</span>
            <button disabled={detailPage >= totalPages - 1} onClick={() => this.setState({ detailPage: detailPage + 1 })}>
              <IonIcon icon={chevronForwardOutline} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const { isPlaying, isRolling, currentRarity, rewards, pity5, pity4, activeBanner, timeLeftStr } = this.state;

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
                {this.props.t('gacha.pull')}: <span className="count">{Math.max(0, 10 - pity4)}</span> <span className="rank">SR</span>
              </div>
              <div className="pity-line gold">
                {this.props.t('gacha.pull')}: <span className="count">{Math.max(0, 90 - pity5)}</span> <span className="rank">SSR</span>
              </div>
            </div>
          </div>

          <div className="bottom-right">
            <div className="roll-actions">
              <div className="roll-btn-group">
                <div className="cost-tag">
                  <img src="/src/assets/Sanity.png" alt="Core" className="cost-icon" /> x160
                </div>
                <button className="btn-roll x1" onClick={() => this.handleRoll(1)} disabled={isPlaying || isRolling}>
                  {isRolling ? 'Rolling...' : this.props.t('gacha.single_roll')}
                </button>
              </div>
              <div className="roll-btn-group">
                <div className="cost-tag">
                  <img src="/src/assets/Sanity.png" alt="Core" className="cost-icon" /> x1600
                </div>
                <button className="btn-roll x10" onClick={() => this.handleRoll(10)} disabled={isPlaying || isRolling}>
                  {isRolling ? 'Rolling...' : this.props.t('gacha.ten_rolls')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {this.state.showDetails && this.renderDetailsModal()}

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
              historyItems: pendingRolls.history,
            });
          }}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  economy: state.economy,
});

const mapDispatchToProps = (dispatch) => ({
  setEconomy: (data) => dispatch(setEconomy(data)),
  setInventory: (data) => dispatch(setInventory(data)),
  setGachaHistory: (data) => dispatch(setGachaHistory(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(GachaApp);

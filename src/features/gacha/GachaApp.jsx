import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import GachaAnimation from './GachaAnimation';
import { IonIcon } from '@ionic/react';
import { timeOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { toast } from 'react-toastify';
import './GachaApp.scss';

// Import System Managers
import bannerManager from '../../managers/bannerManager';
import { ITEMS } from '../../data/items';
import { S3_ASSETS_BASE } from '../../data/cosmetics';
import { handleGachaApi } from '../../services/gachaServices';
import { KNOWLEDGE_POINTS_PER_CORE } from '../../services/currencyServices';
import currencyAssets from '../../data/currencyAssets';

const KNOWLEDGE_CORE_PER_ROLL = 1;
const KNOWLEDGE_POINTS_PER_ROLL = KNOWLEDGE_POINTS_PER_CORE;

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
      isSubmitting: false,
      pendingConfirmRollCount: null,
    };
    this.timer = null;
  }

  getBudgetValue = (keys, fallback = 0) => {
    const profile = this.props.userProfile || {};
    const budget = profile.budget || {};

    for (const key of keys) {
      const value = budget[key] ?? profile[key];
      if (value !== undefined && value !== null) return Number(value) || 0;
    }

    return fallback;
  };

  getRollCost = (count) => {
    const requiredCore = count * KNOWLEDGE_CORE_PER_ROLL;
    const currentKnowledgeCore = Math.max(0, Math.floor(this.getBudgetValue(['knowledgeCore', 'knowledge_core'])));
    const coreCost = Math.min(currentKnowledgeCore, requiredCore);
    const missingRolls = requiredCore - coreCost;

    return {
      coreCost,
      pointCost: missingRolls * KNOWLEDGE_POINTS_PER_ROLL,
    };
  };

  renderRollCost = (count) => {
    const { coreCost, pointCost } = this.getRollCost(count);

    return (
      <>
        {coreCost > 0 && (
          <>
            <img className="cost-icon currency-img" src={currencyAssets.knowledgeCore} alt={this.props.t('common.knowledge_core')} /> x{coreCost}
          </>
        )}
        {pointCost > 0 && (
          <>
            <img className="cost-icon currency-img points" src={currencyAssets.knowledgePoint} alt={this.props.t('common.knowledge_points')} /> x{pointCost.toLocaleString()}
          </>
        )}
      </>
    );
  };

  openRollConfirm = (count) => {
    if (this.state.isPlaying || this.state.isSubmitting) return;
    const { pointCost } = this.getRollCost(count);
    if (pointCost <= 0) {
      this.handleRoll(count);
      return;
    }
    this.setState({ pendingConfirmRollCount: count });
  };

  closeRollConfirm = () => {
    if (this.state.isSubmitting) return;
    this.setState({ pendingConfirmRollCount: null });
  };

  confirmRoll = () => {
    const count = this.state.pendingConfirmRollCount;
    if (!count || this.state.isPlaying || this.state.isSubmitting) return;
    this.setState({ pendingConfirmRollCount: null }, () => this.handleRoll(count));
  };

  renderRollConfirmModal = () => {
    const count = this.state.pendingConfirmRollCount;
    if (!count) return null;

    const { t } = this.props;
    const { coreCost, pointCost } = this.getRollCost(count);
    const requiredCore = count * KNOWLEDGE_CORE_PER_ROLL;
    const missingCore = Math.max(0, requiredCore - coreCost);
    const knowledgePoints = this.getBudgetValue(['knowledgePoint', 'knowledge_points']);
    const hasEnoughPoints = pointCost <= knowledgePoints;

    return (
      <div className="gacha-confirm-modal" role="presentation" onMouseDown={this.closeRollConfirm}>
        <div className="gacha-confirm-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <div className="gacha-confirm-header">
            <h3>{t('common.knowledge_core')}</h3>
            <button type="button" className="confirm-close" onClick={this.closeRollConfirm} disabled={this.state.isSubmitting}>x</button>
          </div>

          <div className="gacha-confirm-message">
            Thiếu {missingCore.toLocaleString()} {t('common.knowledge_core')}, có muốn dùng {pointCost.toLocaleString()} {t('common.knowledge_points')} để mua?
          </div>

          <div className="gacha-confirm-consume">
            <span>Tiêu hao</span>
            <strong><img src={currencyAssets.knowledgePoint} alt={t('common.knowledge_points')} /> {pointCost.toLocaleString()}</strong>
          </div>

          {!hasEnoughPoints && (
            <div className="gacha-confirm-warning">
              {t('store.not_enough_knowledge_points')}
            </div>
          )}

          <div className="gacha-confirm-actions">
            <button type="button" className="secondary" onClick={this.closeRollConfirm} disabled={this.state.isSubmitting}>{t('common.cancel')}</button>
            <button type="button" className="primary" onClick={this.confirmRoll} disabled={!hasEnoughPoints || this.state.isSubmitting}>{t('common.confirm')}</button>
          </div>
        </div>
      </div>
    );
  };


  componentDidMount() {
    this.syncGachaStateFromProfile(this.props.userProfile);
    this.updateTimeDisplay();
    this.timer = setInterval(() => {
      this.updateTimeDisplay();
    }, 1000);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.userProfile !== this.props.userProfile) {
      this.syncGachaStateFromProfile(this.props.userProfile);
    }

    if (prevProps.inventory !== this.props.inventory || prevProps.gachaHistory !== this.props.gachaHistory) {
      this.updateLocalListsFromRedux();
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  syncGachaStateFromProfile = (profile) => {
    const stats = profile?.gachaStats;
    if (!stats) return;

    this.setState({
      pity5: Number(stats.pity5Star) || 0,
      pity4: Number(stats.pity4Star) || 0,
      guaranteedSSR: Boolean(stats.is5StarGuaranteed),
    });
  };

  updateLocalListsFromRedux = () => {
    this.setState({
      inventoryItems: this.props.inventory || [],
      historyItems: this.props.gachaHistory || [],
    });
  };

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
      inventoryItems: this.props.inventory || [],
      historyItems: this.props.gachaHistory || [],
    });
  };

  resolveRewardIcon = (reward) => {
    if (reward.imageUrl) {
      if (reward.imageUrl.startsWith('http') || reward.imageUrl.startsWith('/')) return reward.imageUrl;
      return `${S3_ASSETS_BASE}${reward.imageUrl}`;
    }

    return currencyAssets.sanity;
  };

  normalizeServerReward = (reward, index) => {
    const numericRarity = Number(reward.rarity) || 3;
    const rarity = numericRarity >= 5 ? 'SSR' : numericRarity >= 4 ? 'SR' : 'R';

    return {
      id: reward.SK || reward.id || `${reward.name || 'reward'}-${index}`,
      name: reward.name || (reward.amount ? `Sanity x${reward.amount}` : 'Sanity'),
      icon: this.resolveRewardIcon(reward),
      rarity,
      type: numericRarity === 3 ? 'currency' : 'item',
      amount: reward.amount,
      isConverted: Boolean(reward.isConverted),
      conversionResult: reward.convertedTo ? { id: 'item_sanity', amount: reward.convertedTo } : null,
      timestamp: Date.now() + index,
    };
  };

  getHighestRarity = (rewards) => {
    const rarityOrder = ['R', 'SR', 'SSR'];
    return rewards.reduce((highest, reward) => (
      rarityOrder.indexOf(reward.rarity) > rarityOrder.indexOf(highest) ? reward.rarity : highest
    ), 'R');
  };

  handleRoll = async (count) => {
    if (this.state.isPlaying || this.state.isSubmitting) return;

    this.setState({ isSubmitting: true });

    try {
      const pulledItems = await handleGachaApi(count === 10);
      const rewards = (pulledItems || []).map(this.normalizeServerReward);

      if (!rewards.length) {
        throw new Error(this.props.t('gacha.empty_rewards_error'));
      }

      this.setState({
        isSubmitting: false,
        pendingConfirmRollCount: null,
        isPlaying: true,
        hasNewItem: rewards.some((reward) => reward.type !== 'currency' && !reward.isConverted),
        currentRarity: this.getHighestRarity(rewards),
        rewards,
        pendingRolls: {
          totalRolls: this.state.totalRolls + count,
        }
      });
    } catch (error) {
      this.setState({ isSubmitting: false });
      toast.error(error.message || this.props.t('common.error'));
    }
  };

  render() {
    const { isPlaying, isSubmitting, currentRarity, rewards, pity5, pity4, activeBanner, timeLeftStr, inventoryItems } = this.state;
    const knowledgeCore = this.getBudgetValue(['knowledgeCore', 'knowledge_core']);
    const knowledgePoints = this.getBudgetValue(['knowledgePoint', 'knowledge_points']);

    return (
      <div className={`app-container gacha-app ${activeBanner.theme}`}>
        <div className="banner-tag upper-left">{activeBanner.type.toUpperCase()} {this.props.t('gacha.event')}</div>
        <div className="gacha-balance-panel" aria-label="Gacha balances">
          <div className="gacha-balance-item core" title="knowledge_core">
            <img className="currency-icon-image" src={currencyAssets.knowledgeCore} alt={this.props.t('common.knowledge_core')} />
            <span className="balance-label">{this.props.t('common.knowledge_core')}</span>
            <span className="balance-value">{knowledgeCore.toLocaleString()}</span>
          </div>
          <div className="gacha-balance-item points" title="knowledge_points">
            <img className="currency-icon-image" src={currencyAssets.knowledgePoint} alt={this.props.t('common.knowledge_points')} />
            <span className="balance-label">{this.props.t('common.knowledge_points')}</span>
            <span className="balance-value">{knowledgePoints.toLocaleString()}</span>
          </div>
        </div>

        <div className="gacha-main-layout">
          <div className={`banner-backdrop ${activeBanner.background}`} style={{ backgroundImage: `url(${activeBanner.image})` }}>
            <div className="banner-overlay" />
          </div>

          <div className="banner-info-panel">
            <h1 className="banner-name">{activeBanner.name}</h1>
            <div className="banner-description">
              <p dangerouslySetInnerHTML={{ __html: this.props.t('gacha.rate_up_desc') }} />
              <div className="featured-list">
                <div className="featured-item gold">{this.props.t('gacha.featured_ssr')}: {ITEMS[activeBanner.featured.SSR[0]]?.name}</div>
                {activeBanner.featured.SR.map(id => (
                  <div key={id} className="featured-item purple">{this.props.t('gacha.featured_sr')}: {ITEMS[id]?.name}</div>
                ))}
              </div>
            </div>

            <div className="rotation-timer">
              <IonIcon icon={timeOutline} /> {this.props.t('gacha.remaining')}: {bannerManager.isAutoRotationEnabled() ? timeLeftStr : this.props.t('gacha.infinite_time')}
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
                <button className="btn-roll x1" onClick={() => this.openRollConfirm(1)} disabled={isPlaying || isSubmitting}>
                  <span className="roll-label">{this.props.t('gacha.single_roll')}</span>
                  <span className="roll-core-cost"><img src={currencyAssets.knowledgeCore} alt={this.props.t('common.knowledge_core')} /> x 1</span>
                </button>
              </div>
              <div className="roll-btn-group">
                <button className="btn-roll x10" onClick={() => this.openRollConfirm(10)} disabled={isPlaying || isSubmitting}>
                  <span className="roll-label">{this.props.t('gacha.ten_rolls')}</span>
                  <span className="roll-core-cost"><img src={currencyAssets.knowledgeCore} alt={this.props.t('common.knowledge_core')} /> x 10</span>
                </button>
              </div>
            </div>
          </div>
        </div>



        {this.renderRollConfirmModal()}

        {this.state.showDetails && (
          <div className="gacha-details-modal">
            <div className="modal-overlay" onClick={() => this.setState({ showDetails: false })} />
            <div className="modal-content">
              <div className="modal-header">
                <h3><img className="details-currency-icon" src={currencyAssets.knowledgeCore} alt="" /> {this.props.t('gacha.details')}</h3>
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
                    const itemId = item.id || item.SK;
                    const meta = ITEMS[itemId] || { name: item.name || itemId, icon: item.imageUrl || 'Package', rarity: item.rarity || 'R' };
                    return (
                      <div key={`${itemId || item.name || 'item'}-${idx}`} className={`detail-item ${meta.rarity}`}>
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
                              {new Date(item.timestamp || item.SK || item.acquiredAt).toLocaleString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                              })}
                            </span>
                            {(item.isDuplicate || item.sanityAmount > 0) && <span className="dup-label">({this.props.t('gacha.duplicate')})</span>}
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
          t={this.props.t}
          onComplete={() => {
            const { pendingRolls } = this.state;
            if (!pendingRolls) {
              this.setState({ isPlaying: false });
              return;
            }
            this.setState({
              isPlaying: false,
              totalRolls: pendingRolls.totalRolls,
              inventoryItems: this.props.inventory || [],
              historyItems: this.props.gachaHistory || [],
            });
          }}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userProfile: state.profile.userProfile,
  inventory: state.inventory.items,
  gachaHistory: state.gacha.gachaHistory,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(GachaApp));








import React, { Component } from 'react';
import { Trans, withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import GachaAnimation from './GachaAnimation';
import { IonIcon } from '@ionic/react';
import { timeOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { toast } from 'react-toastify';
import './GachaApp.scss';

// Import System Banners Data
import { AUTO_ROTATE_BANNERS, BANNER_ROTATION_MS, BANNERS } from '../../data/banners';
import { ITEMS } from '../../data/items';
import { S3_ASSETS_BASE } from '../../data/cosmetics';
import { applyGachaResult, getGachaMasterItems, handleGachaApi } from '../../services/gachaServices';
import { KNOWLEDGE_POINTS_PER_CORE } from '../../services/currencyServices';
import { handleSyncGachaHistoryApi } from '../../services/syncService';
import currencyAssets from '../../data/currencyAssets';
const gachaItemFallback = '/assets/gacha/OR7cQ.jpg';

const KNOWLEDGE_CORE_PER_ROLL = 1;
const KNOWLEDGE_POINTS_PER_ROLL = KNOWLEDGE_POINTS_PER_CORE;

const normalizeAssetBase = (value = '') => value.replace(/\/+$/, '');
const resolveMasterItemImage = (item, fallback = '') => {
  if (!item) return fallback;
  const base = normalizeAssetBase(S3_ASSETS_BASE);
  const toAssetUrl = (assetPath) => {
    if (!assetPath) return '';
    if (/^https?:\/\//i.test(assetPath) || assetPath.startsWith('/')) return assetPath;
    const normalized = assetPath.replace(/^\/+/, '').replace(/^items\//, '');
    return `${base}/items/${normalized}`;
  };

  if (item.imageUrl) return toAssetUrl(item.imageUrl);
  if (item.itemType === 'background') return toAssetUrl(`background/${item.SK}/${item.SK}.jpg`);
  return fallback;
};

class GachaApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPlaying: false,
      currentRarity: 'gray',
      rewards: [],
      hasNewItem: false,
      pity5: 0,
      pity4: 0,
      activeBanner: BANNERS[0],
      timeLeftStr: '',
      historyItems: [],
      showDetails: false,
      detailTab: 'rates',
      detailPage: 0,
      isSubmitting: false,
      pendingConfirmRollCount: null,
      serverItems: [],
      guaranteedFiveStarItem: null,
      isLoadingHistory: false,
      pendingGachaResult: null,
    };
    this.timer = null;
  }

  handleBannerImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = gachaItemFallback;
  };

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
            <Trans
              i18nKey="gacha.missing_core_confirm"
              values={{
                missingCore: missingCore.toLocaleString(),
                pointCost: pointCost.toLocaleString(),
              }}
              components={{ number: <span className="confirm-number" /> }}
            />
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


  async componentDidMount() {
    window.addEventListener('keydown', this.handleRollKeyDown, true);
    this.syncGachaStateFromProfile(this.props.userProfile);
    this.updateBannerTime();
    this.timer = window.setInterval(this.updateBannerTime, 1000);
    this.setState({
      historyItems: this.props.gachaHistory || [],
    });
    try {
      const serverItems = await getGachaMasterItems();
      const guaranteedFiveStarItem = this.pickRandomGuaranteedFiveStar(serverItems);
      this.setState({ serverItems, guaranteedFiveStarItem });
    } catch (error) {
      console.warn('[GachaApp] Could not load gacha items:', error.message);
    }
  }

  componentWillUnmount() {
    if (this.timer) window.clearInterval(this.timer);
    window.removeEventListener('keydown', this.handleRollKeyDown, true);
  }

  handleRollKeyDown = (event) => {
    if (event.key !== 'Escape' || (!this.state.isPlaying && !this.state.isSubmitting)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  };

  handleAnimationComplete = async () => {
    const result = this.state.pendingGachaResult;
    try {
      if (result) await applyGachaResult(result);
    } catch (error) {
      console.warn('[GachaApp] Could not apply completed roll result:', error.message);
    } finally {
      this.setState({
        isPlaying: false,
        pendingGachaResult: null,
        historyItems: this.props.gachaHistory || [],
      });
    }
  };

  pickRandomGuaranteedFiveStar = (items = this.state.serverItems) => {
    const candidates = items.filter(item => Number(item.rarity) === 5 && item.isLimited === true);
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  };

  updateBannerTime = () => {
    const now = Date.now();

    if (AUTO_ROTATE_BANNERS && BANNERS.length > 1) {
      const rotationSlot = Math.floor(now / BANNER_ROTATION_MS);
      const activeBanner = BANNERS[rotationSlot % BANNERS.length];
      const remainingMs = BANNER_ROTATION_MS - (now % BANNER_ROTATION_MS);
      const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const pad = value => String(value).padStart(2, '0');

      this.setState(prevState => ({
        activeBanner,
        timeLeftStr: `${pad(minutes)}:${pad(seconds)}`,
        guaranteedFiveStarItem: prevState.activeBanner.id === activeBanner.id
          ? prevState.guaranteedFiveStarItem
          : this.pickRandomGuaranteedFiveStar(prevState.serverItems),
      }));
      return;
    }

    const endAt = new Date(this.state.activeBanner?.endTime).getTime();
    if (!Number.isFinite(endAt)) {
      this.setState({ timeLeftStr: this.props.t('gacha.infinite_time') });
      return;
    }

    const remainingMs = Math.max(0, endAt - now);
    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = value => String(value).padStart(2, '0');
    this.setState({ timeLeftStr: `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` });
  };

  componentDidUpdate(prevProps) {
    if (prevProps.userProfile !== this.props.userProfile) {
      this.syncGachaStateFromProfile(this.props.userProfile);
    }

    if (prevProps.gachaHistory !== this.props.gachaHistory) {
      this.updateLocalListsFromRedux();
    }
  }

  syncGachaStateFromProfile = (profile) => {
    const stats = profile?.gachaStats;
    if (!stats) return;

    this.setState({
      pity5: Number(stats.pity5Star) || 0,
      pity4: Number(stats.pity4Star) || 0,
    });
  };

  updateLocalListsFromRedux = () => {
    this.setState({
      historyItems: this.props.gachaHistory || [],
    });
  };

  resolveRewardIcon = (reward) => (
    reward?.imageUrl ? resolveMasterItemImage(reward) : currencyAssets.sanity
  );

  normalizeServerReward = (reward, index) => {
    const rewardId = reward.SK || reward.id || reward.itemId;
    const masterItem = this.state.serverItems.find(item => (
      (rewardId && (item.SK === rewardId || item.id === rewardId))
      || (reward.name && item.name === reward.name)
    ));
    const localItem = (rewardId && ITEMS[rewardId])
      || Object.values(ITEMS).find(item => item.name === reward.name);
    const isSanityReward = reward.type === 'sanity'
      || reward.name === 'Sanity'
      || Boolean(reward.amount && !masterItem && !localItem);
    const canonicalItemRarity = masterItem?.rarity ?? localItem?.rarity;
    const numericRarity = isSanityReward
      ? 3
      : (Number(canonicalItemRarity ?? reward.rarity) || 3);
    const rarityValue = numericRarity >= 5 ? 5 : numericRarity >= 4 ? 4 : 3;
    const canonicalIcon = masterItem
      ? resolveMasterItemImage(masterItem, localItem?.icon || '')
      : localItem?.icon;

    return {
      id: reward.SK || reward.id || `${reward.name || 'reward'}-${index}`,
      name: reward.name || (reward.amount ? `Sanity x${reward.amount}` : 'Sanity'),
      icon: canonicalIcon || this.resolveRewardIcon(reward),
      rarity: rarityValue,
      type: rarityValue === 3 ? 'currency' : 'item',
      amount: reward.amount,
      isConverted: Boolean(reward.isConverted),
      conversionResult: reward.convertedTo ? {
        id: 'item_sanity',
        name: `Sanity x${reward.convertedTo}`,
        icon: currencyAssets.sanity,
        amount: reward.convertedTo,
      } : null,
      timestamp: Date.now() + index,
    };
  };

  getHighestRarity = (rewards) => {
    return rewards.reduce((highest, reward) => (
      Number(reward.rarity) > Number(highest) ? reward.rarity : highest
    ), 3);
  };


  getItemMeta = (item) => {
    const itemId = item?.itemId || item?.id || item?.SK;
    if (itemId && ITEMS[itemId]) return ITEMS[itemId];

    const itemName = (item?.name || '').toLowerCase();
    if (!itemName) return null;

    return Object.values(ITEMS).find(meta => meta.name?.toLowerCase() === itemName) || null;
  };

  getBannerRateRows = () => {
    const { activeBanner } = this.state;
    const rates = activeBanner?.rates || {};
    const serverItems = this.state.serverItems;
    const groups = [];

    const addGroup = (star) => {
      const tierRate = Number(rates[star] || 0);
      const remoteItems = serverItems.filter(item => Number(item.rarity) === star);
      const fallbackIds = activeBanner?.featured?.[star] || [];
      let sourceItems = remoteItems.length ? remoteItems : fallbackIds.map(id => ITEMS[id] || { id, name: id, rarity: star });

      if (star === 3 && !sourceItems.some(item => (item.SK || item.id) === 'item_sanity')) {
        sourceItems = [...sourceItems, ITEMS.item_sanity || { id: 'item_sanity', name: 'Sanity', rarity: 3 }];
      }

      const itemRate = sourceItems.length ? tierRate / sourceItems.length : tierRate;
      const items = sourceItems.map(item => ({ id: item.SK || item.id, name: item.name || item.SK || item.id, rarity: star, rate: itemRate }));
      if (items.length) groups.push({ star, items });
    };

    addGroup(5);
    addGroup(4);
    addGroup(3);


    return groups;
  };

  // Returns CSS class for rarity: 'star-5' | 'star-4' | 'star-3'
  getHistoryRarityClass = (rarity) => {
    const value = Number(rarity);
    if (value === 5) return 'star-5';
    if (value === 4) return 'star-4';
    return 'star-3';
  };

  handleNextHistoryPage = async () => {
    const { detailPage, historyItems, isLoadingHistory } = this.state;
    const loadedPages = Math.ceil(historyItems.length / 5);

    if (detailPage < loadedPages - 1) {
      this.setState({ detailPage: detailPage + 1 });
      return;
    }

    if (isLoadingHistory || !this.props.gachaHistoryHasMore) return;

    this.setState({ isLoadingHistory: true });
    const result = await handleSyncGachaHistoryApi();
    this.setState({ isLoadingHistory: false });

    if (result?.gachaHistory?.length) {
      this.setState({ detailPage: detailPage + 1 });
    }
  };

  handleHistoryTabOpen = async () => {
    this.setState({ detailTab: 'history', detailPage: 0 });
    if (this.state.historyItems.length > 0 || this.state.isLoadingHistory || !this.props.gachaHistoryHasMore) return;

    this.setState({ isLoadingHistory: true });
    await handleSyncGachaHistoryApi();
    this.setState({ isLoadingHistory: false });
  };

  handleRoll = async (count) => {
    if (this.state.isPlaying || this.state.isSubmitting) return;

    this.setState({ isSubmitting: true });

    try {
      const result = await handleGachaApi(count === 10);
      const rewards = (result?.pulledItems || []).map(this.normalizeServerReward);

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
        pendingGachaResult: result,
      });
    } catch (error) {
      this.setState({ isSubmitting: false });
      toast.error(error.message || this.props.t('common.error'));
    }
  };

  render() {
    const { isPlaying, isSubmitting, currentRarity, rewards, pity5, pity4, activeBanner, timeLeftStr } = this.state;
    const knowledgeCore = this.getBudgetValue(['knowledgeCore', 'knowledge_core']);
    const knowledgePoints = this.getBudgetValue(['knowledgePoint', 'knowledge_points']);
    const guaranteedFiveStarItem = this.state.guaranteedFiveStarItem;
    const fallbackFiveStar = ITEMS[activeBanner.featured[5]?.[0]];
    const featuredFiveStar = guaranteedFiveStarItem || fallbackFiveStar;
    const featuredFourStars = this.state.serverItems.filter(item => Number(item.rarity) === 4 && item.isLimited === true).slice(0, 2);
    const displayedFourStars = featuredFourStars.length ? featuredFourStars : (activeBanner.featured[4] || []).map(id => ITEMS[id]).filter(Boolean);
    const bannerImage = resolveMasterItemImage(featuredFiveStar, gachaItemFallback);

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
          <div
            className={`banner-backdrop ${activeBanner.background}`}
            style={{ backgroundImage: `url("${bannerImage}"), url("${gachaItemFallback}")` }}
          >
            <div className="banner-overlay" />
          </div>

          <div className="banner-info-panel">
            <h1 className="banner-name">{activeBanner.name}</h1>
            <div className="banner-description">
              <div className="featured-list">
                {featuredFiveStar && (
                  <div className="featured-item gold">
                    <span>{this.props.t('gacha.featured_5_star')}: {featuredFiveStar.name}</span>
                  </div>
                )}
                {displayedFourStars.map(item => (
                  <div key={item.SK || item.id} className="featured-item purple">
                    <span>{this.props.t('gacha.featured_4_star')}: {item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rotation-timer">
              <IonIcon icon={timeOutline} /> {this.props.t('gacha.remaining')}: <span>{timeLeftStr || this.props.t('gacha.infinite_time')}</span>
            </div>
          </div>
        </div>

        <div className="bottom-bar">
          <div className="bottom-left">
            <button className="btn-detail-inv" onClick={() => this.setState({ showDetails: true, detailTab: 'rates', detailPage: 0 })}>
              {this.props.t('gacha.details')}
            </button>
            <div className="pity-summary">
              <div className="pity-line purple">
                {this.props.t('gacha.pull')}: <span className="count">{10 - pity4}</span> <span className="rank">4★</span> {this.props.t('gacha.guaranteed')}!
              </div>
              <div className="pity-line gold">
                {this.props.t('gacha.pull')}: <span className="count">{80 - pity5}</span> <span className="rank">5★</span> {this.props.t('gacha.guaranteed')}!
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
                <button className={this.state.detailTab === 'rates' ? 'active' : ''} onClick={() => this.setState({ detailTab: 'rates' })}>{this.props.t('gacha.details')}</button>
                <button className={this.state.detailTab === 'history' ? 'active' : ''} onClick={this.handleHistoryTabOpen}>{this.props.t('gacha.history')}</button>
              </div>

              {this.state.detailTab === 'rates' ? (
                <div className="detail-list rate-list">
                  {this.getBannerRateRows().map(group => {
                    const starLabel = `${group.star}\u2605`;
                    const tierClass = group.star === 5 ? 'star-5' : group.star === 4 ? 'star-4' : 'star-3';
                    return (
                      <div key={group.star} className={`rate-group ${tierClass}`}>
                        <div className="rate-group-header">{starLabel}</div>
                        <div className="rate-group-items">
                          {group.items.map(row => (
                            <div key={row.id} className="rate-row">
                              <span className="name">{row.name}</span>
                              <span className="rate-value">{(row.rate * 100).toFixed(2)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="detail-list">
                    {(() => {
                      const list = this.state.historyItems;
                      const start = this.state.detailPage * 5;
                      const pageItems = list.slice(start, start + 5);

                      if (list.length === 0) return <p className="empty">{this.props.t('gacha.no_items')}</p>;

                      return pageItems.map((item, idx) => {
                        const itemId = item.itemId || item.id || item.SK;
                        const meta = this.getItemMeta(item) || {
                          name: item.name || itemId || 'Reward',
                          icon: item.imageUrl || 'Package',
                          rarity: this.getHistoryRarityClass(item.rarity),
                        };
                        const rarityClass = this.getHistoryRarityClass(meta.rarity || item.rarity);

                        return (
                          <div key={`${item.SK || item.timestamp || itemId || item.name || 'item'}-${idx}`} className={`detail-item ${rarityClass}`}>
                            <div className="item-main">
                              <div className="item-info">
                                <span className="name">{meta.name}</span>
                                <span className="rarity-tag">{rarityClass === 'star-5' ? '5★' : rarityClass === 'star-4' ? '4★' : '3★'}</span>
                              </div>
                            </div>
                            <div className="item-footer">
                              <span className="timestamp">
                                {new Date(item.timestamp || item.SK || item.acquiredAt).toLocaleString('vi-VN', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit', second: '2-digit'
                                })}
                              </span>
                              {(item.isDuplicate || item.sanityAmount > 0) && <span className="dup-label">({this.props.t('gacha.duplicate')})</span>}
                            </div>
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
                    <span>
                      {this.props.t('gacha.page')} {this.state.detailPage + 1} / {Math.ceil(this.state.historyItems.length / 5) || 1}
                      {this.props.gachaHistoryHasMore ? '+' : ''}
                    </span>
                    <button
                      disabled={
                        this.state.isLoadingHistory
                        || (
                          this.state.detailPage >= Math.ceil(this.state.historyItems.length / 5) - 1
                          && !this.props.gachaHistoryHasMore
                        )
                      }
                      onClick={this.handleNextHistoryPage}
                    >
                      <IonIcon icon={chevronForwardOutline} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <GachaAnimation
          isPlaying={isPlaying}
          hasNewItem={this.state.hasNewItem}
          rarity={currentRarity}
          rewards={rewards}
          t={this.props.t}
          onComplete={this.handleAnimationComplete}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userProfile: state.profile.userProfile,
  gachaHistory: state.gacha.gachaHistory,
  gachaHistoryHasMore: state.gacha.hasMore,
});

export default connect(mapStateToProps)(withTranslation()(GachaApp));







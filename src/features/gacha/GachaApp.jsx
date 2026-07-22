import { Component } from 'react';
import { Trans, withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import GachaAnimation from './GachaAnimation';
import { IonIcon } from '@ionic/react';
import { timeOutline, menuOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { toast } from 'react-toastify';
import './GachaApp.scss';

import { S3_ASSETS_BASE } from '../../data/cosmetics';
import BackgroundCssThumbnail from '../../components/BackgroundCssThumbnail';
import RankFrame from '../../components/RankFrame';
import { cosmeticManager } from '../../services/cosmeticServices';
import { applyGachaResult, getGachaMasterItems, handleGachaApi } from '../../services/gachaServices';
import { KNOWLEDGE_POINTS_PER_CORE } from '../../services/currencyServices';
import { handleSyncGachaHistoryApi } from '../../services/syncService';
import currencyAssets from '../../data/currencyAssets';
import { buildBannerDetails, GACHA_CONFIGS, PET_IDLE_THUMBNAILS } from './bannerDetails';

const KNOWLEDGE_CORE_PER_ROLL = 1;
const KNOWLEDGE_POINTS_PER_ROLL = KNOWLEDGE_POINTS_PER_CORE;
const getNextBannerRefreshUtcSeconds = (durationDays = 1) => {
  const now = new Date();
  const nextRefresh = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    17, 0, 0, 0
  );
  const nextRefreshMs = nextRefresh > now.getTime()
    ? nextRefresh
    : nextRefresh + (24 * 60 * 60 * 1000);
  return Math.floor((nextRefreshMs + (Math.max(1, Number(durationDays) || 1) - 1) * 86400000) / 1000);
};

const resolveBannerExpiresAt = (expiresAt, durationDays = 1) => {
  const serverExpiresAt = Number(expiresAt);
  const nowSeconds = Math.floor(Date.now() / 1000);
  return Number.isFinite(serverExpiresAt) && serverExpiresAt > nowSeconds
    ? serverExpiresAt
    : getNextBannerRefreshUtcSeconds(durationDays);
};
const formatRemainingTime = (expiresAt) => {
  const secondsLeft = Math.max(0, Number(expiresAt || 0) - Math.floor(Date.now() / 1000));
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const clock = [hours, minutes].map(value => String(value).padStart(2, '0')).join(':');
  return days > 0 ? `${days}d ${clock}` : clock;
};

const BANNER_TYPE_LABELS = {
  background: 'Background',
  frame: 'Frame',
  title: 'Title',
  pet: 'Pets',
};
const normalizeAssetBase = (value = '') => value.replace(/\/+$/, '');
const toCloudAssetUrl = (assetPath) => {
  if (!assetPath) return '';
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  const base = normalizeAssetBase(S3_ASSETS_BASE);
  const normalized = assetPath.replace(/^\/+/, '').replace(/^items\//, '');
  return `${base}/items/${normalized}`;
};

const resolveMasterItemAsset = (item) => {
  if (!item) return '';
  if (item.itemType === 'pet') return toCloudAssetUrl(item.assets?.idle);
  if (!item.assets?.css) return '';
  return { kind: 'css', itemType: item.itemType, itemId: item.SK || item.id, cssPath: item.assets.css, item };
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
      activeBanner: GACHA_CONFIGS[0],
      bannerId: GACHA_CONFIGS[0].bannerId,
      bannerConfigs: GACHA_CONFIGS,
      bannerExpiresAt: getNextBannerRefreshUtcSeconds(),
      banner: null,
      timeLeftStr: formatRemainingTime(getNextBannerRefreshUtcSeconds()),
      historyItems: [],
      showDetails: false,
      detailTab: 'rates',
      detailPage: 0,
      isSubmitting: false,
      pendingConfirmRollCount: null,
      serverItems: [],
      isLoadingHistory: false,
      pendingGachaResult: null,
    };
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


  loadBannerData = (bannerId) => {
    const config = this.state.bannerConfigs.find(item => item.bannerId === bannerId);
    if (!config) return;

    const banner = config.rawBanner;

    this.setState({
      bannerId: config.bannerId,
      activeBanner: config,
      banner,
      bannerExpiresAt: resolveBannerExpiresAt(banner?.expiresAt, config.durationDays),
    }, this.updateBannerCountdown);
  };

  handleBannerChange = (bannerId) => {
    if (this.state.isPlaying || this.state.isSubmitting || bannerId === this.state.bannerId) return;
    this.loadBannerData(bannerId);
  };

  async componentDidMount() {
    window.addEventListener('keydown', this.handleRollKeyDown, true);
    this.syncGachaStateFromProfile(this.props.userProfile);
    this.bannerCountdownTimer = window.setInterval(this.updateBannerCountdown, 30000);
    this.setState({ historyItems: this.props.gachaHistory || [] });

    try {
      const masterData = await getGachaMasterItems();
      const serverItems = masterData.items || [];
      const bannerConfigs = this.state.bannerConfigs.map(config => ({
        ...config,
        rawBanner: buildBannerDetails(config, serverItems),
      }));
      await cosmeticManager.loadFromMasterData(serverItems);

      this.setState({ serverItems, bannerConfigs }, () => {
        this.loadBannerData(this.state.bannerId);
      });
    } catch (error) {
      console.warn('[GachaApp] Could not load Gacha items:', error.message);
      toast.error(this.props.t('gacha.banner_load_failed'));

    }
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleRollKeyDown, true);
    window.clearInterval(this.bannerCountdownTimer);
  }

  updateBannerCountdown = () => {
    this.setState(({ bannerExpiresAt }) => ({ timeLeftStr: formatRemainingTime(bannerExpiresAt) }));
  };

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
    reward?.type === 'sanity' ? currencyAssets.sanity : resolveMasterItemAsset(reward)
  );

  normalizeServerReward = (reward, index) => {
    const rewardId = reward.SK || reward.id || reward.itemId;
    const masterItem = this.state.serverItems.find(item => (
      (rewardId && (item.SK === rewardId || item.id === rewardId))
      || (reward.name && item.name === reward.name)
    ));
    const sanityNameMatch = String(reward.name || '').match(/^Sanity(?:\s+x(\d+))?$/i);
    const isSanityReward = reward.type === 'sanity'
      || Boolean(sanityNameMatch)
      || Boolean(reward.amount && !masterItem);
    const sanityAmount = Number(reward.amount) || Number(sanityNameMatch?.[1]) || 0;
    const canonicalItemRarity = masterItem?.rarity;
    const numericRarity = isSanityReward
      ? 3
      : (Number(canonicalItemRarity ?? reward.rarity) || 3);
    const rarityValue = numericRarity >= 5 ? 5 : numericRarity >= 4 ? 4 : 3;
    const canonicalIcon = masterItem ? resolveMasterItemAsset(masterItem) : '';

    return {
      id: reward.SK || reward.id || `${reward.name || 'reward'}-${index}`,
      name: reward.name || (reward.amount ? `Sanity x${reward.amount}` : 'Sanity'),
      icon: isSanityReward ? currencyAssets.sanity : (canonicalIcon || this.resolveRewardIcon(reward)),
      rarity: rarityValue,
      type: isSanityReward ? 'currency' : 'item',
      amount: sanityAmount || reward.amount,
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


  renderBannerThumbnail = (item) => {
    const itemId = item?.SK || item?.id || '';
    if (item?.itemType === 'frame') {
      return (
        <span className="rate-item-thumbnail frame">
          <RankFrame tier={itemId.replace(/^frame_/, '') || 'none'} size={72} />
        </span>
      );
    }
    if (item?.itemType === 'title') {
      return (
        <span className={'rate-item-thumbnail title profile-title-' + itemId}>
          [{item.name || itemId}]
        </span>
      );
    }
    if (item?.itemType === 'pet') {
      const petUrl = toCloudAssetUrl(item.assets?.idle || item.assets?.sitting);
      const layout = PET_IDLE_THUMBNAILS[itemId] || { frames: 1, width: 32, height: 32 };
      const previewWidth = Math.min(96, Math.round(54 * layout.width / layout.height));
      return petUrl
        ? (
          <span className="rate-item-thumbnail pet">
            <span
              className="pet-sprite-frame"
              role="img"
              aria-label={item.name || itemId}
              style={{
                width: `${previewWidth}px`,
                backgroundImage: `url('${petUrl}')`,
                backgroundSize: `${layout.frames * 100}% 100%`,
              }}
            />
          </span>
        )
        : <span className="rate-item-thumbnail fallback">PET</span>;
    }
    return <BackgroundCssThumbnail item={item} className="rate-bg-thumbnail" />;
  };
  getItemMeta = (item) => {
    const itemId = item?.itemId || item?.id || item?.SK;
    const itemName = (item?.name || '').toLowerCase();
    return this.state.serverItems.find(meta => (
      (itemId && (meta.SK === itemId || meta.id === itemId))
      || (itemName && meta.name?.toLowerCase() === itemName)
    )) || null;
  };

  getBannerItemRate = (star, isRateUp) => {
    const banner = this.state.banner;
    const pool = banner?.pool;
    if (!banner || !pool) return 0;

    const tierRate = Number(star === 5 ? banner.rates?.base5Star : banner.rates?.base4Star) || 0;
    const rateUpChance = Number(banner.rates?.rateUpChance ?? 0.5);
    const rateUpItems = star === 5 ? (pool.rateUp5 || []) : (pool.rateUp4 || []);
    const standardItems = star === 5 ? (pool.standard5 || []) : (pool.standard4 || []);
    const sourceItems = isRateUp ? rateUpItems : standardItems;
    if (!sourceItems.length) return 0;

    const categoryChance = isRateUp
      ? (standardItems.length ? rateUpChance : 1)
      : (1 - rateUpChance);
    return (tierRate * categoryChance) / sourceItems.length;
  };

  getBannerRateRows = () => {
    const banner = this.state.banner;
    if (!banner?.pool) return [];

    const groups = [];

    const addGroup = (star) => {
      const rateUpItems = star === 5 ? (banner.pool.rateUp5 || []) : (banner.pool.rateUp4 || []);
      const standardItems = star === 5 ? (banner.pool.standard5 || []) : (banner.pool.standard4 || []);
      const rowsById = new Map();

      const addItems = (items, isRateUp) => {
        const itemRate = this.getBannerItemRate(star, isRateUp);

        items.forEach(item => {
          const id = item.SK || item.id;
          const existing = rowsById.get(id);
          rowsById.set(id, {
            id,
            name: item.name || id,
            rarity: star,
            rate: (existing?.rate || 0) + itemRate,
            isRateUp: Boolean(existing?.isRateUp || isRateUp),
            item,
          });
        });
      };

      addItems(rateUpItems, true);
      addItems(standardItems, false);

      const items = Array.from(rowsById.values());
      if (items.length) groups.push({ star, items });
    };

    addGroup(5);
    addGroup(4);
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
      const result = await handleGachaApi(count === 10, this.state.bannerId);
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
    } catch {
      this.setState({ isSubmitting: false });
      toast.error(this.props.t('gacha.action_failed'));
    }
  };

  render() {
    const { isPlaying, isSubmitting, currentRarity, rewards, pity5, pity4, activeBanner, timeLeftStr } = this.state;
    const knowledgeCore = this.getBudgetValue(['knowledgeCore', 'knowledge_core']);
    const knowledgePoints = this.getBudgetValue(['knowledgePoint', 'knowledge_points']);
    const featuredFiveStar = this.state.banner?.pool?.rateUp5?.[0] || null;
    const featuredFourStars = this.state.banner?.pool?.rateUp4 || [];

    return (
      <div className="app-container gacha-app theme-solar">
        <nav className="banner-switcher upper-left" aria-label="Chuyển banner Gacha">
          {this.state.bannerConfigs.map(config => (
            <button
              type="button"
              key={config.bannerId}
              className={config.bannerId === this.state.bannerId ? 'active' : ''}
              onClick={() => this.handleBannerChange(config.bannerId)}
              disabled={isPlaying || isSubmitting}
              title={config.name}
            >
              {BANNER_TYPE_LABELS[config.itemType] || config.itemType}
            </button>
          ))}
        </nav>
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
        <button
          type="button"
          className="gacha-details-trigger"
          aria-label={this.props.t('gacha.details')}
          title={this.props.t('gacha.details')}
          onClick={() => this.setState({ showDetails: true, detailTab: 'rates', detailPage: 0 })}
        >
          <IonIcon icon={menuOutline} />
        </button>


        <div className="gacha-main-layout">
          <div className="banner-backdrop solar-bg">
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
                {featuredFourStars.map(item => (
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

          <div className="bottom-right">
            <div className="pity-summary" aria-label={`Banner ${this.state.bannerId}`}>
              <div className="pity-line purple">
                {this.props.t('gacha.pull')}: <span className="count">{Math.max(0, Number(this.state.banner?.rates?.pity4StarLimit || 10) - pity4)}</span> <span className="rank">4★</span> {this.props.t('gacha.guaranteed')}!
              </div>
              <div className="pity-line gold">
                {this.props.t('gacha.pull')}: <span className="count">{Math.max(0, Number(this.state.banner?.rates?.pity5StarLimit || 80) - pity5)}</span> <span className="rank">5★</span> {this.props.t('gacha.guaranteed')}!
              </div>
            </div>
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
                              <span className="rate-thumbnail-wrap">
                                {this.renderBannerThumbnail(row.item)}
                                {row.isRateUp && <strong className="rate-up-badge">UP</strong>}
                              </span>
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
                          icon: 'Package',
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







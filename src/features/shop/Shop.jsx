import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import { cartOutline, cart, personCircleOutline } from 'ionicons/icons';
import { toast } from 'react-toastify';
import { buyShopItemApi, getShopApi } from '../../services/shopServices';
import { assetUrl, cosmeticManager } from '../../services/cosmeticServices';
import { handleConvertPointsAction, KNOWLEDGE_POINTS_PER_CORE } from '../../services/currencyServices';
import currencyAssets from '../../data/currencyAssets';
import RankFrame from '../../components/RankFrame';
import BackgroundCssThumbnail from '../../components/BackgroundCssThumbnail';
import './Shop.scss';

const CORE_PRICE = KNOWLEDGE_POINTS_PER_CORE;

const normalizeShopItem = (item) => ({
  ...item,
  owned: item.isOwned ?? item.owned ?? false,
});

const getShopItemPreviewUrl = (item) => (
  item?.itemType === 'pet'
    ? (item?.assets?.idle || item?.imageUrl || '')
    : (item?.itemType === 'background' ? '' : (item?.imageUrl || ''))
);

const getShopItemId = (item) => String(item?.itemId || item?.SK || '').replace(/^item#/, '');
const getBudgetValue = (profile, keys) => {
  const budget = profile?.budget || {};
  const aliases = {
    eCoin: ['eCoin', 'ecoin', 'e_coin', 'ECoin'],
    knowledgePoint: ['knowledgePoint', 'knowledge_points'],
    knowledgeCore: ['knowledgeCore', 'knowledge_core'],
  };
  const expandedKeys = keys.flatMap((key) => aliases[key] || [key]);
  for (const key of expandedKeys) {
    const value = budget[key] ?? profile?.[key];
    if (value !== undefined && value !== null) return Number(value) || 0;
  }
  return 0;
};

class Shop extends Component {
  coreModalRef = React.createRef();
  coreModalTriggerRef = React.createRef();

  state = {
    coreAmount: 1,
    isLoadingShop: false,
    buyingKey: null,
    isCoreModalOpen: false,
  };

  componentDidMount() {
    this.loadShop();
    document.addEventListener('keydown', this.handleModalKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleModalKeyDown);
  }

  componentDidUpdate(prevProps) {
    const prevMax = this.getMaxCoreAmount(prevProps.userProfile);
    const nextMax = this.getMaxCoreAmount(this.props.userProfile);
    if (prevMax !== nextMax && this.state.coreAmount > Math.max(1, nextMax)) {
      this.setState({ coreAmount: Math.max(1, nextMax) });
    }
  }

  getMaxCoreAmount = (profile = this.props.userProfile) => {
    const knowledgePoint = getBudgetValue(profile, ['knowledgePoint', 'knowledge_points']);
    return Math.floor(knowledgePoint / CORE_PRICE);
  };

  loadShop = async () => {
    this.setState({ isLoadingShop: true });
    await getShopApi();
    this.setState({ isLoadingShop: false });
  };

  handleCoreAmountChange = (event) => {
    const maxAmount = this.getMaxCoreAmount();
    const value = Math.max(1, Math.min(maxAmount || 1, Number(event.target.value) || 1));
    this.setState({ coreAmount: value });
  };

  handleModalKeyDown = (event) => {
    if (event.key === 'Escape' && this.state.isCoreModalOpen) this.closeCoreModal();
  };

  openCoreModal = () => {
    const maxAmount = this.getMaxCoreAmount();
    if (maxAmount <= 0) {
      toast.error(this.props.t('store.not_enough_knowledge_points'));
      return;
    }
    this.setState(
      { isCoreModalOpen: true, coreAmount: Math.min(this.state.coreAmount, maxAmount) || 1 },
      () => this.coreModalRef.current?.focus(),
    );
  };

  closeCoreModal = () => {
    if (this.state.buyingKey === 'knowledgeCore') return;
    this.setState({ isCoreModalOpen: false }, () => this.coreModalTriggerRef.current?.focus());
  };

  handleBuyCore = async () => {
    const maxAmount = this.getMaxCoreAmount();
    const amount = Math.min(this.state.coreAmount, maxAmount);
    if (amount <= 0) {
      toast.error(this.props.t('store.not_enough_knowledge_points'));
      return;
    }

    this.setState({ buyingKey: 'knowledgeCore' });
    try {
      const result = await handleConvertPointsAction(amount);
      if (result?.success && result.profile) {
        toast.success(this.props.t('store.purchase_success'));
        this.setState({ coreAmount: Math.max(1, this.getMaxCoreAmount(result.profile)), isCoreModalOpen: false });
      } else {
        toast.error(result?.message || this.props.t('store.purchase_failed'));
      }
    } catch (error) {
      toast.error(error.message || this.props.t('store.purchase_failed'));
    }
    this.setState({ buyingKey: null });
  };

  handleBuyShopItem = async (item) => {
    if (item.owned) return;
    const eCoin = getBudgetValue(this.props.userProfile, ['eCoin', 'ecoin']);
    if (eCoin < item.price) {
      toast.error(this.props.t('store.not_enough_ecoin'));
      return;
    }

    this.setState({ buyingKey: item.itemId });
    // Backend tra ve { profile, shop, inventory }; profile + inventory da duoc
    // ingestServerData xu ly trong buyShopItemApi. O day chi dong bo lai shop UI.
    const result = await buyShopItemApi({ itemId: item.itemId });
    if (result && !result.errCode && result.success) {
      toast.success(this.props.t('store.purchase_success'));
    } else {
      toast.error(result?.errMessage || this.props.t('store.purchase_failed'));
    }
    this.setState({ buyingKey: null });
  };

  renderBalanceHeader() {
    const { t, userProfile } = this.props;
    const eCoin = getBudgetValue(userProfile, ['eCoin', 'ecoin']);
    const knowledgePoint = getBudgetValue(userProfile, ['knowledgePoint', 'knowledge_points']);

    return (
      <div className="shop-balances">
        <div className="shop-balance-pill ecoin">
          <img src={currencyAssets.eCoin} alt={t('common.ecoin')} />
          <span>{t('common.ecoin')}</span>
          <strong>{eCoin.toLocaleString()}</strong>
        </div>
        <div className="shop-balance-pill knowledge">
          <img src={currencyAssets.knowledgePoint} alt={t('common.knowledge_points')} />
          <span>{t('common.knowledge_points')}</span>
          <strong>{knowledgePoint.toLocaleString()}</strong>
        </div>
      </div>
    );
  }

  renderCoreItem() {
    const { t } = this.props;
    const maxAmount = this.getMaxCoreAmount();
    const disabled = maxAmount <= 0 || this.state.buyingKey === 'knowledgeCore';

    return (
      <div className="store-item core-card">
        <div className="item-cover core-cover"><img src={currencyAssets.knowledgeCore} alt={t('store.items.knowledge_core')} /></div>
        <div className="item-info">
          <span className="item-title">{t('store.items.knowledge_core')}</span>
          <span className="item-price price-with-icon"><img src={currencyAssets.knowledgePoint} alt={t('common.knowledge_points')} /> {CORE_PRICE.toLocaleString()} {t('common.knowledge_points')}</span>
          <button ref={this.coreModalTriggerRef} type="button" onClick={this.openCoreModal} disabled={disabled}>
            <IonIcon icon={cart} /> {t('store.purchase')}
          </button>
        </div>
      </div>
    );
  }

  renderCoreModal() {
    if (!this.state.isCoreModalOpen) return null;

    const { t } = this.props;
    const maxAmount = this.getMaxCoreAmount();
    const amount = Math.min(this.state.coreAmount, Math.max(1, maxAmount));
    const totalCost = amount * CORE_PRICE;
    const isPurchasing = this.state.buyingKey === 'knowledgeCore';

    return (
      <div className="shop-modal-backdrop" role="presentation" onMouseDown={this.closeCoreModal}>
        <div ref={this.coreModalRef} className="shop-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-core-modal-title" tabIndex="-1" onMouseDown={(event) => event.stopPropagation()}>
          <div className="shop-modal-header">
            <div>
              <h3 id="knowledge-core-modal-title">{t('store.items.knowledge_core')}</h3>
              <p className="price-with-icon"><img src={currencyAssets.knowledgePoint} alt={t('common.knowledge_points')} /> {CORE_PRICE.toLocaleString()} {t('common.knowledge_points')} / 1</p>
            </div>
            <button className="modal-close" type="button" aria-label={t('common.close')} onClick={this.closeCoreModal} disabled={isPurchasing}>x</button>
          </div>

          <div className="quantity-panel modal-quantity-panel">
            <div className="quantity-row">
              <span>{t('store.quantity')}</span>
              <strong>{maxAmount > 0 ? amount : 0}</strong>
            </div>
            <input
              type="range"
              aria-label={t('store.quantity')}
              min="1"
              max={Math.max(1, maxAmount)}
              value={amount}
              disabled={maxAmount <= 0 || isPurchasing}
              onChange={this.handleCoreAmountChange}
            />
            <div className="quantity-meta">
              <span>{t('store.max')}: {maxAmount}</span>
              <span>{t('store.total')}: {maxAmount > 0 ? totalCost.toLocaleString() : 0}</span>
            </div>
          </div>

          <div className="shop-modal-actions">
            <button className="secondary" type="button" onClick={this.closeCoreModal} disabled={isPurchasing}>{t('common.cancel')}</button>
            <button className="primary" type="button" onClick={this.handleBuyCore} disabled={maxAmount <= 0 || isPurchasing}>
              {isPurchasing ? t('store.purchasing') : t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderItemThumbnail(item) {
    const itemId = getShopItemId(item);

    if (item.itemType === 'background') {
      const catalogItem = cosmeticManager.getCosmeticInfo('backgrounds', itemId);
      return (
        <BackgroundCssThumbnail
          item={{ ...catalogItem, ...item }}
          className="background-css-thumbnail"
        />
      );
    }
    if (item.itemType === 'frame') {
      const catalogItem = cosmeticManager.getCosmeticInfo('frames', itemId);
      const frameAsset = item.assets?.frame || item.assets?.svg || catalogItem?.frameAssetUrl || '';
      return (
        <RankFrame tier={itemId.replace(/^frame_/, '') || 'none'} size={112} frameAssetUrl={frameAsset ? assetUrl(frameAsset) : ''}>
          <IonIcon icon={personCircleOutline} />
        </RankFrame>
      );
    }

    if (item.itemType === 'title') {
      return (
        <span className={`shop-title-thumbnail profile-title-${itemId}`}>
          <span className="title-preview">[{item.name || itemId}]</span>
        </span>
      );
    }

    const previewUrl = getShopItemPreviewUrl(item);
    if (item.itemType === 'pet' && previewUrl) {
      return (
        <span
          className="pet-thumbnail"
          role="img"
          aria-label={item.name}
          style={{ backgroundImage: `url('${assetUrl(previewUrl)}')` }}
        />
      );
    }

    return previewUrl
      ? <img src={assetUrl(previewUrl)} alt={item.name} />
      : <span className="item-initial">{(item.itemType || 'IT').slice(0, 2).toUpperCase()}</span>;
  }
  renderShopItem(item) {
    const { t } = this.props;
    const disabled = item.owned || this.state.buyingKey === item.itemId;

    return (
      <div className={`store-item rarity-${item.rarity} ${item.owned ? 'owned' : ''}`} key={item.itemId}>
        <div className="item-cover shop-item-cover">
          {this.renderItemThumbnail(item)}
        </div>
        <div className="item-info">
          <span className="item-title">{item.name || item.itemId}</span>
          <span className="item-price price-with-icon"><img src={currencyAssets.eCoin} alt={t('common.ecoin')} /> {Number(item.price || 0).toLocaleString()} {t('common.ecoin')}</span>
          <button onClick={() => this.handleBuyShopItem(item)} disabled={disabled}>
            <IonIcon icon={cart} /> {item.owned ? t('store.owned') : this.state.buyingKey === item.itemId ? t('store.purchasing') : t('store.purchase')}
          </button>
        </div>
      </div>
    );
  }

  render() {
    const { t } = this.props;

    return (
      <div className="app-container store-app">
        <div className="shop-header">
          <h2 className="app-title"><IonIcon icon={cartOutline} /> {t('store.title')}</h2>
          {this.renderBalanceHeader()}
        </div>
        <div className="store-grid">
          {this.renderCoreItem()}
          {this.props.shopItems.map((item) => this.renderShopItem(item))}
        </div>
        {this.renderCoreModal()}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userProfile: state.profile.userProfile,
  shopItems: (state.shop?.activeItems || []).map(normalizeShopItem),
});

export default connect(mapStateToProps)(Shop);

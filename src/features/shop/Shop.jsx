import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import { cartOutline, cart } from 'ionicons/icons';
import { toast } from 'react-toastify';
import { setProfile, appendInventory } from '../../store/actions';
import { buyShopItemApi, getShopApi } from '../../services/shopServices';
import { handleConvertPointsAction, KNOWLEDGE_POINTS_PER_CORE } from '../../services/currencyServices';
import currencyAssets from '../../data/currencyAssets';
import './Shop.scss';

const SHOP_ID = 'eCoinShop';
const CORE_PRICE = KNOWLEDGE_POINTS_PER_CORE;

const FALLBACK_SHOP_ITEMS = [
  {
    itemId: 'item#frame_stone_1',
    name: 'Khung Thach Anh',
    imageUrl: 'https://cloudfront.net/items/theme_cyberpunk.jpg',
    rarity: 4,
    itemType: 'frame',
    currencyType: 'eCoin',
    price: 100,
    owned: false,
  },
  {
    itemId: 'item#frame_stone_2',
    name: 'Khung Obsidian',
    imageUrl: 'https://cloudfront.net/items/theme_cyberpunk.jpg',
    rarity: 5,
    itemType: 'frame',
    currencyType: 'eCoin',
    price: 2500,
    owned: false,
  },
];

const getBudgetValue = (profile, keys) => {
  const budget = profile?.budget || {};
  for (const key of keys) {
    const value = budget[key] ?? profile?.[key];
    if (value !== undefined && value !== null) return Number(value) || 0;
  }
  return 0;
};

class Shop extends Component {
  state = {
    shopItems: FALLBACK_SHOP_ITEMS,
    coreAmount: 1,
    isLoadingShop: false,
    buyingKey: null,
    isCoreModalOpen: false,
  };

  componentDidMount() {
    this.loadShop();
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
    const result = await getShopApi(SHOP_ID);
    if (result && !result.errCode && result.shop) {
      const serverItems = result.shop.activeItems || [];
      this.setState({ shopItems: serverItems.length ? serverItems : FALLBACK_SHOP_ITEMS });
    }
    this.setState({ isLoadingShop: false });
  };

  updateProfileBudget = async (budgetPatch) => {
    const nextProfile = {
      ...(this.props.userProfile || {}),
      budget: {
        ...(this.props.userProfile?.budget || {}),
        ...budgetPatch,
      },
    };
    this.props.setProfile(nextProfile);
    await window.api?.invoke('store:saveProfile', nextProfile).catch(() => {});
  };

  handleCoreAmountChange = (event) => {
    const maxAmount = this.getMaxCoreAmount();
    const value = Math.max(1, Math.min(maxAmount || 1, Number(event.target.value) || 1));
    this.setState({ coreAmount: value });
  };

  openCoreModal = () => {
    const maxAmount = this.getMaxCoreAmount();
    if (maxAmount <= 0) {
      toast.error(this.props.t('store.not_enough_knowledge_points'));
      return;
    }
    this.setState({ isCoreModalOpen: true, coreAmount: Math.min(this.state.coreAmount, maxAmount) || 1 });
  };

  closeCoreModal = () => {
    if (this.state.buyingKey === 'knowledgeCore') return;
    this.setState({ isCoreModalOpen: false });
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
    const result = await buyShopItemApi({ shopId: SHOP_ID, itemId: item.itemId });
    if (result && !result.errCode && result.item) {
      const itemType = result.item.itemType || result.itemType || 'frame';
      const branch = this.props.inventory?.[itemType] || {};
      await this.updateProfileBudget({ [result.currency || 'eCoin']: result.newBalance });
      this.props.appendInventory({ itemType, items: [result.item], lastKey: branch.lastKey || null });
      await window.api?.invoke('store:saveInventory', {
        itemType,
        inventory: [result.item],
        lastEvaluatedKey: branch.lastKey || null,
        isAppend: true,
      }).catch(() => {});
      this.setState((prev) => ({
        shopItems: prev.shopItems.map((shopItem) => shopItem.itemId === item.itemId ? { ...shopItem, owned: true } : shopItem),
      }));
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
          <button onClick={this.openCoreModal} disabled={disabled}>
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
        <div className="shop-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <div className="shop-modal-header">
            <div>
              <h3>{t('store.items.knowledge_core')}</h3>
              <p className="price-with-icon"><img src={currencyAssets.knowledgePoint} alt={t('common.knowledge_points')} /> {CORE_PRICE.toLocaleString()} {t('common.knowledge_points')} / 1</p>
            </div>
            <button className="modal-close" type="button" onClick={this.closeCoreModal} disabled={isPurchasing}>x</button>
          </div>

          <div className="quantity-panel modal-quantity-panel">
            <div className="quantity-row">
              <span>{t('store.quantity')}</span>
              <strong>{maxAmount > 0 ? amount : 0}</strong>
            </div>
            <input
              type="range"
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

  renderShopItem(item) {
    const { t } = this.props;
    const disabled = item.owned || this.state.buyingKey === item.itemId;

    return (
      <div className={`store-item rarity-${item.rarity} ${item.owned ? 'owned' : ''}`} key={item.itemId}>
        <div className="item-cover shop-item-cover">
          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span className="item-initial">{(item.itemType || 'IT').slice(0, 2).toUpperCase()}</span>}
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
          {this.state.shopItems.map((item) => this.renderShopItem(item))}
        </div>
        {this.renderCoreModal()}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userProfile: state.profile.userProfile,
  inventory: state.inventory,
});

const mapDispatchToProps = (dispatch) => ({
  setProfile: (profile) => dispatch(setProfile(profile)),
  appendInventory: (payload) => dispatch(appendInventory(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Shop);

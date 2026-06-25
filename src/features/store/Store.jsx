import React, { Component } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { cartOutline, cart, checkmarkCircleOutline, refreshOutline } from 'ionicons/icons';
import { handleBuyItemApi, handleGetShopApi } from '../../services/shopServices';
import { resolveAssetUrl } from '../../services/profileServices';
import { setEconomy, setInventory } from '../../store/actions';
import inventoryManager from '../../managers/inventoryManager';
import './Store.scss';

const getItemKey = (item) => item?.SK || item?.id || item?.itemId;

class Store extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shopId: 'eCoinShop',
      shop: null,
      isLoading: false,
      buyingItemId: null,
    };
  }

  componentDidMount() {
    this.loadShop();
  }

  loadShop = async () => {
    this.setState({ isLoading: true });
    try {
      const response = await handleGetShopApi(this.state.shopId);
      if (!response?.success) throw new Error(response?.message || 'Cannot load shop');
      this.setState({ shop: response.shop });
    } catch (error) {
      toast.error(error.message || 'Cannot load shop');
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleBuy = async (item) => {
    const itemId = item.itemId || item.SK;
    if (!itemId || item.owned) return;

    this.setState({ buyingItemId: itemId });
    try {
      const response = await handleBuyItemApi(this.state.shopId, itemId);
      if (!response?.success) throw new Error(response?.message || 'Purchase failed');

      if (response.currency) {
        this.props.setEconomy({
          [response.currency]: response.newBalance,
          ...(response.currency === 'eCoin' ? { pCoins: response.newBalance } : {}),
        });
      }

      if (response.item) {
        const currentItems = Array.isArray(this.props.inventory) ? this.props.inventory : (this.props.inventory?.items || []);
        const newItemKey = getItemKey(response.item);
        const nextItems = [
          response.item,
          ...currentItems.filter(currentItem => getItemKey(currentItem) !== newItemKey),
        ];

        inventoryManager.inventory = nextItems;
        this.props.setInventory({ items: nextItems });
      }

      toast.success(response.message || 'Purchased');
      await this.loadShop();
    } catch (error) {
      toast.error(error.message || 'Purchase failed');
    } finally {
      this.setState({ buyingItemId: null });
    }
  };

  render() {
    const { t } = this.props;
    const { shop, isLoading, buyingItemId } = this.state;
    const items = shop?.activeItems || [];

    return (
      <div className="app-container store-app">
        <div className="store-header">
          <h2 className="app-title"><IonIcon icon={cartOutline} /> {t('store.title')}</h2>
          <button className="store-refresh-btn" onClick={this.loadShop} disabled={isLoading}>
            <IonIcon icon={refreshOutline} />
          </button>
        </div>

        <div className="store-grid">
          {isLoading && items.length === 0 && (
            <div className="store-empty">Loading shop...</div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="store-empty">No items available</div>
          )}

          {items.map(item => {
            const itemId = item.itemId || item.SK;
            const isBuying = buyingItemId === itemId;
            return (
              <div className={`store-item ${item.owned ? 'owned' : ''}`} key={itemId}>
                <div className="item-cover">
                  {item.imageUrl ? <img src={resolveAssetUrl(item.imageUrl)} alt={item.name} /> : <IonIcon icon={cartOutline} />}
                </div>
                <div className="item-info">
                  <span className="item-title">{item.name || itemId}</span>
                  <span className="item-price">
                    {item.price?.toLocaleString?.() || item.price || 0} {item.currencyType || 'eCoin'}
                  </span>
                  <button
                    className={item.owned ? 'owned-btn' : ''}
                    disabled={item.owned || isBuying}
                    onClick={() => this.handleBuy(item)}
                  >
                    <IonIcon icon={item.owned ? checkmarkCircleOutline : cart} />
                    {item.owned ? 'Owned' : isBuying ? 'Buying...' : t('store.purchase')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  inventory: state.inventory,
});

const mapDispatchToProps = (dispatch) => ({
  setEconomy: (data) => dispatch(setEconomy(data)),
  setInventory: (data) => dispatch(setInventory(data)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Store);

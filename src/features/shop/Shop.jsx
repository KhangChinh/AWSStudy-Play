import React from 'react';
import { IonIcon } from '@ionic/react';
import { cartOutline, cart } from 'ionicons/icons';
import './Shop.scss';

const Store = ({ t }) => (
  <div className="app-container store-app">
    <h2 className="app-title"><IonIcon icon={cartOutline} /> {t('store.title')}</h2>
    <div className="store-grid">
      {[
        { nameKey: 'store.items.neon_frame', price: 1500, icon: '🖼️' },
        { nameKey: 'store.items.vip_badge', price: 5000, icon: '🛡️' },
        { nameKey: 'store.items.galaxy_trail', price: 3000, icon: '✨' },
        { nameKey: 'store.items.golden_name', price: 10000, icon: '👑' },
        { nameKey: 'store.items.dark_matter', price: '???', icon: '🌑', locked: true }
      ].map(item => (
        <div className={`store-item ${item.locked ? 'coming-soon' : ''}`} key={item.nameKey}>
          <div className="item-cover">{item.icon}</div>
          <div className="item-info">
            <span className="item-title">{t(item.nameKey)}</span>
            <span className="item-price">🪙 {item.locked ? '???' : item.price} P-Coin</span>
            <button 
              style={{ background: item.locked ? '#475569' : '#10b981' }}
              disabled={item.locked}
            >
              <IonIcon icon={cart} /> {item.locked ? t('minigames.coming_soon') : t('store.purchase')}
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Store;

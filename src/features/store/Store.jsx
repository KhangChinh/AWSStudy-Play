import React from 'react';
import { IonIcon } from '@ionic/react';
import { cartOutline, cart } from 'ionicons/icons';
import './Store.scss';

const Store = ({ t }) => (
  <div className="app-container store-app">
    <h2 className="app-title"><IonIcon icon={cartOutline} /> {t('store.title')}</h2>
    <div className="store-grid">
      {[
        { name: 'Neon Frame', price: 1500, icon: '🖼️' },
        { name: 'VIP Badge', price: 5000, icon: '🛡️' },
        { name: 'Galaxy Trail', price: 3000, icon: '✨' },
        { name: 'Golden Name', price: 10000, icon: '👑' },
        { name: 'Dark Matter', price: '???', icon: '🌑', locked: true }
      ].map(item => (
        <div className={`store-item ${item.locked ? 'coming-soon' : ''}`} key={item.name}>
          <div className="item-cover">{item.icon}</div>
          <div className="item-info">
            <span className="item-title">{item.name}</span>
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

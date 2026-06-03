import React from 'react';
import { IonIcon } from '@ionic/react';
import { cartOutline, cart } from 'ionicons/icons';
import './Store.scss';

const Store = () => (
  <div className="app-container store-app">
    <h2 className="app-title"><IonIcon icon={cartOutline} /> Cosmetics Store</h2>
    <div className="store-grid">
      {[
        { name: 'Neon Frame', price: 1500, icon: '🖼️' },
        { name: 'VIP Badge', price: 5000, icon: '🛡️' },
        { name: 'Galaxy Trail', price: 3000, icon: '✨' },
        { name: 'Golden Name', price: 10000, icon: '👑' }
      ].map(item => (
        <div className="store-item" key={item.name}>
          <div className="item-cover">{item.icon}</div>
          <div className="item-info">
            <span className="item-title">{item.name}</span>
            <span className="item-price">🪙 {item.price} P-Coin</span>
            <button style={{ background: '#10b981' }}><IonIcon icon={cart} /> Purchase</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Store;

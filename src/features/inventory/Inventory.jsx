import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import { cashOutline, cubeOutline } from 'ionicons/icons';

import './Inventory.scss';

class Inventory extends Component {
  render() {
    const { inventory } = this.props;
    const budget = this.props.userProfile?.budget || {};

    // Giả lập item từ inventory (hiện tại schema là {})
    //placeholder
    const dummyItems = [...Array(10)].map((_, i) => ({
      id: i,
      icon: ['🎁', '💫', '🎟️', '👑'][i % 4],
      name: ['Mystery Box', 'Cosmic Dust', 'Gacha Ticket', 'Gold Tiara'][i % 4],
      qty: Math.floor(Math.random() * 5) + 1
    }));

    return (
      <div className="app-container inventory-app">
        <h2 className="app-title">My Inventory</h2>
        <div className="balance-card">
          <span style={{ fontSize: 32 }}>🪙</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Virtual Balance</div>
            <div>{(budget.eCoin || 0).toLocaleString()} P-Coins</div>
          </div>
        </div>

        <h3 style={{ fontSize: 18, marginBottom: 16, color: '#e2e8f0' }}>
          <IonIcon icon={cubeOutline} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Gacha Rewards & Items
        </h3>

        <div className="inventory-grid">
          {dummyItems.map((item) => (
            <div className="item-card" key={item.id}>
              <div className="item-icon">{item.icon}</div>
              <div className="item-name">{item.name}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>Qty: {item.qty}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userProfile: state.auth.userProfile,
  inventory: state.inventory,
});

export default connect(mapStateToProps)(Inventory);

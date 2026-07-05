import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';

import currencyAssets from '../../data/currencyAssets';
import './Inventory.scss';

class Inventory extends Component {
  render() {
    const { inventory, t } = this.props;
    const budget = this.props.userProfile?.budget || {};

    // Giả lập item từ inventory (hiện tại schema là {})
    //placeholder
    const dummyItems = [...Array(10)].map((_, i) => ({
      id: i,
      icon: ['🎁', '💫', '🎟️', '👑'][i % 4],
      nameKey: ['inventory.items.mystery_box', 'inventory.items.cosmic_dust', 'inventory.items.gacha_ticket', 'inventory.items.gold_tiara'][i % 4],
      qty: Math.floor(Math.random() * 5) + 1
    }));

    return (
      <div className="app-container inventory-app">
        <h2 className="app-title">{t('inventory.title')}</h2>
        <div className="balance-card">
          <img className="balance-currency-icon" src={currencyAssets.eCoin} alt={t('common.ecoin')} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{t('inventory.virtual_balance')}</div>
            <div className="balance-currency-value"><img src={currencyAssets.eCoin} alt={t('common.ecoin')} /> {(budget.eCoin || 0).toLocaleString()} {t('common.ecoin')}</div>
          </div>
        </div>

        <h3 style={{ fontSize: 18, marginBottom: 16, color: '#e2e8f0' }}>
          <img className="section-currency-icon" src={currencyAssets.knowledgeCore} alt="" />
          {t('inventory.gacha_rewards')}
        </h3>

        <div className="inventory-grid">
          {dummyItems.map((item) => (
            <div className="item-card" key={item.id}>
              <div className="item-icon">{item.icon}</div>
              <div className="item-name">{t(item.nameKey)}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{t('inventory.qty')}: {item.qty}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userProfile: state.profile.userProfile,
  inventory: state.inventory,
});

export default connect(mapStateToProps)(withTranslation()(Inventory));

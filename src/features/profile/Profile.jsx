import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import { 
  personCircleOutline, starOutline, cubeOutline, 
  cashOutline, imageOutline 
} from 'ionicons/icons';
import cosmeticManager from '../../managers/cosmeticManager';
import inventoryManager from '../../managers/inventoryManager';
import { ITEMS } from '../../data/items';
import './Profile.scss';

class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'inventory', // inventory | titles | frames
    };
  }

  renderTabContent = () => {
    const { activeTab } = this.state;
    const { currentTitle, currentFrame, onTitleChange, onFrameChange } = this.props;

    if (activeTab === 'inventory') {
      const items = inventoryManager.getItems();
      if (!items || items.length === 0) return <div className="empty-msg">No items in your storage yet.</div>;
      
      return (
        <div className="inventory-grid">
          {items.map(i => {
            const data = ITEMS[i.id] || { name: i.id, icon: '📦', rarity: 'R' };
            const rClass = (data.rarity || 'R').toUpperCase();
            return (
              <div key={i.id} className={`item-card ${rClass}`}>
                <div className="item-icon">{data.icon}</div>
                <div className="item-details">
                  <div className="name">{data.name}</div>
                  <div className="qty">Qty: {i.amount || 0}</div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'titles') {
      const titles = cosmeticManager.getAllInCategory('titles');
      return (
        <div className="titles-list">
          {titles.map(t => (
            <div 
              key={t.id} 
              className={`profile-title-item ${currentTitle === t.id ? 'active' : ''}`}
              onClick={() => onTitleChange(t.id)}
            >
              <div className="title-info">
                <div className="title-preview" style={{ color: t.color }}>[{t.name}]</div>
                <div className="title-desc">{t.hint || t.description || 'Chiến thắng để mở khóa'}</div>
              </div>
              {currentTitle === t.id && <div className="active-tag">Equipped</div>}
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'frames') {
      const frames = cosmeticManager.getAllInCategory('frames');
      return (
        <div className="frames-grid">
           {frames.map(f => (
             <div 
               key={f.id} 
               className={`frame-item-card ${currentFrame === f.id ? 'active' : ''}`}
               onClick={() => onFrameChange(f.id)}
             >
                <div className={`frame-preview-outer ${f.id}`}>
                   <div className="frame-icon-wrap">
                      <IonIcon icon={personCircleOutline} />
                   </div>
                </div>
                <div className="frame-name">{f.name}</div>
                {currentFrame === f.id && <div className="active-dot" />}
             </div>
           ))}
        </div>
      );
    }
  };

  render() {
    const { economy, currentTitle, currentFrame } = this.props;
    const { activeTab } = this.state;
    const pCoins = economy?.pCoins || 0;
    const equippedTitle = cosmeticManager.getCosmeticInfo('titles', currentTitle) || cosmeticManager.getAllInCategory('titles')[0];

    return (
      <div className="app-container profile-app">
        <div className="profile-header">
           <div className="user-profile-section">
              <div className={`large-avatar-frame ${currentFrame}`}>
                <div className="avatar-content">
                  <IonIcon icon={personCircleOutline} />
                </div>
              </div>
              <div className="user-main-info">
                <div className="username-line">
                  <span className="name">Player_9999</span>
                  <span className="title-badge" style={{ color: equippedTitle?.color }}>
                    [{equippedTitle?.name}]
                  </span>
                </div>
                <div className="wallet-info">
                  <div className="coin-pill">
                    <span className="coin-icon">🪙</span>
                    <span className="coin-val">{pCoins.toLocaleString()}</span>
                  </div>
                </div>
              </div>
           </div>
        </div>

        <div className="profile-nav-tabs">
          <button className={`nav-tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => this.setState({ activeTab: 'inventory' })}>
            <IonIcon icon={cubeOutline} /> Inventory
          </button>
          <button className={`nav-tab ${activeTab === 'titles' ? 'active' : ''}`} onClick={() => this.setState({ activeTab: 'titles' })}>
            <IonIcon icon={starOutline} /> Titles
          </button>
          <button className={`nav-tab ${activeTab === 'frames' ? 'active' : ''}`} onClick={() => this.setState({ activeTab: 'frames' })}>
            <IonIcon icon={imageOutline} /> Avatar Frames
          </button>
        </div>

        <div className="profile-scroll-area">
          {this.renderTabContent()}
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  economy: state.economy,
});

export default connect(mapStateToProps)(Profile);

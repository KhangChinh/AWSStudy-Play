import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  personCircleOutline, starOutline, cubeOutline,
  cashOutline, imageOutline, addOutline
} from 'ionicons/icons';
import cosmeticManager from '../../managers/cosmeticManager';
import inventoryManager from '../../managers/inventoryManager';
import { ITEMS } from '../../data/items';
import RankFrame from '../../components/RankFrame';
import './Profile.scss';

const tierFromFrame = (id) => (id || '').replace('frame_', '') || 'none';

class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'backgrounds', // backgrounds | titles | frames
    };
  }

  renderTabContent = () => {
    const { activeTab } = this.state;
    const { currentTitle, currentFrame, onTitleChange, onFrameChange } = this.props;

    if (activeTab === 'backgrounds') {
      return (
        <div className="backgrounds-grid">
          <div className="bg-item-card add-btn">
            <div className="bg-preview add-icon">
              <IonIcon icon={addOutline} />
            </div>
            <div className="bg-name">Add File</div>
          </div>
          <div className="bg-item-card">
            <div className="bg-preview" style={{ background: 'radial-gradient(ellipse at bottom, #2b0c3d 0%, #0c0218 100%)' }} />
            <div className="bg-name">Default</div>
          </div>
          <div className="bg-item-card">
            <div className="bg-preview" style={{ background: '#000' }} />
            <div className="bg-name">Black</div>
          </div>
          <div className="bg-item-card">
            <div className="bg-preview" style={{ background: '#fff' }} />
            <div className="bg-name">White</div>
          </div>
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
              <RankFrame tier={f.tier} size={92}>
                <IonIcon icon={personCircleOutline} />
              </RankFrame>
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
            <RankFrame tier={tierFromFrame(currentFrame)} size={120}>
              <IonIcon icon={personCircleOutline} />
            </RankFrame>
            <div className="user-main-info">
              <div className="username-line">
                <span className="name">Player_9999</span>
              </div>
              <div className="title-line">
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
          <button className={`nav-tab ${activeTab === 'backgrounds' ? 'active' : ''}`} onClick={() => this.setState({ activeTab: 'backgrounds' })}>
            <IonIcon icon={imageOutline} /> Background
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

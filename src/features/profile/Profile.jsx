import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
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
      activeTab: 'backgrounds', // backgrounds | titles | frames | systemIcons
    };
  }

  renderTabContent = () => {
    const { activeTab } = this.state;
    const { currentTitle, currentFrame, currentBackground, currentSystemIcon, onTitleChange, onFrameChange, onBackgroundChange, onSystemIconChange } = this.props;

    if (activeTab === 'backgrounds') {
      const backgrounds = cosmeticManager.getAllInCategory('backgrounds');
      return (
        <div className="backgrounds-grid">
          <div className="bg-item-card add-btn">
            <div className="bg-preview add-icon">
              <IonIcon icon={addOutline} />
            </div>
            <div className="bg-name">Add File</div>
          </div>
          {backgrounds.map(bg => (
            <div 
              key={bg.id} 
              className={`bg-item-card ${currentBackground === bg.id ? 'active' : ''}`}
              onClick={() => onBackgroundChange(bg.id)}
            >
              <div className="bg-preview" style={{ background: bg.preview }} />
              <div className="bg-name">{bg.name}</div>
              {currentBackground === bg.id && <div className="equipped-tag">{this.props.t('profile.equipped')}</div>}
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'titles') {
      const titles = cosmeticManager.getAllInCategory('titles');
      return (
        <div className="titles-list">
          {titles.map(item => {
            const isUnlocked = inventoryManager.hasItem(item.id) || item.id === 'title_newbie';
            const isActive = currentTitle === item.id;
            
            return (
              <div
                key={item.id}
                className={`profile-title-item ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => isUnlocked && onTitleChange(item.id)}
              >
                <div className="title-info">
                  <div className="title-preview" style={{ color: isUnlocked ? item.color : '#4b5563' }}>
                    [{this.props.t(item.i18nKey + '.name')}]
                  </div>
                  <div className="title-desc">
                    {isUnlocked 
                      ? this.props.t('titles.unlocked')
                      : `${this.props.t('titles.how_to_obtain')}: ${this.props.t(item.i18nKey + '.obtain')}`
                    }
                  </div>
                </div>
                {isActive && <div className="active-tag">{this.props.t('profile.equipped')}</div>}
                {!isUnlocked && <div className="lock-icon"><IonIcon icon={cubeOutline} /></div>}
              </div>
            );
          })}
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

    if (activeTab === 'systemIcons') {
      const icons = cosmeticManager.getAllInCategory('systemIcons');
      return (
        <div className="icons-grid">
          {icons.map(icon => (
            <div 
              key={icon.id} 
              className={`icon-item-card ${currentSystemIcon === icon.id ? 'active' : ''}`}
              onClick={() => onSystemIconChange(icon.id)}
            >
              <div className={`icon-preview-box ${icon.type}`}>
                <IonIcon icon={cubeOutline} />
              </div>
              <div className="icon-name">{icon.name}</div>
              {currentSystemIcon === icon.id && <div className="equipped-dot" />}
            </div>
          ))}
        </div>
      );
    }
  };

  render() {
    const { economy, userInfo, currentTitle, currentFrame } = this.props;
    const { activeTab } = this.state;
    const pCoins = economy?.pCoins || 0;
    const equippedTitle = cosmeticManager.getCosmeticInfo('titles', currentTitle) || cosmeticManager.getAllInCategory('titles')[0];
    const displayName = userInfo?.username || 'Player_9999';

    return (
      <div className="app-container profile-app">
        <div className="profile-header">
          <div className="user-profile-section">
            <RankFrame tier={tierFromFrame(currentFrame)} size={120}>
              <IonIcon icon={personCircleOutline} />
            </RankFrame>
            <div className="user-main-info">
              <div className="username-line">
                <span className="name">{displayName}</span>
              </div>
              <div className="title-line">
                <span className="title-badge" style={{ color: equippedTitle?.color }}>
                  [{this.props.t(equippedTitle?.i18nKey + '.name')}]
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
            <IonIcon icon={imageOutline} /> {this.props.t('profile.backgrounds')}
          </button>
          <button className={`nav-tab ${activeTab === 'titles' ? 'active' : ''}`} onClick={() => this.setState({ activeTab: 'titles' })}>
            <IonIcon icon={starOutline} /> {this.props.t('profile.titles')}
          </button>
          <button className={`nav-tab ${activeTab === 'frames' ? 'active' : ''}`} onClick={() => this.setState({ activeTab: 'frames' })}>
            <IonIcon icon={imageOutline} /> {this.props.t('profile.frames')}
          </button>
          <button className={`nav-tab ${activeTab === 'systemIcons' ? 'active' : ''}`} onClick={() => this.setState({ activeTab: 'systemIcons' })}>
            <IonIcon icon={cubeOutline} /> {this.props.t('profile.system_glyphs')}
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

export default withTranslation()(connect(mapStateToProps)(Profile));

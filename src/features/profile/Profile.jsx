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

const RANK_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  master: 'Master',
};

const backgroundId = (background) => (
  typeof background === 'string' ? background : background?.id
);

const resolveBackground = (background) => {
  if (background && typeof background === 'object') return background;
  return cosmeticManager.getCosmeticInfo('backgrounds', background);
};

class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'backgrounds', // backgrounds | titles | frames
      customBackgrounds: [],
    };
    this.fileInputRef = React.createRef();
  }

  getBackgrounds = () => {
    const baseBackgrounds = cosmeticManager.getAllInCategory('backgrounds');
    const selectedBackground = resolveBackground(this.props.currentBackground);
    const customBackgrounds = selectedBackground?.custom
      ? [selectedBackground, ...this.state.customBackgrounds]
      : this.state.customBackgrounds;

    const uniqueCustomBackgrounds = customBackgrounds.filter((background, index, list) => (
      list.findIndex(item => item.id === background.id) === index
    ));

    return [...uniqueCustomBackgrounds, ...baseBackgrounds];
  };

  handleCoverEdit = () => {
    this.setState({ activeTab: 'backgrounds' });
  };

  handleCoverKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.handleCoverEdit();
  };

  handleAddBackground = () => {
    this.fileInputRef.current?.click();
  };

  handleBackgroundFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = `url("${reader.result}")`;
      const customBackground = {
        id: `custom_bg_${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Custom',
        preview: `${imageUrl} center / cover`,
        profileBackground: `linear-gradient(180deg, rgba(2, 6, 23, 0.38) 0%, rgba(2, 6, 23, 0.84) 100%), ${imageUrl} center / cover no-repeat`,
        desktopBackground: `linear-gradient(180deg, rgba(2, 6, 23, 0.34) 0%, rgba(2, 6, 23, 0.68) 100%), ${imageUrl} center / cover no-repeat`,
        custom: true,
      };

      this.setState(
        (prev) => ({ customBackgrounds: [customBackground, ...prev.customBackgrounds] }),
        () => this.props.onBackgroundChange?.(customBackground)
      );
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  renderTabContent = () => {
    const { activeTab } = this.state;
    const { currentBackground, currentTitle, currentFrame, onBackgroundChange, onTitleChange, onFrameChange } = this.props;

    if (activeTab === 'backgrounds') {
      const backgrounds = this.getBackgrounds();
      const activeBackgroundId = backgroundId(currentBackground);

      return (
        <div className="backgrounds-grid">
          <input
            ref={this.fileInputRef}
            className="background-file-input"
            type="file"
            accept="image/*"
            onChange={this.handleBackgroundFileChange}
          />
          <div className="bg-item-card add-btn" onClick={this.handleAddBackground}>
            <div className="bg-preview add-icon">
              <IonIcon icon={addOutline} />
            </div>
            <div className="bg-name">Add File</div>
          </div>
          {backgrounds.map(background => (
            <div
              key={background.id}
              className={`bg-item-card ${activeBackgroundId === background.id ? 'active' : ''}`}
              onClick={() => onBackgroundChange?.(background.custom ? background : background.id)}
            >
              <div
                className="bg-preview"
                style={{ background: background.preview || background.profileBackground }}
              />
              <div className="bg-name">{background.name}</div>
              {activeBackgroundId === background.id && <div className="bg-active-dot" />}
            </div>
          ))}
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
    const { economy, currentBackground, currentTitle, currentFrame, currentRank = 'diamond' } = this.props;
    const { activeTab } = this.state;
    const pCoins = economy?.pCoins || 0;
    const rankLabel = RANK_LABELS[currentRank] || RANK_LABELS.diamond;
    const equippedTitle = cosmeticManager.getCosmeticInfo('titles', currentTitle) || cosmeticManager.getAllInCategory('titles')[0];
    const selectedBackground = resolveBackground(currentBackground);
    const profileHeaderStyle = selectedBackground?.profileBackground
      ? { background: selectedBackground.profileBackground }
      : undefined;

    return (
      <div className={`app-container profile-app rank-${currentRank}`}>
        <div
          className="profile-header"
          style={profileHeaderStyle}
          role="button"
          tabIndex={0}
          aria-label="Change profile background"
          onClick={this.handleCoverEdit}
          onKeyDown={this.handleCoverKeyDown}
        >
          <div className="profile-cover-edit" aria-hidden="true">
            <IonIcon icon={imageOutline} />
          </div>
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
                <span className="rank-chip">{rankLabel}</span>
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

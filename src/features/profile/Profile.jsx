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
import RankFrame from '../../components/RankFrame';
import './Profile.scss';

const tierFromFrame = (id) => (id || '').replace('frame_', '') || 'none';

const RANK_KEYS = {
  bronze: 'rank.bronze',
  silver: 'rank.silver',
  gold: 'rank.gold',
  platinum: 'rank.platinum',
  diamond: 'rank.diamond',
  master: 'rank.master',
};

const translateRank = (rank, t) => {
  const translate = typeof t === 'function' ? t : (key) => key;
  return translate(RANK_KEYS[rank] || RANK_KEYS.diamond);
};

const translateCosmeticName = (item, t) => {
  if (!item) return '';
  if (item.i18nKey && typeof t === 'function') return t(`${item.i18nKey}.name`);
  return item.name || '';
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
      activeTab: 'backgrounds',
    };
  }

  getBackgrounds = () => {
    return cosmeticManager.getAllInCategory('backgrounds');
  };

  handleCoverEdit = () => {
    this.setState({ activeTab: 'backgrounds' });
  };

  renderTabContent = () => {
    const { activeTab } = this.state;
    const {
      currentTitle,
      currentFrame,
      currentBackground,
      currentSystemIcon,
      onTitleChange,
      onFrameChange,
      onBackgroundChange,
      onSystemIconChange,
      t,
    } = this.props;
    const translate = typeof t === 'function' ? t : (key) => key;

    if (activeTab === 'backgrounds') {
      const backgrounds = this.getBackgrounds();
      const activeBackgroundId = backgroundId(currentBackground);

      return (
        <div className="backgrounds-grid">
          {backgrounds.map(background => {
            const isUnlocked = inventoryManager.hasItem(background.id) || background.id === 'bg_default' || background.custom;
            const isActive = activeBackgroundId === background.id;

            return (
              <div
                key={background.id}
                className={`bg-item-card ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => isUnlocked && onBackgroundChange?.(background.custom ? background : background.id)}
              >
                <div
                  className="bg-preview"
                  style={{ background: background.preview || background.profileBackground || '#1e293b' }}
                />
                <div className="bg-name">{background.name}</div>
                {isActive && <div className="bg-active-dot" title={translate('profile.equipped')} />}
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
          {titles.map(item => {
            const isUnlocked = inventoryManager.hasItem(item.id) || item.id === 'title_newbie';
            const isActive = currentTitle === item.id;
            const titleName = translateCosmeticName(item, translate);
            const obtainText = item.i18nKey ? translate(`${item.i18nKey}.obtain`) : translate('profile.unlock_hint');

            return (
              <div
                key={item.id}
                className={`profile-title-item ${isActive ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => isUnlocked && onTitleChange?.(item.id)}
              >
                <div className="title-info">
                  <div className="title-preview" style={{ color: isUnlocked ? item.color : '#4b5563' }}>
                    [{titleName}]
                  </div>
                  <div className="title-desc">
                    {isUnlocked
                      ? translate('titles.unlocked')
                      : `${translate('titles.how_to_obtain')}: ${obtainText}`}
                  </div>
                </div>
                {isActive && <div className="active-tag">{translate('profile.equipped')}</div>}
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
          {frames.map(frame => {
            const isUnlocked = inventoryManager.hasItem(frame.id) || frame.id === 'frame_none';
            return (
              <div
                key={frame.id}
                className={`frame-item-card ${currentFrame === frame.id ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => isUnlocked && onFrameChange?.(frame.id)}
              >
                <RankFrame tier={frame.tier} size={92}>
                  <IonIcon icon={personCircleOutline} />
                </RankFrame>
                <div className="frame-name">{frame.name}</div>
                {currentFrame === frame.id && <div className="active-dot" />}
              </div>
            );
          })}
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
              onClick={() => onSystemIconChange?.(icon.id)}
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

    return null;
  };

  render() {
    const {
      economy,
      userInfo,
      currentBackground,
      currentTitle,
      currentFrame,
      currentRank = 'diamond',
      t,
    } = this.props;
    const { activeTab } = this.state;
    const pCoins = economy?.pCoins || 0;
    const rankLabel = translateRank(currentRank, t);
    const equippedTitle = cosmeticManager.getCosmeticInfo('titles', currentTitle)
      || cosmeticManager.getAllInCategory('titles')[0];
    const selectedBackground = resolveBackground(currentBackground);
    const profileHeaderStyle = selectedBackground?.profileBackground
      ? { background: selectedBackground.profileBackground }
      : undefined;
    const displayName = userInfo?.username || 'Player_9999';
    const titleName = translateCosmeticName(equippedTitle, t);

    return (
      <div className={`app-container profile-app rank-${currentRank}`}>
        <div
          className="profile-header"
          style={profileHeaderStyle}
          role="button"
          tabIndex={0}
          aria-label={typeof t === 'function' ? t('profile.change_background') : 'Change profile background'}
          onClick={this.handleCoverEdit}
          onKeyDown={this.handleCoverKeyDown}
        >
          <div className="profile-cover-edit" aria-hidden="true">
            <IonIcon icon={imageOutline} />
          </div>
          <div className="user-profile-section">
            <RankFrame tier={tierFromFrame(currentFrame)} size={120}>
              {userInfo?.avatar ? (
                <img src={userInfo.avatar} alt="avatar" className="avatar-img-large" />
              ) : (
                <IonIcon icon={personCircleOutline} />
              )}
            </RankFrame>
            <div className="user-main-info">
              <div className="username-line">
                <span className="name">{displayName}</span>
              </div>
              <div className="title-line">
                <span className="title-badge" style={{ color: equippedTitle?.color }}>
                  [{titleName}]
                </span>
                <span className="rank-chip">{rankLabel}</span>
              </div>
              <div className="wallet-info">
                <div className="coin-pill pink" title={t('common.sanity')}>
                  <IonIcon icon={starOutline} className="coin-icon" />
                  <span className="coin-val">{economy?.sanity || 0}</span>
                </div>
                <div className="coin-pill" title={t('common.ecoin')}>
                  <IonIcon icon={cashOutline} className="coin-icon" />
                  <span className="coin-val">{pCoins.toLocaleString()}</span>
                </div>
                <div className="coin-pill blue" title={t('common.knowledge_points')}>
                  <IonIcon icon={cubeOutline} className="coin-icon" />
                  <span className="coin-val">{economy?.knowledgePoint?.toLocaleString() || 0}</span>
                </div>
                <div className="streak-badge" title={t('common.streak')}>
                  🔥 <span>{userInfo?.streak || 0}</span>
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

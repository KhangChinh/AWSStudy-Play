import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  personCircleOutline, starOutline, cubeOutline, imageOutline
} from 'ionicons/icons';
import RankFrame from '../../components/RankFrame';
import { cosmeticManager } from '../../services/cosmeticServices';
import { getInventoryItem } from '../../services/profileService';
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

const cosmeticId = (item) => (
  typeof item === 'string' ? item : item?.id || item?.SK || null
);

const backgroundId = (background) => cosmeticId(background);

const resolveBackground = (background) => {
  if (background && typeof background === 'object') return background;
  return cosmeticManager.getCosmeticInfo('backgrounds', background);
};

const S3_AVATAR_BASE = (import.meta.env.VITE_S3_ASSETS_URL || '') + 'avatars/';
const S3_ASSETS_BASE = import.meta.env.VITE_S3_ASSETS_URL || '';
const DEFAULT_AVATAR = S3_AVATAR_BASE + 'default_avatar.jpg';

const normalizeBase = (base) => (base || '').replace(/\/+$/, '');
const normalizeAssetPath = (path) => (path || '').replace(/^\/+/, '').replace(/\\/g, '/');
const assetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = normalizeAssetPath(path).replace(/^public-assets\//, '');
  const s3Path = normalizedPath.startsWith('items/')
    ? normalizedPath
    : `items/${normalizedPath}`;

  return `${normalizeBase(S3_ASSETS_BASE)}/${s3Path}`;
};

const normalizeInventoryItemId = (item) => {
  if (item?.itemType === 'background' && item?.SK === 'bd_default') return 'bg_default';
  return cosmeticId(item);
};

const formatCosmeticName = (id) => (
  (id || '')
    .replace(/^bg_/, '')
    .replace(/^frame_/, '')
    .replace(/^title_/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
);

const imageBackgroundStyles = (imageUrl) => {
  if (!imageUrl) return {};
  const imageLayer = `url("${imageUrl}") center / cover no-repeat`;
  return {
    preview: imageLayer,
    profileBackground: `linear-gradient(180deg, rgba(2, 6, 23, 0.38) 0%, rgba(2, 6, 23, 0.84) 100%), ${imageLayer}`,
    desktopBackground: imageLayer,
  };
};

const inventoryItemToCosmetic = (item) => {
  const id = normalizeInventoryItemId(item);
  if (!id) return null;

  const folderId = item?.SK || id;
  const imageUrl = item?.imageUrl
    ? assetUrl(item.imageUrl)
    : item?.itemType === 'background'
      ? assetUrl(`items/background/${folderId}/${id}.jpg`)
      : '';

  return {
    ...item,
    SK: id,
    id,
    name: item?.name || formatCosmeticName(id),
    imageUrl,
    ...imageBackgroundStyles(imageUrl),
  };
};

class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'backgrounds',
      inventoryByType: {},
      loadingInventoryType: null,
    };
  }

  componentDidMount() {
    this.loadInventoryForTab(this.state.activeTab);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.activeTab !== this.state.activeTab) {
      this.loadInventoryForTab(this.state.activeTab);
    }
  }

  inventoryTypeForTab = (tab) => ({
    backgrounds: 'background',
    frames: 'frame',
    titles: 'title',
  })[tab] || null;

  loadInventoryForTab = async (tab) => {
    const itemType = this.inventoryTypeForTab(tab);
    if (!itemType || this.state.inventoryByType[itemType]) return;

    this.setState({ loadingInventoryType: itemType });
    const result = await getInventoryItem(itemType);
    this.setState(prev => ({
      inventoryByType: {
        ...prev.inventoryByType,
        [itemType]: result?.success ? (result.inventory || []) : [],
      },
      loadingInventoryType: prev.loadingInventoryType === itemType ? null : prev.loadingInventoryType,
    }));
  };

  getOwnedItems = (itemType) => {
    const loadedItems = this.state.inventoryByType[itemType] || [];
    const reduxItems = (this.props.inventoryItems || []).filter(item => item?.itemType === itemType || item?.type === itemType);
    const byId = new Map();

    [...loadedItems, ...reduxItems].forEach(item => {
      const id = cosmeticId(item);
      if (id && (item.amount ?? 1) > 0) byId.set(id, item);
    });

    return Array.from(byId.values());
  };

  getEquippableCosmetics = (category, itemType, defaultIds = [], activeId = null) => {
    const ownedItems = this.getOwnedItems(itemType);
    const ownedIds = new Set(ownedItems.map(normalizeInventoryItemId).filter(Boolean));
    defaultIds.forEach(id => ownedIds.add(id));
    if (activeId) ownedIds.add(activeId);

    const byId = new Map();
    cosmeticManager.getAllInCategory(category)
      .forEach(item => {
        const id = cosmeticId(item);
        if (id) byId.set(id, { ...item, unlocked: ownedIds.has(id) });
      });

    ownedItems.forEach(item => {
      const mappedItem = inventoryItemToCosmetic(item);
      if (!mappedItem) return;
      byId.set(mappedItem.id, {
        ...byId.get(mappedItem.id),
        ...mappedItem,
        unlocked: true,
      });
    });

    return Array.from(byId.values())
      .sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  };

  handleCoverEdit = () => {
    this.setState({ activeTab: 'backgrounds' });
  };

  handleCoverKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.handleCoverEdit();
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
      const activeBackgroundId = backgroundId(currentBackground);
      const backgrounds = this.getEquippableCosmetics('backgrounds', 'background', ['studyplant', 'bg_default'], activeBackgroundId);

      return (
        <div className="backgrounds-grid">
          {backgrounds.map(background => {
            const isActive = activeBackgroundId === background.id;
            const isLocked = !background.unlocked;

            return (
              <div
                key={background.id}
                className={`bg-item-card ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                role="button"
                aria-disabled={isLocked}
                onClick={() => {
                  if (!isLocked) onBackgroundChange?.(background.custom ? background : background.id);
                }}
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
      const titles = this.getEquippableCosmetics('titles', 'title', ['title_none'], currentTitle);

      return (
        <div className="titles-list">
          {titles.map(item => {
            const isActive = currentTitle === item.id;
            const titleName = translateCosmeticName(item, translate);
            const isLocked = !item.unlocked;

            return (
              <div
                key={item.id}
                className={`profile-title-item profile-title-${item.id} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                role="button"
                aria-disabled={isLocked}
                onClick={() => {
                  if (!isLocked) onTitleChange?.(item.id);
                }}
              >
                <div className="title-info">
                  <div className="title-preview" style={{ color: item.color }}>
                    [{titleName}]
                  </div>
                  <div className="title-desc">
                    {translate(isLocked ? 'titles.locked' : 'titles.unlocked')}
                  </div>
                </div>
                {isActive && <div className="active-tag">{translate('profile.equipped')}</div>}

              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'frames') {
      const frames = this.getEquippableCosmetics('frames', 'frame', ['frame_none'], currentFrame);

      return (
        <div className="frames-grid">
          {frames.map(frame => {
            const isActive = currentFrame === frame.id;
            const isLocked = !frame.unlocked;

            return (
              <div
                key={frame.id}
                className={`frame-item-card ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                role="button"
                aria-disabled={isLocked}
                onClick={() => {
                  if (!isLocked) onFrameChange?.(frame.id);
                }}
              >
                <RankFrame tier={frame.tier || tierFromFrame(frame.id)} size={92} frameAssetUrl={frame.frameAssetUrl}>
                  <IonIcon icon={personCircleOutline} />
                </RankFrame>
                <div className="frame-name">{frame.name}</div>
                {isActive && <div className="active-dot" />}
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
      userProfile,
      currentBackground,
      currentTitle,
      currentFrame,
      currentRank = 'diamond',
      t,
    } = this.props;
    const { activeTab } = this.state;
    const rankLabel = translateRank(currentRank, t);
    const equippedTitle = cosmeticManager.getCosmeticInfo('titles', currentTitle)
      || cosmeticManager.getAllInCategory('titles')[0];
    const equippedFrame = cosmeticManager.getCosmeticInfo('frames', currentFrame);
    const selectedBackground = resolveBackground(currentBackground);
    const profileHeaderStyle = selectedBackground?.profileBackground
      ? { background: selectedBackground.profileBackground }
      : undefined;
    const displayName = userProfile?.information?.name || 'Player_9999';
    const titleName = currentTitle === 'title_none' ? '' : translateCosmeticName(equippedTitle, t);

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
            <div className="avatar-container-simple">
              <RankFrame tier={tierFromFrame(currentFrame)} size={120} frameAssetUrl={equippedFrame?.frameAssetUrl}>
                {userProfile?.information?.avatarUrl ? (
                  <img src={S3_ASSETS_BASE + userProfile.information.avatarUrl} alt="avatar" className="avatar-img-large" onError={(e) => { e.target.src = DEFAULT_AVATAR; }} />
                ) : (
                  <img src={DEFAULT_AVATAR} alt="avatar" className="avatar-img-large" />
                )}
              </RankFrame>
            </div>
            <div className="user-main-info">
              <div className="username-line">
                <span className="name">{displayName}</span>
              </div>
              <div className="title-line">
                {titleName && (
                  <span className={`title-badge profile-title-${currentTitle}`} style={{ color: equippedTitle?.color }}>
                    [{titleName}]
                  </span>
                )}
                <span className="rank-chip">{rankLabel}</span>
                <div className="streak-badge" title={t('common.streak')}>
                  🔥 <span>{userProfile?.streak || 0}</span>
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
  userProfile: state.profile.userProfile,
  inventoryItems: Object.values(state.inventory || {}).flatMap(branch => branch?.items || []),
});

export default withTranslation()(connect(mapStateToProps)(Profile));

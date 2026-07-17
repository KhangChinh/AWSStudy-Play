import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { IonIcon } from '@ionic/react';
import {
  personCircleOutline, starOutline, imageOutline, pawOutline
} from 'ionicons/icons';
import RankFrame from '../../components/RankFrame';
import { cosmeticManager, syncItemData, assetUrl } from '../../services/cosmeticServices';
import { getInventoryItem } from '../../services/profileService';
import { DEFAULT_AVATAR_URL, resolveAvatarUrl, useDefaultAvatarOnError } from '../../utils/avatarUrl';
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
      catalogLoaded: false,
    };
  }

  componentDidMount() {
    this.loadCosmeticCatalog();
    this.loadInventoryForTab(this.state.activeTab);
  }

  loadCosmeticCatalog = async () => {
    try {
      await syncItemData();
    } finally {
      this.setState({ catalogLoaded: true });
    }
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.activeTab !== this.state.activeTab) {
      this.loadInventoryForTab(this.state.activeTab);
    }
  }

  inventoryTypeForTab = (tab) => ({
    backgrounds: 'background',
    frames: 'frame',
    titles: 'title',
    pets: 'pet',
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
      currentPet,
      onTitleChange,
      onFrameChange,
      onBackgroundChange,
      onPetChange,
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
                  if (!isLocked) onBackgroundChange?.(background);
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

    if (activeTab === 'pets') {
      const equippedPet = currentPet !== undefined ? currentPet : (localStorage.getItem('equippedPet') || null);
      
      const dbPets = this.getEquippableCosmetics('pets', 'pet');
      const combinedPets = [];
      
      dbPets.forEach(dbPet => {
        combinedPets.push({
          id: dbPet.id,
          name: dbPet.name || dbPet.id,
          width: dbPet.width || 32,
          height: dbPet.height || 32,
          backgroundImage: `url('${assetUrl(dbPet.assets?.sitting || dbPet.assets?.idle || dbPet.imageUrl)}')`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'left top',
          backgroundSize: 'auto 100%',
          isLocked: !dbPet.unlocked
        });
      });

      return (
        <div className="backgrounds-grid">
          {combinedPets.map(pet => {
            const isEquipped = equippedPet === pet.id;
            return (
              <div 
                key={pet.id}
                className={`background-card ${isEquipped ? 'equipped' : ''} ${pet.isLocked ? 'locked' : ''}`}
                onClick={() => {
                  if (pet.isLocked) return;
                  if (onPetChange) {
                    onPetChange(isEquipped ? null : pet.id);
                  } else {
                    localStorage.setItem('equippedPet', pet.id);
                    window.dispatchEvent(new CustomEvent('petChanged', { detail: pet.id }));
                  }
                  this.forceUpdate();
                }}
              >
                <div className="bg-preview" style={{ 
                  display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1e293b' 
                }}>
                  <div style={{
                    width: pet.width,
                    height: pet.height,
                    backgroundImage: pet.backgroundImage,
                    backgroundRepeat: pet.backgroundRepeat,
                    backgroundPosition: pet.backgroundPosition,
                    backgroundSize: pet.backgroundSize,
                    imageRendering: 'pixelated',
                    transform: 'scale(1.5)'
                  }} />
                </div>
                <div className="bg-info">
                  <span className="bg-name">{pet.name}</span>
                </div>
              </div>
            );
          })}
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
          <div className="user-profile-section">
            <div className="avatar-container-simple">
              <RankFrame tier={tierFromFrame(currentFrame)} size={120} frameAssetUrl={equippedFrame?.frameAssetUrl}>
                {userProfile?.information?.avatarUrl ? (
                  <img src={resolveAvatarUrl(userProfile.information.avatarUrl)} alt="avatar" className="avatar-img-large" onError={useDefaultAvatarOnError} />
                ) : (
                  <img src={DEFAULT_AVATAR_URL} alt="avatar" className="avatar-img-large" />
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
          <button className={`nav-tab ${activeTab === 'pets' ? 'active' : ''}`} onClick={() => this.setState({ activeTab: 'pets' })}>
            <IonIcon icon={pawOutline} /> {this.props.t('profile.pets', 'Pets')}
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

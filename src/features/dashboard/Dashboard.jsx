import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { signOut } from 'aws-amplify/auth';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, ticketOutline, gameControllerOutline,
  cartOutline, closeOutline, removeOutline, squareOutline, logOutOutline,
  personOutline, planetOutline, copyOutline, lockClosedOutline,
  bookOutline, schoolOutline, calculatorOutline, pencilOutline,
  bulbOutline, libraryOutline, readerOutline, documentTextOutline,
  journalOutline, newspaperOutline, createOutline, flaskOutline,
  telescopeOutline, easelOutline, statsChartOutline, ribbonOutline,
  medalOutline, trophyOutline, hourglassOutline, clipboardOutline,
  peopleOutline, cubeOutline, checkmarkDoneOutline
} from 'ionicons/icons';

import FocusGuard from '../focus/FocusGuard';
import Profile from '../profile/Profile';
import QuestPanel from '../quest/QuestPanel';
import Inventory from '../inventory/Inventory';
import StudyPlanner from '../study-planner/StudyPlanner';
import cosmeticManager from '../../managers/cosmeticManager';
import GachaTestApp from '../gacha/GachaApp';
import MinigameHub from '../minihub/MinigameHub';
import Store from '../store/Store';
import SettingsApp from '../settings/SettingsApp';
import SocialApp from '../social/SocialApp';
import RankFrame from '../../components/RankFrame';
import { withRouter } from '../../utils/withRouter';
import { handleLogoutApi } from '../../services/authService';
import { handleGetMasterDataApi, handleSyncAllApi } from '../../services/cosmeticServices';
import { userLogout, setEconomy, setInventory, userLogin, setFriendSyncTime } from '../../store/actions';
import inventoryManager from '../../managers/inventoryManager';
import './Dashboard.scss';

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

const resolveBackground = (background) => {
  if (background && typeof background === 'object') return background;
  return cosmeticManager.getCosmeticInfo('backgrounds', background);
};

const backgroundId = (background) => (
  typeof background === 'string' ? background : background?.id
);

const UserProfileWidget = ({
  currentTitle,
  currentFrame,
  currentRank = 'diamond',
  userInfo,
  onClick,
  t,
}) => {
  const titleData = cosmeticManager.getCosmeticInfo('titles', currentTitle)
    || cosmeticManager.getAllInCategory('titles')[0];
  const frameTier = (currentFrame || '').replace('frame_', '') || 'none';
  const displayName = userInfo?.username || 'Player_9999';
  const rankLabel = translateRank(currentRank, t);
  const titleName = translateCosmeticName(titleData, t);

  return (
    <div className={`user-profile-widget rank-${currentRank}`} onClick={onClick}>
      <RankFrame tier={frameTier} size={64} className="widget-rank-frame">
        {userInfo?.avatar ? (
          <img src={userInfo.avatar} alt="avatar" className="avatar-img" />
        ) : (
          <IonIcon icon={personOutline} />
        )}
      </RankFrame>
      <div className="user-info">
        <div className="user-name-line">
          <span className="username">{displayName}</span>
        </div>
        <div className="title-rank-line">
          <span className="user-title" style={{ color: titleData.color }}>[{titleName}]</span>
          <span className={`user-rank rank-${currentRank}`}>{t('dashboard.rank')}: {rankLabel}</span>
        </div>
      </div>
    </div>
  );
};

const APPS = [
  { id: 'settings', nameKey: 'common.settings', className: 'settings', icon: settingsOutline, content: <SettingsApp /> },
  { id: 'profile', nameKey: 'common.profile', className: 'profile', icon: personOutline, content: <Profile /> },
  { id: 'gacha', nameKey: 'common.gacha', className: 'gacha', icon: ticketOutline, content: <GachaTestApp /> },
  { id: 'minigame', nameKey: 'common.minigames', className: 'minigame', icon: gameControllerOutline, content: <MinigameHub /> },
  { id: 'store', nameKey: 'common.store', className: 'store', icon: cartOutline, content: <Store /> },
  { id: 'social', nameKey: 'common.social', className: 'social', icon: peopleOutline, content: <SocialApp /> },
  { id: 'inventory', name: 'Inventory', className: 'inventory', icon: cubeOutline, content: <Inventory /> },
  { id: 'quest', name: 'Quests', className: 'quest', icon: checkmarkDoneOutline, content: <QuestPanel /> },
  { id: 'study-planner', name: 'Study Planner', className: 'study-planner-icon', icon: schoolOutline, content: <StudyPlanner /> }
];

const STUDY_FLOAT_ICONS = [
  { icon: bookOutline, top: '9%', color: '#67e8f9', duration: '24s', delay: '-3s', direction: 'right' },
  { icon: schoolOutline, top: '18%', color: '#f0abfc', duration: '28s', delay: '-15s', direction: 'left' },
  { icon: calculatorOutline, top: '29%', color: '#fde68a', duration: '31s', delay: '-8s', direction: 'right' },
  { icon: pencilOutline, top: '40%', color: '#a7f3d0', duration: '26s', delay: '-5s', direction: 'left' },
  { icon: bulbOutline, top: '51%', color: '#fda4af', duration: '34s', delay: '-20s', direction: 'right' },
  { icon: libraryOutline, top: '63%', color: '#bfdbfe', duration: '36s', delay: '-22s', direction: 'left' },
  { icon: readerOutline, top: '75%', color: '#c4b5fd', duration: '29s', delay: '-17s', direction: 'right' },
  { icon: documentTextOutline, top: '14%', color: '#99f6e4', duration: '33s', delay: '-11s', direction: 'right' },
  { icon: journalOutline, top: '23%', color: '#f9a8d4', duration: '30s', delay: '-24s', direction: 'left' },
  { icon: newspaperOutline, top: '35%', color: '#bae6fd', duration: '38s', delay: '-13s', direction: 'right' },
  { icon: createOutline, top: '47%', color: '#fed7aa', duration: '27s', delay: '-19s', direction: 'left' },
  { icon: flaskOutline, top: '58%', color: '#86efac', duration: '35s', delay: '-27s', direction: 'right' },
  { icon: telescopeOutline, top: '69%', color: '#ddd6fe', duration: '32s', delay: '-9s', direction: 'left' },
  { icon: easelOutline, top: '82%', color: '#fef08a', duration: '40s', delay: '-30s', direction: 'right' },
  { icon: statsChartOutline, top: '6%', color: '#93c5fd', duration: '37s', delay: '-26s', direction: 'left' },
  { icon: ribbonOutline, top: '88%', color: '#fb7185', duration: '29s', delay: '-6s', direction: 'left' },
  { icon: medalOutline, top: '32%', color: '#fcd34d', duration: '42s', delay: '-33s', direction: 'right' },
  { icon: trophyOutline, top: '55%', color: '#fdba74', duration: '39s', delay: '-16s', direction: 'left' },
  { icon: hourglassOutline, top: '78%', color: '#7dd3fc', duration: '44s', delay: '-35s', direction: 'right' },
  { icon: clipboardOutline, top: '66%', color: '#d8b4fe', duration: '41s', delay: '-28s', direction: 'left' },
];

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeApp: null,
      openApps: [],
      minimizedApps: [],
      maximizedApp: null,
      windowPositions: {},
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disabledButtons: { logout: false },
      isDragging: null,
      dragOffset: { x: 0, y: 0 },
      currentRank: 'diamond',
      currentBackground: 'bg_default',
      currentTitle: 'title_newbie',
      currentFrame: 'frame_none',
      currentSystemIcon: 'icon_default',
      animationsEnabled: true,
      isVacuuming: false,
      isMissionsOpen: false,
      isMissionsCollapsed: true,
      missions: [
        { id: 1, title: 'Mission 1', desc: 'So khai the gioi', status: '1/1' },
        { id: 2, title: 'Mission 2', desc: 'Thu thach tan thu', status: '4/4' },
        { id: 3, title: 'Mission 3', desc: 'Nha suu tam', status: '3/3' },
        { id: 4, title: 'Mission 4', desc: 'Dai gia lo dien', status: '1/1' },
      ],
      stackOrder: [], // Order of windows from bottom to top
    };
    this.timerInterval = null;
    this.missionsPanelRef = React.createRef();
    this.missionsBtnRef = React.createRef();
  }

  async componentDidMount() {
    this.timerInterval = setInterval(() => {
      this.setState({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }, 60000);
    document.addEventListener('mousedown', this.handleClickOutside);

    // Apply background ban đầu (dùng data local từ cosmetics.js)
    cosmeticManager.applyBackgroundAssets(this.state.currentBackground);

    // Load master data từ cloud — sau đó re-render để Profile thấy bg mới
    try {
      const response = await handleGetMasterDataApi();
      if (response && Array.isArray(response.items) && response.items.length > 0) {
        cosmeticManager.loadFromMasterData(response.items);
        this.setState({ masterDataLoaded: true });
        cosmeticManager.applyBackgroundAssets(this.state.currentBackground);
      }
    } catch (e) {
      console.warn('Không thể tải master data:', e);
    }

    // ĐỒNG BỘ CLOUD: Lấy Profile, Inventory, Coin từ Serverless
    try {
      const syncResponse = await handleSyncAllApi();
      if (syncResponse && syncResponse.profile) {
        const { profile, inventory } = syncResponse;
        const cosmetics = profile.equippedCosmetics || {};

        // Cập nhật Inventory Manager
        if (inventory) {
          inventoryManager.inventory = inventory.map(item => ({
            id: item.SK,
            SK: item.SK,
            amount: item.amount || 1
          }));
          this.props.setInventory({ items: inventory });
        }

        // Đẩy dữ liệu vào Redux Store
        this.props.userLogin({
          ...this.props.userInfo,
          username: profile.information?.name || 'Player',
          avatar: profile.information?.avatarUrl,
          streak: profile.studyStats?.streak || 0,
        });

        if (profile.metadata?.friendUpdatedAt) {
          this.props.setFriendSyncTime(profile.metadata.friendUpdatedAt);
        }

        if (profile.budget) {
          this.props.setEconomy({
            pCoins: profile.budget.eCoin || 0,
            knowledgePoint: profile.budget.knowledgePoint || 0,
            sanity: profile.budget.sanity || 0, // Sanity mới từ Cloud
          });
        }

        // Cập nhật State Dashboard theo Cloud
        this.setState({
          currentBackground: cosmetics.equippedBackground || 'bg_default',
          currentFrame: cosmetics.equippedFrame || 'frame_none',
          currentTitle: (cosmetics.equippedTitles && cosmetics.equippedTitles[0]) || 'title_newbie',
        });

        console.log('[Dashboard] Cloud Sync hoàn tất:', profile);
      }
    } catch (e) {
      console.warn('[Dashboard] Cloud Sync thất bại:', e);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.currentBackground !== this.state.currentBackground) {
      cosmeticManager.applyBackgroundAssets(this.state.currentBackground);
    }
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.dragRaf) cancelAnimationFrame(this.dragRaf);
    document.removeEventListener('mousedown', this.handleClickOutside);
    window.removeEventListener('mousemove', this.handleDragging);
    window.removeEventListener('mouseup', this.handleDragEnd);
    window.removeEventListener('touchmove', this.handleDragging);
    window.removeEventListener('touchend', this.handleDragEnd);
  }

  handleClearAllApps = () => {
    if (this.state.openApps.length === 0) return;

    this.setState({ isVacuuming: true });

    setTimeout(() => {
      this.setState({
        openApps: [],
        activeApp: null,
        minimizedApps: [],
        maximizedApp: null,
        isVacuuming: false,
      });
      toast.success(this.props.t('dashboard.system_cleanup_complete'), {
        icon: 'clean',
        theme: 'dark',
        autoClose: 1500,
      });
    }, 800);
  };

  handleTitleChange = async (newTitleId) => {
    this.setState({ currentTitle: newTitleId });
    try {
      await handleEquipCosmeticsApi({
        backgroundId: this.state.currentBackground,
        frameId: this.state.currentFrame,
        titles: [newTitleId]
      });
    } catch (e) { console.warn('Sync Title fail:', e); }
  };

  handleFrameChange = async (newFrameId) => {
    this.setState({ currentFrame: newFrameId });
    try {
      await handleEquipCosmeticsApi({
        backgroundId: this.state.currentBackground,
        frameId: newFrameId,
        titles: [this.state.currentTitle]
      });
    } catch (e) { console.warn('Sync Frame fail:', e); }
  };

  handleToggleAnimations = () => {
    this.setState(prev => ({ animationsEnabled: !prev.animationsEnabled }));
  };

  handleBackgroundChange = async (newBackground) => {
    const bgId = typeof newBackground === 'string' ? newBackground : newBackground.id;
    this.setState({ currentBackground: bgId });
    try {
      await handleEquipCosmeticsApi({
        backgroundId: bgId,
        frameId: this.state.currentFrame,
        titles: [this.state.currentTitle]
      });
    } catch (e) { console.warn('Sync Background fail:', e); }
  };

  handleSystemIconChange = (id) => {
    this.setState({ currentSystemIcon: id });
  };

  toggleMissions = () => {
    this.setState(prev => ({ isMissionsCollapsed: !prev.isMissionsCollapsed }));
  };

  openApp = (appId) => {
    this.setState((prev) => {
      const isAlreadyOpen = prev.openApps.includes(appId);
      const newOpenApps = isAlreadyOpen ? prev.openApps : [...prev.openApps, appId];
      const newPositions = { ...prev.windowPositions };

      // Update stack order: move appId to the top (end of array)
      const newStackOrder = prev.stackOrder.filter(id => id !== appId);
      newStackOrder.push(appId);

      if (!newPositions[appId]) {
        const winW = 900;
        const winH = 600;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight - 48;

        // Calculate offset based on number of currently open (non-minimized) windows
        const openCount = prev.openApps.filter(id => !prev.minimizedApps.includes(id)).length;
        const cascadeOffset = (openCount % 5) * 30; // Wrap after 5 windows

        newPositions[appId] = {
          x: Math.max(20, (screenW - winW) / 2 - 100 + cascadeOffset),
          y: Math.max(20, (screenH - winH) / 2 - 80 + cascadeOffset),
        };
      }

      return {
        openApps: newOpenApps,
        activeApp: appId,
        stackOrder: newStackOrder,
        minimizedApps: prev.minimizedApps.filter(id => id !== appId),
        windowPositions: newPositions,
      };
    });
  };

  bringToFront = (appId) => {
    this.setState(prev => {
      if (prev.activeApp === appId) return null;
      const newStackOrder = prev.stackOrder.filter(id => id !== appId);
      newStackOrder.push(appId);
      return {
        activeApp: appId,
        stackOrder: newStackOrder
      };
    });
  };

  closeApp = (e, appId) => {
    e.stopPropagation();
    this.setState(prev => {
      const remainingApps = prev.openApps.filter(id => id !== appId);
      const newStackOrder = prev.stackOrder.filter(id => id !== appId);
      return {
        openApps: remainingApps,
        stackOrder: newStackOrder,
        minimizedApps: prev.minimizedApps.filter(id => id !== appId),
        activeApp: prev.activeApp === appId ? (newStackOrder[newStackOrder.length - 1] || null) : prev.activeApp,
        maximizedApp: prev.maximizedApp === appId ? null : prev.maximizedApp,
      };
    });
  };

  toggleMinimize = (e, appId) => {
    e.stopPropagation();
    this.setState(prev => {
      const isMinimized = prev.minimizedApps.includes(appId);
      if (isMinimized) {
        const newStackOrder = prev.stackOrder.filter(id => id !== appId);
        newStackOrder.push(appId);
        return {
          minimizedApps: prev.minimizedApps.filter(id => id !== appId),
          activeApp: appId,
          stackOrder: newStackOrder,
        };
      }

      const newMinimized = [...prev.minimizedApps, appId];
      const newStackOrder = prev.stackOrder.filter(id => id !== appId);
      // When minimizing, find the next top visible app in stack
      const nextActive = prev.stackOrder
        .slice()
        .reverse()
        .find(id => id !== appId && !newMinimized.includes(id)) || null;

      return {
        minimizedApps: newMinimized,
        activeApp: nextActive,
        stackOrder: newStackOrder // Optional: keep in stack but activeApp handles focus
      };
    });
  };

  handleTaskbarClick = (e, appId) => {
    e.stopPropagation();
    const { activeApp, minimizedApps } = this.state;
    const isMinimized = minimizedApps.includes(appId);

    if (isMinimized) {
      this.setState(prev => {
        const newStackOrder = prev.stackOrder.filter(id => id !== appId);
        newStackOrder.push(appId);
        return {
          minimizedApps: prev.minimizedApps.filter(id => id !== appId),
          activeApp: appId,
          stackOrder: newStackOrder
        };
      });
    } else if (activeApp !== appId) {
      this.bringToFront(appId);
    } else {
      this.toggleMinimize(e, appId);
    }
  };

  handleMinimizeAll = () => {
    const { openApps } = this.state;
    if (openApps.length === 0) return;

    this.setState({
      minimizedApps: [...openApps],
      activeApp: null,
    });

    toast.info(this.props.t('dashboard.minimize_all'), {
      icon: 'min',
      theme: 'dark',
      autoClose: 1000,
    });
  };

  toggleMaximize = (e, appId) => {
    e.stopPropagation();
    this.setState(prev => ({
      maximizedApp: prev.maximizedApp === appId ? null : appId,
    }));
  };

  handleClaimAllMissions = () => {
    toast.success(this.props.t('missions.rewards_claimed'), {
      icon: 'gift',
      theme: 'dark',
    });
  };

  handleClaimMission = () => {
    toast.success('Claimed: +40 P-Coin!', {
      icon: 'ok',
      theme: 'dark',
    });
  };

  handleClickOutside = (event) => {
    if (
      this.state.isMissionsOpen
      && this.missionsPanelRef.current
      && !this.missionsPanelRef.current.contains(event.target)
      && this.missionsBtnRef.current
      && !this.missionsBtnRef.current.contains(event.target)
    ) {
      this.setState({ isMissionsOpen: false });
    }
  };

  handleDragStart = (e, appId) => {
    if (this.state.maximizedApp === appId) return;

    const event = e.touches ? e.touches[0] : e;
    this.setState({
      activeApp: appId,
      isDragging: appId,
      stackOrder: [...this.state.stackOrder.filter(id => id !== appId), appId],
      dragOffset: {
        x: event.clientX - (this.state.windowPositions[appId]?.x || 0),
        y: event.clientY - (this.state.windowPositions[appId]?.y || 0),
      },
    });

    if (e.touches) {
      window.addEventListener('touchmove', this.handleDragging, { passive: false });
      window.addEventListener('touchend', this.handleDragEnd);
    } else {
      window.addEventListener('mousemove', this.handleDragging);
      window.addEventListener('mouseup', this.handleDragEnd);
    }
  };

  handleDragging = (e) => {
    if (!this.state.isDragging) return;
    if (e.cancelable) e.preventDefault();

    const appId = this.state.isDragging;
    const event = e.touches ? e.touches[0] : e;
    const headerHeight = 42;
    const taskbarHeight = 48;
    const padding = 100;

    const newX = Math.max(-(900 - padding), Math.min(event.clientX - this.state.dragOffset.x, window.innerWidth - padding));
    const newY = Math.max(0, Math.min(event.clientY - this.state.dragOffset.y, window.innerHeight - taskbarHeight - headerHeight));

    if (this.dragRaf) cancelAnimationFrame(this.dragRaf);
    this.dragRaf = requestAnimationFrame(() => {
      this.setState(prev => ({
        windowPositions: {
          ...prev.windowPositions,
          [appId]: { x: newX, y: newY },
        },
      }));
    });
  };

  handleDragEnd = () => {
    this.setState({ isDragging: null });
    window.removeEventListener('mousemove', this.handleDragging);
    window.removeEventListener('mouseup', this.handleDragEnd);
    window.removeEventListener('touchmove', this.handleDragging);
    window.removeEventListener('touchend', this.handleDragEnd);
    if (this.dragRaf) cancelAnimationFrame(this.dragRaf);
  };

  handleLogout = async () => {
    this.setState({ disabledButtons: { ...this.state.disabledButtons, logout: true } });

    const confirmAction = () =>
      new Promise((resolve) => {
        toast(
          <div>
            <p>{this.props.t('dashboard.logout_confirm')}</p>
            <button
              className="toast-confirm-btn"
              onClick={() => { resolve(true); toast.dismiss(); }}
            >
              {this.props.t('common.yes')}
            </button>
            <button
              className="toast-cancel-btn"
              onClick={() => { resolve(false); toast.dismiss(); }}
            >
              {this.props.t('common.no')}
            </button>
          </div>,
          {
            autoClose: 2000,
            closeOnClick: false,
            onClose: () => {
              this.setState({
                disabledButtons: { ...this.state.disabledButtons, logout: false },
              });
            },
          },
        );
      });

    const isConfirmed = await confirmAction();
    if (isConfirmed) {
      try {
        await signOut();
        handleLogoutApi();
        this.props.userLogout();
        toast.success(this.props.t('dashboard.logout_success'));
        this.props.navigate('/login');
      } catch (e) {
        console.log(e);
        toast.error(this.props.t('dashboard.logout_failed'));
      }
    }
  };

  renderDesktopLineBackground = (bgId = 'bg_default') => (
    <div className={`desktop-line-bg bg-${bgId}`} aria-hidden="true">
      <div className="aurora-field aurora-cyan"></div>
      <div className="aurora-field aurora-magenta"></div>
      <div className="aurora-field aurora-gold"></div>
      <div className="holo-orbit holo-orbit-one"></div>
      <div className="holo-orbit holo-orbit-two"></div>
      <div className="holo-panel holo-panel-one"></div>
      <div className="holo-panel holo-panel-two"></div>
      <div className="study-float-icons">
        {STUDY_FLOAT_ICONS.map((item, index) => (
          <div
            className={`study-float-icon float-${item.direction}`}
            key={index}
            style={{
              '--float-top': item.top,
              '--float-color': item.color,
              '--float-duration': item.duration,
              '--float-delay': item.delay,
            }}
          >
            <IonIcon icon={item.icon} />
          </div>
        ))}
      </div>
      <div className="line-grid line-grid-primary"></div>
      <div className="line-grid line-grid-secondary"></div>
      <div className="line-scan"></div>
    </div>
  );

  render() {
    const {
      openApps,
      activeApp,
      minimizedApps,
      maximizedApp,
      windowPositions,
      time,
      disabledButtons,
      animationsEnabled,
      currentBackground,
      currentSystemIcon,
      currentRank,
    } = this.state;
    const { t, i18n } = this.props;
    const selectedBackground = resolveBackground(currentBackground)
      || cosmeticManager.getAllInCategory('backgrounds')[0];
    const iconData = cosmeticManager.getCosmeticInfo('systemIcons', currentSystemIcon)
      || cosmeticManager.getAllInCategory('systemIcons')[0]
      || { type: 'outline' };
    const isProfileOpen = openApps.includes('profile') && !minimizedApps.includes('profile');
    const activeBgId = backgroundId(currentBackground) || 'bg_default';
    const presetBgIds = ['bg_default', 'bg_purple', 'bg_black', 'bg_white'];
    const bgThemeId = selectedBackground?.custom || !presetBgIds.includes(activeBgId)
      ? 'bg_default'
      : activeBgId;
    const desktopBackground = selectedBackground?.desktopBackground || selectedBackground?.preview;
    const desktopStyle = desktopBackground
      ? {
        '--desktop-user-background': desktopBackground,
        ...(animationsEnabled ? {} : { background: desktopBackground }),
      }
      : undefined;
    const desktopClassName = [
      'os-desktop',
      !animationsEnabled ? 'no-animations' : '',
      `icon-style-${iconData.type}`,
    ].filter(Boolean).join(' ');

    return (
      <div className={desktopClassName} style={desktopStyle}>
        {animationsEnabled && this.renderDesktopLineBackground(bgThemeId)}
        <div className="desktop-bg-dim"></div>
        {this.state.isDragging && <div className="drag-overlay"></div>}

        <UserProfileWidget
          currentTitle={this.state.currentTitle}
          currentFrame={this.state.currentFrame}
          currentRank={currentRank}
          userInfo={this.props.userInfo}
          onClick={() => this.openApp('profile')}
          t={t}
        />

        <div className="desktop-icons">
          {APPS.filter(app => app.id !== 'profile').map(app => (
            <div className={`icon ${app.className}`} key={app.id} onClick={() => this.openApp(app.id)}>
              <div className="icon-img">
                <IonIcon icon={app.icon} style={{ color: 'white', fontSize: 28 }} />
              </div>
              <span>{app.nameKey ? t(app.nameKey) : app.name}</span>
            </div>
          ))}
          
          <FocusGuard />
        </div>

        {openApps.map(appId => {
          const app = APPS.find(a => a.id === appId);
          if (!app) return null;

          const isMinimized = minimizedApps.includes(appId);
          const isMaximized = maximizedApp === appId;
          const pos = windowPositions[appId] || { x: 100, y: 100 };

          if (isMinimized) return null;

          return (
            <div
              key={appId}
              className={`os-window ${app.className} ${appId === 'profile' ? `rank-${currentRank}` : ''} ${activeApp === appId ? 'active' : ''} ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''} ${this.state.isVacuuming ? 'vacuuming' : ''} ${this.state.isDragging === appId ? 'dragging' : ''}`}
              style={{
                top: isMaximized ? 0 : pos.y,
                left: isMaximized ? 0 : pos.x,
                zIndex: this.state.stackOrder.indexOf(appId) + 10,
              }}
              onMouseDown={() => this.bringToFront(appId)}
            >
              <div
                className="window-header"
                onMouseDown={(e) => this.handleDragStart(e, appId)}
                onTouchStart={(e) => this.handleDragStart(e, appId)}
              >
                <div className="window-title">
                  {app.nameKey ? t(app.nameKey) : app.name}
                </div>
                <div className="window-controls">
                  <button className="control minimize" onClick={(e) => this.toggleMinimize(e, appId)}>
                    <IonIcon icon={removeOutline} />
                  </button>
                  <button
                    className="control maximize"
                    title={isMaximized ? t('dashboard.restore') : t('dashboard.maximize')}
                    onClick={(e) => this.toggleMaximize(e, appId)}
                  >
                    <IonIcon icon={isMaximized ? copyOutline : squareOutline} style={{ fontSize: isMaximized ? 11 : 9 }} />
                  </button>
                  <button className="control close" onClick={(e) => this.closeApp(e, appId)}>
                    <IonIcon icon={closeOutline} />
                  </button>
                </div>
              </div>
              <div className="window-content">
                {React.cloneElement(app.content, {
                  currentBackground: this.state.currentBackground,
                  currentTitle: this.state.currentTitle,
                  currentFrame: this.state.currentFrame,
                  currentRank: this.state.currentRank,
                  currentSystemIcon: this.state.currentSystemIcon,
                  animationsEnabled: this.state.animationsEnabled,
                  userInfo: this.props.userInfo,
                  onToggleAnimations: this.handleToggleAnimations,
                  onTitleChange: this.handleTitleChange,
                  onFrameChange: this.handleFrameChange,
                  onBackgroundChange: this.handleBackgroundChange,
                  onSystemIconChange: this.handleSystemIconChange,
                  t,
                  i18n,
                })}
              </div>
            </div>
          );
        })}

        <div className="os-taskbar">
          <div className="taskbar-start">
            <div
              className="minimize-all-btn"
              onClick={this.handleMinimizeAll}
              title={t('dashboard.minimize_all')}
            >
              <IonIcon icon={removeOutline} />
            </div>
            <div
              className={`start-btn ${this.state.isVacuuming ? 'active' : ''}`}
              onClick={this.handleClearAllApps}
              title={t('dashboard.cleanup')}
            >
              <IonIcon icon={planetOutline} className={this.state.isVacuuming ? 'spinning' : ''} />
            </div>
          </div>

          <div className="taskbar-apps">
            {openApps.map(appId => {
              const app = APPS.find(a => a.id === appId);
              if (!app) return null;

              return (
                <div
                  key={appId}
                  className={`taskbar-icon ${activeApp === appId ? 'active' : ''} ${minimizedApps.includes(appId) ? 'minimized' : ''}`}
                  onClick={(e) => this.handleTaskbarClick(e, appId)}
                  title={t(app.nameKey)}
                >
                  <IonIcon icon={app.icon} style={{ fontSize: 22 }} />
                  <div className="indicator"></div>
                </div>
              );
            })}
          </div>

          <div className="taskbar-sys">
            <span className="os-time">{time}</span>
            <button className="btn-logout" onClick={this.handleLogout} disabled={disabledButtons.logout} title={t('common.logout')}>
              <IonIcon icon={logOutOutline} />
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
});

const mapDispatchToProps = (dispatch) => ({
  userLogout: () => dispatch(userLogout()),
  userLogin: (info) => dispatch(userLogin(info)),
  setEconomy: (data) => dispatch(setEconomy(data)),
  setInventory: (data) => dispatch(setInventory(data)),
  setFriendSyncTime: (time) => dispatch(setFriendSyncTime(time)),
});

export default withTranslation()(withRouter(connect(mapStateToProps, mapDispatchToProps)(Dashboard)));

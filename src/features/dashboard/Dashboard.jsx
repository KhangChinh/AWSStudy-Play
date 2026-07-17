import React, { Component, Suspense, lazy } from 'react';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, ticketOutline, gameControllerOutline,
  cartOutline, closeOutline, removeOutline, squareOutline, logOutOutline,
  personOutline, planetOutline, copyOutline,
  schoolOutline,
  peopleOutline,
  chevronBackOutline, chevronForwardOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import FocusGuard from '../focus/FocusGuard';
import DesktopFriendsWidget from '../social/DesktopFriendsWidget';
import DesktopFocusControl from '../focus/DesktopFocusControl';
import { cosmeticManager } from '../../services/cosmeticServices';
import currencyAssets from '../../data/currencyAssets';
import studyFloatIcons from '../../data/studyFloatIcons';
import RankFrame from '../../components/RankFrame';
import { handleLogoutApi } from '../../services/authService';
import { syncItemData, handleEquipCosmeticsApi } from '../../services/cosmeticServices';
import { handleSyncAllApi } from '../../services/syncService';
import QuestWidget from '../quest/QuestWidget';
import MinigameWidget from '../minihub/MinigameWidget';
import PetOverlay from '../pet/PetOverlay';
import { getDailyQuests, claimQuestReward, refreshDailyQuests } from '../../services/questService';
import { setProfile, setDailyQuests, setSocial } from '../../store/actions';
import { handleGetFriendsApi } from '../../services/socialServices';
import { getTierFromRP, getRankInfo } from '../../utils/rankSystem';
import { DEFAULT_AVATAR_URL, resolveAvatarUrl, useDefaultAvatarOnError } from '../../utils/avatarUrl';
import './Dashboard.scss';

const SettingsApp = lazy(() => import('../settings/SettingsApp'));
const Profile = lazy(() => import('../profile/Profile'));
const GachaApp = lazy(() => import('../gacha/GachaApp'));
const MinigameHub = lazy(() => import('../minihub/MinigameHub'));
const Shop = lazy(() => import('../shop/Shop'));
const SocialApp = lazy(() => import('../social/SocialApp'));
const StudyPlanner = lazy(() => import('../study-planner/StudyPlanner'));


const translateCosmeticName = (item, t) => {
  if (!item) return '';
  if (item.i18nKey && typeof t === 'function') return t(`${item.i18nKey}.name`);
  return item.name || '';
};


const resolveBackground = (background) => {
  if (background && typeof background === 'object') return background;
  return cosmeticManager.getCosmeticInfo('backgrounds', background);
};

const cosmeticId = (cosmetic) => (
  typeof cosmetic === 'string' ? cosmetic : cosmetic?.id || cosmetic?.SK || null
);

const backgroundId = (background) => cosmeticId(background);
const LOCAL_DEFAULT_BACKGROUND_ID = 'studyplant';
const SERVER_DEFAULT_BACKGROUND_ID = 'bg_default';
const toServerBackgroundId = (id) => (
  id === LOCAL_DEFAULT_BACKGROUND_ID ? SERVER_DEFAULT_BACKGROUND_ID : id
);

const getBudgetValue = (profile, keys) => {
  const budget = profile?.budget || {};
  const aliases = {
    eCoin: ['eCoin', 'ecoin', 'e_coin', 'ECoin'],
    knowledgePoint: ['knowledgePoint', 'knowledge_points'],
    knowledgeCore: ['knowledgeCore', 'knowledge_core'],
    sanity: ['sanity'],
  };
  const expandedKeys = keys.flatMap((key) => aliases[key] || [key]);
  for (const key of expandedKeys) {
    const value = budget[key] ?? profile?.[key];
    if (value !== undefined && value !== null) return Number(value) || 0;
  }
  return 0;
};

const UserProfileWidget = ({
  currentTitle,
  currentFrame,
  currentRank = 'diamond',
  userProfile,
  onClick,
  t,
}) => {
  const titleData = cosmeticManager.getCosmeticInfo('titles', currentTitle)
    || cosmeticManager.getAllInCategory('titles')[0];
  const frameTier = (currentFrame || '').replace('frame_', '') || 'none';
  const frameAssetUrl = cosmeticManager.getCosmeticInfo('frames', currentFrame)?.frameAssetUrl;
  const displayName = userProfile?.information?.name || 'Unde_user';
  const rp = userProfile?.studyStats?.rankScore ?? 0;
  const rankInfo = getRankInfo(rp);
  const titleName = translateCosmeticName(titleData, t);

  return (
    <button type="button" className={`user-profile-widget rank-${currentRank}`} onClick={onClick} aria-label={t('common.profile')}>
      <RankFrame tier={frameTier} size={64} className="widget-rank-frame" frameAssetUrl={frameAssetUrl}>
        {userProfile?.information?.avatarUrl ? (
          <img src={resolveAvatarUrl(userProfile.information.avatarUrl)} alt="avatar" className="avatar-img" onError={useDefaultAvatarOnError} />
        ) : (
          <img src={DEFAULT_AVATAR_URL} alt="avatar" className="avatar-img" />
        )}
      </RankFrame>
      <div className="user-info">
        <div className="user-name-line">
          <span className="username">{displayName}</span>
        </div>
        <div className="title-rank-line">
          {titleData && titleName && (
            <span className="user-title" style={{ color: titleData.color }}>[{titleName}]</span>
          )}
        </div>
      </div>
    </button>
  );
};

const APPS = [
  { id: 'settings', nameKey: 'common.settings', className: 'settings', icon: settingsOutline, component: SettingsApp },
  { id: 'profile', nameKey: 'common.profile', className: 'profile', icon: personOutline, component: Profile },
  { id: 'gacha', nameKey: 'common.gacha', className: 'gacha', icon: ticketOutline, component: GachaApp },
  { id: 'minigame', nameKey: 'common.minigames', className: 'minigame', icon: gameControllerOutline, component: MinigameHub },
  { id: 'shop', nameKey: 'common.shop', className: 'shop', icon: cartOutline, component: Shop },
  { id: 'social', nameKey: 'common.social', className: 'social', icon: peopleOutline, component: SocialApp },
  { id: 'study-planner', nameKey: 'common.study_planner', className: 'study-planner-icon', icon: schoolOutline, component: StudyPlanner }
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
      currentBackground: LOCAL_DEFAULT_BACKGROUND_ID,
      currentTitle: 'title_none',
      currentFrame: 'frame_none',
      currentPet: null,
      currentSystemIcon: 'icon_default',
      animationsEnabled: true,
      isVacuuming: false,
      isQuestsOpen: true,
      isQuestsCollapsed: false,
      stackOrder: [], // Order of windows from bottom to top
      launcherPage: 0,
      appsPerPage: 5,
      isFocusPanelOpen: false,
      isFocusRankMode: false,
      isRankListOpen: false,
      rankListPage: 0,
    };
    this.timerInterval = null;
    this.questsPanelRef = React.createRef();
    this.questsBtnRef = React.createRef();
  }

  async componentDidMount() {
    
    this.timerInterval = setInterval(() => {
      this.setState({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }, 60000);
    document.addEventListener('mousedown', this.handleClickOutside);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener('keydown', this.handleGlobalKeyDown);

    if (this.props.userProfile) {
      this.setEquippedStateFromProfile(this.props.userProfile);
    }

    // Master cosmetics use their own local cache and only refresh in background.
    cosmeticManager.applyBackgroundAssets(this.state.currentBackground);
    try {
      await syncItemData();
      this.setState({ masterDataLoaded: true });
      cosmeticManager.applyBackgroundAssets(this.state.currentBackground);
    } catch (error) {
      console.warn('[Dashboard] Master data sync unavailable; using local cosmetics.', error);
    }
    // Load Daily Quests
    if (!this.props.dailyQuests) this.loadDailyQuests();

    // Tải danh sách bạn bè để hiển thị lên widget nền
    if (!this.props.socialLoaded) this.fetchFriends();
  }

  fetchFriends = async () => {
    try {
      const res = await handleGetFriendsApi();
      if (res && res.friends) {
        this.props.setSocial({ items: res.friends, lastKey: res.lastEvaluatedKey });
      }
    } catch (e) {
      console.warn('[Dashboard] Không thể tải danh sách bạn bè:', e);
    }
  };

  // Khi user Alt+Tab/Ctrl+Tab quay lại app → gọi sync (cooldown check trong syncService)
  handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.performSyncAll();
    }
  };

  // Gọi handleSyncAllApi (cooldown 1 phút được check trong syncService)
  handleGlobalKeyDown = (event) => {
    if (event.key === 'Escape' && this.state.activeApp) {
      this.closeApp(null, this.state.activeApp);
    }
  };

  getEquippedIds = (profile = this.props.userProfile) => {
    const cosmetics = profile?.equippedCosmetics || {};
    return {
      backgroundId: cosmeticId(cosmetics.equippedBackground) || LOCAL_DEFAULT_BACKGROUND_ID,
      frameId: cosmeticId(cosmetics.equippedFrame) || 'frame_none',
      titleId: cosmeticId(cosmetics.equippedTitles?.[0]) || 'title_none',
      petId: cosmeticId(cosmetics.equippedPet) || null,
    };
  };

  setEquippedStateFromProfile = (profile) => {
    const equipped = this.getEquippedIds(profile);
    const rp = profile?.studyStats?.rankScore ?? 0;
    this.setState({
      currentBackground: equipped.backgroundId,
      currentFrame: equipped.frameId,
      currentTitle: equipped.titleId,
      currentPet: equipped.petId,
      currentRank: getTierFromRP(rp),
    });
  };

  saveEquippedProfile = async (profile) => {
    if (!profile) return;
    this.props.setProfile(profile);
    await window.api?.invoke('store:saveProfile', profile).catch(() => { });
    this.setEquippedStateFromProfile(profile);
  };

  performSyncAll = async () => {
    try {
      const syncResponse = await handleSyncAllApi();
      if (syncResponse && syncResponse.profile) {
        const { profile } = syncResponse;
        // handleSyncAllApi đã dispatch inventory + save electron store rồi
        this.props.setProfile(profile);

        // Cập nhật State Dashboard theo Cloud
        this.setEquippedStateFromProfile(profile);

        console.log('[Dashboard] Cloud Sync hoàn tất:', profile);
      }
    } catch (e) {
      console.warn('[Dashboard] Cloud Sync thất bại:', e);
    }
  };

  /**
   * Load Daily Quests
   * Luồng:
   *   1. Nếu force=true → bỏ qua cache, gọi API ngay
   *   2. Kiểm tra electron-store (base64 encoded)
   *      - Có data + expiresAt chưa qua ngày → đẩy vào Redux, xong
   *      - Có data + expiresAt đã qua ngày → gọi API lấy mới (refresh)
   *      - Không có data → gọi API lấy mới
   *   3. Kết quả API → lưu vào Redux + electron-store (base64)
   */
  loadDailyQuests = async () => {
    const now = Math.floor(Date.now() / 1000);
    const isValidDaily = (daily) => daily?.quests && (!daily.expiresAt || daily.expiresAt > now);

    try {
      if (this.props.dailyQuests?.quests) {
        return;
      }

      if (window.api?.invoke) {
        const stored = await window.api.invoke('quest:load').catch(() => null);
        const cachedDaily = stored?.success ? stored.data : stored;
        if (isValidDaily(cachedDaily)) {
          this.props.dispatch(setDailyQuests(cachedDaily));
          return;
        }

        const daily = await window.api.invoke('store:loadDaily').catch(() => null);
        if (isValidDaily(daily)) {
          this.props.dispatch(setDailyQuests(daily));
          await window.api.invoke('quest:save', daily).catch(() => { });
          return;
        }
      }

      console.log('[Quest] Daily cache missing/expired, calling API...');
      const result = await getDailyQuests();

      if (result.success && result.daily) {
        this.props.dispatch(setDailyQuests(result.daily));
        if (window.api?.invoke) {
          await window.api.invoke('quest:save', result.daily).catch(() => { });
          await window.api.invoke('store:saveDaily', result.daily).catch(() => { });
        }
      } else {
        console.warn('[Quest] API getDaily fail:', result.error);
      }
    } catch (err) {
      console.error('[Quest] Load error:', err);
    }
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.userProfile !== this.props.userProfile && this.props.userProfile) {
      this.setEquippedStateFromProfile(this.props.userProfile);
    }

    if (prevState.currentBackground !== this.state.currentBackground) {
      cosmeticManager.applyBackgroundAssets(this.state.currentBackground);
    }
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.dragRaf) cancelAnimationFrame(this.dragRaf);
    document.removeEventListener('mousedown', this.handleClickOutside);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('keydown', this.handleGlobalKeyDown);
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
    const previousTitle = this.state.currentTitle;
    const backgroundIdToSave = toServerBackgroundId(backgroundId(this.state.currentBackground) || LOCAL_DEFAULT_BACKGROUND_ID);
    const frameIdToSave = cosmeticId(this.state.currentFrame);
    const petIdToSave = cosmeticId(this.state.currentPet) || null;

    this.setState({ currentTitle: newTitleId });
    try {
      const result = await handleEquipCosmeticsApi({
        backgroundId: backgroundIdToSave,
        frameId: frameIdToSave === 'frame_none' ? null : frameIdToSave,
        titles: newTitleId === 'title_none' ? [] : [newTitleId],
        petId: petIdToSave
      });
      await this.saveEquippedProfile(result?.profile);
    } catch (e) {
      this.setState({ currentTitle: previousTitle });
      console.warn('Sync Title fail:', e);
    }
  };

  handleFrameChange = async (newFrameId) => {
    const previousFrame = this.state.currentFrame;
    const backgroundIdToSave = toServerBackgroundId(backgroundId(this.state.currentBackground) || LOCAL_DEFAULT_BACKGROUND_ID);
    const titleIdToSave = cosmeticId(this.state.currentTitle);
    const petIdToSave = cosmeticId(this.state.currentPet) || null;

    this.setState({ currentFrame: newFrameId });
    try {
      const result = await handleEquipCosmeticsApi({
        backgroundId: backgroundIdToSave,
        frameId: newFrameId === 'frame_none' ? null : newFrameId,
        titles: titleIdToSave === 'title_none' ? [] : [titleIdToSave],
        petId: petIdToSave
      });
      await this.saveEquippedProfile(result?.profile);
    } catch (e) {
      this.setState({ currentFrame: previousFrame });
      console.warn('Sync Frame fail:', e);
    }
  };

  handleToggleAnimations = () => {
    this.setState(prev => ({ animationsEnabled: !prev.animationsEnabled }));
  };

  handleBackgroundChange = async (newBackground) => {
    const previousBackground = this.state.currentBackground;
    const bgId = backgroundId(newBackground) || LOCAL_DEFAULT_BACKGROUND_ID;
    const frameIdToSave = cosmeticId(this.state.currentFrame);
    const titleIdToSave = cosmeticId(this.state.currentTitle);
    const petIdToSave = cosmeticId(this.state.currentPet) || null;

    this.setState({ currentBackground: bgId });
    try {
      const result = await handleEquipCosmeticsApi({
        backgroundId: toServerBackgroundId(bgId),
        frameId: frameIdToSave === 'frame_none' ? null : frameIdToSave,
        titles: titleIdToSave === 'title_none' ? [] : [titleIdToSave],
        petId: petIdToSave
      });
      await this.saveEquippedProfile(result?.profile);
    } catch (e) {
      this.setState({ currentBackground: previousBackground });
      console.warn('Sync Background fail:', e);
    }
  };

  handlePetChange = async (newPetId) => {
    const previousPet = this.state.currentPet;
    const backgroundIdToSave = toServerBackgroundId(backgroundId(this.state.currentBackground) || LOCAL_DEFAULT_BACKGROUND_ID);
    const frameIdToSave = cosmeticId(this.state.currentFrame);
    const titleIdToSave = cosmeticId(this.state.currentTitle);
    const petIdToSave = cosmeticId(newPetId) || null;

    this.setState({ currentPet: petIdToSave });
    try {
      const result = await handleEquipCosmeticsApi({
        backgroundId: backgroundIdToSave,
        frameId: frameIdToSave === 'frame_none' ? null : frameIdToSave,
        titles: titleIdToSave === 'title_none' ? [] : [titleIdToSave],
        petId: petIdToSave
      });
      await this.saveEquippedProfile(result?.profile);
    } catch (e) {
      this.setState({ currentPet: previousPet });
      console.warn('Sync Pet fail:', e);
    }
  };

  handleSystemIconChange = (id) => {
    this.setState({ currentSystemIcon: id });
  };

  toggleQuests = () => {
    this.setState(prev => ({ isQuestsCollapsed: !prev.isQuestsCollapsed }));
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
        maximizedApp: appId, // Full screen by default
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
    e?.stopPropagation();
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

  handleClaimQuest = async (questKey) => {
    try {
      const result = await claimQuestReward(questKey);
      if (result.success) {
        toast.success(`✨ ${result.message || this.props.t('missions.rewards_claimed')}`);

        const { dailyQuests } = this.props;
        const updatedQuests = { ...dailyQuests.quests };
        if (questKey === 'all_daily') {
          updatedQuests.all_daily = { ...updatedQuests.all_daily, isClaimed: true };
        } else {
          updatedQuests[questKey] = { ...updatedQuests[questKey], isClaimed: true };
        }

        this.props.dispatch(setDailyQuests({
          ...dailyQuests,
          quests: updatedQuests,
        }));

        if (result.newKnowledgePoint !== undefined) {
          const newProfile = { 
            ...this.props.userProfile, 
            budget: {
              ...(this.props.userProfile.budget || {}),
              knowledgePoint: result.newKnowledgePoint
            }
          };
          this.props.setProfile(newProfile);
        }
      } else {
        toast.error(result.error || result.message || 'Action failed!');
      }
    } catch (err) {
      toast.error('Connection error!');
    }
  };

  handleClaimAllQuests = () => {
    const { dailyQuests } = this.props;
    if (!dailyQuests?.quests) return;

    if (dailyQuests.quests.all_daily?.isCompleted && !dailyQuests.quests.all_daily?.isClaimed) {
      this.handleClaimQuest('all_daily');
    } else {
      const claimable = Object.entries(dailyQuests.quests)
        .find(([k, q]) => q.isCompleted && !q.isClaimed);
      if (claimable) {
        this.handleClaimQuest(claimable[0]);
      }
    }
  };

  handleClickOutside = (event) => {
    if (
      this.state.isQuestsOpen
      && this.questsPanelRef.current
      && !this.questsPanelRef.current.contains(event.target)
      && this.questsBtnRef.current
      && !this.questsBtnRef.current.contains(event.target)
    ) {
      this.setState({ isQuestsOpen: false });
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
        await handleLogoutApi();
        toast.success(this.props.t('dashboard.logout_success'));
      } catch (e) {
        console.log(e);
        toast.error(this.props.t('dashboard.logout_failed'));
      }
    }
  };

  renderDesktopLineBackground = (bgId = LOCAL_DEFAULT_BACKGROUND_ID) => (
    <div className={`desktop-line-bg bg-${bgId}`} aria-hidden="true">
      <div className="aurora-field aurora-cyan"></div>
      <div className="aurora-field aurora-magenta"></div>
      <div className="aurora-field aurora-gold"></div>
      <div className="holo-orbit holo-orbit-one"></div>
      <div className="holo-orbit holo-orbit-two"></div>
      <div className="holo-panel holo-panel-one"></div>
      <div className="holo-panel holo-panel-two"></div>
      <div className="study-float-icons">
        {studyFloatIcons.map((item, index) => (
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
    const sanity = getBudgetValue(this.props.userProfile, ['sanity']);
    const eCoin = getBudgetValue(this.props.userProfile, ['eCoin']);
    const knowledgePoint = getBudgetValue(this.props.userProfile, ['knowledgePoint']);
    const rp = this.props.userProfile?.studyStats?.rankScore ?? 0;
    const rankInfo = getRankInfo(rp);
    const activeBgId = backgroundId(currentBackground) || LOCAL_DEFAULT_BACKGROUND_ID;
    const hasCustomBackgroundCss = Boolean(selectedBackground?.assets?.css);
    const shouldRenderDesktopEffects = animationsEnabled && [LOCAL_DEFAULT_BACKGROUND_ID, SERVER_DEFAULT_BACKGROUND_ID].includes(activeBgId) && !selectedBackground?.imageUrl;
    const desktopBackground = selectedBackground?.desktopBackground || selectedBackground?.preview;
    const desktopStyle = desktopBackground && !hasCustomBackgroundCss
      ? {
        '--desktop-user-background': desktopBackground,
        background: desktopBackground,
      }
      : undefined;
    const desktopClassName = [
      'os-desktop',
      !animationsEnabled ? 'no-animations' : '',
      hasCustomBackgroundCss ? 'custom-background-active' : '',
      `icon-style-${iconData.type}`,
    ].filter(Boolean).join(' ');

    return (
      <div className={desktopClassName} style={desktopStyle}>
        <PetOverlay equippedPet={this.state.currentPet} />
        {shouldRenderDesktopEffects && this.renderDesktopLineBackground(activeBgId)}
        {animationsEnabled && hasCustomBackgroundCss && (
          <div className={`desktop-line-bg custom-background-effects bg-${activeBgId}`} aria-hidden="true" />
        )}
        {this.state.isDragging && <div className="drag-overlay"></div>}

        <UserProfileWidget
          currentTitle={this.state.currentTitle}
          currentFrame={this.state.currentFrame}
          currentRank={currentRank}
          userProfile={this.props.userProfile}
          onClick={() => this.openApp('profile')}
          t={t}
        />

        <div className="dashboard-currency-panel">
          <div className="currency-item sanity" title={t('common.sanity')}>
            <div className="currency-icon">
              <img src={currencyAssets.sanity} alt={t('common.sanity')} />
            </div>
            <div className="currency-info">
              <span className="currency-label">{t('common.sanity')}</span>
              <span className="currency-value">{sanity.toLocaleString()}</span>
            </div>
          </div>
          <div className="currency-item ecoin" title={t('common.ecoin')}>
            <div className="currency-icon">
              <img src={currencyAssets.eCoin} alt={t('common.ecoin')} />
            </div>
            <div className="currency-info">
              <span className="currency-label">{t('common.ecoin')}</span>
              <span className="currency-value">{eCoin.toLocaleString()}</span>
            </div>
          </div>
          <div className="currency-item knowledge" title={t('common.knowledge_points')}>
            <div className="currency-icon">
              <img src={currencyAssets.knowledgePoint} alt={t('common.knowledge_points')} />
            </div>
            <div className="currency-info">
              <span className="currency-label">{t('common.knowledge_points')}</span>
              <span className="currency-value">{knowledgePoint.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="desktop-left-column">
          <QuestWidget
          quests={this.props.dailyQuests?.quests ?
            Object.entries(this.props.dailyQuests.quests)
              .filter(([key]) => key !== 'all_daily')
              .map(([key, q]) => ({
                id: key,
                title: t(`quest.items.${key}.name`, { defaultValue: q.name }),
                description: t(`quest.items.${key}.description`, { defaultValue: q.description || '' }),
                type: q.type,
                reward: q.knowledgePoint || 0,
                status: `${q.progress || 0}/${q.target || 1}`,
                isCompleted: q.isCompleted,
                isClaimed: q.isClaimed,
                target: q.target || 1
              })) : []
          }
          allDaily={this.props.dailyQuests?.quests?.all_daily ? {
            name: t('quest.items.all_daily.name', { defaultValue: this.props.dailyQuests.quests.all_daily.name }),
            reward: this.props.dailyQuests.quests.all_daily.knowledgePoint || 100,
            progress: this.props.dailyQuests.quests.all_daily.progress || 0,
            target: this.props.dailyQuests.quests.all_daily.target || 4,
            isCompleted: this.props.dailyQuests.quests.all_daily.isCompleted,
            isClaimed: this.props.dailyQuests.quests.all_daily.isClaimed
          } : null}
          expiresAt={this.props.dailyQuests?.expiresAt || 0}
          isCollapsed={this.state.isQuestsCollapsed}
          onToggle={this.toggleQuests}
          onClaimAll={this.handleClaimAllQuests}
          onClaimQuest={this.handleClaimQuest}
          t={t}
        />

        <MinigameWidget onOpenMinigame={() => this.openApp('minigame')} />
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
              role="dialog"
              aria-label={app.nameKey ? t(app.nameKey) : app.name}
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
                  <button type="button" aria-label={t('dashboard.minimize')} className="control minimize" onClick={(e) => this.toggleMinimize(e, appId)}>
                    <IonIcon icon={removeOutline} />
                  </button>
                  <button
                    type="button"
                    className="control maximize"
                    aria-label={isMaximized ? t('dashboard.restore') : t('dashboard.maximize')}
                    title={isMaximized ? t('dashboard.restore') : t('dashboard.maximize')}
                    onClick={(e) => this.toggleMaximize(e, appId)}
                  >
                    <IonIcon icon={isMaximized ? copyOutline : squareOutline} style={{ fontSize: isMaximized ? 11 : 9 }} />
                  </button>
                  <button type="button" aria-label={t('common.close')} className="control close" onClick={(e) => this.closeApp(e, appId)}>
                    <IonIcon icon={closeOutline} />
                  </button>
                </div>
              </div>
              <div className="window-content">
                <Suspense fallback={<div className="app-loading" role="status">{t('common.loading', 'Loading...')}</div>}>
                  {React.createElement(app.component, {
                  currentBackground: this.state.currentBackground,
                  currentTitle: this.state.currentTitle,
                  currentFrame: this.state.currentFrame,
                  currentPet: this.state.currentPet,
                  currentRank: this.state.currentRank,
                  currentSystemIcon: this.state.currentSystemIcon,
                  animationsEnabled: this.state.animationsEnabled,
                  userProfile: this.props.userProfile,
                  onToggleAnimations: this.handleToggleAnimations,
                  onTitleChange: this.handleTitleChange,
                  onFrameChange: this.handleFrameChange,
                  onBackgroundChange: this.handleBackgroundChange,
                  onSystemIconChange: this.handleSystemIconChange,
                  onPetChange: this.handlePetChange,
                  t,
                  i18n,
                  })}
                </Suspense>
              </div>
            </div>
          );
        })}



        <div className="os-taskbar">
          <div className="taskbar-start">
            <button type="button"
              aria-label={t('dashboard.minimize_all')}
              className="minimize-all-btn"
              onClick={this.handleMinimizeAll}
              title={t('dashboard.minimize_all')}
            >
              <IonIcon icon={removeOutline} aria-hidden="true" />
            </button>
            <button type="button"
              aria-label={t('dashboard.cleanup')}
              className={`start-btn ${this.state.isVacuuming ? 'active' : ''}`}
              onClick={this.handleClearAllApps}
              title={t('dashboard.cleanup')}
            >
              <IonIcon icon={planetOutline} className={this.state.isVacuuming ? 'spinning' : ''} aria-hidden="true" />
            </button>
          </div>

          <div className="floating-app-launcher">
            {APPS.length > this.state.appsPerPage && (
              <button
                className="taskbar-nav-btn prev"
                aria-label={t('dashboard.previous_page', 'Previous apps')}
                disabled={this.state.launcherPage === 0}
                onClick={() => this.setState(prev => ({ launcherPage: Math.max(0, prev.launcherPage - 1) }))}
              >
                <IonIcon icon={chevronBackOutline} />
              </button>
            )}

            <div className="taskbar-launcher">
              {APPS.slice(
                this.state.launcherPage * this.state.appsPerPage,
                (this.state.launcherPage + 1) * this.state.appsPerPage
              ).map(app => (
                <button
                  type="button"
                  key={app.id}
                  className={`launcher-icon ${activeApp === app.id ? 'active' : ''} ${openApps.includes(app.id) ? 'opened' : ''} ${minimizedApps.includes(app.id) ? 'minimized' : ''}`}
                  onClick={(e) => {
                    if (openApps.includes(app.id)) {
                      this.handleTaskbarClick(e, app.id);
                    } else {
                      this.openApp(app.id);
                    }
                  }}
                  title={t(app.nameKey)}
                  aria-label={t(app.nameKey)}
                  aria-pressed={activeApp === app.id}
                >
                  <div className="icon-img-wrapper">
                    <IonIcon icon={app.icon} style={{ fontSize: 24 }} />
                  </div>
                  <div className="indicator"></div>
                </button>
              ))}
            </div>

            {APPS.length > this.state.appsPerPage && (
              <button
                className="taskbar-nav-btn next"
                aria-label={t('dashboard.next_page', 'Next apps')}
                disabled={(this.state.launcherPage + 1) * this.state.appsPerPage >= APPS.length}
                onClick={() => this.setState(prev => ({ launcherPage: prev.launcherPage + 1 }))}
              >
                <IonIcon icon={chevronForwardOutline} />
              </button>
            )}
          </div>

          <div className="taskbar-sys">
            <span className="os-time">{time}</span>
            <button type="button" aria-label={t('common.logout')} className="btn-logout" onClick={this.handleLogout} disabled={disabledButtons.logout} title={t('common.logout')}>
              <IonIcon icon={logOutOutline} />
            </button>
          </div>
        </div>
        <DesktopFriendsWidget friends={this.props.friends} />

        {/* Nút START Focus và Rank ở góc dưới bên phải */}
        <DesktopFocusControl
          currentRank={currentRank}
          rankInfo={rankInfo}
          rp={rp}
          isRankListOpen={this.state.isRankListOpen}
          rankListPage={this.state.rankListPage}
          isRankMode={this.state.isFocusRankMode}
          isPanelOpen={this.state.isFocusPanelOpen}
          onToggleRankList={() => this.setState((prev) => ({ isRankListOpen: !prev.isRankListOpen }))}
          onRankListPageChange={(rankListPage) => this.setState({ rankListPage })}
          onModeChange={(isFocusRankMode) => this.setState({ isFocusRankMode })}
          onTogglePanel={() => this.setState((prev) => ({ isFocusPanelOpen: !prev.isFocusPanelOpen }))}
        />
        {this.state.isFocusPanelOpen && (
          <div className="desktop-focus-sidebar">
            <div className="focus-sidebar-header">
              <span className="focus-sidebar-title">
                <IonIcon icon={shieldCheckmarkOutline} style={{ marginRight: 6 }} />
                {t('common.focus')}
              </span>
              <button 
                className="close-btn" 
                onClick={() => this.setState({ isFocusPanelOpen: false })}
                title={t('common.close')}
              >
                <IonIcon icon={closeOutline} />
              </button>
            </div>
            <div className="focus-sidebar-body">
              <FocusGuard defaultHardMode={this.state.isFocusRankMode} />
            </div>
          </div>
        )}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userProfile: state.profile.userProfile,
  dailyQuests: state.quest.daily,
  friends: state.social.items || [],
  socialLoaded: state.social.hasMore === false || (state.social.items?.length || 0) > 0,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch,
  setProfile: (info) => dispatch(setProfile(info)),
  setSocial: (data) => dispatch(setSocial(data)),
});

export default withTranslation()(connect(mapStateToProps, mapDispatchToProps)(Dashboard));

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, ticketOutline, gameControllerOutline,
  cartOutline, closeOutline, removeOutline, squareOutline, logOutOutline,
  personOutline, planetOutline, copyOutline,
  schoolOutline, peopleOutline, cubeOutline,
  chevronBackOutline, chevronForwardOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import * as allIcons from 'ionicons/icons';

import FocusGuard from '../focus/FocusGuard';
import Profile from '../profile/Profile';
import StudyPlanner from '../study-planner/StudyPlanner';
import cosmeticManager from '../../managers/cosmeticManager';
import GachaTestApp from '../gacha/GachaApp';
import MinigameHub from '../minihub/MinigameHub';
import Shop from '../shop/Shop';
import SettingsApp from '../settings/SettingsApp';
import SocialApp from '../social/SocialApp';
import RankFrame from '../../components/RankFrame';
import { handleLogoutApi } from '../../services/authService';
import { handleGetMasterDataApi, handleEquipCosmeticsApi } from '../../services/cosmeticServices';
import { handleSyncAllApi } from '../../services/syncService';
import QuestWidget from '../quest/QuestWidget';
import { getDailyQuests, claimQuestReward, refreshDailyQuests } from '../../services/questService';
import { userLogin, updateBudget, setInventory, setDailyQuests } from '../../store/actions';
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
const backgroundId = (background) => (
  typeof background === 'string' ? background : background?.id
);

const S3_AVATAR_BASE = (import.meta.env.VITE_S3_ASSETS_URL || '') + 'avatars/';
const DEFAULT_AVATAR = S3_AVATAR_BASE + 'default_avatar.jpg';

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
  const displayName = userProfile?.username || 'Unde_user';
  const rankLabel = translateRank(currentRank, t);
  const titleName = translateCosmeticName(titleData, t);

  return (
    <div className={`user-profile-widget rank-${currentRank}`} onClick={onClick}>
      <RankFrame tier={frameTier} size={64} className="widget-rank-frame">
        {userProfile?.avatar ? (
          <img src={userProfile.avatar} alt="avatar" className="avatar-img" onError={(e) => { e.target.src = DEFAULT_AVATAR; }} />
        ) : (
          <img src={DEFAULT_AVATAR} alt="avatar" className="avatar-img" />
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
  { id: 'shop', nameKey: 'common.shop', className: 'shop', icon: cartOutline, content: <Shop /> },
  { id: 'social', nameKey: 'common.social', className: 'social', icon: peopleOutline, content: <SocialApp /> },
  { id: 'focus', nameKey: 'common.focus', className: 'focus', icon: shieldCheckmarkOutline, content: <FocusGuard /> },
  { id: 'study-planner', nameKey: 'common.study_planner', className: 'study-planner-icon', icon: schoolOutline, content: <StudyPlanner /> }
];

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux selection
  const userProfile = useSelector(state => state.profile.userProfile);
  const dailyQuests = useSelector(state => state.quest.dailyQuests);

  // Layout & Windows State
  const [activeApp, setActiveApp] = useState(null);
  const [openApps, setOpenApps] = useState([]);
  const [minimizedApps, setMinimizedApps] = useState([]);
  const [maximizedApp, setMaximizedApp] = useState(null);
  const [windowPositions, setWindowPositions] = useState({});
  const [stackOrder, setStackOrder] = useState([]);
  const [launcherPage, setLauncherPage] = useState(0);
  const appsPerPage = 5;

  // Customization & Utilities State
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentRank] = useState('diamond');
  const [currentBackground, setCurrentBackground] = useState('bg_default');
  const [currentTitle, setCurrentTitle] = useState('title_newbie');
  const [currentFrame, setCurrentFrame] = useState('frame_none');
  const [currentSystemIcon, setCurrentSystemIcon] = useState('icon_default');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [isQuestsOpen, setIsQuestsOpen] = useState(true);
  const [isQuestsCollapsed, setIsQuestsCollapsed] = useState(false);
  const [floatingIcons, setFloatingIcons] = useState([]);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);

  // Dragging State
  const [isDragging, setIsDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Refs for tracking mutable positions during drag event listeners
  const isDraggingRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const windowPositionsRef = useRef({});
  const dragRaf = useRef(null);
  const questsPanelRef = useRef(null);
  const questsBtnRef = useRef(null);

  // Keep references updated for handleDragging to access without stale closures
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  useEffect(() => {
    windowPositionsRef.current = windowPositions;
  }, [windowPositions]);

  // Fetch floating icons based on background config
  const fetchFloatingIcons = async (bgId) => {
    try {
      const rawBase = import.meta.env.VITE_S3_ASSETS_URL || '';
      const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
      const url = `${base}themes/${bgId}/assets/${bgId}_icons.json`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setFloatingIcons(data);
          return;
        }
      }
    } catch (e) {
      console.warn('[Dashboard] Failed to fetch floating icons:', e);
    }
    setFloatingIcons([]);
  };

  // Sync profile data from server
  const performSyncAll = async () => {
    try {
      const syncResponse = await handleSyncAllApi();
      if (syncResponse && syncResponse.profile) {
        const { profile, inventory } = syncResponse;
        const cosmetics = profile.equippedCosmetics || {};

        if (inventory) {
          inventoryManager.inventory = inventory.map(item => ({
            id: item.SK,
            SK: item.SK,
            amount: item.amount || 1
          }));
          dispatch(setInventory({ items: inventory }));
        }

        dispatch(userLogin(profile));

        setCurrentBackground(cosmetics.equippedBackground || 'bg_default');
        setCurrentFrame(cosmetics.equippedFrame || 'frame_none');
        setCurrentTitle((cosmetics.equippedTitles && cosmetics.equippedTitles[0]) || 'title_newbie');

        console.log('[Dashboard] Cloud Sync hoàn tất:', profile);
      }
    } catch (e) {
      console.warn('[Dashboard] Cloud Sync thất bại:', e);
    }
  };

  // Load and refresh daily quests
  const loadDailyQuests = async () => {
    const now = Math.floor(Date.now() / 1000);
    try {
      if (window.api?.invoke) {
        const stored = await window.api.invoke('quest:load');
        if (stored?.success && stored.data?.quests && stored.data.expiresAt) {
          if (stored.data.expiresAt > now) {
            console.log('[Quest] Load từ store thành công (còn hạn). Update Redux...');
            dispatch(setDailyQuests(stored.data));
            return;
          } else {
            console.log('[Quest] Store có data nhưng hết hạn. Tiến hành refreshDaily...');
            const refreshResult = await refreshDailyQuests();
            if (refreshResult.success && refreshResult.daily) {
              dispatch(setDailyQuests(refreshResult.daily));
              await window.api.invoke('quest:save', refreshResult.daily);
              return;
            }
          }
        }
      }

      console.log('[Quest] Gọi getDaily lấy dữ liệu từ server...');
      const result = await getDailyQuests();

      if (result.success && result.daily) {
        console.log('[Quest] GetDaily thành công. Lưu store & update Redux.');
        dispatch(setDailyQuests(result.daily));
        if (window.api?.invoke) {
          await window.api.invoke('quest:save', result.daily);
        }
      } else {
        console.warn('[Quest] API getDaily fail:', result.error);
      }
    } catch (err) {
      console.error('[Quest] Load error:', err);
    }
  };

  // 1. Clock interval
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timerInterval);
  }, []);

  // 2. Click outside quest widget and page visibility tracking
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isQuestsOpen &&
        questsPanelRef.current &&
        !questsPanelRef.current.contains(event.target) &&
        questsBtnRef.current &&
        !questsBtnRef.current.contains(event.target)
      ) {
        setIsQuestsOpen(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSyncAll();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isQuestsOpen]);

  // 3. Initial load setup
  useEffect(() => {
    cosmeticManager.applyBackgroundAssets(currentBackground);
    fetchFloatingIcons(currentBackground);

    const initMasterDataAndSync = async () => {
      try {
        const response = await handleGetMasterDataApi();
        if (response && Array.isArray(response.items) && response.items.length > 0) {
          cosmeticManager.loadFromMasterData(response.items);
          setMasterDataLoaded(true);
          cosmeticManager.applyBackgroundAssets(currentBackground);
        }
      } catch (e) {
        console.warn('Không thể tải master data:', e);
      }
    };

    initMasterDataAndSync();

    const syncTimeout = setTimeout(() => performSyncAll(), 5000);
    loadDailyQuests();

    return () => clearTimeout(syncTimeout);
  }, []);

  // 4. Background state updates
  useEffect(() => {
    cosmeticManager.applyBackgroundAssets(currentBackground);
    fetchFloatingIcons(currentBackground);
  }, [currentBackground]);

  // 5. Dynamic mouse dragging setup only when a drag is active
  useEffect(() => {
    if (!isDragging) return;

    const handleDragging = (e) => {
      if (e.cancelable) e.preventDefault();

      const appId = isDraggingRef.current;
      if (!appId) return;

      const event = e.touches ? e.touches[0] : e;
      const headerHeight = 42;
      const taskbarHeight = 48;
      const padding = 100;

      const newX = Math.max(-(900 - padding), Math.min(event.clientX - dragOffsetRef.current.x, window.innerWidth - padding));
      const newY = Math.max(0, Math.min(event.clientY - dragOffsetRef.current.y, window.innerHeight - taskbarHeight - headerHeight));

      if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
      dragRaf.current = requestAnimationFrame(() => {
        setWindowPositions(prev => ({
          ...prev,
          [appId]: { x: newX, y: newY },
        }));
      });
    };

    const handleDragEnd = () => {
      setIsDragging(null);
      if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
    };

    window.addEventListener('mousemove', handleDragging);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragging, { passive: false });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragging);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragging);
      window.removeEventListener('touchend', handleDragEnd);
      if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
    };
  }, [isDragging]);

  // UI Event Handlers
  const handleClearAllApps = () => {
    if (openApps.length === 0) return;

    setIsVacuuming(true);

    setTimeout(() => {
      setOpenApps([]);
      setActiveApp(null);
      setMinimizedApps([]);
      setMaximizedApp(null);
      setIsVacuuming(false);
      toast.success(t('dashboard.system_cleanup_complete'), {
        icon: 'clean',
        theme: 'dark',
        autoClose: 1500,
      });
    }, 800);
  };

  const handleTitleChange = async (newTitleId) => {
    setCurrentTitle(newTitleId);
    try {
      await handleEquipCosmeticsApi({
        backgroundId: currentBackground,
        frameId: currentFrame,
        titles: [newTitleId]
      });
    } catch (e) {
      console.warn('Sync Title fail:', e);
    }
  };

  const handleFrameChange = async (newFrameId) => {
    setCurrentFrame(newFrameId);
    try {
      await handleEquipCosmeticsApi({
        backgroundId: currentBackground,
        frameId: newFrameId,
        titles: [currentTitle]
      });
    } catch (e) {
      console.warn('Sync Frame fail:', e);
    }
  };

  const handleToggleAnimations = () => {
    setAnimationsEnabled(prev => !prev);
  };

  const handleBackgroundChange = async (newBackground) => {
    const bgId = typeof newBackground === 'string' ? newBackground : newBackground.id;
    setCurrentBackground(bgId);
    try {
      await handleEquipCosmeticsApi({
        backgroundId: bgId,
        frameId: currentFrame,
        titles: [currentTitle]
      });
    } catch (e) {
      console.warn('Sync Background fail:', e);
    }
  };

  const handleSystemIconChange = (id) => {
    setCurrentSystemIcon(id);
  };

  const toggleQuests = () => {
    setIsQuestsCollapsed(prev => !prev);
  };

  const openApp = (appId) => {
    const isAlreadyOpen = openApps.includes(appId);
    const newOpenApps = isAlreadyOpen ? openApps : [...openApps, appId];

    setStackOrder(prev => {
      const filtered = prev.filter(id => id !== appId);
      return [...filtered, appId];
    });

    setWindowPositions(prev => {
      if (prev[appId]) return prev;

      const winW = 900;
      const winH = 600;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight - 48;

      const openCount = openApps.filter(id => !minimizedApps.includes(id)).length;
      const cascadeOffset = (openCount % 5) * 30;

      return {
        ...prev,
        [appId]: {
          x: Math.max(20, (screenW - winW) / 2 - 100 + cascadeOffset),
          y: Math.max(20, (screenH - winH) / 2 - 80 + cascadeOffset),
        }
      };
    });

    setOpenApps(newOpenApps);
    setActiveApp(appId);
    setMinimizedApps(prev => prev.filter(id => id !== appId));
    setMaximizedApp(appId);
  };

  const bringToFront = (appId) => {
    if (activeApp === appId) return;
    setStackOrder(prev => {
      const filtered = prev.filter(id => id !== appId);
      return [...filtered, appId];
    });
    setActiveApp(appId);
  };

  const closeApp = (e, appId) => {
    e.stopPropagation();
    const remainingApps = openApps.filter(id => id !== appId);

    setOpenApps(remainingApps);
    setMinimizedApps(prev => prev.filter(id => id !== appId));

    setStackOrder(prev => {
      const filtered = prev.filter(id => id !== appId);
      setActiveApp(prevActive => {
        if (prevActive === appId) {
          return filtered[filtered.length - 1] || null;
        }
        return prevActive;
      });
      return filtered;
    });

    setMaximizedApp(prev => prev === appId ? null : prev);
  };

  const toggleMinimize = (e, appId) => {
    e.stopPropagation();
    const isMinimized = minimizedApps.includes(appId);

    if (isMinimized) {
      setMinimizedApps(prev => prev.filter(id => id !== appId));
      setActiveApp(appId);
      setStackOrder(prev => [...prev.filter(id => id !== appId), appId]);
      return;
    }

    setMinimizedApps(prev => {
      const newMinimized = [...prev, appId];
      setStackOrder(prevStack => {
        const filtered = prevStack.filter(id => id !== appId);
        const nextActive = filtered
          .slice()
          .reverse()
          .find(id => id !== appId && !newMinimized.includes(id)) || null;
        setActiveApp(nextActive);
        return filtered;
      });
      return newMinimized;
    });
  };

  const handleTaskbarClick = (e, appId) => {
    e.stopPropagation();
    const isMinimized = minimizedApps.includes(appId);

    if (isMinimized) {
      setMinimizedApps(prev => prev.filter(id => id !== appId));
      setActiveApp(appId);
      setStackOrder(prev => [...prev.filter(id => id !== appId), appId]);
    } else if (activeApp !== appId) {
      bringToFront(appId);
    } else {
      toggleMinimize(e, appId);
    }
  };

  const handleMinimizeAll = () => {
    if (openApps.length === 0) return;

    setMinimizedApps([...openApps]);
    setActiveApp(null);

    toast.info(t('dashboard.minimize_all'), {
      icon: 'min',
      theme: 'dark',
      autoClose: 1000,
    });
  };

  const toggleMaximize = (e, appId) => {
    e.stopPropagation();
    setMaximizedApp(prev => prev === appId ? null : appId);
  };

  const handleClaimQuest = async (questKey) => {
    try {
      const result = await claimQuestReward(questKey);
      if (result.success) {
        toast.success(`✨ ${result.message || t('missions.rewards_claimed')}`);

        const updatedQuests = { ...dailyQuests.quests };
        if (questKey === 'all_daily') {
          updatedQuests.all_daily = { ...updatedQuests.all_daily, isClaimed: true };
        } else {
          updatedQuests[questKey] = { ...updatedQuests[questKey], isClaimed: true };
        }

        dispatch(setDailyQuests({
          ...dailyQuests,
          quests: updatedQuests,
        }));

        if (result.newKnowledgePoint !== undefined) {
          dispatch(updateBudget({ knowledgePoint: result.newKnowledgePoint }));
        }
      } else {
        toast.error(result.error || result.message || 'Action failed!');
      }
    } catch (err) {
      toast.error('Connection error!');
    }
  };

  const handleClaimAllQuests = () => {
    if (!dailyQuests?.quests) return;

    if (dailyQuests.quests.all_daily?.isCompleted && !dailyQuests.quests.all_daily?.isClaimed) {
      handleClaimQuest('all_daily');
    } else {
      const claimable = Object.entries(dailyQuests.quests)
        .find(([k, q]) => q.isCompleted && !q.isClaimed);
      if (claimable) {
        handleClaimQuest(claimable[0]);
      }
    }
  };

  const handleDragStart = (e, appId) => {
    if (maximizedApp === appId) return;

    const event = e.touches ? e.touches[0] : e;
    const currentX = windowPositionsRef.current[appId]?.x || 0;
    const currentY = windowPositionsRef.current[appId]?.y || 0;

    setActiveApp(appId);
    setIsDragging(appId);
    setStackOrder(prev => [...prev.filter(id => id !== appId), appId]);
    setDragOffset({
      x: event.clientX - currentX,
      y: event.clientY - currentY,
    });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    const confirmAction = () =>
      new Promise((resolve) => {
        toast(
          <div>
            <p>{t('dashboard.logout_confirm')}</p>
            <button
              className="toast-confirm-btn"
              onClick={() => { resolve(true); toast.dismiss(); }}
            >
              {t('common.yes')}
            </button>
            <button
              className="toast-cancel-btn"
              onClick={() => { resolve(false); toast.dismiss(); }}
            >
              {t('common.no')}
            </button>
          </div>,
          {
            autoClose: 2000,
            closeOnClick: false,
            onClose: () => {
              setIsLoggingOut(false);
            },
          },
        );
      });

    const isConfirmed = await confirmAction();
    if (isConfirmed) {
      try {
        await handleLogoutApi();
        toast.success(t('dashboard.logout_success'));
        navigate('/login');
      } catch (e) {
        console.log(e);
        toast.error(t('dashboard.logout_failed'));
      }
    }
  };

  const iconData = cosmeticManager.getCosmeticInfo('systemIcons', currentSystemIcon)
    || cosmeticManager.getAllInCategory('systemIcons')[0]
    || { type: 'outline' };

  const selectedBackground = cosmeticManager.getCosmeticInfo('backgrounds', currentBackground)
    || cosmeticManager.getAllInCategory('backgrounds')[0];
  const desktopBackgroundStyle = selectedBackground?.desktopBackground || selectedBackground?.preview;

  const desktopStyle = desktopBackgroundStyle
    ? { background: desktopBackgroundStyle }
    : { backgroundColor: '#0b1028' };

  const desktopClassName = [
    'os-desktop',
    !animationsEnabled ? 'no-animations' : '',
    `icon-style-${iconData.type}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={desktopClassName} style={desktopStyle}>
      {floatingIcons && floatingIcons.length > 0 && (
        <div className="study-float-icons" aria-hidden="true">
          {floatingIcons.map((item, index) => (
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
              <IonIcon icon={allIcons[item.icon] || allIcons.helpOutline} />
            </div>
          ))}
        </div>
      )}
      <div className="desktop-bg-dim"></div>
      {isDragging && <div className="drag-overlay"></div>}

      <UserProfileWidget
        currentTitle={currentTitle}
        currentFrame={currentFrame}
        currentRank={currentRank}
        userProfile={userProfile}
        onClick={() => openApp('profile')}
        t={t}
      />

      <div ref={questsBtnRef} style={{ display: 'none' }} />
      <div ref={questsPanelRef}>
        <QuestWidget
          quests={dailyQuests?.quests ?
            Object.entries(dailyQuests.quests)
              .filter(([key]) => key !== 'all_daily')
              .map(([key, q]) => ({
                id: key,
                title: q.name,
                description: q.description || '',
                type: q.type,
                reward: q.knowledgePoint || 0,
                status: `${q.progress || 0}/${q.target || 1}`,
                isCompleted: q.isCompleted,
                isClaimed: q.isClaimed,
                target: q.target || 1
              })) : []
          }
          allDaily={dailyQuests?.quests?.all_daily ? {
            name: dailyQuests.quests.all_daily.name,
            reward: dailyQuests.quests.all_daily.knowledgePoint || 100,
            progress: dailyQuests.quests.all_daily.progress || 0,
            target: dailyQuests.quests.all_daily.target || 4,
            isCompleted: dailyQuests.quests.all_daily.isCompleted,
            isClaimed: dailyQuests.quests.all_daily.isClaimed
          } : null}
          expiresAt={dailyQuests?.expiresAt || 0}
          isCollapsed={isQuestsCollapsed}
          onToggle={toggleQuests}
          onClaimAll={handleClaimAllQuests}
          onClaimQuest={handleClaimQuest}
          t={t}
        />
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
            className={`os-window ${app.className} ${appId === 'profile' ? `rank-${currentRank}` : ''} ${activeApp === appId ? 'active' : ''} ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''} ${isVacuuming ? 'vacuuming' : ''} ${isDragging === appId ? 'dragging' : ''}`}
            style={{
              top: isMaximized ? 0 : pos.y,
              left: isMaximized ? 0 : pos.x,
              zIndex: stackOrder.indexOf(appId) + 10,
            }}
            onMouseDown={() => bringToFront(appId)}
          >
            <div
              className="window-header"
              onMouseDown={(e) => handleDragStart(e, appId)}
              onTouchStart={(e) => handleDragStart(e, appId)}
            >
              <div className="window-title">
                {app.nameKey ? t(app.nameKey) : app.name}
              </div>
              <div className="window-controls">
                <button className="control minimize" onClick={(e) => toggleMinimize(e, appId)}>
                  <IonIcon icon={removeOutline} />
                </button>
                <button
                  className="control maximize"
                  title={isMaximized ? t('dashboard.restore') : t('dashboard.maximize')}
                  onClick={(e) => toggleMaximize(e, appId)}
                >
                  <IonIcon icon={isMaximized ? copyOutline : squareOutline} style={{ fontSize: isMaximized ? 11 : 9 }} />
                </button>
                <button className="control close" onClick={(e) => closeApp(e, appId)}>
                  <IonIcon icon={closeOutline} />
                </button>
              </div>
            </div>
            <div className="window-content">
              {React.cloneElement(app.content, {
                currentBackground: currentBackground,
                currentTitle: currentTitle,
                currentFrame: currentFrame,
                currentRank: currentRank,
                currentSystemIcon: currentSystemIcon,
                animationsEnabled: animationsEnabled,
                userProfile: userProfile,
                onToggleAnimations: handleToggleAnimations,
                onTitleChange: handleTitleChange,
                onFrameChange: handleFrameChange,
                onBackgroundChange: handleBackgroundChange,
                onSystemIconChange: handleSystemIconChange,
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
            onClick={handleMinimizeAll}
            title={t('dashboard.minimize_all')}
          >
            <IonIcon icon={removeOutline} />
          </div>
          <div
            className={`start-btn ${isVacuuming ? 'active' : ''}`}
            onClick={handleClearAllApps}
            title={t('dashboard.cleanup')}
          >
            <IonIcon icon={planetOutline} className={isVacuuming ? 'spinning' : ''} />
          </div>
        </div>

        <div className="floating-app-launcher">
          {APPS.length > appsPerPage && (
            <button
              className="taskbar-nav-btn prev"
              disabled={launcherPage === 0}
              onClick={() => setLauncherPage(prev => Math.max(0, prev - 1))}
            >
              <IonIcon icon={chevronBackOutline} />
            </button>
          )}

          <div className="taskbar-launcher">
            {APPS.slice(
              launcherPage * appsPerPage,
              (launcherPage + 1) * appsPerPage
            ).map(app => (
              <div
                key={app.id}
                className={`launcher-icon ${activeApp === app.id ? 'active' : ''} ${openApps.includes(app.id) ? 'opened' : ''} ${minimizedApps.includes(app.id) ? 'minimized' : ''}`}
                onClick={(e) => {
                  if (openApps.includes(app.id)) {
                    handleTaskbarClick(e, app.id);
                  } else {
                    openApp(app.id);
                  }
                }}
                title={t(app.nameKey)}
              >
                <div className="icon-img-wrapper">
                  <IonIcon icon={app.icon} style={{ fontSize: 24 }} />
                </div>
                <div className="indicator"></div>
              </div>
            ))}
          </div>

          {APPS.length > appsPerPage && (
            <button
              className="taskbar-nav-btn next"
              disabled={(launcherPage + 1) * appsPerPage >= APPS.length}
              onClick={() => setLauncherPage(prev => prev + 1)}
            >
              <IonIcon icon={chevronForwardOutline} />
            </button>
          )}
        </div>

        <div className="taskbar-sys">
          <span className="os-time">{time}</span>
          <button className="btn-logout" onClick={handleLogout} disabled={isLoggingOut} title={t('common.logout')}>
            <IonIcon icon={logOutOutline} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

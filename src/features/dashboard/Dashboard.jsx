import React, { Component } from 'react';
import { signOut } from 'aws-amplify/auth';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, cubeOutline, ticketOutline, gameControllerOutline,
  cartOutline, closeOutline, removeOutline, squareOutline, logOutOutline,
  imageOutline, personOutline, globeOutline, cart, planetOutline, starOutline,
  copyOutline, listOutline, flagOutline, compassOutline, lockClosedOutline,
  giftOutline, bookOutline, schoolOutline, calculatorOutline, pencilOutline,
  bulbOutline, libraryOutline, readerOutline, documentTextOutline,
  journalOutline, newspaperOutline, createOutline, flaskOutline,
  telescopeOutline, easelOutline, statsChartOutline, ribbonOutline,
  medalOutline, trophyOutline, hourglassOutline, clipboardOutline
} from 'ionicons/icons';

import FocusWidget from '../focus/FocusWidget';
import Profile from '../profile/Profile';
import MissionsWidget from '../missions/MissionsWidget';
import cosmeticManager from '../../managers/cosmeticManager';
import GachaTestApp from '../gacha/GachaApp';
import MinigameHub from '../minihub/MinigameHub';
import Store from '../store/Store';
import RankFrame from '../../components/RankFrame';
import { withRouter } from '../../utils/withRouter';
import { handleLogoutApi } from '../../services/authServices';
import { userLogout } from '../../store/actions';
import './Dashboard.scss';

// ═══ User Profile Widget ═══
const RANK_LABELS = {
  en: {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    diamond: 'Diamond',
    master: 'Master',
  },
  vi: {
    bronze: 'Đồng',
    silver: 'Bạc',
    gold: 'Vàng',
    platinum: 'Bạch kim',
    diamond: 'Kim cương',
    master: 'Cao thủ',
  },
};

const UI_TEXT = {
  en: {
    rankPrefix: 'Rank',
    apps: {
      settings: 'Settings',
      profile: 'Profile',
      gacha: 'Gacha',
      minigame: 'Mini Games',
      store: 'Store',
      focus: 'Focus Mode',
    },
    controls: {
      minimizeAll: 'Minimize All',
      cleanDesktop: 'Clean Desktop',
      restore: 'Restore',
      maximize: 'Maximize',
    },
    settings: {
      title: 'User Preferences',
      profileAvatar: 'Profile Avatar',
      uploadAvatar: 'Upload new avatar',
      uploadHint: 'Optimal size 256x256. Max 2MB.',
      accountDetails: 'Account Details',
      username: 'Username',
      renameNote: '* Rename costs 10,000 P-Coin',
      rename: 'Rename',
      preferences: 'Preferences',
      preferencesDesc: 'Quick adjustments for your experience.',
      language: 'Language',
      english: 'English',
      vietnamese: 'Vietnamese',
    },
  },
  vi: {
    rankPrefix: 'Hạng',
    apps: {
      settings: 'Cài đặt',
      profile: 'Hồ sơ',
      gacha: 'Gacha',
      minigame: 'Mini Games',
      store: 'Cửa hàng',
      focus: 'Tập trung',
    },
    controls: {
      minimizeAll: 'Thu nhỏ tất cả',
      cleanDesktop: 'Dọn desktop',
      restore: 'Khôi phục',
      maximize: 'Phóng to',
    },
    settings: {
      title: 'Tùy chỉnh người dùng',
      profileAvatar: 'Avatar hồ sơ',
      uploadAvatar: 'Tải avatar mới',
      uploadHint: 'Kích thước tốt nhất 256x256. Tối đa 2MB.',
      accountDetails: 'Thông tin tài khoản',
      username: 'Tên người dùng',
      renameNote: '* Đổi tên tốn 10.000 P-Coin',
      rename: 'Đổi tên',
      preferences: 'Tùy chọn',
      preferencesDesc: 'Điều chỉnh nhanh trải nghiệm của bạn.',
      language: 'Ngôn ngữ',
      english: 'Tiếng Anh',
      vietnamese: 'Tiếng Việt',
    },
  },
};

const getText = (language) => UI_TEXT[language] || UI_TEXT.en;
const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'vi';
  return window.localStorage.getItem('studyPlayLanguage') || 'vi';
};

const UserProfileWidget = ({ currentTitle, currentFrame, currentRank = 'diamond', language = 'vi', onClick }) => {
  const titleData = cosmeticManager.getCosmeticInfo('titles', currentTitle) || cosmeticManager.getAllInCategory('titles')[0];
  const text = getText(language);
  const rankLabel = RANK_LABELS[language]?.[currentRank] || RANK_LABELS.en[currentRank] || RANK_LABELS.en.diamond;

  const frameTier = (currentFrame || '').replace('frame_', '') || 'none';

  return (
    <div className={`user-profile-widget rank-${currentRank}`} onClick={onClick}>
      <RankFrame tier={frameTier} size={64} className="widget-rank-frame">
        <IonIcon icon={personOutline} />
      </RankFrame>
      <div className="user-info">
        <div className="user-name-line">
          <span className="username">Player_9999</span>
        </div>
        <div className="title-rank-line">
          <span className="user-title" style={{ color: titleData.color }}>[{titleData.name}]</span>
          <span className={`user-rank rank-${currentRank}`}>{text.rankPrefix}: {rankLabel}</span>
        </div>
      </div>
    </div>
  );
};

// ═══ Settings App ═══
const resolveBackground = (background) => {
  if (background && typeof background === 'object') return background;
  return cosmeticManager.getCosmeticInfo('backgrounds', background);
};

const SettingsApp = ({ currentTitle }) => {
  const selectedTitleData = cosmeticManager.getCosmeticInfo('titles', currentTitle) || cosmeticManager.getAllInCategory('titles')[0];

  return (
    <div className="app-container settings-app">
      <h2 className="app-title"><IonIcon icon={settingsOutline} /> User Preferences</h2>

      <div className="section">
        <h3><IonIcon icon={imageOutline} /> Profile Avatar</h3>
        <div className="avatar-upload">
          <div className="avatar-circle">
            <IonIcon icon={personOutline} style={{ fontSize: 32 }} />
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 6 }}>Upload new avatar</p>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>Optimal size 256x256. Max 2MB.</p>
          </div>
        </div>
      </div>

      <div className="section">
        <h3><IonIcon icon={personOutline} /> Account Details</h3>
        <div className="account-details">
          <div className="info">
            <p className="label">Username</p>
            <div className="name-wrapper">
              <span className="name">Player_9999</span>
              <span className="user-title" style={{ color: selectedTitleData.color }}>
                [{selectedTitleData.name}]
              </span>
            </div>
            <p className="note">* Đổi tên tốn 10.000 P-Coin</p>
          </div>
          <button className="btn-rename">Rename</button>
        </div>
      </div>

      <div className="section">
        <h3><IonIcon icon={globeOutline} /> Preferences</h3>
        <p className="section-desc">Quick adjustments for your experience.</p>
        <div className="settings-options">
          <div className="option">
            <label>Language</label>
            <select className="language-select">
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══ Cosmetics Store ═══

// ═══ App Registry ═══
const APPS = [
  { id: 'settings', name: 'Settings', className: 'settings', icon: settingsOutline, content: <SettingsApp /> },
  { id: 'profile', name: 'Profile', className: 'profile', icon: personOutline, content: <Profile /> },
  { id: 'gacha', name: 'Gacha', className: 'gacha', icon: ticketOutline, content: <GachaTestApp /> },
  { id: 'minigame', name: 'Mini Games', className: 'minigame', icon: gameControllerOutline, content: <MinigameHub /> },
  { id: 'store', name: 'Store', className: 'store', icon: cartOutline, content: <Store /> },
  { id: 'focus', name: 'Focus Mode', className: 'focus', icon: lockClosedOutline, content: <FocusWidget /> },
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
  { icon: clipboardOutline, top: '66%', color: '#d8b4fe', duration: '41s', delay: '-28s', direction: 'left' }
];

// ═══ MAIN DASHBOARD COMPONENT ═══
class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeApp: null,
      openApps: [], // Danh sách các ID app đang mở
      minimizedApps: [], // Danh sách các ID app đang ẩn (thu nhỏ)
      maximizedApp: null, // ID của app đang phóng to toàn màn hình
      windowPositions: {}, // Map { appId: { x, y } }
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disabledButtons: { logout: false },
      isDragging: null,
      dragOffset: { x: 0, y: 0 },
      currentRank: 'diamond',
      currentBackground: 'bg_default',
      currentTitle: 'title_newbie',
      currentFrame: 'frame_gold',
      isVacuuming: false,
      isMissionsOpen: false,
      missions: [
        { id: 1, title: 'Mission 1', desc: 'Sơ khai thế giới', status: '1/1' },
        { id: 2, title: 'Mission 2', desc: 'Thử thách tân thủ', status: '4/4' },
        { id: 3, title: 'Mission 3', desc: 'Nhà sưu tầm', status: '3/3' },
        { id: 4, title: 'Mission 4', desc: 'Đại gia lộ diện', status: '1/1' },
      ]
    };
    this.timerInterval = null;
    this.missionsPanelRef = React.createRef();
    this.missionsBtnRef = React.createRef();
  }

  handleClearAllApps = () => {
    if (this.state.openApps.length === 0) return;

    this.setState({ isVacuuming: true });

    // Đợi hiệu ứng hút chạy xong (0.8s) rồi mới dọn dẹp state
    setTimeout(() => {
      this.setState({
        openApps: [],
        activeApp: null,
        minimizedApps: [],
        maximizedApp: null,
        isVacuuming: false
      });
      toast.success('System cleanup complete!', {
        icon: '🧹',
        theme: 'dark',
        autoClose: 1500
      });
    }, 800);
  };

  handleTitleChange = (newTitleId) => {
    this.setState({ currentTitle: newTitleId });
  };

  handleFrameChange = (newFrameId) => {
    this.setState({ currentFrame: newFrameId });
  };

  handleBackgroundChange = (newBackground) => {
    this.setState({ currentBackground: newBackground });
  };

  toggleMissions = () => {
    this.timerInterval = setInterval(() => {
      this.setState({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }, 60000);
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    document.removeEventListener('mousedown', this.handleClickOutside);
    window.removeEventListener('mousemove', this.handleDragging);
    window.removeEventListener('mouseup', this.handleDragEnd);
  }

  // --- QUẢN LÝ ỨNG DỤNG ---
  openApp = (appId) => {
    this.setState((prev) => {
      const isAlreadyOpen = prev.openApps.includes(appId);
      const newOpenApps = isAlreadyOpen ? prev.openApps : [...prev.openApps, appId];

      const newPositions = { ...prev.windowPositions };
      if (!newPositions[appId]) {
        // AUTO CENTER: Tính toán tâm màn hình
        const winW = 900;
        const winH = 600;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight - 48; // Trừ taskbar

        newPositions[appId] = {
          x: Math.max(0, (screenW - winW) / 2) + (newOpenApps.length * 10),
          y: Math.max(0, (screenH - winH) / 2) + (newOpenApps.length * 10)
        };
      }

      return {
        openApps: newOpenApps,
        activeApp: appId,
        minimizedApps: prev.minimizedApps.filter(id => id !== appId)
      };
    });
  };

  closeApp = (e, appId) => {
    e.stopPropagation();
    this.setState(prev => ({
      openApps: prev.openApps.filter(id => id !== appId),
      minimizedApps: prev.minimizedApps.filter(id => id !== appId),
      activeApp: prev.activeApp === appId ? (prev.openApps.filter(id => id !== appId)[0] || null) : prev.activeApp,
      maximizedApp: prev.maximizedApp === appId ? null : prev.maximizedApp
    }));
  };

  toggleMinimize = (e, appId) => {
    e.stopPropagation();
    this.setState(prev => {
      const isMinimized = prev.minimizedApps.includes(appId);
      if (isMinimized) {
        return {
          minimizedApps: prev.minimizedApps.filter(id => id !== appId),
          activeApp: appId
        };
      } else {
        return {
          minimizedApps: [...prev.minimizedApps, appId],
          activeApp: prev.openApps.find(id => id !== appId && !prev.minimizedApps.includes(id)) || null
        };
      }
    });
  };

  handleTaskbarClick = (e, appId) => {
    e.stopPropagation();
    const { activeApp, minimizedApps } = this.state;
    const isMinimized = minimizedApps.includes(appId);

    if (isMinimized) {
      this.setState(prev => ({
        minimizedApps: prev.minimizedApps.filter(id => id !== appId),
        activeApp: appId
      }));
    } else if (activeApp !== appId) {
      this.setState({ activeApp: appId });
    } else {
      this.setState(prev => ({
        minimizedApps: [...prev.minimizedApps, appId],
        activeApp: prev.openApps.find(id => id !== appId && !prev.minimizedApps.includes(id)) || null
      }));
    }
  };

  handleMinimizeAll = () => {
    const { openApps, minimizedApps } = this.state;
    if (openApps.length === 0) return;

    // Nếu tất cả đã thu nhỏ rồi thì Restore all? 
    // Thường Minimize All chỉ là thu nhỏ hết.
    this.setState({
      minimizedApps: [...openApps],
      activeApp: null
    });

    toast.info('All windows minimized', {
      icon: '⏬',
      theme: 'dark',
      autoClose: 1000
    });
  };

  toggleMaximize = (e, appId) => {
    e.stopPropagation();
    this.setState(prev => ({
      maximizedApp: prev.maximizedApp === appId ? null : appId
    }));
  };

  toggleMissions = () => {
    // Logic for toggling is no longer needed for taskbar panel, but we keep the method name if referenced or repurpose
    this.setState({ isMissionsOpen: !this.state.isMissionsOpen });
  };

  handleClaimAllMissions = () => {
    toast.success('All rewards claimed! +160 P-Coin', {
      icon: '🎁',
      theme: 'dark'
    });
    // Reset or update missions state? Just toast for now per user request for button appearance.
  };

  handleClaimMission = (missionId) => {
    const mission = this.state.missions.find(m => m.id === missionId);
    toast.success(`Claimed: +40 P-Coin!`, {
      icon: '✅',
      theme: 'dark'
    });
  };

  handleClickOutside = (event) => {
    if (this.state.isMissionsOpen &&
      this.missionsPanelRef.current &&
      !this.missionsPanelRef.current.contains(event.target) &&
      this.missionsBtnRef.current &&
      !this.missionsBtnRef.current.contains(event.target)) {
      this.setState({ isMissionsOpen: false });
    }
  };

  // --- LOGIC KÉO THẢ (DRAG) ---
  handleDragStart = (e, appId) => {
    if (this.state.maximizedApp === appId) return;

    const event = e.touches ? e.touches[0] : e;
    this.setState({
      activeApp: appId,
      isDragging: appId,
      dragOffset: {
        x: event.clientX - (this.state.windowPositions[appId]?.x || 0),
        y: event.clientY - (this.state.windowPositions[appId]?.y || 0)
      }
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
    if (e.cancelable) e.preventDefault(); // Ngăn scroll trên mobile

    const appId = this.state.isDragging;
    const event = e.touches ? e.touches[0] : e;

    const headerHeight = 42;
    const taskbarHeight = 48;
    const padding = 100;

    let newX = event.clientX - this.state.dragOffset.x;
    let newY = event.clientY - this.state.dragOffset.y;

    newY = Math.max(0, Math.min(newY, window.innerHeight - taskbarHeight - headerHeight));
    newX = Math.max(-(900 - padding), Math.min(newX, window.innerWidth - padding));

    // Dùng requestAnimationFrame để mượt hơn
    if (this.dragRaf) cancelAnimationFrame(this.dragRaf);
    this.dragRaf = requestAnimationFrame(() => {
      this.setState(prev => ({
        windowPositions: {
          ...prev.windowPositions,
          [appId]: { x: newX, y: newY }
        }
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
            <p>Xác nhận đăng xuất?</p>
            <button
              className="toast-confirm-btn"
              onClick={() => { resolve(true); toast.dismiss(); }}
            >
              Có
            </button>
            <button
              className="toast-cancel-btn"
              onClick={() => { resolve(false); toast.dismiss(); }}
            >
              Không
            </button>
          </div>,
          {
            autoClose: 2000,
            closeOnClick: false,
            onClose: () => { this.setState({ disabledButtons: { ...this.state.disabledButtons, logout: false } }) },
          }
        );
      });

    const isConfirmed = await confirmAction();
    if (isConfirmed) {
      try {
        await signOut(); // Xóa session Cognito
        handleLogoutApi(); // Call Electron IPC to clear session if needed
        this.props.userLogout(); // Clear Redux
        toast.success('Đăng xuất thành công!');
        this.props.navigate('/login');
      } catch (e) {
        console.log(e);
        toast.error('Đăng xuất thất bại. Vui lòng thử lại!');
      }
    }
  };

  render() {
    const { openApps, activeApp, minimizedApps, maximizedApp, windowPositions, time, disabledButtons } = this.state;
    const selectedBackground = resolveBackground(this.state.currentBackground);
    const isProfileOpen = openApps.includes('profile') && !minimizedApps.includes('profile');
    const desktopStyle = selectedBackground?.desktopBackground
      ? { '--desktop-user-background': selectedBackground.desktopBackground }
      : undefined;

    return (
      <div className={`os-desktop ${isProfileOpen ? 'profile-open' : ''}`} style={desktopStyle}>
        {/* Resolution-independent generated line background */}
        <div className="desktop-line-bg" aria-hidden="true">
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
                  '--float-delay': item.delay
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
        <div className="desktop-bg-dim"></div>
        {isProfileOpen && <div className="profile-focus-overlay" aria-hidden="true"></div>}
        {this.state.isDragging && <div className="drag-overlay"></div>}

        <UserProfileWidget
          currentTitle={this.state.currentTitle}
          currentFrame={this.state.currentFrame}
          currentRank={this.state.currentRank}
          onClick={() => this.openApp('profile')}
        />

        <MissionsWidget
          missions={this.state.missions}
          onClaimAll={this.handleClaimAllMissions}
          onClaimMission={this.handleClaimMission}
        />

        {/* Desktop Icons Array */}
        <div className="desktop-icons">
          {APPS.filter(app => app.id !== 'profile').map(app => (
            <div className={`icon ${app.className}`} key={app.id} onClick={() => this.openApp(app.id)}>
              <div className="icon-img">
                <IonIcon icon={app.icon} style={{ color: 'white', fontSize: 28 }} />
              </div>
              <span>{app.name}</span>
            </div>
          ))}
        </div>

        {/* Cửa sổ các ứng dụng đang chạy */}
        {openApps.map(appId => {
          const app = APPS.find(a => a.id === appId);
          const isMinimized = minimizedApps.includes(appId);
          const isMaximized = maximizedApp === appId;
          const pos = windowPositions[appId] || { x: 100, y: 100 };

          if (isMinimized) return null; // Ẩn hoàn toàn cửa sổ nếu đã thu nhỏ

          return (
            <div
              key={appId}
              className={`os-window ${app.className} ${appId === 'profile' ? `rank-${this.state.currentRank}` : ''} ${activeApp === appId ? 'active' : ''} ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''} ${this.state.isVacuuming ? 'vacuuming' : ''} ${this.state.isDragging === appId ? 'dragging' : ''}`}
              style={{
                top: isMaximized ? 0 : pos.y,
                left: isMaximized ? 0 : pos.x,
                zIndex: activeApp === appId ? 100 : 50
              }}
              onMouseDown={() => this.setState({ activeApp: appId })}
            >
              <div className="window-header"
                onMouseDown={(e) => this.handleDragStart(e, appId)}
                onTouchStart={(e) => this.handleDragStart(e, appId)}
              >
                <div className="window-title">
                  {app.name}
                </div>
                <div className="window-controls">
                  <button className="control minimize" onClick={(e) => this.toggleMinimize(e, appId)}>
                    <IonIcon icon={removeOutline} />
                  </button>
                  <button className="control maximize" title={isMaximized ? "Restore" : "Maximize"} onClick={(e) => this.toggleMaximize(e, appId)}>
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
                  onBackgroundChange: this.handleBackgroundChange,
                  onTitleChange: this.handleTitleChange,
                  onFrameChange: this.handleFrameChange
                })}
              </div>
            </div>
          );
        })}

        {/* Taskbar */}
        <div className="os-taskbar">
          <div className="taskbar-start">
            <div
              className="minimize-all-btn"
              onClick={this.handleMinimizeAll}
              title="Minimize All"
            >
              <IonIcon icon={removeOutline} />
            </div>
            <div
              className={`start-btn ${this.state.isVacuuming ? 'active' : ''}`}
              onClick={this.handleClearAllApps}
              title="Clean Desktop"
            >
              <IonIcon icon={planetOutline} className={this.state.isVacuuming ? 'spinning' : ''} />
            </div>
          </div>

          <div className="taskbar-apps">
            {openApps.map(appId => {
              const app = APPS.find(a => a.id === appId);
              return (
                <div
                  key={appId}
                  className={`taskbar-icon ${activeApp === appId ? 'active' : ''} ${minimizedApps.includes(appId) ? 'minimized' : ''}`}
                  onClick={(e) => this.handleTaskbarClick(e, appId)}
                  title={app.name}
                >
                  <IonIcon icon={app.icon} style={{ fontSize: 22 }} />
                  <div className="indicator"></div>
                </div>
              );
            })}
          </div>

          <div className="taskbar-sys">
            <span className="os-time">{time}</span>
            <button className="btn-logout" onClick={this.handleLogout} disabled={disabledButtons.logout}>
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
});

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Dashboard));

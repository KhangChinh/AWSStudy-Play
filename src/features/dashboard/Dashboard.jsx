import React, { Component } from 'react';
import { signOut } from 'aws-amplify/auth';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, cubeOutline, ticketOutline, gameControllerOutline,
  cartOutline, closeOutline, removeOutline, squareOutline, logOutOutline,
  imageOutline, personOutline, globeOutline, cart, planetOutline, starOutline,
  copyOutline
} from 'ionicons/icons';

import FocusWidget from '../focus/FocusWidget';
import Inventory from '../inventory/Inventory';
import GachaStation from '../gacha/GachaStation';
import GachaTestApp from '../gacha/GachaTestApp';
import MinigameHub from '../minihub/MinigameHub';
import { withRouter } from '../../utils/withRouter';
import { handleLogoutApi } from '../../services/authServices';
import { userLogout } from '../../store/actions';
import './Dashboard.scss';

const TITLES = [
  { id: 'newbie', name: 'Tân Thủ', color: '#94a3b8', hint: 'Danh hiệu mặc định cho người mới' },
  { id: 'scholar', name: 'Học Giả', color: '#60a5fa', hint: 'Điều kiện: Tổng thời gian học > 10 giờ' },
  { id: 'warrior', name: 'Chiến Thần', color: '#f87171', hint: 'Điều kiện: Thắng 100 trận Minigames' },
  { id: 'collector', name: 'Nhà Sưu Tầm', color: '#fbbf24', hint: 'Điều kiện: Thu thập 50 vật phẩm Inventory' },
  { id: 'whale', name: 'Đại Gia', color: '#a855f7', hint: 'Điều kiện: Tiêu phí 1.000.000 P-Coin' },
  { id: 'admin', name: 'Người Điều Hành', color: '#ef4444', hint: 'Danh hiệu dành cho Quản trị viên' },
];

// ═══ Settings App ═══
//placeholder
const SettingsApp = ({ currentTitle, onTitleChange }) => {
  const selectedTitleData = TITLES.find(t => t.id === currentTitle) || TITLES[0];

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
        <h3><IonIcon icon={starOutline} /> Danh Hiệu (Titles)</h3>
        <p className="section-desc">Chọn danh hiệu hiển thị phía sau tên của bạn.</p>
        <div className="titles-grid">
          {TITLES.map(title => (
            <div
              key={title.id}
              className={`title-badge ${currentTitle === title.id ? 'active' : ''}`}
              style={{ '--title-color': title.color }}
              onClick={() => onTitleChange(title.id)}
            >
              <div className="badge-bg"></div>
              <span className="badge-name">{title.name}</span>
              <div className="badge-info">
                <IonIcon icon={ticketOutline} />
                <span>{title.hint}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3><IonIcon icon={cubeOutline} /> Avatar Frame / Khung Avatar</h3>
        <div className="frame-grid">
          {['None', 'Neon', 'Gold', 'Galactic'].map(frame => (
            <div className="frame-option" key={frame}>
              <div className={`frame-preview ${frame.toLowerCase()}`}>
                <IonIcon icon={personOutline} />
              </div>
              <span>{frame}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RE-ADDED SECTION: Profile Effect */}
      <div className="section">
        <h3><IonIcon icon={ticketOutline} /> Profile Effect / Hiệu ứng</h3>
        <div className="effect-list">
          <select className="effect-select">
            <option value="none" style={{ color: 'white' }}>No Effect</option>
            <option value="sparkle" style={{ color: 'white' }}>✨ Sparkle Particles</option>
            <option value="fire" style={{ color: 'white' }}>🔥 Phoenix Flame</option>
            <option value="snow" style={{ color: 'white' }}>❄️ Winter Frost</option>
          </select>
        </div>
      </div>

      <div className="section">
        <h3><IonIcon icon={globeOutline} /> Language / Ngôn ngữ</h3>
        <select className="language-select">
          <option value="en" style={{ color: 'black' }}>English</option>
          <option value="vi" style={{ color: 'black' }}>Tiếng Việt</option>
        </select>
      </div>
    </div>
  );
};

// ═══ Cosmetics Store ═══
//placeholder
const StoreApp = () => (
  <div className="app-container">
    <h2 className="app-title"><IonIcon icon={cartOutline} /> Cosmetics Store</h2>
    <div className="store-grid">
      {[
        { name: 'Neon Frame', price: 1500, icon: '🖼️' },
        { name: 'VIP Badge', price: 5000, icon: '🛡️' },
        { name: 'Galaxy Trail', price: 3000, icon: '✨' },
        { name: 'Golden Name', price: 10000, icon: '👑' }
      ].map(item => (
        <div className="store-item" key={item.name}>
          <div className="item-cover">{item.icon}</div>
          <div className="item-info">
            <span className="item-title">{item.name}</span>
            <span className="item-price">🪙 {item.price} P-Coin</span>
            <button style={{ background: '#10b981' }}><IonIcon icon={cart} /> Purchase</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ═══ App Registry ═══
const APPS = [
  { id: 'settings', name: 'Settings', className: 'settings', icon: settingsOutline, content: <SettingsApp /> },
  { id: 'inventory', name: 'Inventory', className: 'inventory', icon: cubeOutline, content: <Inventory /> },
  { id: 'gacha', name: 'Gacha', className: 'gacha', icon: ticketOutline, content: <GachaStation /> },
  { id: 'gacha-test', name: 'Gacha Test', className: 'gacha-test', icon: starOutline, content: <GachaTestApp /> },
  { id: 'minigame', name: 'Mini Games', className: 'minigame', icon: gameControllerOutline, content: <MinigameHub /> },
  { id: 'store', name: 'Store', className: 'store', icon: cartOutline, content: <StoreApp /> },
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
      selectedTitle: 'newbie'
    };
    this.timerInterval = null;
  }

  handleTitleChange = (newTitleId) => {
    this.setState({ selectedTitle: newTitleId });
  };

  componentDidMount() {
    this.timerInterval = setInterval(() => {
      this.setState({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }, 60000);
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
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

  toggleMaximize = (e, appId) => {
    e.stopPropagation();
    this.setState(prev => ({
      maximizedApp: prev.maximizedApp === appId ? null : appId
    }));
  };

  // --- LOGIC KÉO THẢ (DRAG) ---
  handleDragStart = (e, appId) => {
    if (this.state.maximizedApp === appId) return;

    this.setState({
      activeApp: appId,
      isDragging: appId,
      dragOffset: {
        x: e.clientX - (this.state.windowPositions[appId]?.x || 0),
        y: e.clientY - (this.state.windowPositions[appId]?.y || 0)
      }
    });

    window.addEventListener('mousemove', this.handleDragging);
    window.addEventListener('mouseup', this.handleDragEnd);
  };

  handleDragging = (e) => {
    if (!this.state.isDragging) return;
    const appId = this.state.isDragging;

    // GIỚI HẠN VỊ TRÍ (CONSTRAINT)
    const headerHeight = 42;
    const taskbarHeight = 48;
    const padding = 100; // Đảm bảo còn 100px tiêu đề trong màn hình

    let newX = e.clientX - this.state.dragOffset.x;
    let newY = e.clientY - this.state.dragOffset.y;

    // Giới hạn trục Y (Không vượt giới hạn trên và Taskbar)
    newY = Math.max(0, Math.min(newY, window.innerHeight - taskbarHeight - headerHeight));

    // Giới hạn trục X (Đảm bảo tiêu đề không trôi mất)
    newX = Math.max(-(900 - padding), Math.min(newX, window.innerWidth - padding));

    this.setState(prev => ({
      windowPositions: {
        ...prev.windowPositions,
        [appId]: { x: newX, y: newY }
      }
    }));
  };

  handleDragEnd = () => {
    this.setState({ isDragging: null });
    window.removeEventListener('mousemove', this.handleDragging);
    window.removeEventListener('mouseup', this.handleDragEnd);
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

    return (
      <div className="os-desktop">
        {/* Background Layers */}
        <div className="stars"></div>
        <div className="twinkling"></div>
        <div className="purple-nebula"></div>
        <FocusWidget />

        {/* Desktop Icons Array */}
        <div className="desktop-icons">
          {APPS.map(app => (
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
              className={`os-window ${activeApp === appId ? 'active' : ''} ${isMaximized ? 'maximized' : ''} ${this.state.isDragging === appId ? 'dragging' : ''}`}
              style={{
                top: isMaximized ? 0 : pos.y,
                left: isMaximized ? 0 : pos.x,
                zIndex: activeApp === appId ? 100 : 50
              }}
              onMouseDown={() => this.setState({ activeApp: appId })}
            >
              <div className="window-header" onMouseDown={(e) => this.handleDragStart(e, appId)}>
                <div className="window-title">
                  {app.name}
                  <span style={{ fontSize: '10px', marginLeft: '8px', color: TITLES.find(t => t.id === this.state.selectedTitle)?.color }}>
                    [{TITLES.find(t => t.id === this.state.selectedTitle)?.name}]
                  </span>
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
                  currentTitle: this.state.selectedTitle,
                  onTitleChange: this.handleTitleChange
                })}
              </div>
            </div>
          );
        })}

        {/* Taskbar */}
        <div className="os-taskbar">
          <div className="taskbar-start">
            <div className="start-btn"><IonIcon icon={planetOutline} /></div>
          </div>

          <div className="taskbar-apps">
            {openApps.map(appId => {
              const app = APPS.find(a => a.id === appId);
              return (
                <div
                  key={appId}
                  className={`taskbar-icon ${activeApp === appId ? 'active' : ''} ${minimizedApps.includes(appId) ? 'minimized' : ''}`}
                  onClick={(e) => this.toggleMinimize(e, appId)}
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

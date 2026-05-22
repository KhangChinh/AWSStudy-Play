import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, cubeOutline, ticketOutline, gameControllerOutline,
  cartOutline, closeOutline, removeOutline, squareOutline, logOutOutline,
  imageOutline, personOutline, globeOutline, cart, planetOutline
} from 'ionicons/icons';

import FocusWidget from '../focus/FocusWidget';
import Inventory from '../inventory/Inventory';
import GachaStation from '../gacha/GachaStation';
import MinigameHub from '../minihub/MinigameHub';
import { withRouter } from '../../utils/withRouter';
import { handleLogoutApi } from '../../services/authServices';
import { userLogout } from '../../store/actions';
import './Dashboard.scss';

// ═══ Settings App ═══
const SettingsApp = () => (
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

    {/* New Section: Avatar Frame */}
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

    {/* New Section: Profile Effect */}
    <div className="section">
      <h3><IonIcon icon={ticketOutline} /> Profile Effect / Hiệu ứng</h3>
      <div className="effect-list">
        <select className="effect-select">
          <option value="none">No Effect</option>
          <option value="sparkle">✨ Sparkle Particles</option>
          <option value="fire">🔥 Phoenix Flame</option>
          <option value="snow">❄️ Winter Frost</option>
        </select>
      </div>
    </div>

    <div className="section">
      <h3><IonIcon icon={personOutline} /> Account Details</h3>
      <div className="account-details">
        <div className="info">
          <p className="label">Username</p>
          <p className="name">Player_9999</p>
          <p className="note">* Chỉ được rename 1 lần/tháng</p>
        </div>
        <button className="btn-rename">Rename</button>
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

// ═══ Cosmetics Store ═══
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
  { id: 'minigame', name: 'Mini Games', className: 'minigame', icon: gameControllerOutline, content: <MinigameHub /> },
  { id: 'store', name: 'Store', className: 'store', icon: cartOutline, content: <StoreApp /> },
];

// ═══ MAIN DASHBOARD COMPONENT ═══
class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeApp: null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disabledButtons: {
        logout: false,
      },
    };
    this.timerInterval = null;
  }

  componentDidMount() {
    this.timerInterval = setInterval(() => {
      this.setState({ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }, 60000); // update every minute
  }

  componentWillUnmount() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  //logout
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

  //app actions
  setActiveApp = (appId) => {
    this.setState({ activeApp: appId });
  };

  render() {
    const { activeApp, time, disabledButtons } = this.state;
    const currentApp = APPS.find(a => a.id === activeApp);

    return (
      <div className="os-desktop">
        {/* Background */}
        <div className="stars"></div>
        <div className="twinkling"></div>
        <div className="purple-nebula"></div>

        {/* App Blocker Widget (Focus Mode) */}
        <FocusWidget />

        {/* Desktop Icons Array */}
        <div className="desktop-icons">
          {APPS.map(app => (
            <div className={`icon ${app.className}`} key={app.id} onClick={() => this.setActiveApp(app.id)}>
              <div className="icon-img">
                <IonIcon icon={app.icon} style={{ color: 'white', fontSize: 28 }} />
              </div>
              <span>{app.name}</span>
            </div>
          ))}
        </div>

        {/* Dynamic App Window */}
        {currentApp && (
          <div className="os-window">
            <div className="window-header">
              <div className="window-controls">
                <button className="control close" onClick={() => this.setActiveApp(null)}>
                  <IonIcon icon={closeOutline} />
                </button>
                <button className="control minimize"><IonIcon icon={removeOutline} /></button>
                <button className="control maximize"><IonIcon icon={squareOutline} style={{ fontSize: 9 }} /></button>
              </div>
              <div className="window-title">{currentApp.name}</div>
            </div>
            <div className="window-content">
              {currentApp.content}
            </div>
          </div>
        )}

        {/* Taskbar */}
        <div className="os-taskbar">
          <div className="taskbar-start">
            <div className="start-btn">
              <IonIcon icon={planetOutline} />
            </div>
          </div>

          <div className="taskbar-apps">
            {APPS.map(app => (
              <div
                key={app.id}
                className={`taskbar-icon ${activeApp === app.id ? 'open' : ''}`}
                onClick={() => this.setActiveApp(app.id)}
                title={app.name}
              >
                <IonIcon icon={app.icon} style={{ fontSize: 22 }} />
              </div>
            ))}
          </div>

          <div className="taskbar-sys">
            <span className="os-time">{time}</span>
            <button
              className="btn-logout"
              onClick={this.handleLogout}
              disabled={disabledButtons.logout}
            >
              <IonIcon icon={logOutOutline} /> Logout
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

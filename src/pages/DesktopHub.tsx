import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DesktopHub.scss';

// --- SUB-COMPONENTS CHO CÁC ỨNG DỤNG ---

const SettingsApp = () => (
  <div className="app-container settings-app">
    <h2 className="app-title">User Preferences</h2>
    <div className="section">
      <h3>Profile Avatar</h3>
      <div className="avatar-upload">
        <div className="avatar-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
        </div>
        <div>
          <p style={{fontSize: 14, color: '#e2e8f0', marginBottom: 6}}>Upload new avatar</p>
          <p style={{fontSize: 12, color: '#94a3b8'}}>Optimal size 256x256. Max 2MB.</p>
        </div>
      </div>
    </div>
    <div className="section">
      <h3>Account Details</h3>
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
      <h3>Language / Ngôn ngữ</h3>
      <select className="language-select">
        <option value="en" style={{ color: 'black' }}>English</option>
        <option value="vi" style={{ color: 'black' }}>Tiếng Việt</option>
      </select>
    </div>
  </div>
);

const FocusWidget = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  return (
    <div className={`app-blocker-widget ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="widget-header"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Toggle Focus Mode"
      >
        <h3>
          <span>🔒</span> Focus Mode
        </h3>
        <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {isExpanded && (
        <div className="widget-content">
          <p className="description">Select apps to block:</p>
          <div className="app-list">
            {['Mini Games', 'Store', 'Social Media', 'Web Browser'].map(app => (
              <div className="app-item" key={app}>
                <div className="app-name">
                  <input type="checkbox" />
                  <span>{app}</span>
                </div>
                <div className="time-range">
                  <input type="time" defaultValue="20:00" />
                  <span>-</span>
                  <input type="time" defaultValue="22:00" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const InventoryApp = () => (
  <div className="app-container inventory-app">
    <h2 className="app-title">My Inventory</h2>
    <div className="balance-card">
      <span style={{fontSize: 32}}>🪙</span>
      <div>
        <div style={{fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)'}}>Virtual Balance</div>
        <div>12,500 ASC (Astro Coins)</div>
      </div>
    </div>
    
    <h3 style={{fontSize: 18, marginBottom: 16, color: '#e2e8f0'}}>Gacha Rewards & Items</h3>
    <div className="inventory-grid">
      {[...Array(10)].map((_, i) => (
        <div className="item-card" key={i}>
          <div className="item-icon">{['🎁', '💫', '🎟️', '👑'][i % 4]}</div>
          <div className="item-name">{['Mystery Box', 'Cosmic Dust', 'Gacha Ticket', 'Gold Tiara'][i % 4]}</div>
          <div style={{fontSize: 11, color: '#94a3b8', marginTop: 8}}>Qty: {Math.floor(Math.random() * 5) + 1}</div>
        </div>
      ))}
    </div>
  </div>
);

const MinigameApp = () => (
  <div className="app-container">
    <h2 className="app-title">Arcade Arcade</h2>
    <div className="store-grid">
      {[ 
        { name: 'Space Invaders', price: 100, icon: '👾' },
        { name: 'Typing Master', price: 'Free', icon: '⌨️' },
        { name: 'Math Genius', price: 50, icon: '🧮' },
        { name: 'Asteroid Miner', price: 200, icon: '☄️' }
      ].map(game => (
        <div className="store-item" key={game.name}>
          <div className="item-cover">{game.icon}</div>
          <div className="item-info">
            <span className="item-title">{game.name}</span>
            <span className="item-price">{typeof game.price === 'number' ? `🪙 ${game.price} ASC / Play` : game.price}</span>
            <button>Play Now</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StoreApp = () => (
  <div className="app-container">
    <h2 className="app-title">Cosmetics Store</h2>
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
            <span className="item-price">🪙 {item.price} ASC</span>
            <button style={{background: '#10b981'}}>Purchase</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MINIGAMES = [
  { id: 'all', label: 'Tổng Wins', icon: '🏅' },
  { id: 'space', label: 'Space Invaders', icon: '👾' },
  { id: 'typing', label: 'Typing Master', icon: '⌨️' },
  { id: 'math', label: 'Math Genius', icon: '🧮' },
  { id: 'asteroid', label: 'Asteroid Miner', icon: '☄️' },
];

const MINIGAME_SCORES: Record<string, number[]> = {
  all:      [500, 425, 350, 275, 200],
  space:    [180, 155, 120, 90, 60],
  typing:   [95, 80, 70, 55, 40],
  math:     [130, 110, 90, 75, 50],
  asteroid: [95, 80, 70, 55, 50],
};

const LeaderboardApp = () => {
  const [tab, setTab] = useState('study');
  const [minigameFilter, setMinigameFilter] = useState('all');

  const scores = tab === 'study'
    ? [100, 85, 70, 55, 40]
    : MINIGAME_SCORES[minigameFilter];

  const scoreLabel = tab === 'study'
    ? (v: number) => `${v}h`
    : (v: number) => `${v} Wins`;

  return (
    <div className="app-container leaderboard-app">
      <h2 className="app-title">Global Rankings</h2>

      <div className="tabs">
        <button className={tab === 'study' ? 'active' : ''} onClick={() => setTab('study')}>Study Hours</button>
        <button className={tab === 'minigame' ? 'active' : ''} onClick={() => setTab('minigame')}>Minigame Wins</button>
      </div>

      {tab === 'minigame' && (
        <div className="minigame-filter">
          <select
            className="minigame-select"
            value={minigameFilter}
            onChange={e => setMinigameFilter(e.target.value)}
          >
            {MINIGAMES.map(g => (
              <option key={g.id} value={g.id}>{g.icon} {g.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="rank-list">
        {[...Array(5)].map((_, i) => (
          <div className={`rank-item ${i < 3 ? `top-${i+1}` : ''}`} key={i}>
            <div className="player">
              <span style={{fontSize: 20, width: 30}}>{i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <div style={{width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>👤</div>
              <span>Player_{Math.floor(Math.random() * 9999)}</span>
            </div>
            <div className="score">
              {scoreLabel(scores[i])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// --- DANH SÁCH APP ---
const APPS = [
  { 
    id: 'settings', name: 'Settings', className: 'settings', 
    svg: <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>,
    content: <SettingsApp />
  },

  { 
    id: 'inventory', name: 'Inventory', className: 'inventory',
    svg: <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v10c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-10-2h4v2h-4V4zm10 14H4v-3h16v3zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v5z"/>,
    content: <InventoryApp />
  },
  { 
    id: 'minigame', name: 'Mini Games', className: 'minigame',
    svg: <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>,
    content: <MinigameApp />
  },
  { 
    id: 'store', name: 'Store', className: 'store',
    svg: <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>,
    content: <StoreApp />
  },
  { 
    id: 'leaderboard', name: 'Leaderboard', className: 'leaderboard',
    svg: <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>,
    content: <LeaderboardApp />
  }
];


// --- MAIN DESKTOP COMPONENT ---
const DesktopHub = () => {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const navigate = useNavigate();

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleLogout = () => {
    if ((window as any).require) {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.send('logout');
    }
    navigate('/login');
  };

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
          <div className={`icon ${app.className}`} key={app.id} onClick={() => setActiveApp(app.id)}>
            <div className="icon-img">
              <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                {app.svg}
              </svg>
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
              <button className="control close" onClick={() => setActiveApp(null)}></button>
              <button className="control minimize"></button>
              <button className="control maximize"></button>
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
          <div className="start-btn">✧</div>
        </div>
        
        <div className="taskbar-apps">
          {APPS.map(app => (
            <div 
              key={app.id}
              className={`taskbar-icon ${activeApp === app.id ? 'open' : ''}`} 
              onClick={() => setActiveApp(app.id)}
              title={app.name}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                {app.svg}
              </svg>
            </div>
          ))}
        </div>

        <div className="taskbar-sys">
          <span className="os-time">{time}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopHub;

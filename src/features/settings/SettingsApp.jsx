import React from 'react';
import { IonIcon } from '@ionic/react';
import { 
  settingsOutline, imageOutline, personOutline, globeOutline 
} from 'ionicons/icons';
import cosmeticManager from '../../managers/cosmeticManager';

const SettingsApp = ({ currentTitle, animationsEnabled, userInfo, onToggleAnimations, t, i18n }) => {
  const selectedTitleData = cosmeticManager.getCosmeticInfo('titles', currentTitle) || cosmeticManager.getAllInCategory('titles')[0];
  const displayName = userInfo?.username || 'Player_9999';

  return (
    <div className="app-container settings-app">
      <h2 className="app-title"><IonIcon icon={settingsOutline} /> {t('settings.user_preferences')}</h2>

      <div className="section">
        <h3><IonIcon icon={imageOutline} /> {t('settings.profile_avatar')}</h3>
        <div className="avatar-upload">
          <div className="avatar-circle">
            <IonIcon icon={personOutline} style={{ fontSize: 32 }} />
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 6 }}>Upload new avatar</p>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>{t('settings.upload_note')}</p>
          </div>
        </div>
      </div>

      <div className="section">
        <h3><IonIcon icon={personOutline} /> {t('settings.account_details')}</h3>
        <div className="account-details">
          <div className="info">
            <p className="label">{t('common.username')}</p>
            <div className="name-wrapper">
              <span className="name">{displayName}</span>
              <span className="user-title" style={{ color: selectedTitleData.color }}>
                [{selectedTitleData.name}]
              </span>
            </div>
            <p className="note">{t('settings.rename_cost')}</p>
          </div>
          <button className="btn-rename">{t('common.rename')}</button>
        </div>
      </div>

      <div className="section">
        <h3><IonIcon icon={globeOutline} /> {t('settings.preferences')}</h3>
        <p className="section-desc">Quick adjustments for your experience.</p>
        <div className="settings-options">
          <div className="option">
            <label>{t('settings.language')}</label>
            <select 
              className="language-select" 
              value={i18n.language} 
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
          <div className="option">
            <label>{t('settings.app_animations')}</label>
            <div className={`toggle-switch ${animationsEnabled ? 'active' : ''}`} onClick={onToggleAnimations}>
              <div className="slider"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsApp;

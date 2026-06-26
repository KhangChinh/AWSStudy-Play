import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, imageOutline, personOutline, globeOutline, checkmarkOutline, closeOutline
} from 'ionicons/icons';
import cosmeticManager from '../../managers/cosmeticManager';
import { handleUpdateNameApi } from '../../services/cosmeticServices';
import { connect } from 'react-redux';
import { userLogin } from '../../store/actions';
import './SettingsApp.scss';

const SettingsApp = ({
  currentTitle,
  animationsEnabled,
  userInfo,
  onToggleAnimations,
  t,
  i18n,
  dispatchUserLogin
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userInfo?.username || '');
  const [loading, setLoading] = useState(false);

  const selectedTitleData = cosmeticManager.getCosmeticInfo('titles', currentTitle)
    || cosmeticManager.getAllInCategory('titles')[0];
  const displayName = userInfo?.username || 'Player_9999';
  const currentLanguage = (i18n?.resolvedLanguage || i18n?.language || 'vi').split('-')[0];

  const handleSaveName = async () => {
    if (!newName.trim() || newName === displayName) {
      setIsEditingName(false);
      return;
    }

    setLoading(true);
    try {
      const response = await handleUpdateNameApi(newName.trim());
      if (response && response.profile) {
        // Cập nhật Redux để Dashboard/Profile thấy tên mới ngay lập tức
        dispatchUserLogin({
          ...userInfo,
          username: response.profile.information?.name || newName.trim()
        });
        setIsEditingName(false);
      }
    } catch (e) {
      alert(t('settings.rename_error') || 'Lỗi khi đổi tên');
    } finally {
      setLoading(false);
    }
  };

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
            <p style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 6 }}>{t('settings.upload_avatar')}</p>
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
              {isEditingName ? (
                <div className="rename-input-group">
                  <input
                    type="text"
                    className="rename-field"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    maxLength={20}
                    disabled={loading}
                  />
                  <button 
                    className="btn-save-name" 
                    onClick={handleSaveName} 
                    disabled={loading}
                    title={loading ? '...' : t('common.save')}
                  >
                    <IonIcon icon={loading ? globeOutline : checkmarkOutline} className={loading ? 'spinning' : ''} />
                  </button>
                  <button className="btn-cancel-name" onClick={() => setIsEditingName(false)} disabled={loading} title={t('common.cancel')}>
                    <IonIcon icon={closeOutline} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="name">{displayName}</span>
                  <span className="user-title" style={{ color: selectedTitleData.color }}>
                    [{t(selectedTitleData.i18nKey + '.name')}]
                  </span>
                </>
              )}
            </div>
            <p className="note">{t('settings.rename_cost')}</p>
          </div>
          {!isEditingName && (
            <button className="btn-rename" onClick={() => setIsEditingName(true)}>{t('common.rename')}</button>
          )}
        </div>
      </div>

      <div className="section">
        <h3><IonIcon icon={globeOutline} /> {t('settings.preferences')}</h3>
        <p className="section-desc">{t('settings.preferences_desc')}</p>
        <div className="settings-options">
          <div className="option">
            <label>{t('settings.language')}</label>
            <select
              className="language-select"
              value={currentLanguage}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="en">{t('settings.english')}</option>
              <option value="vi">{t('settings.vietnamese')}</option>
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

const mapDispatchToProps = (dispatch) => ({
  dispatchUserLogin: (info) => dispatch(userLogin(info))
});

export default connect(null, mapDispatchToProps)(SettingsApp);

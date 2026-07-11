import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, imageOutline, personOutline, globeOutline, checkmarkOutline, closeOutline,
  hardwareChipOutline, saveOutline
} from 'ionicons/icons';
import ImageCropper from '../../components/ImageCropper';
import { cosmeticManager } from '../../services/cosmeticServices';
import { handleUpdateNameApi } from '../../services/cosmeticServices';
import { getValidAccessToken } from '../../services/tokenService';
import { connect } from 'react-redux';
import { setProfile } from '../../store/actions/profileActions';
import { setAiSettings } from '../../store/actions/settingsActions';
import { toast } from 'react-toastify';
import './SettingsApp.scss';

const SettingsApp = ({
  currentTitle,
  animationsEnabled,
  userProfile,
  onToggleAnimations,
  aiSettings,
  dispatchSetAiSettings,
  t,
  i18n,
  dispatchUserLogin
}) => {
  const [activeTab, setActiveTab] = useState('profile'); // profile, preferences, ai
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.information?.name || '');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // AI Settings State
  const [localAiSettings, setLocalAiSettings] = useState(aiSettings);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const fileInputRef = React.useRef(null);

  const selectedTitleData = cosmeticManager.getCosmeticInfo('titles', currentTitle)
    || cosmeticManager.getAllInCategory('titles')[0];
  const displayName = userProfile?.information?.name || 'Player_9999';
  const currentLanguage = (i18n?.resolvedLanguage || i18n?.language || 'vi').split('-')[0];

  const S3_AVATAR_BASE = (import.meta.env.VITE_S3_ASSETS_URL || '') + 'avatars/';
  const S3_ASSETS_BASE = import.meta.env.VITE_S3_ASSETS_URL || '';
  const DEFAULT_AVATAR = S3_AVATAR_BASE + 'default_avatar.jpg';

  useEffect(() => {
    setLocalAiSettings(aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    if (activeTab === 'ai') {
      fetchOllamaModels();
    }
  }, [activeTab]);

  const fetchOllamaModels = async () => {
    setIsFetchingModels(true);
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        setOllamaModels(data.models || []);
      } else {
        setOllamaModels([]);
      }
    } catch (error) {
      console.warn('Failed to fetch Ollama models:', error);
      setOllamaModels([]);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName === displayName) {
      setIsEditingName(false);
      return;
    }

    setLoading(true);
    try {
      const response = await handleUpdateNameApi(newName.trim());
      if (response && response.profile) {
        dispatchUserLogin({
          ...userProfile,
          information: {
            ...userProfile?.information,
            name: response.profile.information?.name || newName.trim()
          }
        });
        setIsEditingName(false);
      }
    } catch (e) {
      toast.error(t('settings.rename_error') || 'Lỗi khi đổi tên');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.invalid_image_type'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.image_too_large'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result);
    reader.readAsDataURL(file);
    if (event.target) event.target.value = '';
  };

  const handleCropComplete = async (blob) => {
    setPendingImage(null);
    setIsUploading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const token = await getValidAccessToken();
      if (!token) {
        toast.error(t('auth.session_expired'));
        return;
      }

      const presignRes = await fetch(`${API_URL}/avatar/presign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!presignRes.ok) {
        const errData = await presignRes.json().catch(() => ({}));
        if (presignRes.status === 429) {
          toast.error(t('profile.avatar_cooldown'));
        } else {
          toast.error(errData.message || t('profile.avatar_upload_url_failed'));
        }
        return;
      }
      const presignData = await presignRes.json();
      const { url: uploadUrl, fields } = presignData;

      const formData = new FormData();
      Object.entries(fields || {}).forEach(([k, v]) => formData.append(k, v));
      formData.append('file', blob, 'avatar.jpg');

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) {
        toast.error(t('profile.avatar_s3_upload_failed'));
        return;
      }

      const confirmRes = await fetch(`${API_URL}/avatar/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!confirmRes.ok) {
        const errData = await confirmRes.json().catch(() => ({}));
        toast.error(errData.message || t('profile.avatar_confirm_failed'));
        return;
      }
      const confirmData = await confirmRes.json();
      const newAvatarPath = confirmData.avatarUrl;

      toast.success(t('profile.avatar_updated'));
      dispatchUserLogin({
        ...userProfile,
        information: {
          ...userProfile?.information,
          avatarUrl: newAvatarPath,
        },
      });
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error(t('profile.avatar_upload_failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiSettingChange = (feature, field, value) => {
    setLocalAiSettings(prev => ({
      ...prev,
      [feature]: {
        ...prev[feature],
        [field]: value
      }
    }));
  };

  const handleSaveAiSettings = async () => {
    dispatchSetAiSettings(localAiSettings);
    if (window.api?.invoke) {
      const res = await window.api.invoke('store:saveAiSettings', localAiSettings);
      if (res?.success) {
        toast.success(t('settings.ai_saved') || 'AI settings saved successfully');
      } else {
        toast.error('Failed to save AI settings to local storage');
      }
    }
  };

  const renderAiRow = (featureKey, label) => {
    const setting = localAiSettings[featureKey] || { provider: 'ollama', selectedModel: '', apiKey: '' };
    return (
      <div className="ai-setting-row" key={featureKey}>
        <div className="ai-row-header">
          <h4>{label}</h4>
          <div className="ai-toggle">
            <button 
              className={`toggle-btn ${setting.provider === 'ollama' ? 'active' : ''}`} 
              onClick={() => handleAiSettingChange(featureKey, 'provider', 'ollama')}
            >
              Ollama
            </button>
            <button 
              className={`toggle-btn ${setting.provider === 'gemini' ? 'active' : ''}`} 
              onClick={() => handleAiSettingChange(featureKey, 'provider', 'gemini')}
            >
              Gemini
            </button>
          </div>
        </div>
        <div className="ai-row-content">
          {setting.provider === 'ollama' ? (
            <div className="input-group">
              <label>Select Model</label>
              <select 
                value={setting.selectedModel} 
                onChange={(e) => handleAiSettingChange(featureKey, 'selectedModel', e.target.value)}
              >
                <option value="">-- {isFetchingModels ? 'Scanning...' : 'Select a model'} --</option>
                {ollamaModels.map(model => (
                  <option key={model.name} value={model.name}>{model.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="input-group">
              <label>API Key</label>
              <input 
                type="password" 
                placeholder="Enter Gemini API Key..." 
                value={setting.apiKey} 
                onChange={(e) => handleAiSettingChange(featureKey, 'apiKey', e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container settings-app">
      <h2 className="app-title"><IonIcon icon={settingsOutline} /> {t('settings.user_preferences')}</h2>

      <div className="settings-tabs">
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <IonIcon icon={personOutline} /> Profile
        </button>
        <button className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>
          <IonIcon icon={globeOutline} /> Preferences
        </button>
        <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
          <IonIcon icon={hardwareChipOutline} /> AI Settings
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'profile' && (
          <div className="tab-pane">
            <div className="section">
              <h3><IonIcon icon={imageOutline} /> {t('settings.profile_avatar')}</h3>
              <div className="avatar-upload-area">
                <div
                  className={`settings-avatar-preview ${isUploading ? 'uploading' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {userProfile?.information?.avatarUrl ? (
                    <img src={S3_ASSETS_BASE + userProfile.information.avatarUrl} alt="avatar" onError={(e) => { e.target.src = DEFAULT_AVATAR; }} />
                  ) : (
                    <img src={DEFAULT_AVATAR} alt="avatar" />
                  )}
                  <div className="upload-overlay">
                    <IonIcon icon={imageOutline} />
                  </div>
                </div>
                <div className="upload-info">
                  <p className="upload-label">{t('settings.upload_avatar')}</p>
                  <p className="upload-note">{t('settings.upload_note')}</p>
                  <button className="btn-upload-trigger" onClick={() => fileInputRef.current?.click()}>
                    {t('settings.change_image')}
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
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
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="tab-pane">
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
        )}

        {activeTab === 'ai' && (
          <div className="tab-pane">
            <div className="section">
              <h3><IonIcon icon={hardwareChipOutline} /> AI Settings</h3>
              <p className="section-desc">Configure local and cloud AI providers for application features.</p>
              
              <div className="ai-settings-list">
                {renderAiRow('faceTracking', 'AI FaceTracking')}
                {renderAiRow('blocker', 'AI YouTube Blocker')}
                {renderAiRow('studyPlanner', 'AI StudyPlanner')}
              </div>

              <div className="ai-settings-actions">
                <button className="btn-save-ai" onClick={handleSaveAiSettings}>
                  <IonIcon icon={saveOutline} /> Save AI Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pendingImage && (
        <ImageCropper
          image={pendingImage}
          onCrop={handleCropComplete}
          onCancel={() => setPendingImage(null)}
          t={t}
        />
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  aiSettings: state.settings?.aiSettings || {
    faceTracking: { provider: 'ollama', selectedModel: '', apiKey: '' },
    blocker: { provider: 'ollama', selectedModel: '', apiKey: '' },
    studyPlanner: { provider: 'ollama', selectedModel: '', apiKey: '' },
  }
});

const mapDispatchToProps = (dispatch) => ({
  setProfile: (data) => dispatch(setProfile(data)),
  dispatchUserLogin: (data) => dispatch(setProfile(data)),
  dispatchSetAiSettings: (data) => dispatch(setAiSettings(data))
});

export default connect(mapStateToProps, mapDispatchToProps)(SettingsApp);

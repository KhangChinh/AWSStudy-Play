import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, imageOutline, personOutline, globeOutline, checkmarkOutline, closeOutline,
  hardwareChipOutline, saveOutline
} from 'ionicons/icons';
import ImageCropper from '../../components/ImageCropper';
import { handleUpdateNameApi } from '../../services/cosmeticServices';
import { uploadAvatarApi } from '../../services/profileService';
import { connect } from 'react-redux';
import { setProfile } from '../../store/actions/profileActions';
import { setAiSettings } from '../../store/actions/settingsActions';
import { toast } from 'react-toastify';
import { DEFAULT_AVATAR_URL, resolveAvatarUrl, useDefaultAvatarOnError } from '../../utils/avatarUrl';
import './SettingsApp.scss';

const RENAME_SANITY_COST = 500;
const AVATAR_CHANGE_ECOIN_COST = 500;

const SettingsApp = ({
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

  const displayName = userProfile?.information?.name || 'Player_9999';
  const currentSanity = Number(userProfile?.budget?.sanity ?? userProfile?.sanity ?? 0);
  const currentLanguage = (i18n?.resolvedLanguage || i18n?.language || 'vi').split('-')[0];

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
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === displayName) {
      setIsEditingName(false);
      return;
    }
    if (currentSanity < RENAME_SANITY_COST) {
      toast.error(t('settings.rename_insufficient_sanity', { cost: RENAME_SANITY_COST }));
      return;
    }

    setLoading(true);
    try {
      const response = await handleUpdateNameApi(trimmedName);
      if (response?.profile) {
        const serverSanity = Number(response.profile.budget?.sanity ?? currentSanity);
        const updatedSanity = serverSanity < currentSanity
          ? serverSanity
          : currentSanity - RENAME_SANITY_COST;

        dispatchUserLogin({
          ...response.profile,
          budget: {
            ...response.profile.budget,
            sanity: updatedSanity,
          },
          information: {
            ...response.profile.information,
            name: response.profile.information?.name || trimmedName,
          },
        });
        setIsEditingName(false);
        toast.success(t('settings.rename_success', { cost: RENAME_SANITY_COST }));
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
    if (file.size > 2 * 1024 * 1024) {
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
      const result = await uploadAvatarApi(blob);
      if (!result?.success) {
        throw new Error(result?.message || t('profile.avatar_upload_failed'));
      }
      toast.success(t('profile.avatar_updated'));
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || t('profile.avatar_upload_failed'));
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
      // Sync Bedrock + Gemini key cho StudyPlanner
      const sp = localAiSettings.studyPlanner || {};
      const blocker = localAiSettings.blocker || {};
      const spProviderMap = { gemini: 'gemini', bedrock: 'bedrock', ollama: 'ollama' };
      await window.api.invoke('study:saveSettings', {
        aiProvider: spProviderMap[sp.provider] || 'ollama',
        geminiKey: sp.apiKey || '',
        selectedModel: sp.selectedModel || '',
        bedrockAccessKey: sp.bedrockAccessKey || '',
        bedrockSecretKey: sp.bedrockSecretKey || '',
        bedrockRegion: sp.bedrockRegion || 'us-east-1',
        bedrockModel: sp.bedrockModel || 'amazon.nova-micro-v1:0',
      });
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
            <button
              className={`toggle-btn bedrock ${setting.provider === 'bedrock' ? 'active' : ''}`}
              onClick={() => handleAiSettingChange(featureKey, 'provider', 'bedrock')}
            >
              ☁️ Bedrock
            </button>
          </div>
        </div>
        <div className="ai-row-content">
          {setting.provider === 'ollama' && (
            <div className="input-group">
              <label>{t('settings.select_model')}</label>
              <select
                value={setting.selectedModel}
                onChange={(e) => handleAiSettingChange(featureKey, 'selectedModel', e.target.value)}
              >
                <option value="">-- {isFetchingModels ? t('settings.scanning_models') : t('settings.select_a_model')} --</option>
                {ollamaModels.map(model => (
                  <option key={model.name} value={model.name}>{model.name}</option>
                ))}
              </select>
            </div>
          )}
          {setting.provider === 'gemini' && (
            <div className="input-group">
              <label>{t('settings.gemini_api_key')}</label>
              <input
                type="password"
                placeholder={t('settings.gemini_api_key_placeholder')}
                value={setting.apiKey}
                onChange={(e) => handleAiSettingChange(featureKey, 'apiKey', e.target.value)}
              />
            </div>
          )}
          {setting.provider === 'bedrock' && (
            <div className="bedrock-ready">
              <span className="bedrock-icon">☁️</span>
              <div>
                <p className="bedrock-ready-title">{t('settings.bedrock_ready')}</p>
              </div>
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
          <IonIcon icon={personOutline} /> {t('settings.profile_tab')}
        </button>
        <button className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>
          <IonIcon icon={globeOutline} /> {t('settings.preferences')}
        </button>
        <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
          <IonIcon icon={hardwareChipOutline} /> {t('settings.ai_settings')}
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
                    <img src={resolveAvatarUrl(userProfile.information.avatarUrl)} alt="avatar" onError={useDefaultAvatarOnError} />
                  ) : (
                    <img src={DEFAULT_AVATAR_URL} alt="avatar" />
                  )}
                  <div className="upload-overlay">
                    <IonIcon icon={imageOutline} />
                  </div>
                </div>
                <div className="upload-info">
                  <p className="upload-label">{t('settings.upload_avatar')}</p>
                  <p className="upload-note">{t('settings.upload_note')}</p>
                  <p className="upload-cost">{t('settings.avatar_change_cost', { cost: AVATAR_CHANGE_ECOIN_COST })}</p>
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
                      <span className="name">{displayName}</span>
                    )}
                  </div>
                  <p className="note">{t('settings.rename_cost', { cost: RENAME_SANITY_COST })}</p>
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
              <h3><IonIcon icon={hardwareChipOutline} /> {t('settings.ai_settings')}</h3>
              <p className="section-desc">{t('settings.ai_settings_desc')}</p>
              
              <div className="ai-settings-list">
                {renderAiRow('blocker', t('settings.ai_youtube_blocker'))}
                {renderAiRow('studyPlanner', t('settings.ai_study_planner'))}
              </div>

              <div className="ai-settings-actions">
                <button className="btn-save-ai" onClick={handleSaveAiSettings}>
                  <IonIcon icon={saveOutline} /> {t('settings.save_ai_settings')}
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

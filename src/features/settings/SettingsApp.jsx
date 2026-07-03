import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, imageOutline, personOutline, globeOutline, checkmarkOutline, closeOutline
} from 'ionicons/icons';
import RankFrame from '../../components/RankFrame';
import ImageCropper from '../../components/ImageCropper';
import cosmeticManager from '../../managers/cosmeticManager';
import { handleUpdateNameApi } from '../../services/cosmeticServices';
import { getValidAccessToken } from '../../services/tokenService';
import { connect } from 'react-redux';
import { setProfile } from '../../store/actions';
import { toast } from 'react-toastify';
import './SettingsApp.scss';

const SettingsApp = ({
  currentTitle,
  animationsEnabled,
  userProfile,
  onToggleAnimations,
  t,
  i18n,
  dispatchUserLogin
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.information?.name || '');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = React.useRef(null);

  const selectedTitleData = cosmeticManager.getCosmeticInfo('titles', currentTitle)
    || cosmeticManager.getAllInCategory('titles')[0];
  const displayName = userProfile?.information?.name || 'Player_9999';
  const currentLanguage = (i18n?.resolvedLanguage || i18n?.language || 'vi').split('-')[0];

  const S3_AVATAR_BASE = (import.meta.env.VITE_S3_ASSETS_URL || '') + 'avatars/';
  const S3_ASSETS_BASE = import.meta.env.VITE_S3_ASSETS_URL || '';
  const DEFAULT_AVATAR = S3_AVATAR_BASE + 'default_avatar.jpg';

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

      // B1: Lấy presigned POST URL
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

      // B2: Upload lên S3 bằng presigned POST (multipart/form-data)
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

      // B3: Confirm với server để ghi vào DB
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
      // Cập nhật Redux — avatarUrl là relative path
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

  return (
    <div className="app-container settings-app">
      <h2 className="app-title"><IonIcon icon={settingsOutline} /> {t('settings.user_preferences')}</h2>

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

const mapDispatchToProps = (dispatch) => ({
  setProfile: (data) => dispatch(setProfile(data)),
  dispatchUserLogin: (data) => dispatch(setProfile(data)),
});

export default connect(null, mapDispatchToProps)(SettingsApp);

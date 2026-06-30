import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import {
  settingsOutline, imageOutline, personOutline, globeOutline, checkmarkOutline, closeOutline
} from 'ionicons/icons';
import RankFrame from '../../components/RankFrame';
import ImageCropper from '../../components/ImageCropper';
import cosmeticManager from '../../managers/cosmeticManager';
import { handleUpdateNameApi } from '../../services/cosmeticServices';
import { getAvatarUploadUrl, updateAvatarUrl } from '../../services/userService';
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
  const [newName, setNewName] = useState(userProfile?.username || '');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = React.useRef(null);

  const selectedTitleData = cosmeticManager.getCosmeticInfo('titles', currentTitle)
    || cosmeticManager.getAllInCategory('titles')[0];
  const displayName = userProfile?.username || 'Player_9999';
  const currentLanguage = (i18n?.resolvedLanguage || i18n?.language || 'vi').split('-')[0];

  const S3_AVATAR_BASE = (import.meta.env.VITE_S3_ASSETS_URL || '') + 'avatars/';
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
          username: response.profile.information?.name || newName.trim()
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
      toast.error(t('profile.invalid_image_type') || 'Invalid file type');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.image_too_large') || 'Image size must be less than 5MB');
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
      const fileName = `avatar_${userProfile.userId || 'user'}_${Date.now()}.jpg`;
      const res = await getAvatarUploadUrl(fileName, 'image/jpeg');

      if (res.success && res.uploadUrl) {
        const uploadRes = await fetch(res.uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' }
        });

        if (uploadRes.ok) {
          const finalUrl = res.finalUrl || `${S3_AVATAR_BASE}${fileName}`;
          const updateRes = await updateAvatarUrl(finalUrl);

          if (updateRes.success) {
            toast.success(t('profile.avatar_updated') || 'Avatar updated!');
            dispatchUserLogin({ ...userProfile, avatar: finalUrl });
          } else {
            toast.error(updateRes.error || 'Failed to update database');
          }
        } else {
          toast.error('S3 Upload failed');
        }
      } else {
        toast.error(res.error || 'Failed to get upload URL');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error('Avatar upload failed');
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
            {userProfile?.avatar ? (
              <img src={userProfile.avatar} alt="avatar" onError={(e) => { e.target.src = DEFAULT_AVATAR; }} />
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
              {t('settings.change_image') || 'Change Image'}
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
              onChange={(e) => {
                const selectedLang = e.target.value;
                i18n.changeLanguage(selectedLang);
                if (window.api) {
                  window.api.invoke('store:saveLanguage', selectedLang).catch((err) => {
                    console.error('Failed to save language to electron-store:', err);
                  });
                }
              }}
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
});

export default connect(null, mapDispatchToProps)(SettingsApp);

import { API_BASE_URL, profileApi } from '../utils/api';
import { S3_ASSETS_BASE } from '../data/cosmetics';

export const resolveAssetUrl = (pathOrUrl) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('data:')) return pathOrUrl;

  const base = (
    import.meta.env.VITE_ASSETS_BASE_URL
    || import.meta.env.VITE_S3_ASSETS_BASE_URL
    || S3_ASSETS_BASE
    || ''
  ).replace(/\/$/, '');

  return base ? `${base}/${pathOrUrl.replace(/^\/+/, '')}` : pathOrUrl;
};

export const handleUpdateProfileNameApi = async (name) => {
  try {
    return await profileApi.update({ name });
  } catch (e) {
    console.log('Error updating profile:', e);
    return { success: false, message: e.message };
  }
};

export const handleUploadAvatarApi = async (file) => {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const presign = await profileApi.presignAvatar();
  if (!presign?.success || !presign.url || !presign.fields) {
    throw new Error(presign?.message || 'Cannot prepare avatar upload');
  }

  const formData = new FormData();
  Object.entries(presign.fields || {}).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);

  const uploadResponse = await fetch(presign.url, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed: ${uploadResponse.status}`);
  }

  return profileApi.confirmAvatar();
};

export const getConfiguredApiBaseUrl = () => API_BASE_URL;

const ASSETS_BASE = (import.meta.env.VITE_S3_ASSETS_URL || '').replace(/\/+$/, '');

export const DEFAULT_AVATAR_URL = `${ASSETS_BASE}/avatars/default_avatar.jpg`;

export const resolveAvatarUrl = (avatarUrl) => {
  const value = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  if (!value) return DEFAULT_AVATAR_URL;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const relativePath = value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^public-assets\//, '');

  return `${ASSETS_BASE}/${relativePath}`;
};

export const useDefaultAvatarOnError = (event) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = DEFAULT_AVATAR_URL;
};

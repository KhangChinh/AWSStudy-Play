const ASSETS_BASE = (import.meta.env.VITE_S3_ASSETS_URL || '').replace(/\/+$/, '');

export const DEFAULT_AVATAR_URL = `${ASSETS_BASE}/avatars/default_avatar.jpg`;

const isLegacyDefaultAvatar = (value) => (
  /^(?:https?:\/\/[^/]+\/)?(?:public-assets\/)?(?:avatars\/)?default_avatar(?:\.(?:png|jpe?g|webp))?$/i.test(value)
);

export const resolveAvatarUrl = (avatarUrl) => {
  const value = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
  if (!value || isLegacyDefaultAvatar(value)) return DEFAULT_AVATAR_URL;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const relativePath = value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^public-assets\//, '');

  return `${ASSETS_BASE}/${relativePath}`;
};

export const useDefaultAvatarOnError = (event) => {
  if (event.currentTarget.src === DEFAULT_AVATAR_URL) {
    event.currentTarget.onerror = null;
    return;
  }
  event.currentTarget.src = DEFAULT_AVATAR_URL;
};
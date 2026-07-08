/**
 * Cosmetic Database (Local Fallback + Cloud SK registry)
 */

export const S3_ASSETS_BASE = import.meta.env.VITE_S3_ASSETS_URL;

// Background IDs on S3 / AWSServerless — loaded via cosmeticManager.loadFromMasterData
export const CLOUD_BACKGROUND_SKS = [
  'bg_crimson_void',
  'bg_dark',
  'bg_light',
  'bg_purple',
];

export const COSMETICS = {
  backgrounds: [
    {
      id: 'bg_default',
      name: 'Aurora Study',
      assets: {},
      preview: 'radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
      profileBackground: 'linear-gradient(180deg, rgba(2, 6, 23, 0.32) 0%, rgba(2, 6, 23, 0.76) 100%), radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
      desktopBackground: 'radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
    },
  ],
  frames: [
    { id: 'frame_none', name: 'None', className: 'rf-none', rarity: 'gray', tier: 'none' },
    { id: 'frame_neon', name: 'Neon Pulse', className: 'rf-neon', rarity: 'purple', tier: 'neon' },
    { id: 'frame_gold', name: 'Golden Royalty', className: 'rf-gold', rarity: 'gold', tier: 'gold' },
    { id: 'frame_galactic', name: 'Galactic Horizon', className: 'rf-galactic', rarity: 'blue', tier: 'galactic' },
  ],
  titles: [
    { id: 'title_newbie', i18nKey: 'titles.newbie', className: 't-gray', color: '#94a3b8' },
    { id: 'title_scholar', i18nKey: 'titles.scholar', className: 't-blue', color: '#60a5fa' },
    { id: 'title_collector', i18nKey: 'titles.collector', className: 't-purple', color: '#a855f7' },
    { id: 'title_speedrun', i18nKey: 'titles.speedrun', className: 't-cyan', color: '#22d3ee' },
    { id: 'title_legend', i18nKey: 'titles.legend', className: 't-legend', color: '#fbbf24' },
    { id: 'title_admin', i18nKey: 'titles.admin', className: 't-admin', color: '#ef4444' },
  ],
  themes: [],
  systemIcons: [
    { id: 'icon_default', name: 'Linear Neon', type: 'outline' },
    { id: 'icon_solid', name: 'Neural Solid', type: 'filled' },
    { id: 'icon_glass', name: 'Frosted Glass', type: 'glass' },
  ],
};

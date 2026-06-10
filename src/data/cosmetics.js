/**
 * Cosmetic Database
 */

export const COSMETICS = {
  backgrounds: [
    {
      id: 'bg_default',
      name: 'Default',
      preview: 'radial-gradient(ellipse at bottom, #2b0c3d 0%, #0c0218 100%)',
      profileBackground: 'linear-gradient(180deg, rgba(30, 41, 59, 0.78) 0%, rgba(15, 23, 42, 0.46) 100%), radial-gradient(ellipse at bottom, #2b0c3d 0%, #0c0218 100%)',
    },
    {
      id: 'bg_black',
      name: 'Black',
      preview: '#000',
      profileBackground: 'linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(15, 23, 42, 0.7) 100%), #000',
      desktopBackground: 'linear-gradient(135deg, #020617 0%, #000 100%)',
    },
    {
      id: 'bg_white',
      name: 'White',
      preview: '#fff',
      profileBackground: 'linear-gradient(180deg, rgba(2, 6, 23, 0.58) 0%, rgba(2, 6, 23, 0.86) 100%), #f8fafc',
      desktopBackground: 'linear-gradient(180deg, rgba(2, 6, 23, 0.48), rgba(2, 6, 23, 0.7)), linear-gradient(135deg, #e2e8f0 0%, #f8fafc 52%, #cbd5e1 100%)',
    },
  ],
  frames: [
    { id: 'frame_none', name: 'None', className: 'rf-none', rarity: 'gray', tier: 'none' },
    { id: 'frame_neon', name: 'Neon Pulse', className: 'rf-neon', rarity: 'purple', tier: 'neon' },
    { id: 'frame_gold', name: 'Golden Royalty', className: 'rf-gold', rarity: 'gold', tier: 'gold' },
    { id: 'frame_galactic', name: 'Galactic Horizon', className: 'rf-galactic', rarity: 'blue', tier: 'galactic' },
  ],
  titles: [
    { id: 'title_newbie', name: 'Tân Thủ', className: 't-gray', color: '#94a3b8' },
    { id: 'title_scholar', name: 'Học Giả', className: 't-blue', color: '#60a5fa' },
    { id: 'title_legend', name: 'Huyền Thoại', className: 't-legend', color: '#fbbf24' },
    { id: 'title_admin', name: 'Admin', className: 't-admin', color: '#ef4444' },
  ],
  effects: [
    { id: 'eff_none', name: 'No Effect', className: 'e-none' },
    { id: 'eff_sparkle', name: 'Sparkle', className: 'e-sparkle' },
    { id: 'eff_fire', name: 'Phoenix Flame', className: 'e-fire' },
    { id: 'eff_snow', name: 'Winter Frost', className: 'e-snow' },
  ],
  themes: [
    { id: 'theme_dark', name: 'Deep Space', className: 'theme-dark' },
    { id: 'theme_light', name: 'Star Light', className: 'theme-light' },
    { id: 'theme_halloween', name: 'Halloween Night', className: 'theme-halloween' },
  ]
};

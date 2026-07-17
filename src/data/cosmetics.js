/**
 * Cosmetic Database (Local Fallback + Cloud SK registry)
 */

export const S3_ASSETS_BASE = import.meta.env.VITE_S3_ASSETS_URL;

const assetsBase = (S3_ASSETS_BASE || '').replace(/\/+$/, '');
const fallbackBackground = (id, name, folder = id) => {
  const imageUrl = `${assetsBase}/items/background/${folder}/${id}.jpg`;
  const imageLayer = `url("${imageUrl}") center / cover no-repeat`;
  return {
    id,
    name,
    assetFolder: folder,
    imageUrl,
    preview: imageLayer,
    profileBackground: `linear-gradient(180deg, rgba(2, 6, 23, 0.38), rgba(2, 6, 23, 0.84)), ${imageLayer}`,
    desktopBackground: imageLayer,
  };
};



export const COSMETICS = {
  backgrounds: [
    {
      id: 'studyplant',
      name: 'Study Plant',
      assets: {},
      preview: 'radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
      profileBackground: 'linear-gradient(180deg, rgba(2, 6, 23, 0.32) 0%, rgba(2, 6, 23, 0.76) 100%), radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
      desktopBackground: 'radial-gradient(circle at 18% 16%, rgba(34, 211, 238, 0.38) 0%, transparent 28%), radial-gradient(circle at 82% 20%, rgba(217, 70, 239, 0.34) 0%, transparent 30%), radial-gradient(circle at 68% 78%, rgba(251, 191, 36, 0.24) 0%, transparent 30%), linear-gradient(135deg, rgba(9, 16, 43, 0.98) 0%, rgba(13, 37, 67, 0.96) 42%, rgba(26, 12, 53, 0.96) 100%)',
    },
    fallbackBackground('bg_default', 'Default Background', 'bg_default'),
    fallbackBackground('bg_light', 'Light Background'),
    fallbackBackground('bg_dark', 'Dark Background'),
    fallbackBackground('bg_purple', 'Purple Background'),
    fallbackBackground('bg_study_float', 'Study Float'),
    fallbackBackground('bg_cosmic_abyss', 'Cosmic Abyss'),
    fallbackBackground('bg_crimson_void', 'Crimson Void Background'),
    fallbackBackground('bg_galactic_nebula', 'Galactic Nebula'),
  ],
  frames: [
    { id: 'frame_none', name: 'No Frame', tier: 'none', rarity: 0 },
    {
      id: 'frame_diamond',
      name: 'Diamond Ascendant',
      tier: 'diamond',
      rarity: 5,
      assets: {
        css: 'frame/frame_diamond/assets/frame_diamond.css',
        frame: 'frame/frame_diamond/assets/frame_diamond.svg',
      },
      frameAssetUrl: `${(S3_ASSETS_BASE || '').replace(/\/+$/, '')}/items/frame/frame_diamond/assets/frame_diamond.svg`,
    },
    { id: 'frame_sapphire', name: 'Sapphire Tide', tier: 'sapphire', rarity: 4 },
    { id: 'frame_amethyst', name: 'Amethyst Arcane', tier: 'amethyst', rarity: 4 },
    { id: 'frame_stone_1', name: 'Quartz Crystal', tier: 'stone_1', rarity: 4 },
    { id: 'frame_stone_2', name: 'Obsidian Eclipse', tier: 'stone_2', rarity: 5 },
    { id: 'frame_solar', name: 'Solar Flare', tier: 'solar', rarity: 5 },
    { id: 'frame_iron', name: 'Iron Guard', tier: 'iron', rarity: 1 },
    { id: 'frame_gold', name: 'Golden Royalty', tier: 'gold', rarity: 3 },
    { id: 'frame_neon', name: 'Neon Pulse', tier: 'neon', rarity: 4 },
    { id: 'frame_platinum', name: 'Platinum Crest', tier: 'platinum', rarity: 4 },
    { id: 'frame_inferno', name: 'Inferno Sovereign', tier: 'inferno', rarity: 5 },
    { id: 'frame_galactic', name: 'Galactic Horizon', tier: 'galactic', rarity: 5 },
  ],
  titles: [
    { id: 'title_none', name: 'None', color: '#94a3b8' },
    { id: 'title_newbie', name: 'Newbie', color: '#94a3b8' },
    { id: 'title_scholar', name: 'Scholar', color: '#38bdf8' },
    { id: 'title_collector', name: 'Collector', color: '#f59e0b' },
    { id: 'title_speedrun', name: 'Speed Runner', color: '#22c55e' },
    { id: 'title_legend', name: 'Legend', color: '#f43f5e' },
  ],
  themes: [],
  systemIcons: [
    { id: 'icon_default', name: 'Linear Neon', type: 'outline' },
    { id: 'icon_solid', name: 'Neural Solid', type: 'filled' },
    { id: 'icon_glass', name: 'Frosted Glass', type: 'glass' },
  ],
};

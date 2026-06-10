/**
 * Item Database
 * Mapping IDs to metadata
 * Updated: Only Avatar Frames and Titles
 */

export const ITEMS = {
  // SSR - Titles
  item_title_legend: {
    id: 'item_title_legend',
    name: 'Huyền Thoại (Title)',
    rarity: 'SSR',
    type: 'title',
    cosmeticId: 'title_legend',
    icon: '👑'
  },
  item_title_admin: {
    id: 'item_title_admin',
    name: 'Admin (Title)',
    rarity: 'SSR',
    type: 'title',
    cosmeticId: 'title_admin',
    icon: '🛡️'
  },
  // SSR - Frames
  item_frame_galactic: {
    id: 'item_frame_galactic',
    name: 'Galactic Horizon (Frame)',
    rarity: 'SSR',
    type: 'frame',
    cosmeticId: 'frame_galactic',
    icon: '🌌'
  },
  item_frame_gold: {
    id: 'item_frame_gold',
    name: 'Golden Royalty (Frame)',
    rarity: 'SSR',
    type: 'frame',
    cosmeticId: 'frame_gold',
    icon: '🔱'
  },
  // SR - Titles
  item_title_scholar: {
    id: 'item_title_scholar',
    name: 'Học Giả (Title)',
    rarity: 'SR',
    type: 'title',
    cosmeticId: 'title_scholar',
    icon: '📚'
  },
  // SR - Frames
  item_frame_neon: {
    id: 'item_frame_neon',
    name: 'Neon Pulse (Frame)',
    rarity: 'SR',
    type: 'frame',
    cosmeticId: 'frame_neon',
    icon: '💠'
  },
  // R - Default (Just for filling pool if needed, or coins as R if allowed, but user said only frame/title)
  // Let's create some R titles
  item_title_newbie: {
    id: 'item_title_newbie',
    name: 'Tân Thủ (Title)',
    rarity: 'R',
    type: 'title',
    cosmeticId: 'title_newbie',
    icon: '🌱'
  },
  item_coin_5: {
    id: 'item_coin_5',
    name: '5 Coin (Item)',
    rarity: 'R',
    type: 'item',
    value: 5,
    icon: '🪙'
  }
};


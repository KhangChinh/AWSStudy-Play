/**
 * Item Database
 * Mapping IDs to metadata
 * Updated: Gacha items mirror AWSServerless sample ItemData
 */

export const ITEMS = {
  // SSR - Backgrounds
  bg_crimson_void: {
    id: 'bg_crimson_void',
    name: 'Crimson Void Background',
    rarity: 'SSR',
    type: 'background',
    cosmeticId: 'bg_crimson_void',
    icon: '/src/assets/gacha/OR7cQ.jpg'
  },

  // SR - Backgrounds
  bg_dark: {
    id: 'bg_dark',
    name: 'Dark Background',
    rarity: 'SR',
    type: 'background',
    cosmeticId: 'bg_dark',
    icon: '/src/assets/gacha/OR7cQ.jpg'
  },
  bg_light: {
    id: 'bg_light',
    name: 'Light Background',
    rarity: 'SR',
    type: 'background',
    cosmeticId: 'bg_light',
    icon: '/src/assets/gacha/OR7cQ.jpg'
  },

  // R - Currency
  item_sanity: {
    id: 'item_sanity',
    name: 'Sanity',
    rarity: 'R',
    type: 'currency',
    icon: '/src/assets/Sanity.png'
  }
};

/**
 * Banner Configuration Data
 * Driven by time and theme
 * Updated: Uses current AWSServerless gacha sample items
 */

export const AUTO_ROTATE_BANNERS = true;
export const BANNER_ROTATION_MS = 60 * 60 * 1000;

const CURRENT_GACHA_FEATURED = {
  5: ['bg_crimson_void'],
  4: ['bg_dark', 'bg_light'],
};

export const BANNERS = [
  {
    id: 'banner_current_gacha_01',
    name: 'Crimson Void',
    type: 'limited',
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2027-01-01T00:00:00Z',
    background: 'solar-bg',
    image: '/src/assets/gacha/OR7cQ.jpg',
    theme: 'theme-solar',
    effect: 'effect-fire',
    featured: CURRENT_GACHA_FEATURED,
    rates: {
      5: 0.01,
      4: 0.10,
      3: 0.89
    }
  },
  {
    id: 'banner_current_gacha_02',
    name: 'Study Backgrounds',
    type: 'standard',
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2027-01-01T00:00:00Z',
    background: 'solar-bg',
    image: '/src/assets/gacha/OR7cQ.jpg',
    theme: 'theme-solar',
    effect: 'effect-fire',
    featured: CURRENT_GACHA_FEATURED,
    rates: {
      5: 0.01,
      4: 0.10,
      3: 0.89
    }
  }
];


/**
 * Banner Configuration Data
 * Driven by time and theme
 * Updated: Uses current AWSServerless gacha sample items
 */

export const AUTO_ROTATE_BANNERS = false;

const CURRENT_GACHA_FEATURED = {
  SSR: ['bg_crimson_void'],
  SR: ['bg_dark', 'bg_light'],
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
      SSR: 0.01,
      SR: 0.10,
      R: 0.89
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
      SSR: 0.01,
      SR: 0.10,
      R: 0.89
    }
  }
];


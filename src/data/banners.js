/**
 * Banner Configuration Data
 * Driven by time and theme
 * Updated: Using only cosmetic items
 */

export const BANNERS = [
  {
    id: 'banner_cosmetic_01',
    name: 'Legendary Style',
    type: 'limited',
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2026-12-31T23:59:59Z',
    background: 'nebula-bg',
    image: '/src/assets/gacha/u6bbJ.jpg',
    theme: 'theme-nebula',
    effect: 'effect-stars',
    featured: {
      SSR: ['item_title_legend', 'item_frame_galactic'],
      SR: ['item_title_scholar', 'item_frame_neon'],
    },
    rates: {
      SSR: 0.006,
      SR: 0.051,
      R: 0.943
    }
  },
  {
    id: 'banner_royalty_01',
    name: 'Royal Frames',
    type: 'limited',
    startTime: '2026-06-01T00:00:00Z',
    endTime: '2027-01-01T00:00:00Z',
    background: 'solar-bg',
    image: '/src/assets/gacha/OR7cQ.jpg',
    theme: 'theme-solar',
    effect: 'effect-fire',
    featured: {
      SSR: ['item_frame_gold', 'item_title_admin'],
      SR: ['item_frame_neon', 'item_title_scholar'],
    },
    rates: {
      SSR: 0.006,
      SR: 0.051,
      R: 0.943
    }
  }
];


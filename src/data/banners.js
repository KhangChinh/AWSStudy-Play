/**
 * Banner Configuration Data
 * Driven by time and theme
 */

export const BANNERS = [
  {
    id: 'banner_nebula_01',
    name: 'Nebula Voyage',
    type: 'limited',
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2026-12-31T23:59:59Z', // Long duration for testing
    background: 'nebula-bg',
    theme: 'theme-nebula',
    effect: 'effect-stars',
    featured: {
      SSR: ['item_nebula_wings_5s'],
      SR: ['item_pulse_blade_4s', 'item_cosmic_dust_4s'],
    },
    rates: {
      SSR: 0.006,
      SR: 0.051,
      R: 0.943
    }
  },
  {
    id: 'banner_solar_01',
    name: 'Solar Flare',
    type: 'limited',
    startTime: '2026-06-01T00:00:00Z',
    endTime: '2027-01-01T00:00:00Z',
    background: 'solar-bg',
    theme: 'theme-solar',
    effect: 'effect-fire',
    featured: {
      SSR: ['item_solaris_arch_5s'],
      SR: ['item_blaze_dagger_4s'],
    },
    rates: {
      SSR: 0.006,
      SR: 0.051,
      R: 0.943
    }
  },
  {
    id: 'banner_lunar_01',
    name: 'Lunar Festival',
    type: 'event',
    startTime: '2024-01-01T00:00:00Z',
    endTime: '2026-12-31T23:59:59Z',
    background: 'lunar-bg',
    theme: 'theme-lunar',
    effect: 'effect-moon',
    featured: {
      SSR: ['item_nebula_wings_5s'], // Reusing item for demo
      SR: ['item_moon_shard_4s'],
    },
    rates: {
      SSR: 0.01,
      SR: 0.1,
      R: 0.89
    }
  }
];

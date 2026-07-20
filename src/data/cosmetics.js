/**
 * Cosmetic Database (Local Fallback + Cloud SK registry)
 */

export const S3_ASSETS_BASE = import.meta.env.VITE_S3_ASSETS_URL;

export const COSMETICS = {
  backgrounds: [],
  frames: [],
  titles: [
    { id: 'title_none', name: 'None', color: '#94a3b8' },
    { id: 'title_newbie', name: 'Newbie', color: '#94a3b8' },
    { id: 'title_scholar', name: 'Scholar', color: '#38bdf8' },
    { id: 'title_collector', name: 'Collector', color: '#f59e0b' },
    { id: 'title_speedrun', name: 'Speed Runner', color: '#22c55e' },
    { id: 'title_legend', name: 'Legend', color: '#f43f5e' },
  ],
  themes: [],
};

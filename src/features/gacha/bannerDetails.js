const DEFAULT_RATES = {
  5: 0.01,
  4: 0.09,
  rateUpChance: 0.5,
  pity5StarLimit: 80,
  pity4StarLimit: 10,
};

export const GACHA_CONFIGS = [
  {
    bannerId: 'banner_pet',
    name: 'Banner Thú cưng',
    itemType: 'pet',
    durationDays: 7,
    rates: DEFAULT_RATES,
  },
  {
    bannerId: 'banner_background',
    name: 'Banner Hình Nền Thường Nhật',
    itemType: 'background',
    durationDays: 1,
    rates: DEFAULT_RATES,
  },
  {
    bannerId: 'banner_frame',
    name: 'Banner Khung Đại Diện',
    itemType: 'frame',
    durationDays: 3,
    rates: DEFAULT_RATES,
  },
  {
    bannerId: 'banner_title',
    name: 'Banner Trang trí Tiêu Đề',
    itemType: 'title',
    durationDays: 1,
    rates: { ...DEFAULT_RATES, rateUpChance: 0.75 },
  },
];

export const PET_IDLE_THUMBNAILS = {
  pet_janedoe: { frames: 8, width: 32, height: 32 },
  pet_wolf: { frames: 6, width: 64, height: 48 },
  pet_cat: { frames: 8, width: 32, height: 32 },
  pet_bluewie: { frames: 4, width: 32, height: 32 },
  pet_browie: { frames: 2, width: 32, height: 32 },
  pet_luneblade: { frames: 7, width: 32, height: 32 },
  pet_bunny: { frames: 4, width: 32, height: 32 },
  pet_death: { frames: 2, width: 32, height: 35 },
  pet_icabell: { frames: 3, width: 48, height: 48 },
};

const RATE_UP_IDS_BY_BANNER = {
  banner_background: {
    5: ['bg_crimson_void'],
    4: ['bg_dark'],
  },
  banner_frame: {
    5: ['frame_diamond'],
    4: ['frame_gold'],
  },
  banner_title: {
    5: ['title_legend'],
    4: ['title_collector', 'title_speedrun'],
  },
  banner_pet: {
    5: ['pet_janedoe'],
    4: ['pet_wolf'],
  },
};

const uniqueById = (items) => Array.from(new Map(
  items
    .filter(Boolean)
    .map(item => [item.SK || item.id, item])
).values());

export const buildBannerDetails = (config, masterItems = []) => {
  const itemTypeItems = uniqueById(masterItems).filter(item => (
    item.itemType === config.itemType
    && item.collectFrom === 'gacha'
  ));
  const configuredRateUps = RATE_UP_IDS_BY_BANNER[config.bannerId] || {};
  const findConfiguredItems = (rarity) => {
    const ids = new Set(configuredRateUps[rarity] || []);
    return itemTypeItems.filter(item => ids.has(item.SK || item.id));
  };

  return {
    PK: 'gacha',
    SK: config.bannerId,
    bannerName: config.name,
    durationDays: config.durationDays,
    itemType: config.itemType,
    pool: {
      rateUp5: findConfiguredItems(5),
      rateUp4: findConfiguredItems(4),
      standard5: itemTypeItems.filter(item => Number(item.rarity) === 5 && item.isLimited === false),
      standard4: itemTypeItems.filter(item => Number(item.rarity) === 4 && item.isLimited === false),
    },
    rates: {
      base5Star: Number(config.rates?.[5]) || 0,
      base4Star: Number(config.rates?.[4]) || 0,
      pity5StarLimit: Number(config.rates?.pity5StarLimit) || 80,
      pity4StarLimit: Number(config.rates?.pity4StarLimit) || 10,
      rateUpChance: Number(config.rates?.rateUpChance ?? 0.5),
    },
  };
};

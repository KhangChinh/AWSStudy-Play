/**
 * rankSystem.js — Hệ thống phân hạng theo Rank Points (RP)
 *
 * Cấu trúc bậc (tier) và subbậc (division):
 *  - Mỗi bậc gồm 5 chia nhỏ: V → IV → III → II → I
 *  - RP cần để lên 1 division TRONG cùng bậc:
 *      Đồng (Bronze)   : 30 RP/div
 *      Bạc  (Silver)   : 60 RP/div
 *      Vàng (Gold)     : 90 RP/div
 *      Bạch Kim (Plat) : 120 RP/div
 *      Kim Cương (Dia) : 150 RP/div
 *  - Promotion gate (lên bậc tiếp theo) = RP/div của bậc kế:
 *      Bronze I  → Silver V   : 60 RP
 *      Silver I  → Gold V     : 90 RP
 *      Gold I    → Plat V     : 120 RP
 *      Plat I    → Diamond V  : 150 RP
 *      Diamond I → Master     : 180 RP
 *
 * Thresholds (RP tích lũy để BẮT ĐẦU rank đó):
 *
 *  Bronze V   :   0    Bronze IV  :  30   Bronze III :  60
 *  Bronze II  :  90    Bronze I   : 120
 *  Silver V   : 180    Silver IV  : 240   Silver III : 300
 *  Silver II  : 360    Silver I   : 420
 *  Gold V     : 510    Gold IV    : 600   Gold III   : 690
 *  Gold II    : 780    Gold I     : 870
 *  Plat V     : 990    Plat IV    :1110   Plat III   :1230
 *  Plat II    :1350    Plat I     :1470
 *  Diamond V  :1620    Diamond IV :1770   Diamond III:1920
 *  Diamond II :2070    Diamond I  :2220
 *  Master     :2400
 */

export const TIER_IDS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];

export const TIER_NAMES = {
  bronze:   { en: 'Bronze',   vi: 'Đồng' },
  silver:   { en: 'Silver',   vi: 'Bạc' },
  gold:     { en: 'Gold',     vi: 'Vàng' },
  platinum: { en: 'Platinum', vi: 'Bạch Kim' },
  diamond:  { en: 'Diamond',  vi: 'Kim Cương' },
  master:   { en: 'Master',   vi: 'Cao Thủ' },
};

export const DIVISION_ROMAN = ['V', 'IV', 'III', 'II', 'I'];

// RP per division within each tier
const RP_PER_DIV = {
  bronze:   30,
  silver:   60,
  gold:     90,
  platinum: 120,
  diamond:  150,
};

// Promotion gate RP (to enter NEXT tier) = next tier's RP/div
const PROMOTION_RP = {
  bronze:   60,   // → Silver V
  silver:   90,   // → Gold V
  gold:     120,  // → Plat V
  platinum: 150,  // → Diamond V
  diamond:  180,  // → Master
};

/**
 * Build the complete rank threshold table.
 * Each entry: { tier, division, divIndex (0=V,4=I), minRP, maxRP }
 */
function buildRankTable() {
  const table = [];
  let cumulative = 0;

  for (const tier of TIER_IDS) {
    if (tier === 'master') {
      table.push({
        tier: 'master',
        division: null,
        divIndex: null,
        minRP: cumulative,
        maxRP: Infinity,
        displayName: TIER_NAMES.master,
      });
      break;
    }

    const rpPerDiv = RP_PER_DIV[tier];
    const promoRP  = PROMOTION_RP[tier];

    for (let i = 0; i < 5; i++) {
      const divLabel = DIVISION_ROMAN[i]; // i=0 → V, i=4 → I
      const isPromotionDiv = (i === 4); // Division I
      const rangeRP = isPromotionDiv ? promoRP : rpPerDiv;

      table.push({
        tier,
        division: divLabel,
        divIndex: i,
        minRP: cumulative,
        maxRP: cumulative + rangeRP,
        rangeRP,
        displayName: TIER_NAMES[tier],
      });

      cumulative += rangeRP;
    }
  }

  return table;
}

export const RANK_TABLE = buildRankTable();

/**
 * Given a total RP, return the current rank info.
 * @param {number} rp - Total rank points
 * @returns {{ tier, division, divIndex, minRP, maxRP, rangeRP, progress, displayName, label }}
 */
export function getRankInfo(rp = 0) {
  const safeRp = Math.max(0, rp);

  // Find the matching rank entry
  let entry = RANK_TABLE[RANK_TABLE.length - 1]; // default to Master
  for (const row of RANK_TABLE) {
    if (safeRp < row.maxRP) {
      entry = row;
      break;
    }
  }

  const rpInDiv = safeRp - entry.minRP;
  const progress = entry.tier === 'master'
    ? 100
    : Math.min(100, Math.floor((rpInDiv / entry.rangeRP) * 100));

  const label = entry.tier === 'master'
    ? `${TIER_NAMES.master.vi}`
    : `${TIER_NAMES[entry.tier].vi} ${entry.division}`;

  const labelEn = entry.tier === 'master'
    ? `${TIER_NAMES.master.en}`
    : `${TIER_NAMES[entry.tier].en} ${entry.division}`;

  return {
    ...entry,
    rp: safeRp,
    rpInDiv,
    progress,
    label,      // Vietnamese: "Đồng V", "Bạc I", "Cao Thủ"
    labelEn,    // English: "Bronze V", "Silver I", "Master"
    rpToNext: entry.tier === 'master' ? 0 : entry.rangeRP - rpInDiv,
  };
}

/**
 * Get tier string (e.g. 'bronze', 'silver') from total RP.
 * Compatible with existing rank-${tier} CSS classes.
 */
export function getTierFromRP(rp = 0) {
  return getRankInfo(rp).tier;
}

/**
 * Get a human-readable rank label in Vietnamese from total RP.
 */
export function getRankLabel(rp = 0, lang = 'vi') {
  const info = getRankInfo(rp);
  return lang === 'en' ? info.labelEn : info.label;
}

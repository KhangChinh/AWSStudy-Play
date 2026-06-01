/**
 * Config for all Gacha Pools
 * To add a new banner:
 * 1. Add a new object to the POOLS array
 * 2. Add matching SCSS styles in /pool/ folder (optional, can use defaults)
 */

export const POOLS = [
  {
    id: 1,
    name: 'Nebula Voyage',
    className: 'pool-1',
    description: 'Limited Space Adventure Banner',
    config: {
      featured5: { name: 'Super Nova Wings', icon: '🌌', rarity: 5 },
      featured4: { name: 'Pulse Blade', icon: '⚔️', rarity: 4 },
      others5: [
        { name: 'Golden Crown', icon: '👑', rarity: 5 },
        { name: 'Phoenix Spirit', icon: '🔥', rarity: 5 }
      ],
      others4: [
        { name: 'Neon Frame', icon: '🖼️', rarity: 4 },
        { name: 'Cosmic Dust', icon: '💫', rarity: 4 }
      ],
      standard3: [
        { name: 'P-Coin Bundle', icon: '🪙', rarity: 3 },
        { name: 'XP Potion', icon: '🧪', rarity: 3 }
      ],
    }
  },
  {
    id: 2,
    name: 'Solar Flare',
    className: 'pool-2',
    description: 'Ancient Sun Guardians Banner',
    config: {
      featured5: { name: 'Solaris Arch', icon: '☀️', rarity: 5 },
      featured4: { name: 'Blaze Dagger', icon: '🔥', rarity: 4 },
      others5: [
        { name: 'Ember Heart', icon: '❤️', rarity: 5 },
        { name: 'Molten Core', icon: '🌋', rarity: 5 }
      ],
      others4: [
        { name: 'Cinder Cloak', icon: '🧥', rarity: 4 },
        { name: 'Ash Spear', icon: '🔱', rarity: 4 }
      ],
      standard3: [
        { name: 'P-Coin Bundle', icon: '🪙', rarity: 3 },
        { name: 'XP Potion', icon: '🧪', rarity: 3 }
      ],
    }
  },
  {
    id: 3,
    name: 'Deep Ocean',
    className: 'pool-3',
    description: 'Mysteries of the Abyss',
    config: {
      featured5: { name: 'Leviathan Core', icon: '🌊', rarity: 5 },
      featured4: { name: 'Coral Trident', icon: '🔱', rarity: 4 },
      others5: [
        { name: 'Pearl Gaze', icon: '⚪', rarity: 5 },
        { name: 'Tide Bringer', icon: '🌀', rarity: 5 }
      ],
      others4: [
        { name: 'Shell Shield', icon: '🐚', rarity: 4 },
        { name: 'Scale Mail', icon: '🛡️', rarity: 4 }
      ],
      standard3: [
        { name: 'P-Coin Bundle', icon: '🪙', rarity: 3 },
        { name: 'XP Potion', icon: '🧪', rarity: 3 }
      ],
    }
  }
];

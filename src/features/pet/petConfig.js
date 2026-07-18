export const petConfig = {
  pet_death: {
    name: 'Death',
    folder: 'pet_death',
    width: 32,
    height: 35,
    animations: {
      Idle: { frames: 8, speed: 150 },
      Walk: { frames: 8, speed: 100 },
      Hurt: { frames: 8, speed: 150 },
      Attack: { frames: 8, speed: 100 },
      Death: { frames: 8, speed: 150, loop: false },
      Jump: { frames: 8, speed: 120 },
      Sleep: { frames: 8, speed: 200 },
      CarrotSkill: { frames: 8, speed: 150 },
      Sitting: { frames: 8, speed: 180 },
      LieDown: { frames: 8, speed: 180 },
    },
  },
  '1 Dog': {
    name: 'Shiba Dog',
    folder: '1 Dog',
    width: 48,
    height: 48,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 6, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Attack: { frames: 4, speed: 100 },
      Death: { frames: 4, speed: 150, loop: false }
    }
  },
  '2 Dog 2': {
    name: 'Husky',
    folder: '2 Dog 2',
    width: 48,
    height: 48,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 6, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Attack: { frames: 4, speed: 100 },
      Death: { frames: 4, speed: 150, loop: false }
    }
  },
  '3 Cat': {
    name: 'Orange Cat',
    folder: '3 Cat',
    width: 48,
    height: 48,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 6, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Attack: { frames: 4, speed: 100 },
      Death: { frames: 4, speed: 150, loop: false }
    }
  },
  '4 Cat 2': {
    name: 'White Cat',
    folder: '4 Cat 2',
    width: 48,
    height: 48,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 6, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Attack: { frames: 4, speed: 100 },
      Death: { frames: 4, speed: 150, loop: false }
    }
  },
  '5 Rat': {
    name: 'Brown Rat',
    folder: '5 Rat',
    width: 32,
    height: 32,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 4, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Death: { frames: 4, speed: 150, loop: false }
    }
  },
  '6 Rat 2': {
    name: 'White Rat',
    folder: '6 Rat 2',
    width: 32,
    height: 32,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 4, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Death: { frames: 2, speed: 150, loop: false }
    }
  },
  '7 Bird': {
    name: 'Blue Bird',
    folder: '7 Bird',
    width: 32,
    height: 32,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 6, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Death: { frames: 4, speed: 150, loop: false }
    }
  },
  '8 Bird 2': {
    name: 'Red Bird',
    folder: '8 Bird 2',
    width: 32,
    height: 32,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 6, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Death: { frames: 4, speed: 150, loop: false }
    }
  },
  '9 Bunny': {
    name: 'Bunny',
    folder: '9 Bunny',
    width: 32,
    height: 32,
    animations: {
      Idle: { file: 'BunnyIdle-Sheet.png', frames: 8, speed: 150 },
      Walk: { file: 'BunnyRun-Sheet.png', frames: 5, speed: 100 },
      Hurt: { file: 'BunnyHurt-Sheet.png', frames: 3, speed: 200 },
      Attack: { file: 'BunnyAttack-Sheet.png', frames: 7, speed: 100 },
      Death: { file: 'BunnyDead-Sheet.png', frames: 9, speed: 150, loop: false },
      CarrotSkill: { file: 'BunnyCarrotSkill-Sheet.png', frames: 15, speed: 120 },
      Sitting: { file: 'BunnySitting-Sheet.png', frames: 3, speed: 200 },
      Sleep: { file: 'BunnySleep-Sheet.png', frames: 2, speed: 300 },
      LieDown: { file: 'BunnyLieDown-Sheet.png', frames: 2, speed: 200 },
      Jump: { file: 'BunnyJump.gif', type: 'gif', frames: 1, speed: 100 }
    }
  }
};
const normalizePetKey = value => String(value || '').trim().toLowerCase();

export const getPetConfig = (petId, pet = {}) => {
  const candidates = [petId, pet.id, pet.SK, pet.folder, pet.name]
    .map(normalizePetKey)
    .filter(Boolean);

  const match = Object.entries(petConfig).find(([key, config]) => {
    const aliases = [key, config.name].map(normalizePetKey);
    return candidates.some(candidate => aliases.includes(candidate));
  });

  return match?.[1] || {
    name: pet.name || petId || 'Pet',
    width: pet.width || 32,
    height: pet.height || 32,
    animations: {
      Idle: { frames: 4, speed: 150 },
      Walk: { frames: 6, speed: 100 },
      Hurt: { frames: 2, speed: 200 },
      Attack: { frames: 4, speed: 100 },
      Death: { frames: 4, speed: 150, loop: false },
      Jump: { frames: 4, speed: 150 },
      Sleep: { frames: 4, speed: 200 },
      CarrotSkill: { frames: 4, speed: 150 },
      Sitting: { frames: 4, speed: 150 },
      LieDown: { frames: 4, speed: 150 }
    }
  };
};

import { SET_INVENTORY, APPEND_INVENTORY, CLEAR_INVENTORY } from '../actions/inventoryActions';

const DEFAULT_TYPES = ['background', 'frame', 'title', 'button', 'theme', 'systemIcon'];
const configuredTypes = (import.meta.env.VITE_INVENTORY_TYPES || '')
  .replace(/^['"]|['"]$/g, '')
  .split(',')
  .map(type => type.trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean);
const types = configuredTypes.length > 0 ? configuredTypes : DEFAULT_TYPES;

const normalizeType = (type) => {
  const aliases = {
    backgrounds: 'background',
    frames: 'frame',
    titles: 'title',
    buttons: 'button',
    themes: 'theme',
    systemIcons: 'systemIcon',
    system_icons: 'systemIcon',
  };
  return aliases[type] || type;
};

const itemKey = (item) => item?.SK || item?.id;

const mergeUniqueItems = (current = [], incoming = []) => {
  const merged = [...current];
  const seen = new Set(current.map(itemKey).filter(Boolean));

  for (const item of incoming || []) {
    const key = itemKey(item);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    merged.push(item);
  }

  return merged;
};

const initialState = types.reduce((acc, type) => {
  const normalizedType = normalizeType(type);
  acc[normalizedType] = { items: [], lastKey: null, hasMore: true, isLoading: false };
  return acc;
}, {});

const inventoryReducer = (state = initialState, action) => {
  const { itemType, items = [], lastKey } = action.payload || {};
  const normalizedType = normalizeType(itemType);

  switch (action.type) {
    case SET_INVENTORY: {
      if (!normalizedType || !state[normalizedType]) return state;
      return {
        ...state,
        [normalizedType]: {
          items: items || [],
          lastKey: lastKey || null,
          hasMore: lastKey !== null,
          isLoading: false,
        }
      };
    }

    case APPEND_INVENTORY: {
      if (!normalizedType || !state[normalizedType]) return state;
      return {
        ...state,
        [normalizedType]: {
          items: mergeUniqueItems(state[normalizedType]?.items || [], items),
          lastKey: lastKey || null,
          hasMore: lastKey !== null,
          isLoading: false,
        }
      };
    }

    case CLEAR_INVENTORY:
      return { ...initialState };

    default:
      return state;
  }
};

export default inventoryReducer;
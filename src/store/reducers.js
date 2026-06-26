/**
 * Redux Reducer — Quản lý state toàn cục
 * Cấu trúc dữ liệu mirror DynamoDB JSON Schema
 */

const initialState = {
  // Auth
  userInfo: null,
  isLoggedIn: false,
  accessToken: null,
  // Economy
  economy: {
    pCoins: 0,
    gachaTickets: 0,
  },
  // Inventory
  inventory: {
    consumables: {},
    cosmeticShards: {},
    activeCosmetics: {
      appTheme: 'dark',
      avatarFrame: null,
      focusWidget: null,
    },
  },
  // Focus
  focusSettings: {
    aiGuardEnabled: true,
    blacklist: [],
    aiExceptions: [],
  },
  activeSession: null,
  // Social
  friends: [],
  friendLastEvaluatedKey: null,
  friendUpdatedAt: null,
  // Minigame
  minigameHighscores: {},
  // Quest
  dailyQuests: null,
};

const appReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'USER_LOGIN':
      return {
        ...state,
        userInfo: action.payload,
        isLoggedIn: true,
      };
    case 'USER_LOGOUT':
      return {
        ...initialState,
      };
    case 'SET_TOKEN':
      return {
        ...state,
        accessToken: action.payload,
      };
    case 'SET_ECONOMY':
      return {
        ...state,
        economy: { ...state.economy, ...action.payload },
      };
    case 'SET_INVENTORY':
      return {
        ...state,
        inventory: { ...state.inventory, ...action.payload },
      };
    case 'SET_FOCUS_SETTINGS':
      return {
        ...state,
        focusSettings: { ...state.focusSettings, ...action.payload },
      };
    case 'SET_ACTIVE_SESSION':
      return {
        ...state,
        activeSession: action.payload,
      };
    case 'SET_HIGHSCORES':
      return {
        ...state,
        minigameHighscores: { ...state.minigameHighscores, ...action.payload },
      };
    case 'SET_FRIENDS':
      return {
        ...state,
        friends: action.payload.friends || [],
        friendLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
      };
    case 'APPEND_FRIENDS':
      return {
        ...state,
        friends: [...state.friends, ...(action.payload.friends || [])],
        friendLastEvaluatedKey: action.payload.lastEvaluatedKey || null,
      };
    case 'SET_FRIEND_SYNC_TIME':
      return {
        ...state,
        friendUpdatedAt: action.payload,
      };
    case 'SET_DAILY_QUESTS':
      return {
        ...state,
        dailyQuests: action.payload,
      };
    case 'UPDATE_QUEST_PROGRESS':
      return {
        ...state,
        dailyQuests: state.dailyQuests
          ? { ...state.dailyQuests, quests: action.payload }
          : null,
      };
    default:
      return state;
  }
};

export default appReducer;

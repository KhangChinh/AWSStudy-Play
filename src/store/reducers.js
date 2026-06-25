/**
 * Redux Reducer — Quản lý state toàn cục
 * Cấu trúc dữ liệu mirror DynamoDB JSON Schema
 */

const initialState = {
  // Auth
  userInfo: null,
  profile: null,
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
  friendsLastKey: null,
  daily: null,
  gachaHistory: [],
  gachaHistoryLastKey: null,
  masterData: [],
  // Minigame
  minigameHighscores: {},
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
        inventory: Array.isArray(action.payload) ? action.payload : { ...state.inventory, ...action.payload },
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
        friends: action.payload?.items || action.payload || [],
        friendsLastKey: action.payload?.lastEvaluatedKey || null,
      };
    case 'SET_PROFILE':
      return {
        ...state,
        profile: action.payload,
        userInfo: {
          ...state.userInfo,
          username: action.payload?.information?.name || state.userInfo?.username,
          email: action.payload?.information?.email || state.userInfo?.email,
          avatar: action.payload?.information?.avatarUrl || state.userInfo?.avatar,
          streak: action.payload?.studyStats?.streak ?? state.userInfo?.streak,
        },
      };
    case 'SET_DAILY':
      return {
        ...state,
        daily: action.payload,
      };
    case 'SET_GACHA_HISTORY':
      return {
        ...state,
        gachaHistory: action.payload?.items || action.payload || [],
        gachaHistoryLastKey: action.payload?.lastEvaluatedKey || null,
      };
    case 'SET_MASTER_DATA':
      return {
        ...state,
        masterData: action.payload || [],
      };
    default:
      return state;
  }
};

export default appReducer;

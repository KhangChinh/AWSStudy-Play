import { SET_SOCIAL, APPEND_SOCIAL, MERGE_SOCIAL_FRIENDS, CLEAR_SOCIAL } from '../actions/socialActions';

const initialState = {
  items: [],
  lastKey: null,
  hasMore: true,
  isLoading: false,
};

const socialReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SOCIAL:
      return {
        ...state,
        items: action.payload.items || [],
        lastKey: action.payload.lastKey || null,
        hasMore: action.payload.lastKey !== null,
        isLoading: false,
      };
    case APPEND_SOCIAL:
      return {
        ...state,
        items: [...state.items, ...(action.payload.items || [])],
        lastKey: action.payload.lastKey || null,
        hasMore: action.payload.lastKey !== null,
        isLoading: false,
      };
    case MERGE_SOCIAL_FRIENDS: {
      const updates = action.payload?.items || [];
      if (!updates.length) return state;

      const updatesById = new Map(
        updates
          .map((item) => [item.SK || item.userId, item])
          .filter(([id]) => Boolean(id))
      );

      return {
        ...state,
        items: state.items.map((item) => {
          const update = updatesById.get(item.SK);
          if (!update) return item;
          return {
            ...item,
            friendName: update.friendName ?? update.name ?? item.friendName,
            friendAvatarUrl: update.friendAvatarUrl ?? update.avatarUrl ?? item.friendAvatarUrl,
            level: update.level ?? item.level,
            rankScore: update.rankScore ?? item.rankScore,
            streak: update.streak ?? item.streak,
            friendEquippedFrame: update.friendEquippedFrame ?? update.equippedFrame ?? item.friendEquippedFrame,
            equippedCosmetics: update.equippedCosmetics ?? item.equippedCosmetics,
            friendInfoUpdatedAt: update.friendInfoUpdatedAt ?? Date.now(),
          };
        }),
      };
    }
    case CLEAR_SOCIAL:
      return initialState;

    default:
      return state;
  }
};

export default socialReducer;
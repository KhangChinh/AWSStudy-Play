/**
 * Redux Actions — Action creators cho toàn bộ ứng dụng
 */

//auth
export const userLogin = (userInfo) => ({
  type: 'USER_LOGIN',
  payload: userInfo,
});

export const userLogout = () => ({
  type: 'USER_LOGOUT',
});

export const setToken = (token) => ({
  type: 'SET_TOKEN',
  payload: token,
});

//economy
export const setEconomy = (data) => ({
  type: 'SET_ECONOMY',
  payload: data,
});

//inventory
export const setInventory = (data) => ({
  type: 'SET_INVENTORY',
  payload: data,
});

//focus
export const setFocusSettings = (data) => ({
  type: 'SET_FOCUS_SETTINGS',
  payload: data,
});

export const setActiveSession = (data) => ({
  type: 'SET_ACTIVE_SESSION',
  payload: data,
});

//minigame
export const setHighscores = (data) => ({
  type: 'SET_HIGHSCORES',
  payload: data,
});

//social
export const setFriends = (data) => ({
  type: 'SET_FRIENDS',
  payload: data,
});

//quest
export const setDailyQuests = (data) => ({
  type: 'SET_DAILY_QUESTS',
  payload: data,
});

export const updateQuestProgress = (quests) => ({
  type: 'UPDATE_QUEST_PROGRESS',
  payload: quests,
});

export const appendFriends = (data) => ({
  type: 'APPEND_FRIENDS',
  payload: data,
});

export const setFriendSyncTime = (time) => ({
  type: 'SET_FRIEND_SYNC_TIME',
  payload: time,
});

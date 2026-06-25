import { fetchAuthSession } from 'aws-amplify/auth';

export const API_BASE_URL = (
  import.meta.env.VITE_CLOUD_API_URL
  || import.meta.env.VITE_API_BASE_URL
  || ''
).replace(/\/$/, '');

const getAuthToken = async () => {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString() || session.tokens?.idToken?.toString() || '';
};

const readJsonResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const body = await response.text().catch(() => '');
    const hint = body.trim().startsWith('<!doctype') || body.trim().startsWith('<html')
      ? ' Got the frontend HTML instead, so VITE_CLOUD_API_URL is probably missing or wrong.'
      : '';
    throw new Error(`API returned non-JSON response.${hint}`);
  }

  return response.json();
};

export async function apiCall(endpoint, options = {}) {
  if (!API_BASE_URL) {
    throw new Error('Cloud API URL is not configured. Set VITE_CLOUD_API_URL in .env and restart the dev server.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (!headers.Authorization) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await readJsonResponse(response).catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }

  return readJsonResponse(response);
}

export const profileApi = {
  get: () => apiCall('/get-profile'),
  update: (data) => apiCall('/update-profile', { method: 'PUT', body: JSON.stringify(data) }),
  equipCosmetics: (data) => apiCall('/change-cosmetics', { method: 'POST', body: JSON.stringify(data) }),
  presignAvatar: () => apiCall('/avatar/presign', { method: 'POST', body: JSON.stringify({}) }),
  confirmAvatar: () => apiCall('/avatar/confirm', { method: 'POST', body: JSON.stringify({}) }),
};

export const syncApi = {
  all: (data = {}) => apiCall('/sync-all', { method: 'POST', body: JSON.stringify(data) }),
  profile: () => apiCall('/sync-profile'),
  inventory: (lastKey) => apiCall(`/sync-inventory${lastKey ? `?lastKey=${encodeURIComponent(JSON.stringify(lastKey))}` : ''}`),
  gachaHistory: (lastKey) => apiCall(`/sync-gacha-history${lastKey ? `?lastKey=${encodeURIComponent(JSON.stringify(lastKey))}` : ''}`),
  friends: (lastKey) => apiCall(`/sync-friends${lastKey ? `?lastKey=${encodeURIComponent(JSON.stringify(lastKey))}` : ''}`),
  masterData: () => apiCall('/master-data'),
};

export const gachaApi = {
  roll: (count) => apiCall('/gacha', { method: 'POST', body: JSON.stringify({ count }) }),
};

export const economyApi = {
  exchange: (amount) => apiCall('/currency/exchange', { method: 'POST', body: JSON.stringify({ amount }) }),
};

export const questApi = {
  getDaily: () => apiCall('/daily'),
  claim: (questKey) => apiCall('/daily/claim', { method: 'POST', body: JSON.stringify({ questKey }) }),
};

export const shopApi = {
  get: (shopId = 'eCoinShop') => apiCall(`/shop?shopId=${encodeURIComponent(shopId)}`),
  buy: (shopId, itemId) => apiCall('/shop/buy', { method: 'POST', body: JSON.stringify({ shopId, itemId }) }),
};

export const socialApi = {
  search: (query) => apiCall(`/friends/search?q=${encodeURIComponent(query)}`),
  getFriends: (lastKey) => apiCall(`/friends${lastKey ? `?lastKey=${encodeURIComponent(JSON.stringify(lastKey))}` : ''}`),
  sendFriendRequest: (targetUserId) => apiCall('/friends/request', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  acceptFriendRequest: (targetUserId) => apiCall('/friends/accept', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
  removeFriend: (targetUserId) => apiCall('/friends/remove', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
};

export const minigameApi = {
  getLevels: (gameId, lastKey) => apiCall(`/minigame/levels?gameId=${encodeURIComponent(gameId)}${lastKey ? `&lastKey=${encodeURIComponent(JSON.stringify(lastKey))}` : ''}`),
  getGlobalLeaderboard: (gameId) => apiCall(`/minigame/leaderboard/global?gameId=${encodeURIComponent(gameId)}`),
  getFriendsLeaderboard: (gameId) => apiCall(`/minigame/leaderboard/friends?gameId=${encodeURIComponent(gameId)}`),
};

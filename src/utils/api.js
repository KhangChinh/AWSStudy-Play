//placeholder
/**
 * API Utility — Wrapper cho giao tiếp với AWS Cloud Backend
 * 
 * React gọi AWS trực tiếp qua HTTP (axios/fetch)
 * Không đi qua Electron Main Process
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Generic API caller
 * @param {string} endpoint - API path (e.g. '/gacha/roll')
 * @param {object} options - fetch options
 * @returns {Promise<any>}
 */
export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // TODO: Tự động attach AccessToken từ store
  // const token = useStore.getState().accessToken;
  // if (token) config.headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, config);
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// ═══ Gacha API ═══
export const gachaApi = {
  roll: () => apiCall('/gacha/roll', { method: 'POST' }),
};

// ═══ Economy API ═══
export const economyApi = {
  getBalance: () => apiCall('/economy/balance'),
  syncGameResult: (data) => apiCall('/economy/sync', { method: 'POST', body: JSON.stringify(data) }),
};

// ═══ Social API ═══
export const socialApi = {
  getFriends: () => apiCall('/social/friends'),
  addFriend: (userId) => apiCall('/social/friends', { method: 'POST', body: JSON.stringify({ userId }) }),
  getLeaderboard: (gameId) => apiCall(`/social/leaderboard/${gameId}`),
};

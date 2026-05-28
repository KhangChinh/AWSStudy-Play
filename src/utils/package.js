/**
 * Package Utilities — Các hàm tiện ích dùng chung
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

//api caller
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  const response = await fetch(url, config);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};


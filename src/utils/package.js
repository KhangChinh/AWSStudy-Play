import { checkLoginStatus as checkLogin } from '../services/authService';

export { apiCall, API_BASE_URL } from './api';

export const checkLoginStatus = checkLogin;

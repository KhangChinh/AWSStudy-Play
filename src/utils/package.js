/**
 * package.js - Tiện ích gọi API và quản lý login dùng chung
 */
import { getValidAccessToken } from '../services/tokenService';
import { checkLoginStatus as checkLogin } from '../services/userService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiCall = async (endpoint, options = {}) => {
  // Guard: Kiểm tra cấu hình URL
  if (!API_BASE_URL) {
    throw new Error('API_NOT_CONFIGURED');
  }

  const url = `${API_BASE_URL}${endpoint}`;

  // Lấy token hợp lệ (kiểm tra hạn dưới 5 phút, tự động refresh hoặc forced logout nếu hết hạn)
  let token = await getValidAccessToken();

  // Danh sách các endpoint không cần xác thực
  const publicEndpoints = ['/login', '/register', '/public'];
  const isPublicEndpoint = publicEndpoints.some(p => endpoint.includes(p));

  // Nếu thiếu token nhưng không phải public endpoint, thử lấy lại token 1 lần cuối
  if (!token && !isPublicEndpoint) {
    const loginResult = await checkLogin();
    if (loginResult.status) {
      token = loginResult.userProfile?.token;
    }
  }

  // Chặn ngay nếu API cần quyền mà user không có token sau khi đã thử lấy lại
  if (!token && !isPublicEndpoint) {
    console.error(`Bị chặn gọi API ${endpoint}: Thiếu Token xác thực.`);
    throw new Error('UNAUTHORIZED: Yêu cầu đăng nhập trước khi gọi API này');
  }

  // Cấu hình request header
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  // Gửi request
  const response = await fetch(url, config);

  // Xử lý lỗi HTTP (4xx, 5xx)
  if (!response.ok) {
    let errorMsg = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && (errorData.message || errorData.error)) {
        errorMsg = errorData.message || errorData.error;
      }
    } catch (e) {
      // Body not JSON
    }
    throw new Error(errorMsg);
  }

  // Chặn trường hợp backend trả về HTML thay vì JSON
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API returned non-JSON response (${contentType})`);
  }

  return response.json();
};

const checkLoginStatus = checkLogin;


export {
  apiCall,
  checkLoginStatus,
};

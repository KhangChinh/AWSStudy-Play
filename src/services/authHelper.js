import { getValidAccessToken } from './tokenService';

/**
 * Lấy Token hợp lệ (ủy quyền qua getValidAccessToken để kiểm tra thời hạn dưới 5 phút)
 */
async function getValidIdToken() {
  return getValidAccessToken();
}


export {
  getValidIdToken,
};
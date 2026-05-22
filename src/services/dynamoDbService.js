/**
 * DynamoDB Service — Gọi Electron IPC cho DynamoDB
 * React <-> Main Process (Node.js) qua window.api
 * 
 * Giống pattern của authServices.js
 * KHÔNG gọi AWS SDK trực tiếp từ đây — mọi thứ đi qua IPC
 */

export const saveUserToDb = async (userId, email, name) => {
  try {
    const response = await window.api.invoke('db:saveUser', { userId, email, name });
    return response;
  } catch (e) {
    console.error('Error saving user to DynamoDB:', e);
    return { success: false, error: e.message };
  }
};

export const getUserFromDb = async (userId) => {
  try {
    const response = await window.api.invoke('db:getUser', userId);
    return response;
  } catch (e) {
    console.error('Error getting user from DynamoDB:', e);
    return { success: false, error: e.message };
  }
};

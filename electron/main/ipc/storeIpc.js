import Store from 'electron-store';
import { safeStorage, app } from 'electron';
const storeOptions = {};
const locate = process.env.VITE_STORAGE_LOCATE;
if (locate && locate !== 'DEFAULT') {
  storeOptions.cwd = locate;
}
const store = new Store(storeOptions);
function encryptSafeStorage(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(text);
      return buffer.toString('hex');
    }
  } catch (err) {
    console.error('[storeIpc] safeStorage encryption failed, falling back to Base64:', err);
  }
  return Buffer.from(text, 'utf-8').toString('base64');
}
function decryptSafeStorage(encryptedStr) {
  if (!encryptedStr) return null;
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encryptedStr, 'hex');
      const decryptedText = safeStorage.decryptString(buffer);
      try {
        return JSON.parse(decryptedText);
      } catch {
        return decryptedText;
      }
    }
  } catch (err) {
    // Attempt fallback decode if it was stored as base64 or safeStorage failed
  }
  try {
    const decryptedText = Buffer.from(encryptedStr, 'base64').toString('utf-8');
    try {
      return JSON.parse(decryptedText);
    } catch {
      return decryptedText;
    }
  } catch (err) {
    console.error('[storeIpc] Decryption failed:', err);
    return encryptedStr;
  }
}
function encodeBase64(data) {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  return Buffer.from(json, 'utf-8').toString('base64');
}
function decodeBase64(base64String) {
  if (!base64String) return null;
  try {
    const json = Buffer.from(base64String, 'base64').toString('utf-8');
    try {
      return JSON.parse(json);
    } catch {
      return json;
    }
  } catch (err) {
    console.error('[storeIpc] Base64 decode failed:', err);
    return null;
  }
}
export function registerStoreIPC(ipcMain) {
  // ═══ Profile ═══
  ipcMain.handle('store:saveProfile', async (_event, profile) => {
    try {
      const encrypted = encryptSafeStorage(profile);
      store.set('userProfile', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveProfile failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadProfile', async () => {
    try {
      const encrypted = store.get('userProfile');
      if (!encrypted) return null;
      return decryptSafeStorage(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadProfile failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearProfile', async () => {
    try {
      store.delete('userProfile');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearProfile failed:', err);
      return { success: false, error: err.message };
    }
  });
  // ═══ Inventory ═══
  ipcMain.handle('store:saveInventory', async (_event, payload) => {
    try {
      let finalInventory = payload.inventory;
      if (payload.isAppend) {
        const existingEncrypted = store.get('userInventory');
        if (existingEncrypted) {
          const existingData = decodeBase64(existingEncrypted);
          if (existingData && Array.isArray(existingData.inventory)) {
            finalInventory = [...existingData.inventory, ...payload.inventory];
          }
        }
      }
      const dataToSave = {
        inventory: finalInventory,
        lastEvaluatedKey: payload.lastEvaluatedKey
      };
      const encrypted = encodeBase64(dataToSave);
      store.set('userInventory', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveInventory failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadInventory', async () => {
    try {
      const encrypted = store.get('userInventory');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadInventory failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearInventory', async () => {
    try {
      store.delete('userInventory');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearInventory failed:', err);
      return { success: false, error: err.message };
    }
  });
  // ═══ Gacha History ═══
  ipcMain.handle('store:saveGachaHistory', async (_event, payload) => {
    try {
      let finalGachaHistory = payload.gachaHistory;
      if (payload.isAppend) {
        const existingEncrypted = store.get('userGachaHistory');
        if (existingEncrypted) {
          const existingData = decodeBase64(existingEncrypted);
          if (existingData && Array.isArray(existingData.gachaHistory)) {
            finalGachaHistory = [...existingData.gachaHistory, ...payload.gachaHistory];
          }
        }
      }
      const dataToSave = {
        gachaHistory: finalGachaHistory,
        lastEvaluatedKey: payload.lastEvaluatedKey
      };
      const encrypted = encodeBase64(dataToSave);
      store.set('userGachaHistory', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveGachaHistory failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadGachaHistory', async () => {
    try {
      const encrypted = store.get('userGachaHistory');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadGachaHistory failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearGachaHistory', async () => {
    try {
      store.delete('userGachaHistory');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearGachaHistory failed:', err);
      return { success: false, error: err.message };
    }
  });
  // ═══ Friends ═══
  ipcMain.handle('store:saveFriends', async (_event, payload) => {
    try {
      let finalFriends = payload.friends;

      if (payload.isAppend) {
        const existingEncrypted = store.get('userFriends');
        if (existingEncrypted) {
          const existingData = decodeBase64(existingEncrypted);
          if (existingData && Array.isArray(existingData.friends)) {
            finalFriends = [...existingData.friends, ...payload.friends];
          }
        }
      }
      const dataToSave = {
        friends: finalFriends,
        lastEvaluatedKey: payload.lastEvaluatedKey
      };
      const encrypted = encodeBase64(dataToSave);
      store.set('userFriends', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveFriends failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadFriends', async () => {
    try {
      const encrypted = store.get('userFriends');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadFriends failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearFriends', async () => {
    try {
      store.delete('userFriends');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearFriends failed:', err);
      return { success: false, error: err.message };
    }
  });
  // ═══ Daily Quests ═══
  ipcMain.handle('store:saveDaily', async (_event, daily) => {
    try {
      const encrypted = encryptSafeStorage(daily);
      store.set('userDaily', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveDaily failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadDaily', async () => {
    try {
      const encrypted = store.get('userDaily');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadDaily failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearDaily', async () => {
    try {
      store.delete('userDaily');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearDaily failed:', err);
      return { success: false, error: err.message };
    }
  });
  // ═══ Clear on logout user ═══
  ipcMain.handle('store:clearLoginData', async () => {
    try {
      store.delete('userProfile');
      store.delete('userInventory');
      store.delete('userGachaHistory');
      store.delete('userFriends');
      store.delete('userDaily');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearLoginData failed:', err);
      return { success: false, error: err.message };
    }
  });
}

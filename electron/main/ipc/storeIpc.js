import { safeStorage, app, ipcMain } from 'electron';
import { saveStudySettings } from '../services/studyPlannerStore.js';
import { sharedStore as store, getAiSettingsFromStore } from '../services/sharedStore.js';
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
      const { itemType, inventory: newItems, lastEvaluatedKey, isAppend } = payload;
      if (!itemType) throw new Error("Missing itemType in saveInventory");
      const existingEncrypted = store.get('userInventory');
      let inventoryData = existingEncrypted ? decodeBase64(existingEncrypted) : {};
      if (!inventoryData || typeof inventoryData !== 'object') inventoryData = {};
      if (!inventoryData[itemType]) {
        inventoryData[itemType] = { items: [], lastEvaluatedKey: null };
      }
      let finalInventory = newItems;
      if (isAppend) {
        finalInventory = [...inventoryData[itemType].items, ...newItems];
      }
      inventoryData[itemType] = {
        items: finalInventory,
        lastEvaluatedKey: lastEvaluatedKey
      };
      const encrypted = encodeBase64(inventoryData);
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
  // ═══ Master Data (Item Catalog) ═══
  ipcMain.handle('store:saveMasterData', async (_event, items) => {
    try {
      const encrypted = encodeBase64(items);
      store.set('masterItemData', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveMasterData failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadMasterData', async () => {
    try {
      const encrypted = store.get('masterItemData');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadMasterData failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearMasterData', async () => {
    try {
      store.delete('masterItemData');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearMasterData failed:', err);
      return { success: false, error: err.message };
    }
  });
  // Shop cache is user-scoped because activeItems contains isOwned flags.
  ipcMain.handle('store:saveShop', async (_event, shopData) => {
    try {
      store.set('userShop', encodeBase64(shopData));
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveShop failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadShop', async () => {
    try {
      const encrypted = store.get('userShop');
      return encrypted ? decodeBase64(encrypted) : null;
    } catch (err) {
      console.error('[storeIpc] store:loadShop failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearShop', async () => {
    try {
      store.delete('userShop');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearShop failed:', err);
      return { success: false, error: err.message };
    }
  });
  // App data version is not user-scoped and survives logout.
  ipcMain.handle('store:saveVersion', async (_event, versionData) => {
    try {
      store.set('appDataVersion', encodeBase64(versionData));
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveVersion failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadVersion', async () => {
    try {
      const encoded = store.get('appDataVersion');
      return encoded ? decodeBase64(encoded) : null;
    } catch (err) {
      console.error('[storeIpc] store:loadVersion failed:', err);
      return null;
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
  // ═══ Sudoku Levels ═══
  ipcMain.handle('store:saveSudokuLevels', async (_event, payload) => {
    try {
      let finalSudokuLevels = payload.sudokuLevels;
      if (payload.isAppend) {
        const existingEncrypted = store.get('userSudokuLevels');
        if (existingEncrypted) {
          const existingData = decodeBase64(existingEncrypted);
          if (existingData && Array.isArray(existingData.sudokuLevels)) {
            finalSudokuLevels = [...existingData.sudokuLevels, ...payload.sudokuLevels];
          }
        }
      }
      const dataToSave = {
        sudokuLevels: finalSudokuLevels,
        lastEvaluatedKey: payload.lastEvaluatedKey
      };
      const encrypted = encodeBase64(dataToSave);
      store.set('userSudokuLevels', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveSudokuLevels failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadSudokuLevels', async () => {
    try {
      const encrypted = store.get('userSudokuLevels');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadSudokuLevels failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearSudokuLevels', async () => {
    try {
      store.delete('userSudokuLevels');
      store.delete('userShop');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearSudokuLevels failed:', err);
      return { success: false, error: err.message };
    }
  });
  // ═══ Minesweeper Levels ═══
  ipcMain.handle('store:saveMinesweeperLevels', async (_event, payload) => {
    try {
      let finalMinesweeperLevels = payload.minesweeperLevels;
      if (payload.isAppend) {
        const existingEncrypted = store.get('userMinesweeperLevels');

        if (existingEncrypted) {
          const existingData = decodeBase64(existingEncrypted);
          if (existingData && Array.isArray(existingData.minesweeperLevels)) {
            finalMinesweeperLevels = [...existingData.minesweeperLevels, ...payload.minesweeperLevels];
          }
        }
      }
      const dataToSave = {
        minesweeperLevels: finalMinesweeperLevels,
        lastEvaluatedKey: payload.lastEvaluatedKey
      };
      const encrypted = encodeBase64(dataToSave);
      store.set('userMinesweeperLevels', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveMinesweeperLevels failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadMinesweeperLevels', async () => {
    try {
      const encrypted = store.get('userMinesweeperLevels');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadMinesweeperLevels failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearMinesweeperLevels', async () => {
    try {
      store.delete('userMinesweeperLevels');
      store.delete('userShop');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearMinesweeperLevels failed:', err);
      return { success: false, error: err.message };
    }
  });
  // ═══ Social ═══
  ipcMain.handle('store:saveSocial', async (_event, payload) => {
    try {
      let finalSocial = payload.social;
      if (payload.isAppend) {
        const existingEncrypted = store.get('userSocial');
        if (existingEncrypted) {
          const existingData = decodeBase64(existingEncrypted);
          if (existingData && Array.isArray(existingData.social)) {
            finalSocial = [...existingData.social, ...payload.social];
          }
        }
      }
      const dataToSave = {
        social: finalSocial,
        lastEvaluatedKey: payload.lastEvaluatedKey
      };
      const encrypted = encodeBase64(dataToSave);
      store.set('userSocial', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveSocial failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadSocial', async () => {
    try {
      const encrypted = store.get('userSocial');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadSocial failed:', err);
      return null;
    }
  });
  ipcMain.handle('store:clearSocial', async () => {
    try {
      store.delete('userSocial');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearSocial failed:', err);
      return { success: false, error: err.message };
    }
  });
  // ═══ Daily Quests ═══
  ipcMain.handle('store:saveDaily', async (_event, daily) => {
    try {
      const encrypted = encodeBase64(daily);
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
  // ═══ Quests Alias ═══
  ipcMain.handle('quest:save', async (_event, daily) => {
    try {
      const encrypted = encodeBase64(daily);
      store.set('userDaily', encrypted);
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] quest:save failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('quest:load', async () => {
    try {
      const encrypted = store.get('userDaily');
      if (!encrypted) return null;
      const decoded = decodeBase64(encrypted);
      return { success: true, data: decoded };
    } catch (err) {
      console.error('[storeIpc] quest:load failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('quest:clear', async () => {
    try {
      store.delete('userDaily');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] quest:clear failed:', err);
      return { success: false, error: err.message };
    }
  });

  // ═══ AI Settings ═══
  ipcMain.handle('store:saveAiSettings', async (_event, settings) => {
    try {
      console.log('\n[Settings] 💾 Đang lưu AI Settings...');
      if (settings) {
        if (settings.faceTracking) {
          console.log(`  - FaceTracking: ${settings.faceTracking.provider} (Model: ${settings.faceTracking.selectedModel || 'N/A'})`);
        }
        if (settings.blocker) {
          console.log(`  - YouTube Blocker: ${settings.blocker.provider} (Model: ${settings.blocker.selectedModel || 'N/A'})`);
        }
        if (settings.studyPlanner) {
          const sp = settings.studyPlanner;
          const modelName = sp.provider === 'bedrock' ? (sp.bedrockModel || process.env.BEDROCK_MODEL || 'amazon.nova-micro-v1:0') : sp.selectedModel;
          console.log(`  - StudyPlanner: ${sp.provider} (Model: ${modelName || 'N/A'})`);
        }
      }

      const encrypted = encodeBase64(settings);
      store.set('aiSettings', encrypted);

      // Also sync to studyPlannerStore so backend services get the updated config immediately
      if (settings && settings.studyPlanner) {
        const studyConfig = {
          aiProvider: settings.studyPlanner.provider || 'bedrock',
          selectedModel: settings.studyPlanner.selectedModel || '',
          geminiKey: settings.studyPlanner.apiKey || ''
        };
        saveStudySettings(studyConfig);
      }

      console.log('[Settings] ✅ Lưu AI Settings thành công!\n');
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:saveAiSettings failed:', err);
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle('store:loadAiSettings', async () => {
    try {
      const encrypted = store.get('aiSettings');
      if (!encrypted) return null;
      return decodeBase64(encrypted);
    } catch (err) {
      console.error('[storeIpc] store:loadAiSettings failed:', err);
      return null;
    }
  });

  // ═══ Clear on logout user ═══
  ipcMain.handle('store:clearLoginData', async () => {
    try {
      store.delete('userProfile');
      store.delete('userInventory');
      store.delete('userGachaHistory');
      store.delete('userSocial');
      store.delete('userDaily');
      store.delete('userSudokuLevels');
      // Do NOT delete aiSettings on logout so they persist across users/sessions
      return { success: true };
    } catch (err) {
      console.error('[storeIpc] store:clearLoginData failed:', err);
      return { success: false, error: err.message };
    }
  });
}

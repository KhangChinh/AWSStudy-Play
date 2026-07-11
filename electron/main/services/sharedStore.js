/**
 * sharedStore.js — Singleton Electron Store used across all backend services.
 * Prevents circular dependency between storeIpc.js and aiGuard.js.
 */
import Store from 'electron-store';

const storeOptions = {};
const locate = process.env.VITE_STORAGE_LOCATE;
if (locate && locate !== 'DEFAULT') {
  storeOptions.cwd = locate;
}

export const sharedStore = new Store(storeOptions);

/**
 * Read and decode AI Settings from the shared store.
 * @returns {object|null} The full aiSettings object or null if not set.
 */
export function getAiSettingsFromStore() {
  try {
    const encrypted = sharedStore.get('aiSettings');
    if (!encrypted) return null;
    const json = Buffer.from(encrypted, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

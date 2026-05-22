/**
 * Focus Services — Gọi Electron IPC cho Focus Engine
 * React <-> Local Node.js (Gọi Máy tính) qua window.api
 */

export const handleStartFocusApi = async (data) => {
  try {
    const response = await window.api.invoke('focus:start', data);
    return response;
  } catch (e) {
    console.log('Error starting focus:', e);
    return { success: false, error: e.message };
  }
};

export const handleStopFocusApi = async () => {
  try {
    const response = await window.api.invoke('focus:stop');
    return response;
  } catch (e) {
    console.log('Error stopping focus:', e);
    return { success: false, error: e.message };
  }
};

export const handleGetFocusStatusApi = async () => {
  try {
    const response = await window.api.invoke('focus:status');
    return response;
  } catch (e) {
    console.log('Error getting focus status:', e);
    return { isActive: false, error: e.message };
  }
};

export const handleClassifyContentApi = async (content) => {
  try {
    const response = await window.api.invoke('ai:classify', content);
    return response;
  } catch (e) {
    console.log('Error classifying content:', e);
    return { isDistracting: false, error: e.message };
  }
};

export const handleClearAiCacheApi = async () => {
  try {
    const response = await window.api.invoke('ai:clearCache');
    return response;
  } catch (e) {
    console.log('Error clearing AI cache:', e);
    return { success: false, error: e.message };
  }
};

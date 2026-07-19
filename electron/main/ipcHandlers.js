/**
 * IPC Handlers — Đón tín hiệu IPC từ React (Renderer Process)
 *
 * Quy ước channel naming:
 *   - focus:*       → Focus Engine
 *   - ai:*          → AI Guard
 *   - secureStore:* → Secure Store (tokens + timestamp, mã hóa safeStorage)
 *   - setup:*       → Setup Wizard
 */

import { app } from 'electron';

import { startFocus, stopFocus, getSessionStatus, setFocusWin, setUserId, setAuthToken } from './services/focusEngine.js';
import { classifyContent, clearCache, getAiStatus, getAllowedCategories, saveAllowedCategories, getGroqKey, saveGroqKey, setBlockerModel } from './services/aiGuard.js';
import { setApiUrl } from './services/sessionApi.js';
import { chatWithAI, generateStudyPlan, generateQuiz, summarizeDocument } from './services/aiStudyService.js';
import { parseFile } from './services/fileParser.js';
import { setDocument, clearDocument, getDocumentInfo } from './services/documentContext.js';
import { 
  loadChatHistory, saveChatSession, deleteChatSession, 
  loadStudyPlans, saveStudyPlan, deleteStudyPlan, 
  loadQuizHistory, saveQuizResult, deleteQuizResult, 
  loadStudySettings, saveStudySettings 
} from './services/studyPlannerStore.js';
import { setCognitoCredentials } from './services/bedrockApi.js';

export function registerIpcHandlers(ipcMain, win) {
  // Set BrowserWindow reference for focusEngine renderer communication
  setFocusWin(win);

  ipcMain.handle('aws:setCredentials', async (_event, creds) => {
    setCognitoCredentials(creds);
    console.log('[AWS] Received temporary Cognito credentials from renderer');
    return { success: true };
  });

  // ═══════════════════════════════════════════
  //  FOCUS ENGINE — Giám sát & chặn ứng dụng
  // ═══════════════════════════════════════════
  ipcMain.handle('focus:start', async (_event, data) => {
    // Log face tracking model on start
    console.log('[FocusEngine] 📷 Face Tracking → Model: MediaPipe BlazeFace Short-Range (TFLite, local)');
    // Apply AI Blocker model from settings if provided
    if (data?.blockerModel) {
      setBlockerModel(data.blockerModel);
    }
    return startFocus(data);
  });

  ipcMain.handle('focus:stop', async () => {
    return stopFocus();
  });

  ipcMain.handle('focus:status', async () => {
    return getSessionStatus();
  });

  // ═══════════════════════════════════════════
  //  AI GUARD — Phân loại nội dung
  // ═══════════════════════════════════════════
  ipcMain.handle('ai:classify', async (_event, content) => {
    return classifyContent(content);
  });

  ipcMain.handle('ai:clearCache', async () => {
    return clearCache();
  });

  // ═══════════════════════════════════════════
  //  FOCUS CONFIG — Token + API URL (gọi 1 lần sau login)
  // ═══════════════════════════════════════════
  ipcMain.handle('focus:setConfig', async (_event, { token, apiUrl }) => {
    if (token) setAuthToken(token);
    if (apiUrl) setApiUrl(apiUrl);
    return { success: true };
  });

  // ═══════════════════════════════════════════
  //  AI STATUS & SETTINGS
  // ═══════════════════════════════════════════
  ipcMain.handle('ai:status', async () => {
    return getAiStatus();
  });

  ipcMain.handle('ai:saveGroqKey', async (_event, key) => {
    saveGroqKey(key);
    return { success: true };
  });

  ipcMain.handle('ai:getGroqKey', async () => {
    return getGroqKey();
  });

  ipcMain.handle('ai:getAllowedCategories', async () => {
    return getAllowedCategories();
  });

  ipcMain.handle('ai:saveAllowedCategories', async (_event, cats) => {
    saveAllowedCategories(cats);
    return { success: true };
  });

  // ═══════════════════════════════════════════
  //  SETUP WIZARD — Extension installation helpers
  // ═══════════════════════════════════════════
  ipcMain.handle('setup:openExtensionFolder', async () => {
    const path = await import('path');
    const fs = await import('fs');
    const { exec } = await import('child_process');

    // Resolve extension folder path (dev vs packaged)
    const appPath = app.getAppPath();
    let extPath = path.default.join(appPath, '..', '..', 'browser-extension');
    if (!fs.default.existsSync(extPath)) {
      extPath = path.default.join(appPath, 'browser-extension');
    }
    if (!fs.default.existsSync(extPath)) {
      extPath = path.default.join(process.cwd(), 'browser-extension');
    }

    if (!fs.default.existsSync(extPath)) {
      return { success: false, error: 'Extension folder not found' };
    }

    // Step 1: Mở Explorer, highlight thư mục browser-extension
    exec(`explorer.exe /select,"${extPath}"`);

    // Step 2: Sau 900ms ghi file .ps1 tạm rồi chạy để resize cửa sổ Explorer về top-right
    const os = await import('os');
    const tmpPs1 = path.default.join(os.default.tmpdir(), `_resize_explorer_${Date.now()}.ps1`);
    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -Name WinUtil -Namespace Ext -MemberDefinition @'
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int ht, uint f);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  public delegate bool EnumWindowsProc(IntPtr h, IntPtr lp);
'@
$sc = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$W = 430; $H = 390; $X = $sc.Width - $W - 12; $Y = 12
[Ext.WinUtil]::EnumWindows([Ext.WinUtil+EnumWindowsProc]{
  param($h, $l)
  $sb = New-Object System.Text.StringBuilder 64
  [Ext.WinUtil]::GetClassName($h, $sb, 64) | Out-Null
  if ($sb.ToString() -eq "CabinetWClass" -and [Ext.WinUtil]::IsWindowVisible($h)) {
    [Ext.WinUtil]::ShowWindow($h, 9) | Out-Null
    [Ext.WinUtil]::SetWindowPos($h, [IntPtr]::Zero, $X, $Y, $W, $H, 0x40) | Out-Null
    return $false
  }
  return $true
}, [IntPtr]::Zero) | Out-Null
`;

    fs.default.writeFileSync(tmpPs1, psScript, 'utf8');
    setTimeout(() => {
      exec(`powershell -NonInteractive -WindowStyle Hidden -File "${tmpPs1}"`, (err) => {
        // Xóa file tạm sau khi chạy xong
        try { fs.default.unlinkSync(tmpPs1); } catch {}
        if (err) console.warn('[Setup] Explorer resize failed (non-critical):', err.message?.substring(0, 80));
      });
    }, 900);

    return { success: true, path: extPath };
  });

  ipcMain.handle('setup:openBrowserExtPage', async (_event, browserId) => {
    const { exec } = await import('child_process');
    const cmds = {
      chrome:  `powershell -WindowStyle Hidden -Command "try { Start-Process chrome } catch {}"`,
      edge:    `powershell -WindowStyle Hidden -Command "try { Start-Process msedge } catch {}"`,
      brave:   `powershell -WindowStyle Hidden -Command "try { Start-Process brave } catch {}"`,
      opera:   `powershell -WindowStyle Hidden -Command "try { Start-Process opera -ErrorAction Stop } catch { try { Start-Process operagx -ErrorAction Stop } catch { try { Start-Process launcher -ErrorAction Stop } catch {} } }"`,
      firefox: `powershell -WindowStyle Hidden -Command "try { Start-Process firefox } catch {}"`,
    };
    const cmd = cmds[browserId?.toLowerCase()] || cmds.chrome;
    
    // Thực thi lệnh ngầm để mở browser, nếu máy không có thì tự fail im lặng, không văng popup lỗi
    exec(cmd, (err) => {
      if (err) console.warn('[Setup] Could not open browser:', err.message);
    });
    
    return { success: true };
  });
  // ═══════════════════════════════════════════
  //  STUDY PLANNER — File Context
  // ═══════════════════════════════════════════
  ipcMain.handle('study:uploadFile', async (_event, { filePath }) => {
    try {
      // 1. Đọc và chia nhỏ file
      const doc = await parseFile(filePath);
      
      // 2. Tạo summary — chỉ lấy 5 chunks đầu để tránh tràn context Ollama
      const summaryChunks = doc.chunks.slice(0, 5);
      const summaryResult = await summarizeDocument(summaryChunks);
      
      // 3. Nếu AI tóm tắt thất bại → dùng fallback thay vì block upload
      let summary, topics;
      if (summaryResult.success && summaryResult.summary) {
        summary = summaryResult.summary;
        topics = summaryResult.topics;
      } else {
        console.warn('[StudyFile] Không thể tạo AI summary, dùng fallback từ cấu trúc file.');
        summary = `Tài liệu "${doc.fileName}" (${doc.pageCount} trang, ${doc.wordCount} từ). Nội dung được chia thành ${doc.chunks.length} phần.`;
        topics = [...new Set(doc.chunks.slice(0, 8).map(c => c.section).filter(Boolean))];
      }

      // 4. Lưu vào session context
      setDocument({ ...doc, summary, topics });

      return { success: true, info: getDocumentInfo() };
    } catch (error) {
      console.error('[StudyFile] Lỗi upload file:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('study:removeFile', async () => {
    clearDocument();
    return { success: true };
  });

  ipcMain.handle('study:getFileStatus', async () => {
    const info = getDocumentInfo();
    return { success: true, info };
  });

  // ═══════════════════════════════════════════
  //  STUDY PLANNER — AI Chat, Plans, Quizzes
  // ═══════════════════════════════════════════
  ipcMain.handle('study:chat', async (_event, { messages }) => {
    return chatWithAI(messages);
  });

  ipcMain.handle('study:generatePlan', async (_event, { collectedInfo }) => {
    return generateStudyPlan(collectedInfo);
  });

  ipcMain.handle('study:generateQuiz', async (_event, { phase, planTitle }) => {
    return generateQuiz(phase, planTitle);
  });

  ipcMain.handle('study:loadChats', async () => loadChatHistory());
  ipcMain.handle('study:saveChat', async (_event, session) => saveChatSession(session));
  ipcMain.handle('study:deleteChat', async (_event, chatId) => deleteChatSession(chatId));

  ipcMain.handle('study:loadPlans', async () => loadStudyPlans());
  ipcMain.handle('study:savePlan', async (_event, plan) => saveStudyPlan(plan));
  ipcMain.handle('study:deletePlan', async (_event, planId) => deleteStudyPlan(planId));

  ipcMain.handle('study:loadQuizzes', async () => loadQuizHistory());
  ipcMain.handle('study:saveQuiz', async (_event, quiz) => saveQuizResult(quiz));
  ipcMain.handle('study:deleteQuiz', async (_event, quizId) => deleteQuizResult(quizId));

  ipcMain.handle('study:loadSettings', async () => loadStudySettings());
  ipcMain.handle('study:saveSettings', async (_event, settings) => saveStudySettings(settings));

  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const { dialog } = await import('electron');
    return dialog.showOpenDialog(options);
  });
}

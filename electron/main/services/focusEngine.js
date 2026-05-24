/**
 * Focus Engine — Giám sát & chặn ứng dụng xao nhãng
 * 
 * Lớp 1: Blacklist Cứng — Kill/chặn .exe, domain ngay lập tức
 * Lớp 2: AI Guard — Gửi content cho AI phân loại (xem aiGuard.js)
 * 
 * Xử lý gián đoạn: Lưu StartTime + TargetDuration
 * → Mở lại app sẽ so sánh thời gian thực tế đã trôi qua
 */

let activeSession = null;

/**
 * Bắt đầu Focus Session
 * @param {{ targetMinutes: number, blacklist: string[] }} data
 * @returns {{ success: boolean, sessionId: string }}
 */
//placeholder
export function startFocus(data) {
  const sessionId = `sess_${Date.now()}`;
  activeSession = {
    sessionId,
    startTime: new Date().toISOString(),
    targetMinutes: data.targetMinutes || 60,
    blacklist: data.blacklist || [],
    isActive: true
  };

  // TODO: Bắt đầu polling timer kiểm tra process list
  // TODO: Sửa file hosts để chặn domain
  // TODO: Lưu session vào file local để phục hồi khi crash

  return { success: true, sessionId };
}

/**
 * Dừng Focus Session (Bỏ cuộc)
 * @returns {{ success: boolean, elapsedMinutes: number }}
 */
//placeholder
export function stopFocus() {
  if (!activeSession) {
    return { success: false, error: 'No active session' };
  }

  const elapsed = (Date.now() - new Date(activeSession.startTime).getTime()) / 60000;
  activeSession = null;

  // TODO: Khôi phục file hosts
  // TODO: Dọn dẹp interval/timer

  return { success: true, elapsedMinutes: Math.round(elapsed) };
}

/**
 * Lấy trạng thái session hiện tại (dùng cho auto-resume)
 * @returns {{ isActive: boolean, session?: object }}
 */
export function getSessionStatus() {
  if (!activeSession) {
    return { isActive: false };
  }

  const elapsed = (Date.now() - new Date(activeSession.startTime).getTime()) / 60000;
  return {
    isActive: true,
    session: {
      ...activeSession,
      elapsedMinutes: Math.round(elapsed),
      remainingMinutes: Math.max(0, activeSession.targetMinutes - Math.round(elapsed))
    }
  };
}

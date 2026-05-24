/**
 * AI Guard — Giám sát mềm bằng AI (Lớp 2)
 * 
 * Flow: Lấy Window Title / URL → Check Local Cache → Gọi AI nếu chưa có
 * Nếu AI báo "Xao nhãng" → Hiện popup đếm ngược 10s → Force close
 * 
 * Sử dụng Google Gemini 1.5 Flash API
 */

// Local Cache: Map<contentKey, { isDistracting: boolean, timestamp: number }>
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Phân loại nội dung (URL / Window Title)
 * @param {{ url?: string, title?: string }} content
 * @returns {{ isDistracting: boolean, reason: string, cached: boolean }}
 */
//placeholder
export async function classifyContent(content) {
  const key = content.url || content.title || '';
  
  // Kiểm tra cache trước
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.result, cached: true };
  }

  // TODO: Gọi Gemini API để phân loại
  // const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', { ... })
  
  const result = {
    isDistracting: false,
    reason: 'AI classification not yet implemented'
  };

  // Lưu vào cache
  cache.set(key, { result, timestamp: Date.now() });

  return { ...result, cached: false };
}

/**
 * Xóa toàn bộ AI cache
 * @returns {{ success: boolean, clearedCount: number }}
 */
export function clearCache() {
  const count = cache.size;
  cache.clear();
  return { success: true, clearedCount: count };
}

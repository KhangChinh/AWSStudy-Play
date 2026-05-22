/**
 * Database Config — Quản lý tập trung tên bảng DynamoDB
 * 
 * Khi cần thêm bảng mới, chỉ cần thêm 1 dòng ở đây.
 * Tất cả service files đều import từ file này.
 */

// Prefix để phân biệt môi trường (dev/prod) nếu cần sau này
const PREFIX = process.env.DYNAMODB_TABLE_PREFIX || "";

export const TABLES = {
  USER: `${PREFIX}User`,
  // ── Thêm bảng mới ở đây ──────────────
  // SESSIONS:    `${PREFIX}Sessions`,
  // FOCUS_LOGS:  `${PREFIX}FocusLogs`,
  // LEADERBOARD: `${PREFIX}Leaderboard`,
};

/**
 * documentContext.js
 * Quản lý ngữ cảnh tài liệu đang active trong phiên hiện tại (in-memory).
 * Xóa khi app đóng hoặc user upload file mới.
 */

import { searchChunks } from './fileParser.js';

// Singleton session state
let _document = null;

/**
 * Lưu tài liệu đã xử lý vào session
 * @param {Object} doc - { fileName, fileType, chunks, summary, topics, charCount, wordCount, pageCount }
 */
export function setDocument(doc) {
  _document = { ...doc, uploadedAt: new Date().toISOString() };
  console.log(`[DocumentContext] Document set: ${doc.fileName} (${doc.chunks.length} chunks)`);
}

/** Lấy document hiện tại */
export function getDocument() {
  return _document;
}

/** Kiểm tra có document không */
export function hasDocument() {
  return _document !== null;
}

/** Xóa document khỏi session */
export function clearDocument() {
  const name = _document?.fileName || '(none)';
  _document = null;
  console.log(`[DocumentContext] Document cleared: ${name}`);
}

/**
 * Lấy context phù hợp để inject vào prompt AI
 * Trả về: { summaryBlock, chunksBlock, sourceHints }
 * @param {string} query - Câu hỏi / nội dung tin nhắn hiện tại
 */
export function getContextForQuery(query = '') {
  if (!_document) return null;

  const { summary, topics, chunks, fileName } = _document;

  // Tier 1: Summary toàn bộ tài liệu (luôn có)
  const summaryBlock = [
    `--- TÀI LIỆU ĐÍNH KÈM: "${fileName}" ---`,
    `TÓM TẮT TỔNG QUAN:`,
    summary,
    `CÁC CHỦ ĐỀ CHÍNH: ${topics?.join(', ') || 'Chưa xác định'}`,
    `--- HẾT TÓM TẮT ---`,
  ].join('\n');

  // Tier 2: Chunks liên quan đến câu hỏi (nếu có query)
  let chunksBlock = '';
  let sourceHints = [];

  if (query && query.trim().length > 3) {
    const relevant = searchChunks(chunks, query, 3);
    if (relevant.length > 0) {
      sourceHints = relevant.map(c => c.section);
      chunksBlock = [
        `NỘI DUNG LIÊN QUAN TỪ TÀI LIỆU:`,
        ...relevant.map(c =>
          `[Phần: ${c.section}]\n${c.content}`
        ),
        `--- HẾT NỘI DUNG LIÊN QUAN ---`,
      ].join('\n\n');
    }
  }

  return { summaryBlock, chunksBlock, sourceHints };
}

/**
 * Lấy context đầy đủ để tạo Plan (dùng nhiều chunks hơn để bao quát toàn bộ tài liệu)
 */
export function getContextForPlan() {
  if (!_document) return null;

  const { summary, topics, chunks, fileName, pageCount, wordCount } = _document;

  // Lấy tối đa 8 chunks phân bổ đều từ đầu đến cuối tài liệu
  const step = Math.max(1, Math.floor(chunks.length / 8));
  const sampledChunks = [];
  for (let i = 0; i < chunks.length; i += step) {
    sampledChunks.push(chunks[i]);
    if (sampledChunks.length >= 8) break;
  }

  const structureBlock = sampledChunks
    .map(c => `• ${c.section}`)
    .join('\n');

  return {
    fileName,
    summary,
    topics: topics || [],
    structureBlock,
    pageCount,
    wordCount,
  };
}

/**
 * Lấy context cho một phase/chủ đề cụ thể khi tạo Quiz
 * @param {string} phaseName - Tên phase/chương cần tạo quiz
 * @param {string[]} phaseTopics - Các chủ đề của phase
 */
export function getContextForQuiz(phaseName, phaseTopics = []) {
  if (!_document) return null;

  const { chunks, fileName } = _document;

  // Tìm chunks liên quan đến phase này
  const query = [phaseName, ...phaseTopics].join(' ');
  const relevant = searchChunks(chunks, query, 5); // Lấy 5 chunks cho quiz

  if (relevant.length === 0) return null;

  const contentBlock = relevant
    .map(c => `[${c.section}]\n${c.content}`)
    .join('\n\n');

  return {
    fileName,
    phaseName,
    contentBlock,
    sourceChunks: relevant.map(c => c.section),
  };
}

/** Trả về metadata để hiển thị trên UI */
export function getDocumentInfo() {
  if (!_document) return null;
  return {
    fileName: _document.fileName,
    fileType: _document.fileType,
    pageCount: _document.pageCount,
    wordCount: _document.wordCount,
    charCount: _document.charCount,
    chunkCount: _document.chunks?.length || 0,
    uploadedAt: _document.uploadedAt,
    topics: _document.topics || [],
  };
}

/**
 * fileParser.js
 * Đọc và xử lý file PDF, DOCX, TXT thành text + chunks có cấu trúc
 */

import fs from 'fs';
import path from 'path';

// --- PDF Parser ---
let pdfParse = null;
async function getPdfParse() {
  if (!pdfParse) {
    const mod = await import('pdf-parse/lib/pdf-parse.js');
    pdfParse = mod.default || mod;
  }
  return pdfParse;
}

// --- Mammoth (DOCX) ---
let mammoth = null;
async function getMammoth() {
  if (!mammoth) {
    const mod = await import('mammoth');
    mammoth = mod.default || mod;
  }
  return mammoth;
}

// ===== MAX SIZE =====
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

/**
 * parseFile(filePath) → { fileName, fileType, rawText, chunks[], pageCount, charCount }
 */
export async function parseFile(filePath) {
  const stats = fs.statSync(filePath);
  if (stats.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File quá lớn (${(stats.size / 1024 / 1024).toFixed(1)}MB). Tối đa 25MB.`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  let rawText = '';
  let pageCount = 1;

  if (ext === '.pdf') {
    const parser = await getPdfParse();
    const buffer = fs.readFileSync(filePath);
    const data = await parser(buffer);
    rawText = data.text || '';
    pageCount = data.numpages || 1;
  } else if (ext === '.docx' || ext === '.doc') {
    const m = await getMammoth();
    const buffer = fs.readFileSync(filePath);
    const result = await m.extractRawText({ buffer });
    rawText = result.value || '';
  } else if (ext === '.txt') {
    rawText = fs.readFileSync(filePath, 'utf-8');
  } else {
    throw new Error(`Định dạng không hỗ trợ: ${ext}. Chỉ hỗ trợ PDF, DOCX, TXT.`);
  }

  if (!rawText || rawText.trim().length < 50) {
    throw new Error('File không có nội dung text hoặc bị lỗi khi đọc.');
  }

  const cleaned = cleanText(rawText);
  const chunks = buildChunks(cleaned);

  return {
    fileName,
    fileType: ext.slice(1).toUpperCase(),
    rawText: cleaned,
    chunks,
    pageCount,
    charCount: cleaned.length,
    wordCount: cleaned.split(/\s+/).length,
  };
}

// ===== TEXT CLEANING =====
function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Loại bỏ các ký tự điều khiển ngoại trừ \n và \t
    .replace(/[^\S\n\t]/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Thu gọn nhiều dòng trống liên tiếp
    .replace(/\n{3,}/g, '\n\n')
    // Thu gọn nhiều khoảng trắng liên tiếp
    .replace(/ {2,}/g, ' ')
    .trim();
}

// ===== HIERARCHICAL CHUNKING =====
// Phát hiện heading: ALL CAPS dòng ngắn, hoặc dòng bắt đầu bằng số kiểu "1.", "Chương 1", "Chapter 1"
const HEADING_PATTERNS = [
  /^(chương|chapter|phần|part|bài|lesson|mục|section)\s+\d+/i,
  /^\d+[\.\)]\s+[A-ZÀÁẢÃẠĂẮẶẲẴẶÂẤẦẨẪẬ]/,
  /^[IVXLC]+[\.\)]\s+/,
  /^#{1,4}\s+/, // Markdown heading
];

function isHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return false;

  // ALL CAPS ngắn
  if (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-ZÀ-Ỵ]{3,}/.test(trimmed)) return true;

  return HEADING_PATTERNS.some(p => p.test(trimmed));
}

const CHUNK_TARGET_WORDS = 250; // ~1500 ký tự, vừa đủ cho context
const CHUNK_MAX_WORDS = 400;

function buildChunks(text) {
  const lines = text.split('\n');
  const chunks = [];
  let currentSection = 'Mở đầu';
  let currentLines = [];
  let currentWords = 0;

  const flushChunk = () => {
    const content = currentLines.join('\n').trim();
    if (content.length < 30) return; // quá ngắn, bỏ
    chunks.push({
      id: chunks.length,
      section: currentSection,
      content,
      wordCount: content.split(/\s+/).length,
    });
    currentLines = [];
    currentWords = 0;
  };

  for (const line of lines) {
    const words = line.split(/\s+/).length;

    if (isHeading(line)) {
      // Khi gặp heading mới → flush chunk hiện tại, bắt đầu chunk mới
      if (currentLines.length > 0) flushChunk();
      currentSection = line.trim().replace(/^#+\s+/, '');
      currentLines = [line];
      currentWords = words;
    } else {
      currentLines.push(line);
      currentWords += words;

      // Nếu chunk đã đủ lớn → flush
      if (currentWords >= CHUNK_TARGET_WORDS) {
        // Tránh cắt giữa đoạn văn — đợi dòng trống
        if (line.trim() === '' || currentWords >= CHUNK_MAX_WORDS) {
          flushChunk();
          // Giữ lại tên section
          currentLines = [];
          currentWords = 0;
        }
      }
    }
  }
  if (currentLines.length > 0) flushChunk();

  return chunks;
}

// ===== BM25-STYLE KEYWORD SEARCH =====
/**
 * searchChunks(chunks, query, topK) → chunks[] liên quan nhất
 */
export function searchChunks(chunks, query, topK = 3) {
  if (!chunks || chunks.length === 0) return [];
  if (!query || query.trim().length === 0) return chunks.slice(0, topK);

  // Tách keywords từ query
  const keywords = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\W+/)
    .filter(w => w.length > 2);

  if (keywords.length === 0) return chunks.slice(0, topK);

  const scored = chunks.map(chunk => {
    const normalized = (chunk.content + ' ' + chunk.section)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    let score = 0;
    for (const kw of keywords) {
      // Tần suất xuất hiện keyword
      const matches = (normalized.match(new RegExp(kw, 'g')) || []).length;
      // Bonus nếu keyword xuất hiện trong tên section
      const sectionBonus = chunk.section.toLowerCase().includes(kw) ? 3 : 0;
      score += matches + sectionBonus;
    }
    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.chunk);
}

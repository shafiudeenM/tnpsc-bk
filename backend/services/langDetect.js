/**
 * Detects whether a query is English, Tamil script, or Tanglish
 * (Tamil words written in Latin letters).
 *
 * Returns: 'en' | 'ta' | 'tanglish'
 */

// Tamil Unicode block: U+0B80–U+0BFF
const TAMIL_SCRIPT_RE = /[\u0B80-\u0BFF]/;

// Common Tanglish patterns — Tamil words frequently typed in Latin
const TANGLISH_WORDS = new Set([
  'pathi','sollu','solu','enna','epdi','eppadi','yenna','inga','ange',
  'theriyuma','theriyuma','puriyala','purila','sollungo','sollunga',
  'explain','panna','pannu','seyya','seiya','vaanga','vanga','paru',
  'paaru','pakka','iruku','irukku','illai','illa','aam','aama','illama',
  'enga','yenge','ethu','edhu','oru','rendu','moonu','naalu','anju',
  'vatu','vadu','aavadu','வது',
]);

// Ordinal suffixes common in Tanglish: 73vatu, 1st, 2nd etc.
const TANGLISH_ORDINAL_RE = /\d+(vatu|vadu|aavatu|st|nd|rd|th)\b/i;

// Ratio of Latin chars (ignoring digits/spaces) to detect mix
function latinRatio(text) {
  const letters = text.replace(/[\d\s\W]/g, '');
  if (!letters.length) return 0;
  const latin = letters.replace(/[^\u0000-\u007F]/g, '').length;
  return latin / letters.length;
}

export function detectLanguage(text) {
  if (!text || !text.trim()) return 'en';

  // 1. Contains Tamil script → pure Tamil
  if (TAMIL_SCRIPT_RE.test(text)) return 'ta';

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // 2. Any known Tanglish word present
  const hasTanglishWord = words.some(w => TANGLISH_WORDS.has(w));
  if (hasTanglishWord) return 'tanglish';

  // 3. Ordinal pattern like "73vatu"
  if (TANGLISH_ORDINAL_RE.test(text)) return 'tanglish';

  // 4. If mostly Latin, treat as English
  if (latinRatio(text) > 0.85) return 'en';

  return 'en';
}

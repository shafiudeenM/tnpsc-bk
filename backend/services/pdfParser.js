import crypto from 'crypto';

const TARGET_TOKENS = 300;
const MIN_TOKENS    = 50;

function estimateTokens(text) {
  return Math.ceil(text.length / 3.5);
}

function splitSentences(text) {
  return text
    .replace(/\n{2,}/g, ' <PARA> ')
    .split(/(?<=[.!?।\n])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function groupChunks(sentences) {
  const chunks = [];
  let buf = [], count = 0, overlap = [];

  for (const s of sentences) {
    if (s === '<PARA>') {
      if (count >= MIN_TOKENS) {
        chunks.push(buf.join(' '));
        overlap = buf.slice(-3);
      }
      buf = [...overlap];
      count = overlap.reduce((n, x) => n + estimateTokens(x), 0);
      continue;
    }
    buf.push(s);
    count += estimateTokens(s);
    if (count >= TARGET_TOKENS) {
      chunks.push(buf.join(' '));
      overlap = buf.slice(-3);
      buf = [...overlap];
      count = overlap.reduce((n, x) => n + estimateTokens(x), 0);
    }
  }
  if (buf.length && count >= MIN_TOKENS) chunks.push(buf.join(' '));
  return chunks;
}

/**
 * Parse a PDF buffer → array of tagged chunks ready for embedding.
 *
 * meta: { class, subject, chapter, medium ('en'|'ta'), examGroup, sourceFile }
 */
export async function parsePDF(pdfBuffer, meta = {}) {
  const {
    class:      cls        = 'unknown',
    subject                = 'unknown',
    chapter                = 'unknown',
    medium                 = 'en',
    examGroup              = 'all',
    sourceFile             = 'unknown',
  } = meta;

  // Dynamic import — pdf-parse has no named export
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  const parsed   = await pdfParse(pdfBuffer);
  const pages    = parsed.text.split('\f');

  const allChunks = [];

  for (let pi = 0; pi < pages.length; pi++) {
    const pageText = pages[pi].replace(/\s+/g, ' ').trim();
    if (!pageText || estimateTokens(pageText) < MIN_TOKENS) continue;

    const sentences  = splitSentences(pageText);
    const chunkTexts = groupChunks(sentences);

    for (let ci = 0; ci < chunkTexts.length; ci++) {
      const text = chunkTexts[ci].replace(/<PARA>/g, ' ').trim();
      if (!text || estimateTokens(text) < MIN_TOKENS) continue;

      // Qdrant needs a numeric or UUID id — use a hash-based integer
      const hashHex = crypto
        .createHash('sha256')
        .update(`${sourceFile}-p${pi + 1}-c${ci}`)
        .digest('hex');
      const chunkId = parseInt(hashHex.slice(0, 15), 16); // safe uint64

      allChunks.push({
        chunkId,
        text,
        payload: {
          text,
          class:       cls,
          subject,
          chapter,
          page_num:    pi + 1,
          medium,
          exam_group:  examGroup,
          source_file: sourceFile,
        },
      });
    }
  }

  console.log(`  📄 ${sourceFile} (${medium}): ${pages.length} pages → ${allChunks.length} chunks`);
  return allChunks;
}

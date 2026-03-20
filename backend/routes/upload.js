import { Router } from 'express';
import multer       from 'multer';
import { parsePDF }       from '../services/pdfParser.js';
import { embedBatch }     from '../services/embeddings.js';
import { upsertBatch, getChunkCount, initQdrant } from '../services/qdrant.js';

export const uploadRouter = Router();
export const healthRouter  = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('PDF only')),
});

/**
 * POST /api/upload
 * Fields: pdf (file), class, subject, chapter, medium ('en'|'ta'), examGroup
 */
uploadRouter.post('/', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

  const { class: cls = '?', subject = '?', chapter = 'Full Book',
          medium = 'en', examGroup = 'all' } = req.body;

  try {
    const chunks     = await parsePDF(req.file.buffer, {
      class: cls, subject, chapter, medium, examGroup,
      sourceFile: req.file.originalname,
    });

    if (!chunks.length) {
      return res.status(422).json({ error: 'No text found in PDF' });
    }

    const embeddings = await embedBatch(chunks.map(c => c.text));

    const points = chunks.map((c, i) => ({
      id:      c.chunkId,
      vector:  embeddings[i],
      payload: c.payload,
    }));

    await upsertBatch(points);

    res.json({
      message:        `Ingested "${req.file.originalname}"`,
      chunksInserted: chunks.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Health ─────────────────────────────────────────────────────────────────
let ready = false;
healthRouter.get('/', async (req, res) => {
  if (!ready) {
    try { await initQdrant(); ready = true; }
    catch (err) { return res.status(500).json({ status: 'error', message: err.message }); }
  }
  try {
    const count = await getChunkCount();
    res.json({ status: 'ok', chunkCount: count, ts: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

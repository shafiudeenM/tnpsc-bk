import { Router } from 'express';
import { detectLanguage }    from '../services/langDetect.js';
import { normaliseTanglish } from '../services/groq.js';
import { embed }             from '../services/embeddings.js';
import { searchChunks }      from '../services/qdrant.js';
import { generateAnswer }    from '../services/groq.js';
import { logTopicSeen }      from '../services/supabase.js';

export const askRouter = Router();

/**
 * POST /api/ask
 * Body: { question, examGroup?, preferMedium? }
 * Auth: Bearer <supabase_jwt>
 */
askRouter.post('/', async (req, res) => {
  const { question, examGroup = 'all', preferMedium = 'any' } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }
  if (question.length > 1000) {
    return res.status(400).json({ error: 'Question too long (max 1000 chars)' });
  }

  try {
    // ── Step 1: Detect language ──────────────────────────────────────────
    const detectedLang = detectLanguage(question);
    let searchQueries  = [];   // [{ text, medium }]
    let replyLang      = 'en';

    if (detectedLang === 'tanglish') {
      // Normalise → dual search
      const { tamil, english } = await normaliseTanglish(question);
      searchQueries = [
        { text: tamil,   medium: 'ta' },
        { text: english, medium: 'en' },
      ];
      replyLang = 'ta';
    } else if (detectedLang === 'ta') {
      searchQueries = [{ text: question, medium: 'ta' }];
      replyLang = 'ta';
    } else {
      searchQueries = [{ text: question, medium: preferMedium }];
      replyLang = 'en';
    }

    // ── Step 2: Embed + search (parallel for dual queries) ───────────────
    const searchResults = await Promise.all(
      searchQueries.map(async ({ text, medium }) => {
        const vector = await embed(text);
        return searchChunks({
          queryVector: vector,
          filters:     { examGroup, medium },
          topK:        5,
        });
      })
    );

    // Merge + deduplicate by chunkId, keep highest score
    const seen   = new Map();
    const merged = searchResults.flat();
    for (const chunk of merged) {
      const existing = seen.get(chunk.chunkId);
      if (!existing || chunk.score > existing.score) {
        seen.set(chunk.chunkId, chunk);
      }
    }
    const topChunks = [...seen.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // ── Step 3: Generate answer ──────────────────────────────────────────
    const { answer, sources } = await generateAnswer({
      question,
      chunks: topChunks,
      replyLang,
    });

    // ── Step 4: Log progress (fire and forget) ───────────────────────────
    if (topChunks.length > 0) {
      const topChunk = topChunks[0];
      logTopicSeen({
        userId:    req.user.id,
        topic:     topChunk.chapter || topChunk.subject,
        subject:   topChunk.subject,
        examGroup: examGroup === 'all' ? topChunk.exam_group : examGroup,
      }).catch(() => {});
    }

    res.json({
      answer,
      sources,
      detectedLang,
      replyLang,
      chunkCount: topChunks.length,
    });

  } catch (err) {
    console.error('/api/ask error:', err);
    res.status(500).json({ error: err.message || 'Failed to process question' });
  }
});

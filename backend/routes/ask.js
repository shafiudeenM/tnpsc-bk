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
 */
askRouter.post('/', async (req, res) => {
  const { question, examGroup = 'all' } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }
  if (question.length > 1000) {
    return res.status(400).json({ error: 'Question too long (max 1000 chars)' });
  }

  try {
    // ── Step 1: Detect language ──────────────────────────────────────────
    const detectedLang = detectLanguage(question);
    let replyLang = detectedLang === 'ta' || detectedLang === 'tanglish' ? 'ta' : 'en';

    // ── Step 2: Build search queries ─────────────────────────────────────
    let searchQueries = [];

    if (detectedLang === 'tanglish') {
      const { tamil, english } = await normaliseTanglish(question);
      searchQueries = [
        { text: tamil,   medium: 'ta' },
        { text: english, medium: 'en' },
      ];
    } else if (detectedLang === 'ta') {
      searchQueries = [{ text: question, medium: 'ta' }];
    } else {
      // English question — search both mediums, no medium filter
      searchQueries = [{ text: question, medium: 'any' }];
    }

    // ── Step 3: Embed + search ───────────────────────────────────────────
    let topChunks = [];

    const searchResults = await Promise.all(
      searchQueries.map(async ({ text, medium }) => {
        const vector = await embed(text);
        return searchChunks({
          queryVector: vector,
          filters: {
            examGroup,
            // Only filter by medium if strictly ta — for English/any, don't restrict
            medium: medium === 'ta' ? 'ta' : null,
          },
          topK: 5,
        });
      })
    );

    // Merge + deduplicate
    const seen = new Map();
    for (const chunk of searchResults.flat()) {
      const existing = seen.get(chunk.chunkId);
      if (!existing || chunk.score > existing.score) {
        seen.set(chunk.chunkId, chunk);
      }
    }
    topChunks = [...seen.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // ── Step 4: Fallback — if still no results, search with no filters ───
    if (topChunks.length === 0) {
      console.log('No results with filters, trying unfiltered search...');
      const vector = await embed(question);
      topChunks = await searchChunks({
        queryVector: vector,
        filters: {},   // no filters at all
        topK: 5,
      });
    }

    // ── Step 5: Generate answer ──────────────────────────────────────────
    const { answer, sources } = await generateAnswer({
      question,
      chunks: topChunks,
      replyLang,
    });

    // ── Step 6: Log progress ─────────────────────────────────────────────
    if (topChunks.length > 0) {
      logTopicSeen({
        userId:    req.user.id,
        topic:     topChunks[0].chapter || topChunks[0].subject,
        subject:   topChunks[0].subject,
        examGroup: examGroup === 'all' ? topChunks[0].exam_group : examGroup,
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

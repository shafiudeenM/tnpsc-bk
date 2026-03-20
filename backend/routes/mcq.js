import { Router } from 'express';
import { embed }            from '../services/embeddings.js';
import { searchChunks }     from '../services/qdrant.js';
import { generateMCQs }     from '../services/groq.js';
import { saveMCQAttempt, getMCQHistory } from '../services/supabase.js';

export const mcqRouter = Router();

/**
 * POST /api/mcq/generate
 * Body: { topic, examGroup?, lang? }
 * Generates 5 MCQs from textbook content for a given syllabus topic.
 */
mcqRouter.post('/generate', async (req, res) => {
  const { topic, examGroup = 'all', lang = 'en' } = req.body;

  if (!topic?.trim()) {
    return res.status(400).json({ error: 'topic is required' });
  }

  try {
    const vector = await embed(topic);
    const chunks = await searchChunks({
      queryVector: vector,
      filters:     { examGroup },
      topK:        6,
    });

    if (!chunks.length) {
      return res.status(404).json({ error: 'No textbook content found for this topic' });
    }

    const mcqs = await generateMCQs({ topic, chunks, lang });

    if (!mcqs.length) {
      return res.status(500).json({ error: 'Could not generate questions' });
    }

    res.json({ topic, mcqs, chunkCount: chunks.length });

  } catch (err) {
    console.error('/api/mcq/generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/mcq/submit
 * Body: { topic, examGroup, questions, score }
 * Saves the MCQ attempt to Supabase for history tracking.
 */
mcqRouter.post('/submit', async (req, res) => {
  const { topic, examGroup = 'all', questions, score } = req.body;

  if (!topic || score === undefined) {
    return res.status(400).json({ error: 'topic and score are required' });
  }

  try {
    await saveMCQAttempt({
      userId:    req.user.id,
      topic,
      examGroup,
      questions,
      score,
    });
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/mcq/history
 * Returns the user's MCQ attempt history.
 */
mcqRouter.get('/history', async (req, res) => {
  try {
    const history = await getMCQHistory(req.user.id);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

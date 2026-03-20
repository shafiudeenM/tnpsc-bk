import { Router } from 'express';
import { getUserProgress, getSyllabusTopics } from '../services/supabase.js';

export const progressRouter = Router();

/**
 * GET /api/progress?examGroup=group2
 * Returns syllabus topics + which ones the user has seen.
 */
progressRouter.get('/', async (req, res) => {
  const { examGroup = 'all' } = req.query;

  try {
    const [allTopics, seenTopics] = await Promise.all([
      getSyllabusTopics(examGroup),
      getUserProgress(req.user.id, examGroup),
    ]);

    const seenSet = new Set(seenTopics.map(t => `${t.topic}__${t.exam_group}`));

    const topics = allTopics.map(t => ({
      ...t,
      seen: seenSet.has(`${t.topic}__${t.exam_group}`),
      last_seen: seenTopics.find(
        s => s.topic === t.topic && s.exam_group === t.exam_group
      )?.last_seen || null,
    }));

    const total  = topics.length;
    const seen   = topics.filter(t => t.seen).length;

    res.json({
      topics,
      stats: {
        total,
        seen,
        unseen:  total - seen,
        percent: total ? Math.round((seen / total) * 100) : 0,
      },
    });

  } catch (err) {
    console.error('/api/progress error:', err);
    res.status(500).json({ error: err.message });
  }
});

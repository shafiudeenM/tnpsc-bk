import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Syllabus topics ────────────────────────────────────────────────────────

export async function getSyllabusTopics(examGroup = null) {
  let q = supabase.from('syllabus_topics').select('*');
  if (examGroup && examGroup !== 'all') {
    q = q.eq('exam_group', examGroup);
  }
  const { data, error } = await q.order('subject').order('topic');
  if (error) throw error;
  return data;
}

export async function insertSyllabusTopic({ topic, subject, examGroup, classRef }) {
  const { error } = await supabase.from('syllabus_topics').upsert({
    topic, subject,
    exam_group: examGroup,
    class_ref:  classRef,
  }, { onConflict: 'topic,exam_group' });
  if (error) throw error;
}

// ── Progress tracking ──────────────────────────────────────────────────────

/**
 * Log that a user asked about a topic. Upserts so duplicates are ignored.
 */
export async function logTopicSeen({ userId, topic, subject, examGroup }) {
  const { error } = await supabase.from('user_progress').upsert({
    user_id:    userId,
    topic,
    subject,
    exam_group: examGroup,
    last_seen:  new Date().toISOString(),
  }, { onConflict: 'user_id,topic,exam_group' });
  if (error) console.error('logTopicSeen error:', error);
}

export async function getUserProgress(userId, examGroup = null) {
  let q = supabase
    .from('user_progress')
    .select('topic, subject, exam_group, last_seen')
    .eq('user_id', userId);

  if (examGroup && examGroup !== 'all') {
    q = q.eq('exam_group', examGroup);
  }

  const { data, error } = await q.order('last_seen', { ascending: false });
  if (error) throw error;
  return data;
}

// ── MCQ history ────────────────────────────────────────────────────────────

export async function saveMCQAttempt({ userId, topic, examGroup, questions, score }) {
  const { error } = await supabase.from('mcq_attempts').insert({
    user_id:    userId,
    topic,
    exam_group: examGroup,
    questions:  JSON.stringify(questions),
    score,
    attempted_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getMCQHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from('mcq_attempts')
    .select('id, topic, exam_group, score, attempted_at')
    .eq('user_id', userId)
    .order('attempted_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

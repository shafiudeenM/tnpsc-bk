import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
dotenv.config();

const client = new QdrantClient({
  url:    process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION || 'tnpsc_chunks';
const DIM        = parseInt(process.env.EMBEDDING_DIM || '384');

/**
 * Create collection if it doesn't exist.
 */
export async function initQdrant() {
  const { collections } = await client.getCollections();
  const exists = collections.some(c => c.name === COLLECTION);

  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: { size: DIM, distance: 'Cosine' },
      optimizers_config: { default_segment_number: 2 },
      replication_factor: 1,
    });

    // Payload indexes for fast filtered search
    for (const field of ['exam_group', 'medium', 'class', 'subject']) {
      await client.createPayloadIndex(COLLECTION, {
        field_name: field,
        field_schema: 'keyword',
      });
    }
    console.log(`✅ Qdrant collection "${COLLECTION}" created`);
  } else {
    console.log(`✅ Qdrant collection "${COLLECTION}" ready`);
  }
}

/**
 * Upsert a single chunk into Qdrant.
 */
export async function upsertChunk({ chunkId, embedding, payload }) {
  await client.upsert(COLLECTION, {
    wait: true,
    points: [{
      id:      chunkId,           // must be uint64 or UUID string
      vector:  embedding,
      payload,                    // { text, class, subject, chapter, page_num, medium, exam_group, source_file }
    }],
  });
}

/**
 * Upsert many chunks in one batch.
 */
export async function upsertBatch(points) {
  // Qdrant recommends batches of ≤100
  const BATCH = 100;
  for (let i = 0; i < points.length; i += BATCH) {
    await client.upsert(COLLECTION, {
      wait: true,
      points: points.slice(i, i + BATCH),
    });
  }
}

/**
 * Vector similarity search with payload filters.
 *
 * @param {number[]} queryVector
 * @param {object}  filters  - { examGroup, medium }  (both optional)
 * @param {number}  topK
 */
export async function searchChunks({ queryVector, filters = {}, topK = 5 }) {
  const must = [];

  if (filters.examGroup && filters.examGroup !== 'all') {
    must.push({
      should: [
        { key: 'exam_group', match: { value: filters.examGroup } },
        { key: 'exam_group', match: { value: 'all' } },
      ],
    });
  }

  if (filters.medium && filters.medium !== 'any') {
    must.push({ key: 'medium', match: { value: filters.medium } });
  }

  const searchParams = {
    vector: queryVector,
    limit:  topK,
    with_payload: true,
    with_vector: false,
  };

  if (must.length > 0) {
    searchParams.filter = { must };
  }

  const results = await client.search(COLLECTION, searchParams);

  return results.map(r => ({
    chunkId:    r.id,
    score:      r.score,
    text:       r.payload.text,
    class:      r.payload.class,
    subject:    r.payload.subject,
    chapter:    r.payload.chapter,
    page_num:   r.payload.page_num,
    medium:     r.payload.medium,
    exam_group: r.payload.exam_group,
    source_file: r.payload.source_file,
  }));
}

export async function getChunkCount() {
  const info = await client.getCollection(COLLECTION);
  return info.points_count ?? 0;
}

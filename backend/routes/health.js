import { Router } from 'express';
import { QdrantClient } from '@qdrant/js-client-rest';
import dotenv from 'dotenv';
dotenv.config();

export const healthRouter = Router();

const client = new QdrantClient({
  url:    process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = process.env.QDRANT_COLLECTION || 'tnpsc_chunks';

let dbReady = false;

async function initQdrant() {
  const { collections } = await client.getCollections();
  const exists = collections.some(c => c.name === COLLECTION);
  if (!exists) {
    await client.createCollection(COLLECTION, {
      vectors: { size: parseInt(process.env.EMBEDDING_DIM || '384'), distance: 'Cosine' },
    });
  }
  dbReady = true;
}

healthRouter.get('/', async (req, res) => {
  if (!dbReady) {
    try {
      await initQdrant();
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  try {
    const info  = await client.getCollection(COLLECTION);
    const count = info.points_count ?? 0;
    res.json({
      status: 'ok',
      chunkCount: count,
      model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
      ts: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

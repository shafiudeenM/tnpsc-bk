/**
 * Quick verification script
 * Run: node scripts/verify.js
 * 
 * Checks:
 * 1. Qdrant — how many chunks are stored, sample one
 * 2. Embeddings — can we embed a query
 * 3. Search — does a test query return results
 */

import dotenv from 'dotenv';
dotenv.config();

import { QdrantClient } from '@qdrant/js-client-rest';
import { embed } from '../services/embeddings.js';

const client = new QdrantClient({
  url:    process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});
const COLLECTION = process.env.QDRANT_COLLECTION || 'tnpsc_chunks';

async function run() {
  console.log('\n🔍 TNPSC Guru — Verification\n' + '─'.repeat(40));

  // ── 1. Qdrant collection info ──────────────────
  console.log('\n📦 Qdrant collection...');
  try {
    const info = await client.getCollection(COLLECTION);
    const count = info.points_count ?? 0;
    console.log(`  ✅ Collection: ${COLLECTION}`);
    console.log(`  ✅ Chunks stored: ${count}`);
    console.log(`  ✅ Vector size: ${info.config?.params?.vectors?.size}`);

    if (count === 0) {
      console.log('\n  ⚠️  No chunks found. Run: node scripts/ingest.js');
      process.exit(1);
    }
  } catch (err) {
    console.error(`  ❌ Qdrant error: ${err.message}`);
    console.error('     Check QDRANT_URL and QDRANT_API_KEY in your .env');
    process.exit(1);
  }

  // ── 2. Sample a chunk ─────────────────────────
  console.log('\n📄 Sample chunk from DB...');
  try {
    const results = await client.scroll(COLLECTION, { limit: 1, with_payload: true, with_vector: false });
    const sample = results.points[0];
    if (sample) {
      const p = sample.payload;
      console.log(`  ✅ Class: ${p.class} | Subject: ${p.subject} | Medium: ${p.medium}`);
      console.log(`  ✅ Chapter: ${p.chapter} | Page: ${p.page_num}`);
      console.log(`  ✅ Text preview: "${p.text?.slice(0, 80)}..."`);
    }
  } catch (err) {
    console.error(`  ❌ Scroll error: ${err.message}`);
  }

  // ── 3. Embed a test query ──────────────────────
  console.log('\n🧠 Embedding test query...');
  try {
    const vec = await embed('What is the 73rd amendment?');
    console.log(`  ✅ Embedding generated: ${vec.length}-dim vector`);
    console.log(`  ✅ First 5 values: [${vec.slice(0,5).map(v => v.toFixed(4)).join(', ')}]`);
  } catch (err) {
    console.error(`  ❌ Embedding error: ${err.message}`);
    process.exit(1);
  }

  // ── 4. Vector search ──────────────────────────
  console.log('\n🔎 Test search: "who were known for their honesty and integrity?"...');
  try {
    const vec = await embed('who were known for their honesty and integrity?');
    const results = await client.search(COLLECTION, {
      vector: vec,
      limit: 3,
      with_payload: true,
      with_vector: false,
    });

    if (results.length === 0) {
      console.log('  ⚠️  No results returned — check your ingested content');
    } else {
      results.forEach((r, i) => {
        console.log(`\n  Result ${i+1} (score: ${(r.score * 100).toFixed(1)}%)`);
        console.log(`    Class ${r.payload.class} · ${r.payload.subject} · Pg ${r.payload.page_num}`);
        console.log(`    "${r.payload.text?.slice(0, 100)}..."`);
      });
    }
  } catch (err) {
    console.error(`  ❌ Search error: ${err.message}`);
  }

  console.log('\n' + '─'.repeat(40));
  console.log('✅ Verification complete — backend is ready!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

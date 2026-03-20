import dotenv from 'dotenv';
dotenv.config();

let _pipeline = null;

async function getPipeline() {
  if (_pipeline) return _pipeline;
  const { pipeline, env } = await import('@xenova/transformers');
  env.cacheDir = './models';
  const model = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
  console.log(`⏳ Loading embedding model: ${model}`);
  _pipeline = await pipeline('feature-extraction', model);
  console.log('✅ Embedding model ready');
  return _pipeline;
}

export async function embed(text) {
  const extractor = await getPipeline();
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
}

export async function embedBatch(texts, batchSize = 32) {
  const extractor = await getPipeline();
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const outs  = await Promise.all(
      batch.map(t => extractor(t, { pooling: 'mean', normalize: true }))
    );
    results.push(...outs.map(o => Array.from(o.data)));
    console.log(`  Embedded ${Math.min(i + batchSize, texts.length)}/${texts.length}`);
  }
  return results;
}

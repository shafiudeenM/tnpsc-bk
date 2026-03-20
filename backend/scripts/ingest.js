#!/usr/bin/env node
/**
 * TNPSC Guru v2 — Bulk Ingestion Script
 *
 * Run once locally after placing PDFs in the pdfs/ folder.
 * Usage: node scripts/ingest.js
 *
 * Folder structure expected:
 *   pdfs/english/class6/history.pdf
 *   pdfs/english/class7/geography.pdf
 *   pdfs/tamil/class6/history.pdf
 *   ...
 *
 * Edit the MANIFEST below to match your actual files.
 */

import fs   from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { parsePDF }              from '../services/pdfParser.js';
import { embedBatch }            from '../services/embeddings.js';
import { upsertBatch, initQdrant } from '../services/qdrant.js';

// ── MANIFEST ────────────────────────────────────────────────────────────────
// examGroup: 'all' | 'group1' | 'group2' | 'group4'
// medium:    'en'  | 'ta'
const MANIFEST = [
  // ── English medium ──
  { file: 'pdfs/english/class6/history.pdf',     class:'6',  subject:'History',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class6/geography.pdf',   class:'6',  subject:'Geography', chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class6/civics.pdf',      class:'6',  subject:'Civics',    chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class6/science.pdf',     class:'6',  subject:'Science',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class7/history.pdf',     class:'7',  subject:'History',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class7/geography.pdf',   class:'7',  subject:'Geography', chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class7/civics.pdf',      class:'7',  subject:'Civics',    chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class7/science.pdf',     class:'7',  subject:'Science',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class8/history.pdf',     class:'8',  subject:'History',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class8/geography.pdf',   class:'8',  subject:'Geography', chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class8/civics.pdf',      class:'8',  subject:'Civics',    chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class8/science.pdf',     class:'8',  subject:'Science',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class9/history.pdf',     class:'9',  subject:'History',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class9/geography.pdf',   class:'9',  subject:'Geography', chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class9/civics.pdf',      class:'9',  subject:'Civics',    chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class9/science.pdf',     class:'9',  subject:'Science',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class10/history.pdf',    class:'10', subject:'History',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class10/geography.pdf',  class:'10', subject:'Geography', chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class10/civics.pdf',     class:'10', subject:'Civics',    chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class10/science.pdf',    class:'10', subject:'Science',   chapter:'Full Book', medium:'en', examGroup:'all' },
  { file: 'pdfs/english/class11/history.pdf',    class:'11', subject:'History',   chapter:'Full Book', medium:'en', examGroup:'group1' },
  { file: 'pdfs/english/class11/geography.pdf',  class:'11', subject:'Geography', chapter:'Full Book', medium:'en', examGroup:'group1' },
  { file: 'pdfs/english/class11/polity.pdf',     class:'11', subject:'Polity',    chapter:'Full Book', medium:'en', examGroup:'group1' },
  { file: 'pdfs/english/class11/economics.pdf',  class:'11', subject:'Economics', chapter:'Full Book', medium:'en', examGroup:'group1' },
  { file: 'pdfs/english/class12/history.pdf',    class:'12', subject:'History',   chapter:'Full Book', medium:'en', examGroup:'group1' },
  { file: 'pdfs/english/class12/geography.pdf',  class:'12', subject:'Geography', chapter:'Full Book', medium:'en', examGroup:'group1' },
  { file: 'pdfs/english/class12/polity.pdf',     class:'12', subject:'Polity',    chapter:'Full Book', medium:'en', examGroup:'group1' },
  { file: 'pdfs/english/class12/economics.pdf',  class:'12', subject:'Economics', chapter:'Full Book', medium:'en', examGroup:'group1' },

  // ── Tamil medium (mirror of above with medium:'ta') ──
  { file: 'pdfs/tamil/class6/history.pdf',       class:'6',  subject:'History',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class6/geography.pdf',     class:'6',  subject:'Geography', chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class6/civics.pdf',        class:'6',  subject:'Civics',    chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class6/science.pdf',       class:'6',  subject:'Science',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class7/history.pdf',       class:'7',  subject:'History',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class7/geography.pdf',     class:'7',  subject:'Geography', chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class7/civics.pdf',        class:'7',  subject:'Civics',    chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class7/science.pdf',       class:'7',  subject:'Science',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class8/history.pdf',       class:'8',  subject:'History',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class8/geography.pdf',     class:'8',  subject:'Geography', chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class8/civics.pdf',        class:'8',  subject:'Civics',    chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class8/science.pdf',       class:'8',  subject:'Science',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class9/history.pdf',       class:'9',  subject:'History',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class9/geography.pdf',     class:'9',  subject:'Geography', chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class9/civics.pdf',        class:'9',  subject:'Civics',    chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class9/science.pdf',       class:'9',  subject:'Science',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class10/history.pdf',      class:'10', subject:'History',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class10/geography.pdf',    class:'10', subject:'Geography', chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class10/civics.pdf',       class:'10', subject:'Civics',    chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class10/science.pdf',      class:'10', subject:'Science',   chapter:'Full Book', medium:'ta', examGroup:'all' },
  { file: 'pdfs/tamil/class11/history.pdf',      class:'11', subject:'History',   chapter:'Full Book', medium:'ta', examGroup:'group1' },
  { file: 'pdfs/tamil/class11/geography.pdf',    class:'11', subject:'Geography', chapter:'Full Book', medium:'ta', examGroup:'group1' },
  { file: 'pdfs/tamil/class11/polity.pdf',       class:'11', subject:'Polity',    chapter:'Full Book', medium:'ta', examGroup:'group1' },
  { file: 'pdfs/tamil/class11/economics.pdf',    class:'11', subject:'Economics', chapter:'Full Book', medium:'ta', examGroup:'group1' },
  { file: 'pdfs/tamil/class12/history.pdf',      class:'12', subject:'History',   chapter:'Full Book', medium:'ta', examGroup:'group1' },
  { file: 'pdfs/tamil/class12/geography.pdf',    class:'12', subject:'Geography', chapter:'Full Book', medium:'ta', examGroup:'group1' },
  { file: 'pdfs/tamil/class12/polity.pdf',       class:'12', subject:'Polity',    chapter:'Full Book', medium:'ta', examGroup:'group1' },
  { file: 'pdfs/tamil/class12/economics.pdf',    class:'12', subject:'Economics', chapter:'Full Book', medium:'ta', examGroup:'group1' },
];

async function run() {
  console.log('🚀 TNPSC Guru v2 — Ingestion\n');
  await initQdrant();

  let total = 0, skipped = 0;

  for (const entry of MANIFEST) {
    const fp = path.resolve(entry.file);
    if (!fs.existsSync(fp)) {
      console.log(`⚠️  Skip (not found): ${entry.file}`);
      skipped++; continue;
    }

    console.log(`\n📚 ${entry.file}`);
    console.log(`   Class ${entry.class} · ${entry.subject} · ${entry.medium} · ${entry.examGroup}`);

    try {
      const buf        = fs.readFileSync(fp);
      const chunks     = await parsePDF(buf, entry);
      if (!chunks.length) { console.log('   ⚠️  No chunks'); continue; }

      const embeddings = await embedBatch(chunks.map(c => c.text));
      const points     = chunks.map((c, i) => ({
        id: c.chunkId, vector: embeddings[i], payload: c.payload,
      }));

      await upsertBatch(points);
      total += chunks.length;
      console.log(`   ✅ ${chunks.length} chunks upserted`);
    } catch (err) {
      console.error(`   ❌ ${err.message}`);
    }
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`✅ Done · Total chunks: ${total} · Skipped files: ${skipped}`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });

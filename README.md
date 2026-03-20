# TNPSC Guru v2 📚

AI-powered TNPSC exam prep — answers from Samacheer Kalvi textbooks (Class 6–12, English + Tamil medium).

**Stack:** React → Netlify · Express → Render · Qdrant Cloud (vectors) · Supabase (auth + data) · Groq llama-3.3-70b (free)

---

## Features

| Feature | Description |
|---------|-------------|
| Q&A with citations | Answers from textbook chunks, cites class/subject/chapter/page |
| Tanglish support | Detects Tanglish ("73vatu amendment pathi sollu") → dual search → Tamil reply |
| English + Tamil medium | Separate chunks per medium, matched to query language |
| Exam group filter | Group 1, Group 2/2A, Group 4/VAO scope |
| MCQ practice | Type any topic → 5 MCQs generated from the textbook |
| Syllabus progress | See which topics you've covered, grouped by subject |
| User auth | Email/password via Supabase Auth, login required |

---

## One-time Setup (do in this order)

### 1. Supabase — free account
1. Go to https://supabase.com → New project
2. **SQL Editor** → paste and run the entire contents of `backend/scripts/schema.sql`
3. Go to **Settings → API** → copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_SERVICE_KEY` (backend — keep secret!)
4. Go to **Authentication → Providers** → make sure Email is enabled

### 2. Qdrant Cloud — free account
1. Go to https://cloud.qdrant.io → Create cluster (free tier, 1 GB)
2. Copy the **Cluster URL** → `QDRANT_URL`
3. Go to **API Keys** → Create key → `QDRANT_API_KEY`
4. Collection name: `tnpsc_chunks` (created automatically on first run)

### 3. Groq — free API key
1. Go to https://console.groq.com → API Keys → Create
2. Copy key → `GROQ_API_KEY`

---

## Ingest your PDFs (run once, locally)

### Folder structure
Put your PDFs here inside the `backend/` folder:
```
backend/pdfs/
  english/
    class6/history.pdf
    class6/geography.pdf
    class6/civics.pdf
    class6/science.pdf
    class7/ ...
    class8/ ...
    class9/ ...
    class10/ ...
    class11/history.pdf
    class11/geography.pdf
    class11/polity.pdf
    class11/economics.pdf
    class12/ ...
  tamil/
    class6/history.pdf    ← same structure, Tamil medium PDFs
    ...
  syllabus/
    group1.pdf
    group2.pdf
    group4.pdf
```

Edit `backend/scripts/ingest.js` → `MANIFEST` array if your filenames differ.

### Run ingestion
```bash
cd backend
cp .env.example .env
# Fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, QDRANT_URL, QDRANT_API_KEY

npm install
node scripts/ingest.js        # ~30–45 min for all books
```

---

## Deploy Backend → Render

1. Push code to GitHub
2. https://render.com → New Web Service → connect repo
3. Settings:
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `node server.js`
   - Region: **Singapore** (closest free region to India)
   - Plan: Free
4. Add environment variables (all the keys from your `.env`)
5. Add Disk: name=`model-cache`, mount=`/opt/render/project/src/backend/models`, size=1GB
6. Deploy → copy your URL e.g. `https://tnpsc-guru-backend.onrender.com`

> **Keep-alive tip:** Render free tier sleeps after 15 min. Sign up at https://uptimerobot.com (free) and add a monitor pinging `https://your-backend.onrender.com/api/health` every 10 minutes.

---

## Deploy Frontend → Netlify

```bash
cd frontend
cp .env.example .env
# Fill in:
# VITE_API_URL=https://your-backend.onrender.com
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Via Netlify dashboard:**
1. New site from Git → connect repo
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `frontend/dist`
5. Add the 3 environment variables above
6. Deploy → copy your Netlify URL

**After deploy — update CORS on Render:**
Add env var: `FRONTEND_URL=https://your-app.netlify.app` → redeploy backend.

---

## Project Structure

```
tnpsc-guru/
├── backend/
│   ├── server.js                    ← Express entry point
│   ├── middleware/auth.js           ← Supabase JWT validation
│   ├── routes/
│   │   ├── ask.js                   ← POST /api/ask  (RAG pipeline)
│   │   ├── mcq.js                   ← MCQ generate + submit + history
│   │   ├── progress.js              ← Syllabus progress tracker
│   │   ├── upload.js                ← PDF upload via UI
│   │   └── health.js
│   ├── services/
│   │   ├── qdrant.js                ← Vector search (Qdrant Cloud)
│   │   ├── supabase.js              ← Auth + progress + MCQ history
│   │   ├── groq.js                  ← Tanglish normalise + answer + MCQ gen
│   │   ├── embeddings.js            ← Local embeddings (free, @xenova/transformers)
│   │   ├── langDetect.js            ← English / Tamil / Tanglish detector
│   │   └── pdfParser.js             ← PDF → semantic chunks
│   └── scripts/
│       ├── ingest.js                ← Bulk offline ingestion
│       └── schema.sql               ← Paste into Supabase SQL editor
├── frontend/
│   └── src/
│       ├── App.jsx                  ← Routes + auth gate
│       ├── context/AuthContext.jsx  ← Supabase session provider
│       ├── lib/api.js               ← API client (attaches JWT)
│       ├── lib/supabase.js          ← Supabase client
│       ├── components/Layout.jsx    ← Sidebar + nav
│       └── pages/
│           ├── LoginPage.jsx        ← Email/password auth
│           ├── AskPage.jsx          ← Q&A with citations
│           ├── MCQPage.jsx          ← MCQ practice
│           └── ProgressPage.jsx     ← Syllabus coverage tracker
└── render.yaml                      ← Render deployment config
```

---

## Cost breakdown

| Service | Free tier | Fits TNPSC Guru? |
|---------|-----------|-----------------|
| Render | 750 hrs/month | ✅ Yes (1 service) |
| Netlify | 100GB bandwidth | ✅ Yes |
| Supabase | 500MB DB, unlimited auth | ✅ Yes |
| Qdrant Cloud | 1GB vector storage | ✅ Yes (~200MB for all books) |
| Groq | 14,400 req/day free | ✅ Yes |
| Embeddings | Local (zero cost) | ✅ Yes |
| **Total** | **₹0/month** | ✅ |

---

## FAQ

**Q: First question is slow (15–30 sec)?**
The embedding model downloads on cold start. The Render disk mount caches it after first boot.

**Q: How does Tanglish detection work?**
A regex checks for Tamil Unicode, then pattern-matches known Tanglish words ("pathi", "sollu", "73vatu" etc). No ML needed — runs in ~1ms.

**Q: Can I add more PDFs later?**
Yes — use the "Upload PDF" button in the app (accessible to logged-in users) or re-run `ingest.js` with new entries in the MANIFEST.

**Q: What if a student asks something not in the textbooks?**
Groq is instructed to reply: "This answer was not found in the textbooks." It never hallucinates.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import { askRouter }      from './routes/ask.js';
import { mcqRouter }      from './routes/mcq.js';
import { progressRouter } from './routes/progress.js';
import { uploadRouter }   from './routes/upload.js';
import { healthRouter }   from './routes/health.js';
import { authMiddleware } from './middleware/auth.js';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — 40 req/min per IP
app.use('/api/', rateLimit({
  windowMs: 60_000, max: 40,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Slow down!' },
}));

// Public
app.use('/api/health', healthRouter);

// Protected — all routes below require a valid Supabase JWT
app.use('/api/ask',      authMiddleware, askRouter);
app.use('/api/mcq',      authMiddleware, mcqRouter);
app.use('/api/progress', authMiddleware, progressRouter);
app.use('/api/upload',   authMiddleware, uploadRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`🚀 TNPSC Guru v2 running on port ${PORT}`));

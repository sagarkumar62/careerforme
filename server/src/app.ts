import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import recommendationRoutes from './routes/recommendation.routes';
import roadmapRoutes from './routes/roadmap.routes';
import progressRoutes from './routes/progress.routes';
import feedbackRoutes from './routes/feedback.routes';
import conversationRoutes from './routes/conversation.routes';
import assistantRoutes from './routes/assistant.routes';
import dashboardRoutes from './routes/dashboard.routes';
import learningPathRoutes from './routes/learning-path.routes';
import aiRoutes from './routes/ai.routes';

import { notFoundMiddleware } from './middleware/notFound.middleware';
import { errorMiddleware } from './middleware/error.middleware';

const app: Application = express();

// Security HTTP headers
app.use(helmet());

// Parse allowed origins cleanly
const allowedOrigins = (env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .concat(['http://localhost:3000', 'http://127.0.0.1:3000'])
  .filter(Boolean);

// Enable CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) {
        return callback(null, cleanOrigin);
      }
      return callback(null, cleanOrigin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// HTTP request logger
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers & Cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Base API Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1', learningPathRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/roadmaps', roadmapRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/conversation', conversationRoutes);
app.use('/api/v1/assistant', assistantRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/ai', aiRoutes);


// Root endpoint redirect / simple info
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to CAREER PATHFINDER API',
    version: 'v1',
    health: '/api/v1/health',
    dashboard: '/api/v1/dashboard',
  });
});

// 404 Handler
app.use(notFoundMiddleware);

// Error Handler
app.use(errorMiddleware);

export default app;

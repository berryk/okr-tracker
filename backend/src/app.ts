import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFound } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth.routes';
import goalsRoutes from './routes/goals.routes';
import measuresRoutes from './routes/measures.routes';
import teamsRoutes from './routes/teams.routes';
import aiRoutes from './routes/ai.routes';
import reportsRoutes from './routes/reports.routes';
import usersRoutes from './routes/users.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/measures', measuresRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;

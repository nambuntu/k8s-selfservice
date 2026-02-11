import express, { Application } from 'express';
import cors from 'cors';
import config from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { initializeDatabase } from './config/database';
import websiteRoutes from './routes/websiteRoutes';
import provisionerRoutes from './routes/provisionerRoutes';
import healthRoutes from './routes/health';

// Create Express application
const app: Application = express();

// Middleware
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
}));
app.use(express.json({ limit: '150kb' })); // Slightly above 100KB to catch validation errors
app.use(express.urlencoded({ extended: true, limit: '150kb' }));

// Request logging middleware
app.use(requestLogger);

// Health check endpoint
app.use(healthRoutes);

// API routes
app.use('/api/websites', websiteRoutes);
app.use('/api/provisioner', provisionerRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer(): Promise<void> {
  try {
    // Initialize database connection and run migrations
    await initializeDatabase();

    // Start server
    app.listen(config.port, () => {
      console.log(`✓ Server running on port ${config.port}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Frontend URL: ${config.frontend.url}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
export { startServer };

import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';

const router = Router();

/**
 * Health check endpoint
 * Returns system health status including database connectivity
 */
router.get('/health', async (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'healthy',
      database: 'unknown',
    },
  };

  try {
    // Check database connection
    await sequelize.authenticate();
    healthCheck.services.database = 'healthy';
  } catch (error) {
    healthCheck.status = 'degraded';
    healthCheck.services.database = 'unhealthy';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

export default router;

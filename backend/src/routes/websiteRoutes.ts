import { Router } from 'express';
import websiteController from '../controllers/WebsiteController';
import { asyncHandler } from '../middleware/validation';
import { validateWebsiteCreation } from '../middleware/validation';

const router = Router();

/**
 * User endpoints for website management
 */

// POST /api/websites - Create new website
router.post(
  '/',
  validateWebsiteCreation,
  asyncHandler(websiteController.createWebsite.bind(websiteController))
);

// GET /api/websites - List user's websites
router.get(
  '/',
  asyncHandler(websiteController.listWebsites.bind(websiteController))
);

// GET /api/websites/:id - Get single website
router.get(
  '/:id',
  asyncHandler(websiteController.getWebsite.bind(websiteController))
);

export default router;

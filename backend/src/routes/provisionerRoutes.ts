import { Router } from 'express';
import provisionerController from '../controllers/ProvisionerController';
import { asyncHandler } from '../middleware/validation';

const router = Router();

/**
 * Provisioner endpoints for backend integration
 */

// GET /api/provisioner/websites/pending - Get pending websites
router.get(
  '/websites/pending',
  asyncHandler(provisionerController.getPendingWebsites.bind(provisionerController))
);

// PUT /api/provisioner/websites/:id/status - Update website status
router.put(
  '/websites/:id/status',
  asyncHandler(provisionerController.updateWebsiteStatus.bind(provisionerController))
);

export default router;

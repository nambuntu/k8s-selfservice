import { Request, Response } from 'express';
import websiteService from '../services/WebsiteService';
import { WebsiteStatus } from '../models/Website';
import { OperationalError } from '../middleware/errorHandler';

export class ProvisionerController {
  /**
   * GET /api/provisioner/websites/pending - Get pending websites for provisioner
   */
  async getPendingWebsites(req: Request, res: Response): Promise<void> {
    const websites = await websiteService.getPendingWebsites();

    res.json({
      success: true,
      data: websites,
      count: websites.length,
    });
  }

  /**
   * PUT /api/provisioner/websites/:id/status - Update website status
   */
  async updateWebsiteStatus(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id, 10);
    const { status, podIpAddress, errorMessage } = req.body;

    // Validate status
    if (!Object.values(WebsiteStatus).includes(status)) {
      throw new OperationalError(
        `Invalid status. Must be one of: ${Object.values(WebsiteStatus).join(', ')}`,
        400
      );
    }

    // Validate podIpAddress is provided when status is provisioned
    if (status === WebsiteStatus.PROVISIONED && !podIpAddress) {
      throw new OperationalError('podIpAddress is required when status is provisioned', 400);
    }

    // Validate errorMessage is provided when status is failed
    if (status === WebsiteStatus.FAILED && !errorMessage) {
      throw new OperationalError('errorMessage is required when status is failed', 400);
    }

    const website = await websiteService.updateWebsiteStatus(
      id,
      status,
      podIpAddress,
      errorMessage
    );

    res.json({
      success: true,
      data: website,
    });
  }
}

export default new ProvisionerController();

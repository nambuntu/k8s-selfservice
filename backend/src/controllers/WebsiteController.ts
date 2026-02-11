import { Request, Response } from 'express';
import websiteService from '../services/WebsiteService';

export class WebsiteController {
  /**
   * POST /api/websites - Create new website request
   */
  async createWebsite(req: Request, res: Response): Promise<void> {
    const { websiteName, websiteTitle, htmlContent } = req.body;

    // TODO: Replace with actual user authentication
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const website = await websiteService.createWebsite({
      userId,
      websiteName,
      websiteTitle,
      htmlContent,
    });

    res.status(201).json({
      success: true,
      data: website,
    });
  }

  /**
   * GET /api/websites - List user's websites
   */
  async listWebsites(req: Request, res: Response): Promise<void> {
    // TODO: Replace with actual user authentication
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const websites = await websiteService.listWebsites(userId);

    res.json({
      success: true,
      data: websites,
      count: websites.length,
    });
  }

  /**
   * GET /api/websites/:id - Get single website details
   */
  async getWebsite(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id, 10);
    
    // TODO: Replace with actual user authentication
    const userId = req.headers['x-user-id'] as string || 'demo-user';

    const website = await websiteService.getWebsite(id, userId);

    res.json({
      success: true,
      data: website,
    });
  }
}

export default new WebsiteController();

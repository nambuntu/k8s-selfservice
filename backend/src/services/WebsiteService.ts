import Website, { WebsiteStatus, WebsiteCreationAttributes } from '../models/Website';
import { OperationalError } from '../middleware/errorHandler';

export class WebsiteService {
  /**
   * Create a new website request
   */
  async createWebsite(data: {
    userId: string;
    websiteName: string;
    websiteTitle: string;
    htmlContent: string;
  }): Promise<Website> {
    // Check for duplicate website name
    const existing = await Website.findOne({
      where: { websiteName: data.websiteName },
    });

    if (existing) {
      throw new OperationalError(
        `Website with name "${data.websiteName}" already exists`,
        409
      );
    }

    // Create website with pending status
    const website = await Website.create({
      userId: data.userId,
      websiteName: data.websiteName,
      websiteTitle: data.websiteTitle,
      htmlContent: data.htmlContent,
      status: WebsiteStatus.PENDING,
    });

    return website;
  }

  /**
   * List all websites for a user
   */
  async listWebsites(userId: string): Promise<Website[]> {
    const websites = await Website.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return websites;
  }

  /**
   * Get a single website by ID
   */
  async getWebsite(id: number, userId: string): Promise<Website> {
    const website = await Website.findOne({
      where: { id, userId },
    });

    if (!website) {
      throw new OperationalError('Website not found', 404);
    }

    return website;
  }

  /**
   * Get pending websites (for provisioner)
   */
  async getPendingWebsites(): Promise<Website[]> {
    const websites = await Website.findAll({
      where: { status: WebsiteStatus.PENDING },
      order: [['createdAt', 'ASC']],
    });

    return websites;
  }

  /**
   * Update website status (for provisioner)
   */
  async updateWebsiteStatus(
    id: number,
    status: WebsiteStatus,
    podIpAddress?: string,
    errorMessage?: string
  ): Promise<Website> {
    const website = await Website.findByPk(id);

    if (!website) {
      throw new OperationalError('Website not found', 404);
    }

    // Update status and related fields
    website.status = status;

    if (podIpAddress) {
      website.podIpAddress = podIpAddress;
    }

    if (errorMessage) {
      website.errorMessage = errorMessage;
    }

    await website.save();

    return website;
  }
}

export default new WebsiteService();

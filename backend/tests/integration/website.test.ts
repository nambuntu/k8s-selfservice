import request from 'supertest';
import app from '../../src/app';
import { sequelize } from '../../src/config/database';
import Website, { WebsiteStatus } from '../../src/models/Website';

describe('Website API Integration Tests', () => {
  beforeAll(async () => {
    // Initialize database connection
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clear websites table before each test
    await Website.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/websites', () => {
    it('should create a new website with valid data', async () => {
      const websiteData = {
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body><h1>Test</h1></body></html>',
      };

      const response = await request(app)
        .post('/api/websites')
        .set('x-user-id', 'test-user')
        .send(websiteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        websiteName: websiteData.websiteName,
        websiteTitle: websiteData.websiteTitle,
        htmlContent: websiteData.htmlContent,
        status: 'pending',
        userId: 'test-user',
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('should reject website with invalid DNS name', async () => {
      const websiteData = {
        websiteName: 'INVALID_NAME',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body><h1>Test</h1></body></html>',
      };

      const response = await request(app)
        .post('/api/websites')
        .set('x-user-id', 'test-user')
        .send(websiteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('lowercase');
    });

    it('should reject website with HTML content over 100KB', async () => {
      const websiteData = {
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: 'x'.repeat(102401), // 100KB + 1 byte
      };

      const response = await request(app)
        .post('/api/websites')
        .set('x-user-id', 'test-user')
        .send(websiteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('100KB');
    });

    it('should reject duplicate website names', async () => {
      const websiteData = {
        websiteName: 'duplicate-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body><h1>Test</h1></body></html>',
      };

      // Create first website
      await request(app)
        .post('/api/websites')
        .set('x-user-id', 'test-user')
        .send(websiteData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/websites')
        .set('x-user-id', 'test-user')
        .send(websiteData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/websites')
        .set('x-user-id', 'test-user')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/websites', () => {
    it('should return empty array when no websites exist', async () => {
      const response = await request(app)
        .get('/api/websites')
        .set('x-user-id', 'test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should return all websites for a user', async () => {
      // Create test websites
      await Website.create({
        userId: 'test-user',
        websiteName: 'website-1',
        websiteTitle: 'Website 1',
        htmlContent: '<html><body>1</body></html>',
        status: WebsiteStatus.PENDING,
      });

      await Website.create({
        userId: 'test-user',
        websiteName: 'website-2',
        websiteTitle: 'Website 2',
        htmlContent: '<html><body>2</body></html>',
        status: WebsiteStatus.PROVISIONED,
      });

      const response = await request(app)
        .get('/api/websites')
        .set('x-user-id', 'test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should only return websites for the requesting user', async () => {
      // Create websites for different users
      await Website.create({
        userId: 'user-1',
        websiteName: 'website-1',
        websiteTitle: 'Website 1',
        htmlContent: '<html><body>1</body></html>',
        status: WebsiteStatus.PENDING,
      });

      await Website.create({
        userId: 'user-2',
        websiteName: 'website-2',
        websiteTitle: 'Website 2',
        htmlContent: '<html><body>2</body></html>',
        status: WebsiteStatus.PENDING,
      });

      const response = await request(app)
        .get('/api/websites')
        .set('x-user-id', 'user-1')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe('user-1');
    });
  });

  describe('GET /api/websites/:id', () => {
    it('should return a specific website', async () => {
      const website = await Website.create({
        userId: 'test-user',
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body>Test</body></html>',
        status: WebsiteStatus.PENDING,
      });

      const response = await request(app)
        .get(`/api/websites/${website.id}`)
        .set('x-user-id', 'test-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(website.id);
      expect(response.body.data.websiteName).toBe('test-website');
    });

    it('should return 404 for non-existent website', async () => {
      const response = await request(app)
        .get('/api/websites/99999')
        .set('x-user-id', 'test-user')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should not return websites from other users', async () => {
      const website = await Website.create({
        userId: 'other-user',
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body>Test</body></html>',
        status: WebsiteStatus.PENDING,
      });

      const response = await request(app)
        .get(`/api/websites/${website.id}`)
        .set('x-user-id', 'test-user')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/provisioner/websites/pending', () => {
    it('should return only pending websites', async () => {
      await Website.create({
        userId: 'test-user',
        websiteName: 'pending-1',
        websiteTitle: 'Pending 1',
        htmlContent: '<html><body>1</body></html>',
        status: WebsiteStatus.PENDING,
      });

      await Website.create({
        userId: 'test-user',
        websiteName: 'provisioned-1',
        websiteTitle: 'Provisioned 1',
        htmlContent: '<html><body>2</body></html>',
        status: WebsiteStatus.PROVISIONED,
      });

      const response = await request(app)
        .get('/api/provisioner/websites/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
    });
  });

  describe('PUT /api/provisioner/websites/:id/status', () => {
    it('should update website status to provisioned', async () => {
      const website = await Website.create({
        userId: 'test-user',
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body>Test</body></html>',
        status: WebsiteStatus.PENDING,
      });

      const response = await request(app)
        .put(`/api/provisioner/websites/${website.id}/status`)
        .send({
          status: 'provisioned',
          podIpAddress: '10.244.0.5',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('provisioned');
      expect(response.body.data.podIpAddress).toBe('10.244.0.5');

      // Verify in database
      const updated = await Website.findByPk(website.id);
      expect(updated?.status).toBe('provisioned');
      expect(updated?.podIpAddress).toBe('10.244.0.5');
    });

    it('should update website status to failed with error message', async () => {
      const website = await Website.create({
        userId: 'test-user',
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body>Test</body></html>',
        status: WebsiteStatus.PENDING,
      });

      const response = await request(app)
        .put(`/api/provisioner/websites/${website.id}/status`)
        .send({
          status: 'failed',
          errorMessage: 'Pod creation failed',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('failed');
      expect(response.body.data.errorMessage).toBe('Pod creation failed');
    });

    it('should reject invalid status values', async () => {
      const website = await Website.create({
        userId: 'test-user',
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body>Test</body></html>',
        status: WebsiteStatus.PENDING,
      });

      const response = await request(app)
        .put(`/api/provisioner/websites/${website.id}/status`)
        .send({
          status: 'invalid-status',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid status');
    });

    it('should require podIpAddress when status is provisioned', async () => {
      const website = await Website.create({
        userId: 'test-user',
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body>Test</body></html>',
        status: WebsiteStatus.PENDING,
      });

      const response = await request(app)
        .put(`/api/provisioner/websites/${website.id}/status`)
        .send({
          status: 'provisioned',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('podIpAddress is required');
    });

    it('should require errorMessage when status is failed', async () => {
      const website = await Website.create({
        userId: 'test-user',
        websiteName: 'test-website',
        websiteTitle: 'Test Website',
        htmlContent: '<html><body>Test</body></html>',
        status: WebsiteStatus.PENDING,
      });

      const response = await request(app)
        .put(`/api/provisioner/websites/${website.id}/status`)
        .send({
          status: 'failed',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('errorMessage is required');
    });
  });
});

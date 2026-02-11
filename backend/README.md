# CloudSelf Backend API

Node.js/TypeScript backend API for the CloudSelf website self-service platform.

## Overview

The backend serves as the central data store and API layer for website provisioning requests. It provides REST APIs for both the frontend (user-facing) and the provisioner (internal service).

### Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database**: MySQL 8.0+ with Sequelize ORM
- **Testing**: Jest + Supertest
- **Validation**: Custom middleware

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration and database setup
│   │   ├── database.ts   # Sequelize config and migrations
│   │   └── index.ts      # App configuration
│   ├── controllers/      # Request handlers
│   │   └── WebsiteController.ts
│   ├── middleware/       # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── logger.ts
│   │   └── validation.ts
│   ├── models/           # Sequelize models
│   │   └── Website.ts
│   ├── routes/           # Route definitions
│   │   ├── websiteRoutes.ts
│   │   ├── provisionerRoutes.ts
│   │   └── health.ts
│   ├── services/         # Business logic
│   │   └── WebsiteService.ts
│   └── app.ts            # Express app setup
├── tests/
│   └── integration/      # Integration tests
│       └── website.test.ts
├── migrations/           # SQL migration files
│   └── 001_create_websites_table.sql
└── package.json

```

## Prerequisites

- Node.js 20+ and npm 10+
- MySQL 8.0+ (via Docker Compose recommended)
- Docker and Docker Compose (for local MySQL)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start MySQL Database

```bash
# From project root
docker-compose up -d
```

### 3. Configure Environment

Create `.env` file (or use defaults):

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cloudself
DB_USER=cloudself
DB_PASSWORD=cloudself_password

# Server
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 4. Run Database Migrations

```bash
npm run migrate
```

Or manually:

```bash
docker exec -i cloudself-mysql mysql -ucloudself -pcloudself_password cloudself < migrations/001_create_websites_table.sql
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`.

## API Endpoints

### User-Facing APIs

#### POST /api/websites
Create a new website provisioning request.

**Request:**
```json
{
  "websiteName": "my-site",
  "websiteTitle": "My Awesome Site",
  "htmlContent": "<html><body>Hello World</body></html>"
}
```

**Headers:**
- `X-User-Id`: User identifier (required)

**Response (201):**
```json
{
  "id": 1,
  "websiteName": "my-site",
  "websiteTitle": "My Awesome Site",
  "htmlContent": "<html><body>Hello World</body></html>",
  "status": "pending",
  "podIpAddress": null,
  "userId": "user-123",
  "errorMessage": null,
  "createdAt": "2026-02-06T10:00:00.000Z",
  "updatedAt": "2026-02-06T10:00:00.000Z"
}
```

**Validations:**
- `websiteName`: DNS-compliant (lowercase, alphanumeric, hyphens), 1-253 chars, unique
- `websiteTitle`: 1-255 chars
- `htmlContent`: Max 100KB

#### GET /api/websites
List websites for the authenticated user.

**Headers:**
- `X-User-Id`: User identifier (required)

**Response (200):**
```json
[
  {
    "id": 1,
    "websiteName": "my-site",
    "status": "provisioned",
    "podIpAddress": ":30080",
    ...
  }
]
```

#### GET /api/websites/:id
Get a specific website by ID.

**Headers:**
- `X-User-Id`: User identifier (required)

**Response (200):** Same as POST response

### Provisioner APIs

#### GET /api/provisioner/websites/pending
List all websites with status='pending' for provisioning.

**Response (200):**
```json
[
  {
    "id": 1,
    "website_name": "my-site",
    "page_title": "My Awesome Site",
    "html_content": "<html>...</html>",
    "user_id": "user-123"
  }
]
```

#### PUT /api/provisioner/websites/:id/status
Update website provisioning status.

**Request:**
```json
{
  "status": "provisioned",
  "pod_ip_address": ":30080",
  "error_message": null
}
```

**Response (200):**
```json
{
  "id": 1,
  "status": "provisioned",
  "podIpAddress": ":30080",
  ...
}
```

### Health Check

#### GET /health
Check backend and database health.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T10:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "services": {
    "api": "healthy",
    "database": "healthy"
  }
}
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- website.test.ts
```

### Integration Tests

Integration tests use a real MySQL database. Ensure MySQL is running:

```bash
docker-compose up -d
npm test
```

Tests cover:
- ✅ Website creation with validation
- ✅ Duplicate name rejection
- ✅ DNS name validation
- ✅ HTML size limits
- ✅ Status updates by provisioner
- ✅ User-scoped listing

## Development

### Code Style

The project uses TypeScript with strict type checking:

```bash
npm run type-check
```

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Run Production Build

```bash
npm start
```

## Database Schema

See [../specs/001-website-self-service/data-model.md](../specs/001-website-self-service/data-model.md) for complete schema.

**websites** table:
- `id`: Primary key
- `website_name`: Unique DNS-compliant name
- `page_title`: Display title
- `html_content`: HTML content (max 100KB)
- `status`: ENUM('pending', 'provisioned', 'failed')
- `pod_ip_address`: Service access URL (NodePort)
- `user_id`: User identifier
- `error_message`: Error details if failed
- `created_at`, `updated_at`: Timestamps

## Logging

The backend includes request logging and application event logging:

```typescript
import { logger } from './middleware/logger';

logger.info('Website created', { websiteName });
logger.warn('Validation failed', { errors });
logger.error('Database error', error);
```

All HTTP requests are logged with:
- Method, path, status code, response time
- Color-coded by status (✓ 2xx, ⚠️ 4xx, ❌ 5xx)

## Error Handling

Errors are handled by centralized middleware:

- **Validation errors**: 400 with detailed messages
- **Not found**: 404
- **Server errors**: 500 with safe error messages
- **Database errors**: Logged and returned as 500

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment (development/production) |
| `DB_HOST` | localhost | MySQL host |
| `DB_PORT` | 3306 | MySQL port |
| `DB_NAME` | cloudself | Database name |
| `DB_USER` | cloudself | Database user |
| `DB_PASSWORD` | cloudself_password | Database password |
| `FRONTEND_URL` | http://localhost:5173 | Frontend URL for CORS |

## Troubleshooting

### Can't Connect to MySQL

```bash
# Check MySQL is running
docker-compose ps

# Check connection
docker exec -it cloudself-mysql mysql -ucloudself -pcloudself_password -e "SELECT 1;"

# View logs
docker-compose logs mysql
```

### Migration Errors

```bash
# Run migrations manually
docker exec -i cloudself-mysql mysql -ucloudself -pcloudself_password cloudself < migrations/001_create_websites_table.sql

# Verify table
docker exec -it cloudself-mysql mysql -ucloudself -pcloudself_password cloudself -e "DESCRIBE websites;"
```

### Port Already in Use

```bash
# Change port in .env
PORT=3001

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## Architecture

The backend follows a layered architecture:

1. **Routes** → Define HTTP endpoints and validation
2. **Controllers** → Handle HTTP requests/responses
3. **Services** → Implement business logic
4. **Models** → Define database entities (Sequelize)
5. **Middleware** → Cross-cutting concerns (logging, errors, validation)

This separation allows:
- Easy testing of business logic
- Clear separation of concerns
- Reusable service methods
- Consistent error handling

## Related Documentation

- [API Specification](../specs/001-website-self-service/contracts/backend-api.yaml)
- [Data Model](../specs/001-website-self-service/data-model.md)
- [Feature Spec](../specs/001-website-self-service/spec.md)
- [Implementation Plan](../specs/001-website-self-service/plan.md)
- [Quickstart Guide](../specs/001-website-self-service/quickstart.md)

# Data Model: Website Self-Service Platform

**Feature**: Website Self-Service Platform  
**Created**: 2026-02-05  
**Related**: [spec.md](spec.md) | [plan.md](plan.md)

## Entities

### Website Request

**Purpose**: Stores user website provisioning requests and tracks their lifecycle status.

**Attributes**:
- `id` (UUID/Integer, Primary Key): Unique identifier for the website request
- `website_name` (String, Required, Unique, Max 253 chars): DNS-compliant website name (lowercase alphanumeric + hyphens, no spaces or special characters). Must be globally unique across all users.
- `page_title` (String, Required, Max 255 chars): Display title for the website's HTML page
- `html_content` (Text, Required, Max 100KB): User-provided HTML content to be served as index.html
- `status` (Enum, Required): Current provisioning status. Values: `pending`, `provisioned`, `failed`
- `pod_ip_address` (String, Nullable, Max 45 chars): Service access endpoint (NodePort URL or ClusterIP) once provisioned. Null for pending/failed websites. Format: `<minikube-ip>:<node-port>` for local development.
- `user_id` (String, Required, Max 255 chars): User identifier (session ID or user token). Used to filter websites per user.
- `error_message` (Text, Nullable): Error details if status is `failed`. Populated by provisioner when errors occur.
- `created_at` (Timestamp, Required, Auto-generated): When the website request was created
- `updated_at` (Timestamp, Required, Auto-updated): When the website request was last modified

**Constraints**:
- Unique index on `website_name` (enforce global uniqueness)
- Index on `status` (optimize provisioner queries for pending websites)
- Index on `user_id` (optimize user-specific website listings)
- Check constraint: `html_content` size <= 102400 bytes (100KB)
- Check constraint: `status` IN ('pending', 'provisioned', 'failed')

**Relationships**: None (single table design)

**Lifecycle**:
1. Created with status=`pending` when user submits form
2. Provisioner queries for status=`pending` records
3. Provisioner creates nginx Pod, ConfigMap, and NodePort Service in Kubernetes
4. Provisioner updates to status=`provisioned` + pod_ip_address (Service access URL) when resources are ready
5. Provisioner updates to status=`failed` + error_message if provisioning fails

## MySQL Schema

```sql
CREATE TABLE websites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    website_name VARCHAR(253) NOT NULL UNIQUE,
    page_title VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    status ENUM('pending', 'provisioned', 'failed') NOT NULL DEFAULT 'pending',
    pod_ip_address VARCHAR(45) NULL,
    user_id VARCHAR(255) NOT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_user_id (user_id),
    CONSTRAINT chk_html_size CHECK (LENGTH(html_content) <= 102400)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Kubernetes Custom Resource (CRD)

### WebsiteCRD

**Purpose**: Kubernetes-native representation of a website to be provisioned. Created by the provisioner controller.

**API Version**: `cloudself.dev/v1alpha1`  
**Kind**: `Website`

**Spec Fields**:
- `websiteName` (string, required): Matches website_name from database (DNS-compliant)
- `htmlContent` (string, required): Base64-encoded HTML content to be served

**Status Fields** (managed by provisioner):
- `phase` (string): Current phase: `Pending`, `Creating`, `Running`, `Failed`
- `podIP` (string): IP address of the created nginx pod
- `message` (string): Human-readable status message or error details
- `lastUpdateTime` (timestamp): When status was last updated

**Example CRD Instance**:
```yaml
apiVersion: cloudself.dev/v1alpha1
kind: Website
metadata:
  name: mysite
  labels:
    app: website
    component: nginx
    website-name: mysite
spec:
  websiteName: mysite
  htmlContent: PGgxPkhlbGxvIFdvcmxkPC9oMT4=  # Base64: <h1>Hello World</h1>
status:
  phase: Running
  podIP: 10.244.0.15
  message: "Website successfully provisioned"
  lastUpdateTime: "2026-02-05T15:00:00Z"
```

## Data Flow

### Website Creation Flow
1. User submits form (frontend) → POST /api/websites
2. Backend validates input (DNS name, 100KB limit, unique name)
3. Backend inserts record: `{website_name, page_title, html_content, status='pending', user_id}`
4. Backend returns success response with website ID
5. Frontend displays website in list with status "pending"

### Provisioning Flow
1. Provisioner polls: GET /api/provisioner/websites/pending
2. Backend queries: `SELECT * FROM websites WHERE status='pending'`
3. Backend returns list of pending websites
4. For each website:
   a. Provisioner creates Website CRD in Kubernetes
   b. Provisioner creates nginx pod with ConfigMap containing html_content
   c. Provisioner waits for pod Running status
   d. Provisioner calls: PUT /api/provisioner/websites/{id}/status
      Payload: `{status: 'provisioned', pod_ip_address: '10.244.0.15'}`
   e. Backend updates: `UPDATE websites SET status='provisioned', pod_ip_address='...', updated_at=NOW() WHERE id=...`

### Viewing Flow
1. User views "My Websites" (frontend) → GET /api/websites
2. Backend queries: `SELECT * FROM websites WHERE user_id=? ORDER BY created_at DESC`
3. Backend returns list with status and pod_ip_address (if provisioned)
4. Frontend displays list with status badges and IP links
5. User clicks IP link → Opens http://{pod_ip} in browser → Sees nginx serving their HTML

## Validation Rules

### Website Name Validation
- Pattern: `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$` (DNS RFC 1035 subdomain)
- Length: 1-63 characters
- Must start and end with alphanumeric
- Can contain hyphens in the middle
- No consecutive hyphens
- Examples:
  - ✅ Valid: `mysite`, `my-website`, `site123`
  - ❌ Invalid: `MyWebsite` (uppercase), `my_site` (underscore), `-mysite` (starts with hyphen), `my--site` (consecutive hyphens)

### HTML Content Validation
- Max size: 100KB (102,400 bytes)
- Encoding: UTF-8
- Optional: XSS sanitization (future enhancement)

### Status Transitions
- `pending` → `provisioned`: Normal flow (provisioner success)
- `pending` → `failed`: Provisioner encountered error
- `provisioned` → (no transitions): Terminal state
- `failed` → (no transitions): Terminal state (user must create new request)

## Migration Strategy

### Initial Migration (001_create_websites_table.sql)
```sql
CREATE TABLE websites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    website_name VARCHAR(253) NOT NULL UNIQUE,
    page_title VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    status ENUM('pending', 'provisioned', 'failed') NOT NULL DEFAULT 'pending',
    pod_ip_address VARCHAR(45) NULL,
    user_id VARCHAR(255) NOT NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_user_id (user_id),
    CONSTRAINT chk_html_size CHECK (LENGTH(html_content) <= 102400)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Future Migrations (if needed)
- Add `deleted_at` for soft deletes
- Add `last_accessed_at` for analytics
- Add `resource_limits` for custom pod resource requests

## Testing Data

### Test Records
```json
[
  {
    "website_name": "test-site-1",
    "page_title": "Test Site 1",
    "html_content": "<h1>Test Site 1</h1><p>This is a test.</p>",
    "status": "pending",
    "user_id": "user-123"
  },
  {
    "website_name": "test-site-2",
    "page_title": "Test Site 2",
    "html_content": "<h1>Test Site 2</h1>",
    "status": "provisioned",
    "pod_ip_address": "10.244.0.10",
    "user_id": "user-123"
  },
  {
    "website_name": "other-user-site",
    "page_title": "Other User Site",
    "html_content": "<h1>Other User</h1>",
    "status": "provisioned",
    "pod_ip_address": "10.244.0.11",
    "user_id": "user-456"
  }
]
```

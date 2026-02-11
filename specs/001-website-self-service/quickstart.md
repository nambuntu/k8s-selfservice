# CloudSelf Website Self-Service Platform - Quickstart Guide

**Last Updated**: 2026-02-06  
**Estimated Setup Time**: 10-15 minutes

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (version 20.10+) and **Docker Compose** (version 2.0+)
- **Minikube** (version 1.30+) with kubectl configured
- **Node.js** (version 20 LTS) and **npm** (version 10+)
- **Go** (version 1.21+)
- **Kubebuilder** (version 4.11+)
- **Git** for version control

## Quick Start (One-Command Setup)

From the project root directory:

```bash
./setup.sh
```

This script will:
1. Start MySQL database via Docker Compose
2. Start Minikube cluster
3. Install backend dependencies and run database migrations
4. Install frontend dependencies
5. Build and deploy the provisioner to Minikube

## Manual Setup

If you prefer step-by-step setup or need to troubleshoot:

### 1. Start MySQL Database

```bash
cd /path/to/cloudself
docker-compose up -d
```

Wait for MySQL to be ready (check with `docker-compose logs mysql`).

### 2. Setup Backend

```bash
cd backend
npm install
npm run migrate  # Run database migrations
npm run dev      # Start backend server (port 3000)
```

The backend API will be available at `http://localhost:3000`.

### 3. Setup Frontend

```bash
cd frontend
npm install
npm run dev      # Start frontend dev server (port 5173)
```

The web UI will be available at `http://localhost:5173`.

### 4. Start Minikube

```bash
minikube start --driver=docker
eval $(minikube docker-env)  # Use Minikube's Docker daemon
```

### 5. Deploy Provisioner

```bash
cd provisioner

# Install CRDs
make install

# Build and run locally (for development)
make run

# OR deploy to Minikube (for production-like testing)
make docker-build docker-push deploy IMG=cloudself-provisioner:latest
```

## Verification

### Test Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "services": {
    "api": "healthy",
    "database": "healthy"
  }
}
```

### Test Frontend

1. Open http://localhost:5173 in your browser
2. You should see the website submission form

### Test Provisioner

```bash
# Check if provisioner is running
kubectl get pods -A | grep provisioner

# Check CRD installation
kubectl get crd websites.websites.cloudself.dev
```

## Create Your First Website

1. Open the frontend UI at http://localhost:5173
2. Fill in the form:
   - **Website Name**: `my-test-site` (DNS-compliant, lowercase, no spaces)
   - **Page Title**: `My Test Website`
   - **HTML Content**: Paste simple HTML like:
     ```html
     <html><body><h1>Hello World!</h1></body></html>
     ```
3. Click **Create Website**
4. Wait 30-60 seconds for provisioning
5. Refresh the page - your website should show status "provisioned"
6. Click the NodePort link or access via: `http://$(minikube ip):<node-port>`

## Testing the Complete Flow

```bash
# 1. Create a test website via API
curl -X POST http://localhost:3000/api/websites \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{
    "websiteName": "test-123",
    "websiteTitle": "Test Site",
    "htmlContent": "<html><body><h1>It works!</h1></body></html>"
  }'

# 2. Check database for pending website
docker exec -it cloudself-mysql mysql -ucloudself -pcloudself_password cloudself \
  -e "SELECT id, website_name, status FROM websites WHERE website_name='test-123';"

# 3. Wait 30 seconds, then check provisioning status
curl http://localhost:3000/api/websites | jq '.[] | select(.websiteName=="test-123")'

# 4. Check Kubernetes resources
kubectl get websites,pods,services -l cloudself.dev/website=test-123

# 5. Access the provisioned website
MINIKUBE_IP=$(minikube ip)
NODE_PORT=$(kubectl get service test-123 -o jsonpath='{.spec.ports[0].nodePort}')
curl http://$MINIKUBE_IP:$NODE_PORT
```

## Troubleshooting

### MySQL Connection Failed

**Symptom**: Backend can't connect to MySQL

**Solution**:
```bash
# Check MySQL is running
docker-compose ps

# Check MySQL logs
docker-compose logs mysql

# Restart if needed
docker-compose restart mysql

# Verify connection
docker exec -it cloudself-mysql mysql -ucloudself -pcloudself_password -e "SELECT 1;"
```

### Minikube Issues

**Symptom**: Provisioner can't connect to Minikube

**Solution**:
```bash
# Check Minikube status
minikube status

# Restart Minikube
minikube delete
minikube start --driver=docker

# Re-deploy provisioner
cd provisioner && make install deploy
```

### Pod Stuck in Pending

**Symptom**: Website shows "pending" forever

**Solution**:
```bash
# Check provisioner logs
kubectl logs -n cloudself-system deployment/cloudself-provisioner-controller-manager

# Check if backend is accessible from provisioner
kubectl run -it --rm debug --image=curlimages/curl --restart=Never \
  -- curl http://host.minikube.internal:3000/health

# If backend not accessible, ensure provisioner can reach host
minikube ssh "curl http://host.minikube.internal:3000/health"
```

### Frontend Not Loading

**Symptom**: Blank page or connection refused

**Solution**:
```bash
# Check frontend dev server
cd frontend && npm run dev

# Check backend is running
curl http://localhost:3000/health

# Check CORS configuration in backend/src/config/index.ts
```

### Database Migration Errors

**Symptom**: Table doesn't exist errors

**Solution**:
```bash
# Run migrations manually
cd backend
docker exec -i cloudself-mysql mysql -ucloudself -pcloudself_password cloudself < migrations/001_create_websites_table.sql

# Verify table exists
docker exec -it cloudself-mysql mysql -ucloudself -pcloudself_password cloudself \
  -e "DESCRIBE websites;"
```

## Stopping the System

```bash
# Stop backend (Ctrl+C in terminal)
# Stop frontend (Ctrl+C in terminal)

# Stop Minikube
minikube stop

# Stop MySQL
docker-compose down
```

## Clean Up Everything

```bash
# Remove all Kubernetes resources
cd provisioner && make uninstall

# Delete Minikube cluster
minikube delete

# Stop and remove Docker containers
docker-compose down -v

# Remove node_modules (optional)
rm -rf backend/node_modules frontend/node_modules

# Remove build artifacts (optional)
rm -rf frontend/dist provisioner/bin
```

## Development Workflow

### Backend Development

```bash
cd backend
npm run dev  # Auto-reload on file changes
npm test     # Run integration tests
```

### Frontend Development

```bash
cd frontend
npm run dev   # Auto-reload with HMR
npm test      # Run component tests
npm run build # Production build
```

### Provisioner Development

```bash
cd provisioner
make run              # Run locally (connects to local kubeconfig)
make test             # Run unit tests
make docker-build     # Build container image
kubectl logs -f -l control-plane=controller-manager  # View logs
```

## Next Steps

- Read [spec.md](spec.md) for feature details
- Read [plan.md](plan.md) for architecture overview
- Check [data-model.md](data-model.md) for database schema
- Review [contracts/](contracts/) for API specifications
- See component READMEs: [backend/README.md](../../backend/README.md), [frontend/README.md](../../frontend/README.md), [provisioner/README.md](../../provisioner/README.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review component-specific READMEs
3. Check provisioner and backend logs
4. Verify all prerequisites are correctly installed

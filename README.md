# CloudSelf - Kubernetes Website Self-Service Platform

A self-service platform for provisioning simple websites on Kubernetes. Users can submit website requests through a web interface, and the system automatically provisions nginx pods with their custom HTML content.
![Simple kubernetes selfservice platform where user can use a web interface to create and provision simple website with nginx in kubernetes platform](docs/web-ui.jpg)
## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   Frontend  │──────│   Backend   │──────│    MySQL     │
│  (React +   │ HTTP │  (Node.js + │      │   Database   │
│    Vite)    │      │   Express)  │      │              │
└─────────────┘      └─────────────┘      └──────────────┘
                            │
                            │ REST API
                            │ (polling)
                            ▼
                     ┌─────────────┐      ┌──────────────┐
                     │ Provisioner │──────│  Kubernetes  │
                     │  (Go +      │ API  │   Cluster    │
                     │ Kubebuilder)│      │  (Minikube)  │
                     └─────────────┘      └──────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │ Website CRD │
                     │  + Nginx    │
                     │    Pods     │
                     └─────────────┘
```

## Components

- **Frontend**: React + Vite UI for website submission and status viewing
- **Backend**: Node.js REST API for website management and provisioner integration
- **Provisioner**: Go-based Kubernetes controller (Kubebuilder) for automatic pod provisioning
- **MySQL**: Database storing website requests and provisioning status

## Features

- ✅ Web-based UI for website creation (name, title, HTML content)
- ✅ DNS-compliant website name validation
- ✅ Automatic Kubernetes Custom Resource creation
- ✅ Nginx pod provisioning with custom HTML content
- ✅ Real-time provisioning status updates
- ✅ Pod IP address display for accessing websites
- ✅ 100KB HTML content size limit
- ✅ Local development with Docker Compose + Minikube

![Real-time provisioning status updates](docs/website-provisioner-k8s-controller-log.jpg)

## Prerequisites

- **Docker Desktop** or **Docker Engine** + **Docker Compose**
- **Minikube** (for Kubernetes cluster)
- **kubectl** (Kubernetes CLI)
- **Node.js 20 LTS** (for local development)
- **Go 1.21+** (for provisioner development)
- **Kubebuilder 3.x** (for provisioner scaffolding)

## Quick Start

### One-Command Setup

```bash
./setup.sh
```

This script will:
1. Check prerequisites
2. Start Docker Compose services (MySQL + Backend)
3. Setup Minikube cluster
4. Apply Custom Resource Definitions
5. Run database migrations

### Manual Setup

#### 1. Start Backend and MySQL

```bash
docker-compose up -d mysql backend
```

#### 2. Setup Minikube

```bash
./minikube-setup.sh
```

#### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:5173

#### 4. Deploy Provisioner (after implementation)

```bash
cd provisioner
make install  # Install CRDs
make run      # Run controller
```

## Development

### Backend

```bash
cd backend
npm install
npm run dev          # Start development server
npm test             # Run tests
npm run migrate      # Run database migrations
```

Backend API: http://localhost:3000

### Frontend

```bash
cd frontend
npm install
npm run dev          # Start development server
npm test             # Run tests
```

### Provisioner

```bash
cd provisioner
make build           # Build controller
make run             # Run locally
eval $(minikube docker-env) && cd provisioner && make docker-build # Build image in minikube
make docker-build    # Build Docker image
make deploy          # Deploy to Kubernetes
```

## API Endpoints

### User Endpoints

- `POST /api/websites` - Create website request
- `GET /api/websites` - List user's websites
- `GET /api/websites/:id` - Get website details

### Provisioner Endpoints

- `GET /api/provisioner/websites/pending` - Get pending websites
- `PUT /api/provisioner/websites/:id/status` - Update provisioning status

## Project Structure

```
cloudself/
├── frontend/           # React + Vite UI
├── backend/            # Node.js REST API
├── provisioner/        # Go Kubernetes controller
├── specs/              # Feature specifications
├── docker-compose.yml  # Local development services
├── minikube-setup.sh   # Minikube initialization
└── setup.sh            # One-command setup
```

## User Stories

1. **Create Website Request (P1)** - Users submit website specifications via web form
2. **Automatic Provisioning (P2)** - Provisioner creates CRDs and nginx pods automatically
3. **View Provisioned Website (P3)** - Users see status and access websites via pod IP

## Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Provisioner tests
cd provisioner && make test
```

## Troubleshooting

### Docker Issues

- **MySQL connection failed**: Wait for MySQL to be healthy (`docker-compose logs mysql`)
- **Port already in use**: Stop conflicting services or change ports in docker-compose.yml

### Minikube Issues

- **Minikube won't start**: Ensure VM resources available (4GB RAM minimum)
- **CRD not found**: Run `kubectl apply -f provisioner/config/crd/bases/`

### Common Issues

- **Backend can't connect to MySQL**: Check DB_HOST in .env (use `mysql` for Docker Compose, `localhost` for local)
- **Frontend API calls fail**: Verify VITE_API_URL in frontend/.env

## Contributing

See [specs/001-website-self-service/](specs/001-website-self-service/) for detailed specifications.

## License

MIT

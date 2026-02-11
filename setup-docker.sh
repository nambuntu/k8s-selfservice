#!/usr/bin/env bash

set -e

echo "================================================"
echo "CloudSelf Docker Compose Setup (Development)"
echo "================================================"

# Check prerequisites
echo "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    echo "Please install Docker Desktop or Docker Engine"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: docker-compose is not installed"
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"

# Start Docker Compose services
echo ""
echo "Starting Docker Compose services..."
docker-compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 15

# Run database migrations
echo ""
echo "Running database migrations..."
docker-compose exec -T backend npm run migrate || echo "⚠ Migrations will run when backend is fully ready"

# Display status
echo ""
echo "================================================"
echo "Setup Complete! 🎉"
echo "================================================"
echo ""
echo "Services running:"
echo "  - MySQL: localhost:3306"
echo "  - Backend API: http://localhost:3000"
echo "  - Frontend: http://localhost:5173"
echo ""
echo "Access URLs:"
echo "  - Frontend UI: http://localhost:5173"
echo "  - Backend API: http://localhost:3000"
echo "  - Health Check: http://localhost:3000/health"
echo ""
echo "View logs:"
echo "  - All services: docker-compose logs -f"
echo "  - Backend only: docker-compose logs -f backend"
echo "  - Frontend only: docker-compose logs -f frontend"
echo ""
echo "To stop services:"
echo "  - Stop: docker-compose stop"
echo "  - Stop and remove: docker-compose down"
echo "  - Stop and remove volumes: docker-compose down -v"
echo ""
echo "Note: For Kubernetes deployment, use ./setup.sh instead"
echo "================================================"

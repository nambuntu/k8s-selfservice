#!/usr/bin/env bash

set -e

echo "================================================"
echo "CloudSelf One-Command Kubernetes Setup"
echo "================================================"

# Check prerequisites
echo "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    echo "Please install Docker Desktop or Docker Engine"
    exit 1
fi

# Check minikube
if ! command -v minikube &> /dev/null; then
    echo "ERROR: minikube is not installed"
    echo "Please install minikube: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
fi

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo "ERROR: kubectl is not installed"
    echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check Go (needed for provisioner)
if ! command -v go &> /dev/null; then
    echo "ERROR: Go is not installed"
    echo "Please install Go: https://golang.org/doc/install"
    exit 1
fi

echo "✓ All prerequisites installed"

# Start minikube if not running
echo ""
echo "Starting Minikube cluster..."
if minikube status &> /dev/null; then
    echo "✓ Minikube is already running"
else
    minikube start --memory=4096 --cpus=2
    echo "✓ Minikube cluster started"
fi

# Set docker environment to use minikube's docker daemon
echo ""
echo "Configuring Docker to use Minikube's daemon..."
eval $(minikube docker-env)
echo "✓ Docker environment configured"

# Check if Docker login might be needed
echo ""
echo "Checking Docker authentication..."
if ! docker pull node:20-alpine 2>&1 | grep -q "toomanyrequests"; then
    echo "✓ Docker authentication successful or not required"
else
    echo "⚠ Docker rate limit detected. Please authenticate:"
    echo "  Run: docker login"
    echo "  Then re-run this script"
    exit 1
fi

# Build backend image
echo ""
echo "Building backend Docker image..."
if ! docker build -t cloudself-backend:latest ./backend; then
    echo "✗ Backend image build failed"
    echo "If you see rate limit errors, please run: docker login"
    exit 1
fi
echo "✓ Backend image built"

# Build frontend image
echo ""
echo "Building frontend Docker image..."
if ! docker build -t cloudself-frontend:latest ./frontend; then
    echo "✗ Frontend image build failed"
    exit 1
fi
echo "✓ Frontend image built"

# Build provisioner image
echo ""
echo "Building provisioner Docker image..."
if ! docker build -t cloudself-provisioner:latest ./provisioner; then
    echo "✗ Provisioner image build failed"
    exit 1
fi
echo "✓ Provisioner image built"

# Generate provisioner CRD if it doesn't exist
echo ""
if [ ! -f "provisioner/config/crd/bases/websites.cloudself.dev_websites.yaml" ]; then
    echo "Generating provisioner CRD..."
    cd provisioner
    if [ ! -f "bin/controller-gen" ]; then
        echo "Installing controller-gen..."
        mkdir -p bin
        GOBIN=$(pwd)/bin go install sigs.k8s.io/controller-tools/cmd/controller-gen@v0.14.0
    fi
    ./bin/controller-gen rbac:roleName=manager-role crd webhook paths="./..." output:crd:artifacts:config=config/crd/bases
    cd ..
    echo "✓ CRD generated"
else
    echo "✓ CRD already exists, skipping generation"
fi

# Apply Kubernetes manifests
echo ""
echo "Deploying to Kubernetes..."
kubectl apply -f k8s/namespace.yaml
echo "✓ Namespace created"

# Apply Website CRD
echo ""
echo "Applying Website Custom Resource Definition..."
kubectl apply -f provisioner/config/crd/bases/websites.cloudself.dev_websites.yaml
echo "✓ Website CRD applied"

kubectl apply -f k8s/mysql.yaml
echo "✓ MySQL deployed"

kubectl apply -f k8s/backend.yaml
echo "✓ Backend deployed"

kubectl apply -f k8s/frontend.yaml
echo "✓ Frontend deployed"

kubectl apply -f k8s/provisioner.yaml
echo "✓ Provisioner deployed"

# Wait for MySQL to be ready
echo ""
echo "Waiting for MySQL to be ready..."
kubectl wait --for=condition=ready pod -l app=mysql -n cloudself --timeout=180s
echo "✓ MySQL is ready"

# Wait for backend to be ready
echo ""
echo "Waiting for Backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n cloudself --timeout=180s
echo "✓ Backend is ready"

# Run database migrations
echo ""
echo "Running database migrations..."
BACKEND_POD=$(kubectl get pods -n cloudself -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n cloudself $BACKEND_POD -- npm run migrate || echo "⚠ Migrations may need to be run manually"

# Wait for frontend to be ready
echo ""
echo "Waiting for Frontend to be ready..."
kubectl wait --for=condition=ready pod -l app=frontend -n cloudself --timeout=180s
echo "✓ Frontend is ready"

# Wait for provisioner to be ready
echo ""
echo "Waiting for Provisioner to be ready..."
kubectl wait --for=condition=ready pod -l app=provisioner -n cloudself --timeout=180s
echo "✓ Provisioner is ready"

# Get minikube IP
MINIKUBE_IP=$(minikube ip)

# Display status
echo ""
echo "================================================"
echo "Setup Complete! 🎉"
echo "================================================"
echo ""
echo "Services running in Kubernetes:"
echo "  - MySQL: mysql.cloudself.svc.cluster.local:3306"
echo "  - Backend API: http://${MINIKUBE_IP}:30000"
echo "  - Frontend: http://${MINIKUBE_IP}:30080"
echo "  - Provisioner: Running in cloudself namespace"
echo ""
echo "Access URLs:"
echo "  - Frontend UI: http://${MINIKUBE_IP}:30080"
echo "  - Backend API: http://${MINIKUBE_IP}:30000"
echo "  - Health Check: http://${MINIKUBE_IP}:30000/health"
echo ""
echo "Kubernetes Commands:"
echo "  - View pods: kubectl get pods -n cloudself"
echo "  - View backend logs: kubectl logs -n cloudself -l app=backend"
echo "  - View provisioner logs: kubectl logs -n cloudself -l app=provisioner"
echo "  - Dashboard: minikube dashboard"
echo ""
echo "To test the provisioner:"
echo "  - Create a Website resource to trigger provisioning"
echo "  - Check website CRDs: kubectl get websites -n cloudself"
echo ""
echo "To stop services:"
echo "  - Delete deployments: kubectl delete namespace cloudself"
echo "  - Stop minikube: minikube stop"
echo "================================================"

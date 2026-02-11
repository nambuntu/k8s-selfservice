#!/usr/bin/env bash

set -e

echo "================================================"
echo "CloudSelf Cleanup Script"
echo "================================================"

# Ask for confirmation
read -p "This will delete all CloudSelf resources. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled"
    exit 0
fi

# Delete Kubernetes resources
echo ""
echo "Deleting Kubernetes resources..."
if kubectl get namespace cloudself &> /dev/null; then
    kubectl delete namespace cloudself
    echo "✓ Kubernetes namespace deleted"
else
    echo "✓ No Kubernetes resources found"
fi

# Stop and remove Docker Compose services
echo ""
echo "Stopping Docker Compose services..."
if [ -f "docker-compose.yml" ]; then
    docker-compose down -v
    echo "✓ Docker Compose services stopped"
fi

# Stop minikube (optional)
echo ""
read -p "Do you want to stop minikube? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    minikube stop
    echo "✓ Minikube stopped"
fi

# Delete minikube (optional)
echo ""
read -p "Do you want to delete the minikube cluster? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    minikube delete
    echo "✓ Minikube cluster deleted"
fi

echo ""
echo "================================================"
echo "Cleanup Complete!"
echo "================================================"

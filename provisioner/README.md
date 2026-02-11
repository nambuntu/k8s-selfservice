# CloudSelf Provisioner

Kubernetes operator for provisioning nginx-based static websites on-demand.

## Overview

A Kubebuilder-based Kubernetes controller that watches `Website` custom resources and provisions nginx pods with user-provided HTML content. Each website is exposed via a NodePort Service for external access.

### Tech Stack

- **Framework**: Kubebuilder v4.11.1
- **Language**: Go 1.25.3
- **Runtime**: controller-runtime v0.23.1
- **Kubernetes**: 1.35.0
- **Testing**: Ginkgo v2.22.2 + Gomega v1.36.2

## Project Structure

```
provisioner/
├── api/v1alpha1/                  # CRD definitions
│   ├── website_types.go           # Website CRD struct
│   └── zz_generated.deepcopy.go   # Generated code
├── controllers/                   # Reconciliation logic
│   ├── website_controller.go      # Main controller
│   └── suite_test.go              # Test suite setup
├── internal/nginx/                # Nginx resource builders
│   └── pod_builder.go             # ConfigMap, Pod, Service builders
├── config/                        # Kubernetes manifests
│   ├── crd/                       # CRD manifests
│   ├── rbac/                      # RBAC rules
│   ├── manager/                   # Manager deployment
│   └── samples/                   # Example CRs
├── cmd/main.go                    # Entrypoint
└── Makefile                       # Build automation
```

## Prerequisites

- Go 1.25 or later
- Kubernetes cluster (Minikube, kind, or cloud)
- kubectl configured for cluster access
- Kubebuilder v4+ (for development)

## Quick Start

### 1. Install CRDs

```bash
make install
```

This installs the \`Website\` CRD into your cluster.

### 2. Run Controller Locally

```bash
make run
```

Controller runs outside the cluster, watches for \`Website\` resources.

### 3. Create a Website

```bash
kubectl apply -f config/samples/cloudself_v1alpha1_website.yaml
```

### 4. Check Website Status

```bash
kubectl get websites
kubectl describe website website-sample
```

### 5. Access Website

```bash
# Get the NodePort
kubectl get svc website-sample-svc -o jsonpath='{.spec.ports[0].nodePort}'

# Access on Minikube
minikube service website-sample-svc
```

## Development

### Generate Code

After modifying CRD structs:

```bash
make generate
```

Regenerates DeepCopy methods and other boilerplate.

### Update Manifests

After changing CRD markers or RBAC annotations:

```bash
make manifests
```

Regenerates CRD YAML and RBAC manifests.

### Run Tests

```bash
make test
```

Runs unit and integration tests with envtest (local Kubernetes API server).

### Build Binary

```bash
make build
```

Creates \`bin/manager\` executable.

### Build Docker Image

```bash
make docker-build docker-push IMG=<registry>/provisioner:tag
```

### Deploy to Cluster

```bash
make deploy IMG=<registry>/provisioner:tag
```

Deploys controller as a Deployment in \`provisioner-system\` namespace.

## Custom Resource Definition (CRD)

### Website Resource

The \`Website\` CRD represents a static website provisioning request:

```yaml
apiVersion: cloudself.dev/v1alpha1
kind: Website
metadata:
  name: my-website
spec:
  websiteName: my-site
  htmlContent: |
    <html>
      <head><title>My Site</title></head>
      <body><h1>Hello World!</h1></body>
    </html>
  backendId: "1"
  userId: "user-123"
```

### Spec Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`websiteName\` | string | Yes | DNS-compliant name for the website |
| \`htmlContent\` | string | Yes | HTML content to serve |
| \`backendId\` | string | Yes | Backend database record ID |
| \`userId\` | string | Yes | User ID for ownership tracking |

### Status Fields

| Field | Type | Description |
|-------|------|-------------|
| \`phase\` | string | Current phase: Pending, Provisioned, Failed |
| \`podName\` | string | Name of the nginx pod |
| \`podIpAddress\` | string | Service access URL (:<node-port>) |
| \`lastUpdated\` | string | RFC3339 timestamp of last update |
| \`message\` | string | Human-readable status message |

### Phase Transitions

1. **Pending** → Creating ConfigMap with HTML content
2. **Pending** → Creating nginx Pod
3. **Pending** → Creating NodePort Service
4. **Pending** → Waiting for Pod to be Ready
5. **Pending** → Waiting for NodePort assignment
6. **Provisioned** → Pod Ready + Service has NodePort
7. **Failed** → Error during any step

## Controller Logic

### Reconciliation Loop

The controller reconciles each \`Website\` resource:

```go
func (r *WebsiteReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    // 1. Fetch Website resource
    // 2. Create ConfigMap with HTML content
    // 3. Create nginx Pod mounting ConfigMap
    // 4. Create NodePort Service for external access
    // 5. Wait for Pod to be Ready
    // 6. Wait for Service NodePort assignment
    // 7. Update Website status with access URL
    // 8. Requeue if not ready
}
```

### Resource Ownership

All created resources (ConfigMap, Pod, Service) have \`OwnerReferences\` set to the \`Website\` resource. This ensures:

- Automatic cleanup when \`Website\` is deleted
- Garbage collection by Kubernetes
- Proper lifecycle management

### Idempotency

The controller is idempotent:

- Creating existing resources is a no-op
- Status updates only happen when changes occur
- Safe to run multiple reconciliation loops

### Error Handling

- Transient errors (e.g., API server unavailable) → Requeue
- Permanent errors (e.g., invalid HTML) → Mark Failed
- Pod not Ready → Requeue after 10 seconds
- Service NodePort not assigned → Requeue after 5 seconds

## Nginx Resource Builder

### ConfigMap

Stores HTML content as \`index.html\`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: <website-name>-html
data:
  index.html: |
    <html>...</html>
```

### Pod

Nginx pod serving the HTML:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: <website-name>
  labels:
    app: nginx-website
    website: <website-name>
spec:
  containers:
  - name: nginx
    image: nginx:1.27-alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: html-content
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html-content
    configMap:
      name: <website-name>-html
```

### Service

NodePort Service for external access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: <website-name>-svc
spec:
  type: NodePort
  selector:
    app: nginx-website
    website: <website-name>
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
    # nodePort assigned automatically (30000-32767)
```

## Testing

### Unit Tests

Test the controller reconciliation logic:

```bash
make test
```

Tests use \`envtest\` which runs a local Kubernetes API server.

### Test Coverage

```bash
go test -coverprofile=cover.out ./...
go tool cover -html=cover.out
```

### Integration Tests

```bash
# Run against a real cluster
make run &
kubectl apply -f config/samples/
kubectl get websites
```

### Test Structure

```go
var _ = Describe("Website Controller", func() {
    Context("When creating a Website", func() {
        It("Should create ConfigMap, Pod, and Service", func() {
            // 1. Create Website CR
            // 2. Wait for reconciliation
            // 3. Verify ConfigMap exists
            // 4. Verify Pod exists
            // 5. Verify Service exists
            // 6. Verify Website status updated
        })
    })
})
```

## RBAC Permissions

The controller requires the following permissions:

```yaml
# Website CRD
- apiGroups: [cloudself.dev]
  resources: [websites, websites/status]
  verbs: [get, list, watch, update, patch]

# Core resources
- apiGroups: [""]
  resources: [configmaps, pods, services]
  verbs: [get, list, watch, create, update, patch, delete]

# Events
- apiGroups: [""]
  resources: [events]
  verbs: [create, patch]
```

## Monitoring & Debugging

### Watch Controller Logs

```bash
# Running locally
make run

# Running in cluster
kubectl logs -n provisioner-system deployment/provisioner-controller-manager -f
```

### Check Website Status

```bash
kubectl get websites
kubectl describe website <name>
```

### Check Created Resources

```bash
# ConfigMap
kubectl get configmap <website-name>-html

# Pod
kubectl get pod <website-name>
kubectl logs <website-name>

# Service
kubectl get svc <website-name>-svc
kubectl describe svc <website-name>-svc
```

### Common Issues

**Website stuck in Pending**:
```bash
# Check pod status
kubectl describe pod <website-name>

# Common causes:
# - Image pull failure
# - Insufficient resources
# - ConfigMap not created
```

**Service has no NodePort**:
```bash
# Check service
kubectl get svc <website-name>-svc -o yaml

# Service type should be NodePort
# NodePort will be assigned automatically
```

**Controller not reconciling**:
```bash
# Check controller is running
kubectl get pods -n provisioner-system

# Check controller logs
kubectl logs -n provisioner-system deployment/provisioner-controller-manager
```

## Metrics & Observability

The controller exposes Prometheus metrics:

```bash
# Metrics endpoint (when deployed)
curl http://\<controller-pod\>:8080/metrics
```

Key metrics:
- \`controller_runtime_reconcile_total\` - Total reconciliations
- \`controller_runtime_reconcile_errors_total\` - Failed reconciliations
- \`controller_runtime_reconcile_time_seconds\` - Reconciliation duration

## Performance Tuning

### Concurrent Reconciliations

In \`cmd/main.go\`:

```go
err = ctrl.NewControllerManagedBy(mgr).
    For(&cloudselfv1alpha1.Website{}).
    WithOptions(controller.Options{
        MaxConcurrentReconciles: 5, // Increase for more throughput
    }).
    Complete(r)
```

### Requeue Delays

In \`controllers/website_controller.go\`:

```go
// Requeue after 10 seconds if Pod not ready
return ctrl.Result{RequeueAfter: 10 * time.Second}, nil

// Requeue after 5 seconds if NodePort not assigned
return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
```

### Leader Election

For high availability, deploy multiple controller replicas with leader election enabled (default).

## Architecture Decisions

### Why NodePort Services?

- **External Access**: Pod IPs are not accessible outside Kubernetes
- **Stability**: Services provide stable endpoints even if Pods restart
- **Load Balancing**: Services handle traffic distribution
- **Port Mapping**: NodePort allows predictable access patterns

### Why ConfigMaps for HTML?

- **Size Limit**: ConfigMaps support up to 1MB (plenty for HTML)
- **Native**: No external storage required
- **Mount**: Easy to mount into nginx container
- **Updates**: Can update HTML by replacing ConfigMap (not implemented yet)

### Why Nginx Alpine?

- **Small**: nginx:1.27-alpine is ~40MB vs ~150MB for full nginx
- **Secure**: Alpine has minimal attack surface
- **Fast**: Quick to pull and start

## Security Considerations

### HTML Sanitization

HTML content is **not sanitized** by the provisioner. The backend is responsible for:
- XSS prevention
- Content validation
- Size limits

### Network Policies

Consider adding NetworkPolicies to:
- Restrict egress from nginx pods
- Isolate namespaces
- Limit access to NodePort range

### RBAC

Controller runs with minimal permissions:
- Only manages resources in its namespace
- Cannot access Secrets or ServiceAccounts
- Cannot modify cluster-wide resources

## Upgrading

### Kubebuilder Upgrade

When upgrading Kubebuilder:

1. Check compatibility matrix
2. Update \`go.mod\` dependencies
3. Regenerate code: \`make generate manifests\`
4. Update Docker base images
5. Run full test suite

### CRD Versioning

When changing the CRD schema:

1. Add new version (e.g., v1alpha2)
2. Implement conversion webhooks
3. Maintain backwards compatibility
4. Document migration path

## Related Documentation

- [Feature Spec](../specs/001-website-self-service/spec.md)
- [Implementation Plan](../specs/001-website-self-service/plan.md)
- [Data Model](../specs/001-website-self-service/data-model.md)
- [API Contracts](../specs/001-website-self-service/contracts/)
- [Quickstart Guide](../specs/001-website-self-service/quickstart.md)

## Contributing

### Code Style

Follow standard Go conventions:
- \`gofmt\` for formatting
- \`golint\` for linting
- Meaningful variable names
- Comments on exported functions

### Commit Messages

Use conventional commits:
- \`feat:\` New features
- \`fix:\` Bug fixes
- \`docs:\` Documentation
- \`test:\` Tests
- \`refactor:\` Code refactoring

### Pull Requests

1. Create feature branch
2. Make changes with tests
3. Run \`make test manifests generate\`
4. Ensure all tests pass
5. Submit PR with description

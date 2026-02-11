# Implementation Plan: Website Self-Service Platform

**Branch**: `001-website-self-service` | **Date**: 2026-02-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-website-self-service/spec.md`

## Summary

Build a Kubernetes-native self-service platform enabling users to create and manage simple websites. Users submit website specifications (name, title, HTML content) through a React web interface. The Node.js backend stores requests in MySQL and exposes APIs for both the frontend and the provisioner. The provisioner is a Go-based Kubernetes controller built with Kubebuilder that watches for pending websites via backend API polling, creates Custom Resource Definitions (CRDs) and reconciles nginx pods with Kubernetes Services (NodePort), then updates the backend with provisioning status. Users can view their websites' status and access them via Service endpoints accessible from outside the cluster. The entire system runs locally using Docker Compose and Minikube.

## Technical Context

**Language/Version**: 
- Frontend: JavaScript/TypeScript with React 18+
- Backend: Node.js 20 LTS with TypeScript
- Provisioner: Go 1.21+

**Primary Dependencies**: 
- Frontend: React 18, Vite 5, Axios, React Hook Form
- Backend: Express.js or Fastify, Sequelize or TypeORM, MySQL2
- Provisioner: Kubebuilder 3.x, controller-runtime, client-go

**Storage**: MySQL 8.0+ (containerized for local development)

**Testing**: 
- Frontend: Vitest + React Testing Library
- Backend: Jest + Supertest
- Provisioner: go test + envtest (Kubebuilder testing framework)

**Target Platform**: Local development (Docker Compose + Minikube), containerized for production deployment

**Project Type**: Web application (frontend + backend + provisioner)

**Performance Goals**: 
- API response time <500ms for website submission
- Provisioner polling interval 30 seconds
- Website provisioning complete within 2 minutes

**Constraints**: 
- HTML content max 100KB per website
- Website names must be DNS-compliant (lowercase alphanumeric + hyphens)
- Local development only (no cloud dependencies)
- Single provisioner instance (no HA initially)

**Scale/Scope**: 
- Support 10+ concurrent website requests
- Handle 100+ provisioned websites
- MVP focus: create and view only (no update/delete)

## Constitution Check

*GATE: All principles satisfied. Proceeding with implementation.*

✅ **I. Component Isolation**: Three independent components (frontend, backend, provisioner) with separate codebases, test suites, and deployment artifacts. Each can be developed and tested independently.

✅ **II. API-First Design**: All inter-component communication via defined contracts:
- Frontend ↔ Backend: REST API (OpenAPI spec required)
- Provisioner ↔ Backend: REST API endpoints for website list and status updates
- Provisioner ↔ Kubernetes: CRD schema defines website specification contract

✅ **III. Kubernetes-Native Architecture**: Provisioner implements reconciliation loop pattern, uses CRDs as API, idempotent operations, proper labeling and owner references.

✅ **IV. Data Persistence & State Management**: Backend is authoritative source for website data (MySQL). Provisioner communicates only via backend API (no direct database access). All Kubernetes resources are ephemeral and recreatable from backend state.

✅ **V. Testability & Integration Testing**: Each component has unit tests. Integration test points defined: Backend ↔ MySQL, Provisioner ↔ Backend API, Provisioner ↔ Kubernetes API, Frontend ↔ Backend API.

✅ **Local Development**: Complete local setup with Docker Compose (backend + MySQL) and Minikube (provisioner + nginx pods). One-command initialization required.

## Project Structure

### Documentation (this feature)

```text
specs/001-website-self-service/
├── plan.md              # This file
├── spec.md              # Feature specification (completed)
├── data-model.md        # Database schema and entities
├── contracts/           # API contracts (OpenAPI specs)
│   ├── backend-api.yaml
│   └── website-crd.yaml
├── quickstart.md        # Local development setup guide
├── checklists/          # Quality validation
│   └── requirements.md  # Spec quality checklist (completed)
└── tasks.md             # Implementation task breakdown (to be generated)
```

### Source Code (repository root)

```text
cloudself/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WebsiteForm.tsx
│   │   │   ├── WebsiteList.tsx
│   │   │   └── WebsiteStatus.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   └── MyWebsitesPage.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/
│   │   └── components/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── Website.ts
│   │   ├── services/
│   │   │   └── WebsiteService.ts
│   │   ├── controllers/
│   │   │   └── WebsiteController.ts
│   │   ├── routes/
│   │   │   └── websiteRoutes.ts
│   │   ├── middleware/
│   │   │   ├── validation.ts
│   │   │   └── errorHandler.ts
│   │   ├── config/
│   │   │   └── database.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── integration/
│   │   ├── unit/
│   │   └── contract/
│   ├── migrations/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── provisioner/
│   ├── api/
│   │   └── v1alpha1/
│   │       ├── website_types.go
│   │       ├── groupversion_info.go
│   │       └── zz_generated.deepcopy.go
│   ├── controllers/
│   │   └── website_controller.go
│   ├── internal/
│   │   ├── backend/
│   │   │   └── client.go
│   │   └── nginx/
│   │       └── pod_builder.go
│   ├── config/
│   │   ├── crd/
│   │   │   └── bases/
│   │   ├── manager/
│   │   ├── rbac/
│   │   └── samples/
│   ├── cmd/
│   │   └── main.go
│   ├── go.mod
│   ├── go.sum
│   ├── Makefile
│   └── Dockerfile
│
├── docker-compose.yml        # Local development: backend + MySQL
├── minikube-setup.sh         # Minikube initialization script
├── setup.sh                  # One-command local setup
├── README.md                 # Project overview and quick-start
└── .env.example              # Environment variable template
```

**Structure Decision**: Web application structure (Option 2 from template) with three independent component directories. Added `provisioner/` as a third component alongside `frontend/` and `backend/`. Each component has its own package.json, Dockerfile, and test suite. Kubernetes manifests live with the provisioner component. Root-level scripts provide one-command setup as required by constitution.

## Implementation Strategy

### Phase 0: Project Initialization
- Create project structure (frontend, backend, provisioner directories)
- Initialize Node.js projects with TypeScript configuration
- Setup Docker Compose for backend + MySQL
- Create Minikube setup script and CRD definition
- Write one-command setup script (setup.sh)

### Phase 1: Backend Foundation (User Story 1 Foundation)
- Define MySQL schema with migrations (Website table)
- Implement Website model with validation
- Create REST API endpoints:
  - POST /api/websites (create website request)
  - GET /api/websites (list user's websites)
  - GET /api/websites/:id (get website details)
- Add input validation middleware (DNS-compliant names, 100KB limit)
- Implement error handling
- Write backend unit and integration tests

### Phase 2: Frontend (User Story 1 Complete)
- Setup Vite + React + TypeScript project
- Create WebsiteForm component with validation
- Create WebsiteList component with status display
- Implement API client service
- Build HomePage with form and list
- Add form validation and error handling
- Write component tests

### Phase 3: Backend API for Provisioner (User Story 2 Foundation)
- Add provisioner-specific endpoints:
  - GET /api/provisioner/websites/pending (list pending websites)
  - PUT /api/provisioner/websites/:id/status (update status to provisioned)
- Document API contracts with OpenAPI spec
- Write contract tests for provisioner endpoints

### Phase 4: Provisioner Implementation (User Story 2 Complete)

**Provisioner Pattern Note**: The provisioner uses a hybrid approach:
1. Event-driven reconciliation for CRD changes (standard Kubebuilder pattern)
2. Periodic polling of backend API (every 30s) to discover new pending websites
3. This is necessary because backend MySQL is the source of truth, not Kubernetes etcd

- Initialize Kubebuilder project (kubebuilder init)
- Create Website API resource (kubebuilder create api)
- Implement website_controller.go reconciliation loop
- Implement backend client for polling pending websites and updating status
- Implement nginx pod builder (create pods with ConfigMaps for HTML content)
- Implement Service builder (create NodePort Services to expose pods externally)
- Add RBAC permissions for pod, service, and configmap management
- Add error handling and retry logic (exponential backoff)
- Write controller unit tests and envtest integration tests
- Generate CRD manifests (make manifests)

### Phase 5: End-to-End Integration (User Story 3)
- Update frontend to show Service access information for provisioned websites
- Add status polling/refresh to UI
- Test complete flow: submit → provision → access via Service endpoint
- Write end-to-end integration tests
- Document local setup in quickstart.md

### Phase 6: Documentation & Polish
- Complete README with architecture overview
- Write quickstart.md with setup instructions
- Document troubleshooting steps for Docker/Minikube
- Add logging to all components
- Performance testing (10 concurrent requests)
- Security review (XSS prevention, input validation)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Minikube resource constraints on developer machines | High - provisioner may fail | Document minimum requirements (4GB RAM); add resource limits to nginx pods |
| Backend API unreachable during provisioner polling | Medium - websites stuck in pending | Implement exponential backoff retry in provisioner; add health check endpoint |
| Kubernetes CRD schema changes breaking existing resources | Medium - requires manual cleanup | Version CRDs (v1alpha1); document migration steps |
| Large HTML content causing database/network issues | Low - mitigated by 100KB limit | Enforce content size validation in backend middleware |
| Duplicate website names from race conditions | Low - MySQL unique constraint | Add unique index on website_name column; proper error handling |

## Next Steps

1. ✅ Specification complete (spec.md)
2. ✅ Implementation plan complete (plan.md)
3. ⏳ Create data model specification (data-model.md)
4. ⏳ Define API contracts (contracts/backend-api.yaml, contracts/website-crd.yaml)
5. ⏳ Write quickstart guide (quickstart.md)
6. ⏳ Generate task breakdown (tasks.md) - **READY TO EXECUTE**

**Current Status**: Ready to proceed with `/speckit.tasks` to generate implementation task breakdown.

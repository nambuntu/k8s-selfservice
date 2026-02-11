<!--
Sync Impact Report:
===================
Version: 1.1.1 → 1.1.2
Rationale: Technology stack clarification - provisioner is Go-based Kubernetes controller using Kubebuilder, not Node.js service

Modified Sections:
- Technology Stack & Standards: Updated Provisioner Stack to specify Go 1.21+ with Kubebuilder framework
- Clarified provisioner follows controller-runtime patterns, not REST service architecture

Templates Updated:
- ✅ plan-template.md: No changes needed - Constitution Check remains valid
- ✅ spec-template.md: No changes needed - user story structure unaffected
- ✅ tasks-template.md: No changes needed - phase organization compatible

Follow-up TODOs: Update plan.md to reflect Go/Kubebuilder stack for provisioner
-->

# CloudSelf Constitution

## Core Principles

### I. Component Isolation

Each component (frontend, backend, provisioner) MUST be independently developable, testable, and deployable.

- Frontend (React + Vite) is a standalone UI application consuming backend APIs
- Backend (Node.js + MySQL) is a REST API service with no UI dependencies
- Provisioner (Kubernetes controller) is an autonomous operator consuming backend APIs
- No direct inter-component code dependencies; communication only via defined contracts (REST APIs, CRDs)
- Each component has its own test suite and can be run/tested in isolation

**Rationale**: Enables parallel development by different teams, simplifies debugging, and allows independent scaling and deployment of each service.

### II. API-First Design

All inter-component communication MUST occur through well-defined, versioned contracts.

- Backend exposes REST API endpoints with clear request/response schemas
- Frontend interacts with backend via HTTP API calls
- Provisioner interacts with backend via HTTP API calls:
  - GET endpoint: Retrieve list of websites requiring provisioning
  - POST/PUT endpoint: Update website status to "provisioned" after successful deployment
- Custom Resource Definitions (CRDs) define the contract between provisioner and Kubernetes
- All contracts documented before implementation begins (OpenAPI specs required)
- Breaking changes require version bumps and migration plans

**Rationale**: Prevents tight coupling, enables contract testing, facilitates component replacement, and provides clear integration points for testing and troubleshooting.

### III. Kubernetes-Native Architecture

The provisioner component MUST follow Kubernetes controller best practices.

- Implements reconciliation loop pattern (watch → reconcile → update status)
- Uses Custom Resource Definitions (CRDs) as the API for website specifications
- Idempotent operations: applying the same state multiple times produces the same result
- Proper resource labeling and owner references for garbage collection
- Health checks (liveness/readiness probes) for all components running in K8s
- Resource limits and requests defined for all workloads

**Rationale**: Ensures the system behaves predictably in Kubernetes environments, follows cloud-native patterns, and integrates properly with cluster lifecycle management.

### IV. Data Persistence & State Management

Data flow and persistence boundaries MUST be explicitly defined.

- Backend is the authoritative source for user website specifications (MySQL)
- Backend exposes API gateway for provisioner: no direct database access from provisioner
- Provisioner retrieves website specifications via backend API and updates status back to backend
- Website content stored as strings in database; no file system dependencies for user data
- Provisioner-managed resources (pods, CRDs) are ephemeral and can be recreated by re-querying backend API
- Database schema includes status field (e.g., "pending", "provisioned") and timestamps for audit trail
- No shared in-memory state between components

**Rationale**: Clarifies data ownership, prevents state conflicts, enables disaster recovery, and ensures consistent behavior across component restarts.

### V. Testability & Integration Testing

Each component and integration point MUST have explicit test coverage.

**Unit Testing Requirements**:
- Frontend: Component rendering, form validation, API client logic
- Backend: API endpoints, input validation, database operations
- Provisioner: Reconciliation logic, CRD generation, resource creation

**Integration Testing Requirements**:
- Backend ↔ MySQL: Database operations, schema migrations
- Provisioner ↔ Backend API: Retrieve website list, update provisioning status
- Provisioner ↔ Kubernetes API: CRD creation, pod provisioning, resource cleanup
- Frontend ↔ Backend: End-to-end user flows (create website, view website)

**Contract Testing Requirements**:
- Backend REST API: Request/response validation against OpenAPI spec
- CRD schema validation: Kubernetes resource definitions match expected structure

**Rationale**: Multi-component systems have complex failure modes; explicit integration testing catches issues at component boundaries before production deployment.

## Technology Stack & Standards

**Frontend Stack**:
- Framework: React 18+
- Build Tool: Vite 5+
- HTTP Client: Axios or fetch API
- Form Management: React Hook Form or similar
- Testing: Vitest + React Testing Library

**Backend Stack**:
- Runtime: Node.js 20 LTS
- Framework: Express.js or Fastify
- Database: MySQL 8.0+
- ORM: Sequelize or TypeORM
- API Documentation: OpenAPI/Swagger
- Testing: Jest or Mocha + Supertest

**Provisioner Stack**:
- Language: Go 1.21+
- Framework: Kubebuilder (controller-runtime pattern)
- Kubernetes Client: client-go (via Kubebuilder scaffolding)
- HTTP Client: net/http (Go standard library) for backend API calls
- Testing: go test with envtest (Kubebuilder testing framework)

**Container Standards**:
- All components MUST have Dockerfiles using official base images
- Multi-stage builds for production images (minimize size)
- Non-root user execution
- Health check endpoints implemented and exposed

**Kubernetes Standards**:
- NGINX pods use official nginx:alpine image
- ConfigMaps for nginx configuration injection
- Pod labels include: app, component, website-name
- Resource requests/limits defined based on expected load

**Local Development Environment**:
- All components MUST be runnable locally without cloud dependencies
- Docker Compose configuration required for multi-service local development
- Minikube or kind cluster setup for testing Kubernetes components locally
- Local MySQL instance via Docker container
- Environment variables for local vs production configuration
- Mock/stub external services for offline development
- Setup scripts (shell/make) to initialize local environment in one command

## Development Workflow

**Local Setup Prerequisites**:
- Developers MUST be able to run entire stack locally
- Docker Desktop or Docker Engine + Docker Compose installed
- Minikube or kind for local Kubernetes cluster
- Initial setup documented and scripted (e.g., `make setup` or `./setup.sh`)

**Feature Development Process**:
1. Specification (`/speckit.specify`): Document user stories and requirements
2. Planning (`/speckit.plan`): Define technical approach and architecture
3. Task Breakdown (`/speckit.tasks`): Create implementation tasks grouped by component and user story
4. Implementation: Develop with tests, commit to feature branch
5. Review: Ensure constitution compliance before merge

**Branch Strategy**:
- Feature branches: `###-feature-name` (e.g., `001-user-website-creation`)
- Branch per feature/user story
- Merge to main only after tests pass and review complete

**Testing Gates**:
- Unit tests MUST pass before PR creation
- Integration tests MUST pass before merge to main
- Contract tests validate API compatibility

**Documentation Requirements**:
- API changes require OpenAPI spec updates
- Database schema changes require migration scripts
- CRD changes require updated YAML manifests
- Each component has README with local setup and testing instructions
- Root README includes quick-start guide for local development
- Docker Compose and Minikube setup documented with troubleshooting steps

## Governance

This constitution represents the non-negotiable architectural and development standards for the CloudSelf project. All features, pull requests, and design decisions MUST comply with these principles.

**Amendment Process**:
- Proposed changes require rationale documenting why current principle is blocking progress
- Amendments require review by project lead or team consensus
- Version bumps follow semantic versioning:
  - **MAJOR**: Principle removal or backward-incompatible governance change
  - **MINOR**: New principle added or existing principle materially expanded
  - **PATCH**: Clarifications, wording improvements, non-semantic updates
- Migration plan required for changes affecting existing code

**Compliance Verification**:
- All PRs MUST include constitution compliance statement
- `/speckit.analyze` command validates feature designs against principles
- Constitution violations block merge unless explicitly justified and documented

**Constitution Authority**:
- This document supersedes all other coding guidelines
- In case of conflict between this constitution and implementation convenience, constitution takes precedence
- Complexity introduced by following principles MUST be justified; if it cannot be, the constitution should be amended

**Version**: 1.1.2 | **Ratified**: 2026-02-05 | **Last Amended**: 2026-02-05

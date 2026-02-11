# Tasks: Website Self-Service Platform

**Input**: Design documents from `/specs/001-website-self-service/`
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ data-model.md

**Tests**: Tests are NOT explicitly requested in the spec, but basic testing is included for quality assurance.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`, `provisioner/` (Go project)
- Three independent components per constitution

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for all three components

- [X] T001 Create root project structure (frontend/, backend/, provisioner/ directories)
- [X] T002 [P] Initialize backend Node.js TypeScript project in backend/package.json
- [X] T003 [P] Initialize frontend React + Vite TypeScript project in frontend/package.json
- [X] T004 [P] Initialize Kubebuilder project in provisioner/ (kubebuilder init --domain cloudself.dev --repo github.com/yourorg/cloudself/provisioner)
- [X] T005 [P] Create Docker Compose configuration in docker-compose.yml (backend + MySQL services)
- [X] T006 [P] Create Minikube setup script in minikube-setup.sh
- [X] T007 Create one-command setup script in setup.sh (runs docker-compose + minikube-setup)
- [X] T008 [P] Create .env.example with environment variable templates
- [X] T009 [P] Write root README.md with project overview and architecture diagram
- [X] T010 [P] Add .gitignore for Node.js, Go, and IDE files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 Create MySQL migration file in backend/migrations/001_create_websites_table.sql
- [X] T012 Setup database connection and migration runner in backend/src/config/database.ts
- [X] T013 [P] Configure Express.js server in backend/src/app.ts with middleware (cors, json parser)
- [X] T014 [P] Create error handling middleware in backend/src/middleware/errorHandler.ts
- [X] T015 [P] Create validation middleware helpers in backend/src/middleware/validation.ts
- [X] T016 [P] Setup environment configuration in backend/src/config/index.ts
- [X] T017 Create Website model with Sequelize/TypeORM in backend/src/models/Website.ts
- [X] T018 Create Kubebuilder API for Website CRD (kubebuilder create api --group cloudself --version v1alpha1 --kind Website)
- [X] T019 [P] Define Website CRD spec in provisioner/api/v1alpha1/website_types.go (websiteName, htmlContent fields)
- [X] T020 [P] Generate CRD manifests (make manifests from provisioner/ directory)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Submit Website Request (Priority: P1) 🎯 MVP

**Goal**: Users can submit website requests through web interface and see them saved with "pending" status

**Independent Test**: Submit a website via UI → Verify it appears in "My Websites" list with status "pending" → Verify data exists in MySQL database

### Implementation for User Story 1

- [X] T021 [P] [US1] Create WebsiteService in backend/src/services/WebsiteService.ts (createWebsite, listWebsites, getWebsite methods)
- [X] T022 [P] [US1] Create WebsiteController in backend/src/controllers/WebsiteController.ts (handlers for HTTP requests)
- [X] T023 [US1] Implement POST /api/websites endpoint in backend/src/routes/websiteRoutes.ts
- [X] T024 [US1] Implement GET /api/websites endpoint in backend/src/routes/websiteRoutes.ts (filter by user_id)
- [X] T025 [US1] Implement GET /api/websites/:id endpoint in backend/src/routes/websiteRoutes.ts
- [X] T026 [US1] Add DNS name validation logic in backend/src/services/WebsiteService.ts (regex: ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$)
- [X] T027 [US1] Add HTML content size validation (100KB max) in backend/src/services/WebsiteService.ts
- [X] T028 [US1] Add duplicate name check in backend/src/services/WebsiteService.ts
- [X] T029 [US1] Register website routes in backend/src/app.ts
- [X] T030 [P] [US1] Create API client service in frontend/src/services/api.ts (axios setup with base URL)
- [X] T031 [P] [US1] Create WebsiteForm component in frontend/src/components/WebsiteForm.tsx (name, title, HTML textarea)
- [X] T032 [P] [US1] Add form validation to WebsiteForm component (React Hook Form with DNS name regex)
- [X] T033 [P] [US1] Create WebsiteList component in frontend/src/components/WebsiteList.tsx (table/list with status badges)
- [X] T034 [US1] Create HomePage in frontend/src/pages/HomePage.tsx (includes WebsiteForm and WebsiteList)
- [X] T035 [US1] Setup React Router in frontend/src/App.tsx
- [X] T036 [US1] Wire up form submission to POST /api/websites in WebsiteForm component
- [X] T037 [US1] Wire up website list loading to GET /api/websites in WebsiteList component
- [X] T038 [US1] Add error handling and user feedback (toast/alerts) in frontend components
- [X] T039 [P] [US1] Write backend integration test in backend/tests/integration/website.test.ts
- [X] T040 [P] [US1] Write frontend component tests in frontend/tests/components/WebsiteForm.test.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - users can submit websites and see them in the list with "pending" status

---

## Phase 4: User Story 2 - Automatic Website Provisioning (Priority: P2)

**Goal**: Provisioner automatically detects pending websites, creates Kubernetes resources, and updates status to "provisioned"

**Independent Test**: Manually insert website record with status='pending' in MySQL → Run provisioner → Verify CRD created, nginx pod running, status updated to 'provisioned' with pod IP

### Backend API for Provisioner

- [X] T041 [P] [US2] Create GET /api/provisioner/websites/pending endpoint in backend/src/routes/provisionerRoutes.ts
- [X] T042 [P] [US2] Create PUT /api/provisioner/websites/:id/status endpoint in backend/src/routes/provisionerRoutes.ts
- [X] T043 [US2] Implement getWebsitesPendingProvisioning method in backend/src/services/WebsiteService.ts
- [X] T044 [US2] Implement updateWebsiteStatus method in backend/src/services/WebsiteService.ts (status, pod_ip_address, error_message)
- [X] T045 [US2] Register provisioner routes in backend/src/app.ts

### Provisioner Controller Implementation

- [X] T046 [P] [US2] Implement backend HTTP client in provisioner/internal/backend/client.go (GetPendingWebsites, UpdateWebsiteStatus methods)
- [X] T047 [P] [US2] Implement nginx pod builder in provisioner/internal/nginx/pod_builder.go (create pod spec with ConfigMap for HTML)
- [X] T047b [P] [US2] Implement Service builder in provisioner/internal/nginx/pod_builder.go (create NodePort Service to expose pods externally)
- [X] T048 [US2] Implement Reconcile function in provisioner/controllers/website_controller.go (main reconciliation loop)
- [X] T049 [US2] Add polling logic in provisioner/controllers/website_controller.go (call backend API every 30 seconds)
- [X] T050 [US2] Add CRD creation logic in provisioner/controllers/website_controller.go (create Website CR from backend data)
- [X] T051 [US2] Add nginx pod creation logic in provisioner/controllers/website_controller.go (with HTML content in ConfigMap)
- [X] T051b [US2] Add Service creation logic in provisioner/controllers/website_controller.go (expose pod via NodePort)
- [X] T052 [US2] Add Service status monitoring in provisioner/controllers/website_controller.go (wait for NodePort assignment and get Minikube IP)
- [X] T053 [US2] Add status update callback in provisioner/controllers/website_controller.go (call backend API with Service access URL)
- [X] T054 [US2] Add error handling and exponential backoff retry logic in provisioner/controllers/website_controller.go
- [X] T055 [US2] Configure RBAC permissions in provisioner/config/rbac/ (pods, services, configmaps, websites.cloudself.dev)
- [X] T056 [US2] Update provisioner main.go to start controller manager
- [X] T057 [P] [US2] Write controller unit tests in provisioner/controllers/website_controller_test.go
- [X] T058 [P] [US2] Write envtest integration test in provisioner/controllers/suite_test.go

**Checkpoint**: At this point, User Story 2 should work - provisioner detects pending websites, provisions nginx pods with Services, and reports Service access URLs

---

## Phase 5: User Story 3 - View Provisioned Website (Priority: P3)

**Goal**: Users can see updated status and access their provisioned websites via pod IP

**Independent Test**: Create provisioned website record in database with pod_ip_address → Verify UI shows "provisioned" status with clickable IP link → Access IP in browser and see HTML content

### Implementation for User Story 3

- [X] T059 [P] [US3] Update WebsiteList component in frontend/src/components/WebsiteList.tsx to display pod IP for provisioned websites
- [X] T060 [P] [US3] Add status badge styling in WebsiteList component (pending=yellow, provisioned=green, failed=red)
- [X] T061 [US3] Make pod IP a clickable link in WebsiteList component (opens http://{pod_ip} in new tab)
- [X] T062 [US3] Add status refresh mechanism in WebsiteList component (auto-refresh every 10 seconds or manual refresh button)
- [X] T063 [P] [US3] Create WebsiteStatus component in frontend/src/components/WebsiteStatus.tsx (detailed view with timestamp)
- [X] T064 [US3] Add "View Details" action to WebsiteList that shows WebsiteStatus modal/page
- [ ] T065 [P] [US3] Write frontend test for status display in frontend/tests/components/WebsiteList.test.tsx

**Checkpoint**: All user stories should now be independently functional - complete end-to-end flow working

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple components and finalize the system

- [ ] T066 [P] Write quickstart.md guide in specs/001-website-self-service/quickstart.md
- [x] T067 [P] Create component READMEs: backend/README.md, frontend/README.md, provisioner/README.md
- [ ] T068 [P] Document API endpoints in OpenAPI spec at specs/001-website-self-service/contracts/backend-api.yaml
- [ ] T069 [P] Document CRD schema in specs/001-website-self-service/contracts/website-crd.yaml
- [ ] T070 Add logging to backend endpoints in backend/src/middleware/logger.ts
- [ ] T071 [P] Add logging to provisioner controller in provisioner/controllers/website_controller.go
- [ ] T072 [P] Add health check endpoint GET /health to backend in backend/src/routes/health.ts
- [ ] T073 Test complete flow: setup.sh → submit website → verify provisioning → access via IP
- [ ] T074 Add error message display in frontend when website provisioning fails
- [ ] T075 [P] Performance test: submit 10 concurrent website requests and verify all provision successfully
- [ ] T076 Add troubleshooting section to root README.md (common Docker/Minikube issues)
- [ ] T077 [P] Security review: verify HTML sanitization considerations documented
- [ ] T078 Final validation: run through all acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent but integrates with US1 backend
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent but displays data from US1/US2

### Within Each User Story

- Backend API endpoints before frontend integration
- Models and services before controllers/routes
- Core implementation before testing
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T002, T003, T004, T005, T006, T008, T009, T010 can all run in parallel
- Phase 2: T013, T014, T015, T016, T019 can run in parallel after T011, T012, T017 complete
- User Story 1: T021, T022, T030, T031, T032, T033 can start in parallel; T039, T040 can run in parallel after implementation
- User Story 2: T041, T042, T046, T047, T057, T058 can run in parallel within their respective groups
- User Story 3: T059, T060, T063, T065 can run in parallel
- Phase 6: T066, T067, T068, T069, T070, T071, T072, T075, T077 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Start these tasks in parallel:
- Backend: Create WebsiteService (T021)
- Backend: Create WebsiteController (T022)
- Frontend: Create API client (T030)
- Frontend: Create WebsiteForm component (T031)
- Frontend: Add form validation (T032)
- Frontend: Create WebsiteList component (T033)

# Then integrate sequentially:
- Wire up routes and endpoints (T023-T029)
- Connect frontend to backend (T034-T038)
- Write tests (T039, T040 in parallel)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T020) - **CRITICAL GATE**
3. Complete Phase 3: User Story 1 (T021-T040)
4. **STOP and VALIDATE**: 
   - Start backend: `cd backend && npm start`
   - Start frontend: `cd frontend && npm run dev`
   - Submit a website via UI
   - Verify it appears in list with "pending" status
   - Check MySQL database for record
5. **MVP READY**: Users can create and view website requests (even if provisioning isn't automated yet)

### Incremental Delivery

1. Setup + Foundational → Foundation ready ✅
2. Add User Story 1 → Test independently → **DEMO MVP** ✅
3. Add User Story 2 → Test independently → **DEMO Auto-Provisioning** ✅
4. Add User Story 3 → Test independently → **DEMO Complete System** ✅
5. Polish → Production ready ✅

### Parallel Team Strategy

With 3 developers:

**Phase 1-2**: All work together on setup and foundation

**Phase 3-5** (after foundation complete):
- **Developer A**: User Story 1 (Frontend focus) - T021-T040
- **Developer B**: User Story 2 (Provisioner focus) - T041-T058
- **Developer C**: User Story 3 (Integration focus) - T059-T065

Each developer can work independently and stories integrate cleanly.

---

## Task Count Summary

- **Total Tasks**: 78
- **Phase 1 (Setup)**: 10 tasks
- **Phase 2 (Foundational)**: 10 tasks
- **Phase 3 (User Story 1)**: 20 tasks
- **Phase 4 (User Story 2)**: 18 tasks
- **Phase 5 (User Story 3)**: 7 tasks
- **Phase 6 (Polish)**: 13 tasks

**Parallel Opportunities**: 35 tasks marked with [P] can be executed in parallel with other tasks

**MVP Scope**: Phases 1-3 (40 tasks) deliver a working MVP where users can submit and view website requests

---

## Notes

- All tasks follow the strict checklist format: `- [ ] [ID] [P?] [Story?] Description with file path`
- [P] tasks target different files with no dependencies
- [Story] labels map tasks to user stories for traceability
- Each user story delivers independent value and is testable standalone
- Constitution compliance: 3 independent components, API-first design, local development support
- Kubebuilder commands assume Go 1.21+ and kubebuilder v3.x installed locally

# Feature Specification: Website Self-Service Platform

**Feature Branch**: `001-website-self-service`  
**Created**: 2026-02-05  
**Status**: Draft  
**Input**: User description: "Build a self-service k8s platform for website provisioning with React frontend, Node.js backend, and Kubernetes controller"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Submit Website Request (Priority: P1)

A user accesses the web interface, fills out a form with their website name, page title, and HTML content, then submits the request. The system stores this information and initiates the provisioning process.

**Why this priority**: This is the core value proposition - enabling users to request websites. Without this, the platform has no purpose. This story delivers immediate visible value (form submission and confirmation).

**Independent Test**: Can be fully tested by submitting a website request through the UI, verifying the data is saved in the backend database, and receiving a confirmation response. No actual Kubernetes provisioning is required to validate this story.

**Acceptance Scenarios**:

1. **Given** a user opens the web interface, **When** they enter a website name "mysite", page title "My Test Site", and HTML content "<h1>Hello World</h1>" and click submit, **Then** the system stores the request with status "pending" and displays a success message with the request ID
2. **Given** a user submits a website request, **When** the submission is successful, **Then** the user sees their website appear in a "My Websites" list with status "pending"
3. **Given** a user enters a website name that already exists, **When** they try to submit, **Then** the system displays an error message "Website name already taken" and prevents submission
4. **Given** a user leaves the website name field empty, **When** they try to submit, **Then** the form displays validation errors and prevents submission

---

### User Story 2 - Automatic Website Provisioning (Priority: P2)

The provisioner controller continuously monitors for new website requests from the backend, creates appropriate Kubernetes resources (CRDs and nginx pods), and updates the request status to "provisioned" when complete.

**Architecture Detail**: The provisioner pulls website data from the backend API and creates a Custom Resource (CR) instance populated with that data (website name, HTML content). This intentionally duplicates data between the MySQL database and Kubernetes etcd, but it's necessary so the provisioner can perform all subsequent reconciliation operations (pod creation, status monitoring, pod recreation) without repeatedly calling the backend API. The backend remains the source of truth, and the CR serves as the provisioner's working copy.

**Why this priority**: This is the automation layer that delivers on the promise made in Story 1. While Story 1 allows users to submit requests, this story actually creates the websites. It can be developed and tested independently using mock or manual database entries.

**Independent Test**: Can be tested by manually inserting website records into the database with status "pending", running the provisioner, and verifying that Kubernetes resources are created and status is updated to "provisioned" via backend API.

**Acceptance Scenarios**:

1. **Given** a website request exists with status "pending", **When** the provisioner polls the backend API, **Then** the provisioner receives the website details (name, title, HTML content) and creates a Custom Resource (CR) in Kubernetes populated with this data
2. **Given** a Custom Resource has been created for a website, **When** the provisioner reconciles the resource, **Then** it creates an nginx pod with the HTML content from the CR injected as index.html (no backend call needed)
3. **Given** an nginx pod is successfully running, **When** the provisioner verifies the pod status, **Then** it calls the backend API to update the website status to "provisioned" with the pod IP address
4. **Given** a website has been provisioned, **When** the provisioner polls the backend again, **Then** it skips already-provisioned websites and only processes pending ones
5. **Given** an nginx pod is deleted or crashes, **When** the provisioner reconciles the Custom Resource, **Then** it recreates the pod using the data stored in the CR (no backend call needed)

---

### User Story 3 - View Provisioned Website (Priority: P3)

A user can see the status of their website request and, once provisioned, access the website via the pod's IP address to verify their content is live.

**Why this priority**: This completes the user experience by providing visibility and verification. Users need feedback on their requests. This story depends on Stories 1 and 2 but adds the visibility layer that makes the system user-friendly.

**Independent Test**: Can be tested by creating a provisioned website record in the database with an associated pod IP, then verifying the user can view the status in the UI and access the website at the pod IP address.

**Acceptance Scenarios**:

1. **Given** a user has submitted a website request, **When** they view their "My Websites" list, **Then** they see the current status ("pending" or "provisioned") and last updated timestamp
2. **Given** a website status is "provisioned", **When** the user views the website details, **Then** they see the pod IP address as a clickable link
3. **Given** a user clicks on the pod IP address link, **When** they access that URL, **Then** they see their custom HTML content rendered by nginx
4. **Given** multiple users have created websites, **When** each user views their list, **Then** they only see their own websites (filtered by user session)

---

### Edge Cases

- What happens when a user submits HTML content containing malicious scripts (XSS)? System should sanitize or warn about potentially unsafe content
- How does the system handle duplicate website names from different users? Enforce global uniqueness or namespace by username
- What happens when the provisioner cannot reach the backend API? It should retry with exponential backoff and log errors
- What happens when Kubernetes resource creation fails (out of resources, permission denied)? Provisioner should update status to "failed" with error message
- What happens when an nginx pod crashes or is deleted? Provisioner should detect missing pods and recreate them (reconciliation loop)
- How does the system handle very large HTML content (>1MB)? Backend should enforce size limits (e.g., 100KB max)
- What happens when two users try to create websites with the same name simultaneously? Database unique constraint should prevent duplicates
- How does the system handle website names with special characters or spaces? Validate website names to be DNS-compliant (lowercase alphanumeric and hyphens only)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a web-based user interface where users can input website name, page title, and HTML content
- **FR-002**: System MUST validate website names to ensure they are DNS-compliant (lowercase alphanumeric characters and hyphens only, no spaces or special characters)
- **FR-003**: System MUST enforce unique website names across all users to prevent conflicts
- **FR-004**: System MUST store website requests in a persistent database with fields: website name, page title, HTML content, status, user identifier, timestamps
- **FR-005**: System MUST support website request status values: "pending" (newly created), "provisioned" (nginx pod running), and "failed" (provisioning encountered errors)
- **FR-006**: Backend MUST expose API endpoint(s) for the provisioner to retrieve lists of pending websites
- **FR-007**: Backend MUST expose API endpoint(s) for the provisioner to update website status to "provisioned" with pod IP address
- **FR-008**: Provisioner MUST poll the backend API at regular intervals (default: every 30 seconds) to check for pending websites

**Provisioner Pattern Note**: The provisioner uses a hybrid approach:
1. Event-driven reconciliation for CRD changes (standard Kubebuilder pattern)
2. Periodic polling of backend API (every 30s) to discover new pending websites
3. This is necessary because backend MySQL is the source of truth, not Kubernetes etcd

- **FR-009**: Provisioner MUST create a Kubernetes Custom Resource Definition (CRD) for each pending website containing website name and HTML content
- **FR-010**: Provisioner MUST create an nginx pod for each website CRD with the user's HTML content served as index.html
- **FR-011**: Provisioner MUST call the backend API to update website status once the nginx pod is running and has an IP address
- **FR-012**: System MUST allow users to view a list of their submitted website requests with current status
- **FR-013**: System MUST display the pod IP address to users once a website is provisioned
- **FR-014**: System MUST enforce a maximum HTML content size of 100KB per website
- **FR-015**: Nginx pods MUST serve the user-provided HTML content as index.html when accessed via pod IP address
- **FR-016**: System MUST run entirely in a local development environment (Docker Compose + Minikube)
- **FR-017**: System MUST implement proper error handling for provisioner failures (API unreachable, K8s resource creation failures)

### Key Entities

- **Website Request**: Represents a user's request to create a website. Attributes include: unique ID, website name (unique, DNS-compliant string), page title (display text), HTML content (string, max 100KB), status (pending/provisioned), pod IP address (nullable, populated after provisioning), user identifier, created timestamp, updated timestamp
- **Custom Resource Definition (Website CRD)**: Kubernetes resource representing a website. Contains website name and HTML content specification. Managed exclusively by the provisioner component
- **Nginx Pod**: Kubernetes pod running nginx web server. Configured with user's HTML content as index.html. Labeled with website name for identification and management

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a website request (name, title, content) and receive confirmation in under 5 seconds
- **SC-002**: Provisioner detects new pending websites within 30 seconds of submission
- **SC-003**: Nginx pods are provisioned and reachable within 2 minutes of website request submission
- **SC-004**: Users can view their website by accessing the pod IP address and see their exact HTML content rendered
- **SC-005**: System handles at least 10 concurrent website requests without errors
- **SC-006**: 95% of website provisioning attempts complete successfully on first try
- **SC-007**: Provisioner successfully recovers and retries when backend API is temporarily unavailable
- **SC-008**: Form validation prevents invalid website names (with special characters) from being submitted
- **SC-009**: Complete local development setup (frontend + backend + provisioner + Minikube) can be initialized with a single command
- **SC-010**: Users can view status updates (pending → provisioned) within the UI without manual refresh

## Assumptions

- Users are trusted; no authentication or multi-tenancy required in initial version (user identifier can be a simple session ID)
- No DNS or domain name mapping required; users access websites via pod IP addresses
- No HTTPS/TLS required for initial version; HTTP-only access is acceptable
- Website content is static HTML only; no JavaScript execution, file uploads, or dynamic server-side rendering
- Provisioner runs as a single instance (no high-availability or leader election required initially)
- Database schema migrations are handled manually or via ORM tooling
- No website deletion or update functionality required in initial version (create and view only)
- Content sanitization is not required initially (assume trusted users); can be added later if needed
- Default polling interval of 30 seconds for provisioner is acceptable (not configurable initially)
- Minikube cluster runs on developer's local machine with sufficient resources (minimum 4GB RAM allocated)

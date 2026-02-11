# CloudSelf Frontend

React/TypeScript frontend for the CloudSelf website self-service platform.

## Overview

A modern web interface that allows users to create and manage website provisioning requests. Built with React 18, Vite 5, and TypeScript for a fast and type-safe development experience.

### Tech Stack

- **Framework**: React 18.3
- **Build Tool**: Vite 5.4
- **Language**: TypeScript 5.x
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Testing**: Vitest + React Testing Library
- **Styling**: Plain CSS with modern features

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── WebsiteForm.tsx  # Website creation form
│   │   ├── WebsiteList.tsx  # Website listing table
│   │   └── WebsiteStatus.tsx# Website detail modal
│   ├── pages/               # Page components
│   │   └── HomePage.tsx     # Main page
│   ├── services/            # API clients
│   │   └── api.ts           # Backend API client
│   ├── App.tsx              # Main app component
│   ├── App.css              # Global styles
│   └── vite-env.d.ts        # Vite type definitions
├── tests/
│   └── components/          # Component tests
│       ├── WebsiteForm.test.tsx
│       └── WebsiteList.test.tsx
├── public/                  # Static assets
└── package.json
```

## Prerequisites

- Node.js 20+ and npm 10+
- Backend API running on `http://localhost:3000` (or configured via env)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment (Optional)

Create `.env` file:

```bash
VITE_API_URL=http://localhost:3000
```

Default is `http://localhost:3000` if not specified.

### 3. Start Development Server

```bash
npm run dev
```

Frontend will start on `http://localhost:5173`.

## Features

### Website Creation Form

- DNS-compliant website name validation
- HTML content editor (max 100KB)
- Real-time validation feedback
- Error handling and user notifications

### Website List

- View all user's websites
- Status badges (pending, provisioned, failed)
- Clickable Service access links
- Auto-refresh every 10 seconds (toggleable)
- Manual refresh button

### Website Details Modal

- Comprehensive website information
- Status timeline (created/updated)
- Full HTML content preview
- Error messages for failed provisions
- Direct access link to provisioned websites

## Usage

### Creating a Website

1. Enter a **DNS-compliant name** (lowercase, alphanumeric, hyphens)
   - ✅ Valid: `my-site`, `test-123`, `hello-world`
   - ❌ Invalid: `My Site`, `test_site`, `UPPERCASE`

2. Enter a **page title** (any text, 1-255 characters)

3. Paste **HTML content** (max 100KB)
   ```html
   <html>
     <head><title>My Site</title></head>
     <body>
       <h1>Hello World!</h1>
       <p>My awesome website</p>
     </body>
   </html>
   ```

4. Click **Create Website**

5. Website appears in list with status "pending"

6. After 30-60 seconds, refresh to see status change to "provisioned"

7. Click the NodePort link to access your website

### Accessing Provisioned Websites

Websites are accessible via NodePort on Minikube:

```bash
# Get Minikube IP
minikube ip

# Access website
http://<minikube-ip>:<node-port>
```

The UI displays the NodePort (e.g., `:30080`), and you need to prepend the Minikube IP.

## Development

### Hot Module Replacement (HMR)

Vite provides instant HMR for fast development:

```bash
npm run dev
```

Changes to components will update instantly in the browser.

### Type Checking

```bash
npm run type-check
```

Or let your IDE (VS Code recommended) show type errors inline.

### Linting

```bash
npm run lint
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with UI

```bash
npm test -- --ui
```

### Test Coverage

```bash
npm run test:coverage
```

### Component Tests

Tests use Vitest and React Testing Library:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import WebsiteForm from '../components/WebsiteForm';

test('validates DNS name format', () => {
  render(<WebsiteForm onSuccess={() => {}} />);
  
  const input = screen.getByLabelText(/website name/i);
  fireEvent.change(input, { target: { value: 'Invalid Name' } });
  
  expect(screen.getByText(/lowercase/i)).toBeInTheDocument();
});
```

## Building for Production

### Create Production Build

```bash
npm run build
```

Output will be in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Serve Production Build

Use any static file server:

```bash
# Using Python
python3 -m http.server 8080 -d dist

# Using Node.js serve
npx serve dist

# Using nginx (production)
nginx -c nginx.conf
```

## Components

### WebsiteForm

Form for creating new websites with validation.

**Props**: None

**Features**:
- Real-time DNS name validation
- HTML content size validation (100KB)
- Form submission with error handling
- Success callback to refresh list

### WebsiteList

Table displaying all user's websites.

**Props**:
- `refreshTrigger?: number` - Increment to force refresh

**Features**:
- Status badges with colors
- Auto-refresh toggle (10s interval)
- Manual refresh button
- Clickable Service access links
- View Details action

### WebsiteStatus

Modal showing detailed website information.

**Props**:
- `website: Website` - Website object to display
- `onClose: () => void` - Close callback

**Features**:
- Status summary with icon
- Complete website details
- HTML content preview
- Timeline (created/updated)
- Direct access button

## API Integration

### API Client

Located in `src/services/api.ts`:

```typescript
import { websiteApi } from './services/api';

// Create website
const website = await websiteApi.createWebsite({
  websiteName: 'my-site',
  websiteTitle: 'My Site',
  htmlContent: '<html>...</html>'
});

// List websites
const websites = await websiteApi.listWebsites();

// Get specific website
const website = await websiteApi.getWebsite(1);
```

### Type Definitions

```typescript
interface Website {
  id: number;
  websiteName: string;
  websiteTitle: string;
  htmlContent: string;
  status: 'pending' | 'provisioned' | 'failed';
  podIpAddress: string | null;
  userId: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## Styling

The app uses plain CSS with CSS custom properties for theming:

```css
:root {
  --primary-color: #3b82f6;
  --error-color: #ef4444;
  --success-color: #10b981;
  --warning-color: #f59e0b;
}
```

Status badges are color-coded:
- 🟡 **Pending**: Yellow background
- 🟢 **Provisioned**: Green background  
- 🔴 **Failed**: Red background

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | http://localhost:3000 | Backend API URL |

## Troubleshooting

### Backend Connection Failed

```bash
# Check backend is running
curl http://localhost:3000/health

# Check CORS configuration in backend
# Should allow http://localhost:5173
```

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

### Tests Failing

```bash
# Ensure jsdom is installed (for DOM testing)
npm install -D jsdom

# Run tests with verbose output
npm test -- --reporter=verbose
```

### Vite Port Already in Use

```bash
# Change port in vite.config.ts or via CLI
npm run dev -- --port 5174
```

## Architecture

The frontend follows a component-based architecture:

- **Pages**: Top-level route components
- **Components**: Reusable UI components
- **Services**: API clients and utilities
- **Types**: TypeScript interfaces

State management is kept simple with React hooks:
- `useState` for local component state
- `useEffect` for side effects (API calls)
- Props for component communication

## Performance

- **Vite**: Lightning-fast HMR and builds
- **Code splitting**: Automatic with Vite
- **Lazy loading**: Components loaded on-demand
- **Optimized builds**: Minification and tree-shaking

## Accessibility

- Semantic HTML elements
- Form labels and ARIA attributes
- Keyboard navigation support
- Color contrast compliance

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Related Documentation

- [Feature Spec](../specs/001-website-self-service/spec.md)
- [Backend API](../backend/README.md)
- [Quickstart Guide](../specs/001-website-self-service/quickstart.md)
- [Data Model](../specs/001-website-self-service/data-model.md)

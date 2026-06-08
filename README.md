# Gurukul AI

> Comprehensive educational platform bridging traditional schooling with modern technology.

![Node.js](https://img.shields.io/badge/Node.js-≥20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## Overview

Gurukul AI serves four user roles — **Teacher**, **Student**, **Parent**, and **Admin** — providing a unified platform for academic operations. Core capabilities include:

- **AI Grading Pipeline** — Automated assessment via Google Gemini with BullMQ job processing
- **Real-Time Messaging** — Socket.IO powered chat with typing indicators and offline delivery
- **Attendance Management** — Daily tracking with parent notifications
- **Course Management** — Enrollment, scheduling, and curriculum organization
- **Role-Based Access Control** — Granular permissions across all platform features

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite 6, TypeScript, MUI 7, TanStack React Query 5, Socket.IO Client, Framer Motion, Recharts |
| **Backend** | Express 5, TypeScript, Mongoose / MongoDB 7, BullMQ / Redis 7, Socket.IO, JWT Auth, Zod validation |
| **Testing** | Jest 30 (backend), Vitest 3 (frontend), Playwright (E2E), fast-check (property-based), k6 (load) |
| **DevOps** | Docker, Docker Compose, GitHub Actions, Nginx, Sentry, Winston logging |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Nginx (reverse proxy)                                          │
├────────────────────────┬────────────────────────────────────────┤
│  React SPA (Vite)      │  Express API + Socket.IO               │
│  ├── Feature modules   │  ├── Controllers                       │
│  │   (teacher/student/ │  ├── Services (business logic)         │
│  │    parent/admin)    │  ├── Repositories (data access)        │
│  ├── Design tokens     │  ├── RBAC Middleware                   │
│  ├── Error boundaries  │  ├── BullMQ Workers (AI grading)       │
│  └── React Query cache │  └── Structured JSON logging           │
├────────────────────────┴────────────────────────────────────────┤
│  MongoDB (data)  │  Redis (cache + job queue)  │  Firebase      │
└──────────────────┴─────────────────────────────┴────────────────┘
```

**Frontend** — Feature-based module structure with a design token system, MUI theming, error boundaries, and React Query for server state.

**Backend** — Controller → Service → Repository pattern with RBAC middleware, request validation (Zod + express-validator), and structured JSON logging via Winston.

**Real-Time** — Socket.IO with persistence-first messaging, typing indicators, and missed message delivery on reconnect.

**AI Pipeline** — BullMQ job queue with configurable concurrency, exponential backoff retry, and Google Gemini integration for automated grading.

---

## Prerequisites

- **Node.js** ≥ 20
- **npm** (comes with Node.js)
- **MongoDB** 7+ (or use Docker)
- **Redis** 7+ (or use Docker)

Or simply **Docker** + **Docker Compose** for zero local dependencies.

---

## Quick Start

### Docker (recommended)

```bash
# Clone the repository
git clone <repository-url> && cd gurukul-ai

# Copy environment files
cp .env.example .env.local
cp backend/.env.example backend/.env

# Start all services
docker compose up
```

Services will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Nginx (unified):** http://localhost:80

### Manual Setup

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd backend && npm install && cd ..

# 3. Copy environment files and configure
cp .env.example .env.local
cp backend/.env.example backend/.env
# Edit both files with your actual values (MongoDB URI, JWT secret, etc.)

# 4. Start backend
cd backend && npm run dev

# 5. Start frontend (in a new terminal)
npm run dev
```

Frontend runs on `http://localhost:3000` with API proxy to the backend at port 5000.

---

## Environment Variables

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SOCKET_URL` | WebSocket URL for real-time features |
| `VITE_FIREBASE_*` | Firebase project credentials |
| `VITE_GEMINI_API_KEY` | Google Gemini API key |
| `VITE_SENTRY_DSN` | Sentry error reporting DSN |
| `VITE_FORCE_DEMO_MODE` | Run with mock data (no backend) |

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection details |
| `JWT_SECRET` | Token signing secret |
| `GEMINI_API_KEY` | Google Gemini for AI grading |
| `SMTP_*` | Email service configuration |
| `LOG_LEVEL` | Logging verbosity (debug/info/warn/error) |

See [`.env.example`](.env.example) and [`backend/.env.example`](backend/.env.example) for all available options.

---

## Project Structure

```
gurukul-ai/
├── backend/              # Express API server
│   ├── src/
│   │   ├── config/       # App configuration & database setup
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── jobs/         # BullMQ workers (AI grading pipeline)
│   │   ├── middleware/   # Auth, RBAC, validation, security
│   │   ├── models/       # Mongoose schemas
│   │   ├── realtime/     # Socket.IO event handlers
│   │   ├── repositories/ # Data access layer
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Utilities (logger, helpers)
│   ├── tests/            # Property-based & unit tests
│   └── scripts/          # Deployment & seeding scripts
├── src/                  # React frontend
│   ├── app/              # Routes & app shell
│   ├── design-system/    # Tokens, themes & typography
│   ├── features/         # Feature modules
│   │   ├── teacher/
│   │   ├── student/
│   │   ├── parent/
│   │   ├── admin/
│   │   └── shared/       # Shared components & hooks
│   └── providers/        # React context providers
├── tests/                # E2E & visual regression tests
├── load-tests/           # k6 performance tests
├── nginx/                # Reverse proxy configuration
├── docs/                 # Documentation
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml
├── Dockerfile            # Frontend multi-stage build
├── playwright.config.ts  # E2E test configuration
├── vite.config.ts        # Frontend build configuration
└── package.json
```

---

## Available Scripts

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint with zero-warning policy |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm test` | Run Vitest unit tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:pbt` | Property-based tests (fast-check) |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:visual` | Visual regression tests |

### Backend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run Jest unit tests |
| `npm run test:pbt` | Property-based tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run seed:admin` | Seed initial admin user |
| `npm run pre-deploy` | Pre-deployment checks |

---

## API Documentation

OpenAPI/Swagger documentation is auto-generated and available when the server is running:

```
http://localhost:5000/api/v1/docs
```

---

## Testing

```bash
# Unit tests (frontend)
npm test

# Unit tests (backend)
cd backend && npm test

# Property-based tests (backend)
cd backend && npm run test:pbt

# E2E tests (all browsers)
npx playwright test

# E2E with UI mode
npx playwright test --ui

# Visual regression tests
npx playwright test --config=tests/visual-regression/playwright.visual.config.ts

# Load testing
k6 run load-tests/k6-load-test.js
```

The E2E suite covers Chromium, Firefox, WebKit, and mobile viewports (Pixel 5, iPhone 12). CI adds Edge and Chrome branded browsers.

---

## Deployment

Deployment is handled via Docker and GitHub Actions CI/CD pipelines. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for full instructions.

The pipeline includes:
- Lint + type-check gates
- Unit and property-based test suites
- Docker image build and push
- Multi-stage builds for optimized production images

---

## Contributing

1. **Branch naming:** `feature/description`, `fix/description`, or `chore/description`
2. **Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced via commitlint)
3. **Before opening a PR:**
   - Ensure `npm run lint` and `npm run type-check` pass with zero warnings
   - Add/update tests for any new functionality
   - Run the full test suite locally
4. **PR process:** Fill out the PR template, request review, and ensure CI passes

---

## License

MIT © Gurukul AI

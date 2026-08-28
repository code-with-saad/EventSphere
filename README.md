# EventSphere

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite)

A multi-role Event & Expo Management SaaS platform. EventSphere supports the full lifecycle of professional events — from organizer onboarding and approval, to exhibitor booth assignments, to attendee registration and check-in.

---

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Installation & Setup](#installation--setup)
7. [Environment Variables](#environment-variables)
8. [Running the App](#running-the-app)
9. [Testing](#testing)
10. [API Reference](#api-reference)
11. [Auth Flows](#auth-flows)
12. [Deployment](#deployment)
13. [Project Structure](#project-structure)
14. [Documentation](#documentation)

---

## Overview

EventSphere is a full-stack web application built with React 19 (frontend) and Express 5 / Node.js (backend), backed by MongoDB Atlas. It handles authentication, role-based access control, email OTP verification, and a SuperAdmin-gated organizer approval workflow.

**Current status:** Phase 0 (project setup) and Phase 1 (auth foundation) are complete. All Phase 1 exit criteria pass. Phase 2 (event creation and management) is next.

---

## User Roles

| Role | Registration | Verification | Access |
|------|-------------|--------------|--------|
| **SuperAdmin** | Seeded via script | None (pre-approved) | Full admin panel; approve/reject organizers |
| **Organizer** | Self-register | SuperAdmin must approve account | Event creation and management dashboard |
| **Exhibitor** | Self-register | Email OTP | Exhibitor dashboard; booth/event registration |
| **Attendee** | Self-register | Email OTP | Attendee dashboard; event discovery and registration |

---

## Features

### Phase 0 — Project Setup
- Monorepo structure (separate `frontend/` and `backend/` packages)
- Express 5 + TypeScript backend with Zod-validated environment config
- React 19 + Vite 8 frontend with Tailwind CSS v3 and custom design tokens (EventSphere theme)
- MongoDB Atlas connection with startup verification
- Health check endpoint at `GET /health`

### Phase 1 — Auth Foundation
- Registration for all four roles with role-specific routing
- Email OTP verification (Exhibitor and Attendee) via [Resend](https://resend.com)
- SuperAdmin approval workflow for Organizer accounts
- JWT authentication: 15-minute access token (in-memory) + 7-day refresh token (localStorage, rotated on every use)
- Silent token refresh with automatic retry on 401
- Forgot password: 3-step flow (request OTP → verify OTP → reset password)
- Role-based route guards (frontend `ProtectedRoute` + backend `authorize` middleware)
- Dark / Light mode with persistence across sessions
- Fully responsive layout (320px–1920px) with mobile bottom navigation
- All notifications via toast (zero `window.alert`)
- `DEV_OTP_BYPASS` for local development (prints OTP to console)

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | UI framework |
| Vite | 8.x | Build tool and dev server |
| TypeScript | 7.x | Type safety |
| React Router | 7.x | Client-side routing |
| Axios | 1.x | HTTP client |
| Tailwind CSS | 3.x | Utility-first styling |
| Lucide React | 0.469 | Icon library |
| React Hot Toast | 2.x | Toast notifications |
| Vitest | 4.x | Unit/component testing |
| @testing-library/react | 16.x | React component testing |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18.x+ | Runtime |
| Express | 5.x | HTTP framework |
| TypeScript | 7.x | Type safety |
| MongoDB driver | 7.x | Database client |
| bcrypt | 6.x | Password hashing |
| jsonwebtoken | 9.x | JWT generation and verification |
| Resend | 6.x | Transactional email (OTP) |
| Zod | 4.x | Environment variable validation |
| tsx | 4.x | TypeScript dev runtime (replaces ts-node) |
| nodemon | 3.x | Dev server hot reload |
| Vitest | 4.x | Unit and integration testing |
| supertest | 7.x | HTTP integration testing |

---

## Prerequisites

- **Node.js** 18.x or higher — [nodejs.org](https://nodejs.org)
- **npm** 9.x or higher (bundled with Node.js)
- **MongoDB Atlas account** — [mongodb.com/atlas](https://www.mongodb.com/atlas) (free tier is sufficient)
- **Resend account** — [resend.com](https://resend.com) (free tier: 3,000 emails/month, 100/day)
- **Git**

### MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write access.
3. Under **Network Access**, whitelist your IP (or use `0.0.0.0/0` for development).
4. Copy the connection string from **Connect → Drivers**. It looks like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/eventsphere?retryWrites=true&w=majority
   ```
5. You also need a **second database** for tests. Either create a second cluster or append a different database name to the same cluster URI:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/eventsphere_test?retryWrites=true&w=majority
   ```

### Resend Setup

1. Sign up at [resend.com](https://resend.com).
2. Go to **API Keys** and create a new key. It starts with `re_`.
3. Under **Domains**, add and verify your sending domain. Unverified domains will fail silently.
4. During development, set `DEV_OTP_BYPASS=true` to bypass needing a real inbox — the OTP is printed to the backend console instead.

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/eventsphere.git
cd eventsphere
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment

```bash
cp .env.example .env
```

Open `backend/.env` and fill in all required values (see [Environment Variables](#environment-variables) below).

Also create a test environment file:

```bash
cp .env.example .env.test
```

Edit `backend/.env.test` — change `MONGODB_URI` to point to `eventsphere_test` and set `NODE_ENV=test`. The other values can match `.env`.

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 5. Configure frontend environment

```bash
cp .env.example .env
```

Open `frontend/.env` and set `VITE_API_BASE_URL=http://localhost:5000`.

### 6. Seed the SuperAdmin account

```bash
cd ../backend
npm run seed:superadmin
```

Expected output:

```
Connected to MongoDB
✓ SuperAdmin account created successfully
  Email: admin@eventsphere.com
Database connection closed
```

This script is idempotent — safe to run multiple times. Re-run it if you update `SUPERADMIN_PASSWORD` in `.env`.

---

## Environment Variables

### Backend — `backend/.env`

Copy from `backend/.env.example`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | `5000` | Server port |
| `NODE_ENV` | Yes | — | `development` \| `production` \| `test` |
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret, minimum 32 characters |
| `RESEND_API_KEY` | Yes | — | Resend API key, starts with `re_` |
| `SUPERADMIN_EMAIL` | Yes | — | Email address for the SuperAdmin account |
| `SUPERADMIN_PASSWORD` | Yes | — | SuperAdmin password, minimum 8 characters |
| `FRONTEND_URL` | Yes | — | Exact frontend origin for CORS — no trailing slash (e.g. `http://localhost:5173`) |
| `DEV_OTP_BYPASS` | No | `false` | Set `true` to print OTP to console in dev; hard-blocked in production |

**Example `backend/.env`:**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventsphere?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPERADMIN_EMAIL=admin@eventsphere.com
SUPERADMIN_PASSWORD=SecureAdminPassword123!
FRONTEND_URL=http://localhost:5173
DEV_OTP_BYPASS=false
```

The backend uses Zod to validate all environment variables at startup. If any required variable is missing or fails its constraint, the process will exit immediately with a descriptive error. This is intentional — a misconfigured server should never start silently.

### Backend — `backend/.env.test`

Used exclusively by the test suite. Keep it separate from `.env` to avoid running tests against your development database.

```env
PORT=5000
NODE_ENV=test
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventsphere_test?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPERADMIN_EMAIL=admin@eventsphere.com
SUPERADMIN_PASSWORD=SecureAdminPassword123!
FRONTEND_URL=http://localhost:5173
```

See [`docs/TEST_DATABASE_CONNECTION.md`](./docs/TEST_DATABASE_CONNECTION.md) for full setup guidance.

### Frontend — `frontend/.env`

Copy from `frontend/.env.example`.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend base URL — e.g. `http://localhost:5000` |

---

## Running the App

Start the backend and frontend in separate terminals.

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

The API server starts at `http://localhost:5000`. Verify it's running:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "EventSphere Backend API is running",
  "database": "connected",
  "timestamp": "2026-08-25T00:00:00.000Z"
}
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

The frontend starts at `http://localhost:5173`. Open it in your browser.

### All npm Scripts

**Backend (from `backend/`):**

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload (nodemon + tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run all tests (sequential, no file parallelism) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run seed:superadmin` | Seed or update the SuperAdmin account |

**Frontend (from `frontend/`):**

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

---

## Testing

### Backend Tests

```bash
cd backend
npm test
```

Tests run sequentially (`--no-file-parallelism`) to avoid race conditions on the shared Atlas test cluster. The test suite loads `backend/.env.test` automatically — make sure it points to `eventsphere_test`, not your development database.

**What's covered:**

| File | What it tests |
|------|--------------|
| `src/utils/password.utils.test.ts` | `hashPassword` salt randomness; `comparePassword` correct/incorrect |
| `src/services/otp.service.test.ts` | OTP is 6 digits; hash ≠ plaintext; correct expiry |
| `src/services/token.service.test.ts` | Access/refresh token payloads; expiry; signature rejection |
| `src/__tests__/integration/auth.register.test.ts` | All roles; duplicate email; invalid email; SuperAdmin blocked |
| `src/__tests__/integration/auth.verifyOtp.test.ts` | Valid OTP activates; invalid/expired OTP 401; duplicate verify 409 |
| `src/__tests__/integration/auth.login.test.ts` | Valid credentials; wrong password 401; pending organizer 403; unverified 403 |
| `src/__tests__/integration/auth.refresh.test.ts` | Token rotation; reused token 401; invalid token 401 |
| `src/__tests__/integration/auth.forgotPassword.test.ts` | Full 3-step flow; old password invalidated; all refresh tokens cleared |
| `src/__tests__/integration/admin.pendingOrganizers.test.ts` | SuperAdmin sees list; non-SuperAdmin 403 |
| `src/__tests__/integration/admin.approveOrganizer.test.ts` | Approve sets status active; non-SuperAdmin 403 |

### Frontend Tests

```bash
cd frontend
npm test
```

With coverage:

```bash
npm run test:coverage
```

### Manual Testing

A 73-case manual testing checklist covering responsive layout, theme switching, toast notifications, loading/error states, all authentication flows, route guards, and mobile device behavior is in [`docs/MANUAL_TESTING_CHECKLIST.md`](./docs/MANUAL_TESTING_CHECKLIST.md).

---

## API Reference

All routes are prefixed with the backend base URL (e.g. `http://localhost:5000`).

### Auth Routes — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | None | Register new user (Organizer / Exhibitor / Attendee) |
| `POST` | `/api/auth/verify-otp` | None | Verify registration OTP; activates account |
| `POST` | `/api/auth/resend-otp` | None | Resend registration OTP (max 3 attempts) |
| `POST` | `/api/auth/login` | None | Login; returns `accessToken` + `refreshToken` |
| `POST` | `/api/auth/refresh` | Refresh token (Bearer) | Rotate tokens; returns new pair |
| `POST` | `/api/auth/logout` | Access token (Bearer) | Invalidate refresh token |
| `GET` | `/api/auth/me` | Access token (Bearer) | Get authenticated user profile |
| `POST` | `/api/auth/forgot-password/request` | None | Request password reset OTP |
| `POST` | `/api/auth/forgot-password/verify-otp` | None | Verify reset OTP; returns `resetToken` (10 min expiry) |
| `POST` | `/api/auth/forgot-password/reset` | None | Reset password using `resetToken` |
| `POST` | `/api/auth/forgot-password/resend-otp` | None | Resend password reset OTP (max 3 attempts) |

### Admin Routes — `/api/admin`

SuperAdmin role required for all routes.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/pending-organizers` | List all Organizers with `status: pending` |
| `PATCH` | `/api/admin/organizers/:id/approve` | Set Organizer status to `active` |
| `DELETE` | `/api/admin/organizers/:id/reject` | Delete Organizer account and all refresh tokens |

### Example: Register

**Request**

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "SecurePass123",
  "role": "attendee"
}
```

**Response `201 Created`**

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "alice@example.com",
    "role": "attendee"
  }
}
```

### Example: Login

**Request**

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "SecurePass123"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "alice@example.com",
      "role": "attendee",
      "status": "active"
    }
  }
}
```

### Error Response Format

All error responses share the same shape:

```json
{
  "success": false,
  "message": "Human-readable description of the error",
  "code": "MACHINE_READABLE_CODE"
}
```

Common error codes:

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `TOKEN_EXPIRED` | 401 | JWT access token has expired |
| `TOKEN_REVOKED` | 401 | Refresh token has been rotated or invalidated |
| `INVALID_TOKEN` | 401 | Token is malformed or signed with wrong secret |
| `EMAIL_NOT_VERIFIED` | 403 | Account exists but OTP was never verified |
| `PENDING_APPROVAL` | 403 | Organizer account awaiting SuperAdmin approval |
| `USER_NOT_FOUND` | 404 | No user matches the given credentials or ID |
| `MISSING_REFRESH_TOKEN` | 400 | Refresh endpoint called without a refresh token |

For full API specification, see [`docs/PROJECT_SPEC.md`](./docs/PROJECT_SPEC.md).

---

## Auth Flows

### Registration + OTP Verification (Exhibitor / Attendee)

```
Client                          Backend                        Resend
  │                               │                               │
  ├─── POST /api/auth/register ──►│                               │
  │                               ├── Generate OTP (6-digit) ──► │
  │                               │                               ├── Send OTP email
  │◄── 201 { userId, email } ─────┤                               │
  │                               │                               │
  ├─── POST /api/auth/verify-otp ►│                               │
  │    { email, otp }             ├── Verify hash, activate user  │
  │◄── 200 { accessToken,         │                               │
  │          refreshToken } ──────┤                               │
```

### Login

```
Client                          Backend
  │                               │
  ├─── POST /api/auth/login ─────►│
  │    { email, password }        ├── bcrypt compare
  │                               ├── Check role / status
  │◄── 200 { accessToken,         ├── Generate token pair
  │          refreshToken,        ├── Store refresh token hash
  │          user } ──────────────┤
```

### Token Refresh (Silent)

```
Client                          Backend
  │                               │
  │  [access token expires]       │
  │                               │
  ├─── POST /api/auth/refresh ───►│
  │    Authorization: Bearer      ├── Verify refresh token hash
  │    <refreshToken>             ├── Invalidate old token
  │                               ├── Issue new token pair
  │◄── 200 { accessToken,         │
  │          refreshToken } ──────┤
```

### Forgot Password (3-step)

```
Step 1 — Request OTP
  POST /api/auth/forgot-password/request
  { email }
  → Always returns 200 (prevents email enumeration)
  → OTP emailed to user

Step 2 — Verify OTP
  POST /api/auth/forgot-password/verify-otp
  { email, otp }
  → Returns { resetToken } valid for 10 minutes

Step 3 — Reset Password
  POST /api/auth/forgot-password/reset
  { resetToken, newPassword }
  → Hashes new password
  → Invalidates ALL user refresh tokens
```

### Organizer Approval Workflow

```
Organizer registers
  └─► status: pending
       └─► Redirected to PendingApprovalScreen (polls every 30s)

SuperAdmin logs in → /dashboard/admin
  └─► GET /api/admin/pending-organizers
       ├── Approve → PATCH /api/admin/organizers/:id/approve
       │              └─► status: active → Organizer gains dashboard access
       └── Reject  → DELETE /api/admin/organizers/:id/reject
                      └─► Account deleted
```

---

## Deployment

### Backend (Render / Railway / Heroku)

1. Push your code to a Git repository.
2. Create a new Web Service on Render (or equivalent).
3. Set the build command to:
   ```bash
   cd backend && npm install && npm run build
   ```
4. Set the start command to:
   ```bash
   cd backend && npm start
   ```
5. Add all required environment variables in the platform's dashboard (same as `backend/.env`, with `NODE_ENV=production`).
6. Verify the health check endpoint responds after deployment:
   ```
   GET https://your-backend-url.onrender.com/health
   ```

**Important:** Do not set `DEV_OTP_BYPASS=true` in production — it is hard-blocked when `NODE_ENV=production`, but keep the variable absent or `false` for clarity.

### Frontend (Vercel / Netlify)

1. Connect your repository to Vercel or Netlify.
2. Set the root directory to `frontend/`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-url.onrender.com
   ```
6. Set `FRONTEND_URL` on the backend to your deployed frontend URL (exact origin, no trailing slash):
   ```
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

### Post-Deployment Checklist

- [ ] Backend health check returns `{ "status": "ok", "database": "connected" }`
- [ ] `npm run seed:superadmin` run against the production database (update `MONGODB_URI` temporarily or run from a cloud shell)
- [ ] CORS: `FRONTEND_URL` on backend matches the deployed frontend origin exactly
- [ ] Login with SuperAdmin credentials works end-to-end
- [ ] OTP email is received on registration (Resend domain verified, API key valid)
- [ ] Token refresh works after 15 minutes (no console errors in the browser)

---

## Project Structure

```
eventsphere/
├── backend/
│   ├── scripts/
│   │   └── seedSuperAdmin.js          # Idempotent SuperAdmin seed script
│   ├── src/
│   │   ├── app.ts                     # Express app setup, CORS, routes
│   │   ├── server.ts                  # Server entry point
│   │   ├── config/
│   │   │   ├── database.ts            # MongoDB connection
│   │   │   └── env.ts                 # Zod-validated env config
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts     # JWT authentication (Bearer)
│   │   │   ├── authorize.middleware.ts # Role-based access control
│   │   │   └── error.middleware.ts    # Global error handler
│   │   ├── models/
│   │   │   ├── User.model.ts          # User schema and interface
│   │   │   ├── OTP.model.ts           # OTP schema with TTL index
│   │   │   └── RefreshToken.model.ts  # Refresh token hashes
│   │   ├── routes/
│   │   │   ├── auth.routes.ts         # /api/auth/* endpoints
│   │   │   └── admin.routes.ts        # /api/admin/* endpoints
│   │   ├── services/
│   │   │   ├── token.service.ts       # JWT generation and verification
│   │   │   ├── otp.service.ts         # OTP generation, hashing, verification
│   │   │   └── email.service.ts       # Resend email delivery
│   │   ├── utils/
│   │   │   ├── asyncHandler.ts        # Async route wrapper
│   │   │   └── password.utils.ts      # bcrypt helpers
│   │   └── __tests__/
│   │       ├── setup.ts               # Test DB setup / teardown
│   │       ├── helpers/               # Shared test utilities
│   │       └── integration/           # Integration test suites
│   ├── .env.example
│   ├── .env.test                      # Test database config (not committed)
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Router setup, route declarations
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx        # Auth state, token management, silent refresh
│   │   │   └── ThemeContext.tsx       # Dark/light mode with persistence
│   │   ├── services/
│   │   │   └── api.ts                 # Axios instance with interceptors
│   │   ├── guards/
│   │   │   └── ProtectedRoute.tsx     # Auth + role enforcement
│   │   ├── pages/
│   │   │   ├── auth/                  # Register, Login, VerifyOTP, ForgotPassword
│   │   │   ├── dashboard/             # Role-specific dashboard shells
│   │   │   └── admin/                 # SuperAdmin approval page
│   │   ├── components/
│   │   │   ├── common/               # BentoCard, ToastContainer
│   │   │   └── layout/               # Sidebar, Header, BottomNav
│   │   └── utils/
│   │       └── toast.ts              # showSuccess, showError, showWarning, showInfo
│   ├── .env.example
│   ├── tailwind.config.js            # Design tokens mapped to Tailwind classes
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
│   ├── PROJECT_SPEC.md               # Full feature specification
│   ├── PROGRESS.md                   # Implementation log and decisions
│   ├── MANUAL_TESTING_CHECKLIST.md   # 73 manual test cases
│   ├── DESIGN_TOKENS.md              # Design system reference
│   ├── EMAIL_SERVICE_USAGE.md        # Resend setup and usage guide
│   ├── CORS_CONFIGURATION.md         # CORS setup and troubleshooting
│   ├── CONTEXTS_README.md            # AuthContext and ThemeContext docs
│   ├── FRONTEND_README.md            # Frontend-specific notes
│   └── TEST_DATABASE_CONNECTION.md   # Test database setup guide
│
├── PROGRESS.md                       # Top-level implementation progress tracker
├── README.md                         # This file
└── .gitignore
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/PROJECT_SPEC.md`](./docs/PROJECT_SPEC.md) | Full feature spec for all phases |
| [`PROGRESS.md`](./PROGRESS.md) | Detailed implementation log, all technical decisions, and deviations from spec |
| [`docs/MANUAL_TESTING_CHECKLIST.md`](./docs/MANUAL_TESTING_CHECKLIST.md) | 73 manual test cases across 7 sections |
| [`docs/DESIGN_TOKENS.md`](./docs/DESIGN_TOKENS.md) | EventSphere design system: colors, typography, spacing, radius |
| [`docs/EMAIL_SERVICE_USAGE.md`](./docs/EMAIL_SERVICE_USAGE.md) | Resend integration guide |
| [`docs/CORS_CONFIGURATION.md`](./docs/CORS_CONFIGURATION.md) | CORS setup and common fixes |
| [`docs/CONTEXTS_README.md`](./docs/CONTEXTS_README.md) | AuthContext and ThemeContext API reference |
| [`docs/FRONTEND_README.md`](./docs/FRONTEND_README.md) | Frontend architecture notes |
| [`docs/TEST_DATABASE_CONNECTION.md`](./docs/TEST_DATABASE_CONNECTION.md) | Test database configuration |

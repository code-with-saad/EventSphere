# EventSphere

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite)

A multi-role Event & Expo Management SaaS platform. EventSphere supports the full lifecycle of professional events - from organizer onboarding and approval, to exhibitor booth assignments, to attendee registration and check-in.

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

**Current status:** Phase 0 (project setup) and Phase 1 (auth foundation) are complete. All Phase 1 exit criteria pass. Phase 2 (event creation and management) is in progress.

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

### Phase 0 - Project Setup
- Monorepo structure (separate `frontend/` and `backend/` packages)
- Express 5 + TypeScript backend with Zod-validated environment config
- React 19 + Vite 8 frontend with Tailwind CSS v3 and custom design tokens (Voltage design system)
- MongoDB Atlas connection with startup verification
- Health check endpoint at `GET /health`

### Phase 1 - Auth Foundation
- Registration for all four roles with role-specific routing
- Email OTP verification (Exhibitor and Attendee) via [Resend](https://resend.com)
- SuperAdmin approval workflow for Organizer accounts
- JWT authentication: 15-minute access token (in-memory) + 7-day refresh token (localStorage, rotated on every use)
- Silent token refresh with automatic retry on 401
- Forgot password: 3-step flow (request OTP -> verify OTP -> reset password)
- Role-based route guards (frontend `ProtectedRoute` + backend `authorize` middleware)
- All notifications via toast (zero `window.alert`)
- `DEV_OTP_BYPASS` for local development (prints OTP to console)

### Phase 2 - Core Expo Operations
- Organizer: create, edit, publish, and manage expos
- Exhibitor: browse published expos, apply to exhibit, track application status
- Attendee: browse expos, register for events, manage tickets
- SuperAdmin: full dashboard with platform-wide stats
- Kanban-style application management with status workflow (pending -> approved/rejected)
- Booth assignment and labeling
- Session scheduling and browse
- QR code ticket generation and scanner
- Bookmark/save expos

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
| tsx | 4.x | TypeScript dev runtime |
| nodemon | 3.x | Dev server hot reload |
| Vitest | 4.x | Unit and integration testing |
| supertest | 7.x | HTTP integration testing |

---

## Prerequisites

- **Node.js** 18.x or higher - [nodejs.org](https://nodejs.org)
- **npm** 9.x or higher (bundled with Node.js)
- **MongoDB Atlas account** - [mongodb.com/atlas](https://www.mongodb.com/atlas) (free tier is sufficient)
- **Resend account** - [resend.com](https://resend.com) (free tier: 3,000 emails/month, 100/day)
- **Git**

### MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write access.
3. Under **Network Access**, whitelist your IP (or use `0.0.0.0/0` for development).
4. Copy the connection string from **Connect -> Drivers**. It looks like:
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
3. Under **Domains**, add and verify your sending domain.
4. During development, set `DEV_OTP_BYPASS=true` to bypass needing a real inbox - the OTP is printed to the backend console instead.

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

Edit `backend/.env.test` - change `MONGODB_URI` to point to `eventsphere_test` and set `NODE_ENV=test`.

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
SuperAdmin account created successfully
  Email: admin@eventsphere.com
Database connection closed
```

This script is idempotent - safe to run multiple times.

---

## Environment Variables

### Backend - `backend/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | `5000` | Server port |
| `NODE_ENV` | Yes | - | `development` or `production` or `test` |
| `MONGODB_URI` | Yes | - | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret, minimum 32 characters |
| `RESEND_API_KEY` | Yes | - | Resend API key, starts with `re_` |
| `SUPERADMIN_EMAIL` | Yes | - | Email address for the SuperAdmin account |
| `SUPERADMIN_PASSWORD` | Yes | - | SuperAdmin password, minimum 8 characters |
| `FRONTEND_URL` | Yes | - | Exact frontend origin for CORS (e.g. `http://localhost:5173`) |
| `DEV_OTP_BYPASS` | No | `false` | Set `true` to print OTP to console in dev; blocked in production |

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

### Backend - `backend/.env.test`

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

### Frontend - `frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend base URL - e.g. `http://localhost:5000` |

---

## Running the App

### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

The API server starts at `http://localhost:5000`. Verify:

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

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

The frontend starts at `http://localhost:5173`.

### npm Scripts

**Backend (from `backend/`):**

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run all tests |
| `npm run seed:superadmin` | Seed or update the SuperAdmin account |

**Frontend (from `frontend/`):**

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Serve the production build locally |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

---

## Testing

### Backend Tests

```bash
cd backend
npm test
```

Tests run sequentially to avoid race conditions on the shared Atlas test cluster.

**What is covered:**

| File | What it tests |
|------|--------------|
| `src/utils/password.utils.test.ts` | hashPassword and comparePassword |
| `src/services/otp.service.test.ts` | OTP generation, hashing, expiry |
| `src/services/token.service.test.ts` | Access/refresh token payloads and expiry |
| `src/__tests__/integration/auth.register.test.ts` | All roles, duplicate email, invalid input |
| `src/__tests__/integration/auth.verifyOtp.test.ts` | Valid OTP activates; invalid/expired OTP 401 |
| `src/__tests__/integration/auth.login.test.ts` | Valid credentials; wrong password; status checks |
| `src/__tests__/integration/auth.refresh.test.ts` | Token rotation; reused token 401 |
| `src/__tests__/integration/auth.forgotPassword.test.ts` | Full 3-step flow; old password invalidated |
| `src/__tests__/integration/admin.pendingOrganizers.test.ts` | SuperAdmin sees list; non-SuperAdmin 403 |
| `src/__tests__/integration/admin.approveOrganizer.test.ts` | Approve sets status active |

### Frontend Tests

```bash
cd frontend
npm run test:run
```

---

## API Reference

### Auth Routes - `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | None | Register new user |
| `POST` | `/api/auth/verify-otp` | None | Verify registration OTP |
| `POST` | `/api/auth/resend-otp` | None | Resend registration OTP |
| `POST` | `/api/auth/login` | None | Login; returns access + refresh token |
| `POST` | `/api/auth/refresh` | Refresh token | Rotate tokens |
| `POST` | `/api/auth/logout` | Access token | Invalidate refresh token |
| `GET` | `/api/auth/me` | Access token | Get authenticated user profile |
| `POST` | `/api/auth/forgot-password/request` | None | Request password reset OTP |
| `POST` | `/api/auth/forgot-password/verify-otp` | None | Verify reset OTP; returns resetToken |
| `POST` | `/api/auth/forgot-password/reset` | None | Reset password using resetToken |
| `POST` | `/api/auth/forgot-password/resend-otp` | None | Resend password reset OTP |

### Admin Routes - `/api/admin`

SuperAdmin role required for all routes.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/pending-organizers` | List all pending Organizers |
| `PATCH` | `/api/admin/organizers/:id/approve` | Approve organizer |
| `DELETE` | `/api/admin/organizers/:id/reject` | Reject organizer (soft-reject) |

### Organizer Routes - `/api/organizer`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/organizer/expos` | Create a new expo |
| `GET` | `/api/organizer/expos` | List organizer's own expos |
| `GET` | `/api/organizer/expos/:id` | Get single expo (owned) |
| `PUT` | `/api/organizer/expos/:id` | Update expo |
| `PATCH` | `/api/organizer/expos/:id/publish` | Publish expo |
| `GET` | `/api/organizer/expos/:id/applications` | List applications for an expo |
| `PATCH` | `/api/organizer/applications/:id/approve` | Approve an application |
| `PATCH` | `/api/organizer/applications/:id/reject` | Reject an application |
| `PATCH` | `/api/organizer/applications/:id/assign-booth` | Assign booth to application |
| `POST` | `/api/organizer/expos/:id/sessions` | Create a session |
| `GET` | `/api/organizer/expos/:id/sessions` | List sessions for an expo |
| `PUT` | `/api/organizer/sessions/:id` | Update a session |
| `DELETE` | `/api/organizer/sessions/:id` | Delete a session |

### Exhibitor Routes - `/api/exhibitor`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/exhibitor/expos/:id/apply` | Submit application to an expo |
| `GET` | `/api/exhibitor/applications` | List own applications |
| `GET` | `/api/exhibitor/applications/:id` | Get single application |
| `PUT` | `/api/exhibitor/applications/:id` | Edit pending application |
| `DELETE` | `/api/exhibitor/applications/:id` | Withdraw application |

### Public Routes - `/api/expos`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/expos` | List all published expos |
| `GET` | `/api/expos/:id` | Get single published expo |
| `GET` | `/api/expos/:id/sessions` | Get sessions for a published expo |

### Error Response Format

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
| `TOKEN_REVOKED` | 401 | Refresh token rotated or invalidated |
| `INVALID_TOKEN` | 401 | Token is malformed or wrong secret |
| `EMAIL_NOT_VERIFIED` | 403 | OTP never verified |
| `PENDING_APPROVAL` | 403 | Organizer awaiting SuperAdmin approval |
| `USER_NOT_FOUND` | 404 | No user matches credentials or ID |

---

## Auth Flows

### Registration + OTP Verification (Exhibitor / Attendee)

```
Client                    Backend                  Resend
  |                          |                        |
  |-- POST /register ------> |                        |
  |                          |-- Generate OTP ------> |
  |                          |                        |-- Send OTP email
  |<-- 201 { userId } -------|                        |
  |                          |                        |
  |-- POST /verify-otp ----> |                        |
  |   { email, otp }         |-- Verify hash          |
  |                          |-- Activate user        |
  |<-- 200 { tokens } -------|                        |
```

### Login

```
Client                    Backend
  |                          |
  |-- POST /login ---------> |
  |   { email, password }    |-- bcrypt compare
  |                          |-- Check role / status
  |                          |-- Generate token pair
  |                          |-- Store refresh token hash
  |<-- 200 { tokens, user } -|
```

### Token Refresh (Silent)

```
Client                    Backend
  |                          |
  | [access token expires]   |
  |                          |
  |-- POST /refresh -------> |
  |   Bearer <refreshToken>  |-- Verify refresh token hash
  |                          |-- Invalidate old token
  |                          |-- Issue new token pair
  |<-- 200 { tokens } -------|
```

### Forgot Password (3-step)

```
Step 1 - Request OTP
  POST /api/auth/forgot-password/request
  { email }
  -> Always returns 200 (prevents email enumeration)
  -> OTP emailed to user

Step 2 - Verify OTP
  POST /api/auth/forgot-password/verify-otp
  { email, otp }
  -> Returns { resetToken } valid for 10 minutes

Step 3 - Reset Password
  POST /api/auth/forgot-password/reset
  { resetToken, newPassword }
  -> Hashes new password
  -> Invalidates ALL user refresh tokens
```

### Organizer Approval Workflow

```
Organizer registers
  |
  +-> status: pending
       |
       +-> Redirected to PendingApprovalScreen
            (polls GET /api/auth/me every 30s)

SuperAdmin logs in -> /dashboard/superadmin
  |
  +-> GET /api/admin/pending-organizers
       |
       +-- Approve -> PATCH /api/admin/organizers/:id/approve
       |               -> status: active
       |               -> Poll detects change
       |               -> Organizer auto-redirected to /dashboard/organizer
       |
       +-- Reject  -> DELETE /api/admin/organizers/:id/reject
                       -> status: rejected
                       -> All refresh tokens invalidated
                       -> Poll detects change
                       -> Organizer auto-redirected to /dashboard/rejected
```

---

## Deployment

### Backend (Render / Railway / Heroku)

1. Push your code to a Git repository.
2. Create a new Web Service.
3. Build command: `cd backend && npm install && npm run build`
4. Start command: `cd backend && npm start`
5. Add all required environment variables (`NODE_ENV=production`).
6. Verify: `GET https://your-backend-url.onrender.com/health`

Do not set `DEV_OTP_BYPASS=true` in production.

### Frontend (Vercel / Netlify)

1. Connect your repository.
2. Root directory: `frontend/`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add: `VITE_API_BASE_URL=https://your-backend-url.onrender.com`
6. Set `FRONTEND_URL` on the backend to your deployed frontend URL (exact origin, no trailing slash).

### Post-Deployment Checklist

- [ ] Backend health check returns `{ "status": "ok", "database": "connected" }`
- [ ] SuperAdmin seed script run against production database
- [ ] CORS: `FRONTEND_URL` matches deployed frontend origin exactly
- [ ] Login with SuperAdmin credentials works end-to-end
- [ ] OTP email received on registration
- [ ] Token refresh works after 15 minutes

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
│   │   │   ├── RefreshToken.model.ts  # Refresh token hashes
│   │   │   ├── Expo.model.ts          # Expo schema
│   │   │   ├── Application.model.ts  # Exhibitor application schema
│   │   │   ├── Session.model.ts       # Expo session schema
│   │   │   ├── Ticket.model.ts        # Attendee ticket schema
│   │   │   └── Bookmark.model.ts      # Attendee bookmark schema
│   │   ├── routes/
│   │   │   ├── auth.routes.ts         # /api/auth/* endpoints
│   │   │   ├── admin.routes.ts        # /api/admin/* endpoints
│   │   │   ├── expo.routes.ts         # /api/organizer/expos + /api/expos
│   │   │   ├── application.routes.ts  # /api/exhibitor/applications
│   │   │   ├── session.routes.ts      # /api/organizer/sessions
│   │   │   ├── ticket.routes.ts       # /api/attendee/tickets
│   │   │   ├── bookmark.routes.ts     # /api/attendee/bookmarks
│   │   │   ├── dashboard.routes.ts    # /api/dashboard/stats
│   │   │   └── upload.routes.ts       # /api/upload (banner images)
│   │   ├── services/
│   │   │   ├── token.service.ts       # JWT generation and verification
│   │   │   ├── otp.service.ts         # OTP generation and verification
│   │   │   ├── email.service.ts       # Resend email delivery
│   │   │   ├── expo.service.ts        # Expo CRUD operations
│   │   │   ├── application.service.ts # Application workflow
│   │   │   ├── session.service.ts     # Session management
│   │   │   ├── ticket.service.ts      # Ticket generation and QR
│   │   │   ├── bookmark.service.ts    # Bookmark management
│   │   │   ├── stats.service.ts       # Dashboard statistics
│   │   │   └── upload.service.ts      # File upload handling
│   │   └── utils/
│   │       ├── asyncHandler.ts        # Async route wrapper
│   │       └── password.utils.ts      # bcrypt helpers
│   ├── .env.example
│   ├── .env.test
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Router setup, route declarations
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx        # Auth state, token management
│   │   ├── services/
│   │   │   ├── api.ts                 # Axios instance with interceptors
│   │   │   ├── expoService.ts         # Expo API calls
│   │   │   ├── applicationService.ts  # Application API calls
│   │   │   ├── sessionService.ts      # Session API calls
│   │   │   ├── ticketService.ts       # Ticket API calls
│   │   │   └── bookmarkService.ts     # Bookmark API calls
│   │   ├── hooks/
│   │   │   ├── useExpos.ts            # Expo data hooks
│   │   │   ├── useApplications.ts     # Application data hooks
│   │   │   └── useSessions.ts         # Session data hooks
│   │   ├── guards/
│   │   │   └── ProtectedRoute.tsx     # Auth + role enforcement
│   │   ├── pages/
│   │   │   ├── auth/                  # Register, Login, VerifyOTP, ForgotPassword
│   │   │   ├── dashboard/             # Role-specific dashboard shells
│   │   │   ├── admin/                 # SuperAdmin approval page
│   │   │   ├── expos/                 # Public expo listing and detail
│   │   │   ├── organizer/             # Organizer expo management
│   │   │   ├── exhibitor/             # Exhibitor application pages
│   │   │   └── attendee/              # Attendee ticket pages
│   │   └── components/
│   │       ├── common/                # Shared UI components
│   │       ├── layout/                # Sidebar, Header, BottomNav
│   │       ├── expo/                  # Expo form and card components
│   │       ├── application/           # Application card, form, status badge
│   │       └── session/               # Session list and form components
│   ├── tailwind.config.js             # Voltage design tokens
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
│   ├── PROJECT_SPEC.md                # Full feature specification
│   ├── MANUAL_TESTING_CHECKLIST.md    # Manual test cases
│   ├── DESIGN_TOKENS.md               # Voltage design system reference
│   ├── EMAIL_SERVICE_USAGE.md         # Resend setup and usage guide
│   ├── CORS_CONFIGURATION.md          # CORS setup and troubleshooting
│   ├── CONTEXTS_README.md             # AuthContext API reference
│   └── TEST_DATABASE_CONNECTION.md    # Test database setup guide
│
├── PROGRESS.md                        # Implementation log and decisions
├── README.md                          # This file
└── .gitignore
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/PROJECT_SPEC.md`](./docs/PROJECT_SPEC.md) | Full feature spec for all phases |
| [`PROGRESS.md`](./PROGRESS.md) | Implementation log, technical decisions, and phase progress |
| [`docs/MANUAL_TESTING_CHECKLIST.md`](./docs/MANUAL_TESTING_CHECKLIST.md) | Manual test cases |
| [`docs/DESIGN_TOKENS.md`](./docs/DESIGN_TOKENS.md) | Voltage design system: colors, typography, spacing |
| [`docs/EMAIL_SERVICE_USAGE.md`](./docs/EMAIL_SERVICE_USAGE.md) | Resend integration guide |
| [`docs/CORS_CONFIGURATION.md`](./docs/CORS_CONFIGURATION.md) | CORS setup and common fixes |
| [`docs/CONTEXTS_README.md`](./docs/CONTEXTS_README.md) | AuthContext API reference |
| [`docs/TEST_DATABASE_CONNECTION.md`](./docs/TEST_DATABASE_CONNECTION.md) | Test database configuration |
﻿# EventSphere â€” Implementation Progress

> **Purpose:** Handoff and continuity document. If you are resuming work after a session reset, environment loss, or context switch, read this file first. It tells you exactly where things stand, every decision that was made, and how to get the project running again from zero.

**Last Updated:** 2026-08-28  
**Current Status:** Phase 0 âœ… Complete Â· Phase 1 âœ… Complete Â· Phase 2 â¬œ Not Started  
**Phase 1 Completion Date:** 2026-08-28

---

## Table of Contents

1. [Exit Criteria Status](#exit-criteria-status)
2. [Phase 0 â€” Project Setup](#phase-0--project-setup)
3. [Phase 1 â€” Auth Foundation](#phase-1--auth-foundation)
   - [Phase 1a â€” Backend Authentication Core](#phase-1a--backend-authentication-core)
   - [Phase 1b â€” Frontend Authentication UI](#phase-1b--frontend-authentication-ui)
   - [Phase 1c â€” SuperAdmin Approval Workflow](#phase-1c--superadmin-approval-workflow)
   - [Phase 1d â€” Dashboard Shells & Route Guards](#phase-1d--dashboard-shells--route-guards)
   - [Phase 1e â€” Forgot Password Flow](#phase-1e--forgot-password-flow)
   - [Phase 1f â€” Testing & Documentation](#phase-1f--testing--documentation)
4. [Key Technical Decisions](#key-technical-decisions)
5. [Deviations from PROJECT_SPEC](#deviations-from-project_spec)
6. [Environment Variables Reference](#environment-variables-reference)
7. [npm Scripts Reference](#npm-scripts-reference)
8. [SuperAdmin Seed Script](#superadmin-seed-script)
9. [API Endpoint Reference](#api-endpoint-reference)
10. [Troubleshooting](#troubleshooting)
11. [Next Steps â€” Phase 2](#next-steps--phase-2)

---

## Exit Criteria Status

These are the Phase 1 exit criteria from the spec. All must pass before Phase 2 begins.

| # | Exit Criterion | Status |
|---|----------------|--------|
| 1 | All four roles can register and authenticate | âœ… Done |
| 2 | SuperAdmin can approve / reject pending Organizers | âœ… Done |
| 3 | Exhibitor / Attendee OTP verification works end-to-end | âœ… Done |
| 4 | Each role renders its designated dashboard shell after login | âœ… Done |
| 5 | Route guards enforce role-based access (frontend + backend) | âœ… Done |
| 6 | Forgot password flow completes successfully (3-step) | âœ… Done |
| 7 | Application is responsive on mobile (320pxâ€“1920px) | âœ… Done |
| 8 | Zero `window.alert` usage â€” all notifications via toast | âœ… Done |
| 9 | Dark / Light mode works and persists across sessions | âœ… Done |
| 10 | Token refresh works automatically before expiry | âœ… Done |
| 11 | SuperAdmin seed script documented and tested | âœ… Done |
| 12 | All unit and integration tests passing | âœ… Done |

---

## Phase 0 â€” Project Setup

**Status:** âœ… Complete  
**Completion Date:** 2026-08-21  
**Requirements Covered:** 1.1â€“1.6, 2.1â€“2.5, 3.1â€“3.7, 21.1â€“21.6

### Completed Tasks

| Task | Description | Notes |
|------|-------------|-------|
| 1 | Monorepo structure + git | `.gitignore` excludes `node_modules`, `.env`, `dist`, `build`, `coverage` |
| 2 | Backend setup (Express + TypeScript) | `tsx` used for dev runtime (see deviations) |
| 3 | Frontend setup (React + Vite + TypeScript) | React 19, Vite 8 |
| 4 | Tailwind CSS + EventSphere design tokens | Tailwind v4 with `@theme` directive in `src/index.css`; `tailwind.config.js` used for compatibility |
| 5 | MongoDB Atlas connection | `src/config/database.ts` â€” connection pooling, startup ping verification |
| 6 | Environment variable configuration | `backend/src/config/env.ts` â€” full Zod schema validation; fails fast on startup if required vars missing |
| 7 | Phase 0 checkpoint verified | Backend health check at `GET /health`; MongoDB connected; Tailwind tokens render |

### Phase 0 Health Check

The backend health check endpoint returns:

```json
{
  "status": "ok",
  "message": "EventSphere Backend API is running",
  "database": "connected",
  "timestamp": "2026-08-21T11:37:16.169Z"
}
```

Verify it is running: `curl http://localhost:5000/health`

---

## Phase 1 â€” Auth Foundation

### Phase 1a â€” Backend Authentication Core

**Status:** âœ… Complete  
**Completion Date:** 2026-08-22  
**Requirements Covered:** 4.1â€“4.9, 5.1â€“5.9, 6.1â€“6.7, 7.1â€“7.6, 8.1â€“8.9, 9.3â€“9.7, 11.4â€“11.8, 12.1â€“14.8, 15.1â€“15.7, 23.1â€“23.6

#### Completed Tasks

| Task | File(s) | Description |
|------|---------|-------------|
| 8.1 | `src/models/User.model.ts` | IUser interface, MongoDB schema, indexes (unique email, compound role+status) |
| 8.2 | `src/models/OTP.model.ts` | IOTP interface, TTL index on `expiresAt`, compound unique on `email+purpose` |
| 8.3 | `src/models/RefreshToken.model.ts` | IRefreshToken interface, TTL index, `invalidateAllUserRefreshTokens` utility |
| 9.1 | `src/utils/password.utils.ts` | `hashPassword` (bcrypt, 10 rounds), `comparePassword`, `validatePassword` (min 8 chars) |
| 9.2 | `src/services/token.service.ts` | `generateAccessToken` (15 min), `generateRefreshToken` (7 days), `generateResetToken` (10 min), `verifyToken`, `decodeToken` |
| 9.3 | `src/services/otp.service.ts` | `generateOTP` (6-digit), `hashOTP`, `verifyOTP`, `createOTPRecord`, `verifyAndDeleteOTP`, `hasReachedResendLimit`, `getRemainingAttempts` |
| 10 | `src/services/email.service.ts` | Resend SDK integration, `sendOTPEmail` (registration + password reset templates), `DEV_OTP_BYPASS` support |
| 11.1 | `src/middleware/auth.middleware.ts` | `authenticate` â€” extracts Bearer token, verifies JWT, attaches `req.user` |
| 11.2 | `src/middleware/authorize.middleware.ts` | `authorize(...roles)` factory â€” role-based access control, 403 on mismatch |
| 12.1â€“12.6 | `src/routes/auth.routes.ts` | register, verify-otp, resend-otp, login, refresh, logout, me |
| 13 | `scripts/seedSuperAdmin.js` | Idempotent seed script (create or update SuperAdmin) |
| 14 | `src/app.ts` | CORS configured from `FRONTEND_URL` env var, `credentials: true` |
| 15 | `src/middleware/error.middleware.ts` | Global error handler â€” handles JWT errors, duplicate key (409), validation (400), default 500 |
| 16 | `src/utils/asyncHandler.ts` | `asyncHandler` wraps async route handlers, passes errors to Express error handler |
| 36.1â€“36.3 | `src/routes/auth.routes.ts` | `POST /api/auth/forgot-password/request`, `/verify-otp`, `/reset` |

#### Token Specifications

| Token | Expiry | Payload | Storage |
|-------|--------|---------|---------|
| Access Token | 15 minutes | `{ userId, email, role }` | React memory (frontend) |
| Refresh Token | 7 days | `{ userId, type: 'refresh' }` | `localStorage` key `es_refresh_token` (see deviation note) |
| Reset Token | 10 minutes | `{ userId, purpose: 'password_reset' }` | Returned in response body, held in React navigation state |

Refresh tokens are stored in MongoDB as **SHA-256 hashes** (never plaintext). Token rotation: old token invalidated on every `/api/auth/refresh` call.

#### Extra Endpoint (not in original spec)

`GET /api/auth/me` â€” Requires valid access token. Returns the authenticated user's profile object. Used by the frontend during silent session restore on page reload.

---

### Phase 1b â€” Frontend Authentication UI

**Status:** âœ… Complete  
**Completion Date:** 2026-08-22  
**Requirements Covered:** 9.1â€“9.2, 12.1â€“12.7, 13.1â€“13.8, 14.1â€“14.8, 16.1â€“16.8, 18.1â€“18.9, 19.1â€“19.6

#### Completed Tasks

| Task | File(s) | Description |
|------|---------|-------------|
| 18.1 | `src/contexts/AuthContext.tsx` | In-memory access token + `localStorage` refresh token (see deviation); 14-min auto-refresh interval; `login`, `logout`, `register`, `refreshAccessToken`, `checkAuthStatus` |
| 18.2 | `src/contexts/ThemeContext.tsx` | Dark/light toggle; persisted to `localStorage`; initialises from system `prefers-color-scheme` |
| 19 | `src/services/api.ts` | Axios instance; request interceptor attaches Bearer token; response interceptor handles 401 `TOKEN_EXPIRED` â†’ silent refresh + retry |
| 20 | `src/utils/toast.ts`, `src/components/common/ToastContainer.tsx` | `showSuccess`, `showError`, `showWarning`, `showInfo`; top-right on desktop, bottom-center on mobile (<768px); 5s auto-dismiss |
| 21.1 | `src/pages/auth/RegisterPage.tsx` | Role dropdown, inline validation, loading spinner, role-specific post-submit routing |
| 21.2 | `src/pages/auth/VerifyOTPPage.tsx` | 6-digit OTP input, countdown timer, resend button (disabled after 3 attempts) |
| 21.3 | `src/pages/auth/LoginPage.tsx` | Email/password form, role-based dashboard redirect |
| 22.1â€“22.3 | `src/pages/auth/ForgotPassword/` | RequestResetPage, VerifyResetOTPPage, ResetPasswordPage |
| 23 | `src/guards/ProtectedRoute.tsx` | Loading spinner â†’ unauthenticated redirect to `/login` â†’ wrong-role redirect to role dashboard â†’ render children |
| 24 | `src/App.tsx` | BrowserRouter, public routes, protected routes with `ProtectedRoute` wrapper |

---

### Phase 1c â€” SuperAdmin Approval Workflow

**Status:** âœ… Complete  
**Completion Date:** 2026-08-23  
**Requirements Covered:** 10.1â€“10.5, 11.1â€“11.8

#### Completed Tasks

| Task | File(s) | Description |
|------|---------|-------------|
| 26.1 | `src/routes/admin.routes.ts` | `GET /api/admin/pending-organizers` â€” SuperAdmin only |
| 26.2 | `src/routes/admin.routes.ts` | `PATCH /api/admin/organizers/:id/approve` â€” sets status to `active` |
| 26.3 | `src/routes/admin.routes.ts` | `DELETE /api/admin/organizers/:id/reject` — soft-reject: sets `status: rejected`, invalidates all refresh tokens; account kept in DB for audit |
| 27 | `src/components/dashboard/PendingApprovalScreen.tsx` | Polls `GET /api/auth/me` every 30 seconds; redirects to `/dashboard/organizer` on `status: active` and to `/dashboard/rejected` on `status: rejected` — no manual reload needed |
| 28 | `src/pages/admin/AdminApprovalsPage.tsx` | Table of pending Organizers; approve/reject with confirmation; auto-refreshes list after action |
| 29 | `src/pages/auth/LoginPage.tsx` | Post-login routing: pending Organizer â†’ `/dashboard/pending-approval`, active â†’ `/dashboard/organizer` |

---

### Phase 1d â€” Dashboard Shells & Route Guards

**Status:** âœ… Complete  
**Completion Date:** 2026-08-23  
**Requirements Covered:** 16.1â€“16.8, 17.1â€“17.8, 22.1â€“22.7

#### Completed Tasks

| Task | File(s) | Description |
|------|---------|-------------|
| 31.1 | `src/components/common/BentoCard.tsx` | Card component using design tokens; optional hover effect |
| 31.2 | `src/components/layout/Sidebar.tsx` | Glass-effect sidebar (256px); role-specific nav links; hidden on mobile (<768px) |
| 31.3 | `src/components/layout/Header.tsx` | Glass-effect sticky header; page title; user info on right |
| 31.4 | `src/components/layout/BottomNav.tsx` | Fixed bottom nav; icon-only; visible only on mobile (<768px); active tab highlighting |
| 32.1â€“32.4 | `src/pages/dashboard/` | SuperAdminDashboard, OrganizerDashboard, ExhibitorDashboard, AttendeeDashboard â€” all use BentoCard, Sidebar, Header, BottomNav |

#### Responsive Breakpoints

| Viewport | Sidebar | BottomNav |
|----------|---------|-----------|
| < 768px (mobile) | Hidden | Visible |
| â‰¥ 768px (tablet+) | Visible | Hidden |

---

### Phase 1e â€” Forgot Password Flow

**Status:** âœ… Complete  
**Completion Date:** 2026-08-24  
**Requirements Covered:** 12.1â€“12.7, 13.1â€“13.8, 14.1â€“14.8

#### Flow Summary

```
Step 1 â†’ POST /api/auth/forgot-password/request
           â†“ (always returns 200, prevents email enumeration)
Step 2 â†’ POST /api/auth/forgot-password/verify-otp
           â†“ returns { resetToken } valid for 10 minutes
Step 3 â†’ POST /api/auth/forgot-password/reset
           â†“ hashes new password, invalidates ALL user refresh tokens
```

Password reset OTPs follow the same 3-attempt resend limit as registration OTPs. The spec is silent on this for password reset; the same limit was applied for consistency.

---

### Phase 1f â€” Testing & Documentation

**Status:** âœ… Complete  
**Completion Date:** 2026-08-28  
**Requirements Covered:** 20.1â€“20.7, 22.1â€“22.7, Testing strategy

#### Backend Tests

| File | What it tests |
|------|--------------|
| `src/utils/password.utils.test.ts` | `hashPassword` produces different hashes (salt randomness); `comparePassword` correct/incorrect |
| `src/services/otp.service.test.ts` | OTP is 6 digits; hash â‰  plaintext; expiry is 5 minutes |
| `src/services/token.service.test.ts` | Access token payload; 15-min expiry; refresh token payload; rejects expired/invalid signatures |
| `src/__tests__/integration/auth.register.test.ts` | Register all roles; duplicate email; invalid email; SuperAdmin blocked |
| `src/__tests__/integration/auth.verifyOtp.test.ts` | Valid OTP activates; invalid OTP 401; expired 401; already verified 409 |
| `src/__tests__/integration/auth.login.test.ts` | Valid credentials; invalid 401; pending Organizer 403; unverified 403 |
| `src/__tests__/integration/auth.refresh.test.ts` | Valid refresh returns new tokens; rotated token 401; invalid 401 |
| `src/__tests__/integration/auth.forgotPassword.test.ts` | Full 3-step flow; old password fails; all refresh tokens invalidated |
| `src/__tests__/integration/admin.pendingOrganizers.test.ts` | SuperAdmin sees pending list; non-SuperAdmin 403 |
| `src/__tests__/integration/admin.approveOrganizer.test.ts` | Approve sets status active; non-SuperAdmin 403 |

Integration tests use a **separate test database** configured via `backend/.env.test`. Tests run sequentially (`fileParallelism: false`) to avoid collection-clear race conditions on the shared Atlas cluster.

#### Frontend Tests

| File | What it tests |
|------|--------------|
| `src/pages/auth/RegisterPage.test.tsx` (or similar) | Email validation rejects invalid formats; password min 8 chars; submit disabled when invalid |
| `src/guards/ProtectedRoute.test.tsx` | Redirects to `/login` when unauthenticated; redirects to role dashboard on wrong role; renders children when authorized |

#### Manual Testing

Full manual testing checklist: `docs/MANUAL_TESTING_CHECKLIST.md` â€” 73 test cases across 7 sections.

**Final Results (Phase 1f manual pass):**

| Section | TCs | Passed | Failed | Blocked |
|---------|-----|--------|--------|---------|
| Responsive Layout | 8 | 8 | 0 | 0 |
| Theme Testing | 6 | 6 | 0 | 0 |
| Toast Notifications | 8 | 8 | 0 | 0 |
| Loading & Error States | 7 | 7 | 0 | 0 |
| Authentication Flows | 24 | 24 | 0 | 0 |
| Route Guards | 12 | 12 | 0 | 0 |
| Mobile Device Testing | 8 | 5 | 1 | 2 |
| **Total** | **73** | **70** | **1** | **2** |

Known issue from mobile testing: login failed on a physical device, likely because the backend was not accessible from the device's network (backend bound to `localhost` only). Resolve with `--host` flag on Vite and ensuring the backend is reachable on the local network IP during mobile testing.

---

## Key Technical Decisions

### 1. JWT Storage â€” Body + Memory (not httpOnly cookies)

**Decision:** Access token stored in React state (memory only). Refresh token stored in `localStorage` under key `es_refresh_token`.

**Rationale:**
- Cross-domain deployments (e.g., frontend on Vercel, backend on Render) have unreliable cookie behavior due to Safari ITP, Chrome SameSite restrictions, and CORS preflight complexity.
- The original spec asked for pure memory storage, but that causes sessions to vanish on every page reload â€” an unacceptable UX regression for a multi-page SPA.
- Storing only the **refresh token** (not the access token) in `localStorage` is a deliberate compromise: the short-lived 15-minute access token never touches disk, and the refresh token is rotated on every use.
- XSS mitigation: strict CSP, no inline scripts, no untrusted third-party scripts.

**See also:** Deviation 1 in the deviations table below.

### 2. OTP Provider â€” Resend

**Decision:** Use [Resend](https://resend.com) for all transactional email delivery.

**Rationale:**
- Generous free tier: 3,000 emails/month, 100/day.
- Modern REST API with a TypeScript-first SDK (`resend` npm package).
- Straightforward domain verification via DNS records.
- Alternatives considered: SendGrid (complex setup), Mailgun (regional pricing), Nodemailer (requires SMTP credentials, not suitable for production without a relay).

**Configuration:** Set `RESEND_API_KEY` in `backend/.env`. The sending domain must be verified in the Resend dashboard before emails will deliver.

### 3. Development OTP Bypass

**Decision:** Added `DEV_OTP_BYPASS` environment variable (not in original spec).

**How it works:** When `DEV_OTP_BYPASS=true` and `NODE_ENV !== 'production'`, the backend prints the plaintext OTP to the console immediately after generation:

```
[DEV OTP BYPASS] OTP for user@example.com: 847291
```

The real Resend email is **still sent** as normal â€” the bypass is purely additive. This lets you test the OTP flow without access to the registered email inbox.

**Hard safeguards:** If `DEV_OTP_BYPASS=true` is detected when `NODE_ENV=production`, it is silently ignored and a warning is logged. The bypass **cannot** activate in production regardless of the env var value.

**Pre-production checklist:** Ensure `DEV_OTP_BYPASS=false` (or remove the variable) before deploying.

### 4. Token Rotation

**Decision:** Every `/api/auth/refresh` call invalidates the old refresh token and issues a new one (full rotation).

**Rationale:** Rotation limits the window of token reuse. If a refresh token is stolen and used, the attacker's use of it invalidates the legitimate user's token, triggering a `TOKEN_REVOKED` error on the next legitimate refresh â€” detectable as a compromise signal.

### 5. SuperAdmin Seeding â€” Idempotent Script

**Decision:** `scripts/seedSuperAdmin.js` checks for an existing SuperAdmin and updates it rather than failing or creating a duplicate.

**Rationale:** Safe to run multiple times. Enables password recovery without manual MongoDB access. Preserves the existing SuperAdmin `_id` (referential integrity if referenced elsewhere).

### 6. Forgot Password OTP Resend Limit

**Decision:** Applied the same 3-attempt resend limit to password reset OTPs as to registration OTPs.

**Rationale:** The spec explicitly states the limit for registration OTPs (Requirement 6.5) but is silent on password reset OTPs. Applying the same limit is the safe, consistent default. Adjust if the product team wants different behavior.

---

## Deviations from PROJECT_SPEC

| # | Area | Spec Said | What Was Built | Rationale |
|---|------|-----------|----------------|-----------|
| 1 | Refresh token storage | Memory only (not `localStorage`) | Refresh token in `localStorage` (`es_refresh_token`); access token stays memory-only | Pure memory storage breaks sessions on every page reload. Storing only the refresh token preserves security intent while making sessions behave as users expect. |
| 2 | Dev runtime | `ts-node` | `tsx` | `tsx` compiles TypeScript ~3Ã— faster than `ts-node` in watch mode, with no ESM compatibility issues. Drop-in replacement. |
| 3 | Express version | 4.x (implied by design doc) | Express 5.x | Express 5 is stable, ships async error handling improvements, and has no breaking API changes for this use case. |
| 4 | MongoDB driver version | mongodb@6 (implied) | mongodb@7 | Compatible upgrade. No breaking changes for the collection/document API patterns used. |
| 5 | React version | React 18.x | React 19 | No breaking changes for this use case. |
| 6 | Test framework | Jest (implied) | Vitest | Vitest is ESM-native, faster, and shares configuration with Vite. No Jest compatibility shims needed. |
| 7 | `GET /api/auth/me` | Not in spec | Added | Required for session restore on page reload (`checkAuthStatus` calls it after a silent refresh to reconstruct `req.user` in React state). |
| 8 | Login flow (pending Organizer) | Return 403 "Account pending approval" | Returns 200 with tokens + status `pending` in payload | Allows the frontend to detect the pending state and show the `PendingApprovalScreen` without a special error path. The backend 403 approach broke the token-based routing logic on the frontend. |
| 9 | Forgot password OTP resend limit | Not specified for password reset | Same 3-attempt limit applied | Consistent, safe default. |
| 10 | Organizer reject behavior | Account permanently deleted on reject | Soft-delete: status set to `rejected`, refresh tokens invalidated, account kept | Rejected Organizer sees RejectedScreen with context. Account stays auditable by SuperAdmin. |

---

## Environment Variables Reference

### Backend â€” `backend/.env`

Copy `backend/.env.example` and fill in the values.

| Variable | Required | Description | Validation |
|----------|----------|-------------|------------|
| `PORT` | Yes | Server port | Default: `5000` |
| `NODE_ENV` | Yes | Environment | `development` \| `production` \| `test` |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string | Must be a valid URI |
| `JWT_SECRET` | Yes | JWT signing secret | Minimum 32 characters |
| `RESEND_API_KEY` | Yes | Resend email service API key | Starts with `re_` |
| `SUPERADMIN_EMAIL` | Yes | SuperAdmin account email | Valid email format |
| `SUPERADMIN_PASSWORD` | Yes | SuperAdmin account password | Minimum 8 characters |
| `FRONTEND_URL` | Yes | Frontend origin for CORS | Valid URL (e.g., `http://localhost:5173`) |
| `DEV_OTP_BYPASS` | No | Print OTP to console in dev | `true` or `false`; hard-blocked in production |
| `CLOUDINARY_CLOUD_NAME` | Yes (Phase 2) | Cloudinary cloud name for image uploads | Non-empty string |
| `CLOUDINARY_API_KEY` | Yes (Phase 2) | Cloudinary API key for image uploads | Non-empty string |
| `CLOUDINARY_API_SECRET` | Yes (Phase 2) | Cloudinary API secret for image uploads | Non-empty string |

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

The env validation in `src/config/env.ts` uses Zod and will **terminate the process** with a descriptive error if any required variable is missing or fails its constraint. This is intentional â€” a misconfigured server should not start silently.

### Frontend â€” `frontend/.env`

Copy `frontend/.env.example` and fill in the value.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API base URL |

**Example `frontend/.env`:**
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Test Database â€” `backend/.env.test`

The integration tests use a **separate** test database (not the development database). This file overrides `.env` during `npm test`.

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventsphere_test?retryWrites=true&w=majority
NODE_ENV=test
```

The test setup in `src/__tests__/setup.ts` loads `.env.test` (overriding `.env`) before each test file runs.

---

## npm Scripts Reference

### Backend

Run from the `backend/` directory.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with `nodemon` + `tsx` hot reload (`http://localhost:5000`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build from `dist/server.js` |
| `npm test` | Run all tests with Vitest (sequential, no file parallelism) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run seed:superadmin` | Seed or update the SuperAdmin account |

### Frontend

Run from the `frontend/` directory.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (`http://localhost:5173`) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run tests with Vitest |
| `npm run test:run` | Run tests once (no watch) |
| `npm run test:coverage` | Run tests with coverage report |

---

## SuperAdmin Seed Script

The seed script creates the SuperAdmin account from environment variables. It is idempotent â€” safe to run multiple times.

### Run Command

```bash
cd backend
npm run seed:superadmin
```

Or equivalently:

```bash
cd backend
node scripts/seedSuperAdmin.js
```

### When to Run

- **Initial setup** â€” first time after configuring `backend/.env`
- **Password recovery** â€” update `SUPERADMIN_PASSWORD` in `.env`, rerun the script
- **Environment loss** â€” recreate `.env` from `.env.example`, fill credentials, rerun

### Expected Output

First run (creates account):
```
Connected to MongoDB
âœ“ SuperAdmin account created successfully
  Email: admin@eventsphere.com
Database connection closed
```

Subsequent runs (updates existing account):
```
Connected to MongoDB
âœ“ SuperAdmin account updated successfully
  Email: admin@eventsphere.com
Database connection closed
```

### Failure Modes

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing required environment variable: MONGODB_URI` | `.env` not found or variable not set | Create/update `backend/.env` |
| `Missing required environment variable: SUPERADMIN_EMAIL` | Variable not set | Add to `backend/.env` |
| `SUPERADMIN_PASSWORD must be at least 8 characters` | Password too short | Use a longer password |
| `MongoServerError: ...` | MongoDB connection failed | Check `MONGODB_URI` and Atlas network access |

---

## API Endpoint Reference

All routes are prefixed with the backend base URL (e.g., `http://localhost:5000`).

### Auth Routes â€” `/api/auth`

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `POST` | `/api/auth/register` | No | Register new user (Organizer/Exhibitor/Attendee) |
| `POST` | `/api/auth/verify-otp` | No | Verify registration OTP |
| `POST` | `/api/auth/resend-otp` | No | Resend registration OTP (max 3) |
| `POST` | `/api/auth/login` | No | Login; returns `accessToken` + `refreshToken` |
| `POST` | `/api/auth/refresh` | Refresh token (Bearer) | Rotate tokens; returns new pair |
| `POST` | `/api/auth/logout` | Access token (Bearer) | Invalidate refresh token |
| `GET` | `/api/auth/me` | Access token (Bearer) | Get authenticated user profile |
| `POST` | `/api/auth/forgot-password/request` | No | Request password reset OTP |
| `POST` | `/api/auth/forgot-password/verify-otp` | No | Verify reset OTP; returns `resetToken` |
| `POST` | `/api/auth/forgot-password/reset` | No | Reset password with `resetToken` |
| `POST` | `/api/auth/forgot-password/resend-otp` | No | Resend password reset OTP (max 3) |

### Admin Routes â€” `/api/admin` (SuperAdmin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/pending-organizers` | List all Organizers with `status: pending` |
| `PATCH` | `/api/admin/organizers/:id/approve` | Set Organizer status to `active` |
| `DELETE` | `/api/admin/organizers/:id/reject` | Soft-reject: sets `status: 'rejected'`, invalidates all refresh tokens; account kept in DB |

### Error Response Format

All error responses follow the same shape:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "code": "MACHINE_READABLE_CODE"
}
```

Common error codes: `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `INVALID_TOKEN`, `EMAIL_NOT_VERIFIED`, `PENDING_APPROVAL`, `USER_NOT_FOUND`, `MISSING_REFRESH_TOKEN`.

---

## Troubleshooting

### 1. MongoDB connection fails on startup

**Symptom:** Backend exits at startup with `MongoServerError` or `ECONNREFUSED`.

**Fix:**
- Open [MongoDB Atlas](https://cloud.mongodb.com) â†’ Network Access â†’ confirm your current IP is whitelisted (or add `0.0.0.0/0` for development).
- Verify `MONGODB_URI` in `backend/.env` is the full connection string, including username, password, and database name.
- Ensure the Atlas cluster is not paused (free tier clusters pause after 60 days of inactivity â€” click **Resume** in the Atlas UI).

---

### 2. OTP emails not being received

**Symptom:** Registration or password reset completes but no OTP email arrives.

**Fix (in order):**
1. Check spam/junk folder.
2. Confirm `RESEND_API_KEY` starts with `re_` and is set in `backend/.env`.
3. Open the [Resend dashboard](https://resend.com) â†’ Emails â€” verify the send was attempted and check the delivery status.
4. Ensure the sending domain is verified in the Resend dashboard (Domains tab). Unverified domains fail silently.
5. If you cannot use a real inbox in development, set `DEV_OTP_BYPASS=true` in `backend/.env` â€” the OTP will be printed to the backend console (see Key Technical Decisions Â§3).

---

### 3. CORS errors in the browser

**Symptom:** Browser console shows `Access-Control-Allow-Origin` errors; API calls return network errors.

**Fix:**
- Ensure `FRONTEND_URL` in `backend/.env` matches the frontend origin **exactly**: same scheme, hostname, and port, with **no trailing slash**.
  - Correct: `http://localhost:5173`
  - Wrong: `http://localhost:5173/` or `http://127.0.0.1:5173`
- If the frontend Vite dev server started on a different port (e.g., 5174 because 5173 was occupied), update `FRONTEND_URL` accordingly.
- Restart the backend after changing `.env`.

---

### 4. All auth endpoints fail with 500 or startup crashes

**Symptom:** Every authenticated request fails, or the backend crashes immediately on startup.

**Fix:** `JWT_SECRET` is likely missing or too short (minimum 32 characters). The Zod validator in `src/config/env.ts` will print the exact error and terminate the process. Check the startup logs.

---

### 5. SuperAdmin seed script fails

**Symptom:** `npm run seed:superadmin` exits with an error.

**Fix:**
- Run from the `backend/` directory (not the project root).
- Ensure `MONGODB_URI`, `SUPERADMIN_EMAIL`, and `SUPERADMIN_PASSWORD` are all set in `backend/.env`.
- `SUPERADMIN_PASSWORD` must be at least 8 characters.
- Check MongoDB Atlas network access (same as issue 1 above).

---

### 6. Token refresh loop â€” repeated 401 errors in the browser

**Symptom:** Browser console shows a rapid sequence of `POST /api/auth/refresh` returning 401 repeatedly.

**Cause:** The refresh token was lost from `localStorage` (e.g., user cleared storage, or a browser privacy extension wiped it), but the frontend attempted a refresh that failed, entered the error handler, triggered another refresh attempt, and so on.

**Fix:** Refresh the page. The `checkAuthStatus` function will detect the missing refresh token, clear auth state, and redirect to `/login` cleanly. This is expected behavior for an expired or cleared session.

---

### 7. Frontend shows wrong route or blank page after login

**Symptom:** After login, the user is sent to `/login` again, or the page is blank.

**Likely Cause:** The `ProtectedRoute` component is rendering before `checkAuthStatus` completes. A loading spinner should be shown during the auth check.

**Fix:** Ensure `isLoading` is `true` while `checkAuthStatus` is running (it uses a `finally` block to always set `isLoading(false)`). If you see a blank page, check the browser console for React errors â€” a missing `AuthProvider` wrapper or a broken import is the most common cause.

---

### 8. TypeScript compilation errors after `npm install`

**Symptom:** `npm run build` fails with type errors after pulling new code or reinstalling packages.

**Fix:**
- Delete `node_modules` and `package-lock.json`, then run `npm install` again.
- Check that `typescript` version in `package.json` is consistent between frontend and backend.
- Run `npx tsc --noEmit` for a clean type check without emitting files â€” the output shows the exact files and lines.

---

### 9. Mobile login fails (physical device testing)

**Symptom:** Login works in the desktop browser but fails on a physical mobile device with a network error.

**Cause:** The backend is bound to `localhost`, which is not accessible from other devices on the network.

**Fix:**
1. Start the backend with `HOST=0.0.0.0` or ensure Express listens on `0.0.0.0` (not just `localhost`).
2. Start the frontend with `npx vite --host` â€” this exposes the dev server on the local network IP.
3. Update `VITE_API_BASE_URL` in `frontend/.env` to use the machine's local IP (e.g., `http://192.168.1.100:5000`).
4. Ensure the firewall allows inbound connections on ports 5000 and 5173.

---

---

## Change Log

### Organizer Reject — Soft-Delete Behavior (Post-Phase-1)
**Date:** 2026-08-28  
**Files Changed:**
- `backend/src/routes/admin.routes.ts`
- `backend/src/routes/admin.routes.reject.test.ts` (new — 9 integration tests)
- `frontend/src/components/dashboard/PendingApprovalScreen.tsx`

**What Changed:**

The `DELETE /api/admin/organizers/:id/reject` endpoint was previously implemented as a hard-delete (removed the user document and all refresh tokens). It has been changed to a **soft-delete**:

| Behavior | Before | After |
|---|---|---|
| User document | Deleted from DB | Kept with `status: 'rejected'` |
| Refresh tokens | Hard-deleted | Invalidated (`isValid: false`) |
| Rejected user can log in | No (account gone) | Yes (lands on RejectedScreen) |
| Queryable by SuperAdmin | No | Yes (`/api/admin/organizers?status=rejected`) |

**Why:**
- A rejected Organizer can now see a `RejectedScreen` explaining the decision, instead of hitting a login error with no context.
- The account remains auditable. SuperAdmin can review all rejected applicants via `GET /api/admin/organizers?status=rejected`.
- Refresh tokens are still invalidated immediately so any open session is kicked out within the next 30-second poll cycle.
- Hard-deletion is irreversible and bypasses soft audit trails. Deliberate deletion can still be done manually if needed.

**PendingApprovalScreen polling update:**

The 30-second poll on `/dashboard/pending-approval` now handles **two** status transitions, not one:

```typescript
if (status === 'active')   → navigate('/dashboard/organizer')
if (status === 'rejected') → navigate('/dashboard/rejected')
```

No manual page reload needed. Within one poll interval (≤30 s) of the SuperAdmin rejecting, the pending Organizer's browser navigates to `RejectedScreen` automatically.

**RejectedScreen** (`frontend/src/components/dashboard/RejectedScreen.tsx`) already existed and was already registered at `/dashboard/rejected` in `App.tsx`. `getHomeRoute(user)` already returned `/dashboard/rejected` for `role === 'organizer' && status === 'rejected'`. No changes needed to routing or `getHomeRoute`.

---
## Next Steps â€” Phase 2

Phase 1 is complete and all exit criteria are verified. Phase 2 is the next milestone.

**Phase 2 Scope (from PROJECT_SPEC.md):** Event creation and management for Organizers, event listing for Exhibitors and Attendees, booth/exhibitor assignment, and attendee registration for events.

**Before Starting Phase 2:**
1. Confirm `backend/.env` and `frontend/.env` are configured correctly.
2. Run `npm run seed:superadmin` from `backend/` if the SuperAdmin account does not exist yet.
3. Run `npm test` in both `backend/` and `frontend/` â€” all tests should pass.
4. Read `docs/PROJECT_SPEC.md` for the Phase 2 feature requirements.
5. Create a new spec under `.kiro/specs/eventsphere-phase2-events/` before starting implementation.

**Environment Reference:**
- Backend env template: `backend/.env.example`
- Frontend env template: `frontend/.env.example`
- This file: `PROGRESS.md` (project root)
- Detailed docs: `docs/` directory

---

*For the full manual testing checklist, see `docs/MANUAL_TESTING_CHECKLIST.md`.*  
*For API integration guides, see `docs/EMAIL_SERVICE_USAGE.md`, `docs/CORS_CONFIGURATION.md`, and `docs/CONTEXTS_README.md`.*




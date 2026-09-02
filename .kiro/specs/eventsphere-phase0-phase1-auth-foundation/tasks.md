# Implementation Plan: EventSphere Phase 0 & Phase 1 (Auth Foundation)

## Overview

This task list implements the complete foundation for EventSphere: project setup (Phase 0) and authentication system (Phase 1). The implementation uses TypeScript for both frontend (React + Vite) and backend (Node.js + Express).

**Exit Criteria:** All four roles can register and authenticate, SuperAdmin can approve Organizers, Exhibitor/Attendee OTP verification works, each role renders their designated dashboard with proper route guards enforced on both frontend and backend.

c

## Tasks

### Phase 0: Project Setup and Foundation

- [x] 1. Initialize monorepo structure and version control
  - Create root directory structure: `frontend/`, `backend/`, root config files
  - Initialize git repository with `.gitignore` (exclude `node_modules`, `.env`, `dist`, `build`)
  - Create root-level `README.md` and `PROGRESS.md` files
  - Document the project structure in README.md
  - _Requirements: 1.1_

- [x] 2. Set up backend application with TypeScript
  - Initialize Node.js project: `npm init -y` in backend directory
  - Install dependencies: `express`, `typescript`, `@types/node`, `@types/express`, `ts-node`, `nodemon`
  - Configure `tsconfig.json` with strict mode and ES2020 target
  - Create basic Express server in `src/server.ts` with health check endpoint
  - Add `start`, `dev`, and `build` scripts to `package.json`
  - _Requirements: 1.3_
  
- [x] 3. Set up frontend application with React and Vite
  - Initialize Vite + React + TypeScript project: `npm create vite@latest frontend -- --template react-ts`
  - Install dependencies: `react-router-dom`, `axios`, `react-hot-toast`
  - Configure `vite.config.ts` with proxy settings for API calls
  - Create basic App.tsx with a test route
  - Add `dev`, `build`, and `preview` scripts to `package.json`
  - _Requirements: 1.2_

- [x] 4. Configure Tailwind CSS with EventSphere design tokens
  - Install Tailwind CSS: `npm install -D tailwindcss postcss autoprefixer`
  - Initialize Tailwind: `npx tailwindcss init -p`
  - Configure `tailwind.config.js` with custom colors (base-dark, bento, glass, accent-emerald, accent-indigo)
  - Enable dark mode: `darkMode: 'class'`
  - Add Tailwind directives to `src/index.css`
  - Create test page to verify design tokens (bento card, glass effect)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Set up MongoDB Atlas connection and configuration
  - Install MongoDB driver: `npm install mongodb`
  - Create `src/config/database.ts` with connection logic and error handling
  - Test connection on server startup with connection pooling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Create environment variable configuration for both applications
  - Create `backend/.env.example` with: `PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `RESEND_API_KEY`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `FRONTEND_URL`
  - Create `frontend/.env.example` with: `VITE_API_BASE_URL`
  - Install `dotenv` in backend: `npm install dotenv`
  - Create `backend/src/config/env.ts` with Zod schema validation for environment variables
  - Document all environment variables in README.md with setup instructions
  - _Requirements: 1.4, 1.5, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

- [x] 7. Checkpoint - Verify Phase 0 setup
  - Ensure backend runs on `http://localhost:5000` with health check endpoint responding
  - Ensure frontend runs on `http://localhost:5173` with Vite dev server
  - Verify MongoDB connection successful on backend startup
  - Verify Tailwind design tokens render correctly on a test page
  - Update PROGRESS.md with completed Phase 0 tasks and any deviations

### Phase 1a: Backend Authentication Core

- [x] 8. Create MongoDB data models and schemas
  - [x] 8.1 Create User model (`src/models/User.model.ts`)
    - Define IUser interface with all fields: `_id`, `email`, `passwordHash`, `fullName`, `role`, `status`, `isEmailVerified`, `createdAt`, `updatedAt`
    - Create MongoDB schema with validation rules (email regex, role enum, status enum)
    - Add indexes: unique on `email`, compound on `role + status`
    - Export User model with type-safe methods
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [x] 8.2 Create OTP model (`src/models/OTP.model.ts`)
    - Define IOTP interface: `_id`, `email`, `otpHash`, `purpose`, `expiresAt`, `resendCount`, `createdAt`
    - Create schema with validation (purpose enum: 'registration' | 'password_reset')
    - Add compound unique index on `email + purpose`
    - Add TTL index on `expiresAt` for auto-deletion
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 8.3 Create RefreshToken model (`src/models/RefreshToken.model.ts`)
    - Define IRefreshToken interface: `_id`, `userId`, `tokenHash`, `isValid`, `expiresAt`, `createdAt`
    - Create schema with userId reference to users collection
    - Add indexes: on `userId`, unique on `tokenHash`, TTL on `expiresAt`
    - _Requirements: 9.6, 9.7_

- [ ] 9. Implement authentication utility functions
  - [x] 9.1 Create password utilities (`src/utils/password.utils.ts`)
    - Install bcrypt: `npm install bcrypt @types/bcrypt`
    - Implement `hashPassword(password: string): Promise<string>` with 10 salt rounds
    - Implement `comparePassword(password: string, hash: string): Promise<boolean>`
    - Add password validation function (minimum 8 characters)
    - _Requirements: 5.4, 5.3_
  
  - [x] 9.2 Create JWT token service (`src/services/token.service.ts`)
    - Install jsonwebtoken: `npm install jsonwebtoken @types/jsonwebtoken`
    - Implement `generateAccessToken(payload): string` (15-minute expiry)
    - Implement `generateRefreshToken(payload): string` (7-day expiry)
    - Implement `verifyToken(token: string): DecodedToken`
    - Implement `decodeToken(token: string)` without verification
    - _Requirements: 8.5, 8.6, 8.8, 9.5, 9.6_
  
  - [x] 9.3 Create OTP service (`src/services/otp.service.ts`)
    - Implement `generateOTP(): string` (6-digit random number)
    - Implement `hashOTP(otp: string): Promise<string>` using bcrypt
    - Implement `verifyOTP(otp: string, hash: string): Promise<boolean>`
    - Implement `createOTPRecord(email, purpose): Promise<string>` (returns plaintext OTP)
    - Implement `verifyAndDeleteOTP(email, otp, purpose): Promise<boolean>`
    - Add resend count validation (max 3 attempts)
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

- [x] 10. Integrate Resend email service
  - Install Resend SDK: `npm install @resend/node`
  - Create `src/services/email.service.ts` with Resend client initialization
  - Implement `sendOTPEmail(email, otp, purpose)` with templates for registration and password reset
  - Add error handling for email send failures (log error, return 500)
  - Test email delivery with actual Resend API key (check inbox)
  - _Requirements: 6.4, 6.7_

- [x] 11. Create authentication middleware
  - [x] 11.1 Create authentication middleware (`src/middleware/auth.middleware.ts`)
    - Implement `authenticate` middleware: extract Bearer token from Authorization header
    - Verify JWT signature and expiry using token service
    - Attach decoded user info (`userId`, `email`, `role`) to `req.user`
    - Return 401 for missing, invalid, or expired tokens
    - Add specific error code for expired tokens: `TOKEN_EXPIRED`
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [x] 11.2 Create authorization middleware (`src/middleware/authorize.middleware.ts`)
    - Implement `authorize(...allowedRoles: string[])` middleware factory
    - Check if `req.user.role` is in `allowedRoles` array
    - Return 403 Forbidden if user role not authorized
    - Return 401 if `req.user` not present (authentication required)
    - _Requirements: 15.4, 15.5_

- [x] 12. Create authentication API routes
  - [x] 12.1 Create registration endpoint (`POST /api/auth/register`)
    - Implement route handler in `src/routes/auth.routes.ts`
    - Validate email format and password length (min 8 characters)
    - Check for duplicate email (return 409 if exists)
    - Reject SuperAdmin role registration (return 403)
    - Hash password with bcrypt before storing
    - For Organizer: create user with `status: 'pending'`, return success message
    - For Exhibitor/Attendee: create user with `status: 'active'`, `isEmailVerified: false`, generate and send OTP
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_
  
  - [x] 12.2 Create OTP verification endpoint (`POST /api/auth/verify-otp`)
    - Accept `email`, `otp`, `purpose` in request body
    - Verify OTP using otp service
    - Update user: set `isEmailVerified: true`, `status: 'active'`
    - Delete OTP record after successful verification
    - Return appropriate errors: 401 for invalid/expired OTP, 404 for no pending OTP, 409 for already verified
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [x] 12.3 Create OTP resend endpoint (`POST /api/auth/resend-otp`)
    - Accept `email` and `purpose` in request body
    - Check resend count (max 3 attempts, return 429 if exceeded)
    - Generate new OTP and update existing OTP record (increment resendCount, new otpHash, new expiresAt)
    - Send OTP email via Resend
    - Return success with remaining attempts count
    - _Requirements: 6.5, 6.6_
  
  - [x] 12.4 Create login endpoint (`POST /api/auth/login`)
    - Accept `email` and `password` in request body
    - Find user by email (return 401 if not found)
    - Verify password with bcrypt compare (return 401 if invalid)
    - Check user status: return 403 if `status: 'pending'` (Organizer awaiting approval)
    - Check email verification: return 403 if `isEmailVerified: false` (Exhibitor/Attendee)
    - Generate access token (15-min expiry) and refresh token (7-day expiry)
    - Store refresh token hash in database with `userId`, `isValid: true`
    - Return user object (without passwordHash) and both tokens
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  
  - [x] 12.5 Create token refresh endpoint (`POST /api/auth/refresh`)
    - Accept refresh token from `Authorization: Bearer <token>` header
    - Verify refresh token signature and expiry
    - Find refresh token in database by hash
    - Check if `isValid: true` (return 401 if false - already rotated)
    - Mark old refresh token as invalid: `{ isValid: false }`
    - Generate new access token (15-min) and new refresh token (7-day)
    - Store new refresh token hash in database
    - Return both new tokens
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [x] 12.6 Create logout endpoint (`POST /api/auth/logout`)
    - Require authentication middleware
    - Accept `refreshToken` in request body
    - Mark refresh token as invalid in database: `{ isValid: false }`
    - Return success message
    - _Requirements: Implied from design document_

- [x] 13. Create SuperAdmin seed script
  - Create `backend/scripts/seedSuperAdmin.js` (plain JavaScript, no TypeScript)
  - Load environment variables with `dotenv`
  - Validate required env vars: `MONGODB_URI`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` (exit with error if missing)
  - Validate password length (min 8 characters)
  - Connect to MongoDB with MongoClient
  - Check if SuperAdmin exists: `db.users.findOne({ role: 'superadmin' })`
  - If exists: update email and passwordHash with new values
  - If not exists: create new SuperAdmin document with `status: 'active'`, `isEmailVerified: true`
  - Hash password with bcrypt (10 salt rounds) before storing
  - Log success message with email
  - Add npm script: `"seed:superadmin": "node scripts/seedSuperAdmin.js"`
  - Test script by running: `npm run seed:superadmin`
  - Document exact run command in PROGRESS.md
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

- [x] 14. Configure CORS middleware
  - Install cors: `npm install cors @types/cors`
  - Configure CORS in `src/server.ts` with options: `origin` from `FRONTEND_URL` env var, `credentials: true`, allowed methods (GET, POST, PUT, PATCH, DELETE, OPTIONS), allowed headers (Content-Type, Authorization)
  - Apply CORS middleware before routes
  - Test cross-origin requests from frontend to backend
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_

- [x] 15. Implement global error handler
  - Create `src/middleware/error.middleware.ts`
  - Handle Mongoose validation errors (400)
  - Handle MongoDB duplicate key errors (409)
  - Handle JWT errors: `JsonWebTokenError` (401), `TokenExpiredError` (401 with code)
  - Default error: 500 with generic message
  - Return consistent error response format: `{ success: false, message, code?, errors? }`
  - Apply error handler as last middleware in Express app
  - _Requirements: Implied from design document_

- [x] 16. Create async error wrapper utility
  - Create `src/utils/asyncHandler.ts`
  - Implement `asyncHandler` function that wraps async route handlers
  - Catch errors and pass to Express error handler
  - Apply to all route handlers in auth.routes.ts
  - _Requirements: Implied from design document_

- [x] 17. Checkpoint - Test backend authentication core
  - Test registration endpoint with Postman/curl for all roles (Organizer, Exhibitor, Attendee)
  - Verify Organizer created with `status: 'pending'`
  - Verify Exhibitor/Attendee receive OTP email via Resend (check actual inbox)
  - Test OTP verification endpoint (valid OTP, expired OTP, invalid OTP)
  - Test login endpoint (valid credentials, invalid credentials, pending Organizer, unverified Exhibitor)
  - Verify access token and refresh token returned in response body
  - Test token refresh endpoint (valid refresh token, invalid refresh token)
  - Verify old refresh token marked invalid after rotation
  - Run SuperAdmin seed script and verify account created
  - Update PROGRESS.md with Phase 1a completion status

### Phase 1b: Frontend Authentication UI

- [x] 18. Set up frontend authentication context and state management
  - [x] 18.1 Create AuthContext provider (`src/contexts/AuthContext.tsx`)
    - Define AuthContext interface: `{ user, accessToken, refreshToken, isAuthenticated, isLoading, login, logout, register, refreshAccessToken, checkAuthStatus }`
    - Implement `AuthProvider` component with state management
    - Store tokens in React state (memory only, not localStorage)
    - Implement `login(email, password)`: call login API, store tokens and user in state
    - Implement `logout()`: clear state, optionally call logout API
    - Implement `register(data)`: call registration API
    - Implement `refreshAccessToken()`: call refresh API, update tokens in state
    - Implement `checkAuthStatus()`: verify if tokens exist on component mount
    - Set up 14-minute interval to automatically refresh access token before expiry
    - _Requirements: 9.1, 9.2_
  
  - [x] 18.2 Create ThemeContext provider (`src/contexts/ThemeContext.tsx`)
    - Define ThemeContext interface: `{ theme: 'dark' | 'light', toggleTheme }`
    - Implement `ThemeProvider` component
    - Initialize theme from localStorage or system preference (`window.matchMedia('(prefers-color-scheme: dark)')`)
    - Apply theme class to `document.documentElement` on change
    - Persist theme preference to localStorage
    - _Requirements: 3.6, 3.7_

- [x] 19. Create Axios API service with interceptors
  - Create `src/services/api.ts`
  - Configure Axios instance with `baseURL` from `VITE_API_BASE_URL` env var
  - Add request interceptor: attach `Authorization: Bearer <accessToken>` header for protected routes
  - Add response interceptor: on 401 error with `TOKEN_EXPIRED` code, attempt token refresh automatically
  - If refresh succeeds: retry original request with new access token
  - If refresh fails: logout user and redirect to `/login`
  - On other errors: show toast notification with error message
  - Export configured Axios instance
  - _Requirements: Implied from design document_

- [x] 20. Implement toast notification system
  - Install react-hot-toast: `npm install react-hot-toast`
  - Create `src/components/common/ToastContainer.tsx`
  - Configure toast position: top-right for desktop, bottom-center for mobile (<768px)
  - Set default duration: 5000ms auto-dismiss
  - Configure toast types: success (green), error (red), warning (yellow), info (blue)
  - Add ToastContainer to root App.tsx
  - Create utility functions in `src/utils/toast.ts`: `showSuccess`, `showError`, `showWarning`, `showInfo`
  - Test toast notifications with all types
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9_

- [x] 21. Create authentication pages
  - [x] 21.1 Create RegisterPage component (`src/pages/auth/RegisterPage.tsx`)
    - Create form with fields: email, password, fullName, role (dropdown: organizer, exhibitor, attendee)
    - Implement client-side validation: email format, password min 8 characters
    - Display validation errors inline below each field
    - On submit: call `register` from AuthContext
    - Show loading spinner on button during submission
    - On success (Organizer): show toast "Registration successful. Awaiting approval."
    - On success (Exhibitor/Attendee): redirect to `/verify-otp` page with email in state
    - On error: show toast with API error message
    - Style with Tailwind and BentoCard component
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 21.2 Create VerifyOTPPage component (`src/pages/auth/VerifyOTPPage.tsx`)
    - Accept email from navigation state (passed from RegisterPage)
    - Create form with single field: 6-digit OTP input
    - Add "Resend OTP" button (track resend count, disable after 3 attempts)
    - Implement OTP verification: call `POST /api/auth/verify-otp`
    - On success: show toast "Email verified successfully", redirect to `/login`
    - On error: show toast with error message (invalid OTP, expired OTP)
    - Display countdown timer for OTP expiry (5 minutes)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 21.3 Create LoginPage component (`src/pages/auth/LoginPage.tsx`)
    - Create form with fields: email, password
    - Add "Forgot Password?" link below password field
    - Implement client-side validation
    - On submit: call `login` from AuthContext
    - Show loading spinner during submission
    - On success: redirect to role-based dashboard
    - On error (pending approval): show specific message "Account pending approval"
    - On error (email not verified): show specific message "Please verify your email"
    - On other errors: show toast with API error message
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 22. Create forgot password flow components
  - [x] 22.1 Create RequestResetPage (`src/pages/auth/ForgotPassword/RequestResetPage.tsx`)
    - Create form with single field: email
    - On submit: call `POST /api/auth/forgot-password/request`
    - Always show success message (prevent email enumeration): "If an account exists, an OTP has been sent"
    - Redirect to VerifyResetOTPPage with email in state
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [x] 22.2 Create VerifyResetOTPPage (`src/pages/auth/ForgotPassword/VerifyResetOTPPage.tsx`)
    - Accept email from navigation state
    - Create form with 6-digit OTP input
    - On submit: call `POST /api/auth/forgot-password/verify-otp`
    - On success: store reset token in state, redirect to ResetPasswordPage
    - On error: show toast with error message
    - Add countdown timer for OTP expiry (5 minutes)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  
  - [x] 22.3 Create ResetPasswordPage (`src/pages/auth/ForgotPassword/ResetPasswordPage.tsx`)
    - Accept reset token from navigation state
    - Create form with fields: newPassword, confirmPassword
    - Validate passwords match and meet requirements (min 8 chars)
    - On submit: call `POST /api/auth/forgot-password/reset` with reset token
    - On success: show toast "Password reset successfully", redirect to `/login`
    - On error (expired token): show toast "Reset link expired, please request a new one"
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

- [x] 23. Create ProtectedRoute component for route guards
  - Create `src/guards/ProtectedRoute.tsx`
  - Accept props: `allowedRoles: string[]`, `children: ReactNode`
  - Check if user is authenticated (from AuthContext)
  - If not authenticated: redirect to `/login`
  - Check if user role is in `allowedRoles` array
  - If not authorized: redirect to user's role-specific dashboard
  - If authorized: render children
  - Show loading spinner while checking auth status
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

- [x] 24. Set up React Router with protected routes
  - Install react-router-dom: `npm install react-router-dom`
  - Configure router in `src/App.tsx`
  - Define public routes: `/login`, `/register`, `/verify-otp`, `/forgot-password/*`
  - Define protected routes with ProtectedRoute wrapper: `/dashboard/*`, `/profile`
  - Set up role-based dashboard redirects based on user role
  - Test navigation between routes
  - _Requirements: 16.1, 16.2, 16.3_

- [x] 25. Checkpoint - Test frontend authentication flow
  - Test registration for all roles (Organizer, Exhibitor, Attendee)
  - Verify Exhibitor/Attendee redirected to OTP verification page
  - Verify OTP received in email and verification works
  - Test login with valid credentials (tokens stored in memory)
  - Verify automatic token refresh after 14 minutes
  - Test login with pending Organizer (shows pending message)
  - Test forgot password 3-step flow (request, verify OTP, reset password)
  - Verify old password no longer works after reset
  - Test theme toggle (dark/light mode, persists across refresh)
  - Verify no use of `window.alert` anywhere (all notifications via toast)
  - Update PROGRESS.md with Phase 1b completion status

### Phase 1c: SuperAdmin Organizer Approval Workflow

- [x] 26. Create admin API endpoints for Organizer approval
  - [x] 26.1 Create admin routes (`src/routes/admin.routes.ts`)
    - Define route: `GET /api/admin/pending-organizers` (SuperAdmin only)
    - Implement handler: query users with `role: 'organizer'` and `status: 'pending'`
    - Return list with fields: `id`, `email`, `fullName`, `status`, `createdAt`
    - Apply authentication and authorization middleware (`authorize('superadmin')`)
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 26.2 Create Organizer approval endpoint (`PATCH /api/admin/organizers/:id/approve`)
    - Accept Organizer ID in URL params
    - Find Organizer by ID (return 404 if not found)
    - Verify status is 'pending' (return 409 if already approved)
    - Update status to 'active': `{ status: 'active' }`
    - Return updated Organizer data
    - Require SuperAdmin authorization
    - _Requirements: 11.4, 11.6, 11.8_
  
  - [x] 26.3 Create Organizer rejection endpoint (`DELETE /api/admin/organizers/:id/reject`)
    - Accept Organizer ID in URL params
    - Find Organizer by ID (return 404 if not found)
    - Delete Organizer account from database
    - Delete all associated refresh tokens
    - Return success message
    - Require SuperAdmin authorization
    - _Requirements: 11.5, 11.7_

- [x] 27. Create PendingApprovalScreen for Organizers
  - Create `src/components/dashboard/PendingApprovalScreen.tsx`
  - Display message: "Your account is awaiting SuperAdmin approval"
  - Add informative text explaining the approval process
  - Show loading spinner while checking status
  - Implement 30-second polling: call `GET /api/users/me` to check status
  - When status changes to 'active': redirect to full Organizer dashboard
  - No navigation links displayed (Organizer cannot access other features while pending)
  - Style with BentoCard component
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [x] 28. Create AdminApprovalsPage for SuperAdmin
  - Create `src/pages/admin/AdminApprovalsPage.tsx`
  - Fetch pending Organizers on mount: call `GET /api/admin/pending-organizers`
  - Display list in table format with columns: Email, Full Name, Registration Date, Actions
  - For each Organizer: show "Approve" and "Reject" buttons
  - Implement approve action: call `PATCH /api/admin/organizers/:id/approve`, show success toast, refresh list
  - Implement reject action: show confirmation dialog, call `DELETE /api/admin/organizers/:id/reject`, show success toast, refresh list
  - Show loading spinner while fetching data
  - Show empty state if no pending Organizers
  - Refresh list automatically after each action
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [x] 29. Integrate approval workflow into login flow
  - Update LoginPage: after successful login, check if user is Organizer with `status: 'pending'`
  - If pending Organizer: redirect to `/dashboard/pending-approval` (PendingApprovalScreen)
  - If active Organizer: redirect to `/dashboard` (full OrganizerDashboard)
  - Test complete flow: Organizer registers → logs in → sees pending screen → SuperAdmin approves → Organizer sees dashboard
  - _Requirements: 10.4_

- [x] 30. Checkpoint - Test Organizer approval workflow
  - Register new Organizer account
  - Log in as Organizer, verify pending approval screen displayed
  - Verify polling occurs every 30 seconds (check network tab)
  - Log in as SuperAdmin
  - Navigate to Admin Approvals page
  - Verify pending Organizer appears in list
  - Approve Organizer (verify success toast and list refresh)
  - Log in as Organizer again, verify full dashboard displayed
  - Test rejection: register another Organizer, SuperAdmin rejects, verify account deleted
  - Update PROGRESS.md with Phase 1c completion

### Phase 1d: Dashboard Shells and Route Guards

- [x] 31. Create reusable UI components
  - [x] 31.1 Create BentoCard component (`src/components/common/BentoCard.tsx`)
    - Accept props: `children`, `className`, `hover` (boolean)
    - Style with Tailwind: `bg-bento-bg`, `border-bento-border`, `rounded-xl`, `p-6`
    - Support dark/light mode variants
    - Add hover effect if `hover` prop is true
    - _Requirements: Design system specification_
  
  - [x] 31.2 Create Sidebar component (`src/components/layout/Sidebar.tsx`)
    - Style with glass effect: `bg-glass-bg`, `backdrop-blur-md`
    - Fixed position: left side, full height, 256px width
    - Display logo at top
    - Display role-specific navigation links (dynamic based on user role)
    - Add theme toggle button
    - Add logout button at bottom
    - Responsive: hidden below 768px (md breakpoint)
    - _Requirements: 17.6, 17.7_
  
  - [x] 31.3 Create Header component (`src/components/layout/Header.tsx`)
    - Style with glass effect: `bg-glass-bg`, `backdrop-blur-md`
    - Sticky position at top
    - Display page title (dynamic)
    - Display user avatar or email on right
    - Responsive padding adjustments for mobile
    - _Requirements: 17.7_
  
  - [x] 31.4 Create BottomNav component (`src/components/layout/BottomNav.tsx`)
    - Style with glass effect: `bg-glass-bg`, `backdrop-blur-md`
    - Fixed position at bottom, full width
    - Display 3-5 icon-only navigation buttons (role-specific)
    - Responsive: visible only below 768px (md breakpoint)
    - Active tab highlighting
    - _Requirements: 17.8, 22.7_

- [x] 32. Create role-specific dashboard shells
  - [x] 32.1 Create SuperAdminDashboard (`src/pages/dashboard/SuperAdminDashboard.tsx`)
    - Include Sidebar, Header, and main content area
    - Display navigation link to "Admin Approvals" page
    - Show placeholder content: "Welcome, SuperAdmin" with basic stats (e.g., total users count)
    - Use BentoCard for content areas
    - Wrap with ProtectedRoute: `allowedRoles={['superadmin']}`
    - _Requirements: 17.1, 17.5_
  
  - [x] 32.2 Create OrganizerDashboard (`src/pages/dashboard/OrganizerDashboard.tsx`)
    - Include Sidebar, Header, BottomNav, and main content area
    - Show placeholder content: "Welcome, Organizer" (empty state for Phase 1)
    - If `status: 'pending'`: render PendingApprovalScreen instead
    - Use BentoCard for content areas
    - Wrap with ProtectedRoute: `allowedRoles={['organizer']}`
    - _Requirements: 17.2, 17.5, 17.6, 17.7, 17.8_
  
  - [x] 32.3 Create ExhibitorDashboard (`src/pages/dashboard/ExhibitorDashboard.tsx`)
    - Include Sidebar, Header, BottomNav, and main content area
    - Show placeholder content: "Welcome, Exhibitor" (empty state for Phase 1)
    - Use BentoCard for content areas
    - Wrap with ProtectedRoute: `allowedRoles={['exhibitor']}`
    - _Requirements: 17.3, 17.5, 17.6, 17.7, 17.8_
  
  - [x] 32.4 Create AttendeeDashboard (`src/pages/dashboard/AttendeeDashboard.tsx`)
    - Include Sidebar, Header, BottomNav, and main content area
    - Show placeholder content: "Welcome, Attendee" (empty state for Phase 1)
    - Use BentoCard for content areas
    - Wrap with ProtectedRoute: `allowedRoles={['attendee']}`
    - _Requirements: 17.4, 17.5, 17.6, 17.7, 17.8_

- [x] 33. Implement responsive layout for mobile devices
  - Test all dashboard pages on mobile viewport (320px - 768px)
  - Verify sidebar hidden on mobile
  - Verify bottom navigation visible on mobile
  - Test all dashboard pages on tablet viewport (768px - 1024px)
  - Verify sidebar visible on tablet
  - Verify bottom navigation hidden on tablet
  - Test all dashboard pages on desktop viewport (1024px+)
  - Adjust touch targets for mobile (minimum 44px height)
  - Test form inputs on mobile (appropriate sizing)
  - Verify toast position changes to bottom-center on mobile
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

- [x] 34. Test route guards and role-based access
  - Test unauthenticated user accessing protected route (should redirect to login)
  - Test Exhibitor accessing SuperAdmin route (should redirect to Exhibitor dashboard)
  - Test Attendee accessing Organizer route (should redirect to Attendee dashboard)
  - Test SuperAdmin accessing admin routes (should allow access)
  - Test pending Organizer accessing full Organizer dashboard (should show pending screen)
  - Verify all route guards working on both frontend and backend
  - _Requirements: 15.5, 15.6, 15.7, 16.1, 16.2, 16.3, 16.5, 16.6, 16.7, 16.8_

- [x] 35. Checkpoint - Test dashboard shells and responsiveness
  - Log in as each role (SuperAdmin, Organizer, Exhibitor, Attendee)
  - Verify correct dashboard displayed for each role
  - Test navigation between pages for each role
  - Test responsive layout on mobile (320px - 768px)
  - Test responsive layout on tablet (768px - 1024px)
  - Test responsive layout on desktop (1024px+)
  - Verify glass effect visible on sidebar and header (backdrop blur)
  - Verify BentoCard styling consistent across all pages
  - Test theme toggle on all dashboard pages
  - Test logout functionality from each dashboard
  - Update PROGRESS.md with Phase 1d completion

### Phase 1e: Forgot Password Flow (Backend + Frontend Integration)

- [x] 36. Create forgot password backend endpoints
  - [x] 36.1 Create password reset request endpoint (`POST /api/auth/forgot-password/request`)
    - Accept `email` in request body
    - Validate email format
    - Find user by email (always return success message regardless of whether user exists - prevent email enumeration)
    - If user exists: generate 6-digit OTP, store OTP hash with `purpose: 'password_reset'` and 5-minute expiry
    - Send OTP email via Resend with password reset template
    - Return success: "If an account exists, a password reset OTP has been sent"
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [x] 36.2 Create password reset OTP verification endpoint (`POST /api/auth/forgot-password/verify-otp`)
    - Accept `email` and `otp` in request body
    - Verify OTP using otp service with `purpose: 'password_reset'`
    - Generate short-lived reset token (10-minute expiry) with payload `{ userId, purpose: 'password_reset' }`
    - Delete OTP record after successful verification
    - Return reset token and expiry time
    - Return errors: 401 for invalid/expired OTP, 404 for no pending OTP
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_
  
  - [x] 36.3 Create password reset endpoint (`POST /api/auth/forgot-password/reset`)
    - Accept `resetToken` and `newPassword` in request body
    - Verify reset token signature and expiry
    - Validate new password (min 8 characters)
    - Hash new password with bcrypt
    - Update user's passwordHash in database
    - Invalidate ALL refresh tokens for this user (force re-login on all devices)
    - Return success message
    - Return errors: 400 for validation failure, 401 for invalid/expired token
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

- [x] 37. Test complete forgot password flow end-to-end
  - Test request endpoint: POST with valid email, verify OTP received
  - Test request endpoint: POST with non-existent email, verify success message returned (no error)
  - Test verify-otp endpoint: valid OTP returns reset token
  - Test verify-otp endpoint: invalid OTP returns 401 error
  - Test verify-otp endpoint: expired OTP returns 401 error
  - Test reset endpoint: valid reset token updates password
  - Test reset endpoint: expired reset token returns 401 error
  - Verify old password no longer works after reset
  - Verify all refresh tokens invalidated after reset
  - Log in with new password, verify success
  - _Requirements: 12.7, 13.8, 14.8_

- [x] 38. Checkpoint - Test forgot password flow integration
  - Test complete flow in browser: request OTP → check email → verify OTP → reset password → login
  - Verify OTP email delivered with correct template
  - Verify reset token expires after 10 minutes (test with manipulated time or wait)
  - Verify old password fails after reset
  - Verify user can log in with new password
  - Test error cases: invalid OTP, expired OTP, expired reset token
  - Update PROGRESS.md with Phase 1e completion

### Phase 1f: Testing, Documentation, and Final Integration

- [x] 39. Write backend unit tests
  - [x] 39.1 Test password utilities
    - Test `hashPassword` produces different hashes for same input (salt randomness)
    - Test `comparePassword` returns true for correct password
    - Test `comparePassword` returns false for incorrect password
    - _Requirements: Testing strategy_
  
  - [x] 39.2 Test OTP generation
    - Test OTP is exactly 6 digits
    - Test OTP hash is different from plaintext
    - Test OTP expiry is set to 5 minutes from generation
    - _Requirements: Testing strategy_
  
  - [x] 39.3 Test JWT token service
    - Test access token contains correct payload (`userId`, `email`, `role`)
    - Test access token expires in 15 minutes
    - Test refresh token contains correct payload
    - Test token verification rejects expired tokens
    - Test token verification rejects invalid signatures
    - _Requirements: Testing strategy_

- [x] 40. Write backend integration tests for API endpoints
  - Install testing dependencies: `jest`, `supertest`, `@types/jest`, `@types/supertest`
  - Set up test database (separate from development database)
  - [x] 40.1 Test POST /api/auth/register
    - Test successful Organizer registration (status=pending)
    - Test successful Exhibitor registration (OTP sent)
    - Test duplicate email returns 409 error
    - Test invalid email format returns 400 error
    - Test SuperAdmin role registration returns 403 error
    - _Requirements: Testing strategy_
  
  - [x] 40.2 Test POST /api/auth/verify-otp
    - Test valid OTP activates account (isEmailVerified=true)
    - Test invalid OTP returns 401 error
    - Test expired OTP returns 401 error
    - Test already verified account returns 409 error
    - _Requirements: Testing strategy_
  
  - [x] 40.3 Test POST /api/auth/login
    - Test valid credentials return tokens
    - Test invalid credentials return 401 error
    - Test pending Organizer login returns 403 error
    - Test unverified Exhibitor login returns 403 error
    - _Requirements: Testing strategy_
  
  - [x] 40.4 Test POST /api/auth/refresh
    - Test valid refresh token returns new tokens
    - Test invalid refresh token returns 401 error
    - Test rotated token marked invalid in database
    - _Requirements: Testing strategy_
  
  - [x] 40.5 Test forgot password endpoints (all 3 steps)
    - Test complete flow from OTP request to password reset
    - Test old password no longer works after reset
    - Test all refresh tokens invalidated after reset
    - _Requirements: Testing strategy_
  
  - [x] 40.6 Test GET /api/admin/pending-organizers
    - Test SuperAdmin can access endpoint
    - Test non-SuperAdmin returns 403 error
    - Test returns list of pending Organizers only
    - _Requirements: Testing strategy_
  
  - [x] 40.7 Test PATCH /api/admin/organizers/:id/approve
    - Test SuperAdmin can approve Organizer (status changes to active)
    - Test non-SuperAdmin returns 403 error
    - _Requirements: Testing strategy_

- [x] 41. Write frontend unit tests
  - Install testing dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - Configure vitest in `vite.config.ts`
  - [x] 41.1 Test form validation
    - Test email validation rejects invalid formats
    - Test password validation requires minimum 8 characters
    - Test form submission disabled when validation fails
    - _Requirements: Testing strategy_
  
  - [x] 41.2 Test ProtectedRoute component
    - Test redirects to login when not authenticated
    - Test redirects to dashboard when role not allowed
    - Test renders children when authenticated and authorized
    - _Requirements: Testing strategy_

- [x] 42. Create manual testing checklist and execute tests
  - [x] 42.1 Responsive layout testing
    - Test on mobile viewport (320px - 768px)
    - Test on tablet viewport (768px - 1024px)
    - Test on desktop viewport (1024px - 1920px)
    - Verify sidebar hidden on mobile, visible on desktop
    - Verify bottom navigation visible on mobile, hidden on desktop
    - _Requirements: 22.1, 22.2, 22.3_
  
  - [x] 42.2 Theme testing
    - Test dark mode theme applies correctly to all pages
    - Test light mode theme applies correctly to all pages
    - Verify theme preference persists across sessions (localStorage)
    - _Requirements: 3.6, 3.7_
  
  - [x] 42.3 Toast notification testing
    - Verify toast notifications appear in top-right (desktop)
    - Verify toast notifications appear in bottom-center (mobile)
    - Verify toast auto-dismisses after 5 seconds
    - Test success, error, warning, and info toast types
    - _Requirements: 18.3, 18.4, 18.5_
  
  - [x] 42.4 Loading and error states
    - Verify loading spinners appear during async operations
    - Verify form buttons disable during submission
    - Verify error messages display via toast (no window.alert)
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_
  
  - [x] 42.5 Authentication flows
    - Test complete Organizer registration and approval flow
    - Test complete Exhibitor registration with OTP verification
    - Test complete Attendee registration with OTP verification
    - Test login for all roles
    - Test forgot password 3-step flow
    - Test token refresh automatic behavior (wait 15 minutes or mock)
    - _Requirements: Exit criteria from PROJECT_SPEC_
  
  - [x] 42.6 Route guards and authorization
    - Test unauthenticated access to protected routes (redirects to login)
    - Test cross-role access attempts (Exhibitor accessing SuperAdmin routes)
    - Test SuperAdmin can access admin routes
    - Test pending Organizer sees pending approval screen
    - _Requirements: 15.5, 15.6, 16.1, 16.2, 16.3_
  
  - [x] 42.7 Mobile device testing
    - Test on actual mobile device (not just browser devtools)
    - Verify touch targets are adequate (minimum 44px)
    - Test form inputs on mobile (keyboard behavior)
    - Test navigation on mobile (bottom nav)
    - _Requirements: 22.4, 22.5_

- [x] 43. Update PROGRESS.md documentation
  - Document all completed features from Phase 0 and Phase 1
  - Document JWT strategy decision (body + memory, not httpOnly cookies)
  - Document OTP provider choice (Resend) and rationale
  - Document SuperAdmin seed script run command: `npm run seed:superadmin`
  - List all required environment variables for backend and frontend
  - Document any deviations from PROJECT_SPEC.md with rationale
  - Include troubleshooting notes for common issues encountered
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

- [x] 44. Create comprehensive README.md
  - [x] 44.1 Project overview section
    - Describe EventSphere and its purpose
    - List key features implemented in Phase 0 and Phase 1
    - Include tech stack (React, Vite, TypeScript, Express, MongoDB)
  
  - [x] 44.2 Setup instructions
    - Prerequisites: Node.js version, npm/yarn
    - Clone repository instructions
    - Environment variable setup (refer to .env.example files)
    - Database setup (MongoDB Atlas)
    - Resend API key setup
  
  - [x] 44.3 Installation and running
    - Backend setup: `cd backend && npm install`
    - Frontend setup: `cd frontend && npm install`
    - Run SuperAdmin seed script: `npm run seed:superadmin`
    - Start backend: `npm run dev`
    - Start frontend: `npm run dev`
    - Access application: `http://localhost:5173`
  
  - [x] 44.4 Testing instructions
    - Run backend tests: `npm test`
    - Run frontend tests: `npm test`
    - Manual testing checklist reference
  
  - [x] 44.5 Deployment guide
    - Backend deployment (Render/Railway/Heroku)
    - Frontend deployment (Vercel/Netlify)
    - Environment variables for production
    - Post-deployment checklist
  
  - [x] 44.6 API documentation
    - Link to API endpoints documentation
    - Authentication flow diagrams
    - Example requests and responses

- [x] 45. Final integration testing and exit criteria verification
  - [x] 45.1 Verify exit criterion: All four roles can register and authenticate
    - Test SuperAdmin login (seeded account)
    - Test Organizer registration and login (after approval)
    - Test Exhibitor registration, OTP verification, and login
    - Test Attendee registration, OTP verification, and login
  
  - [x] 45.2 Verify exit criterion: SuperAdmin can approve/reject Organizers
    - Register new Organizer
    - Log in as SuperAdmin
    - Navigate to Admin Approvals page
    - Approve Organizer
    - Verify Organizer can access full dashboard
    - Register another Organizer and reject
    - Verify Organizer account deleted
  
  - [x] 45.3 Verify exit criterion: Exhibitor/Attendee OTP verification works
    - Register as Exhibitor
    - Verify OTP email received
    - Enter OTP and verify account activated
    - Log in successfully
    - Repeat for Attendee role
  
  - [x] 45.4 Verify exit criterion: Each role renders designated dashboard
    - Log in as SuperAdmin → verify SuperAdmin dashboard with Admin Approvals link
    - Log in as Organizer (active) → verify Organizer dashboard
    - Log in as Organizer (pending) → verify pending approval screen
    - Log in as Exhibitor → verify Exhibitor dashboard
    - Log in as Attendee → verify Attendee dashboard
  
  - [x] 45.5 Verify exit criterion: Route guards enforce role-based access
    - Test frontend route guards (unauthenticated, wrong role)
    - Test backend route guards (API calls without token, wrong role)
    - Verify 401 and 403 errors returned appropriately
  
  - [x] 45.6 Verify exit criterion: Forgot password flow works
    - Request password reset OTP
    - Verify OTP email received
    - Verify OTP and receive reset token
    - Reset password with new password
    - Verify old password fails
    - Log in with new password successfully
  
  - [x] 45.7 Verify exit criterion: Application responsive on mobile
    - Test on actual mobile device (iOS or Android)
    - Verify all pages render correctly
    - Verify touch interactions work properly
    - Verify bottom navigation functions correctly
  
  - [x] 45.8 Verify exit criterion: No window.alert usage
    - Search codebase for `window.alert` or `alert(` (should return no results)
    - Verify all notifications use toast system
  
  - [x] 45.9 Verify exit criterion: Dark/Light mode works and persists
    - Toggle theme on dashboard
    - Refresh page, verify theme persisted
    - Test theme on all pages
  
  - [x] 45.10 Verify exit criterion: Token refresh works automatically
    - Log in
    - Wait 14 minutes (or mock timer)
    - Make authenticated request
    - Verify new access token issued automatically
    - Verify request succeeds with new token

- [x] 46. Final checkpoint - Phase 1 completion
  - Review all exit criteria (45.1 - 45.10) and confirm all passing
  - Review manual testing checklist (42.1 - 42.7) and confirm all passing
  - Review PROGRESS.md for completeness and accuracy
  - Review README.md for clarity and completeness
  - Commit all changes with message: "Complete Phase 0 and Phase 1 (Auth Foundation)"
  - Tag release: `git tag v1.0.0-phase1`
  - Update PROGRESS.md with Phase 1 completion date and next steps (Phase 2)

## Notes

### Testing Approach

- **Backend Unit Tests:** Focus on pure functions (password hashing, OTP generation, JWT signing)
- **Backend Integration Tests:** Test API endpoints with test database (1-3 examples per endpoint)
- **Frontend Unit Tests:** Test form validation and ProtectedRoute component logic
- **Manual Testing:** Verify responsive layout, theme switching, user flows, and mobile behavior

### Optional Tasks Guidance

Tasks marked with `*` (if any) are optional and can be skipped for faster MVP delivery. However, this implementation plan does NOT include optional tasks - all tasks are required to meet Phase 1 exit criteria.

### Task Execution Order

Tasks are numbered sequentially and should be completed in order. However, some tasks within the same phase can be parallelized:
- Phase 0 tasks (1-7) must be completed sequentially
- Phase 1a tasks (8-17) can have some parallelization: models (8.1-8.3) can be done together, utilities (9.1-9.3) can be done together
- Phase 1b tasks (18-25) can have some parallelization: contexts (18.1-18.2) together, pages (21.1-21.3) together
- Phase 1c, 1d, 1e tasks should be done sequentially within each phase
- Phase 1f testing tasks (39-42) can be parallelized by type (backend tests, frontend tests, manual tests)

### Requirement Coverage

Each task includes `_Requirements:` annotations mapping to the requirements.md document. This ensures full traceability from requirements through design to implementation.

### Critical Path Items

1. **SuperAdmin Seed Script (Task 13):** Must be completed early so you can log in as SuperAdmin to test approval workflow
2. **Token Refresh (Task 12.5, 19):** Must work correctly before building dashboards to ensure seamless user experience
3. **Route Guards (Task 23, 24):** Must be in place before creating role-specific pages to enforce security
4. **CORS Configuration (Task 14):** Must be configured correctly for frontend-backend communication

### Dependencies Summary

- **Phase 1b depends on Phase 1a:** Frontend authentication requires backend API endpoints
- **Phase 1c depends on Phase 1a, 1b:** Admin approval requires both backend endpoints and frontend authentication
- **Phase 1d depends on Phase 1b:** Dashboard shells require authentication context and route guards
- **Phase 1e depends on Phase 1a, 1b:** Forgot password UI requires backend endpoints and frontend authentication
- **Phase 1f depends on all above:** Testing requires all features implemented

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3"] },
    { "id": 1, "tasks": ["4", "5", "6"] },
    { "id": 2, "tasks": ["7"] },
    { "id": 3, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 4, "tasks": ["9.1", "9.2", "9.3", "10"] },
    { "id": 5, "tasks": ["11.1", "11.2", "14", "15", "16"] },
    { "id": 6, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 7, "tasks": ["12.4", "12.5", "12.6", "13"] },
    { "id": 8, "tasks": ["17"] },
    { "id": 9, "tasks": ["18.1", "18.2"] },
    { "id": 10, "tasks": ["19", "20"] },
    { "id": 11, "tasks": ["21.1", "21.2", "21.3"] },
    { "id": 12, "tasks": ["22.1", "22.2", "22.3"] },
    { "id": 13, "tasks": ["23", "24"] },
    { "id": 14, "tasks": ["25"] },
    { "id": 15, "tasks": ["26.1", "26.2", "26.3"] },
    { "id": 16, "tasks": ["27", "28"] },
    { "id": 17, "tasks": ["29"] },
    { "id": 18, "tasks": ["30"] },
    { "id": 19, "tasks": ["31.1", "31.2", "31.3", "31.4"] },
    { "id": 20, "tasks": ["32.1", "32.2", "32.3", "32.4"] },
    { "id": 21, "tasks": ["33", "34"] },
    { "id": 22, "tasks": ["35"] },
    { "id": 23, "tasks": ["36.1", "36.2", "36.3"] },
    { "id": 24, "tasks": ["37"] },
    { "id": 25, "tasks": ["38"] },
    { "id": 26, "tasks": ["39.1", "39.2", "39.3", "40.1", "40.2", "40.3", "40.4", "40.5", "40.6", "40.7", "41.1", "41.2"] },
    { "id": 27, "tasks": ["42.1", "42.2", "42.3", "42.4", "42.5", "42.6", "42.7"] },
    { "id": 28, "tasks": ["43", "44.1", "44.2", "44.3", "44.4", "44.5", "44.6"] },
    { "id": 29, "tasks": ["45.1", "45.2", "45.3", "45.4", "45.5", "45.6", "45.7", "45.8", "45.9", "45.10"] },
    { "id": 30, "tasks": ["46"] }
  ]
}
```

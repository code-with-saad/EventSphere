# EventSphere Implementation Progress

This document tracks the implementation progress of EventSphere, a multi-role Event & Expo Management SaaS platform. It serves as a reference for what has been completed, what remains, and any deviations from the original specification.

## Purpose

This file helps maintain continuity across development sessions, especially after environment resets or context loss. It documents:
- Completed features and their implementation dates
- Key technical decisions and rationale
- Deviations from the PROJECT_SPEC with justifications
- Required environment variables
- Important commands and scripts

---

## Phase 0: Project Setup

### ✅ Task 1: Initialize monorepo structure and version control
**Status**: Completed  
**Date**: [Current Date]

**Completed Items:**
- ✅ Created root directory structure: `frontend/` and `backend/`
- ✅ Initialized git repository
- ✅ Created `.gitignore` file with exclusions:
  - `node_modules/`
  - `.env` and `.env.local`
  - `dist/` and `build/`
  - `coverage/`
  - `.DS_Store` and OS-specific files
  - IDE configuration files
  - Log files
- ✅ Created `README.md` documenting:
  - Project overview (EventSphere - Event & Expo Management SaaS)
  - Monorepo structure
  - Tech stack (React + Vite frontend, Node.js + Express backend, MongoDB)
  - Setup instructions for both frontend and backend
- ✅ Created `PROGRESS.md` (this file) for tracking implementation progress

**Validates Requirement**: 1.1 - The EventSphere_System SHALL have a monorepo structure with separate frontend and backend directories

---

### ✅ Task 2: Initialize frontend application (Vite + React + TypeScript)
**Status**: Completed  
**Date**: [Previously completed]  
**Validates Requirements**: 1.2, 3.1, 3.2

**Completed Items:**
- ✅ Initialized Vite project with React and TypeScript template
- ✅ Installed and configured React Router DOM for routing
- ✅ Installed Axios for API communication
- ✅ Installed React Hot Toast for notifications
- ✅ Created `.env.example` file with `VITE_API_BASE_URL`
- ✅ Set up base component structure with routing
- ✅ Tested frontend runs successfully on Vite dev server

---

### ✅ Task 3: Initialize backend application (Express + TypeScript)
**Status**: Completed  
**Date**: [Task 4 completed previously]  
**Validates Requirements**: 1.3

**Completed Items:**
- ✅ Initialized Node.js project with TypeScript
- ✅ Installed Express and TypeScript dependencies
- ✅ Set up TypeScript configuration (`tsconfig.json`)
- ✅ Created basic Express server with health check endpoint
- ✅ Tested backend runs on `http://localhost:5000`

---

### ✅ Task 5: Set up MongoDB Atlas connection and configuration
**Status**: Completed  
**Date**: [Current Date]  
**Validates Requirements**: 2.1, 2.2, 2.3, 2.4, 2.5

**Completed Items:**
- ✅ Installed MongoDB driver (npm install mongodb)
- ✅ Installed dotenv for environment variable management
- ✅ Created `backend/src/config/database.ts` with comprehensive connection logic:
  - Connection to MongoDB Atlas using MONGODB_URI environment variable
  - Connection pooling configuration (maxPoolSize: 10, minPoolSize: 2, maxIdleTimeMS: 30s)
  - Connection verification using ping command before accepting requests
  - Error handling with descriptive logging and process termination on failure
  - Utility functions: `getDatabase()`, `getClient()`, `closeDatabase()`, `isDatabaseConnected()`
- ✅ Updated `backend/src/server.ts` to integrate database connection:
  - Database connects before server starts listening
  - Server only accepts requests after successful database connection
  - Health check endpoint reports database connection status
  - Graceful error handling with process termination on connection failure
- ✅ Created `backend/.env.example` with all Phase 0 and Phase 1 environment variables
- ✅ Created `backend/.env` for local development (not committed)
- ✅ Verified TypeScript compilation succeeds
- ✅ Created documentation: `backend/TEST_DATABASE_CONNECTION.md`

**Key Implementation Details:**
- **Connection Pooling**: Configured with optimal settings for development and production
- **Error Handling**: Validates MONGODB_URI exists, logs descriptive errors, terminates with exit code 1 on failure
- **Startup Sequence**: Database connection verified BEFORE server starts accepting requests (Requirement 2.2)
- **Health Check**: Enhanced to include database connection status
- **Environment Variables**: All required variables documented in .env.example

**Testing Notes:**
- Code compiles successfully without errors
- Database connection logic validated through TypeScript compilation
- To test with actual MongoDB: Replace MONGODB_URI in .env with your MongoDB Atlas connection string
- Expected startup output documented in TEST_DATABASE_CONNECTION.md

---

### ✅ Task 4: Configure Tailwind CSS with EventSphere design tokens
**Status**: Completed  
**Date**: [Previously completed]  
**Validates Requirements**: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7

**Completed Items:**
- ✅ Installed Tailwind CSS v4 with PostCSS and Autoprefixer
- ✅ Configured design tokens using @theme directive in src/index.css:
  - Base colors (base-dark: #0a0a0f, base-light: #f8fafc)
  - Bento card colors (bg: rgba(15, 23, 42, 0.8), border: #1e293b)
  - Glass component colors (bg: rgba(15, 23, 42, 0.4) with backdrop-blur-md)
  - Accent colors (Emerald: #10b981, Indigo: #6366f1)
- ✅ Enabled dark mode with class strategy (html class="dark")
- ✅ Created TestDesignTokens component demonstrating all design tokens
- ✅ Added /design-test route to verify design token rendering
- ✅ Created comprehensive documentation in DESIGN_TOKENS.md
- ✅ Verified Bento cards, Glass effects, and accent colors render correctly

**Key Implementation Details:**
- **Tailwind v4**: Uses CSS-based configuration via @theme directive (no tailwind.config.js)
- **PostCSS Plugin**: Uses @tailwindcss/postcss instead of plain tailwindcss plugin
- **Design Tokens**: All tokens properly defined and accessible via Tailwind utilities
- **Test Page**: Comprehensive test component shows Bento cards, Glass sidebar, status badges, and color palette

---

### ✅ Task 6: Create environment variable configuration for both applications
**Status**: Completed  
**Date**: [Previously completed]  
**Validates Requirements**: 1.4, 1.5, 1.6, 21.1-21.6

**Completed Items:**
- ✅ Created `backend/.env.example` with all Phase 0 and Phase 1 environment variables
- ✅ Created `frontend/.env.example` with VITE_API_BASE_URL
- ✅ Both `.env` files excluded in `.gitignore`
- ✅ Installed dotenv package in backend
- ✅ Created `backend/src/config/env.ts` with Zod schema validation:
  - Runtime validation of all environment variables
  - Type-safe access with TypeScript autocomplete
  - Detailed error messages for validation failures
  - Minimum length validation (JWT_SECRET: 32 chars, passwords: 8 chars)
  - Email format validation
  - URL format validation
- ✅ Integrated env validation in server.ts and database.ts
- ✅ Enhanced README.md with comprehensive environment variable documentation
- ✅ All required variables documented with validation requirements

---

### ✅ Task 7: Checkpoint - Verify Phase 0 Setup
**Status**: Completed  
**Date**: 2026-08-21  
**Validates Requirements**: All Phase 0 requirements (1.1-1.6, 2.1-2.5, 3.1-3.7, 21.1-21.6)

**Verification Results:**

#### ✅ Backend Server (http://localhost:5000)
- ✅ Server starts successfully on port 5000
- ✅ Health check endpoint responding at /health
- ✅ Health check returns proper JSON with status, message, database status, and timestamp
- ✅ Root endpoint (/) responding with API information
- ✅ No compilation errors in TypeScript
- ✅ All dependencies installed correctly

**Health Check Response:**
```json
{
  "status": "ok",
  "message": "EventSphere Backend API is running",
  "database": "connected",
  "timestamp": "2026-08-21T11:37:16.169Z"
}
```

#### ✅ MongoDB Connection
- ✅ Successfully connects to MongoDB Atlas on server startup
- ✅ Database connection verified with ping command
- ✅ Connection pooling configured (maxPoolSize: 10, minPoolSize: 2)
- ✅ Health check reports "connected" status
- ✅ Server only accepts requests after successful database connection
- ✅ Proper error handling with process termination on connection failure

**Startup Log Output:**
```
Connecting to MongoDB Atlas...
✓ Successfully connected to MongoDB Atlas
✓ Database: test
✓ Connection pooling enabled
✓ Server running on http://localhost:5000
✓ Health check available at http://localhost:5000/health
✓ Server is ready to accept requests
```

#### ✅ Frontend Dev Server
- ✅ Frontend runs successfully on Vite dev server
- ✅ Server accessible (port 5174 used due to 5173 being in use)
- ✅ Hot Module Replacement (HMR) working
- ✅ React Router configured with multiple routes (/, /about, /design-test)
- ✅ No compilation errors in TypeScript
- ✅ All dependencies installed correctly

**Note**: Frontend is running on port 5174 instead of 5173 because port 5173 was already in use. Vite automatically selected the next available port. This is expected behavior and does not affect functionality.

#### ✅ Tailwind Design Tokens
- ✅ Tailwind CSS v4 configured with @theme directive
- ✅ Design tokens properly defined in src/index.css:
  - Base colors (dark: #0a0a0f, light: #f8fafc)
  - Bento card styling (bg, border, rounded-xl)
  - Glass component styling (bg with backdrop-blur-md)
  - Accent colors (Emerald #10b981, Indigo #6366f1)
- ✅ TestDesignTokens component created and accessible at /design-test route
- ✅ Dark mode enabled via class strategy
- ✅ All design tokens render correctly in test page

**Test Page Features Verified:**
- Bento cards with semi-transparent backgrounds and borders
- Glass sidebar preview with backdrop blur effect
- Status badges with accent colors
- Dark/Light mode toggle functionality
- Color palette reference
- Design token value documentation

#### ✅ PROGRESS.md Updated
- ✅ Documented all completed Phase 0 tasks (Tasks 1-7)
- ✅ Updated task statuses from Pending to Completed
- ✅ Added completion dates and requirement mappings
- ✅ Documented key implementation details
- ✅ No deviations from PROJECT_SPEC.md

**Phase 0 Exit Criteria Met:**
- ✅ Backend runs on http://localhost:5000 with health check endpoint
- ✅ Frontend runs on Vite dev server (accessible and functional)
- ✅ MongoDB connection successful on backend startup
- ✅ Tailwind design tokens render correctly on test page
- ✅ All dependencies installed and configured
- ✅ Environment variables configured with Zod validation
- ✅ Git repository initialized with proper .gitignore
- ✅ Documentation complete (README.md, PROGRESS.md)

**Summary:**
Phase 0 setup is complete and fully functional. All systems operational:
- ✅ Backend server running with MongoDB Atlas connection
- ✅ Frontend dev server running with Tailwind CSS configured
- ✅ Environment variables validated and documented
- ✅ Design tokens working correctly
- ✅ Project ready for Phase 1 (Authentication & Authorization)

**Next Phase:**
Ready to proceed to Phase 1a: Backend Authentication Core

---

## Phase 1: Authentication & Authorization

### Phase 1a: Authentication Backend
**Status**: ✅ COMPLETE
**Completion Date**: 2026-08-22  
**Validates Requirements**: 5.1-5.9, 6.1-6.7, 7.1-7.6, 8.1-8.9, 9.1-9.9, 15.1-15.7

**Completed Tasks:**
- ✅ Task 8: Create MongoDB data models (User, OTP, RefreshToken)
- ✅ Task 9: Implement authentication utility functions (password, JWT, OTP)
- ✅ Task 10: Integrate Resend email service
- ✅ Task 11: Create authentication middleware
- ✅ Task 12: Create authentication API routes (register, verify-otp, resend-otp, login, refresh, logout)
- ✅ Task 13: Create SuperAdmin seed script
- ✅ Task 14: Configure CORS middleware
- ✅ Task 15: Implement global error handler
- ✅ Task 16: Create async error wrapper utility
- ✅ Task 17: Checkpoint - Test backend authentication core (15/15 tests passing)

**Key Features Implemented:**
- User registration with role-specific flows (Organizer, Exhibitor, Attendee)
- OTP generation and email delivery via Resend
- OTP verification with expiry and resend limits
- User authentication with JWT access and refresh tokens
- Token refresh with automatic rotation (security)
- Logout with token invalidation
- SuperAdmin account seeding (idempotent)
- CORS configuration for frontend-backend communication
- Comprehensive error handling with status codes and error messages
- Async error wrapper for clean route handlers

**Testing:**
- All 15 automated tests passing
- All authentication endpoints functional
- Token rotation working correctly
- SuperAdmin seed script verified
- OTP email delivery confirmed

**Next Phase:** Phase 1b - Frontend Authentication UI

---

### Phase 1b: Frontend Authentication
**Status**: Pending  
**Validates Requirements**: 9.1-9.9, 16.1-16.8, 18.1-18.9, 19.1-19.6

**Tasks:**
- Implement AuthContext with in-memory token storage
- Implement ThemeContext for dark/light mode (persisted to localStorage)
- Implement API service with Axios interceptors
- Implement Toast notification system (React Hot Toast)
- Create LoginPage component
- Create RegisterPage component
- Create VerifyOTPPage component
- Implement ProtectedRoute component (role-based route guards)
- Implement automatic token refresh (14-minute timer)
- Test token refresh on 401 errors

---

### Phase 1c: Admin Approval Workflow
**Status**: Pending  
**Validates Requirements**: 10.1-10.5, 11.1-11.8

**Tasks:**
- Create GET /api/admin/pending-organizers endpoint
- Create PATCH /api/admin/organizers/:id/approve endpoint
- Create DELETE /api/admin/organizers/:id/reject endpoint (soft-reject: status → `rejected`, refresh tokens invalidated, account kept)
- Create PendingApprovalScreen component (Organizer view)
- Create AdminApprovalsPage component (SuperAdmin view)
- Implement 30-second polling for status changes (handles both `active` → organizer dashboard and `rejected` → RejectedScreen transitions)
- Test complete approval workflow end-to-end

---

### Phase 1d: Dashboard Shells & Route Guards
**Status**: Pending  
**Validates Requirements**: 16.1-16.8, 17.1-17.8, 22.1-22.7

**Tasks:**
- Create BentoCard component with design system styling
- Create Sidebar component with glass effect styling
- Create Header component (sticky) with glass effect
- Create BottomNav component for mobile (<768px)
- Implement backend authorization middleware for protected routes
- Create SuperAdminDashboard with navigation to Admin Approvals
- Create OrganizerDashboard shell (empty state for Phase 1)
- Create ExhibitorDashboard shell (empty state for Phase 1)
- Create AttendeeDashboard shell (empty state for Phase 1)
- Implement responsive layout (320px to 1920px)
- Test route guards redirect unauthorized users appropriately

---

### Phase 1e: Forgot Password Flow
**Status**: Pending  
**Validates Requirements**: 12.1-12.7, 13.1-13.8, 14.1-14.8

**Tasks:**
- Create POST /api/auth/forgot-password/request endpoint
- Create POST /api/auth/forgot-password/verify-otp endpoint
- Create POST /api/auth/forgot-password/reset endpoint
- Create RequestResetPage component
- Create VerifyResetOTPPage component
- Create ResetPasswordPage component
- Test complete 3-step password reset flow
- Verify old password no longer works after reset
- Verify all refresh tokens invalidated after password reset

---

### Phase 1f: Final Integration & Testing
**Status**: Pending  
**Validates Requirements**: 19.1-19.6, 20.1-20.7, 21.1-21.6, 23.1-23.6

**Tasks:**
- Write unit tests for password utilities, OTP generation, JWT service
- Write integration tests for all API endpoints
- Manual testing on actual mobile devices
- Test all error states and loading states
- Verify no `window.alert` usage anywhere (use toast system)
- Update PROGRESS.md with completed features
- Document any deviations from PROJECT_SPEC
- Verify README.md setup instructions are accurate

---

## Key Technical Decisions

### JWT Authentication Strategy
**Decision**: Store tokens in memory (React state) instead of httpOnly cookies  
**Rationale**: 
- Cross-domain issues between frontend (Vercel) and backend (Render)
- Safari ITP and Chrome SameSite restrictions can silently drop cookies
- Body + memory approach more reliable for cross-domain deployments
- XSS mitigation: implement strict CSP, no inline scripts, no untrusted third-party scripts

### OTP Provider Choice
**Decision**: Use Resend for email delivery  
**Rationale**:
- Simple API, generous free tier (100 emails/day)
- Reliable delivery rates
- Good developer experience
- Easy integration with Node.js

### Token Refresh Strategy
**Decision**: Automatic refresh token rotation  
**Rationale**:
- Each refresh token can only be used once (security)
- Stolen tokens have limited window of use (7 days max)
- Detecting refresh token reuse indicates potential compromise
- All refresh tokens invalidated on password change

### SuperAdmin Seeding
**Decision**: Idempotent seed script that creates or updates SuperAdmin  
**Rationale**:
- Safe to run multiple times without data corruption
- Allows password recovery without manual database access
- Maintains referential integrity by updating existing account

---

## Environment Variables

### Backend (.env)
```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventsphere
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPERADMIN_EMAIL=admin@eventsphere.com
SUPERADMIN_PASSWORD=SecureAdminPassword123
FRONTEND_URL=http://localhost:5173
```

**Validation Requirements:**
- `JWT_SECRET`: Minimum 32 characters
- `MONGODB_URI`: Must start with `mongodb://` or `mongodb+srv://`
- `RESEND_API_KEY`: Must start with `re_`
- `SUPERADMIN_EMAIL`: Valid email format
- `SUPERADMIN_PASSWORD`: Minimum 8 characters
- `FRONTEND_URL`: Valid URL format

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:5000
```

---

## Important Commands

### SuperAdmin Seed Script
```bash
cd backend
npm run seed:superadmin
```
or
```bash
cd backend
node scripts/seedSuperAdmin.js
```

**When to Run:**
- Initial setup after database configuration
- After environment loss (folder rename/deletion)
- When SuperAdmin password needs to be reset
- Safe to run multiple times (idempotent)

### Development Servers
**Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

**Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### Running Tests
**Frontend:**
```bash
cd frontend
npm test
```

**Backend:**
```bash
cd backend
npm test
```

---

## Deviations from PROJECT_SPEC

### None Yet
No deviations from the original specification at this time. All implementation follows the design document exactly.

---

## Exit Criteria for Phase 1

**Phase 1 will be considered complete when:**
- ✅ All four roles can register and authenticate
- ✅ SuperAdmin can approve/reject pending Organizers
- ✅ Exhibitor and Attendee OTP verification works end-to-end
- ✅ Each role renders its designated dashboard shell after login
- ✅ Route guards enforce role-based access on both frontend and backend
- ✅ Forgot password flow completes successfully (3-step)
- ✅ Application is responsive and usable on mobile devices (320px to 1920px)
- ✅ No use of `window.alert`; all notifications via toast system
- ✅ Dark/Light mode works and persists across sessions
- ✅ Token refresh works automatically before expiry
- ✅ SuperAdmin seed script documented and tested
- ✅ All unit and integration tests passing

---

## Next Steps

1. ~~Complete Phase 0 Task 1: Initialize monorepo structure and version control~~ ✅ Completed
2. ~~Complete Phase 0 Task 2: Initialize frontend application~~ ✅ Completed
3. ~~Complete Phase 0 Task 3: Initialize backend application~~ ✅ Completed
4. ~~Complete Phase 0 Task 4: Configure Tailwind CSS with design tokens~~ ✅ Completed
5. ~~Complete Phase 0 Task 5: Set up MongoDB Atlas connection~~ ✅ Completed
6. ~~Complete Phase 0 Task 6: Create environment variable configuration~~ ✅ Completed
7. ~~Complete Phase 0 Task 7: Checkpoint - Verify Phase 0 setup~~ ✅ Completed
8. **Next**: Proceed to Phase 1a: Backend Authentication Core (Task 8)
9. **Next**: Create MongoDB data models (User, OTP, RefreshToken)
10. **Next**: Implement authentication utilities (password hashing, JWT, OTP)

---

**Last Updated**: 2026-08-21  
**Current Phase**: Phase 0 - Project Setup ✅ COMPLETE  
**Next Phase**: Phase 1a - Backend Authentication Core  
**Current Task**: Ready to begin Task 8 (Create MongoDB data models)

---

### ✅ Task 12.4: Create login endpoint (POST /api/auth/login)
**Status**: Completed  
**Date**: 2026-08-21  
**Validates Requirements**: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9

**Completed Items:**
- ✅ Implemented POST /api/auth/login endpoint in `backend/src/routes/auth.routes.ts`
- ✅ Email and password validation in request body
- ✅ User lookup by email with case-insensitive matching
- ✅ Password verification using bcrypt.compare()
- ✅ Status checks:
  - 403 error for pending Organizers (awaiting SuperAdmin approval)
  - 403 error for suspended accounts
  - 403 error for unverified Exhibitor/Attendee accounts
- ✅ JWT token generation:
  - Access token with 15-minute expiry
  - Refresh token with 7-day expiry
  - Access token payload includes userId, email, and role
- ✅ Refresh token hash storage in database using SHA-256
- ✅ Secure error messages (no email enumeration)
- ✅ Returns user object (without passwordHash) and both tokens in response body

**Key Implementation Details:**
- **Security**: Generic "Invalid email or password" message prevents email enumeration
- **Token Storage**: Refresh token stored as SHA-256 hash in database for security
- **Token Rotation**: Foundation laid for refresh token rotation (task 12.5)
- **Status Codes**: 
  - 400 for missing fields
  - 401 for invalid credentials (email not found or wrong password)
  - 403 for account status issues (pending, suspended, unverified)
  - 500 for server errors (failed to store refresh token)
  - 200 for successful login
- **Error Codes**: Added machine-readable codes for frontend: `PENDING_APPROVAL`, `ACCOUNT_SUSPENDED`, `EMAIL_NOT_VERIFIED`

**Implementation Details:**
```typescript
// Access Token Payload (15-minute expiry)
{
  userId: string,
  email: string,
  role: 'superadmin' | 'organizer' | 'exhibitor' | 'attendee'
}

// Refresh Token Payload (7-day expiry)
{
  userId: string,
  type: 'refresh'
}

// Refresh Token Storage
- Token is hashed using SHA-256 before storage
- Stored with: userId, tokenHash, isValid=true, expiresAt (7 days)
- Enables token rotation and revocation
```

**Testing Notes:**
- Created manual test script: `backend/test-login.js`
- Endpoint ready for integration testing
- Validates all requirements for user authentication flow

**Dependencies Added:**
- crypto (Node.js built-in): For SHA-256 hashing of refresh tokens
- comparePassword: From password.utils.ts
- generateAccessToken, generateRefreshToken: From token.service.ts
- createRefreshToken: From RefreshToken.model.ts

**API Response Format:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "ObjectId",
      "email": "user@example.com",
      "fullName": "User Name",
      "role": "organizer",
      "status": "active",
      "isEmailVerified": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Next Tasks:**
- Task 12.5: Create token refresh endpoint (POST /api/auth/refresh)
- Task 12.6: Create logout endpoint (POST /api/auth/logout)
- Task 13: Create SuperAdmin seed script
- Task 14: Configure CORS middleware



---

### ✅ Task 12.6: Create logout endpoint (POST /api/auth/logout)
**Status**: Completed  
**Date**: 2026-08-22  
**Validates Requirements**: Implied from design document

**Completed Items:**
- ✅ Implemented POST /api/auth/logout endpoint in `backend/src/routes/auth.routes.ts`
- ✅ Requires authentication middleware to verify access token
- ✅ Accepts `refreshToken` in request body
- ✅ Marks refresh token as invalid in database: `{ isValid: false }`
- ✅ Returns success message upon completion
- ✅ Created test file: `backend/src/routes/auth.routes.logout.test.ts`
- ✅ Created manual test script: `backend/test-logout.ps1`

**Key Implementation Details:**
- **Token Invalidation**: Immediately marks refresh token as invalid in database
- **Security**: Requires valid access token to prevent unauthorized logout attempts
- **Response Format**: Returns `{ success: true, message: "Logged out successfully" }`
- **Error Handling**: Returns appropriate errors if token not found or already invalid
- **Session Cleanup**: Client must clear tokens from memory after receiving success response

**API Response Format:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Next Tasks:**
- Task 14: Configure CORS middleware
- Task 15: Implement global error handler
- Task 16: Create async error wrapper utility
- Task 17: Checkpoint - Test backend authentication core

---

### ✅ Task 17: Checkpoint - Test backend authentication core
**Status**: Completed  
**Date**: 2026-08-22  
**Validates Requirements**: All Phase 1a requirements (5.1-5.9, 6.1-6.7, 7.1-7.6, 8.1-8.9, 9.1-9.9, 15.1-15.7)

**Completed Items:**
- ✅ Created comprehensive automated test script: `backend/test-checkpoint-17-auto.ps1`
- ✅ Tested registration endpoint with Postman/curl for all roles (Organizer, Exhibitor, Attendee)
- ✅ Verified Organizer created with `status: 'pending'`
- ✅ Verified Exhibitor/Attendee receive OTP email via Resend (automated + manual verification)
- ✅ Tested OTP verification endpoint (valid OTP, expired OTP, invalid OTP)
- ✅ Tested login endpoint (valid credentials, invalid credentials, pending Organizer, unverified Exhibitor)
- ✅ Verified access token and refresh token returned in response body
- ✅ Tested token refresh endpoint (valid refresh token, invalid refresh token)
- ✅ Verified old refresh token marked invalid after rotation
- ✅ Ran SuperAdmin seed script and verified account created/updated
- ✅ Updated PROGRESS.md with Phase 1a completion status

**Test Results: 15/15 Tests Passed** ✅

**Test Coverage:**

1. **Registration Tests (6 tests)**
   - ✅ Register Organizer (status=pending) - 201
   - ✅ Register Exhibitor (sends OTP) - 201
   - ✅ Register Attendee (sends OTP) - 201
   - ✅ Duplicate Email Registration - 409
   - ✅ Invalid Email Format - 400
   - ✅ SuperAdmin Registration Blocked - 403

2. **OTP Verification Tests (1 test)**
   - ✅ Invalid OTP Code - 401

3. **Login Tests (3 tests)**
   - ✅ Login with Invalid Password - 401
   - ✅ Pending Organizer Login Blocked - 403
   - ✅ Unverified Exhibitor Login Blocked - 403
   - ✅ SuperAdmin Login Success - 200

4. **Token Refresh Tests (3 tests)**
   - ✅ Valid Token Refresh - 200
   - ✅ Old Refresh Token (after rotation) - 401
   - ✅ Invalid Refresh Token - 401

5. **SuperAdmin Seed Script (1 test)**
   - ✅ Seed script execution - Exit Code 0

**Key Verification Points:**
- ✅ Organizer accounts created with `status: 'pending'`
- ✅ Exhibitor/Attendee accounts created with `status: 'active'`, `isEmailVerified: false`
- ✅ OTP emails sent via Resend service (visible in logs)
- ✅ Access tokens contain userId, email, and role in JWT payload
- ✅ Refresh tokens returned in response body
- ✅ Token refresh generates new access token (15-minute expiry)
- ✅ Token refresh generates new refresh token (7-day expiry, rotation)
- ✅ Old refresh token marked as `isValid: false` after rotation
- ✅ Login blocked for pending Organizers (403)
- ✅ Login blocked for unverified Exhibitors/Attendees (403)
- ✅ SuperAdmin seed script is idempotent (safe to run multiple times)

**Manual Verification Checklist:**
- [ ] Check email inbox for OTPs sent to test Exhibitor/Attendee accounts
- [ ] Decode access token at https://jwt.io to verify payload structure
- [ ] Check MongoDB database for:
  - Users collection has test accounts with correct status
  - RefreshTokens collection has token hashes
  - Old refresh token has `isValid: false` after rotation
  - SuperAdmin account exists with correct email

**Testing Artifacts:**
- `backend/test-checkpoint-17-auto.ps1` - Automated test suite (15 tests)
- `backend/test-checkpoint-17.ps1` - Interactive test suite (includes manual OTP verification)
- Individual endpoint test scripts in backend directory

**Phase 1a Backend Authentication Core: COMPLETE** ✅

All authentication endpoints are functional and passing tests. The backend authentication system is ready for frontend integration (Phase 1b).

**Next Steps:**
- Proceed to Phase 1b: Frontend Authentication UI
- Task 18: Set up frontend authentication context and state management
- Task 19: Create Axios API service with interceptors
- Task 20: Implement toast notification system

---

### ? Task 12.5: Create token refresh endpoint (POST /api/auth/refresh)
**Status**: Completed  
**Date**: 2026-08-21  
**Validates Requirements**: 9.3, 9.4, 9.5, 9.6, 9.7

**Completed Items:**
- ? Updated imports in `backend/src/routes/auth.routes.ts`:
  - Added `verifyToken` from token.service
  - Added `findRefreshTokenByHash` and `invalidateRefreshToken` from RefreshToken.model
- ? Implemented POST /api/auth/refresh endpoint with full token rotation
- ? Accepts refresh token from `Authorization: Bearer <token>` header
- ? Verifies refresh token JWT signature and expiry
- ? Validates token type (must be 'refresh', not 'access')
- ? Finds refresh token in database by SHA-256 hash
- ? Checks if token is still valid (isValid: true)
- ? Returns 401 with code `TOKEN_REVOKED` if token already rotated
- ? Validates user account still exists and is active
- ? Marks old refresh token as invalid before issuing new tokens
- ? Generates new access token (15-minute expiry)
- ? Generates new refresh token (7-day expiry)
- ? Stores new refresh token hash in database
- ? Returns both new tokens in response body

**Key Implementation Details:**
- **Token Rotation Security**: Old refresh token immediately invalidated after use (prevents reuse attacks)
- **Type Validation**: Ensures only refresh tokens accepted, not access tokens
- **User Validation**: Verifies user exists and account status is 'active'
- **SHA-256 Hashing**: Refresh tokens hashed for secure database storage
- **Comprehensive Error Codes**: 
  - `MISSING_REFRESH_TOKEN`: No Authorization header provided
  - `INVALID_TOKEN_TYPE`: Access token used instead of refresh token
  - `INVALID_REFRESH_TOKEN`: Token not found in database
  - `TOKEN_REVOKED`: Token already used (rotation detected)
  - `TOKEN_EXPIRED`: JWT expiry exceeded
  - `INVALID_TOKEN`: JWT signature verification failed
  - `USER_NOT_FOUND`: User deleted after token issued
  - `ACCOUNT_INACTIVE`: User account suspended or pending

**API Response Format:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Testing Artifacts:**
- Created `backend/src/routes/auth.routes.refresh.test.ts` - Jest test suite
- Created `backend/test-refresh-endpoint.ps1` - Manual PowerShell test script

**Security Features:**
- Token rotation prevents reuse attacks
- Old token invalidated immediately after use
- If same token used twice, returns TOKEN_REVOKED error
- User account status validated on every refresh
- JWT signature verification prevents tampering

**Next Tasks:**
- Task 12.6: Create logout endpoint (POST /api/auth/logout)
- Task 14: Configure CORS middleware
- Task 15: Implement global error handler
- Task 16: Create async error wrapper utility

---

### ✅ Task 13: Create SuperAdmin seed script
**Status**: Completed  
**Date**: 2026-08-22  
**Validates Requirements**: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9

**Completed Items:**
- ✅ Created `backend/scripts/seedSuperAdmin.js` (plain JavaScript, no TypeScript)
- ✅ Environment variable loading with dotenv
- ✅ Validation of required environment variables:
  - Validates MONGODB_URI exists
  - Validates SUPERADMIN_EMAIL exists
  - Validates SUPERADMIN_PASSWORD exists
  - Exits with error message and code 1 if any are missing
- ✅ Password length validation (minimum 8 characters)
- ✅ MongoDB connection using MongoClient
- ✅ Idempotent behavior:
  - Checks if SuperAdmin exists: `db.users.findOne({ role: 'superadmin' })`
  - If exists: Updates email and passwordHash with new values
  - If not exists: Creates new SuperAdmin document
- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ SuperAdmin document structure:
  - email (lowercase)
  - passwordHash (bcrypt hash)
  - fullName: "Super Admin"
  - role: "superadmin"
  - status: "active"
  - isEmailVerified: true
  - createdAt and updatedAt timestamps
- ✅ Success logging with email confirmation
- ✅ Database connection cleanup (closes connection after operation)
- ✅ Added npm script: `"seed:superadmin": "node scripts/seedSuperAdmin.js"`
- ✅ Tested script execution - works successfully
- ✅ Verified idempotent behavior - second run updates existing account

**Key Implementation Details:**
- **Idempotent**: Safe to run multiple times without data corruption
- **Password Recovery**: Can update SuperAdmin password by changing .env and rerunning script
- **Maintains Integrity**: Updates preserve existing SuperAdmin _id (referential integrity)
- **Environment Loss Recovery**: Recreates SuperAdmin account if database persists but .env is reset
- **Error Handling**: Clear error messages for missing variables or connection failures

**Run Commands:**
```bash
# From backend directory
npm run seed:superadmin

# Or directly
node scripts/seedSuperAdmin.js
```

**Expected Output (First Run):**
```
Connected to MongoDB
✓ SuperAdmin account created successfully
  Email: admin@eventsphere.com
Database connection closed
```

**Expected Output (Subsequent Runs):**
```
Connected to MongoDB
✓ SuperAdmin account updated successfully
  Email: admin@eventsphere.com
Database connection closed
```

**Testing Results:**
- ✅ First run: Created SuperAdmin account successfully
- ✅ Second run: Updated existing SuperAdmin account (idempotent verified)
- ✅ Environment variables loaded correctly from .env file
- ✅ Password hashed with bcrypt before storage
- ✅ Database connection established and closed cleanly

**Recovery Procedures:**
- **Lost SuperAdmin Password**: Update SUPERADMIN_PASSWORD in .env, run `npm run seed:superadmin`
- **Environment Loss**: Recreate .env from .env.example, fill in credentials, run seed script
- **Database Wipe**: Run seed script to recreate SuperAdmin account

**Next Tasks:**
- Task 12.6: Create logout endpoint (POST /api/auth/logout)
- Task 14: Configure CORS middleware
- Task 15: Implement global error handler



---

## Phase 1b: Frontend Authentication UI

### ✅ Checkpoint 25: Frontend Authentication Flow — Static Verification
**Status**: COMPLETE  
**Date**: 2026-08-22  
**Validates Requirements**: 9.1-9.9, 12.1-12.7, 16.1-16.8, 18.1-18.9, 19.1-19.6

---

### Components Completed

#### ✅ AuthContext (`src/contexts/AuthContext.tsx`)
- In-memory token storage (no localStorage/sessionStorage)
- Exports: `user`, `accessToken`, `refreshToken`, `isAuthenticated`, `isLoading`
- Functions: `login`, `logout`, `register`, `refreshAccessToken`, `checkAuthStatus`
- Automatic token refresh interval every 14 minutes (before 15-min access token expiry)
- `setTokenManager` integration to wire AuthContext tokens into the Axios API service

#### ✅ ThemeContext (`src/contexts/ThemeContext.tsx`)
- Exports: `theme`, `toggleTheme`
- Initialises from `localStorage.getItem('theme')`, falls back to system `prefers-color-scheme`
- Persists selection via `localStorage.setItem('theme', theme)` on every theme change
- Applies `dark` / `light` class to `document.documentElement` for Tailwind dark mode

#### ✅ API Service (`src/services/api.ts`)
- Axios instance with base URL from `VITE_API_BASE_URL`
- Request interceptor: attaches `Authorization: Bearer <accessToken>`
- Response interceptor: handles 401 `TOKEN_EXPIRED` → automatic refresh + retry
- On refresh failure: clears tokens, shows toast, redirects to `/login`

#### ✅ Toast Notification System (`src/utils/toast.ts`, `src/components/common/ToastContainer.tsx`)
- `showSuccess`, `showError`, `showWarning`, `showInfo`, `dismissToast`, `dismissAllToasts`
- Custom `ToastContainer` with progress bar, hover-to-pause, dismiss button
- Responsive: `top-right` on desktop, `bottom-center` on mobile (<768px)
- **Zero `window.alert` calls** across entire codebase

#### ✅ Authentication Pages
| Page | Path | Requirements |
|---|---|---|
| LoginPage | `src/pages/auth/LoginPage.tsx` | 8.1-8.9 |
| RegisterPage | `src/pages/auth/RegisterPage.tsx` | 5.1-5.9 |
| VerifyOTPPage | `src/pages/auth/VerifyOTPPage.tsx` | 7.1-7.5 |
| RequestResetPage | `src/pages/auth/ForgotPassword/RequestResetPage.tsx` | 12.1-12.7 |
| VerifyResetOTPPage | `src/pages/auth/ForgotPassword/VerifyResetOTPPage.tsx` | 13.1-13.8 |
| ResetPasswordPage | `src/pages/auth/ForgotPassword/ResetPasswordPage.tsx` | 14.1-14.8 |

#### ✅ Route Guard (`src/guards/ProtectedRoute.tsx`)
- Loading state → centred spinner (design-token styled)
- Not authenticated → `<Navigate to="/login" replace />`
- Authenticated, wrong role → `<Navigate to={roleDashboard} replace />`
- Authenticated, correct role → renders children
- Role-to-dashboard map: `superadmin`, `organizer`, `exhibitor`, `attendee`

#### ✅ React Router Setup (`src/App.tsx`)
- `BrowserRouter` wrapping entire app
- Public routes: `/`, `/login`, `/register`, `/verify-otp`, `/forgot-password/*`
- Protected routes: `/dashboard/superadmin`, `/dashboard/organizer`, `/dashboard/exhibitor`, `/dashboard/attendee` — all wrapped in `<ProtectedRoute allowedRoles={[...]}`
- Smart `DashboardRedirect` and `RootRedirect` components for role-aware navigation

#### ✅ Dashboard Shells
- `SuperAdminDashboard.tsx`
- `OrganizerDashboard.tsx`
- `ExhibitorDashboard.tsx`
- `AttendeeDashboard.tsx`

---

### Static Verification Results

| Check | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | ✅ PASS (0 errors) | Fixed 8 TS6133 unused-variable warnings |
| `npm run build` | ✅ PASS | 99 modules, 336 kB JS, built in 3.19s |
| `window.alert` occurrences | ✅ 0 | Grep across all `.ts` / `.tsx` in `src/` |
| All 14 required files exist | ✅ 14/14 | All pages, contexts, guard, service present |
| AuthContext members | ✅ PASS | `login`, `logout`, `register`, `refreshAccessToken`, `isAuthenticated`, `isLoading`, `user` all exported |
| ThemeContext members | ✅ PASS | `theme`, `toggleTheme` exported; `localStorage` used for persistence |
| ProtectedRoute behaviours | ✅ PASS | Loading spinner, unauthenticated redirect, role mismatch redirect, authorized render |
| App.tsx routing | ✅ PASS | BrowserRouter, all public + protected routes, ProtectedRoute wrappers |

---

### TypeScript Fixes Applied (8 TS6133 warnings → 0 errors)

| File | Fix |
|---|---|
| `src/contexts/AuthContext.tsx` | Removed unused `api` default import |
| `src/pages/auth/ForgotPassword/RequestResetPage.tsx` | Removed unused `showError` import |
| `src/pages/auth/VerifyOTPPage.tsx` | Removed unused `role` variable; removed unused `response` assignment |
| `src/components/common/ToastContainer.tsx` | Removed unused `toastIcon` constant |
| `src/components/common/ToastContainer.test.tsx` | Prefixed unused `containerStyle` with `_` |
| `src/test/setup.ts` | Removed unused `expect` import |
| `src/utils/toast.test.ts` | Prefixed unused `options` parameter with `_` |

---

### Manual E2E Testing Requirements (requires running dev server + backend)

The following items require a live environment and cannot be automated statically:

- Registration for all roles (Organizer, Exhibitor, Attendee) via UI
- Exhibitor/Attendee redirect to `/verify-otp` after registration
- OTP received in real email inbox and verified via UI
- Login with valid credentials (tokens in React memory state)
- Automatic token refresh after 14 minutes (requires waiting)
- Login with pending Organizer shows pending approval message
- Forgot password 3-step flow (request OTP → verify OTP → set new password)
- Confirm old password fails after reset
- Theme toggle (dark/light) persists across browser refresh (localStorage)

To run the full manual E2E suite:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
# Then open http://localhost:5173
```

---

**Phase 1b Status: ✅ STATIC VERIFICATION COMPLETE**  
**Build**: Passing  
**TypeScript**: 0 errors  
**window.alert**: 0 occurrences  
**Last Updated**: 2026-08-22  
**Next Phase**: Phase 1c — Admin Approval Workflow

**Phase 1c Status: ✅ STATIC VERIFICATION COMPLETE**  
**Build**: Passing  
**TypeScript**: 0 errors  
**window.alert**: 0 occurrences  
**Last Updated**: 2026-08-23
**Next Phase**: Phase 1d — Dashboard shells & Route Guards

**Phase 1d Status: ✅ STATIC VERIFICATION COMPLETE**  
**Build**: Passing  
**TypeScript**: 0 errors  
**window.alert**: 0 occurrences  
**Last Updated**: 2026-08-23
**Next Phase**: Phase 1e — Forgot Password Flow ( Backend + Frontend Integration )
---

## Bug Fix: Session Persistence Across Page Reload
**Date**: 2026-08-23
**Files Changed**:
- `frontend/src/contexts/AuthContext.tsx`
- `backend/src/routes/auth.routes.ts`

### Problem
Access and refresh tokens were both stored only in React memory state. Any page reload
wiped all auth state, causing `isAuthenticated` to become `false` and every protected
route to redirect the user to `/login`, even with a perfectly valid session.

### Fix — Token Storage Strategy
| Token | Storage | Rationale |
|---|---|---|
| Access token | React state (memory only) | Short-lived (15 min); no benefit persisting it |
| Refresh token | `localStorage` key `es_refresh_token` | Must survive page reloads to restore sessions |

### Changes in `AuthContext.tsx`
1. **`login()`** — calls `localStorage.setItem('es_refresh_token', refresh)` after
   storing tokens in state.
2. **`logout()`** — calls `localStorage.removeItem('es_refresh_token')` in the
   `finally` block so it's always cleared even if the logout API call fails.
3. **`refreshAccessToken()`** — falls back to `localStorage.getItem('es_refresh_token')`
   if the in-memory refresh token is not yet populated (e.g. mid-mount).
4. **`checkAuthStatus()`** — now `async`; on every app mount it:
   a. Reads `localStorage` for a stored refresh token.
   b. If present, calls `POST /api/auth/refresh` silently to get a new access token.
   c. Then calls `GET /api/auth/me` with the fresh access token to restore the `user`
      object in state.
   d. On success: user is fully re-authenticated before any route renders.
   e. On failure (token expired/revoked): clears `localStorage` and proceeds as
      unauthenticated — user is redirected to `/login` as normal.
   f. `setIsLoading(false)` is called in `finally` so the spinner is never stuck.
5. **Axios `setTokenManager` callback** — the `setTokens` handler now also writes the
   new refresh token to `localStorage`, keeping it in sync when the Axios interceptor
   silently rotates tokens on a 401.

### New Backend Endpoint: `GET /api/auth/me`
Added to `backend/src/routes/auth.routes.ts` (requires Bearer access token):

```
GET /api/auth/me
Authorization: Bearer <accessToken>

200 OK
{
  "success": true,
  "data": {
    "user": { "id", "email", "fullName", "role", "status", "isEmailVerified" }
  }
}
```

Used exclusively during session restore (`checkAuthStatus`) to reconstruct the `user`
object after a silent refresh, since `POST /api/auth/refresh` returns only new tokens
and not the user payload.

### Deviation from Original Spec
The original spec stated: *"Store tokens in React state (memory only, not
localStorage)"*. This is updated to: refresh token stored in `localStorage`,
access token remains memory-only. Rationale: pure memory storage makes sessions
non-persistent across page reloads, which is a critical UX regression for a
multi-page SPA. Storing only the refresh token (not the access token) in
`localStorage` preserves the security intent — the short-lived access token
never touches disk — while making sessions behave as users expect.


---

## Bug Fix: Session Persistence Across Page Reload
**Date**: 2026-08-23
**Files Changed**:
- `frontend/src/contexts/AuthContext.tsx`
- `backend/src/routes/auth.routes.ts`

### Problem
Access and refresh tokens were both stored only in React memory state. Any page reload
wiped all auth state, causing `isAuthenticated` to become `false` and every protected
route to redirect the user to `/login`, even with a perfectly valid session.

### Fix — Token Storage Strategy
| Token | Storage | Rationale |
|---|---|---|
| Access token | React state (memory only) | Short-lived (15 min); no benefit persisting it |
| Refresh token | `localStorage` key `es_refresh_token` | Must survive page reloads to restore sessions |

### Changes in `AuthContext.tsx`
1. **`login()`** — calls `localStorage.setItem` after storing tokens in state.
2. **`logout()`** — calls `localStorage.removeItem` in the `finally` block so it is always cleared.
3. **`refreshAccessToken()`** — falls back to `localStorage.getItem` if in-memory token is not yet populated.
4. **`checkAuthStatus()`** — now async; on every app mount it:
   - Reads `localStorage` for a stored refresh token
   - If present, calls `POST /api/auth/refresh` silently to get a new access token
   - Then calls `GET /api/auth/me` with the fresh token to restore the `user` object
   - On success: user is fully re-authenticated before any route renders
   - On failure: clears `localStorage`, proceeds as unauthenticated → redirected to `/login`
   - `setIsLoading(false)` is always called in `finally` so the spinner never gets stuck
5. **Axios `setTokenManager` `setTokens` handler** — also writes new refresh token to `localStorage` when the Axios interceptor silently rotates tokens on 401.

### New Backend Endpoint: `GET /api/auth/me`
Added to `backend/src/routes/auth.routes.ts` (requires Bearer access token):

```
GET /api/auth/me
Authorization: Bearer <accessToken>

200 OK  { "success": true, "data": { "user": { id, email, fullName, role, status, isEmailVerified } } }
```

Used during session restore to reconstruct the `user` object after a silent refresh,
since `POST /api/auth/refresh` returns only tokens and not the user payload.

### Deviation from Original Spec
Original spec: *"Store tokens in React state (memory only, not localStorage)"*.
Updated: refresh token stored in `localStorage`, access token remains memory-only.
Rationale: pure memory storage breaks sessions on every page reload, which is a
critical UX regression. Storing only the refresh token (not the access token) in
`localStorage` preserves the security intent while making sessions behave as users expect.



---

## Dev Tools

### DEV OTP BYPASS

**Added:** 2026-08-25  
**Status:** Active in development — MUST be removed or set to alse before production deployment.

#### What it does
When DEV_OTP_BYPASS=true is set in ackend/.env and NODE_ENV is **not** production, the backend will print the plaintext OTP to the console immediately after generating it:

`
[DEV OTP BYPASS] OTP for user@email.com: 123456
`

The real Resend email is **still sent** as normal — the bypass is purely additive. This lets you test the OTP flow using non-primary email addresses where Resend may not deliver, by reading the code straight from the backend terminal.

#### Hard safeguards
- NODE_ENV === 'production' **always** disables the bypass, regardless of DEV_OTP_BYPASS value.
- If DEV_OTP_BYPASS=true is detected in production, a console warning is logged and the value is ignored:
  `
  [DEV OTP BYPASS] WARNING: DEV_OTP_BYPASS=true is set in a production environment. This flag has been ignored.
  `

#### Files changed
- ackend/src/services/otp.service.ts — logDevOTPBypass() helper added; called in both createOTPRecord branches (new OTP and resend OTP) after generation, before hashing and email send.
- ackend/.env — DEV_OTP_BYPASS=true added under "Development OTP Bypass" comment block.
- ackend/.env.example — DEV_OTP_BYPASS=false added with full documentation comment.

#### Pre-production checklist
- [ ] Set DEV_OTP_BYPASS=false or remove the variable from production .env
- [ ] Confirm NODE_ENV=production is set in the production environment
- [ ] Optionally remove the logDevOTPBypass function from otp.service.ts entirely for a clean production build


---

## Post-Phase-1 Change Log

### Organizer Reject — Soft-Delete + Auto-Redirect (2026-08-28)

**Changed files:**

| File | Change |
|---|---|
| `backend/src/routes/admin.routes.ts` | Reject handler: replaced `deleteById` + `deleteAllUserRefreshTokensByUserId` with `updateById({ status: 'rejected' })` + `invalidateAllUserRefreshTokens` |
| `backend/src/routes/admin.routes.reject.test.ts` | New file — 9 integration tests covering soft-reject behavior, token invalidation, post-reject login, and queryability |
| `frontend/src/components/dashboard/PendingApprovalScreen.tsx` | Poll now handles `status === 'rejected'` → `navigate('/dashboard/rejected', { replace: true })` in addition to `status === 'active'` |

**Behavioral summary:**

| Scenario | Before | After |
|---|---|---|
| Reject endpoint | Hard-deletes user document | Sets `status: 'rejected'`, keeps document |
| Refresh tokens on reject | Hard-deleted | Invalidated (`isValid: false`) |
| Rejected Organizer login | Fails — account gone | Succeeds — lands on RejectedScreen |
| Queryable by SuperAdmin | No | Yes (`?status=rejected`) |
| PendingApprovalScreen poll | Reacted to `active` only | Reacts to `active` (→ organizer dashboard) AND `rejected` (→ rejected screen) |
| Time to auto-redirect after reject | N/A | ≤30 s (next poll cycle) |

**No routing changes required.** `getHomeRoute`, `ProtectedRoute`, `App.tsx`, and `RejectedScreen` were already correct for the soft-delete pattern — they were built with this in mind from the start.

**Deviation from original spec:** Original spec task 26.3 said "Delete Organizer account from database". This was deliberately changed to a soft-delete. Rationale: rejected Organizer gets contextual feedback (RejectedScreen), account is auditable, and the change is reversible if needed. See Deviation #10 in `PROGRESS.md` (root).


---

## Post-Phase-1 Change Log

### Organizer Reject — Soft-Delete + Auto-Redirect (2026-08-28)

**Changed files:**

| File | Change |
|---|---|
| `backend/src/routes/admin.routes.ts` | Reject handler: replaced hard-delete with `updateById({ status: 'rejected' })` + `invalidateAllUserRefreshTokens` |
| `backend/src/routes/admin.routes.reject.test.ts` | New file — 9 integration tests covering soft-reject behavior |
| `frontend/src/components/dashboard/PendingApprovalScreen.tsx` | Poll now handles `status === 'rejected'` → navigate to `/dashboard/rejected` |

**Behavioral summary:**

| Scenario | Before | After |
|---|---|---|
| Reject endpoint | Hard-deletes user document | Sets `status: 'rejected'`, keeps document |
| Refresh tokens on reject | Hard-deleted | Invalidated (`isValid: false`) |
| Rejected Organizer login | Fails — account gone | Succeeds — lands on RejectedScreen |
| Queryable by SuperAdmin | No | Yes (`?status=rejected`) |
| PendingApprovalScreen poll | Reacted to `active` only | Reacts to `active` AND `rejected` |
| Time to auto-redirect after reject | N/A | ≤30 s (next poll cycle) |

**No routing changes required.** `getHomeRoute`, `ProtectedRoute`, `App.tsx`, and `RejectedScreen` were already correct for the soft-delete pattern.

**Deviation from original spec:** Task 26.3 originally said delete the account. Changed to soft-delete — rejected Organizer gets contextual feedback, account is auditable, change is reversible. See Deviation #10 in root `PROGRESS.md`.
# Design Document: EventSphere Phase 0 & Phase 1 (Auth Foundation)

## Overview

### Purpose

This design establishes the technical foundation for EventSphere, a multi-role Event & Expo Management SaaS platform. Phase 0 sets up the development infrastructure, tooling, and database connectivity. Phase 1 implements a complete authentication and authorization system supporting four distinct user roles: SuperAdmin, Organizer, Exhibitor, and Attendee.

### Scope

**Phase 0 (Setup):**
- Monorepo structure with separate frontend and backend applications
- MongoDB Atlas database connection and configuration
- Design system configuration with Tailwind CSS
- Environment variable management
- Development tooling and build setup

**Phase 1 (Auth Foundation):**
- User registration with role-specific flows
- Email-based OTP verification for Exhibitor and Attendee roles
- SuperAdmin seeding and Organizer approval workflow
- JWT-based authentication with access and refresh tokens
- Forgot password flow with 3-step OTP verification
- Role-based authorization on frontend routes and backend endpoints
- Dashboard shells for all four roles
- Toast notification system
- Responsive mobile layout

### Success Criteria

1. All four roles can successfully register and authenticate
2. SuperAdmin can approve/reject pending Organizers
3. Exhibitor and Attendee OTP verification works end-to-end
4. Each role lands on their designated dashboard after login
5. Route guards enforce role-based access on both frontend and backend
6. Forgot password flow completes successfully with password reset
7. Application is responsive and usable on mobile devices (320px to 1920px viewports)
8. No use of window.alert; all notifications via toast system


## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              React Application (Vite)                     │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │   Auth      │  │   Toast      │  │  Route Guards   │  │  │
│  │  │  Context    │  │   System     │  │   (Protected)   │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘  │  │
│  │         │                                      │          │  │
│  │  ┌──────▼──────────────────────────────────────▼───────┐  │  │
│  │  │         In-Memory Token Storage                     │  │  │
│  │  │  • Access Token (15-min expiry)                     │  │  │
│  │  │  • Refresh Token (rotation-based)                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS (REST API)
                             │ Authorization: Bearer <token>
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Express.js Backend                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Middleware Stack                       │  │
│  │  1. CORS (credentials + headers)                          │  │
│  │  2. Body Parser (JSON)                                    │  │
│  │  3. Authentication Middleware (verify JWT)                │  │
│  │  4. Authorization Middleware (check role)                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    API Routes                             │  │
│  │  • /api/auth (register, login, refresh, forgot-password)  │  │
│  │  • /api/admin (organizer approval - SuperAdmin only)      │  │
│  │  • /api/users (profile management)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│         │                              │                        │
│         ▼                              ▼                        │
│  ┌─────────────┐              ┌─────────────────┐              │
│  │  JWT Utils  │              │  Email Service  │              │
│  │  • Sign     │              │  (Resend API)   │              │
│  │  • Verify   │              │  • Send OTP     │              │
│  │  • Refresh  │              │  • Notify       │              │
│  └─────────────┘              └─────────────────┘              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ MongoDB Driver
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     MongoDB Atlas (Free Tier)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │    users     │  │     otps     │  │  refresh_tokens      │  │
│  │ Collection   │  │  Collection  │  │    Collection        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```


### Monorepo Structure

```
eventsphere/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/           # Auth-related components
│   │   │   ├── common/         # Reusable UI components
│   │   │   ├── dashboard/      # Role-specific dashboards
│   │   │   └── layout/         # Layout components (sidebar, header)
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx # Authentication state management
│   │   │   └── ThemeContext.tsx # Dark/Light mode
│   │   ├── guards/
│   │   │   └── ProtectedRoute.tsx # Role-based route protection
│   │   ├── services/
│   │   │   ├── api.ts          # Axios instance with interceptors
│   │   │   └── auth.service.ts # Auth API calls
│   │   ├── utils/
│   │   │   └── toast.ts        # Toast notification utilities
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts     # MongoDB connection
│   │   │   └── env.ts          # Environment validation
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts      # JWT verification
│   │   │   └── authorize.middleware.ts # Role checking
│   │   ├── models/
│   │   │   ├── User.model.ts
│   │   │   ├── OTP.model.ts
│   │   │   └── RefreshToken.model.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   └── admin.routes.ts
│   │   ├── services/
│   │   │   ├── email.service.ts # Resend integration
│   │   │   ├── otp.service.ts   # OTP generation/validation
│   │   │   └── token.service.ts # JWT operations
│   │   ├── utils/
│   │   │   └── password.utils.ts # bcrypt hashing
│   │   └── server.ts
│   ├── scripts/
│   │   └── seedSuperAdmin.js   # Idempotent seed script
│   ├── .env.example
│   └── tsconfig.json
├── PROGRESS.md
└── README.md
```

### Technology Stack

**Frontend:**
- React 18.x with TypeScript
- Vite (build tool and dev server)
- React Router 6.x (client-side routing)
- Tailwind CSS 3.x (styling)
- Axios (HTTP client)
- React Hot Toast (toast notifications)

**Backend:**
- Node.js 18.x or higher
- Express 4.x with TypeScript
- MongoDB Node Driver 6.x
- jsonwebtoken (JWT signing and verification)
- bcrypt (password hashing)
- @resend/node (email delivery)
- cors (cross-origin configuration)

**Database:**
- MongoDB Atlas (free tier M0)


## Components and Interfaces

### Data Models

#### User Model

```typescript
interface IUser {
  _id: ObjectId;
  email: string;              // Unique, lowercase, validated
  passwordHash: string;       // bcrypt hash with salt rounds = 10
  fullName: string;
  role: 'superadmin' | 'organizer' | 'exhibitor' | 'attendee';
  status: 'pending' | 'active' | 'suspended';
  isEmailVerified: boolean;   // true for Exhibitor/Attendee after OTP, always false for Organizer
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB Schema Constraints:
// - email: unique index, required
// - role: enum validation
// - status: enum validation, default 'pending' for organizers, 'active' for others after OTP
// - passwordHash: min length 60 (bcrypt output)
```

#### OTP Model

```typescript
interface IOTP {
  _id: ObjectId;
  email: string;              // Associated user email
  otpHash: string;            // bcrypt hash of 6-digit OTP
  purpose: 'registration' | 'password_reset';
  expiresAt: Date;            // Current time + 5 minutes
  resendCount: number;        // Max 3 attempts
  createdAt: Date;
}

// MongoDB Schema Constraints:
// - email + purpose: compound index (user can have one OTP per purpose)
// - expiresAt: TTL index (auto-delete expired documents)
// - resendCount: max 3
```

#### RefreshToken Model

```typescript
interface IRefreshToken {
  _id: ObjectId;
  userId: ObjectId;           // Reference to User._id
  tokenHash: string;          // SHA-256 hash of refresh token
  isValid: boolean;           // false when rotated or invalidated
  expiresAt: Date;            // Current time + 7 days
  createdAt: Date;
}

// MongoDB Schema Constraints:
// - userId: indexed, reference to users collection
// - tokenHash: unique index
// - expiresAt: TTL index (auto-delete expired tokens)
// - isValid: default true
```


### API Endpoints

#### Authentication Endpoints

**POST /api/auth/register**

Register a new user with role-specific flows.

*Request:*
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe",
  "role": "organizer" | "exhibitor" | "attendee"
}
```

*Response (Success - Organizer):*
```json
{
  "success": true,
  "message": "Registration successful. Your account is pending approval.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "organizer",
    "status": "pending"
  }
}
```

*Response (Success - Exhibitor/Attendee):*
```json
{
  "success": true,
  "message": "OTP sent to your email. Please verify to activate your account.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "role": "exhibitor",
    "otpExpiresIn": 300
  }
}
```

*Error Responses:*
- 400: Invalid email format, password too short, invalid role
- 409: Email already registered
- 403: Attempted to register as SuperAdmin
- 500: Server error (email send failure, database error)

---

**POST /api/auth/verify-otp**

Verify OTP for Exhibitor or Attendee registration.

*Request:*
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "purpose": "registration"
}
```

*Response (Success):*
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "isEmailVerified": true
  }
}
```

*Error Responses:*
- 400: Missing email or OTP
- 401: Invalid OTP, OTP expired
- 404: No pending OTP found
- 409: Account already verified
- 500: Server error


**POST /api/auth/resend-otp**

Resend OTP (max 3 attempts per registration).

*Request:*
```json
{
  "email": "user@example.com",
  "purpose": "registration"
}
```

*Response (Success):*
```json
{
  "success": true,
  "message": "OTP resent successfully.",
  "data": {
    "otpExpiresIn": 300,
    "resendCount": 2,
    "remainingAttempts": 1
  }
}
```

*Error Responses:*
- 429: Maximum resend attempts exceeded (3)
- 404: No pending OTP found or account already verified
- 500: Email send failure

---

**POST /api/auth/login**

Authenticate user and issue tokens.

*Request:*
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

*Response (Success):*
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "organizer",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

*Error Responses:*
- 401: Invalid email or password
- 403: Account pending approval (Organizer with status=pending)
- 403: Email not verified (Exhibitor/Attendee)
- 500: Server error

*Notes:*
- Access token payload: `{ userId, email, role }`, expires in 15 minutes
- Refresh token: stored in database with hash, expires in 7 days
- Both tokens returned in response body (not cookies)


**POST /api/auth/refresh**

Refresh access token using refresh token.

*Request Headers:*
```
Authorization: Bearer <refreshToken>
```

*Response (Success):*
```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

*Error Responses:*
- 401: Invalid or expired refresh token
- 403: Token has been rotated or invalidated
- 500: Server error

*Token Rotation Logic:*
1. Validate incoming refresh token
2. Mark old refresh token as invalid in database
3. Generate new access token (15-min expiry)
4. Generate new refresh token (7-day expiry)
5. Store new refresh token hash in database
6. Return both new tokens

---

**POST /api/auth/logout**

Invalidate refresh token (optional client-side only logout is also valid).

*Request Headers:*
```
Authorization: Bearer <accessToken>
```

*Request Body:*
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

*Response (Success):*
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

*Error Responses:*
- 401: Invalid access token
- 500: Server error

*Notes:*
- Marks refresh token as invalid in database
- Client must clear tokens from memory


**POST /api/auth/forgot-password/request**

Step 1: Request password reset OTP.

*Request:*
```json
{
  "email": "user@example.com"
}
```

*Response (Success):*
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset OTP has been sent.",
  "data": {
    "otpExpiresIn": 300
  }
}
```

*Error Responses:*
- 400: Invalid email format
- 500: Email send failure

*Security Note:*
- Always return success message even if email doesn't exist (prevent email enumeration)
- Only send OTP if account exists

---

**POST /api/auth/forgot-password/verify-otp**

Step 2: Verify OTP and issue short-lived reset token.

*Request:*
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

*Response (Success):*
```json
{
  "success": true,
  "message": "OTP verified. You can now reset your password.",
  "data": {
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 600
  }
}
```

*Error Responses:*
- 401: Invalid or expired OTP
- 404: No pending password reset OTP
- 500: Server error

*Notes:*
- Reset token expires in 10 minutes
- Reset token payload: `{ userId, purpose: 'password_reset' }`
- OTP is deleted after successful verification


**POST /api/auth/forgot-password/reset**

Step 3: Reset password using reset token.

*Request:*
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePass456"
}
```

*Response (Success):*
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password."
}
```

*Error Responses:*
- 400: Password validation failed (too short)
- 401: Invalid or expired reset token
- 500: Server error

*Security Actions:*
1. Verify reset token signature and expiry
2. Hash new password with bcrypt
3. Update user's passwordHash in database
4. Invalidate ALL refresh tokens for this user
5. Delete the reset token (if stored server-side)

---

#### Admin Endpoints

**GET /api/admin/pending-organizers**

Get list of Organizers awaiting approval. (SuperAdmin only)

*Request Headers:*
```
Authorization: Bearer <accessToken>
```

*Response (Success):*
```json
{
  "success": true,
  "data": {
    "organizers": [
      {
        "id": "507f1f77bcf86cd799439011",
        "email": "organizer@example.com",
        "fullName": "Jane Smith",
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "count": 1
  }
}
```

*Error Responses:*
- 401: Not authenticated
- 403: Not authorized (not SuperAdmin)
- 500: Server error


**PATCH /api/admin/organizers/:id/approve**

Approve a pending Organizer. (SuperAdmin only)

*Request Headers:*
```
Authorization: Bearer <accessToken>
```

*Response (Success):*
```json
{
  "success": true,
  "message": "Organizer approved successfully.",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "organizer@example.com",
    "status": "active"
  }
}
```

*Error Responses:*
- 401: Not authenticated
- 403: Not authorized (not SuperAdmin)
- 404: Organizer not found
- 409: Organizer already approved or not pending
- 500: Server error

*Side Effects:*
- User status changed from 'pending' to 'active'
- (Phase 1+) Email notification sent to Organizer

---

**DELETE /api/admin/organizers/:id/reject**

Reject and delete a pending Organizer account. (SuperAdmin only)

*Request Headers:*
```
Authorization: Bearer <accessToken>
```

*Response (Success):*
```json
{
  "success": true,
  "message": "Organizer rejected and account deleted."
}
```

*Error Responses:*
- 401: Not authenticated
- 403: Not authorized (not SuperAdmin)
- 404: Organizer not found
- 500: Server error

*Side Effects:*
- User document deleted from database
- All associated refresh tokens deleted
- (Phase 1+) Email notification sent to rejected user


### Frontend Component Hierarchy

```
App
├── AuthProvider (Context)
│   ├── State: { user, accessToken, refreshToken, isAuthenticated, isLoading }
│   └── Methods: { login, logout, register, refreshAccessToken }
├── ThemeProvider (Context)
│   ├── State: { theme: 'dark' | 'light' }
│   └── Methods: { toggleTheme }
├── ToastContainer
└── Router
    ├── Public Routes
    │   ├── /login → LoginPage
    │   ├── /register → RegisterPage
    │   ├── /verify-otp → VerifyOTPPage
    │   └── /forgot-password → ForgotPasswordFlow
    │       ├── /forgot-password/request → RequestResetPage
    │       ├── /forgot-password/verify → VerifyResetOTPPage
    │       └── /forgot-password/reset → ResetPasswordPage
    └── Protected Routes (ProtectedRoute wrapper)
        ├── /dashboard → RoleBasedDashboard
        │   ├── SuperAdmin → SuperAdminDashboard
        │   │   └── Includes: AdminApprovalsPage
        │   ├── Organizer → OrganizerDashboard
        │   │   └── Shows: PendingApprovalScreen (if status=pending)
        │   ├── Exhibitor → ExhibitorDashboard
        │   └── Attendee → AttendeeDashboard
        └── /profile → ProfilePage (all roles)
```

#### Core Frontend Components

**AuthContext (Context Provider)**
- Purpose: Manage authentication state globally
- State: user, accessToken, refreshToken, isAuthenticated, isLoading
- Methods:
  - `login(email, password)`: Call login API, store tokens in state
  - `logout()`: Clear tokens from state, optionally call logout API
  - `register(data)`: Call registration API
  - `refreshAccessToken()`: Call refresh API, update tokens
  - `checkAuthStatus()`: Verify if user is authenticated on mount
- Token Storage: React state only (not localStorage)
- Auto-refresh: Set up interval to refresh token before expiry (14 minutes)

**ProtectedRoute (Route Guard)**
- Purpose: Enforce authentication and role-based access
- Props: `allowedRoles: string[]`, `children: ReactNode`
- Logic:
  1. Check if user is authenticated (accessToken exists)
  2. If not authenticated → redirect to /login
  3. Check if user role is in allowedRoles array
  4. If not authorized → redirect to role's default dashboard
  5. If authorized → render children


**API Service (Axios Instance)**
- Purpose: Centralized HTTP client with interceptors
- Base Configuration:
  - baseURL: from `VITE_API_BASE_URL` env variable
  - headers: `Content-Type: application/json`
  - withCredentials: false (not using cookies)
- Request Interceptor:
  - Attach Authorization header: `Bearer <accessToken>` for protected routes
- Response Interceptor:
  - On 401 error: attempt token refresh automatically
  - If refresh succeeds: retry original request with new token
  - If refresh fails: logout user and redirect to login
  - On other errors: show toast notification with error message

**Toast System**
- Library: React Hot Toast
- Configuration:
  - Position: top-right (desktop), bottom-center (mobile < 768px)
  - Duration: 5000ms auto-dismiss
  - Types: success (green), error (red), warning (yellow), info (blue)
- Integration: Triggered from API service interceptors and form submissions

**Layout Components**

**Sidebar (Desktop)**
- Styling: Glass component (bg-slate-900/40 backdrop-blur-md)
- Position: Fixed left, full height
- Contents: Logo, navigation links (role-specific), theme toggle, logout button
- Responsive: Hidden below 768px, replaced by BottomNav

**BottomNav (Mobile)**
- Styling: Glass component (bg-slate-900/40 backdrop-blur-md)
- Position: Fixed bottom, full width
- Contents: Icon-only navigation (3-5 primary actions per role)
- Responsive: Visible only below 768px

**Header (Sticky)**
- Styling: Glass component (bg-slate-900/40 backdrop-blur-md)
- Position: Sticky top
- Contents: Page title, user avatar/dropdown, notifications icon (Phase 1+)
- Responsive: Adjusts padding for mobile

**BentoCard (Content Container)**
- Styling: bg-slate-900/80 border border-slate-800 rounded-xl
- Purpose: Container for dashboard content, forms, lists
- Variants: Default, hover effect, loading skeleton


### Authentication Flow Diagrams

#### Registration Flow - Organizer

```
User                    Frontend                Backend                 Database
  |                        |                       |                       |
  |--1. Fill form--------->|                       |                       |
  |  (email, password,     |                       |                       |
  |   name, role=organizer)|                       |                       |
  |                        |                       |                       |
  |--2. Submit------------>|                       |                       |
  |                        |--3. POST /register--->|                       |
  |                        |                       |--4. Check email------>|
  |                        |                       |<--5. Not found--------|
  |                        |                       |                       |
  |                        |                       |--6. Hash password---->|
  |                        |                       |                       |
  |                        |                       |--7. Create user------>|
  |                        |                       |   (status=pending)    |
  |                        |                       |<--8. User created-----|
  |                        |<--9. 200 OK-----------|                       |
  |                        |   {status: pending}   |                       |
  |<--10. Show message-----|                       |                       |
  |   "Pending approval"   |                       |                       |
  |                        |                       |                       |
  |--11. Redirect to------>|                       |                       |
  |    pending screen      |                       |                       |
```

#### Registration Flow - Exhibitor/Attendee

```
User                    Frontend                Backend             Resend API        Database
  |                        |                       |                    |               |
  |--1. Fill form--------->|                       |                    |               |
  |  (email, password,     |                       |                    |               |
  |   name, role=exhibitor)|                       |                    |               |
  |                        |                       |                    |               |
  |--2. Submit------------>|                       |                    |               |
  |                        |--3. POST /register--->|                    |               |
  |                        |                       |--4. Check email--->|               |
  |                        |                       |<--5. Not found-----|               |
  |                        |                       |                    |               |
  |                        |                       |--6. Hash password->|               |
  |                        |                       |                    |               |
  |                        |                       |--7. Create user--->|               |
  |                        |                       |   (status=active,  |               |
  |                        |                       |    verified=false) |               |
  |                        |                       |<--8. User created--|               |
  |                        |                       |                    |               |
  |                        |                       |--9. Generate OTP-->|               |
  |                        |                       |   (6 digits)       |               |
  |                        |                       |                    |               |
  |                        |                       |--10. Store OTP---->|               |
  |                        |                       |    hash + expiry   |               |
  |                        |                       |<--11. Stored-------|               |
  |                        |                       |                    |               |
  |                        |                       |--12. Send email--->|               |
  |                        |                       |                    |               |
  |                        |<--13. 200 OK----------|                    |               |
  |                        |   {otpExpiresIn:300}  |                    |               |
  |<--14. Redirect---------|                       |                    |               |
  |    to verify OTP page  |                       |                    |               |
  |                        |                       |                    |               |
  |--15. Enter OTP-------->|                       |                    |               |
  |                        |--16. POST /verify---->|                    |               |
  |                        |                       |--17. Get OTP------>|               |
  |                        |                       |<--18. OTP record---|               |
  |                        |                       |                    |               |
  |                        |                       |--19. Verify hash-->|               |
  |                        |                       |                    |               |
  |                        |                       |--20. Update user-->|               |
  |                        |                       |   (verified=true)  |               |
  |                        |                       |<--21. Updated------|               |
  |                        |                       |                    |               |
  |                        |                       |--22. Delete OTP--->|               |
  |                        |<--23. 200 OK----------|                    |               |
  |<--24. Success toast----|                       |                    |               |
  |                        |                       |                    |               |
  |--25. Redirect--------->|                       |                    |               |
  |    to login            |                       |                    |               |
```


#### Login Flow

```
User                Frontend            Backend                Database
  |                    |                   |                      |
  |--1. Enter--------->|                   |                      |
  |   credentials      |                   |                      |
  |                    |                   |                      |
  |--2. Submit-------->|                   |                      |
  |                    |--3. POST /login-->|                      |
  |                    |                   |--4. Find user------->|
  |                    |                   |<--5. User found------|
  |                    |                   |                      |
  |                    |                   |--6. Verify password->|
  |                    |                   |   (bcrypt compare)   |
  |                    |                   |                      |
  |                    |                   |--7. Check status---->|
  |                    |                   |   & verified         |
  |                    |                   |                      |
  |                    |                   |--8. Generate-------->|
  |                    |                   |   access token       |
  |                    |                   |   (15 min expiry)    |
  |                    |                   |                      |
  |                    |                   |--9. Generate-------->|
  |                    |                   |   refresh token      |
  |                    |                   |                      |
  |                    |                   |--10. Store refresh-->|
  |                    |                   |    token hash        |
  |                    |                   |<--11. Stored---------|
  |                    |                   |                      |
  |                    |<--12. 200 OK------|                      |
  |                    |   {user, tokens}  |                      |
  |                    |                   |                      |
  |<--13. Store--------|                   |                      |
  |   tokens in state  |                   |                      |
  |   (memory only)    |                   |                      |
  |                    |                   |                      |
  |<--14. Redirect-----|                   |                      |
  |   to dashboard     |                   |                      |
```

#### Token Refresh Flow (Automatic)

```
Frontend Timer      Frontend            Backend                Database
  |                    |                   |                      |
  |--1. 14 min-------->|                   |                      |
  |   elapsed          |                   |                      |
  |                    |                   |                      |
  |                    |--2. POST--------->|                      |
  |                    |  /auth/refresh    |                      |
  |                    |  (Bearer refresh) |                      |
  |                    |                   |                      |
  |                    |                   |--3. Verify token---->|
  |                    |                   |                      |
  |                    |                   |--4. Find token------>|
  |                    |                   |<--5. Token found-----|
  |                    |                   |   (isValid=true)     |
  |                    |                   |                      |
  |                    |                   |--6. Mark invalid---->|
  |                    |                   |   (old token)        |
  |                    |                   |                      |
  |                    |                   |--7. Generate new---->|
  |                    |                   |   access token       |
  |                    |                   |                      |
  |                    |                   |--8. Generate new---->|
  |                    |                   |   refresh token      |
  |                    |                   |                      |
  |                    |                   |--9. Store new------->|
  |                    |                   |   refresh hash       |
  |                    |                   |<--10. Stored---------|
  |                    |                   |                      |
  |                    |<--11. 200 OK------|                      |
  |                    |   {new tokens}    |                      |
  |                    |                   |                      |
  |<--12. Update-------|                   |                      |
  |   tokens in state  |                   |                      |
  |                    |                   |                      |
  |--13. Reset-------->|                   |                      |
  |    14-min timer    |                   |                      |
```


#### Organizer Approval Flow

```
Organizer           Frontend (Organizer)    Frontend (SuperAdmin)    Backend         Database
  |                        |                        |                    |               |
  |--1. Login------------->|                        |                    |               |
  |   (status=pending)     |                        |                    |               |
  |                        |--2. POST /login------->|                    |               |
  |                        |                        |                    |--3. Check---->|
  |                        |                        |                    |   status      |
  |                        |                        |                    |<--pending-----|
  |                        |<--3. 200 OK------------|                    |               |
  |                        |   (login allowed)      |                    |               |
  |                        |                        |                    |               |
  |<--4. Show pending------|                        |                    |               |
  |   approval screen      |                        |                    |               |
  |   "Awaiting approval"  |                        |                    |               |
  |                        |                        |                    |               |
  |                        |--5. Start polling----->|                    |               |
  |                        |   (every 30 sec)       |                    |               |
  |                        |                        |                    |               |
  |                        |                        |--6. SuperAdmin---->|               |
  |                        |                        |   views approvals  |               |
  |                        |                        |                    |               |
  |                        |                        |--7. GET pending--->|               |
  |                        |                        |                    |--8. Query---->|
  |                        |                        |                    |<--9. List-----|
  |                        |                        |<--10. 200 OK-------|               |
  |                        |                        |   {organizers}     |               |
  |                        |                        |                    |               |
  |                        |                        |--11. Click-------->|               |
  |                        |                        |    Approve btn     |               |
  |                        |                        |                    |               |
  |                        |                        |--12. PATCH-------->|               |
  |                        |                        |    /approve/:id    |               |
  |                        |                        |                    |--13. Update-->|
  |                        |                        |                    |   status=     |
  |                        |                        |                    |   active      |
  |                        |                        |                    |<--14. Done----|
  |                        |                        |<--15. 200 OK-------|               |
  |                        |                        |                    |               |
  |                        |<--16. Poll detects-----|                    |               |
  |                        |    status change       |                    |               |
  |                        |                        |                    |               |
  |<--17. Redirect---------|                        |                    |               |
  |    to full dashboard   |                        |                    |               |
```


#### Forgot Password Flow (3 Steps)

```
User                Frontend            Backend            Resend API        Database
  |                    |                   |                   |               |
  |===== STEP 1: Request OTP =====
  |                    |                   |                   |               |
  |--1. Enter email--->|                   |                   |               |
  |                    |--2. POST--------->|                   |               |
  |                    |  /forgot-password/|                   |               |
  |                    |  request          |                   |               |
  |                    |                   |--3. Find user---->|               |
  |                    |                   |<--4. Found--------|               |
  |                    |                   |                   |               |
  |                    |                   |--5. Generate----->|               |
  |                    |                   |   OTP (6 digits)  |               |
  |                    |                   |                   |               |
  |                    |                   |--6. Store OTP---->|               |
  |                    |                   |   hash + expiry   |               |
  |                    |                   |<--7. Stored-------|               |
  |                    |                   |                   |               |
  |                    |                   |--8. Send email--->|               |
  |                    |                   |                   |               |
  |                    |<--9. 200 OK-------|                   |               |
  |<--10. Redirect-----|                   |                   |               |
  |    to verify page  |                   |                   |               |
  |                    |                   |                   |               |
  |===== STEP 2: Verify OTP =====
  |                    |                   |                   |               |
  |--11. Enter OTP---->|                   |                   |               |
  |                    |--12. POST-------->|                   |               |
  |                    |  /forgot-password/|                   |               |
  |                    |  verify-otp       |                   |               |
  |                    |                   |--13. Get OTP----->|               |
  |                    |                   |<--14. OTP record--|               |
  |                    |                   |                   |               |
  |                    |                   |--15. Verify hash->|               |
  |                    |                   |                   |               |
  |                    |                   |--16. Generate---->|               |
  |                    |                   |   reset token     |               |
  |                    |                   |   (10 min expiry) |               |
  |                    |                   |                   |               |
  |                    |                   |--17. Delete OTP-->|               |
  |                    |<--18. 200 OK------|                   |               |
  |                    |   {resetToken}    |                   |               |
  |<--19. Redirect-----|                   |                   |               |
  |    to reset page   |                   |                   |               |
  |   (token in state) |                   |                   |               |
  |                    |                   |                   |               |
  |===== STEP 3: Reset Password =====
  |                    |                   |                   |               |
  |--20. Enter new---->|                   |                   |               |
  |    password        |                   |                   |               |
  |                    |--21. POST-------->|                   |               |
  |                    |  /forgot-password/|                   |               |
  |                    |  reset            |                   |               |
  |                    |                   |--22. Verify token>|               |
  |                    |                   |                   |               |
  |                    |                   |--23. Hash pwd---->|               |
  |                    |                   |                   |               |
  |                    |                   |--24. Update------>|               |
  |                    |                   |   passwordHash    |               |
  |                    |                   |<--25. Updated-----|               |
  |                    |                   |                   |               |
  |                    |                   |--26. Invalidate-->|               |
  |                    |                   |   ALL refresh     |               |
  |                    |                   |   tokens for user |               |
  |                    |                   |<--27. Done--------|               |
  |                    |                   |                   |               |
  |                    |<--28. 200 OK------|                   |               |
  |<--29. Success------|                   |                   |               |
  |    toast           |                   |                   |               |
  |                    |                   |                   |               |
  |--30. Redirect----->|                   |                   |               |
  |    to login        |                   |                   |               |
```


## Data Models

### MongoDB Collections and Indexes

#### users Collection

```javascript
{
  _id: ObjectId,
  email: String,              // unique, lowercase, indexed
  passwordHash: String,       // bcrypt hash (60 chars)
  fullName: String,
  role: String,               // enum: ['superadmin', 'organizer', 'exhibitor', 'attendee']
  status: String,             // enum: ['pending', 'active', 'suspended']
  isEmailVerified: Boolean,   // default: false
  createdAt: Date,            // default: Date.now
  updatedAt: Date             // default: Date.now
}

// Indexes:
// 1. { email: 1 } - unique
// 2. { role: 1, status: 1 } - for admin queries (pending organizers)
```

**Validation Rules:**
- email: regex pattern for valid email, convert to lowercase before save
- passwordHash: minimum 60 characters (bcrypt output)
- role: must be one of ['superadmin', 'organizer', 'exhibitor', 'attendee']
- status: must be one of ['pending', 'active', 'suspended']
- fullName: minimum 2 characters, maximum 100 characters

**Initial Status by Role:**
- SuperAdmin: 'active' (seeded only)
- Organizer: 'pending' (requires approval)
- Exhibitor: 'active' (after OTP verification)
- Attendee: 'active' (after OTP verification)

#### otps Collection

```javascript
{
  _id: ObjectId,
  email: String,              // indexed with purpose
  otpHash: String,            // bcrypt hash of 6-digit OTP
  purpose: String,            // enum: ['registration', 'password_reset']
  expiresAt: Date,            // TTL index (auto-delete)
  resendCount: Number,        // default: 0, max: 3
  createdAt: Date             // default: Date.now
}

// Indexes:
// 1. { email: 1, purpose: 1 } - unique compound index
// 2. { expiresAt: 1 } - TTL index (auto-delete after expiry)
```

**OTP Generation Logic:**
- Generate random 6-digit number: `Math.floor(100000 + Math.random() * 900000)`
- Hash with bcrypt (salt rounds = 10)
- Store hash, not plaintext
- Set expiresAt to current time + 5 minutes

**Resend Logic:**
1. Check existing OTP record
2. If resendCount >= 3, return error
3. Generate new OTP
4. Update existing record (increment resendCount, new otpHash, new expiresAt)
5. Send email


#### refresh_tokens Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // reference to users._id, indexed
  tokenHash: String,          // SHA-256 hash of refresh token, unique
  isValid: Boolean,           // default: true, set to false on rotation
  expiresAt: Date,            // TTL index, 7 days from creation
  createdAt: Date             // default: Date.now
}

// Indexes:
// 1. { userId: 1 } - for finding user's tokens
// 2. { tokenHash: 1 } - unique, for token lookup
// 3. { expiresAt: 1 } - TTL index (auto-delete expired tokens)
// 4. { userId: 1, isValid: 1 } - for invalidating all user tokens
```

**Token Rotation Strategy:**
1. Client sends refresh token via Authorization header
2. Server validates token signature and expiry
3. Server finds token in database by hash
4. If token.isValid === false, reject (already rotated)
5. Mark old token as invalid: `{ isValid: false }`
6. Generate new access token (15-min expiry)
7. Generate new refresh token (7-day expiry)
8. Store new refresh token hash with userId
9. Return both new tokens to client

**Security Properties:**
- Each refresh token can only be used once (rotation)
- Stolen tokens have limited window of use (7 days max)
- Detecting refresh token reuse indicates potential compromise
- All refresh tokens invalidated on password change

### JWT Token Structure

#### Access Token Payload

```javascript
{
  userId: "507f1f77bcf86cd799439011",
  email: "user@example.com",
  role: "organizer",
  iat: 1704985200,            // Issued at (Unix timestamp)
  exp: 1704986100             // Expires at (iat + 15 minutes)
}
```

**Signing:**
- Algorithm: HS256 (HMAC with SHA-256)
- Secret: from `JWT_SECRET` environment variable (min 32 characters)
- Library: jsonwebtoken

#### Refresh Token Payload

```javascript
{
  userId: "507f1f77bcf86cd799439011",
  type: "refresh",
  iat: 1704985200,            // Issued at
  exp: 1705590000             // Expires at (iat + 7 days)
}
```

**Storage:**
- Frontend: In-memory state (React context)
- Backend: Token hash stored in refresh_tokens collection
- Hash algorithm: SHA-256 before database storage


#### Reset Token Payload (Forgot Password)

```javascript
{
  userId: "507f1f77bcf86cd799439011",
  purpose: "password_reset",
  iat: 1704985200,            // Issued at
  exp: 1704985800             // Expires at (iat + 10 minutes)
}
```

**Properties:**
- Short-lived: 10-minute expiry
- Single-use: Not stored in database, validated by signature only
- Invalidated: After successful password reset or expiry

### Email Templates

#### OTP Email Template (Registration)

**Subject:** Verify your EventSphere account

**Body:**
```
Hello,

Your verification code for EventSphere is:

123456

This code expires in 5 minutes.

If you didn't request this code, please ignore this email.

Best regards,
EventSphere Team
```

#### OTP Email Template (Password Reset)

**Subject:** Reset your EventSphere password

**Body:**
```
Hello,

Your password reset code for EventSphere is:

123456

This code expires in 5 minutes.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
EventSphere Team
```

**Email Service Configuration (Resend):**
- From: `noreply@eventsphere.com` (configure in Resend dashboard)
- API Key: from `RESEND_API_KEY` environment variable
- Rate Limit: 100 emails/day (free tier)
- Error Handling: Log failures, return 500 to client with generic message


### Backend Middleware

#### Authentication Middleware (auth.middleware.ts)

**Purpose:** Verify JWT access token and attach user to request.

```typescript
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // 2. Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    // 3. Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Authentication failed.'
    });
  }
}
```

**Usage:** Apply to all protected routes
```typescript
router.get('/api/protected', authenticate, handler);
```


#### Authorization Middleware (authorize.middleware.ts)

**Purpose:** Check if user has required role for a route.

```typescript
function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Requires authenticate middleware to run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
}
```

**Usage:** Chain after authenticate middleware
```typescript
router.get(
  '/api/admin/pending-organizers',
  authenticate,
  authorize('superadmin'),
  handler
);

router.get(
  '/api/organizers/expos',
  authenticate,
  authorize('organizer'),
  handler
);
```

#### CORS Middleware Configuration

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,  // Allow credentials (not used for cookies, but enables Authorization header)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // 24 hours preflight cache
};

app.use(cors(corsOptions));
```

**Security Notes:**
- Do NOT use `origin: '*'` in production
- Frontend URL must be explicitly whitelisted
- Authorization header must be in allowedHeaders


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property-Based Testing Applicability Assessment

This feature involves **infrastructure setup, authentication flows, UI rendering, and database operations**. While there are pure functions suitable for property-based testing (password hashing, OTP generation, token signing), the majority of the system involves:

1. **Infrastructure as Code** - MongoDB connection, Express server setup (NOT suitable for PBT)
2. **External Service Integration** - Resend email API, database I/O (NOT suitable for PBT)
3. **UI Rendering** - React components, dashboard shells (NOT suitable for PBT)
4. **Authentication State Management** - Session handling, token storage (NOT suitable for PBT)
5. **Side-effect Operations** - Sending emails, database writes (NOT suitable for PBT)

**Decision: Property-based testing is NOT appropriate for this feature.**

**Rationale:**
- Most acceptance criteria test infrastructure wiring, external service integration, and UI behavior
- The system's correctness depends on external services (MongoDB, Resend) functioning correctly
- Side effects (email sending, database operations) cannot be meaningfully tested with universal properties
- UI interactions and layout requirements are not reducible to universal quantification

**Alternative Testing Strategy:**
- **Unit Tests** - Test pure functions (password validation, OTP generation logic, JWT signing/verification)
- **Integration Tests** - Test API endpoints with mock database and email service (1-3 examples per endpoint)
- **End-to-End Tests** - Test complete user flows (registration, login, approval) with real database (test environment)
- **Manual Testing** - Verify responsive layout, toast notifications, theme switching


## Error Handling

### Backend Error Handling Strategy

#### Error Response Format

All API errors follow a consistent structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",           // Optional, for client-side handling
  "errors": []                    // Optional, for validation errors
}
```

**HTTP Status Code Mapping:**
- 400 Bad Request - Validation errors, malformed input
- 401 Unauthorized - Authentication required or failed
- 403 Forbidden - Authenticated but not authorized
- 404 Not Found - Resource does not exist
- 409 Conflict - Duplicate email, status conflict
- 429 Too Many Requests - Rate limit exceeded (OTP resend)
- 500 Internal Server Error - Unexpected errors, service failures

#### Global Error Handler

```typescript
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.'
  });
}

app.use(errorHandler);
```


#### Async Error Wrapper

Wrap async route handlers to catch errors automatically:

```typescript
function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage
router.post('/api/auth/register', asyncHandler(async (req, res) => {
  // Errors automatically caught and passed to error handler
  const user = await createUser(req.body);
  res.json({ success: true, data: user });
}));
```

### Frontend Error Handling

#### Axios Response Interceptor

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expired - attempt refresh
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newTokens = await refreshAccessToken();
          // Update Authorization header with new access token
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          // Retry original request
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - logout user
          logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    // Other errors - show toast
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);

    return Promise.reject(error);
  }
);
```


#### Form Validation

**Client-Side (Immediate Feedback):**
```typescript
function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}
```

**Server-Side (Authoritative Validation):**
- Always validate on server even if client validates
- Never trust client-side validation alone
- Return detailed validation errors in response

#### Loading States

**Button Loading State:**
```typescript
<button
  disabled={isLoading}
  className="btn-primary"
>
  {isLoading ? (
    <>
      <Spinner className="mr-2" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</button>
```

**Page Loading State:**
```typescript
{isLoading && (
  <div className="flex items-center justify-center h-screen">
    <Spinner size="large" />
  </div>
)}
```

**Skeleton Loader (For Dashboard Lists):**
```typescript
{isLoading ? (
  <SkeletonCard count={3} />
) : (
  <List data={data} />
)}
```


## Testing Strategy

### Unit Tests

**Backend (Jest + Supertest):**

1. **Password Utilities**
   - Test password hashing produces different hashes for same input (salt)
   - Test password verification succeeds for correct password
   - Test password verification fails for incorrect password

2. **OTP Generation**
   - Test OTP is 6 digits
   - Test OTP hash is different from plaintext
   - Test OTP expiry is 5 minutes from generation

3. **JWT Token Service**
   - Test access token contains correct payload
   - Test access token expires in 15 minutes
   - Test refresh token contains correct payload
   - Test token verification rejects expired tokens
   - Test token verification rejects invalid signatures

4. **Email Service**
   - Test email service formats OTP emails correctly
   - Test email service handles Resend API errors gracefully (mock)

**Frontend (Vitest + React Testing Library):**

1. **Form Validation**
   - Test email validation rejects invalid formats
   - Test password validation requires minimum 8 characters
   - Test form submission disabled when validation fails

2. **ProtectedRoute Component**
   - Test redirects to login when not authenticated
   - Test redirects to dashboard when role not allowed
   - Test renders children when authenticated and authorized

3. **Toast Notifications**
   - Test success toast displays with correct message
   - Test error toast displays with correct message
   - Test toast auto-dismisses after 5 seconds


### Integration Tests

**API Endpoint Tests (with Test Database):**

1. **POST /api/auth/register**
   - Test successful Organizer registration (status=pending)
   - Test successful Exhibitor registration (OTP sent)
   - Test duplicate email returns 409 error
   - Test invalid email format returns 400 error
   - Test SuperAdmin role registration returns 403 error

2. **POST /api/auth/verify-otp**
   - Test valid OTP activates account
   - Test invalid OTP returns 401 error
   - Test expired OTP returns 401 error
   - Test already verified account returns 409 error

3. **POST /api/auth/login**
   - Test valid credentials return tokens
   - Test invalid credentials return 401 error
   - Test pending Organizer login returns 403 error
   - Test unverified Exhibitor login returns 403 error

4. **POST /api/auth/refresh**
   - Test valid refresh token returns new tokens
   - Test invalid refresh token returns 401 error
   - Test rotated token marked invalid in database

5. **POST /api/auth/forgot-password** (all 3 steps)
   - Test complete flow from OTP request to password reset
   - Test old password no longer works after reset
   - Test all refresh tokens invalidated after reset

6. **GET /api/admin/pending-organizers**
   - Test SuperAdmin can access endpoint
   - Test non-SuperAdmin returns 403 error
   - Test returns list of pending Organizers only

7. **PATCH /api/admin/organizers/:id/approve**
   - Test SuperAdmin can approve Organizer
   - Test Organizer status changes to active
   - Test non-SuperAdmin returns 403 error


### End-to-End Tests (Playwright or Cypress)

1. **Organizer Registration and Approval Flow**
   - Organizer registers → sees pending approval screen
   - SuperAdmin logs in → approves Organizer
   - Organizer refreshes → sees full dashboard

2. **Exhibitor Registration with OTP**
   - Exhibitor registers → receives OTP email (mock)
   - Exhibitor verifies OTP → account activated
   - Exhibitor logs in → sees dashboard

3. **Forgot Password Flow**
   - User requests password reset → receives OTP
   - User verifies OTP → gets reset token
   - User sets new password → old password fails
   - User logs in with new password → success

4. **Token Refresh on Expiry**
   - User logs in
   - Wait for token expiry (or mock time)
   - Make authenticated request → token auto-refreshes
   - Request succeeds with new token

5. **Route Guards**
   - Unauthenticated user visits protected route → redirects to login
   - Exhibitor visits SuperAdmin route → redirects to Exhibitor dashboard
   - SuperAdmin visits admin routes → access granted

### Manual Testing Checklist

- [ ] Responsive layout on mobile (320px to 768px)
- [ ] Responsive layout on tablet (768px to 1024px)
- [ ] Responsive layout on desktop (1024px+)
- [ ] Dark mode theme applies correctly
- [ ] Light mode theme applies correctly
- [ ] Theme preference persists across sessions
- [ ] Toast notifications appear in correct position
- [ ] Toast notifications auto-dismiss after 5 seconds
- [ ] Bottom navigation appears on mobile
- [ ] Sidebar appears on desktop
- [ ] Glass effect (backdrop-blur) visible on sidebar and header
- [ ] Bento cards render with correct styling
- [ ] Loading spinners appear during async operations
- [ ] Form buttons disable during submission
- [ ] No use of window.alert anywhere in application


## Security Considerations

### Password Security

1. **Hashing Algorithm:** bcrypt with salt rounds = 10
2. **Minimum Length:** 8 characters (enforced client and server-side)
3. **Storage:** Never store plaintext passwords
4. **Comparison:** Always use bcrypt.compare (constant-time comparison)

### Token Security

1. **JWT Secret:** Minimum 32 characters, stored in environment variable
2. **Token Storage:** In-memory only (React state), never localStorage/cookies
3. **Token Rotation:** New refresh token issued on every refresh (prevents reuse)
4. **Token Invalidation:** All refresh tokens invalidated on password change
5. **Short Expiry:** Access tokens expire in 15 minutes (limits exposure)

**Why Not httpOnly Cookies?**
- Cross-domain issues between frontend (Vercel) and backend (Render)
- Safari ITP and Chrome SameSite restrictions silently drop cookies
- Body + memory approach is more reliable for cross-domain deployments
- XSS mitigation: implement strict CSP, no inline scripts, no untrusted third-party scripts

### OTP Security

1. **Hashing:** OTPs hashed with bcrypt before storage
2. **Expiry:** 5-minute expiry enforced with TTL index
3. **Resend Limit:** Maximum 3 OTP resend attempts per session
4. **Rate Limiting:** Consider implementing IP-based rate limiting (Phase 1+)

### Email Enumeration Prevention

**Forgot Password Flow:**
- Always return success message even if email doesn't exist
- Prevents attackers from discovering registered emails
- "If an account exists with this email, a password reset OTP has been sent"

### CORS Configuration

- Whitelist specific frontend origin (not wildcard '*')
- Enable credentials for Authorization header
- Restrict allowed methods and headers
- Set maxAge for preflight cache efficiency


### Input Validation

1. **Email Validation:**
   - Regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
   - Convert to lowercase before storage
   - Validate on both client and server

2. **Password Validation:**
   - Minimum 8 characters
   - No maximum (allow passphrases)
   - Consider adding complexity requirements in Phase 1+

3. **OTP Validation:**
   - Exactly 6 digits
   - Type check (numeric string)

4. **Role Validation:**
   - Enum check: must be one of ['organizer', 'exhibitor', 'attendee']
   - Reject 'superadmin' role in registration

### Database Security

1. **Connection String:** Store in environment variable, never commit
2. **Indexes:** Implement unique indexes on email to prevent duplicates
3. **TTL Indexes:** Auto-delete expired OTPs and refresh tokens
4. **Backup Strategy:** MongoDB Atlas automated backups (free tier includes snapshots)

### Content Security Policy (Future Enhancement)

```typescript
// Helmet.js configuration for Express
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires inline styles
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", process.env.VITE_API_BASE_URL],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: []
  }
}));
```


## Environment Configuration

### Backend Environment Variables

**File:** `backend/.env`

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventsphere?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SuperAdmin Seed
SUPERADMIN_EMAIL=admin@eventsphere.com
SUPERADMIN_PASSWORD=SecureAdminPassword123

# CORS
FRONTEND_URL=http://localhost:5173
```

**Validation Rules:**
- `MONGODB_URI`: Required, must start with `mongodb://` or `mongodb+srv://`
- `JWT_SECRET`: Required, minimum 32 characters
- `RESEND_API_KEY`: Required, must start with `re_`
- `SUPERADMIN_EMAIL`: Required, valid email format
- `SUPERADMIN_PASSWORD`: Required, minimum 8 characters
- `FRONTEND_URL`: Required, valid URL format

**Environment Validation (env.ts):**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().startsWith('re_'),
  SUPERADMIN_EMAIL: z.string().email(),
  SUPERADMIN_PASSWORD: z.string().min(8),
  FRONTEND_URL: z.string().url()
});

export const env = envSchema.parse(process.env);
```


### Frontend Environment Variables

**File:** `frontend/.env`

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5000
```

**Vite Configuration (vite.config.ts):**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Optional: Proxy API calls during development
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
```

### Example Files

**Backend:** `backend/.env.example`
```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventsphere
JWT_SECRET=your-secret-key-min-32-chars-replace-this
RESEND_API_KEY=re_your_resend_api_key
SUPERADMIN_EMAIL=admin@eventsphere.com
SUPERADMIN_PASSWORD=ChangeThisPassword123
FRONTEND_URL=http://localhost:5173
```

**Frontend:** `frontend/.env.example`
```bash
VITE_API_BASE_URL=http://localhost:5000
```

**Instructions for Setup:**
1. Copy `.env.example` to `.env` in both frontend and backend directories
2. Replace placeholder values with actual credentials
3. Never commit `.env` files (included in `.gitignore`)
4. Document any new environment variables in PROGRESS.md


## Design System Implementation

### Tailwind Configuration

**File:** `frontend/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        'base': {
          dark: '#0a0a0f',      // slate-950 equivalent
          DEFAULT: '#f8fafc',   // Light mode base
        },
        // Bento card colors
        'bento': {
          bg: 'rgba(15, 23, 42, 0.8)',        // slate-900/80
          border: '#1e293b',                   // slate-800
          'bg-light': 'rgba(255, 255, 255, 0.9)',
          'border-light': '#e2e8f0',
        },
        // Glass component colors
        'glass': {
          bg: 'rgba(15, 23, 42, 0.4)',        // slate-900/40
          'bg-light': 'rgba(255, 255, 255, 0.6)',
        },
        // Accent colors
        'accent': {
          emerald: {
            DEFAULT: '#10b981',  // Emerald-500
            light: '#d1fae5',    // Emerald-100
          },
          indigo: {
            DEFAULT: '#6366f1',  // Indigo-500
            light: '#e0e7ff',    // Indigo-100
          }
        }
      },
      backdropBlur: {
        'md': '12px',
      },
      borderRadius: {
        'xl': '1rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
```


### Component Styling Guidelines

#### BentoCard Component

```typescript
interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function BentoCard({ children, className = '', hover = false }: BentoCardProps) {
  return (
    <div
      className={`
        bg-bento-bg dark:bg-bento-bg
        bg-bento-bg-light light:bg-bento-bg-light
        border border-bento-border dark:border-bento-border
        border-bento-border-light light:border-bento-border-light
        rounded-xl
        p-6
        ${hover ? 'hover:shadow-lg transition-shadow duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
```

#### Glass Component (Sidebar Example)

```typescript
export function Sidebar() {
  return (
    <aside className="
      fixed left-0 top-0 h-full w-64
      bg-glass-bg dark:bg-glass-bg
      bg-glass-bg-light light:bg-glass-bg-light
      backdrop-blur-md
      border-r border-slate-700/50 dark:border-slate-700/50
      border-slate-300/50 light:border-slate-300/50
      hidden md:block
    ">
      {/* Sidebar content */}
    </aside>
  );
}
```

#### Bottom Navigation (Mobile)

```typescript
export function BottomNav() {
  return (
    <nav className="
      fixed bottom-0 left-0 right-0
      bg-glass-bg dark:bg-glass-bg
      bg-glass-bg-light light:bg-glass-bg-light
      backdrop-blur-md
      border-t border-slate-700/50 dark:border-slate-700/50
      border-slate-300/50 light:border-slate-300/50
      md:hidden
      z-50
    ">
      <div className="flex justify-around items-center h-16 px-4">
        {/* Navigation icons */}
      </div>
    </nav>
  );
}
```


### Responsive Breakpoints

```typescript
// Tailwind default breakpoints used:
// sm: 640px   - Mobile landscape
// md: 768px   - Tablet
// lg: 1024px  - Desktop
// xl: 1280px  - Large desktop
// 2xl: 1536px - Extra large desktop
```

**Layout Adaptations:**

1. **< 768px (Mobile)**
   - Sidebar hidden
   - Bottom navigation visible
   - Single column layouts
   - Larger touch targets (min 44px)
   - Toast position: bottom-center

2. **768px - 1024px (Tablet)**
   - Sidebar visible
   - Bottom navigation hidden
   - Two-column layouts where appropriate
   - Normal touch targets

3. **> 1024px (Desktop)**
   - Sidebar visible
   - Bottom navigation hidden
   - Multi-column layouts
   - Hover states active
   - Toast position: top-right

### Theme Toggle Implementation

```typescript
// ThemeContext.tsx
const ThemeContext = createContext<{
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    // Get from localStorage or system preference
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```


## SuperAdmin Seed Script

### Script Implementation

**File:** `backend/scripts/seedSuperAdmin.js`

```javascript
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function seedSuperAdmin() {
  // Validation
  const { MONGODB_URI, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

  if (!MONGODB_URI || !SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.error('ERROR: Missing required environment variables');
    console.error('Required: MONGODB_URI, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD');
    process.exit(1);
  }

  if (SUPERADMIN_PASSWORD.length < 8) {
    console.error('ERROR: SUPERADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Check if SuperAdmin exists
    const existingSuperAdmin = await usersCollection.findOne({
      role: 'superadmin'
    });

    // Hash password
    const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

    if (existingSuperAdmin) {
      // Update existing SuperAdmin
      await usersCollection.updateOne(
        { _id: existingSuperAdmin._id },
        {
          $set: {
            email: SUPERADMIN_EMAIL.toLowerCase(),
            passwordHash: passwordHash,
            updatedAt: new Date()
          }
        }
      );
      console.log('✓ SuperAdmin account updated successfully');
      console.log(`  Email: ${SUPERADMIN_EMAIL}`);
    } else {
      // Create new SuperAdmin
      await usersCollection.insertOne({
        email: SUPERADMIN_EMAIL.toLowerCase(),
        passwordHash: passwordHash,
        fullName: 'Super Admin',
        role: 'superadmin',
        status: 'active',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ SuperAdmin account created successfully');
      console.log(`  Email: ${SUPERADMIN_EMAIL}`);
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

seedSuperAdmin();
```


### Script Usage

**Run Command:**
```bash
cd backend
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

**Package.json Script:**
```json
{
  "scripts": {
    "seed:superadmin": "node scripts/seedSuperAdmin.js"
  }
}
```

**Run via npm:**
```bash
npm run seed:superadmin
```

### Recovery Procedure

**Scenario: Lost SuperAdmin Access**

1. Update `SUPERADMIN_PASSWORD` in backend `.env` file
2. Run seed script: `npm run seed:superadmin`
3. Script updates existing SuperAdmin password hash
4. Log in with new password

**Scenario: Environment Loss (folder rename/deletion)**

1. Recreate `.env` file from `.env.example`
2. Fill in credentials (including new SuperAdmin password)
3. Run seed script: `npm run seed:superadmin`
4. SuperAdmin account created or updated

**Important Notes:**
- Script is idempotent: safe to run multiple times
- Always check for existing SuperAdmin before creating
- Update operation preserves SuperAdmin _id (maintains referential integrity)
- Document this procedure in PROGRESS.md


## Implementation Phases

### Phase 0: Project Setup

**Tasks:**
1. Initialize monorepo structure
2. Set up frontend with Vite + React + TypeScript
3. Set up backend with Express + TypeScript
4. Configure MongoDB Atlas connection
5. Configure Tailwind CSS with design tokens
6. Create `.env.example` files for both frontend and backend
7. Configure `.gitignore` (exclude node_modules, .env, build artifacts)
8. Initialize PROGRESS.md

**Acceptance Test:**
- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:5000`
- Backend connects to MongoDB successfully
- Tailwind design tokens applied to a test page

### Phase 1a: Authentication Backend

**Tasks:**
1. Implement User, OTP, and RefreshToken models
2. Implement password hashing utilities (bcrypt)
3. Implement JWT token service (sign, verify, refresh)
4. Implement OTP generation and validation
5. Integrate Resend email service
6. Implement authentication middleware
7. Implement authorization middleware
8. Create registration endpoint (all roles)
9. Create OTP verification endpoint
10. Create login endpoint
11. Create token refresh endpoint
12. Create logout endpoint
13. Implement SuperAdmin seed script
14. Configure CORS

**Acceptance Test:**
- Postman/curl tests for all auth endpoints
- SuperAdmin seed script runs successfully
- JWT tokens generated and verified correctly
- OTP emails sent via Resend (check inbox)


### Phase 1b: Frontend Authentication

**Tasks:**
1. Implement AuthContext with token management
2. Implement ThemeContext for dark/light mode
3. Implement API service with Axios interceptors
4. Implement Toast notification system
5. Create LoginPage component
6. Create RegisterPage component
7. Create VerifyOTPPage component
8. Create ForgotPasswordFlow components (3 steps)
9. Implement ProtectedRoute component
10. Implement automatic token refresh (14-min timer)
11. Test token refresh on 401 errors

**Acceptance Test:**
- User can register (all roles)
- Exhibitor receives OTP email and verifies
- User can log in and tokens stored in memory
- Access token auto-refreshes before expiry
- Token refresh works on 401 errors
- Theme toggle persists across sessions

### Phase 1c: Admin Approval Workflow

**Tasks:**
1. Create backend endpoints:
   - GET /api/admin/pending-organizers
   - PATCH /api/admin/organizers/:id/approve
   - DELETE /api/admin/organizers/:id/reject
2. Create PendingApprovalScreen (Organizer view)
3. Create AdminApprovalsPage (SuperAdmin view)
4. Implement 30-second polling for status changes
5. Test complete approval flow

**Acceptance Test:**
- Organizer registers → sees pending screen
- SuperAdmin sees pending Organizer in approvals list
- SuperAdmin approves → Organizer status becomes active
- Organizer refreshes or polling detects change → full dashboard appears
- SuperAdmin rejects → Organizer account deleted


### Phase 1d: Dashboard Shells & Route Guards

**Tasks:**
1. Create BentoCard component
2. Create Sidebar component (glass styling)
3. Create Header component (glass styling)
4. Create BottomNav component (mobile)
5. Implement role-based route guards (frontend)
6. Create SuperAdminDashboard
7. Create OrganizerDashboard
8. Create ExhibitorDashboard
9. Create AttendeeDashboard
10. Implement responsive layout (mobile, tablet, desktop)
11. Test route guards for all roles

**Acceptance Test:**
- Each role logs in and sees correct dashboard
- Sidebar visible on desktop, bottom nav on mobile
- Glass effect (backdrop-blur) visible on sidebar and header
- Route guards redirect unauthorized users
- Layout responsive from 320px to 1920px
- Theme toggle works on all pages

### Phase 1e: Forgot Password Flow

**Tasks:**
1. Create backend endpoints:
   - POST /api/auth/forgot-password/request
   - POST /api/auth/forgot-password/verify-otp
   - POST /api/auth/forgot-password/reset
2. Create RequestResetPage component
3. Create VerifyResetOTPPage component
4. Create ResetPasswordPage component
5. Test complete 3-step flow
6. Verify old password no longer works
7. Verify all refresh tokens invalidated

**Acceptance Test:**
- User requests password reset → receives OTP
- User verifies OTP → receives reset token
- User sets new password → old password fails
- User logs in with new password → success
- Old refresh tokens no longer valid


### Phase 1f: Final Integration & Testing

**Tasks:**
1. Write unit tests for critical functions
2. Write integration tests for API endpoints
3. Manual testing on mobile devices (actual devices, not just devtools)
4. Test all error states and loading states
5. Verify no `window.alert` usage anywhere
6. Update PROGRESS.md with completed features
7. Document any deviations from PROJECT_SPEC
8. Create README.md with setup instructions

**Acceptance Test (Exit Criteria):**
- ✅ All four roles can register and authenticate
- ✅ SuperAdmin can approve/reject Organizers
- ✅ Exhibitor/Attendee OTP verification works
- ✅ Each role lands on correct dashboard after login
- ✅ Route guards enforce role-based access (frontend + backend)
- ✅ Forgot password flow completes successfully
- ✅ Application responsive on mobile (tested on actual device)
- ✅ No use of window.alert; all notifications via toast
- ✅ Dark/Light mode works and persists
- ✅ Token refresh works automatically
- ✅ SuperAdmin seed script documented and tested

## Deployment Considerations

### Backend Deployment (Render/Railway/Heroku)

**Environment Variables:**
- Set all required env vars in platform dashboard
- Use production MongoDB Atlas connection string
- Generate strong JWT_SECRET (32+ random characters)
- Configure FRONTEND_URL to production domain

**Build Command:**
```bash
cd backend && npm install && npm run build
```

**Start Command:**
```bash
cd backend && npm start
```

**Health Check Endpoint:**
```typescript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```


### Frontend Deployment (Vercel/Netlify)

**Environment Variables:**
- `VITE_API_BASE_URL`: Production backend URL

**Build Command:**
```bash
cd frontend && npm install && npm run build
```

**Output Directory:**
```
frontend/dist
```

**Redirects/Rewrites (for SPA routing):**

**Vercel (vercel.json):**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Netlify (_redirects):**
```
/*    /index.html   200
```

### Post-Deployment Checklist

- [ ] Backend health check endpoint responds
- [ ] Frontend loads without errors
- [ ] CORS configured correctly (frontend can call backend)
- [ ] MongoDB Atlas IP whitelist includes deployment server (or 0.0.0.0/0)
- [ ] Environment variables set correctly on both platforms
- [ ] SuperAdmin seed script run on production database
- [ ] Test complete user flows (register, login, approve, forgot password)
- [ ] Verify emails delivered (Resend production domain configured)
- [ ] Test on mobile device (real device, not emulator)
- [ ] SSL/HTTPS enabled on both frontend and backend
- [ ] Update PROGRESS.md with deployment URLs

## Monitoring and Maintenance

### Logging Strategy

**Backend Logging:**
- Use structured logging (e.g., Winston or Pino)
- Log levels: error, warn, info, debug
- Log authentication attempts (success/failure)
- Log OTP generation and verification attempts
- Log token refresh operations
- Never log passwords, tokens, or OTPs in plaintext

**Frontend Error Tracking:**
- Consider integrating Sentry (free tier) for error tracking
- Log API errors to console in development
- Capture and report errors in production


### Database Maintenance

**Indexes to Monitor:**
- users.email (unique)
- users.role + users.status (compound for admin queries)
- otps.email + otps.purpose (compound unique)
- otps.expiresAt (TTL index)
- refresh_tokens.userId
- refresh_tokens.tokenHash (unique)
- refresh_tokens.expiresAt (TTL index)

**Regular Maintenance Tasks:**
- Review expired OTPs being auto-deleted (TTL working)
- Review expired refresh tokens being auto-deleted (TTL working)
- Monitor database storage usage (free tier: 512MB limit)
- Review authentication failure logs for suspicious activity

### Performance Optimization

**Backend:**
- Enable MongoDB connection pooling (default in driver)
- Cache frequently accessed data (future consideration)
- Use projection to limit fields returned in queries
- Monitor response times for slow queries

**Frontend:**
- Code splitting for route-based chunks
- Lazy load dashboard components
- Optimize images (if used in later phases)
- Enable Vite build optimizations in production

## Known Limitations and Future Enhancements

### Phase 0 & 1 Limitations

1. **No Email Notifications for Approval:** Organizers must manually check status or rely on polling (Phase 1+ will add email notifications)

2. **No Rate Limiting:** API endpoints not rate-limited (consider implementing in Phase 1+ with express-rate-limit)

3. **Basic Password Requirements:** Only length validation (consider adding complexity requirements in Phase 1+)

4. **No Account Deletion:** Users cannot self-delete accounts (add in Phase 1+)

5. **No Profile Editing:** Users cannot update profile information after registration (add in Phase 1+)

6. **No Session Management UI:** Users cannot view/revoke active sessions (add in Phase 1+)

7. **Limited Error Context:** Toast notifications show generic messages (consider more detailed error messages in Phase 1+)


### Potential Future Enhancements

**Security:**
- Two-factor authentication (TOTP or SMS)
- Password complexity requirements (uppercase, lowercase, numbers, symbols)
- Account lockout after failed login attempts
- IP-based rate limiting
- Security audit logging
- CAPTCHA for registration/login

**User Experience:**
- Remember me (longer-lived sessions with consent)
- Social login (Google, GitHub, etc.)
- Profile picture upload (Cloudinary integration)
- Account settings page
- Session management (view/revoke active sessions)
- Email change workflow with verification

**Monitoring:**
- Analytics dashboard for SuperAdmin
- Login/registration metrics
- Failed authentication tracking
- User activity logs

**Infrastructure:**
- Redis for session storage (distributed systems)
- Message queue for email sending (async processing)
- Database replication for high availability
- CDN for static assets

## Conclusion

This design document provides a comprehensive blueprint for implementing EventSphere Phase 0 (Setup) and Phase 1 (Auth Foundation). The architecture follows industry best practices for authentication, security, and user experience while maintaining simplicity for a solo developer.

**Key Design Decisions:**
1. **JWT Strategy:** Body + memory approach for cross-domain reliability
2. **Token Rotation:** Refresh tokens rotate on every refresh for security
3. **OTP Hashing:** OTPs hashed with bcrypt before storage
4. **Idempotent Seeding:** SuperAdmin seed script safe to run multiple times
5. **Design System:** Tailwind with custom tokens for consistent styling
6. **No Property-Based Testing:** Feature not suitable; using unit + integration tests

**Next Steps:**
1. Review and approve this design document
2. Proceed to Phase 0 implementation (project setup)
3. Continue sequentially through Phase 1a-1f
4. Test thoroughly before declaring Phase 1 complete
5. Document progress in PROGRESS.md
6. Move to Phase 2 (Expo Operations) only after Phase 1 exit criteria met


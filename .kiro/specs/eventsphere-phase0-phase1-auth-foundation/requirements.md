# Requirements Document

## Introduction

This document specifies requirements for EventSphere Phase 0 (Setup) and Phase 1 (P0a - Auth Foundation). EventSphere is a multi-role Event & Expo Management SaaS supporting four user roles: SuperAdmin, Organizer, Exhibitor, and Attendee.

Phase 0 establishes the technical foundation: repository structure, environment configuration, database connectivity, and base application frameworks.

Phase 1 implements the complete authentication and authorization system, including role-based registration flows, JWT-based session management, OTP verification, password recovery, and the SuperAdmin approval workflow for Organizers.

**Exit Criteria:** All four roles can register and authenticate, the Organizer approval flow operates end-to-end, OTP verification succeeds for Exhibitor and Attendee roles, and each role renders its designated dashboard shell with proper route guards enforced on both frontend and backend.

## Glossary

- **EventSphere_System**: The complete multi-role Event & Expo Management SaaS application
- **Frontend_Application**: React-based client application built with Vite, Tailwind CSS, and React Router
- **Backend_API**: Node.js Express server providing REST endpoints
- **Database**: MongoDB Atlas instance (free tier) storing all application data
- **SuperAdmin**: Seeded administrative role with system-wide privileges, primarily responsible for approving Organizers
- **Organizer**: User role requiring SuperAdmin approval before accessing full capabilities
- **Exhibitor**: User role requiring email OTP verification during registration
- **Attendee**: User role requiring email OTP verification during registration
- **Access_Token**: Short-lived JWT (15 minutes) held in memory on the frontend
- **Refresh_Token**: JWT held in memory on the frontend, sent via Authorization header to obtain new Access_Tokens
- **OTP**: Six-digit one-time password with 5-minute expiry, used for email verification and password reset
- **Resend_Service**: Third-party email delivery service used for sending OTPs and notifications
- **Seed_Script**: Idempotent script that creates or updates the SuperAdmin account from environment variables
- **Toast_System**: In-application notification component for user feedback (replaces window.alert)
- **Route_Guard**: Authorization middleware that enforces role-based access control
- **Pending_Status**: Account state for newly registered Organizers awaiting SuperAdmin approval
- **Active_Status**: Account state for approved users with full system access
- **Design_Tokens**: Centralized styling constants for colors, spacing, typography, and theme variants
- **Bento_Card**: Content card component with specific styling (bg-slate-900/80, border-slate-800, rounded-xl)
- **Glass_Component**: UI component with backdrop blur effect (bg-slate-900/40, backdrop-blur-md), used only for sidebar and sticky header

## Requirements

### Requirement 1: Project Foundation Setup

**User Story:** As a developer, I want the project structure and base applications initialized, so that I can build features on a stable foundation.

#### Acceptance Criteria

1. THE EventSphere_System SHALL have a monorepo structure with separate frontend and backend directories
2. THE Frontend_Application SHALL be initialized using Vite with React and TypeScript
3. THE Backend_API SHALL be initialized using Node.js with Express and TypeScript
4. THE EventSphere_System SHALL store all secrets and configuration in environment variables
5. THE EventSphere_System SHALL include environment variable templates (.env.example) for both frontend and backend
6. THE EventSphere_System SHALL include a .gitignore file that excludes node_modules, .env files, and build artifacts

### Requirement 2: Database Connection

**User Story:** As a developer, I want the backend connected to MongoDB Atlas, so that the application can persist data.

#### Acceptance Criteria

1. THE Backend_API SHALL connect to MongoDB Atlas using credentials from environment variables
2. WHEN the Backend_API starts, THE Backend_API SHALL verify the Database connection before accepting requests
3. IF the Database connection fails, THEN THE Backend_API SHALL log the error and terminate the startup process
4. THE Backend_API SHALL use connection pooling for Database operations
5. THE Database connection string SHALL be sourced from the MONGODB_URI environment variable

### Requirement 3: Design System Configuration

**User Story:** As a developer, I want design tokens configured in Tailwind, so that the UI maintains consistent styling.

#### Acceptance Criteria

1. THE Frontend_Application SHALL define Design_Tokens in the Tailwind configuration file
2. THE Design_Tokens SHALL include base background color (slate-950)
3. THE Design_Tokens SHALL include Bento_Card styling tokens (slate-900/80, slate-800, rounded-xl)
4. THE Design_Tokens SHALL include Glass_Component styling tokens (slate-900/40, backdrop-blur-md)
5. THE Design_Tokens SHALL include accent colors (Emerald and Indigo) for status badges
6. THE Frontend_Application SHALL support both dark mode and light mode themes
7. THE Frontend_Application SHALL persist the user's theme preference across sessions

### Requirement 4: SuperAdmin Account Seeding

**User Story:** As a system administrator, I want an idempotent seed script that creates or updates the SuperAdmin account, so that I can recover system access without data corruption.

#### Acceptance Criteria

1. THE Seed_Script SHALL be executable independently using the command "node scripts/seedSuperAdmin.js"
2. WHEN the Seed_Script executes, THE Seed_Script SHALL check if a SuperAdmin account already exists
3. IF a SuperAdmin account exists, THEN THE Seed_Script SHALL update the existing account's password hash with the new value from SUPERADMIN_PASSWORD
4. IF no SuperAdmin account exists, THEN THE Seed_Script SHALL create a new SuperAdmin account
5. THE Seed_Script SHALL source the SuperAdmin email from the SUPERADMIN_EMAIL environment variable
6. THE Seed_Script SHALL source the SuperAdmin password from the SUPERADMIN_PASSWORD environment variable
7. THE Seed_Script SHALL hash the password before storing it in the Database
8. WHEN the Seed_Script completes successfully, THE Seed_Script SHALL log a confirmation message
9. IF required environment variables are missing, THEN THE Seed_Script SHALL log an error and exit with a non-zero status code

### Requirement 5: User Registration for All Roles

**User Story:** As a user, I want to register for an account with my designated role, so that I can access the platform.

#### Acceptance Criteria

1. THE Backend_API SHALL provide a registration endpoint that accepts email, password, full name, and role
2. WHEN a user submits valid registration data, THE Backend_API SHALL validate that the email format is correct
3. WHEN a user submits valid registration data, THE Backend_API SHALL validate that the password meets minimum security requirements (at least 8 characters)
4. WHEN a user registers, THE Backend_API SHALL hash the password using bcrypt before storing it
5. IF a user attempts to register with an email that already exists, THEN THE Backend_API SHALL return an error message "Email already registered"
6. IF a user attempts to register as SuperAdmin, THEN THE Backend_API SHALL return an error message "SuperAdmin role cannot be registered"
7. WHEN an Organizer registers, THE Backend_API SHALL set the account status to Pending_Status
8. WHEN an Exhibitor registers, THE Backend_API SHALL generate and send an OTP to the provided email
9. WHEN an Attendee registers, THE Backend_API SHALL generate and send an OTP to the provided email

### Requirement 6: OTP Generation and Delivery

**User Story:** As a system, I want to generate and send OTPs for email verification, so that I can prevent bot registrations for Exhibitor and Attendee roles.

#### Acceptance Criteria

1. THE Backend_API SHALL generate a six-digit OTP for email verification
2. THE OTP SHALL have a 5-minute expiry time from generation
3. THE Backend_API SHALL store the OTP hash and expiry timestamp in the Database
4. WHEN an OTP is generated, THE Backend_API SHALL send the OTP via the Resend_Service
5. THE Backend_API SHALL limit OTP resend attempts to a maximum of 3 per registration session
6. IF the OTP resend limit is exceeded, THEN THE Backend_API SHALL return an error message "Maximum OTP resend attempts exceeded"
7. WHEN sending an OTP, THE Backend_API SHALL use the Resend_Service API key from the RESEND_API_KEY environment variable

### Requirement 7: OTP Verification

**User Story:** As an Exhibitor or Attendee, I want to verify my email with the OTP I received, so that I can activate my account.

#### Acceptance Criteria

1. THE Backend_API SHALL provide an OTP verification endpoint that accepts email and OTP code
2. WHEN a valid OTP is submitted, THE Backend_API SHALL set the account status to Active_Status
3. IF an expired OTP is submitted, THEN THE Backend_API SHALL return an error message "OTP has expired"
4. IF an incorrect OTP is submitted, THEN THE Backend_API SHALL return an error message "Invalid OTP"
5. IF an OTP is submitted for an already verified account, THEN THE Backend_API SHALL return an error message "Account already verified"
6. WHEN an OTP is successfully verified, THE Backend_API SHALL delete the OTP from the Database

### Requirement 8: User Authentication

**User Story:** As a registered user, I want to log in with my credentials, so that I can access my role-specific dashboard.

#### Acceptance Criteria

1. THE Backend_API SHALL provide a login endpoint that accepts email and password
2. WHEN valid credentials are submitted, THE Backend_API SHALL verify the password against the stored hash
3. IF invalid credentials are submitted, THEN THE Backend_API SHALL return an error message "Invalid email or password"
4. IF a user attempts to log in with Pending_Status, THEN THE Backend_API SHALL return an error message "Account pending approval"
5. WHEN authentication succeeds, THE Backend_API SHALL generate an Access_Token with 15-minute expiry
6. WHEN authentication succeeds, THE Backend_API SHALL generate a Refresh_Token
7. WHEN authentication succeeds, THE Backend_API SHALL return both tokens in the response body
8. THE Access_Token SHALL include the user's id, email, and role in the JWT payload
9. THE Refresh_Token SHALL be stored in the Database with the user's id and creation timestamp

### Requirement 9: Token-Based Session Management

**User Story:** As an authenticated user, I want my session to remain active without frequent re-login, so that I can work efficiently.

#### Acceptance Criteria

1. THE Frontend_Application SHALL store the Access_Token in memory (not localStorage or sessionStorage)
2. THE Frontend_Application SHALL store the Refresh_Token in memory (not localStorage or sessionStorage)
3. WHEN the Access_Token expires, THE Frontend_Application SHALL automatically call the token refresh endpoint
4. THE Backend_API SHALL provide a token refresh endpoint that accepts a Refresh_Token via the Authorization header
5. WHEN a valid Refresh_Token is submitted, THE Backend_API SHALL generate a new Access_Token
6. WHEN a valid Refresh_Token is submitted, THE Backend_API SHALL generate a new Refresh_Token
7. WHEN new tokens are issued, THE Backend_API SHALL invalidate the old Refresh_Token in the Database
8. IF an invalid or expired Refresh_Token is submitted, THEN THE Backend_API SHALL return an error and THE Frontend_Application SHALL redirect to the login page
9. THE JWT secret for token signing SHALL be sourced from the JWT_SECRET environment variable

### Requirement 10: Organizer Approval Workflow

**User Story:** As an Organizer, I want to see my approval status after registration, so that I know when I can access full platform features.

#### Acceptance Criteria

1. WHEN an Organizer logs in with Pending_Status, THE Frontend_Application SHALL display a pending approval screen
2. THE pending approval screen SHALL inform the Organizer that their account is awaiting SuperAdmin approval
3. THE pending approval screen SHALL not display navigation to other features
4. WHEN an Organizer with Active_Status logs in, THE Frontend_Application SHALL display the full Organizer dashboard
5. THE Frontend_Application SHALL poll for status changes every 30 seconds while on the pending approval screen

### Requirement 11: SuperAdmin Approval Interface

**User Story:** As a SuperAdmin, I want to review and approve or reject pending Organizer registrations, so that I can control who manages events on the platform.

#### Acceptance Criteria

1. THE Frontend_Application SHALL provide an Admin Approvals page accessible only to SuperAdmin
2. THE Admin Approvals page SHALL display a list of all Organizers with Pending_Status
3. FOR EACH pending Organizer, THE Admin Approvals page SHALL display email, full name, and registration date
4. THE Backend_API SHALL provide an endpoint to approve an Organizer that changes status from Pending_Status to Active_Status
5. THE Backend_API SHALL provide an endpoint to reject an Organizer that deletes the account
6. WHEN a SuperAdmin approves an Organizer, THE Backend_API SHALL update the Organizer's status to Active_Status
7. WHEN a SuperAdmin rejects an Organizer, THE Backend_API SHALL delete the Organizer's account from the Database
8. THE Admin Approvals page SHALL refresh the list after each approval or rejection action

### Requirement 12: Forgot Password Flow - Step 1 (Request OTP)

**User Story:** As a user who forgot my password, I want to request a password reset OTP, so that I can regain access to my account.

#### Acceptance Criteria

1. THE Frontend_Application SHALL provide a forgot password page with an email input field
2. THE Backend_API SHALL provide a password reset request endpoint that accepts an email address
3. WHEN a user submits a valid email address, THE Backend_API SHALL generate a six-digit OTP
4. THE OTP for password reset SHALL have a 5-minute expiry time
5. WHEN an OTP is generated, THE Backend_API SHALL send the OTP via the Resend_Service
6. THE Backend_API SHALL store the OTP hash and expiry timestamp associated with the user account
7. IF the email address does not exist, THE Backend_API SHALL return a success message without revealing that the account does not exist (security best practice)

### Requirement 13: Forgot Password Flow - Step 2 (Verify OTP and Issue Reset Token)

**User Story:** As a user resetting my password, I want to verify the OTP I received, so that I can proceed to set a new password.

#### Acceptance Criteria

1. THE Frontend_Application SHALL provide a page to enter the OTP received via email
2. THE Backend_API SHALL provide an OTP verification endpoint for password reset that accepts email and OTP code
3. WHEN a valid OTP is submitted, THE Backend_API SHALL generate a short-lived password reset token (valid for 10 minutes)
4. THE password reset token SHALL include the user's id in the JWT payload
5. WHEN a valid OTP is verified, THE Backend_API SHALL return the reset token in the response body
6. IF an expired OTP is submitted, THEN THE Backend_API SHALL return an error message "OTP has expired"
7. IF an incorrect OTP is submitted, THEN THE Backend_API SHALL return an error message "Invalid OTP"
8. WHEN a reset token is issued, THE Backend_API SHALL delete the OTP from the Database

### Requirement 14: Forgot Password Flow - Step 3 (Reset Password)

**User Story:** As a user resetting my password, I want to set a new password using my reset token, so that I can log in with the new credentials.

#### Acceptance Criteria

1. THE Frontend_Application SHALL provide a page to enter a new password with the reset token
2. THE Backend_API SHALL provide a password reset endpoint that accepts a reset token and new password
3. WHEN a valid reset token is submitted, THE Backend_API SHALL verify the token signature and expiry
4. WHEN a valid reset token and new password are submitted, THE Backend_API SHALL hash the new password
5. WHEN the password is updated, THE Backend_API SHALL invalidate all existing Refresh_Tokens for that user
6. WHEN the password is updated, THE Backend_API SHALL delete the reset token from any server-side storage
7. IF an expired or invalid reset token is submitted, THEN THE Backend_API SHALL return an error message "Invalid or expired reset token"
8. THE new password SHALL meet the same validation requirements as registration (at least 8 characters)

### Requirement 15: Role-Based Route Guards (Backend)

**User Story:** As a system, I want to enforce role-based access control on API endpoints, so that users cannot access unauthorized resources.

#### Acceptance Criteria

1. THE Backend_API SHALL provide authentication middleware that verifies the Access_Token on protected endpoints
2. IF no Access_Token is provided, THEN THE Backend_API SHALL return a 401 Unauthorized error
3. IF an invalid or expired Access_Token is provided, THEN THE Backend_API SHALL return a 401 Unauthorized error
4. THE Backend_API SHALL provide authorization middleware that checks the user's role against required roles
5. IF a user attempts to access an endpoint without the required role, THEN THE Backend_API SHALL return a 403 Forbidden error
6. THE Admin Approvals endpoints SHALL be accessible only to SuperAdmin
7. ALL protected endpoints SHALL use the authentication middleware before processing requests

### Requirement 16: Role-Based Route Guards (Frontend)

**User Story:** As a system, I want to enforce role-based routing on the frontend, so that users only see pages appropriate for their role.

#### Acceptance Criteria

1. THE Frontend_Application SHALL implement a Route_Guard component that checks authentication and role before rendering protected routes
2. IF a user is not authenticated, THEN THE Route_Guard SHALL redirect to the login page
3. IF a user does not have the required role for a route, THEN THE Route_Guard SHALL redirect to their role-specific dashboard
4. THE Route_Guard SHALL extract the user's role from the Access_Token payload
5. SuperAdmin-only routes SHALL be accessible only when the user role is SuperAdmin
6. Organizer-only routes SHALL be accessible only when the user role is Organizer and status is Active_Status
7. Exhibitor-only routes SHALL be accessible only when the user role is Exhibitor
8. Attendee-only routes SHALL be accessible only when the user role is Attendee

### Requirement 17: Dashboard Shells for All Roles

**User Story:** As an authenticated user, I want to see my role-specific dashboard after login, so that I can access features relevant to my role.

#### Acceptance Criteria

1. WHEN a SuperAdmin logs in, THE Frontend_Application SHALL display the SuperAdmin dashboard with navigation to Admin Approvals
2. WHEN an Organizer with Active_Status logs in, THE Frontend_Application SHALL display the Organizer dashboard shell (empty state for Phase 1)
3. WHEN an Exhibitor logs in, THE Frontend_Application SHALL display the Exhibitor dashboard shell (empty state for Phase 1)
4. WHEN an Attendee logs in, THE Frontend_Application SHALL display the Attendee dashboard shell (empty state for Phase 1)
5. ALL dashboard pages SHALL use the Bento_Card component for content areas
6. ALL dashboard pages SHALL display a navigation sidebar using the Glass_Component styling
7. ALL dashboard pages SHALL display a sticky header using the Glass_Component styling
8. THE navigation sidebar SHALL adapt to a bottom navigation bar on mobile viewports (below 768px width)

### Requirement 18: Toast Notification System

**User Story:** As a user, I want to see non-blocking notifications for success, error, and info messages, so that I receive feedback without workflow interruption.

#### Acceptance Criteria

1. THE Frontend_Application SHALL implement a Toast_System component
2. THE Toast_System SHALL support four notification types: success, error, warning, and info
3. THE Toast_System SHALL display toasts in the top-right corner of the viewport
4. THE Toast_System SHALL automatically dismiss toasts after 5 seconds
5. THE Toast_System SHALL allow manual dismissal by clicking a close button
6. THE Toast_System SHALL stack multiple toasts vertically with 8px spacing
7. THE EventSphere_System SHALL never use window.alert for user notifications
8. ALL success API responses that require user feedback SHALL trigger a success toast
9. ALL error API responses SHALL trigger an error toast with the error message

### Requirement 19: Loading and Error States

**User Story:** As a user, I want to see loading indicators and error messages during asynchronous operations, so that I understand what the system is doing.

#### Acceptance Criteria

1. THE Frontend_Application SHALL display a loading spinner for all asynchronous requests
2. WHEN data is being fetched, THE Frontend_Application SHALL disable form submission buttons
3. WHEN an API request fails, THE Frontend_Application SHALL display an error message via the Toast_System
4. WHEN a form submission succeeds, THE Frontend_Application SHALL display a success message via the Toast_System
5. THE loading spinner SHALL be visually consistent across all pages using Design_Tokens
6. WHEN initial page data is loading, THE Frontend_Application SHALL display a skeleton loader matching the expected content layout

### Requirement 20: Progress Documentation

**User Story:** As a developer, I want implementation progress documented in PROGRESS.md, so that I can resume work after session loss or environment reset.

#### Acceptance Criteria

1. THE EventSphere_System SHALL include a PROGRESS.md file in the project root
2. WHEN a feature is completed, THE developer SHALL update PROGRESS.md with the completed feature name and date
3. THE PROGRESS.md file SHALL document the JWT strategy (body + memory, not httpOnly cookies)
4. THE PROGRESS.md file SHALL document the OTP provider choice (Resend)
5. THE PROGRESS.md file SHALL document the SuperAdmin seed script run command
6. THE PROGRESS.md file SHALL list required environment variables for both frontend and backend
7. WHEN a deviation from the PROJECT_SPEC occurs, THE developer SHALL document the deviation and rationale in PROGRESS.md

### Requirement 21: Environment Variables Documentation

**User Story:** As a developer, I want clear documentation of all required environment variables, so that I can configure the application correctly.

#### Acceptance Criteria

1. THE Backend_API SHALL include a .env.example file listing all required environment variables
2. THE Frontend_Application SHALL include a .env.example file listing all required environment variables
3. THE Backend_API .env.example SHALL include: MONGODB_URI, JWT_SECRET, RESEND_API_KEY, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, PORT
4. THE Frontend_Application .env.example SHALL include: VITE_API_BASE_URL
5. ALL environment variable examples SHALL use placeholder values, never real secrets
6. THE PROGRESS.md file SHALL reference the location of both .env.example files

### Requirement 22: Responsive Mobile Layout

**User Story:** As a mobile user, I want the application to be usable on my phone, so that I can access EventSphere on any device.

#### Acceptance Criteria

1. THE Frontend_Application SHALL be responsive across viewport widths from 320px to 1920px
2. WHEN the viewport width is below 768px, THE navigation sidebar SHALL transform into a bottom navigation bar
3. THE bottom navigation bar SHALL remain fixed at the bottom of the viewport
4. THE bottom navigation bar SHALL use icon-only navigation with optional labels
5. ALL form inputs SHALL be sized appropriately for touch interaction on mobile (minimum 44px touch target)
6. ALL Bento_Card components SHALL adapt their padding and spacing for mobile viewports
7. THE Toast_System SHALL reposition to bottom-center on mobile viewports to avoid overlap with the bottom navigation

### Requirement 23: Cross-Origin Configuration

**User Story:** As a system, I want the backend to accept requests from the frontend domain, so that the frontend and backend can communicate across different origins.

#### Acceptance Criteria

1. THE Backend_API SHALL configure CORS middleware to accept requests from the frontend origin
2. THE CORS configuration SHALL allow credentials to be included in requests
3. THE CORS configuration SHALL allow the Authorization header
4. THE CORS configuration SHALL allow the Content-Type header
5. THE allowed frontend origin SHALL be sourced from the FRONTEND_URL environment variable
6. THE Backend_API SHALL reject requests from origins not listed in the CORS configuration

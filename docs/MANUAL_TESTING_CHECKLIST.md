# EventSphere â€” Manual Testing Checklist

**Phase:** 0 (Project Foundation) & Phase 1 (Auth Foundation)  
**Purpose:** Step-by-step manual verification of all features implemented in Phase 0 and Phase 1.  
**Audience:** Developers and QA testers validating the build before Phase 2 begins.

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Test Accounts](#test-accounts)
3. [42.1 â€” Responsive Layout Testing](#421--responsive-layout-testing)
4. [42.2 â€” Theme Testing](#422--theme-testing)
5. [42.3 â€” Toast Notification Testing](#423--toast-notification-testing)
6. [42.4 â€” Loading and Error States](#424--loading-and-error-states)
7. [42.5 â€” Authentication Flows](#425--authentication-flows)
8. [42.6 â€” Route Guards and Authorization](#426--route-guards-and-authorization)
9. [42.7 â€” Mobile Device Testing](#427--mobile-device-testing)
10. [Results Summary](#results-summary)

---

## Test Environment Setup

### Prerequisites

- Node.js 18.x or higher installed
- MongoDB Atlas cluster running and accessible (verify connection string in `backend/.env`)
- Resend API key configured in `backend/.env` (required for OTP emails)
- Both servers running simultaneously in separate terminals

### Starting the Backend

```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
# You should see: "Server running on port 5000" and "MongoDB connected"
```

### Starting the Frontend

```bash
cd frontend
npm run dev
# Dev server starts at http://localhost:5173
```

### Verifying Backend Health

```bash
curl http://localhost:5000/health
# Expected: {"status":"ok"} or similar 200 response
```

### Seeding the SuperAdmin Account

If no SuperAdmin exists yet, run the seed script once from the `backend` directory:

```bash
cd backend
npm run seed:superadmin
# Expected output: "SuperAdmin account created/updated for: <SUPERADMIN_EMAIL>"
```

The SuperAdmin credentials come from `backend/.env`:
- Email: value of `SUPERADMIN_EMAIL`
- Password: value of `SUPERADMIN_PASSWORD`

### Environment Files

| File | Purpose |
|------|---------|
| `backend/.env` | Backend secrets (MongoDB URI, JWT secret, Resend key, SuperAdmin credentials) |
| `frontend/.env` | `VITE_API_BASE_URL=http://localhost:5000` |
| `backend/.env.example` | Template â€” never contains real secrets |
| `frontend/.env.example` | Template â€” never contains real secrets |

---

## Test Accounts

Create the following accounts during testing. Use unique, real email addresses you can receive mail at (required for OTP verification).

| Role | Suggested Email | Password | Notes |
|------|----------------|----------|-------|
| SuperAdmin | From `SUPERADMIN_EMAIL` in `.env` | From `SUPERADMIN_PASSWORD` in `.env` | Created via seed script |
| Organizer | `test-organizer@yourdomain.com` | `TestPass123` | Requires SuperAdmin approval |
| Exhibitor | `test-exhibitor@yourdomain.com` | `TestPass123` | Requires email OTP verification |
| Attendee | `test-attendee@yourdomain.com` | `TestPass123` | Requires email OTP verification |

> **Note:** All test passwords must be at least 8 characters. Use your own email addresses â€” OTPs are delivered via Resend to real inboxes.

---

## 42.1 â€” Responsive Layout Testing

**Requirements:** 22.1, 22.2, 22.3  
**Goal:** Verify the application renders correctly and navigation adapts across mobile, tablet, and desktop viewport sizes.

### Setup

Log in as any role with an active account before running layout tests. Dashboard pages have the most layout complexity.

---

- [ ] **TC-42.1-001 â€” Mobile: Sidebar hidden, BottomNav visible**  
  **Viewport:** 375px Ã— 812px (or use browser DevTools â†’ iPhone 12)  
  **Steps:**  
  1. Open `http://localhost:5173` and log in as any active user.  
  2. Navigate to your role-specific dashboard.  
  3. Resize the browser or use DevTools to set width to 375px.  
  **Expected Result:** The left sidebar is **not visible**. A bottom navigation bar is **pinned to the bottom** of the viewport.

---

- [ ] **TC-42.1-002 â€” Mobile: Bottom navigation shows role-specific icons**  
  **Viewport:** 375px Ã— 812px  
  **Steps:**  
  1. While on the mobile dashboard view from TC-42.1-001, inspect the bottom navigation bar.  
  **Expected Result:** The  to the current user's role. Icons are tappable and navigate to the correct page.

---

- [ ] **TC-42.1-003 â€” Mobile: Full-width layout on 320px**  bottom nav contains 3â€“5 icon buttons relevant
  **Viewport:** 320px Ã— 568px  
  **Steps:**  
  1. Use DevTools to set viewport width to 320px (minimum supported width).  
  2. Navigate through the login page, register page, and dashboard.  
  **Expected Result:** No horizontal scrollbar appears. Content fills the viewport width. Text is readable without zooming.

---

- [ ] **TC-42.1-004 â€” Tablet: Sidebar visible, BottomNav hidden**  
  **Viewport:** 768px Ã— 1024px  
  **Steps:**  
  1. Use DevTools to set viewport to 768px width.  
  2. Log in and navigate to the dashboard.  
  **Expected Result:** The left sidebar IS visible. The bottom navigation bar is **not visible**.

---

- [ ] **TC-42.1-005 â€” Tablet: Content area adapts at 768pxâ€“1024px**  
  **Viewport:** 900px Ã— 768px  
  **Steps:**  
  1. Set DevTools viewport to 900px.  
  2. Visit the dashboard and any other page with a BentoCard layout.  
  **Expected Result:** BentoCard components stack or arrange reasonably with appropriate padding. No overflow or truncation of critical content.

---

- [ ] **TC-42.1-006 â€” Desktop: Full layout at 1280px**  
  **Viewport:** 1280px Ã— 800px  
  **Steps:**  
  1. Use a standard desktop browser window at 1280px wide.  
  2. Log in and visit the dashboard.  
  **Expected Result:** Left sidebar is visible (256px wide). Main content area occupies the remaining width. Header is sticky at the top. No bottom navigation visible.

---

- [ ] **TC-42.1-007 â€” Desktop: Full layout at 1920px**  
  **Viewport:** 1920px Ã— 1080px  
  **Steps:**  
  1. Maximize the browser window on a 1080p monitor (or set DevTools to 1920px).  
  2. Navigate through login, dashboard, and admin pages.  
  **Expected Result:** Layout scales gracefully to 1920px. No empty or stretched containers. Content remains centered or appropriately constrained.

---

- [ ] **TC-42.1-008 â€” Responsive: Authentication pages adapt on mobile**  
  **Viewport:** 375px  
  **Steps:**  
  1. Navigate to `/login`, `/register`, `/forgot-password`, `/verify-otp`.  
  2. Inspect each page at 375px width.  
  **Expected Result:** Forms are full-width with appropriate padding. Labels and inputs do not overflow. Buttons are clearly visible and tappable.

---

## 42.2 â€” Theme Testing

**Requirements:** 3.6, 3.7  
**Goal:** Verify dark and light modes apply correct styles to all pages and that the preference persists after a browser refresh.

---

- [ ] **TC-42.2-001 â€” Dark mode: Applied to all dashboard pages**  
  **Steps:**  
  1. Log in as any active user.  
  2. If the theme toggle is visible in the sidebar or header, ensure **dark mode** is active.  
  3. Visit the dashboard, any sub-pages, and the header/sidebar.  
  **Expected Result:** Background is dark (approx. `#0B1120`). Text is light. Sidebar and header use glass-effect dark styling. BentoCards have dark card backgrounds. No harsh white flashes or unstyled elements.

---

- [ ] **TC-42.2-002 â€” Light mode: Applied to all dashboard pages**  
  **Steps:**  
  1. While logged in, click the theme toggle button (in the sidebar or header).  
  2. The theme should switch to **light mode**.  
  3. Visit the dashboard, sub-pages, and inspect all components.  
  **Expected Result:** Background is light (approx. `#F8FAFC`). Text is dark. Cards use white/light surfaces. Sidebar and header remain glass-styled but light. All text remains readable.

---

- [ ] **TC-42.2-003 â€” Theme persists after browser refresh**  
  **Steps:**  
  1. Set the theme to **light mode** using the toggle.  
  2. Refresh the browser (`F5` or `Ctrl+R`).  
  **Expected Result:** After reload, light mode is still active. The page does not flash dark before switching.

---

- [ ] **TC-42.2-004 â€” Theme persists after closing and reopening the tab**  
  **Steps:**  
  1. Set the theme to **dark mode**.  
  2. Close the browser tab entirely.  
  3. Open `http://localhost:5173` in a new tab.  
  **Expected Result:** Dark mode is immediately applied. No light-mode flash on load.

---

- [ ] **TC-42.2-005 â€” Theme applies to public pages (login, register)**  
  **Steps:**  
  1. Log out to reach the login page.  
  2. Check the applied theme on `/login` and `/register`.  
  **Expected Result:** The previously saved theme (dark or light) is applied to auth pages as well. Forms and backgrounds match the selected theme.

---

- [ ] **TC-42.2-006 â€” Theme toggle visible in the UI**  
  **Steps:**  
  1. Log in and view the dashboard.  
  **Expected Result:** A clearly identifiable theme toggle button (sun/moon icon or similar) is present in the sidebar (desktop) or equivalent location. Clicking it switches the theme.

---

## 42.3 â€” Toast Notification Testing

**Requirements:** 18.3, 18.4, 18.5  
**Goal:** Verify toast notifications appear in the correct position, auto-dismiss after 5 seconds, support all four types, and can be manually closed.

---

- [ ] **TC-42.3-001 â€” Success toast appears in top-right on desktop**  
  **Viewport:** 1280px (desktop)  
  **Steps:**  
  1. Log in with valid credentials.  
  2. Observe the toast notification triggered after login success (if any), or trigger one by completing a successful action (e.g., approving an Organizer as SuperAdmin).  
  **Expected Result:** A **green success toast** appears in the **top-right corner** of the screen.

---

- [ ] **TC-42.3-002 â€” Error toast appears in top-right on desktop**  
  **Viewport:** 1280px (desktop)  
  **Steps:**  
  1. Navigate to `/login`.  
  2. Enter incorrect credentials and submit.  
  **Expected Result:** A **red error toast** appears in the **top-right corner** with a message like "Invalid email or password".

---

- [ ] **TC-42.3-003 â€” Toast auto-dismisses after 5 seconds**  
  **Steps:**  
  1. Trigger any toast (e.g., submit invalid login credentials).  
  2. Do not click anything. Wait and observe.  
  **Expected Result:** The toast disappears automatically after approximately **5 seconds** without any user interaction.

---

- [ ] **TC-42.3-004 â€” Toast can be manually dismissed**  
  **Steps:**  
  1. Trigger any toast notification.  
  2. While the toast is visible, click the **close (Ã—) button** on the toast.  
  **Expected Result:** The toast disappears immediately upon clicking close, before the 5-second auto-dismiss.

---

- [ ] **TC-42.3-005 â€” Multiple toasts stack vertically**  
  **Steps:**  
  1. Trigger two or more toast notifications in quick succession (e.g., submit an invalid form twice rapidly).  
  **Expected Result:** Each toast appears stacked vertically with approximately **8px spacing** between them. Earlier toasts are not pushed off screen.

---

- [ ] **TC-42.3-006 â€” Toast appears in bottom-center on mobile**  
  **Viewport:** 375px (mobile)  
  **Steps:**  
  1. Using DevTools at 375px width, navigate to `/login`.  
  2. Submit with invalid credentials to trigger an error toast.  
  **Expected Result:** The error toast appears at the **bottom-center** of the screen (not top-right), avoiding overlap with any bottom navigation bar.

---

- [ ] **TC-42.3-007 â€” Warning toast type renders correctly**  
  **Steps:**  
  1. Trigger a warning-type toast. This may occur when the OTP resend limit is approaching (e.g., resending OTP twice on `/verify-otp`).  
  **Expected Result:** A **yellow/amber warning toast** appears in the correct position for the current viewport.

---

- [ ] **TC-42.3-008 â€” No window.alert usage anywhere**  
  **Steps:**  
  1. Run through all major user flows (register, login, OTP verify, approve, reject, forgot password).  
  2. Watch the browser's native dialogs â€” none should appear.  
  **Expected Result:** Zero native `alert()` dialogs appear at any point. All feedback uses the toast system.

---

## 42.4 â€” Loading and Error States

**Requirements:** 19.1, 19.2, 19.3, 19.4, 19.5, 19.6  
**Goal:** Verify loading spinners appear during async requests, form buttons are disabled while submitting, and error/success feedback uses the toast system.

---

- [ ] **TC-42.4-001 â€” Loading spinner on form submission**  
  **Steps:**  
  1. Navigate to `/login`.  
  2. Enter valid credentials and click **Login**.  
  3. Observe the button and page immediately after clicking.  
  **Expected Result:** The submit button shows a **loading spinner** or disabled state while the API request is in-flight. The page does not freeze or show a blank white screen.

---

- [ ] **TC-42.4-002 â€” Form submit button disabled during loading**  
  **Steps:**  
  1. On the `/login` page, enter valid credentials and click **Login**.  
  2. While the request is in-flight, attempt to click the submit button again.  
  **Expected Result:** The submit button is **disabled** (cannot be clicked multiple times). This prevents duplicate API requests.

---

- [ ] **TC-42.4-003 â€” Loading spinner on registration form**  
  **Steps:**  
  1. Navigate to `/register`.  
  2. Fill in valid registration data for an Organizer and submit.  
  **Expected Result:** The submit button shows a loading indicator immediately after click. The button remains disabled until the response is received.

---

- [ ] **TC-42.4-004 â€” Error state: Invalid login shows toast, not alert**  
  **Steps:**  
  1. Navigate to `/login`.  
  2. Enter `wrong@email.com` / `wrongpassword` and submit.  
  **Expected Result:** An **error toast** appears with the message "Invalid email or password". No native browser alert dialog.

---

- [ ] **TC-42.4-005 â€” Success state: OTP verification shows success toast**  
  **Steps:**  
  1. Register as an Exhibitor and navigate to `/verify-otp`.  
  2. Enter the correct 6-digit OTP from your email.  
  3. Submit the form.  
  **Expected Result:** A **success toast** appears ("Email verified successfully" or similar). The user is redirected to `/login`.

---

- [ ] **TC-42.4-006 â€” Loading skeleton on dashboard initial load**  
  **Steps:**  
  1. Log out completely.  
  2. Log back in and observe the dashboard immediately after redirect.  
  **Expected Result:** While initial dashboard data is loading, a **skeleton loader** (placeholder shape matching expected content) is briefly visible. It transitions to real content once loaded.

---

- [ ] **TC-42.4-007 â€” Network error triggers error toast**  
  **Steps:**  
  1. Stop the backend server (`Ctrl+C` in the backend terminal).  
  2. On the frontend, attempt to log in.  
  **Expected Result:** An **error toast** appears indicating a connection or network error. No unhandled JavaScript error in the console.

---

## 42.5 â€” Authentication Flows

**Requirements:** Exit criteria (all four roles, Organizer approval, OTP verification, forgot password)  
**Goal:** Verify the complete end-to-end authentication flows for each role.

---

### SuperAdmin Login

- [ ] **TC-42.5-001 â€” SuperAdmin can log in**  
  **Steps:**  
  1. Navigate to `http://localhost:5173/login`.  
  2. Enter the SuperAdmin email and password from `backend/.env`.  
  3. Click **Login**.  
  **Expected Result:** SuperAdmin is redirected to `/dashboard/superadmin`. The SuperAdmin dashboard is displayed with a link/button to "Admin Approvals".

---

### Organizer Registration and Approval Flow

- [ ] **TC-42.5-002 â€” Organizer registers and sees pending message**  
  **Steps:**  
  1. Navigate to `/register`.  
  2. Fill in email, password (`TestPass123`), full name, and select role **Organizer**.  
  3. Click **Register**.  
  **Expected Result:** A toast appears: "Registration successful. Your account is awaiting approval." The user is NOT redirected to a dashboard requiring full access.

---

- [ ] **TC-42.5-003 â€” Organizer login before approval shows pending screen**  
  **Steps:**  
  1. Navigate to `/login`.  
  2. Log in with the Organizer credentials just registered.  
  **Expected Result:** The user is redirected to `/dashboard/pending-approval`. A screen is shown explaining that the account is awaiting SuperAdmin approval. **No other navigation links are visible** to the Organizer at this point.

---

- [ ] **TC-42.5-004 â€” SuperAdmin approves Organizer**  
  **Steps:**  
  1. Log in as SuperAdmin.  
  2. Navigate to `/admin/approvals`.  
  3. Locate the pending Organizer by email.  
  4. Click **Approve**.  
  **Expected Result:** A success toast appears ("Organizer approved successfully"). The Organizer is removed from the pending list.

---

- [ ] **TC-42.5-005 â€” Organizer can log in after approval**  
  **Steps:**  
  1. Log out as SuperAdmin.  
  2. Log in as the newly approved Organizer.  
  **Expected Result:** The Organizer is redirected to `/dashboard/organizer` (the full dashboard). The pending approval screen is NOT shown.

---

- [ ] **TC-42.5-006 â€” SuperAdmin rejects an Organizer**  
  **Steps:**  
  1. Register a second Organizer account (use a different email).  
  2. Log in as SuperAdmin, navigate to `/admin/approvals`.  
  3. Click **Reject** for the new Organizer.  
  4. Confirm the rejection when prompted (if a confirmation dialog appears).  
  **Expected Result:** A success toast appears. The Organizer is removed from the pending list. The account is not deleted - it is soft-rejected (status: rejected). If the rejected Organizer is on /dashboard/pending-approval, they are automatically redirected to /dashboard/rejected within 30 s (next poll). Logging in fresh as the rejected Organizer succeeds and lands on the RejectedScreen. SuperAdmin can still query this account via GET /api/admin/organizers?status=rejected.

---

- [ ] **TC-42.5-007 â€” Pending approval screen polls and reacts to both status transitions (approved and rejected)**  
  **Steps:**  
  1. Log in as a pending Organizer (who has not yet been approved).  
  2. Open the browser Network tab (DevTools â†’ Network).  
  3. Wait on the `/dashboard/pending-approval` page for 30â€“60 seconds.  
  **Expected Result:** Every ~30 seconds, a network request is made to check the user's status (e.g., `GET /api/users/me` or equivalent). Every ~30 seconds a GET /api/auth/me request fires. When status becomes active the user is redirected to /dashboard/organizer. When status becomes rejected the user is redirected to /dashboard/rejected. Neither transition requires a manual page reload - it happens automatically within the next poll cycle (<=30 s after the SuperAdmin action).

---

### Exhibitor Registration and OTP Verification

- [ ] **TC-42.5-008 â€” Exhibitor registers and receives OTP email**  
  **Steps:**  
  1. Navigate to `/register`.  
  2. Fill in details with role **Exhibitor**. Use a real email address you can access.  
  3. Click **Register**.  
  **Expected Result:** A toast appears indicating an OTP was sent. The user is redirected to `/verify-otp`. Check your inbox â€” a 6-digit OTP email arrives within a minute.

---

- [ ] **TC-42.5-009 â€” Exhibitor verifies OTP and can log in**  
  **Steps:**  
  1. On `/verify-otp`, enter the 6-digit OTP from the email.  
  2. Click **Verify**.  
  3. On success, navigate to `/login` and log in as the Exhibitor.  
  **Expected Result:** OTP verification shows a success toast. Login succeeds and the user lands on `/dashboard/exhibitor`.

---

- [ ] **TC-42.5-010 â€” Exhibitor OTP invalid code returns error**  
  **Steps:**  
  1. Register a new Exhibitor account (different email).  
  2. On `/verify-otp`, enter `000000` (a wrong OTP).  
  3. Click **Verify**.  
  **Expected Result:** An error toast appears: "Invalid OTP". The account remains unverified.

---

- [ ] **TC-42.5-011 â€” Exhibitor cannot log in before OTP verification**  
  **Steps:**  
  1. Register an Exhibitor account but do NOT verify the OTP.  
  2. Navigate to `/login` and log in with those credentials.  
  **Expected Result:** Login fails with an error message "Please verify your email" (or equivalent 403 response). The user is NOT granted a dashboard.

---

- [ ] **TC-42.5-012 â€” OTP resend works up to 3 times**  
  **Steps:**  
  1. Register an Exhibitor. On `/verify-otp`, click **Resend OTP** three times.  
  2. Attempt to click **Resend OTP** a fourth time.  
  **Expected Result:** Resend works for attempts 1, 2, and 3. On the 4th attempt, an error toast appears: "Maximum OTP resend attempts exceeded". The resend button is disabled.

---

- [ ] **TC-42.5-013 â€” OTP expires after 5 minutes**  
  **Steps:**  
  1. Register an Exhibitor. Note the time of registration.  
  2. Wait more than 5 minutes without verifying.  
  3. Enter the original OTP on `/verify-otp`.  
  **Expected Result:** An error toast appears: "OTP has expired". The expired OTP is not accepted.

---

### Attendee Registration and OTP Verification

- [ ] **TC-42.5-014 â€” Attendee registers, verifies OTP, and can log in**  
  **Steps:**  
  1. Repeat TC-42.5-008 through TC-42.5-009 with role **Attendee** and a different email.  
  **Expected Result:** The flow is identical to the Exhibitor flow. After OTP verification, the Attendee logs in and lands on `/dashboard/attendee`.

---

### Forgot Password Flow (3 Steps)

- [ ] **TC-42.5-015 â€” Step 1: Request password reset OTP**  
  **Steps:**  
  1. Navigate to `/login`, click **Forgot Password?**.  
  2. On `/forgot-password`, enter the email of an existing account (e.g., the Exhibitor).  
  3. Click **Send OTP**.  
  **Expected Result:** A message appears: "If an account exists with this email, a password reset OTP has been sent." The user is redirected to `/forgot-password/verify-otp`. A 6-digit OTP arrives in the email inbox.

---

- [ ] **TC-42.5-016 â€” Step 1: Non-existent email returns success (no enumeration)**  
  **Steps:**  
  1. On `/forgot-password`, enter an email that does NOT exist in the system.  
  2. Click **Send OTP**.  
  **Expected Result:** The same success message is shown as for a valid email. No error message reveals whether the account exists.

---

- [ ] **TC-42.5-017 â€” Step 2: Verify reset OTP**  
  **Steps:**  
  1. On `/forgot-password/verify-otp`, enter the 6-digit OTP received in the reset email.  
  2. Click **Verify**.  
  **Expected Result:** OTP is accepted. The user is redirected to `/forgot-password/reset`.

---

- [ ] **TC-42.5-018 â€” Step 3: Reset password and log in with new password**  
  **Steps:**  
  1. On `/forgot-password/reset`, enter a new password (e.g., `NewPass456`) and confirm it.  
  2. Click **Reset Password**.  
  3. Navigate to `/login` and log in with the **new** password.  
  **Expected Result:** Password resets successfully (success toast). Login with the new password succeeds. Login with the **old** password fails.

---

- [ ] **TC-42.5-019 â€” Reset token expires after 10 minutes**  
  **Steps:**  
  1. Complete Step 1 and Step 2 of the forgot password flow.  
  2. Wait more than 10 minutes before entering a new password on Step 3.  
  3. Submit the expired reset token.  
  **Expected Result:** An error toast appears: "Invalid or expired reset token".

---

- [ ] **TC-42.5-020 â€” All refresh tokens invalidated after password reset**  
  **Steps:**  
  1. Log in as the Exhibitor on two different browser tabs (simulate two sessions).  
  2. Complete the forgot password reset flow for that Exhibitor account in one tab.  
  3. In the second tab, attempt an action that requires authentication.  
  **Expected Result:** The second tab's session is invalidated. The user is redirected to `/login`.

---

### Token Refresh (Session Continuity)

- [ ] **TC-42.5-021 â€” Access token refreshes automatically before expiry**  
  **Steps:**  
  1. Log in as any active user.  
  2. Open DevTools â†’ Network tab, filter by `XHR/Fetch`.  
  3. Wait approximately 14 minutes without logging out.  
  4. Observe the network requests.  
  **Expected Result:** A `POST /api/auth/refresh` request is made automatically around the 14-minute mark. The user remains logged in without any interruption or redirect to `/login`.

---

- [ ] **TC-42.5-022 â€” Expired/invalid refresh token redirects to login**  
  **Steps:**  
  1. Log in as any user.  
  2. In the backend database (or via MongoDB Atlas), manually invalidate or delete the refresh token for this user.  
  3. Wait for the next automatic refresh attempt (or trigger it by waiting 14+ minutes).  
  **Expected Result:** The frontend detects the refresh failure and redirects the user to `/login`. An error toast may appear.

---

### Email Already Registered

- [ ] **TC-42.5-023 â€” Duplicate email returns 409 error**  
  **Steps:**  
  1. Navigate to `/register`.  
  2. Attempt to register with an email address that is already in the system.  
  **Expected Result:** An error toast appears: "Email already registered". No duplicate account is created.

---

### SuperAdmin Role Cannot Be Registered

- [ ] **TC-42.5-024 â€” Registration as SuperAdmin is blocked**  
  **Steps:**  
  1. Attempt a direct API call (via curl or Postman) to `POST http://localhost:5000/api/auth/register` with `"role": "superadmin"`.  
  ```json
  {
    "email": "hacker@example.com",
    "password": "HackPass1",
    "fullName": "Hacker",
    "role": "superadmin"
  }
  ```
  **Expected Result:** The API returns **403 Forbidden** with a message "SuperAdmin role cannot be registered". No SuperAdmin account is created.

---

## 42.6 â€” Route Guards and Authorization

**Requirements:** 15.5, 15.6, 16.1, 16.2, 16.3  
**Goal:** Verify that unauthenticated users and wrong-role users cannot access protected routes, both on the frontend and backend.

---

### Frontend Route Guards

- [ ] **TC-42.6-001 â€” Unauthenticated user redirected to login**  
  **Steps:**  
  1. Ensure you are NOT logged in (clear session or open an incognito window).  
  2. Navigate directly to `http://localhost:5173/dashboard/superadmin`.  
  **Expected Result:** The browser immediately redirects to `/login`. The SuperAdmin dashboard is NOT displayed.

---

- [ ] **TC-42.6-002 â€” Unauthenticated user cannot access any protected route**  
  **Steps:**  
  1. While unauthenticated, attempt to navigate to each of the following:
     - `/dashboard/organizer`
     - `/dashboard/exhibitor`
     - `/dashboard/attendee`
     - `/admin/approvals`  
  **Expected Result:** All four routes redirect to `/login`.

---

- [ ] **TC-42.6-003 â€” Exhibitor cannot access SuperAdmin routes**  
  **Steps:**  
  1. Log in as a verified Exhibitor.  
  2. Manually navigate to `http://localhost:5173/dashboard/superadmin`.  
  **Expected Result:** The Exhibitor is **redirected** to their own dashboard (`/dashboard/exhibitor`). The SuperAdmin dashboard is not rendered.

---

- [ ] **TC-42.6-004 â€” Exhibitor cannot access Organizer dashboard**  
  **Steps:**  
  1. While logged in as an Exhibitor, navigate to `http://localhost:5173/dashboard/organizer`.  
  **Expected Result:** Redirect to `/dashboard/exhibitor`.

---

- [ ] **TC-42.6-005 â€” Attendee cannot access admin approvals**  
  **Steps:**  
  1. Log in as a verified Attendee.  
  2. Navigate to `http://localhost:5173/admin/approvals`.  
  **Expected Result:** Redirect to `/dashboard/attendee`. The Admin Approvals page is not rendered.

---

- [ ] **TC-42.6-006 â€” SuperAdmin can access admin routes**  
  **Steps:**  
  1. Log in as SuperAdmin.  
  2. Navigate to `http://localhost:5173/admin/approvals`.  
  **Expected Result:** The Admin Approvals page loads successfully, showing the list of pending Organizers.

---

- [ ] **TC-42.6-007 â€” Pending Organizer sees pending approval screen**  
  **Steps:**  
  1. Register a new Organizer account (do not approve it).  
  2. Log in as this Organizer.  
  3. Observe the page rendered.  
  **Expected Result:** The Organizer is taken to `/dashboard/pending-approval`. The pending approval screen is shown. **No navigation links** to other features are accessible.

---

- [ ] **TC-42.6-008 â€” Active Organizer sees full dashboard**  
  **Steps:**  
  1. Approve the Organizer from TC-42.6-007 as SuperAdmin.  
  2. Log back in as the now-approved Organizer.  
  **Expected Result:** The Organizer is taken to `/dashboard/organizer` (full dashboard). The pending approval screen does NOT appear.

---

### Backend Route Guards

- [ ] **TC-42.6-009 â€” API returns 401 for missing token**  
  **Steps:**  
  1. Make a direct API call to a protected endpoint **without** an Authorization header:
  ```bash
  curl http://localhost:5000/api/admin/pending-organizers
  ```
  **Expected Result:** Response is `401 Unauthorized` with body `{"success":false,"message":"..."}`.

---

- [ ] **TC-42.6-010 â€” API returns 401 for invalid/expired token**  
  **Steps:**  
  1. Make an API call with a tampered or obviously expired JWT:
  ```bash
  curl -H "Authorization: Bearer invalidtoken123" http://localhost:5000/api/admin/pending-organizers
  ```
  **Expected Result:** Response is `401 Unauthorized`.

---

- [ ] **TC-42.6-011 â€” API returns 403 for wrong role**  
  **Steps:**  
  1. Log in as an Exhibitor and obtain the access token from the login response.  
  2. Use that token to call the SuperAdmin-only endpoint:
  ```bash
  curl -H "Authorization: Bearer <exhibitor_access_token>" http://localhost:5000/api/admin/pending-organizers
  ```
  **Expected Result:** Response is `403 Forbidden`.

---

- [ ] **TC-42.6-012 â€” SuperAdmin can access admin API**  
  **Steps:**  
  1. Log in as SuperAdmin, copy the `accessToken` from the login response.  
  2. Call the admin endpoint:
  ```bash
  curl -H "Authorization: Bearer <superadmin_access_token>" http://localhost:5000/api/admin/pending-organizers
  ```
  **Expected Result:** Response is `200 OK` with the list of pending Organizers.

---

## 42.7 â€” Mobile Device Testing

**Requirements:** 22.4, 22.5  
**Goal:** Verify the application is usable on a real physical mobile device (not just browser DevTools simulation).

> **Note:** These tests should be performed on an **actual mobile device** connected to the same network as the development machine, or via a service like ngrok. DevTools simulation does not fully replicate touch behavior, keyboard interactions, and real device performance.

### Setup for Physical Device Testing

1. Find your development machine's local IP address:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address, e.g., 192.168.1.100
   ```
2. Start the frontend on your network:
   ```bash
   cd frontend
   npx vite --host
   # Note the "Network" URL, e.g., http://192.168.1.100:5173
   ```
3. On the mobile device, open the browser and navigate to that URL.

---

- [ ] **TC-42.7-001 â€” Application loads on real mobile device**  
  **Steps:**  
  1. On a real iOS or Android device, open the browser and navigate to the frontend URL.  
  **Expected Result:** The login page loads correctly. No errors. No visible unstyled content.

---

- [ ] **TC-42.7-002 â€” Form input touch targets are at least 44px**  
  **Steps:**  
  1. On the mobile device, navigate to `/login` and `/register`.  
  2. Tap each input field.  
  3. Tap each button.  
  **Expected Result:** All input fields and buttons respond to taps reliably. No input requires precise tapping on very small elements. Touch targets are visually large enough (minimum ~44Ã—44px).

---

- [ ] **TC-42.7-003 â€” Mobile keyboard does not obscure form fields**  
  **Steps:**  
  1. On the mobile device, go to `/login`.  
  2. Tap the email field. The mobile keyboard appears.  
  3. Observe whether the active field is still visible above the keyboard.  
  **Expected Result:** The focused input field scrolls into view or is not hidden behind the virtual keyboard. You can type without losing sight of what you're entering.

---

- [ ] **TC-42.7-004 â€” Bottom navigation is functional on real device**  
  **Steps:**  
  1. Log in as any active user on the mobile device.  
  2. View the dashboard. The bottom navigation bar should be visible.  
  3. Tap each icon in the bottom navigation.  
  **Expected Result:** Each bottom nav icon responds to touch and navigates to the correct section. The active tab is visually highlighted.

---

- [ ] **TC-42.7-005 â€” Bottom navigation does not overlap content**  
  **Steps:**  
  1. On the mobile dashboard, scroll to the bottom of the page content.  
  **Expected Result:** The page content is not hidden behind the fixed bottom navigation. The content has enough bottom padding to be visible above the nav bar.

---

- [ ] **TC-42.7-006 â€” OTP input is usable on mobile**  
  **Steps:**  
  1. Register as an Exhibitor using the mobile device.  
  2. Check email on the same device.  
  3. Navigate to `/verify-otp` and enter the OTP.  
  **Expected Result:** The OTP input field is easy to tap and fill. The numeric keyboard appears automatically (if the input type is `tel` or `number`). The 6-digit OTP can be entered without issues.

---

- [ ] **TC-42.7-007 â€” Toast notifications appear at bottom-center on mobile**  
  **Steps:**  
  1. On the mobile device at `/login`, submit with incorrect credentials.  
  **Expected Result:** The error toast appears at the **bottom-center** of the screen, not at the top-right. It does not overlap or obscure the bottom navigation bar.

---

- [ ] **TC-42.7-008 â€” Registration form is fully usable on mobile**  
  **Steps:**  
  1. Navigate to `/register` on the mobile device.  
  2. Fill in all fields: email, password, full name, and select a role from the dropdown.  
  3. Submit the form.  
  **Expected Result:** The role selector dropdown is tappable and shows all options. All fields can be filled without layout breaking. Form submission works as expected.

---

## Results Summary

Fill this table after completing the testing session.

| Section | Total TCs | Passed | Failed | Blocked | Notes |
|---------|-----------|--------|--------|---------|-------|
| 42.1 Responsive Layout | 8 | 8 | 0 | 0 | |
| 42.2 Theme Testing | 6 | 6 | 0 | 0 | |
| 42.3 Toast Notifications | 8 | 8 | 0 | 0 | |
| 42.4 Loading & Error States | 7 | 7 | 0 | 0 | |
| 42.5 Authentication Flows | 24 | 24 | 0 | 0 | |
| 42.6 Route Guards | 12 | 12 | 0 | 0 | |
| 42.7 Mobile Device Testing | 8 | 5 | 1 | 2 | otp input shows full keyboard, and login getting failed thats why i wasnt able to test bottom navigation|
| **TOTAL** | **73** | 70 | 1 | 2 | |

### Pass Criteria

The build is considered ready for Phase 2 when:

- All **Critical** test cases pass (marked with asterisks if applicable)
- 0 failures in sections 42.5, 42.6 (auth correctness is mandatory)
- No more than 2 minor failures in layout/theme sections
- All `window.alert` checks confirm zero native dialogs

### Known Issues / Deviations

| Issue | Section | Status | Notes |
|-------|---------|--------|-------|
| _login getting failed in mobile, prolly cz of backend_ | | | |

---

## Appendix â€” Quick API Reference

Use these with `curl` or Postman for backend-level testing in sections 42.5 and 42.6.

```bash
# Register
POST http://localhost:5000/api/auth/register
Body: { "email", "password", "fullName", "role" }

# Login
POST http://localhost:5000/api/auth/login
Body: { "email", "password" }

# Verify OTP
POST http://localhost:5000/api/auth/verify-otp
Body: { "email", "otp", "purpose": "registration" }

# Resend OTP
POST http://localhost:5000/api/auth/resend-otp
Body: { "email", "purpose": "registration" }

# Refresh Token
POST http://localhost:5000/api/auth/refresh
Header: Authorization: Bearer <refreshToken>

# Logout
POST http://localhost:5000/api/auth/logout
Header: Authorization: Bearer <accessToken>
Body: { "refreshToken" }

# Forgot Password â€” Step 1
POST http://localhost:5000/api/auth/forgot-password/request
Body: { "email" }

# Forgot Password â€” Step 2
POST http://localhost:5000/api/auth/forgot-password/verify-otp
Body: { "email", "otp" }

# Forgot Password â€” Step 3
POST http://localhost:5000/api/auth/forgot-password/reset
Body: { "resetToken", "newPassword" }

# Get Pending Organizers (SuperAdmin only)
GET http://localhost:5000/api/admin/pending-organizers
Header: Authorization: Bearer <superadminAccessToken>

# Approve Organizer (SuperAdmin only)
PATCH http://localhost:5000/api/admin/organizers/:id/approve
Header: Authorization: Bearer <superadminAccessToken>

# Reject Organizer (SuperAdmin only)
DELETE http://localhost:5000/api/admin/organizers/:id/reject
Header: Authorization: Bearer <superadminAccessToken>
```

---

*Document created for EventSphere Phase 0 & Phase 1 (Auth Foundation). Update the Results Summary table after each testing session.*


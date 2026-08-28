# EventSphere — Project Specification

## 1. Product Overview & Goals

EventSphere is a multi-role Event & Expo Management SaaS. Organizers run expos, exhibitors apply for booths, attendees register and check in via QR. Goal: a clean, demo-able, sellable product built on free-tier infrastructure by a solo developer — not a bare student CRUD submission.

**Non-goals for now:** payments, multi-language, native mobile app, white-labeling.

---

## 2. Roles & Permissions Matrix

| Capability | SuperAdmin | Organizer | Exhibitor | Attendee |
|---|---|---|---|---|
| Seeded, single instance | Yes | No | No | No |
| Requires approval to act | — | Yes (by SuperAdmin) | No (OTP only) | No (OTP only) |
| Approve Organizers | Yes | No | No | No |
| Create/manage Expos | View stats only | Yes (own expos) | No | No |
| Apply to Expo | No | No | Yes | No |
| Approve Exhibitor applications | No | Yes (own expos) | No | No |
| Assign booths | No | Yes | No | No |
| Build schedule | No | Yes | No | No |
| Register for expo / get QR ticket | No | No | No | Yes |
| Scan check-in QR | No | Yes (staff device) | No | No |
| Bookmark sessions | No | No | No | Yes |

---

## 3. Feature List

### P0a — Foundation (build and stabilize first)
- Auth: Register/Login for all 4 roles, JWT access + refresh
- Password hashing, forgot password (3-step OTP)
- SuperAdmin seed script + documented reseed procedure
- Organizer registration → Pending Approval screen
- SuperAdmin: Admin Approvals page (approve/reject Organizers)
- Email OTP for Exhibitor + Attendee registration
- Role-based route guards (frontend + backend middleware)
- Dark/Light mode, toast system, mobile shell + bottom nav

**Exit criteria for P0a:** a SuperAdmin can approve an Organizer, and all 4 roles can log in and land on the correct role-gated dashboard shell. Nothing expo-specific needs to work yet.

### P0b — Core Expo Operations (build after P0a is stable and tested)
- Expo CRUD (Organizer)
- Exhibitor multi-step application form + status page
- Exhibitor application review/approve/reject + booth assignment (Organizer)
- Attendee registration → instant QR ticket (PNG/PDF)
- Schedule Builder (Organizer) + Schedule Browse/Bookmark (Attendee)
- QR Check-in Scanner (mobile-first, solid dark UI, no glass)
- Exhibitor search/filter
- Organizer Dashboard (Active Expos, registrations, check-ins, booth fill)

**Exit criteria for P0b:** one full expo lifecycle works end-to-end — Organizer creates expo, Exhibitor applies and gets a booth, Attendee registers and checks in via scanned QR.

### P1 (after P0 is demo-stable)
- Email notifications (status changes, reminders)
- PDF export improvements
- Lead capture for exhibitors
- Analytics beyond basic counts
- Feedback/survey system

### P2 (future/premium — do not start until P1 is done)
- Smart booth recommendation
- Live heatmap
- Auto-schedule optimizer
- Virtual expo hall

---

## 4. Auth, Approval & OTP Flows

**Organizer approval flow:**
Register → account created with `status: pending` → Pending Approval screen (polling or manual re-login) → SuperAdmin approves/rejects in Admin Approvals → on approval, `status: active`, Organizer notified (email in P1, in-app for P0) → full dashboard access.

**Exhibitor/Attendee OTP flow (anti-bot, not identity verification):**
Register with email → 6-digit OTP sent → 5-minute expiry, max 3 resend attempts → verify → account active immediately, no admin approval needed.

**Forgot password (3-step):**
1. Enter email → OTP sent
2. Enter OTP → short-lived reset token issued
3. Enter new password with reset token → password updated, all refresh tokens invalidated

**JWT strategy — DECIDED: body + memory, not httpOnly cookie.**
Access token: short-lived (15 min), returned in response body, held in memory on frontend (not localStorage).
Refresh token: returned in response body on login/refresh, held in memory, sent via `Authorization` header on refresh calls — not an httpOnly cookie.
Reason: frontend (Vercel) and backend (Render) are on different domains. A cross-domain httpOnly cookie requires `SameSite=None; Secure`, which Safari ITP and some hardened Chrome configs silently drop — this fails intermittently in production with no clear client-side error and is expensive to debug. Body+memory sidesteps the cross-domain cookie problem entirely.
Trade-off accepted: marginally weaker XSS resistance than httpOnly cookies. Mitigate with a strict CSP and by never loading untrusted third-party scripts.
On refresh-token compromise/rotation: implement rotation (new refresh token issued on every refresh call, old one invalidated server-side) so a leaked token has a short window of use.

**Email OTP provider — DECIDED: Resend.**
Reason: simpler API than Brevo, more consistent deliverability into Gmail/Outlook inboxes for transactional mail. Free tier cap is 100 emails/day — sufficient for solo-dev development and demoing; not sufficient for any real launch traffic. Do not use raw Gmail SMTP — app-password auth gets rate-limited and flagged unpredictably.
Revisit only if P1 adds bulk notification email, where Brevo's higher daily cap (300/day) may matter more than deliverability polish.

**SuperAdmin seed & recovery procedure:**
- Seed script (`scripts/seedSuperAdmin.js` or equivalent) must be **idempotent**: check if a SuperAdmin already exists before creating one, so re-running it is always safe.
- Credentials sourced from environment variables (`SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`), never hardcoded — so recovery doesn't depend on remembering a value that only existed in a deleted `.env`.
- Script must be runnable independent of the rest of the app (`node scripts/seedSuperAdmin.js`), so a folder-rename or environment loss (as previously happened on DinePine) only costs one command, not a rebuild.
- Document the exact run command and required env vars in `PROGRESS.md` the first time the script is created — not as an afterthought.
- If the SuperAdmin account is compromised or its password lost: re-run the seed script with a new `SUPERADMIN_PASSWORD` env value; script should update the existing SuperAdmin's password hash rather than fail or duplicate.

---

## 5. Page Map

**Public:** Login, Register, Forgot Password, Landing, Expo Listing, Expo Detail
**Shared (auth'd):** Profile, Settings
**SuperAdmin:** Dashboard, Admin Approvals
**Organizer:** Dashboard, Expo CRUD, Exhibitor Applications, Booth Allocation, Schedule Builder, Check-in Scanner
**Exhibitor:** Application Form, Status Page, Profile & Booth
**Attendee:** Expo Listing/Detail, QR Ticket, Schedule + Bookmarks, Exhibitor Search

---

## 6. Technical Decisions & Stack

- Frontend: React (Vite) + Tailwind CSS + React Router
- Backend: Node.js + Express
- Database: MongoDB Atlas (free tier)
- Auth: JWT — refresh token transport decided per Section 4
- File uploads: Cloudinary (free tier)
- Email/OTP: provider decided per Section 4
- QR generation: `qrcode` (server-side)
- QR scanning: `html5-qrcode` (requires HTTPS + camera permission — test on actual mobile device, not just desktop devtools)
- Pagination on all list endpoints
- Loading/error states on every async view
- All secrets in environment variables
- No `window.alert` — toast system only

---

## 7. Design System

- Base: solid dark `bg-slate-950`
- Content cards: `bg-slate-900/80 border border-slate-800 rounded-xl`
- Glass only on sidebar + sticky header: `bg-slate-900/40 backdrop-blur-md`
- Scanner screen: solid dark background, high contrast, **no** glassmorphism
- Accents: Emerald / Indigo for status badges only
- Dark & Light mode both supported

---

## 8. App Flows (main journeys)

1. **Organizer onboarding:** Register → Pending → SuperAdmin approves → Dashboard → Create Expo
2. **Exhibitor journey:** Register + OTP → Apply to Expo → Await review → Approved + booth assigned → Manage profile
3. **Attendee journey:** Register + OTP → Browse Expos → Register for Expo → Get QR ticket → Browse/bookmark schedule → Get scanned at entry
4. **Check-in:** Organizer staff opens Scanner → scans Attendee QR → system validates + marks checked-in → real-time count updates on Organizer Dashboard

---

## 9. Phased Implementation Plan

**Phase 0 — Setup:** repo structure, env config, MongoDB Atlas connection, base Express app, base Vite app, design tokens.

**Phase 1 (= P0a):** Auth for all roles, SuperAdmin seed + approval flow, OTP flow, role-gated shells, dark/light mode, toast system. Do not touch expo features until this phase's exit criteria (Section 3) are met and tested.

**Phase 2 (= P0b):** Expo CRUD → Exhibitor application/approval/booth → Attendee registration/QR → Schedule → Scanner, in that order, each tested before starting the next.

**Phase 3 (P1):** notifications, PDF polish, lead capture, analytics, feedback.

**Phase 4 (P2):** only after Phase 3 ships and is stable.

---

## 10. PROGRESS.md Requirement

Maintain `PROGRESS.md` at project root. Update it after every completed unit of work with: what was built, what's broken/incomplete, the OTP provider and refresh-token strategy chosen (Section 4), and any deviation from this spec. This file is the recovery point if a session or environment is lost — treat it as mandatory, not optional.

---



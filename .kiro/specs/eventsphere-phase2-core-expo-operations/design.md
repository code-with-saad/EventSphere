# Design Document — EventSphere Phase 2: Core Expo Operations

## Overview

Phase 2 delivers the full business core of EventSphere on top of the Phase 1 Auth Foundation. It introduces five new MongoDB collections (Expo, Application, Ticket, Session, Bookmark), seven backend route modules, seven service classes, and approximately 35 new frontend pages/components. All code follows the exact patterns established in Phase 1: MongoDB native driver models, `asyncHandler`-wrapped route handlers, `authenticate`/`authorize` middleware, the standard `{ success, message, code }` error envelope, and the EventSphere Design Token System for all UI.

### What Phase 2 Adds

| Domain | Backend | Frontend |
|---|---|---|
| Expo management | Expo model + CRUD routes + lifecycle state machine | ExpoListingPage, ExpoDetailPage, MyExposPage, CreateExpoPage, EditExpoPage |
| Exhibitor applications | Application model + review routes + booth assignment | ApplicationFormPage, MyApplicationsPage, ApplicationsPage (organizer) |
| Attendee registration + QR tickets | Ticket model + qrcode/pdf-lib integration | MyTicketsPage, TicketDetailPage, QRTicketDisplay |
| Schedule builder | Session + Bookmark models | ScheduleBuilderPage, ScheduleBrowsePage |
| QR check-in scanner | Check-in endpoint + debounce logic | ScannerPage (mobile-first, html5-qrcode) |
| Dashboard stats | StatsService aggregate queries | OrganizerDashboard enhancements, SuperAdminDashboard enhancements |
| File uploads | UploadService + Cloudinary | uploadService (frontend), image upload in Expo/Application forms |

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        React 19 Frontend                             │
│  Public Routes    Organizer Routes    Exhibitor Routes  Attendee     │
│  /expos           /organizer/*        /exhibitor/*      /attendee/*  │
│         └── AuthContext ──── ThemeContext ──── ProtectedRoute ───┘   │
│              axios services ──► API base URL                         │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ HTTP / JSON
┌─────────────────────────────▼────────────────────────────────────────┐
│                     Express 5 Backend                                │
│  authenticate │ authorize │ asyncHandler │ errorHandler              │
│                                                                      │
│  /api/expos        /api/upload     /api/dashboard                    │
│  /api/expos/:id/applications      /api/tickets/*                     │
│  /api/expos/:id/sessions          /api/expos/:id/sessions/bookmarks  │
│                                                                      │
│  ExpoService │ ApplicationService │ TicketService │ SessionService   │
│  BookmarkService │ UploadService │ StatsService                      │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ MongoDB native driver
┌─────────────────────────────▼────────────────────────────────────────┐
│                      MongoDB                                         │
│  users │ expos │ applications │ tickets │ sessions │ bookmarks       │
│  otps  │ refreshtokens                                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                     Cloudinary (image CDN)
```

### New Dependencies

**Backend additions:**
```json
{
  "dependencies": {
    "qrcode": "^1.5.4",
    "pdf-lib": "^1.17.1",
    "cloudinary": "^2.7.0",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5",
    "@types/uuid": "^10.0.0",
    "fast-check": "^4.1.0"
  }
}
```

**Frontend additions:**
```json
{
  "dependencies": {
    "html5-qrcode": "^2.3.8"
  },
  "devDependencies": {
    "fast-check": "^4.1.0",
    "@fast-check/vitest": "^0.2.0"
  }
}
```

---

## Architecture

### Expo Lifecycle State Machine

Valid transitions are strictly enforced server-side. No reverse transitions are permitted (REQ-2, REQ-12).

```
          ┌─────────────┐
          │    draft     │ ──── delete (if no tickets/applications) ──►  [removed]
          └──────┬───────┘
                 │ publish (validates required fields)
                 ▼
          ┌─────────────┐
          │  published   │
          └──────┬───────┘
                 │ start (manual or scheduled)
                 ▼
          ┌─────────────┐
          │   ongoing    │
          └──────┬───────┘
                 │ complete
                 ▼
          ┌─────────────┐
          │  completed   │
          └──────┬───────┘
                 │ archive (cascade gate applies)
                 ▼
          ┌─────────────┐
          │   archived   │
          └─────────────┘

  Cascade gate (REQ-2.16): archive/delete of published/ongoing/completed
  requires pre-flight count check → frontend shows CascadeConfirmDialog
  → user confirms → server executes cascade (REQ-12.20)
```

### Ticket Lifecycle

```
[registration] → active → checked_in
                       ↘
                        cancelled  (attendee-initiated, only from active)
```

### Application Lifecycle

```
[submission] → pending → approved (+ boothLabel required)
                     ↘
                      rejected (+ optional rejectionReason)

  pending → [withdrawn] (exhibitor deletes record; may reapply)
  approved → pending (organizer revokes; clears boothLabel)
```

---

## Data Models

All models follow the pattern in `User.model.ts`:
- MongoDB native `Collection<T>`, no Mongoose
- Singleton export: `export default new XModel()`
- `createIndexes()` called at application startup in `server.ts`
- Constructor accepts optional `Db` for test injection
- `IXCreate` interface omits `_id`, `createdAt`, `updatedAt` (auto-generated)

### Expo Collection (`expos`)

```typescript
import { ObjectId } from 'mongodb';

export type ExpoStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

export interface IExpo {
  _id: ObjectId;
  organizerId: ObjectId;           // ref: users._id
  name: string;                    // 1–120 chars
  description: string;             // 1–2000 chars
  status: ExpoStatus;
  startDate: Date;
  endDate: Date;
  venueName: string;
  venueAddress: string;
  totalBooths: number;             // integer ≥ 1
  bannerUrl?: string;              // Cloudinary URL (PNG/JPG/WebP, ≤5 MB)
  websiteUrl?: string;
  category?: string;               // e.g. Technology, Health, Art
  tags?: string[];                 // up to 10 tags, each 1–30 chars
  venueMapUrl?: string;            // optional link shown to approved exhibitors
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpoCreate {
  organizerId: ObjectId;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  venueName: string;
  venueAddress: string;
  totalBooths: number;
  bannerUrl?: string;
  websiteUrl?: string;
  category?: string;
  tags?: string[];
  venueMapUrl?: string;
}
```

**MongoDB Indexes:**
```typescript
// Primary ownership query — organizer's own expo list (REQ-2.7)
{ organizerId: 1, status: 1 }

// Public listing query — status filter + sort by startDate (REQ-1.2, REQ-1.5)
{ status: 1, startDate: 1 }

// Text search across name and description (REQ-1.6)
{ name: 'text', description: 'text' }

// Performance index on _id (MongoDB default)
```

### Application Collection (`applications`)

```typescript
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface IApplication {
  _id: ObjectId;
  expoId: ObjectId;                // ref: expos._id
  exhibitorId: ObjectId;           // ref: users._id
  status: ApplicationStatus;
  companyName: string;             // 1–120 chars
  companyDescription: string;      // 1–500 chars
  category: string;                // selected from predefined list
  phoneNumber: string;             // at least one contact number
  websiteUrl?: string;
  logoUrl?: string;                // Cloudinary URL (PNG/JPG/WebP, ≤2 MB)
  organizerNote?: string;          // max 500 chars
  boothLabel?: string;             // 1–20 chars, set on approval
  rejectionReason?: string;        // max 300 chars, set on rejection
  submittedAt: Date;
  updatedAt: Date;
}

export interface IApplicationCreate {
  expoId: ObjectId;
  exhibitorId: ObjectId;
  companyName: string;
  companyDescription: string;
  category: string;
  phoneNumber: string;
  websiteUrl?: string;
  logoUrl?: string;
  organizerNote?: string;
}
```

**MongoDB Indexes:**
```typescript
// Organizer reviews all applications for an expo (REQ-4.1)
{ expoId: 1, status: 1 }

// Exhibitor checks their own application for a specific expo (REQ-3.6)
{ expoId: 1, exhibitorId: 1 }

// Exhibitor's full application history (REQ-3.8)
{ exhibitorId: 1, submittedAt: -1 }

// Booth uniqueness constraint within an expo (REQ-12.21)
// Partial index: only documents with a boothLabel value
{ expoId: 1, boothLabel: 1 }, { unique: true, partialFilterExpression: { boothLabel: { $exists: true, $ne: null } } }
```

### Ticket Collection (`tickets`)

```typescript
export type TicketStatus = 'active' | 'checked_in' | 'cancelled';

export interface ITicket {
  _id: ObjectId;
  ticketId: string;                // UUID v4, globally unique (REQ-12.22)
  expoId: ObjectId;                // ref: expos._id
  attendeeId: ObjectId;            // ref: users._id
  status: TicketStatus;
  registeredAt: Date;
  checkedInAt?: Date;              // set when status → checked_in
  updatedAt: Date;
}

export interface ITicketCreate {
  ticketId: string;
  expoId: ObjectId;
  attendeeId: ObjectId;
}
```

**MongoDB Indexes:**
```typescript
// Globally unique ticket ID — prevents enumeration, enables fast check-in lookup (REQ-12.22)
{ ticketId: 1 }, { unique: true }

// Attendee's ticket list (REQ-5.7)
{ attendeeId: 1, registeredAt: -1 }

// Duplicate registration guard (REQ-5.6): attendee × expo uniqueness for active/checked_in
{ expoId: 1, attendeeId: 1 }

// Cascade cancel on expo archive/delete (REQ-12.20)
{ expoId: 1, status: 1 }

// Check-in performance (REQ-12.4)
{ ticketId: 1, expoId: 1 }
```

### Session Collection (`sessions`)

```typescript
export interface ISession {
  _id: ObjectId;
  expoId: ObjectId;                // ref: expos._id
  title: string;                   // 1–120 chars
  speakerName: string;             // 1–100 chars
  startTime: Date;
  endTime: Date;
  room: string;                    // 1–80 chars (location/room name)
  description?: string;            // max 500 chars
  track?: string;                  // e.g. Keynote, Workshop, Panel; max 30 chars
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionCreate {
  expoId: ObjectId;
  title: string;
  speakerName: string;
  startTime: Date;
  endTime: Date;
  room: string;
  description?: string;
  track?: string;
}
```

**MongoDB Indexes:**
```typescript
// Session list for an expo sorted by start time (REQ-6.1, REQ-7.1)
{ expoId: 1, startTime: 1 }

// Room conflict detection query (REQ-6.5)
{ expoId: 1, room: 1, startTime: 1, endTime: 1 }
```

### Bookmark Collection (`bookmarks`)

```typescript
export interface IBookmark {
  _id: ObjectId;
  sessionId: ObjectId;             // ref: sessions._id
  attendeeId: ObjectId;            // ref: users._id
  createdAt: Date;
}

export interface IBookmarkCreate {
  sessionId: ObjectId;
  attendeeId: ObjectId;
}
```

**MongoDB Indexes:**
```typescript
// Unique bookmark per attendee × session — prevents duplicates
{ sessionId: 1, attendeeId: 1 }, { unique: true }

// Attendee's bookmarks for a session's expo (joined via session lookup) (REQ-7.5)
{ attendeeId: 1, createdAt: 1 }

// Cascade delete bookmarks when session is deleted (REQ-6.7)
{ sessionId: 1 }
```

---

## API Design

All Phase 2 endpoints follow Phase 1 conventions:
- Success: `{ success: true, message: string, data: { ... } }`
- Error: `{ success: false, message: string, code: string }`
- All async handlers wrapped with `asyncHandler`
- Auth routes use `authenticate` then `authorize(...roles)` middleware
- REQ-12.18: All error responses use the standard format above

### Expos (`/api/expos`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/expos` | Public | Paginated list of published expos |
| `GET` | `/api/expos/:id` | Public | Expo detail with approved exhibitors list |
| `POST` | `/api/expos` | Organizer | Create expo (status = `draft`) |
| `PATCH` | `/api/expos/:id` | Organizer (owner) | Update expo fields |
| `PATCH` | `/api/expos/:id/status` | Organizer (owner) | Transition expo status |
| `GET` | `/api/expos/:id/cascade-preview` | Organizer (owner) | Pre-flight counts for cascade confirmation gate |
| `DELETE` | `/api/expos/:id` | Organizer (owner) | Delete expo (cascade gate applies) |
| `GET` | `/api/expos/:id/stats` | Organizer (owner) | Per-expo statistics |
| `GET` | `/api/organizer/expos` | Organizer | List organizer's own expos |

**`GET /api/expos` — Query Parameters:**
```typescript
interface ExpoListQuery {
  page?: number;        // default 1
  limit?: number;       // default 12, max 12 (REQ-1.8)
  status?: 'upcoming' | 'ongoing' | 'completed';  // maps to expo status values
  search?: string;      // text search on name + description (REQ-1.6)
}

// Response
interface ExpoListResponse {
  expos: ExpoCardDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ExpoCardDTO {
  _id: string;
  name: string;
  description: string;   // truncated to 160 chars server-side
  status: ExpoStatus;
  startDate: string;     // ISO 8601
  endDate: string;
  venueName: string;
  venueAddress: string;
  bannerUrl?: string;
  category?: string;
  approvedExhibitorCount: number;  // computed via application aggregation
}
```

**`POST /api/expos` — Request Body:**
```typescript
interface CreateExpoBody {
  name: string;           // 1–120 chars
  description: string;    // 1–2000 chars
  startDate: string;      // ISO 8601; must be in future (REQ-2.5)
  endDate: string;        // ISO 8601; must be after startDate (REQ-2.6)
  venueName: string;
  venueAddress: string;
  totalBooths: number;    // integer ≥ 1
  bannerUrl?: string;
  websiteUrl?: string;
  category?: string;
  tags?: string[];        // up to 10 items, each 1–30 chars
  venueMapUrl?: string;
}
```

**`PATCH /api/expos/:id/status` — Request Body:**
```typescript
interface StatusTransitionBody {
  status: ExpoStatus;
  confirmed?: boolean;   // must be true when cascade preview shows non-zero counts
}
```

**`GET /api/expos/:id/cascade-preview` — Response:**
```typescript
interface CascadePreviewResponse {
  activeTickets: number;
  pendingApplications: number;
  approvedApplications: number;
  requiresConfirmation: boolean;  // true if any count > 0
}
```

### Applications (`/api/expos/:expoId/applications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/expos/:expoId/applications` | Exhibitor | Submit application |
| `GET` | `/api/expos/:expoId/applications` | Organizer (owner) | List all applications for expo |
| `GET` | `/api/expos/:expoId/applications/mine` | Exhibitor | Get own application for this expo |
| `PATCH` | `/api/expos/:expoId/applications/:id` | Exhibitor (own, pending only) | Edit application details |
| `DELETE` | `/api/expos/:expoId/applications/:id` | Exhibitor (own, pending only) | Withdraw application |
| `PATCH` | `/api/expos/:expoId/applications/:id/review` | Organizer (owner) | Approve or reject + booth assignment |
| `GET` | `/api/exhibitor/applications` | Exhibitor | All own applications across all expos |

**`PATCH /api/expos/:expoId/applications/:id/review` — Request Body:**
```typescript
interface ReviewApplicationBody {
  action: 'approve' | 'reject' | 'revoke';
  boothLabel?: string;        // required when action = 'approve'
  rejectionReason?: string;   // optional when action = 'reject', max 300 chars
}
```

**`GET /api/expos/:expoId/applications` — Response:**
```typescript
interface ApplicationListResponse {
  pending: ApplicationDTO[];
  approved: ApplicationDTO[];
  rejected: ApplicationDTO[];
  boothFillRate: number;       // (approvedCount / expo.totalBooths) * 100
  totalBooths: number;
  assignedBooths: number;
}
```

### Tickets

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/expos/:expoId/tickets` | Attendee | Register + receive QR ticket |
| `GET` | `/api/tickets/mine` | Attendee | List all own tickets |
| `GET` | `/api/tickets/:ticketId` | Attendee (own) | Ticket detail + QR re-render |
| `PATCH` | `/api/tickets/:ticketId/cancel` | Attendee (own, active only) | Cancel ticket |
| `POST` | `/api/tickets/checkin` | Organizer | Check in by scanning QR |
| `GET` | `/api/tickets/:ticketId/pdf` | Attendee (own) | Generate and stream PDF ticket (REQ-5.4, REQ-5.5) |

**`POST /api/expos/:expoId/tickets` — Response (201):**
```typescript
interface TicketRegistrationResponse {
  ticket: {
    _id: string;
    ticketId: string;
    expoId: string;
    status: 'active';
    registeredAt: string;
  };
  qrCodeDataUrl: string;   // PNG data URL — "data:image/png;base64,..."
  expo: {
    name: string;
    startDate: string;
    endDate: string;
    venueName: string;
  };
  attendee: {
    fullName: string;
  };
}
```

**`POST /api/tickets/checkin` — Request/Response:**
```typescript
interface CheckInBody {
  ticketId: string;
  expoId: string;
}

// 200 success
interface CheckInSuccessResponse {
  result: 'checked_in';
  attendeeName: string;
  expoName: string;
  checkedInAt: string;
}

// 200 warning (already checked in — REQ-8.7)
interface CheckInWarningResponse {
  result: 'already_checked_in';
  checkedInAt: string;  // original timestamp
}

// 200 error states (REQ-8.6, 8.8, 8.9 — all return 200 with result field)
interface CheckInErrorResponse {
  result: 'invalid_ticket' | 'cancelled_ticket' | 'wrong_event';
}
```

**`GET /api/tickets/:ticketId/pdf` — Response (200):**

The server generates the PDF on demand using `pdf-lib` and streams it directly as a binary response. No PDF file is persisted.

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="ticket-{ticketId}.pdf"`
- Body: raw PDF bytes (binary stream)

The PDF content follows REQ-5.5:
```typescript
// PDF composition order (via pdf-lib):
// 1. Expo name (heading)
// 2. Attendee full name
// 3. Expo start date and end date
// 4. Venue name
// 5. QR code image (PNG bytes embedded via embedPng — same qrcode output as registration)
// 6. Ticket ID (monospace font, bottom of page)
```

`PDFDownloadButton` consumes this endpoint by fetching with `responseType: 'blob'` via axios, constructing an object URL, and triggering a programmatic `<a>` click — no browser navigation occurs.

```typescript
// PDFDownloadButton pattern:
const blob = await ticketService.downloadPDF(ticketId);  // axios responseType: 'blob'
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `ticket-${ticketId}.pdf`;
a.click();
URL.revokeObjectURL(url);
```

**Error responses** use the standard envelope (`Content-Type: application/json`):
- `TICKET_NOT_FOUND` (404) — ticket ID does not exist
- `TICKET_FORBIDDEN` (403) — ticket does not belong to the authenticated attendee

> Note: The check-in endpoint always returns HTTP 200 for scanner UX clarity. The `result` field drives the feedback UI (green / yellow / red indicator).

### Sessions (`/api/expos/:expoId/sessions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/expos/:expoId/sessions` | Authenticated (any role) | List sessions sorted by startTime |
| `POST` | `/api/expos/:expoId/sessions` | Organizer (owner) | Create session |
| `PATCH` | `/api/expos/:expoId/sessions/:id` | Organizer (owner) | Update session |
| `DELETE` | `/api/expos/:expoId/sessions/:id` | Organizer (owner) | Delete session + cascade bookmarks |

**`POST /api/expos/:expoId/sessions` — Request Body:**
```typescript
interface CreateSessionBody {
  title: string;          // 1–120 chars
  speakerName: string;    // 1–100 chars
  startTime: string;      // ISO 8601
  endTime: string;        // ISO 8601; must be after startTime (REQ-6.4)
  room: string;           // 1–80 chars
  description?: string;   // max 500 chars
  track?: string;         // max 30 chars
}
```

**Conflict detection response (REQ-6.5):**
When a room conflict is detected, the endpoint returns `HTTP 409`:
```typescript
interface RoomConflictError {
  success: false;
  message: string;
  code: 'ROOM_CONFLICT';
  conflict: {
    sessionTitle: string;
    startTime: string;
    endTime: string;
  };
}
```

### Bookmarks

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/expos/:expoId/sessions/:sessionId/bookmarks` | Attendee | Bookmark session |
| `DELETE` | `/api/expos/:expoId/sessions/:sessionId/bookmarks` | Attendee | Remove bookmark |
| `GET` | `/api/expos/:expoId/bookmarks/mine` | Attendee | List own bookmarks for this expo |

### Dashboard Stats

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/organizer` | Organizer | Aggregate dashboard stats (REQ-10.1) |
| `GET` | `/api/dashboard/organizer/:expoId` | Organizer (owner) | Per-expo stats (REQ-10.2) |
| `GET` | `/api/dashboard/superadmin` | SuperAdmin | Platform-wide stats (REQ-11.1) |

**`GET /api/dashboard/organizer` — Response:**
```typescript
interface OrganizerDashboardResponse {
  activeExpoCount: number;
  totalAttendees: number;
  totalCheckIns: number;
  aggregateBoothFillRate: number;  // average across all active expos
  recentExpos: ExpoCardDTO[];      // last 5 updated
}
```

**`GET /api/dashboard/superadmin` — Response:**
```typescript
interface SuperAdminDashboardResponse {
  totalExpos: number;
  totalAttendees: number;
  totalApplications: number;
  totalCheckIns: number;
  recentExpos: Array<{
    _id: string;
    name: string;
    organizerName: string;
    status: ExpoStatus;
    createdAt: string;
  }>;
}
```

### File Uploads

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/upload/image` | Authenticated | Upload image to Cloudinary |

**`POST /api/upload/image` — Request (multipart/form-data):**
- Field: `image` — file upload
- Field: `purpose` — `'expo_banner' | 'company_logo'` (determines size limit and folder)

**Response (200):**
```typescript
interface UploadResponse {
  url: string;       // Cloudinary secure HTTPS URL
  publicId: string;  // Cloudinary public_id for future deletion
}
```

---

## Service Layer

### ExpoService (`expo.service.ts`)

Responsibilities: CRUD operations, status transition validation, cascade logic, ownership checks, public listing with pagination and text search.

```typescript
class ExpoService {
  // Create a new expo in draft status. Sets organizerId from req.user.
  async create(data: IExpoCreate): Promise<IExpo>

  // Update expo fields. Validates ownership before writing.
  async update(expoId: string, organizerId: string, data: Partial<IExpoCreate>): Promise<IExpo>

  // Validate and execute a status transition.
  // Throws if: invalid transition, required fields missing (for publish), or
  // cascade gate not confirmed (for archive/delete of expos with tickets/applications).
  async transition(expoId: string, organizerId: string, newStatus: ExpoStatus, confirmed?: boolean): Promise<IExpo>

  // Returns counts for the cascade confirmation dialog (REQ-2.16).
  async getCascadePreview(expoId: string): Promise<CascadePreview>

  // Delete expo. Validates ownership, runs cascade if confirmed.
  async delete(expoId: string, organizerId: string, confirmed?: boolean): Promise<void>

  // Public paginated list. Applies status filter and MongoDB text search.
  async listPublic(query: ExpoListQuery): Promise<{ expos: ExpoCardDTO[]; pagination: PaginationMeta }>

  // Public detail with full exhibitor list.
  async getPublicDetail(expoId: string): Promise<ExpoDetailDTO>

  // Organizer's own expo list.
  async listByOrganizer(organizerId: string): Promise<IExpo[]>

  // Per-expo stats for organizer dashboard.
  async getExpoStats(expoId: string, organizerId: string): Promise<ExpoStatsDTO>

  // Internal: validate all required fields are present before publish.
  private validateForPublish(expo: IExpo): string[]

  // Internal: execute cascade — cancel active tickets + reject pending applications.
  private async executeCascade(expoId: string): Promise<void>
}
```

### ApplicationService (`application.service.ts`)

Responsibilities: submitting/editing/withdrawing applications, organizer review, booth assignment with uniqueness check, booth fill rate calculation.

```typescript
class ApplicationService {
  // Submit application. Validates no existing active/pending application (REQ-3.6).
  async submit(data: IApplicationCreate): Promise<IApplication>

  // Edit application details. Only allowed while status = pending.
  async edit(applicationId: string, exhibitorId: string, data: Partial<IApplicationCreate>): Promise<IApplication>

  // Withdraw application. Deletes record. Validates ownership + pending status.
  async withdraw(applicationId: string, exhibitorId: string): Promise<void>

  // Get exhibitor's own application for a specific expo.
  async getByExhibitorAndExpo(exhibitorId: string, expoId: string): Promise<IApplication | null>

  // List all applications for an expo, grouped by status.
  async listForExpo(expoId: string, organizerId: string): Promise<ApplicationListResponse>

  // Approve application + assign booth. Validates booth uniqueness (REQ-4.4).
  async approve(applicationId: string, organizerId: string, boothLabel: string): Promise<IApplication>

  // Reject application with optional reason.
  async reject(applicationId: string, organizerId: string, reason?: string): Promise<IApplication>

  // Revoke approval → resets to pending, clears boothLabel (REQ-4.9).
  async revokeApproval(applicationId: string, organizerId: string): Promise<IApplication>

  // Calculate booth fill rate for an expo (REQ-4.7).
  async getBoothFillRate(expoId: string, totalBooths: number): Promise<number>
}
```

### TicketService (`ticket.service.ts`)

Responsibilities: attendee registration, QR code generation, PDF generation, check-in processing with idempotency.

```typescript
class TicketService {
  // Register attendee. Validates expo is published/ongoing. Checks for duplicate (REQ-5.6).
  // Generates UUID v4 ticketId. Generates QR code PNG data URL.
  async register(expoId: string, attendeeId: string): Promise<TicketRegistrationResponse>

  // Re-render QR code on demand from stored ticketId (REQ-5.8).
  async getQRCode(ticketId: string): Promise<string>  // returns data URL

  // Generate PDF ticket using pdf-lib. Returns Buffer.
  async generatePDF(ticketId: string, attendeeId: string): Promise<Buffer>

  // Cancel ticket (active → cancelled). Only attendee-owned active tickets.
  async cancel(ticketId: string, attendeeId: string): Promise<ITicket>

  // Process check-in scan. Returns typed result for scanner UI.
  // Returns 'checked_in' | 'already_checked_in' | 'invalid_ticket' | 'cancelled_ticket' | 'wrong_event'
  // Idempotent: scanning a checked_in ticket returns already_checked_in with original timestamp.
  async processCheckIn(ticketId: string, expoId: string): Promise<CheckInResult>

  // Internal: generate QR PNG using qrcode library at 300×300 with quiet zone (REQ-5.12).
  private async generateQRPNG(ticketId: string): Promise<string>
}
```

### SessionService (`session.service.ts`)

Responsibilities: CRUD, end-time validation, room conflict detection, bookmark cascade on delete.

```typescript
class SessionService {
  // Create session. Validates endTime > startTime (REQ-6.4).
  // Runs room conflict check before inserting (REQ-6.5).
  async create(data: ISessionCreate, organizerId: string): Promise<ISession>

  // Update session. Re-runs conflict check excluding the current session.
  async update(sessionId: string, organizerId: string, data: Partial<ISessionCreate>): Promise<ISession>

  // Delete session + cascade delete all bookmarks (REQ-6.7).
  async delete(sessionId: string, organizerId: string): Promise<void>

  // List sessions for an expo, sorted by startTime.
  async listByExpo(expoId: string): Promise<ISession[]>

  // Internal: check for overlapping sessions in the same room within the same expo.
  // Two sessions overlap if: sessionA.startTime < sessionB.endTime && sessionA.endTime > sessionB.startTime
  private async checkRoomConflict(expoId: string, room: string, startTime: Date, endTime: Date, excludeId?: string): Promise<ISession | null>
}
```

### BookmarkService (`bookmark.service.ts`)

Responsibilities: toggle bookmark (add/remove), list attendee bookmarks for an expo.

```typescript
class BookmarkService {
  // Add bookmark. Returns existing if duplicate (idempotent via upsert).
  async add(sessionId: string, attendeeId: string): Promise<IBookmark>

  // Remove bookmark. No-ops if not found.
  async remove(sessionId: string, attendeeId: string): Promise<void>

  // List bookmarks for an attendee within an expo (joins with sessions on expoId).
  async listForAttendeeAndExpo(attendeeId: string, expoId: string): Promise<ISession[]>
}
```

### UploadService (`upload.service.ts`)

Responsibilities: MIME validation, size enforcement, Cloudinary upload.

```typescript
class UploadService {
  // Validate MIME type by buffer inspection (not just extension — REQ-12.8).
  // Enforce size limit.
  // Upload to Cloudinary with purpose-based folder and transformation.
  async uploadImage(
    buffer: Buffer,
    mimeType: string,
    sizeBytes: number,
    purpose: 'expo_banner' | 'company_logo'
  ): Promise<{ url: string; publicId: string }>

  // Limits by purpose:
  // expo_banner: max 5 MB, folder 'eventsphere/banners'
  // company_logo: max 2 MB, folder 'eventsphere/logos'
  // Accepted MIME types: image/png, image/jpeg, image/webp
}
```

### StatsService (`stats.service.ts`)

Responsibilities: MongoDB aggregation pipelines for organizer and superadmin dashboards.

```typescript
class StatsService {
  // Aggregate organizer dashboard stats (REQ-10.1):
  // - active expo count, total attendees, total check-ins, aggregate booth fill rate.
  async getOrganizerDashboard(organizerId: string): Promise<OrganizerDashboardResponse>

  // Per-expo stats (REQ-10.2):
  // - applications by status, attendee registrations, check-ins, booth fill rate.
  async getExpoStats(expoId: string, organizerId: string): Promise<ExpoStatsDTO>

  // Platform-wide stats for SuperAdmin (REQ-11.1):
  // - all-time counts + 5 most recently created expos with organizer name.
  async getSuperAdminDashboard(): Promise<SuperAdminDashboardResponse>
}
```

---

## Frontend Architecture

### New Pages and Routes

All new routes are registered in `App.tsx` following the existing pattern.

```tsx
// Public — no ProtectedRoute wrapper
<Route path="/expos" element={<ExpoListingPage />} />
<Route path="/expos/:id" element={<ExpoDetailPage />} />

// Organizer routes
<Route path="/organizer/expos" element={
  <ProtectedRoute allowedRoles={['organizer']}><MyExposPage /></ProtectedRoute>
} />
<Route path="/organizer/expos/new" element={
  <ProtectedRoute allowedRoles={['organizer']}><CreateExpoPage /></ProtectedRoute>
} />
<Route path="/organizer/expos/:id/edit" element={
  <ProtectedRoute allowedRoles={['organizer']}><EditExpoPage /></ProtectedRoute>
} />
<Route path="/organizer/expos/:id/applications" element={
  <ProtectedRoute allowedRoles={['organizer']}><ApplicationsPage /></ProtectedRoute>
} />
<Route path="/organizer/expos/:id/schedule" element={
  <ProtectedRoute allowedRoles={['organizer']}><ScheduleBuilderPage /></ProtectedRoute>
} />
<Route path="/organizer/expos/:id/booths" element={
  <ProtectedRoute allowedRoles={['organizer']}><BoothLayoutPage /></ProtectedRoute>
} />
<Route path="/organizer/scanner" element={
  <ProtectedRoute allowedRoles={['organizer']}><ScannerPage /></ProtectedRoute>
} />

// Exhibitor routes
<Route path="/exhibitor/applications" element={
  <ProtectedRoute allowedRoles={['exhibitor']}><MyApplicationsPage /></ProtectedRoute>
} />
<Route path="/expos/:id/apply" element={
  <ProtectedRoute allowedRoles={['exhibitor']}><ApplicationFormPage /></ProtectedRoute>
} />

// Attendee routes
<Route path="/attendee/tickets" element={
  <ProtectedRoute allowedRoles={['attendee']}><MyTicketsPage /></ProtectedRoute>
} />
<Route path="/attendee/tickets/:ticketId" element={
  <ProtectedRoute allowedRoles={['attendee']}><TicketDetailPage /></ProtectedRoute>
} />
<Route path="/expos/:id/schedule" element={<ScheduleBrowsePage />} />
```

> `/expos/:id/schedule` is public-accessible (read-only if not registered). It uses `useAuth()` internally to determine whether to render bookmark controls. No `ProtectedRoute` wrapper.

### Page Descriptions

**ExpoListingPage** (`/expos`): Public listing with status filter chips, text search input (debounced 300ms), paginated expo cards (max 12/page). Empty-state when no results. Unauthenticated CTA links to `/login?redirect=/expos/:id`. (REQ-1)

**ExpoDetailPage** (`/expos/:id`): Full expo info, banner image, approved exhibitor list with `ExhibitorFilterBar`, schedule preview. "Register for Expo" and "Apply to Exhibit" CTAs visible to unauthenticated users — clicking redirects to `/login?redirect=...`. (REQ-1.4, REQ-1.9)

**MyExposPage** (`/organizer/expos`): Organizer's own expo list, status badges, quick actions (edit, manage applications, manage schedule, delete). (REQ-2.7)

**CreateExpoPage / EditExpoPage**: `ExpoForm` component. Cloudinary banner upload. Date validation. Publish transition only when all required fields are present. (REQ-2)

**ApplicationsPage** (`/organizer/expos/:id/applications`): Three columns by status. `ReviewPanel` slides in when application is selected. `BoothAssignmentModal` for approval. `Booth_Fill_Rate` progress bar at top. (REQ-4)

**ScheduleBuilderPage**: `DayTabs` for multi-day expos. `ScheduleGrid` timeline view. `SessionForm` modal for create/edit. `ConflictWarning` inline alert. (REQ-6)

**ScannerPage** (`/organizer/scanner`): Expo selector dropdown. `QRScanner` component (html5-qrcode). `ScanResultDisplay` overlays with green/yellow/red feedback, 3-second auto-dismiss. Always uses `bg-bg-base-dark` regardless of current theme. (REQ-8)

**ApplicationFormPage** (`/expos/:id/apply`): Two-step form — Step 1: company info; Step 2: booth preferences + notes. Progress indicator. Cloudinary logo upload. (REQ-3)

**MyTicketsPage** (`/attendee/tickets`): `TicketCard` list. Status badges. Link to `TicketDetailPage`. (REQ-5.7)

**TicketDetailPage** (`/attendee/tickets/:ticketId`): `QRTicketDisplay` (always high-contrast dark QR on white background). `PDFDownloadButton`. Cancel ticket action. (REQ-5.8, REQ-5.11)

**ScheduleBrowsePage** (`/expos/:id/schedule`): `DayTabs` + session list. Bookmark icons rendered if user has an `active`/`checked_in` ticket; read-only otherwise with "Register to bookmark" prompt. (REQ-7)

### Reusable Components

**Expo domain:**

| Component | Purpose |
|---|---|
| `ExpoCard` | Summary card for listing page |
| `ExpoStatusBadge` | Color-coded status pill (`draft`/`published`/`ongoing`/`completed`/`archived`) |
| `ExpoForm` | Controlled form for create/edit; handles Cloudinary upload |
| `ExpoStatusTransitionButton` | Publish/Archive action button; triggers cascade preview check |
| `CascadeConfirmDialog` | Modal showing activeTickets + pendingApplications counts before cascade |

**Application domain:**

| Component | Purpose |
|---|---|
| `ApplicationCard` | Summary card with status badge and company info |
| `ApplicationStatusBadge` | Color-coded `pending`/`approved`/`rejected` pill |
| `ApplicationForm` | Two-step multi-page form |
| `ReviewPanel` | Slide-in panel for organizer to see full application and take action |
| `BoothAssignmentModal` | Modal prompting booth label input on approve |
| `WithdrawConfirmDialog` | Confirm modal before withdrawing pending application |

**Ticket domain:**

| Component | Purpose |
|---|---|
| `QRTicketDisplay` | Always-dark high-contrast QR on white card (REQ-5.11) |
| `TicketCard` | Summary row with expo name, date, status badge |
| `TicketStatusBadge` | `active`/`checked_in`/`cancelled` pill |
| `PDFDownloadButton` | Calls `/api/tickets/:ticketId/pdf`, triggers browser download |

**Session domain:**

| Component | Purpose |
|---|---|
| `SessionCard` | Session summary with title, speaker, time, room, track badge |
| `SessionForm` | Modal form for create/edit with time validation |
| `ScheduleGrid` | Timeline-style grid layout of sessions |
| `DayTabs` | Tab row for switching between expo days |
| `ConflictWarning` | Inline warning banner showing conflicting session detail |

**Scanner domain:**

| Component | Purpose |
|---|---|
| `QRScanner` | Wraps html5-qrcode; manages camera permission, start/stop lifecycle |
| `ScanResultDisplay` | Full-width overlay with icon + message; green/yellow/red; 3-second auto-dismiss |

**Exhibitor domain:**

| Component | Purpose |
|---|---|
| `ExhibitorCard` | Company logo, name, category, description snippet |
| `ExhibitorFilterBar` | Text search input + category chip filter |
| `ExhibitorDetailModal` | Full company detail + booth number + website |

**Dashboard domain:**

| Component | Purpose |
|---|---|
| `OrganizerStatsPanel` | Grid of `BentoCard` metrics with 60-second auto-refresh |
| `ExpoStatCard` | Per-expo breakdown card within organizer dashboard |

### Custom Hooks

```typescript
// useExpos — fetch and manage expo list / detail state
function useExpos(options?: { organizerOnly?: boolean; query?: ExpoListQuery })

// useApplications — application list and review actions for a given expoId
function useApplications(expoId: string, role: 'organizer' | 'exhibitor')

// useTickets — attendee's own tickets
function useTickets()

// useSessions — sessions for a given expoId, with bookmark state
function useSessions(expoId: string)

// useBookmarks — attendee's bookmarks for a given expoId
function useBookmarks(expoId: string)

// useOrganizerStats — dashboard stats with 60-second polling (REQ-10.4)
function useOrganizerStats()
```

### API Services

All services follow the existing pattern — axios-based, using the `api` instance from `services/api.ts` which has the automatic token refresh interceptor.

```typescript
// services/expoService.ts
expoService.list(query)
expoService.getById(id)
expoService.create(data)
expoService.update(id, data)
expoService.transitionStatus(id, status, confirmed?)
expoService.getCascadePreview(id)
expoService.delete(id, confirmed)
expoService.getStats(id)
expoService.listMine()

// services/applicationService.ts
applicationService.submit(expoId, data)
applicationService.getMine(expoId)
applicationService.listForExpo(expoId)
applicationService.edit(expoId, applicationId, data)
applicationService.withdraw(expoId, applicationId)
applicationService.review(expoId, applicationId, body)
applicationService.listAllMine()

// services/ticketService.ts
ticketService.register(expoId)
ticketService.getMine()
ticketService.getById(ticketId)
ticketService.cancel(ticketId)
ticketService.checkIn(ticketId, expoId)
ticketService.downloadPDF(ticketId)          // responseType: 'blob', returns Blob for PDFDownloadButton

// services/sessionService.ts
sessionService.list(expoId)
sessionService.create(expoId, data)
sessionService.update(expoId, sessionId, data)
sessionService.delete(expoId, sessionId)

// services/bookmarkService.ts
bookmarkService.add(expoId, sessionId)
bookmarkService.remove(expoId, sessionId)
bookmarkService.getMine(expoId)

// services/statsService.ts
statsService.getOrganizerDashboard()
statsService.getExpoStats(expoId)
statsService.getSuperAdminDashboard()

// services/uploadService.ts
uploadService.uploadImage(file, purpose)
```

### Theme Pattern (replicated from Phase 1)

Every Phase 2 component uses the same pattern:

```tsx
const { theme } = useTheme();
const isDarkMode = theme === 'dark';

// Example usage in a component:
<div className={`
  rounded-lg-token border p-lg-token
  ${isDarkMode
    ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
    : 'bg-bg-surface-light border-border-base-light text-text-primary-light'}
`}>
```

**Exception — ScannerPage:** Always uses `bg-bg-base-dark` and dark-mode text tokens regardless of `isDarkMode`, to ensure maximum readability under expo floor lighting (REQ-8.10).

---

## Key Technical Decisions

### 1. QR Code Generation (REQ-5.3, REQ-5.12)

QR codes are generated server-side using the `qrcode` npm package (soldair/node-qrcode). The `ticketId` UUID v4 is the sole payload — no URLs, no metadata in the QR data. This keeps the code compact and the module-size small for reliable scanning at low resolution.

```typescript
import QRCode from 'qrcode';

// In TicketService.generateQRPNG():
const dataUrl = await QRCode.toDataURL(ticketId, {
  width: 300,
  margin: 4,          // quiet zone per REQ-5.12
  errorCorrectionLevel: 'M',
  color: { dark: '#000000', light: '#FFFFFF' }
});
```

QR codes are **not stored** in Cloudinary or any file system — they are generated on demand from the stored `ticketId`. This makes the generation endpoint idempotent and eliminates storage costs (REQ-5.8, Property 5 in Correctness Properties).

### 2. PDF Ticket Generation (REQ-5.5)

PDF tickets are composed server-side with `pdf-lib` — pure JavaScript, zero native dependencies, works identically in Node.js and browser environments. The PDF is generated on demand and streamed as a binary response. No PDFs are persisted.

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Composition order: header with expo name, attendee name, dates/venue,
// QR code image (PNG bytes embedded via embedPng), ticket ID in mono font.
```

The `PDFDownloadButton` frontend component calls `GET /api/tickets/:ticketId/pdf` which responds with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="ticket-{ticketId}.pdf"`.

### 3. Cloudinary Uploads (REQ-2.13, REQ-3.4, REQ-12.8)

The upload flow is always server-proxied — no direct client-to-Cloudinary uploads. This is critical for security: the Cloudinary API secret never leaves the backend.

```
Client (multipart/form-data)
  → POST /api/upload/image
  → UploadService validates MIME type by inspecting file buffer magic bytes
  → UploadService validates size limit
  → Cloudinary SDK uploads buffer to purpose-specific folder
  → Returns { url, publicId }
```

MIME type validation uses the first bytes of the buffer (`magic bytes`): PNG starts with `\x89PNG`, JPEG with `\xFF\xD8`, WebP with `RIFF...WEBP`. This prevents extension spoofing (REQ-12.8).

### 4. Expo Status Machine (REQ-2, REQ-12)

Valid transitions are encoded as a lookup map in `ExpoService`. Any transition not in the map is rejected with HTTP 400.

```typescript
const VALID_TRANSITIONS: Record<ExpoStatus, ExpoStatus[]> = {
  draft:     ['published'],
  published: ['ongoing', 'archived'],
  ongoing:   ['completed', 'archived'],
  completed: ['archived'],
  archived:  [],
};
```

The `draft → published` transition additionally validates all required fields are present (REQ-2.9). The `* → archived` and draft deletion transitions go through the cascade gate.

### 5. Cascade Confirmation Gate (REQ-2.16, REQ-12.20)

The gate is a two-step API interaction:

1. `GET /api/expos/:id/cascade-preview` — returns counts, no side effects.
2. Actual action (`DELETE` or `PATCH status`) with body `{ confirmed: true }` — only executes cascade when `confirmed: true` and counts were non-zero.

The backend rejects archive/delete requests affecting expos with active tickets or pending applications if `confirmed` is falsy, returning HTTP 409 with the preview counts. The frontend `CascadeConfirmDialog` is the only way to supply `confirmed: true`.

### 6. Check-in Idempotency and Debounce (REQ-8.7, REQ-8.13)

Two complementary layers:
- **Frontend debounce**: After any scan result (success or error), `QRScanner` ignores re-scans of the same `ticketId` for 5 seconds. Implemented with a `Set` of recently-scanned IDs cleared by `setTimeout`.
- **Backend idempotency**: Scanning a `checked_in` ticket returns `{ result: 'already_checked_in', checkedInAt: <original timestamp> }` with HTTP 200. The `checkedInAt` is never overwritten. The check-in update uses `$set: { status: 'checked_in', checkedInAt: new Date() }` only when current status is `active`.

### 7. Scanner Page Design (REQ-8.10, REQ-8.11, REQ-8.12)

The Scanner page is intentionally locked to dark styling:
- Always `bg-bg-base-dark` for the background (not controlled by `ThemeContext`)
- `text-text-primary-dark` for all text
- No glassmorphism, no semi-transparent surfaces
- Camera viewfinder takes `min-h-[60vh]` on mobile (`<768px`)
- `html5-qrcode` requires a mounted DOM element with a stable ID (`qr-reader`)
- Camera stream is stopped via `html5QrcodeScanner.clear()` in the `useEffect` cleanup function (REQ-8.15)

### 8. Public Routes and Redirect-to-Login (REQ-1.9)

`/expos` and `/expos/:id` do not use `ProtectedRoute`. The "Register for Expo" and "Apply to Exhibit" buttons check `isAuthenticated` from `useAuth()`. If the user is not authenticated, clicking navigates to:
```
/login?redirect=/expos/:id
```

The existing `LoginPage` reads the `redirect` query parameter and navigates to it after successful login. This is the same pattern already in use in Phase 1.

### 9. Exhibitor Search Strategy (REQ-9.3, REQ-9.5)

For expos with ≤200 approved exhibitors, the full exhibitor list is included in `GET /api/expos/:id` response and filtering is done client-side. For expos exceeding 200 exhibitors, the backend exposes `GET /api/expos/:id/exhibitors?search=...&category=...` with server-side filtering. The threshold check is transparent to the frontend — the `ExhibitorFilterBar` component calls the appropriate hook which selects the strategy.

### 10. Organizer Dashboard 60-Second Refresh (REQ-10.4)

```tsx
// In OrganizerDashboard component:
useEffect(() => {
  const fetchStats = () => statsService.getOrganizerDashboard();
  fetchStats();  // immediate on mount

  const interval = setInterval(fetchStats, 60_000);
  return () => clearInterval(interval);  // cleanup on unmount
}, []);
```

No WebSockets, no SWR or React Query — `setInterval` inside a `useEffect` is sufficient for a 60-second polling interval and integrates naturally with the existing axios service pattern.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property-based tests use the `fast-check` library (backend: `fast-check` with `vitest`; frontend: `@fast-check/vitest`). Each property test is configured for a minimum of 100 iterations.

### Property 1: Public listing shows only publicly visible expos

*For any* collection of expos with mixed statuses, every expo returned by the public listing endpoint must have a status of `published`, `ongoing`, or `completed` — none with status `draft` or `archived` must appear.

**Validates: Requirements REQ-1.2, REQ-1.5**

### Property 2: Expo card description is truncated to 160 characters

*For any* expo with a description longer than 160 characters, the description field in the `ExpoCardDTO` returned by the listing endpoint must be at most 160 characters in length.

**Validates: Requirements REQ-1.3**

### Property 3: Pagination never exceeds 12 items per page

*For any* page request against the public expo listing, the number of expo items in the response must never exceed 12, regardless of total dataset size.

**Validates: Requirements REQ-1.8**

### Property 4: New expos are created in draft status with correct ownership

*For any* valid set of required expo fields submitted by an authenticated organizer, the resulting expo document must have `status = 'draft'` and `organizerId` equal to the submitting organizer's ID.

**Validates: Requirements REQ-2.1**

### Property 5: Organizer's expo list contains only their own expos

*For any* organizer, every expo returned by `GET /api/organizer/expos` (or `GET /api/expos` scoped to that organizer) must have `organizerId` equal to that organizer's ID — no other organizer's expos may appear.

**Validates: Requirements REQ-2.7, REQ-12.6**

### Property 6: Invalid date ranges are always rejected

*For any* pair of dates where `endDate ≤ startDate`, the create/update expo endpoint must return a validation error and must not create or modify the expo record.

**Validates: Requirements REQ-2.6**

### Property 7: Deletion is blocked when tickets or approved exhibitors exist

*For any* expo that has at least one `active` or `checked_in` ticket, or at least one `approved` application, a delete request without `confirmed: true` must be rejected and the expo must not be deleted.

**Validates: Requirements REQ-2.12, REQ-2.16**

### Property 8: Booth labels are unique within an expo

*For any* expo, no two approved applications within that expo may share the same `boothLabel`. Any attempt to assign a `boothLabel` already held by another approved application in the same expo must be rejected with a conflict error.

**Validates: Requirements REQ-4.4, REQ-12.21**

### Property 9: Booth fill rate calculation is correct

*For any* expo with `totalBooths > 0`, the `boothFillRate` returned must equal `(count of approved applications with a boothLabel / totalBooths) × 100`, rounded to two decimal places.

**Validates: Requirements REQ-4.7**

### Property 10: No exhibitor holds more than one active application per expo

*For any* (exhibitorId, expoId) pair, the system must reject a new application submission if a `pending` or `approved` application for that pair already exists, returning an error and leaving the existing application unchanged.

**Validates: Requirements REQ-3.6**

### Property 11: Registration produces active ticket with unique UUID v4 ticketId

*For any* valid attendee registration, the resulting ticket must have `status = 'active'` and a `ticketId` that (a) matches the UUID v4 format and (b) is globally unique across all tickets in the system.

**Validates: Requirements REQ-5.2, REQ-12.22, REQ-12.10**

### Property 12: QR code generation is deterministic

*For any* `ticketId` string, calling the QR generation function twice with the same input must produce identical output — the same PNG data URL. No randomness is introduced after the UUID is minted.

**Validates: Requirements REQ-5.3, REQ-5.8**

### Property 13: Duplicate registration is blocked

*For any* attendee who already holds an `active` or `checked_in` ticket for a given expo, a second registration attempt must be rejected and no additional ticket record must be created.

**Validates: Requirements REQ-5.6**

### Property 14: Session time range invariant

*For any* session, `endTime` must be strictly greater than `startTime`. Any create or update request where `endTime ≤ startTime` must be rejected with a validation error.

**Validates: Requirements REQ-6.4**

### Property 15: No two sessions in the same room overlap in the same expo

*For any* expo, no two sessions assigned to the same room may have overlapping time ranges. A new session create or update that would produce an overlap must be rejected with a conflict error identifying the conflicting session.

**Validates: Requirements REQ-6.5**

### Property 16: Session deletion cascades to all associated bookmarks

*For any* session that has been bookmarked by one or more attendees, deleting that session must also delete all bookmark records referencing that `sessionId`. After deletion, querying bookmarks for any attendee must not return that session.

**Validates: Requirements REQ-6.7**

### Property 17: Bookmark toggle is a round trip

*For any* attendee and session, bookmarking then removing the bookmark must result in the session not appearing in the attendee's bookmark list — the state returns to the pre-bookmarked state.

**Validates: Requirements REQ-7.3, REQ-7.4**

### Property 18: Check-in transitions ticket to checked_in with a timestamp

*For any* ticket with `status = 'active'`, processing a valid check-in must result in `status = 'checked_in'` and a non-null `checkedInAt` timestamp that is greater than `registeredAt`.

**Validates: Requirements REQ-8.4**

### Property 19: Check-in is idempotent — second scan returns the original timestamp

*For any* ticket with `status = 'checked_in'`, a subsequent check-in request must return `result = 'already_checked_in'` with the original `checkedInAt` timestamp unchanged. The timestamp must not be updated and no new check-in record must be created.

**Validates: Requirements REQ-8.7**

### Property 20: Expo status may only follow valid transitions

*For any* expo in status S, a request to transition to status T where T is not in the set of valid successors of S must be rejected with HTTP 400 and the expo's status must remain S.

**Validates: Requirements REQ-2.9, REQ-2.10**

### Property 21: Cascade completeness after archive or delete

*For any* expo that is archived or deleted (with confirmed cascade), no `active` tickets for that expo may exist in the system and no `pending` applications for that expo may exist. All previously `active` tickets must have `status = 'cancelled'` and all previously `pending` applications must have `status = 'rejected'`.

**Validates: Requirements REQ-12.20**

### Property 22: Ownership isolation — organizers cannot modify other organizers' resources

*For any* organizer A and expo owned by organizer B, a request from organizer A to update, delete, or access private data of organizer B's expo must return HTTP 403 and must not modify any data.

**Validates: Requirements REQ-12.6**

---

## Error Handling

All Phase 2 routes use the same error handling infrastructure from Phase 1:

### Error Response Envelope (REQ-12.18)

```json
{
  "success": false,
  "message": "Human-readable description of the error",
  "code": "MACHINE_READABLE_CODE"
}
```

### Phase 2 Error Codes

| Code | HTTP Status | Scenario |
|---|---|---|
| `EXPO_NOT_FOUND` | 404 | Expo ID does not exist |
| `EXPO_FORBIDDEN` | 403 | Organizer accessing another organizer's expo |
| `INVALID_STATUS_TRANSITION` | 400 | e.g. `completed → published` |
| `MISSING_REQUIRED_FIELDS` | 400 | Attempt to publish with incomplete data |
| `CASCADE_CONFIRMATION_REQUIRED` | 409 | Archive/delete without confirmation when records exist |
| `APPLICATION_NOT_FOUND` | 404 | Application ID does not exist |
| `DUPLICATE_APPLICATION` | 409 | Exhibitor already has pending/approved application |
| `BOOTH_CONFLICT` | 409 | Booth label already assigned in this expo |
| `BOOTH_CAPACITY_WARNING` | 200 | Approving beyond totalBooths (warning, not block) |
| `TICKET_NOT_FOUND` | 404 | Ticket ID does not exist |
| `DUPLICATE_REGISTRATION` | 409 | Attendee already registered for this expo |
| `SESSION_NOT_FOUND` | 404 | Session ID does not exist |
| `ROOM_CONFLICT` | 409 | New session overlaps existing session in same room |
| `INVALID_TIME_RANGE` | 400 | endTime ≤ startTime |
| `UPLOAD_INVALID_TYPE` | 400 | Non-PNG/JPG/WebP file uploaded |
| `UPLOAD_TOO_LARGE` | 400 | File exceeds size limit for purpose |
| `INVALID_DATE_RANGE` | 400 | startDate in past or endDate before startDate |

### Validation Strategy

All user-supplied input is validated server-side on every write request (REQ-12.7), independent of client-side validation. Validation is applied at the service layer before any database write:

1. **Field presence**: required fields checked first (returns 400 with `MISSING_REQUIRED_FIELDS`)
2. **Field length**: string length bounds checked (returns 400)
3. **Date logic**: `startDate > now`, `endDate > startDate` (returns 400 with `INVALID_DATE_RANGE`)
4. **Ownership**: organizerId from `req.user.userId` checked against document's organizerId (returns 403 with `EXPO_FORBIDDEN`)
5. **Business rules**: uniqueness checks, status machine, capacity warnings (returns 409)

---

## Testing Strategy

### Dual Testing Approach

Both unit/example-based tests and property-based tests are used. Unit tests catch concrete scenarios; property tests verify universal invariants across many generated inputs.

### Backend Tests (Vitest + Supertest)

Tests live in `backend/src/__tests__/`. Each test file imports the Express app and connects to a test MongoDB instance (in-memory via `mongodb-memory-server` or a test database).

**Example-based integration tests:**

- `expo.crud.test.ts` — create, read, update, delete expos; status transitions; cascade confirmation gate
- `application.flow.test.ts` — submit, edit, withdraw, approve with booth, reject, revoke
- `ticket.checkin.test.ts` — register, QR generate, check-in success, already-checked-in, wrong-event, cancelled-ticket
- `session.schedule.test.ts` — CRUD, room conflict detection, bookmark cascade on delete
- `dashboard.stats.test.ts` — organizer and superadmin aggregate queries

**Property-based tests (fast-check):**

Each correctness property from the design gets one property test. Tag format per test:
```typescript
// Feature: eventsphere-phase2-core-expo-operations, Property 8: Booth labels are unique within an expo
test.prop([fc.record({ ... })])('booth uniqueness invariant', async (data) => { ... });
```

Minimum 100 iterations per property test (fast-check default is 100; can be raised via `numRuns`).

### Frontend Tests (Vitest + @testing-library/react)

- Unit tests for validation logic in service layers (e.g. date validation, field constraints)
- Component tests for `ExpoForm`, `ApplicationForm`, `QRTicketDisplay`
- Property tests for pure utility functions (QR determinism, description truncation, booth fill rate calculation)
- Example-based tests for `ScanResultDisplay` render states (success/warning/error)
- Snapshot tests are used for `QRTicketDisplay` to ensure QR rendering is stable

### Performance Validation

The following SLOs from REQ-12 are validated with integration tests that measure response time:

| Endpoint | SLO | Test method |
|---|---|---|
| List expos | 500ms | Seed 1,000 expos, measure p95 |
| Create/update expo | 1,000ms | Measure single request time |
| QR generation | 2,000ms | Measure ticket registration round-trip |
| Check-in | 500ms | Measure check-in request time |
| Dashboard stats | 1,500ms | Measure aggregate query time |

---

## Build and File Structure Changes

### Backend New Files

```
backend/src/
  models/
    Expo.model.ts
    Application.model.ts
    Ticket.model.ts
    Session.model.ts
    Bookmark.model.ts
  routes/
    expo.routes.ts          ← /api/expos, /api/organizer/expos
    application.routes.ts   ← /api/expos/:expoId/applications, /api/exhibitor/applications
    ticket.routes.ts        ← /api/expos/:expoId/tickets, /api/tickets/*
    session.routes.ts       ← /api/expos/:expoId/sessions
    bookmark.routes.ts      ← /api/expos/:expoId/sessions/:sessionId/bookmarks, /api/expos/:expoId/bookmarks/mine
    upload.routes.ts        ← /api/upload/image
    dashboard.routes.ts     ← /api/dashboard/*
  services/
    expo.service.ts
    application.service.ts
    ticket.service.ts
    session.service.ts
    bookmark.service.ts
    upload.service.ts
    stats.service.ts
  __tests__/
    expo.crud.test.ts
    application.flow.test.ts
    ticket.checkin.test.ts
    session.schedule.test.ts
    dashboard.stats.test.ts
    properties/
      expo.properties.test.ts       ← Properties 1–7, 20, 22
      application.properties.test.ts ← Properties 8–10
      ticket.properties.test.ts     ← Properties 11–13, 18–19
      session.properties.test.ts    ← Properties 14–16
      bookmark.properties.test.ts   ← Property 17
      cascade.properties.test.ts    ← Property 21
```

**`app.ts` additions** (register new route modules):
```typescript
import expoRoutes from './routes/expo.routes';
import applicationRoutes from './routes/application.routes';
import ticketRoutes from './routes/ticket.routes';
import sessionRoutes from './routes/session.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import uploadRoutes from './routes/upload.routes';
import dashboardRoutes from './routes/dashboard.routes';

app.use('/api/expos', expoRoutes);
app.use('/api/expos', applicationRoutes);   // nested: /api/expos/:expoId/applications
app.use('/api/expos', sessionRoutes);        // nested: /api/expos/:expoId/sessions
app.use('/api/expos', bookmarkRoutes);       // nested: /api/expos/:expoId/sessions/:sessionId/bookmarks
app.use('/api/tickets', ticketRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/organizer', expoRoutes);       // /api/organizer/expos (organizer-scoped list)
app.use('/api/exhibitor', applicationRoutes);// /api/exhibitor/applications
```

**`server.ts` additions** — call `createIndexes()` for each new model at startup:
```typescript
await new ExpoModel().createIndexes();
await new ApplicationModel().createIndexes();
await new TicketModel().createIndexes();
await new SessionModel().createIndexes();
await new BookmarkModel().createIndexes();
```

### Frontend New Files

```
frontend/src/
  pages/
    expos/
      ExpoListingPage.tsx
      ExpoDetailPage.tsx
    organizer/
      MyExposPage.tsx
      CreateExpoPage.tsx
      EditExpoPage.tsx
      ApplicationsPage.tsx
      ScheduleBuilderPage.tsx
      BoothLayoutPage.tsx
      ScannerPage.tsx
    exhibitor/
      MyApplicationsPage.tsx
      ApplicationFormPage.tsx
    attendee/
      MyTicketsPage.tsx
      TicketDetailPage.tsx
      ScheduleBrowsePage.tsx
  components/
    expo/
      ExpoCard.tsx
      ExpoStatusBadge.tsx
      ExpoForm.tsx
      ExpoStatusTransitionButton.tsx
      CascadeConfirmDialog.tsx
    application/
      ApplicationCard.tsx
      ApplicationStatusBadge.tsx
      ApplicationForm.tsx
      ReviewPanel.tsx
      BoothAssignmentModal.tsx
      WithdrawConfirmDialog.tsx
    ticket/
      QRTicketDisplay.tsx
      TicketCard.tsx
      TicketStatusBadge.tsx
      PDFDownloadButton.tsx
    session/
      SessionCard.tsx
      SessionForm.tsx
      ScheduleGrid.tsx
      DayTabs.tsx
      ConflictWarning.tsx
    scanner/
      QRScanner.tsx
      ScanResultDisplay.tsx
    exhibitor/
      ExhibitorCard.tsx
      ExhibitorFilterBar.tsx
      ExhibitorDetailModal.tsx
    dashboard/
      OrganizerStatsPanel.tsx   ← extends existing BentoCard
      ExpoStatCard.tsx
  services/
    expoService.ts
    applicationService.ts
    ticketService.ts
    sessionService.ts
    bookmarkService.ts
    statsService.ts
    uploadService.ts
  hooks/
    useExpos.ts
    useApplications.ts
    useTickets.ts
    useSessions.ts
    useBookmarks.ts
    useOrganizerStats.ts
  __tests__/
    components/
      ExpoCard.test.tsx
      QRTicketDisplay.test.tsx
      ScanResultDisplay.test.tsx
      ApplicationForm.test.tsx
    hooks/
      useOrganizerStats.test.ts
    properties/
      expoValidation.properties.test.ts   ← Properties 2, 3, 6
      ticketLogic.properties.test.ts      ← Properties 12, 13
      sessionLogic.properties.test.ts     ← Properties 14, 15
```

### Environment Variables

New entries needed in `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

These are validated at startup via the existing `env.ts` config module using the same `dotenv` + validation pattern.

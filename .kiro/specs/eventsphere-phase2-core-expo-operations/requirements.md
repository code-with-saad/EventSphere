# Requirements Document — EventSphere Phase 2: Core Expo Operations

## Introduction

EventSphere Phase 2 (designated P0b in the project specification) delivers the core business functionality that makes the platform usable end-to-end: Organizers create and manage Expos, Exhibitors apply for booths, Attendees register and check in via QR code, and Organizer staff operate a mobile-first QR scanner. Phase 2 builds directly on top of the Phase 1 Auth Foundation — all four roles (SuperAdmin, Organizer, Exhibitor, Attendee) already exist with working authentication, role-based route guards, JWT refresh, toast notifications, and dark/light mode.

The exit criterion for Phase 2 is a fully demonstrable expo lifecycle: an Organizer creates an Expo, an Exhibitor applies and receives a booth, and an Attendee registers and checks in via a scanned QR ticket.

**Scope boundaries:**
- Email notifications for status changes are a Phase 3 (P1) item; Phase 2 delivers in-app feedback only (toast + status screens).
- Payment processing is out of scope for this version.
- PDF ticket improvements are a Phase 3 item; Phase 2 delivers PNG QR tickets with a basic downloadable PDF.
- Analytics beyond basic dashboard counts are a Phase 3 item.

---

## Glossary

- **Expo**: A published event or expo managed by an Organizer. Has a lifecycle: `draft` → `published` → `ongoing` → `completed` → `archived`.
- **Application**: An Exhibitor's request to participate in an Expo. Status: `pending` → `approved` | `rejected`.
- **Booth**: A physical space assigned to an approved Exhibitor within an Expo. Identified by a booth number/label.
- **Ticket**: A unique QR-coded registration record issued to an Attendee upon registering for an Expo. Status: `active` | `checked_in` | `cancelled`.
- **Session**: A single talk, workshop, or activity in an Expo schedule. Has a title, speaker, time slot, and location/room.
- **Bookmark**: An Attendee's saved interest in a Session.
- **Organizer**: An approved user (role = `organizer`, status = `active`) who creates and manages Expos.
- **Exhibitor**: A verified user (role = `exhibitor`, status = `active`) who applies to participate in Expos.
- **Attendee**: A verified user (role = `attendee`, status = `active`) who registers for and attends Expos.
- **SuperAdmin**: The single platform administrator who can view platform statistics.
- **Check-in**: The act of marking an Attendee as having physically entered an Expo by scanning their QR ticket.
- **QR_Scanner**: The browser-based component used by Organizer staff on a mobile device to scan Attendee QR codes.
- **Booth_Fill_Rate**: The ratio of assigned booths to total available booths for an Expo, expressed as a percentage.
- **Published Expo**: An Expo with status `published`, `ongoing`, or `completed` — visible to unauthenticated public visitors.
- **Design_Token_System**: The EventSphere Tailwind CSS design token system established in Phase 1. All UI components must use token classes exclusively.

---

## Requirements

---

### REQ-1: Expo Listing (Public)

**User Story:** As a public visitor, I want to browse published Expos without logging in, so that I can discover events and decide whether to register.

#### Acceptance Criteria

1. THE Expo_Listing_Page SHALL be accessible to unauthenticated users at a public route (e.g., `/expos`).
2. WHEN an unauthenticated user visits the Expo listing page, THE System SHALL display all Expos with status `published`, `ongoing`, or `completed`.
3. WHEN displaying an Expo card, THE System SHALL show the Expo name, description (truncated to 160 characters), start date, end date, location, and the count of approved Exhibitors.
4. WHEN an unauthenticated user clicks an Expo card, THE System SHALL display the full Expo detail page, including name, full description, banner image (if set), dates, location, venue, and the list of approved Exhibitors.
5. THE Expo_Listing_Page SHALL support filtering Expos by status (`upcoming`, `ongoing`, `completed`) using filter controls visible on the page.
6. THE Expo_Listing_Page SHALL support text search across Expo name and description, returning matching results within 500ms for datasets up to 1,000 Expos.
7. WHEN no Expos match the active filter or search, THE System SHALL display an empty-state message indicating no results were found.
8. THE Expo_Listing_Page SHALL be paginated, displaying a maximum of 12 Expos per page, with next/previous navigation controls.
9. WHEN an unauthenticated user attempts to register for an Expo from the detail page, THE System SHALL redirect them to the Login page, preserving the intended destination so they are returned to the Expo detail page after authentication.
10. THE Expo_Listing_Page SHALL render correctly using EventSphere Design_Token_System classes for all visual elements, supporting both dark and light modes.

---

### REQ-2: Expo CRUD (Organizer)

**User Story:** As an Organizer, I want to create, edit, publish, and delete my own Expos, so that I can manage events I am running.

#### Acceptance Criteria

1. WHEN an Organizer submits the Create Expo form with all required fields, THE System SHALL create a new Expo record with status `draft` and associate it with the Organizer's user ID.
2. THE System SHALL require the following fields to create an Expo: name (1–120 characters), description (1–2000 characters), start date, end date, venue name, venue address, and total booth count (integer ≥ 1).
3. THE System SHALL accept the following optional fields on an Expo: banner image URL (Cloudinary), website URL, category (e.g., Technology, Health, Art), and tags (up to 10 tags, each 1–30 characters).
4. IF an Organizer submits the Create Expo form with a missing required field, THEN THE System SHALL display a field-level validation error identifying the missing or invalid field and prevent form submission.
5. IF an Organizer sets the Expo start date to a date in the past, THEN THE System SHALL display a validation error and prevent form submission.
6. IF an Organizer sets the Expo end date to a date before the start date, THEN THE System SHALL display a validation error and prevent form submission.
7. WHEN an Organizer views their Expo list, THE System SHALL display only the Expos owned by that Organizer.
8. WHEN an Organizer updates an Expo in `draft` or `published` status, THE System SHALL save the changes and confirm success via toast notification.
9. WHEN an Organizer publishes an Expo (transitions status from `draft` to `published`), THE System SHALL validate that all required fields are present before allowing the transition.
10. IF an Organizer attempts to publish an Expo with missing required fields, THEN THE System SHALL display a validation error listing the incomplete fields and prevent the status transition.
11. WHEN an Organizer deletes a `draft` Expo with no registered Attendees and no approved Exhibitors, THE System SHALL permanently delete the Expo and confirm via toast notification.
12. IF an Organizer attempts to delete an Expo that has at least one registered Attendee or approved Exhibitor, THEN THE System SHALL prevent deletion and display an error message explaining why deletion is blocked.
13. WHEN an Organizer uploads a banner image, THE Expo_Form SHALL upload the image to Cloudinary and store the returned URL; THE System SHALL reject files that are not PNG, JPG, or WebP, and files larger than 5 MB.
14. THE Expo_Form SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.
15. WHEN an Organizer submits a Create or Update Expo request, THE System SHALL respond within 1,000ms under normal load.
16. WHEN an Organizer attempts to archive or delete an Expo that has at least one `active` Ticket or at least one `pending` or `approved` Application, THE System SHALL display a confirmation dialog stating the exact count of Tickets that will be cancelled and Applications that will be rejected before proceeding; THE cascade action described in REQ-12.20 SHALL only execute after the Organizer explicitly confirms the dialog.

---

### REQ-3: Exhibitor Application Form (Exhibitor)

**User Story:** As an Exhibitor, I want to apply to participate in an open Expo, so that I can showcase my products or services at the event.

#### Acceptance Criteria

1. WHEN an authenticated Exhibitor views an Expo detail page for a `published` Expo, THE System SHALL display an "Apply to Exhibit" button.
2. WHEN an Exhibitor clicks "Apply to Exhibit", THE System SHALL display a multi-step application form (minimum two steps: company information, then booth preferences).
3. THE Application_Form SHALL require the following fields: company name (1–120 characters), company description (1–500 characters), product/service category (selected from a predefined list), and at least one contact phone number.
4. THE Application_Form SHALL accept the following optional fields: company website URL, logo image (uploaded to Cloudinary, PNG/JPG/WebP, max 2 MB), and a note to the Organizer (max 500 characters).
5. IF an Exhibitor attempts to submit an application with a missing required field, THEN THE System SHALL display a field-level validation error and prevent submission.
6. IF an Exhibitor attempts to apply to an Expo for which they already have an active or pending application, THEN THE System SHALL prevent duplicate submission and display a message indicating the application already exists.
7. WHEN an Exhibitor successfully submits an application, THE System SHALL create an Application record with status `pending`, associate it with the Exhibitor's user ID and the Expo ID, and display a success toast notification.
8. WHEN an Exhibitor views their Application Status page, THE System SHALL display all of their applications with the current status (`pending`, `approved`, `rejected`), the Expo name, and the submission date.
9. WHILE an Exhibitor's application status is `approved`, THE System SHALL display their assigned booth number/label and the Expo venue map link (if set) on the Application Status page.
10. WHILE an Exhibitor's application status is `rejected`, THE System SHALL display the rejection reason (if provided by the Organizer) on the Application Status page.
11. IF an Expo's status is not `published` (e.g., `draft`, `completed`, `archived`), THEN THE System SHALL not display the "Apply to Exhibit" button on the Expo detail page for that Expo.
12. THE Application_Form SHALL be responsive and fully usable on viewports from 320px to 1920px wide.
13. THE Application_Form SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.
14. WHILE an Exhibitor's application status is `pending`, THE System SHALL allow the Exhibitor to edit their submitted application details or withdraw the application entirely; WHEN an application is withdrawn, THE System SHALL delete the Application record and confirm via toast notification, allowing the Exhibitor to reapply to the same Expo.

---

### REQ-4: Exhibitor Application Review and Booth Assignment (Organizer)

**User Story:** As an Organizer, I want to review Exhibitor applications for my Expos and assign booths to approved Exhibitors, so that I can curate who participates and manage the physical booth layout.

#### Acceptance Criteria

1. WHEN an Organizer navigates to the Applications page for one of their Expos, THE System SHALL display all applications for that Expo grouped by status (`pending`, `approved`, `rejected`), with applicant company name, submission date, and category.
2. WHEN an Organizer clicks an application, THE System SHALL display the full application details including company description, website, logo (if provided), contact details, and the Exhibitor's note.
3. WHEN an Organizer approves an application, THE System SHALL set the application status to `approved`, require the Organizer to enter a booth number/label (1–20 characters), and save the booth assignment.
4. IF an Organizer attempts to assign a booth number/label that is already assigned to another approved Exhibitor in the same Expo, THEN THE System SHALL display a conflict error and prevent the assignment.
5. WHEN an Organizer rejects an application, THE System SHALL set the application status to `rejected` and optionally accept a rejection reason (max 300 characters).
6. WHEN an Organizer approves or rejects an application, THE System SHALL update the application status immediately and confirm the action via toast notification.
7. THE Organizer_Applications_Page SHALL display the current Booth_Fill_Rate for the Expo (assigned booths / total booths × 100%) as a visual indicator.
8. WHEN an Organizer views the booth layout summary for an Expo, THE System SHALL list all assigned booths with their Exhibitor company name and booth label, sorted by booth label.
9. WHEN an Organizer revokes an approval (changes an `approved` application back to `pending`), THE System SHALL clear the booth assignment and free that booth number for reassignment.
10. IF the total number of approved Exhibitors would exceed the Expo's total booth count, THEN THE System SHALL display a warning before confirming a new approval, informing the Organizer that all booths are filled.
11. THE Organizer_Applications_Page SHALL support filtering applications by status and searching by company name.
12. THE Organizer_Applications_Page SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.

---

### REQ-5: Attendee Registration and QR Ticket (Attendee)

**User Story:** As an Attendee, I want to register for an Expo and immediately receive a QR code ticket, so that I can use it to check in at the event entrance.

#### Acceptance Criteria

1. WHEN an authenticated Attendee views an Expo detail page for a `published` or `ongoing` Expo, THE System SHALL display a "Register for Expo" button.
2. WHEN an Attendee clicks "Register for Expo" and confirms, THE System SHALL create a Ticket record with a globally unique ticket ID, set its status to `active`, associate it with the Attendee's user ID and the Expo ID, and record the registration timestamp.
3. WHEN a Ticket is created, THE System SHALL generate a QR code encoding the ticket ID using the `qrcode` server-side library and return the QR code as a PNG data URL.
4. WHEN registration succeeds, THE System SHALL immediately display the QR code on-screen and offer a "Download PNG" button and a "Download PDF" button.
5. THE PDF ticket SHALL include: Expo name, Attendee full name, ticket ID, QR code image, Expo start and end dates, and venue name.
6. IF an Attendee attempts to register for an Expo for which they already hold an `active` or `checked_in` ticket, THEN THE System SHALL prevent duplicate registration and display a message indicating they are already registered.
7. WHEN an Attendee navigates to their "My Tickets" page, THE System SHALL display all their tickets with Expo name, registration date, status (`active`, `checked_in`, `cancelled`), and a button to view/re-download the QR code.
8. WHEN an Attendee views a ticket detail, THE System SHALL re-render the QR code on demand from the stored ticket ID.
9. WHEN an Attendee cancels a registration (ticket status `active`), THE System SHALL set the ticket status to `cancelled` and confirm via toast notification.
10. IF an Expo's status is `completed` or `archived`, THEN THE System SHALL not display the "Register for Expo" button and SHALL display a message indicating registration is closed.
11. WHILE an Attendee holds an `active` ticket, THE System SHALL display the QR code in high-contrast style (dark QR on white background) regardless of the current app theme, to ensure scanner readability.
12. THE QR code SHALL be generated at a minimum resolution of 300×300 pixels with sufficient quiet zone margin for reliable scanning.
13. THE registration flow SHALL complete (API round-trip + QR render) within 2,000ms under normal load.
14. THE Attendee_Ticket_Page SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.

---

### REQ-6: Schedule Builder (Organizer)

**User Story:** As an Organizer, I want to build a schedule of sessions for my Expo, so that Attendees and Exhibitors can plan their visit.

#### Acceptance Criteria

1. WHEN an Organizer navigates to the Schedule Builder for one of their Expos, THE System SHALL display a list of all Sessions for that Expo, sorted by start time ascending.
2. WHEN an Organizer creates a Session, THE System SHALL require: title (1–120 characters), speaker name (1–100 characters), start time (datetime), end time (datetime), and room/location name (1–80 characters).
3. THE Session creation form SHALL accept the following optional fields: session description (max 500 characters) and a tag/track (e.g., Keynote, Workshop, Panel, max 30 characters).
4. IF an Organizer sets a Session end time to a time at or before the Session start time, THEN THE System SHALL display a validation error and prevent submission.
5. IF an Organizer creates a Session whose time range overlaps with another Session in the same room/location for the same Expo, THEN THE System SHALL display a conflict warning with the conflicting Session's title and time range.
6. WHEN an Organizer updates a Session, THE System SHALL save the changes and confirm via toast notification.
7. WHEN an Organizer deletes a Session, THE System SHALL remove the Session record and all associated Bookmarks, and confirm via toast notification.
8. THE Schedule_Builder SHALL display sessions on a day-by-day view when the Expo spans multiple days, with tabs or a date picker to switch between days.
9. THE Schedule_Builder SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.

---

### REQ-7: Schedule Browse and Bookmark (Attendee)

**User Story:** As an Attendee registered for an Expo, I want to browse the session schedule and bookmark sessions I plan to attend, so that I can plan my day at the event.

#### Acceptance Criteria

1. WHEN a registered Attendee (holding an `active` or `checked_in` ticket) navigates to the Schedule page for an Expo, THE System SHALL display all Sessions for that Expo sorted by start time ascending.
2. WHEN displaying a Session, THE System SHALL show: title, speaker name, start time, end time, room/location, and description (if present).
3. WHEN an Attendee bookmarks a Session, THE System SHALL record a Bookmark associating the Attendee's user ID with the Session ID, and toggle the bookmark icon to a filled/active state.
4. WHEN an Attendee removes a bookmark, THE System SHALL delete the Bookmark record and toggle the bookmark icon back to the unfilled/inactive state.
5. WHEN an Attendee views "My Bookmarks" for an Expo, THE System SHALL display only the Sessions they have bookmarked, sorted by start time.
6. THE Schedule_Page SHALL support filtering Sessions by day (when the Expo spans multiple days) and by track/tag.
7. IF an Attendee is not registered for the Expo (no `active` or `checked_in` ticket), THEN THE System SHALL display the schedule in read-only mode without bookmark controls, and display a prompt to register.
8. THE Schedule_Page SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.

---

### REQ-8: QR Check-in Scanner (Organizer/Staff)

**User Story:** As an Organizer using a staff device, I want to scan an Attendee's QR code ticket to mark them as checked in, so that I can track event attendance in real time.

#### Acceptance Criteria

1. WHEN an authenticated Organizer navigates to the Scanner page, THE System SHALL activate the `html5-qrcode` camera-based QR scanner and request camera permission from the browser.
2. IF the browser denies camera permission, THEN THE System SHALL display a clear error message explaining that camera access is required and provide instructions for enabling it in the browser settings.
3. WHEN the Scanner detects a valid QR code containing a ticket ID, THE System SHALL send a check-in request to the backend within 300ms of detection.
4. WHEN the backend receives a check-in request with a valid `active` ticket ID, THE System SHALL set the ticket status to `checked_in`, record the check-in timestamp, and return a success response containing the Attendee's full name and Expo name.
5. WHEN check-in succeeds, THE System SHALL display the Attendee's name and a green success indicator on the scanner screen for 3 seconds, then reset the scanner for the next scan.
6. IF the scanned ticket ID does not exist in the system, THEN THE System SHALL display a red error indicator with the message "Invalid ticket" and reset the scanner after 3 seconds.
7. IF the scanned ticket has status `checked_in`, THEN THE System SHALL display a yellow warning indicator with the message "Already checked in" and the original check-in timestamp, then reset the scanner after 3 seconds.
8. IF the scanned ticket has status `cancelled`, THEN THE System SHALL display a red error indicator with the message "Ticket cancelled" and prevent check-in.
9. IF the scanned ticket belongs to an Expo other than the one the Organizer has selected for this scanning session, THEN THE System SHALL display a red error indicator with the message "Wrong event" and prevent check-in.
10. THE Scanner_Page SHALL use a solid dark background with high-contrast feedback indicators — no glassmorphism effects — to ensure readability in bright outdoor or expo-floor lighting conditions.
11. THE Scanner_Page SHALL be mobile-first, with the camera viewfinder occupying the majority of the viewport on screens narrower than 768px.
12. THE Scanner_Page SHALL allow the Organizer to select which of their active Expos they are scanning for before activating the camera.
13. WHILE scanning is active, THE System SHALL prevent duplicate check-in requests for the same ticket ID within a 5-second debounce window.
14. THE check-in API endpoint SHALL respond within 500ms under normal load.
15. WHEN an Organizer navigates away from the Scanner_Page, THE System SHALL stop the camera stream and release the camera resource.

---

### REQ-9: Exhibitor Search and Filter (Attendee)

**User Story:** As an Attendee registered for an Expo, I want to search and filter Exhibitors within that Expo, so that I can find companies relevant to my interests.

#### Acceptance Criteria

1. WHEN an Attendee visits the Expo detail page, THE System SHALL display an Exhibitors section listing all approved Exhibitors for that Expo.
2. THE Exhibitor_List SHALL display for each Exhibitor: company name, company logo (if uploaded, else a placeholder), product/service category, and a brief description (truncated to 120 characters).
3. THE Exhibitor_List SHALL include a text search input that filters results by company name and description, updating results within 300ms of the user stopping typing (debounced).
4. THE Exhibitor_List SHALL include a category filter (dropdown or chip list) populated from the categories present in the current Expo's approved Exhibitors.
5. WHEN both a text search and a category filter are active simultaneously, THE System SHALL return only Exhibitors matching both criteria.
6. WHEN no Exhibitors match the active search or filter, THE System SHALL display an empty-state message.
7. IF no approved Exhibitors exist for an Expo, THE System SHALL display a message indicating exhibitors have not been confirmed yet.
8. WHEN an Attendee clicks an Exhibitor card, THE System SHALL display a detail view or modal with the full company description, logo, website link (if provided), assigned booth number, and contact information.
9. THE Exhibitor_List and detail view SHALL be accessible to unauthenticated public visitors on the public Expo detail page (REQ-1.4) as well as to authenticated Attendees.
10. THE Exhibitor_Search SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.

---

### REQ-10: Organizer Dashboard Statistics

**User Story:** As an Organizer, I want my dashboard to display meaningful statistics about my active Expos, so that I can monitor event health at a glance.

#### Acceptance Criteria

1. WHEN an Organizer views their dashboard, THE System SHALL display a summary panel showing: total number of active Expos (status `published` or `ongoing`), total registered Attendees across all active Expos, total confirmed check-ins across all active Expos, and aggregate Booth_Fill_Rate across all active Expos.
2. WHEN an Organizer selects a specific Expo from the dashboard, THE System SHALL display per-Expo statistics: total applications received, pending applications awaiting review, approved Exhibitors, rejected applications, total Attendee registrations, confirmed check-ins, and the Booth_Fill_Rate.
3. WHEN the Organizer dashboard loads, THE System SHALL fetch and render statistics within 1,500ms under normal load.
4. THE Organizer_Dashboard_Stats SHALL refresh automatically every 60 seconds while the dashboard is in view, without requiring a page reload.
5. THE Organizer_Dashboard_Stats SHALL display each metric as a BentoCard component (established in Phase 1) with a label, numeric value, and a contextual icon.
6. IF an Organizer has no active Expos, THE System SHALL display an empty-state prompt encouraging the Organizer to create their first Expo.
7. THE Organizer_Dashboard_Stats SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.

---

### REQ-11: SuperAdmin Platform Statistics

**User Story:** As a SuperAdmin, I want to view platform-wide statistics on the dashboard, so that I can monitor overall platform health.

#### Acceptance Criteria

1. WHEN the SuperAdmin views their dashboard, THE System SHALL display: total Expos on the platform (all statuses), total registered Attendees (all Expos), total Exhibitor applications (all statuses), and total check-ins platform-wide.
2. THE SuperAdmin_Dashboard SHALL display the 5 most recently created Expos with their name, Organizer name, status, and creation date.
3. THE SuperAdmin_Dashboard SHALL render using EventSphere Design_Token_System classes and support both dark and light modes.

---

### REQ-12: Non-Functional Requirements

#### Acceptance Criteria

**Performance**

1. THE System SHALL respond to all read API requests (list endpoints) within 500ms for datasets up to 10,000 records, with appropriate database indexes on Expo ID, Organizer ID, Exhibitor ID, Attendee ID, and ticket ID fields.
2. THE System SHALL respond to all write API requests (create, update, delete) within 1,000ms under normal load.
3. THE QR code generation endpoint SHALL complete within 2,000ms including ticket creation and PNG encoding.
4. THE check-in API endpoint SHALL respond within 500ms.

**Security**

5. THE System SHALL enforce role-based access control on all Phase 2 API endpoints using the `authenticate` and `authorize` middleware established in Phase 1; any request with an invalid or missing access token SHALL return HTTP 401.
6. THE System SHALL prevent an Organizer from accessing, modifying, or deleting Expos, Applications, or Sessions belonging to a different Organizer; such requests SHALL return HTTP 403.
7. THE System SHALL validate all user-supplied input (field lengths, data types, date logic) server-side on every write request, independent of client-side validation.
8. WHEN a file upload is processed, THE System SHALL validate file type by MIME type (not only file extension) and enforce size limits before uploading to Cloudinary.
9. THE check-in endpoint SHALL be restricted to authenticated users with role `organizer` only.
10. THE Ticket ID encoded in QR codes SHALL be a cryptographically random UUID (v4) to prevent enumeration attacks.

**Responsiveness and Accessibility**

11. THE System SHALL render all Phase 2 pages correctly on viewport widths from 320px to 1920px, using the responsive layout conventions established in Phase 1 (sidebar on ≥768px, bottom nav on <768px).
12. THE Scanner_Page SHALL be optimized for mobile viewports (<768px) as the primary use case, with the camera viewfinder as the dominant element.
13. ALL interactive elements (buttons, inputs, links, form controls) SHALL have visible focus indicators compliant with WCAG 2.1 AA contrast requirements.
14. ALL images uploaded to Cloudinary and displayed in the UI SHALL include descriptive `alt` text.
15. ALL form fields SHALL have associated `<label>` elements with accurate `for`/`id` bindings.

**Consistency with Phase 1**

16. THE System SHALL use the `showSuccess`, `showError`, and `showWarning` toast utilities established in Phase 1 for all user-facing success, error, and warning feedback — no `window.alert` usage.
17. ALL Phase 2 UI components SHALL exclusively use EventSphere Design_Token_System Tailwind classes (no hardcoded hex colors, no arbitrary Tailwind color utilities) and SHALL respect the active dark/light theme via the `ThemeContext` established in Phase 1.
18. ALL Phase 2 API endpoints SHALL follow the standard error response format established in Phase 1: `{ success: false, message: string, code: string }`.
19. THE System SHALL use the `asyncHandler` utility from Phase 1 to wrap all async Express route handlers in Phase 2.

**Data Integrity**

20. WHEN an Expo is archived or deleted, THE System SHALL cascade-cancel all `active` Tickets associated with that Expo and set all `pending` Applications to `rejected`.
21. THE System SHALL enforce uniqueness of booth assignments within an Expo at the database level (compound unique index on `expoId` + `boothLabel`).
22. THE Ticket ID SHALL be unique across all Tickets in the system (unique index on `ticketId`).

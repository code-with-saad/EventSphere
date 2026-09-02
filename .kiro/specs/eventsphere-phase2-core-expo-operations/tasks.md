# Tasks - EventSphere Phase 2: Core Expo Operations

## Group 1 - Backend Foundation

- [x] 1. Install new backend npm dependencies
  - [x] 1a. Install production deps: `qrcode@^1.5.4`, `pdf-lib@^1.17.1`, `cloudinary@^2.7.0`, `uuid@^11.1.0`
  - [x] 1b. Install dev deps: `@types/qrcode@^1.5.5`, `@types/uuid@^10.0.0`, `fast-check@^4.1.0`

- [x] 2. Extend `backend/src/config/env.ts` with Cloudinary env vars
  - [x] 2a. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` to the validated env config
  - [x] 2b. Add the three keys to `backend/.env` (placeholder values) and document them in `PROGRESS.md`

- [x] 3. Create `backend/src/models/Expo.model.ts`
  - [x] 3a. Define `ExpoStatus` union type and `IExpo` / `IExpoCreate` interfaces per design
  - [x] 3b. Implement `ExpoModel` class following `User.model.ts` singleton pattern; include `createIndexes()` with all four indexes (ownership, public listing, text search, _id default)

- [x] 4. Create `backend/src/models/Application.model.ts`
  - [x] 4a. Define `ApplicationStatus` union type and `IApplication` / `IApplicationCreate` interfaces per design
  - [x] 4b. Implement `ApplicationModel` class with `createIndexes()` including the partial unique index on `(expoId, boothLabel)` for REQ-12.21

- [x] 5. Create `backend/src/models/Ticket.model.ts`
  - [x] 5a. Define `TicketStatus` union type and `ITicket` / `ITicketCreate` interfaces per design
  - [x] 5b. Implement `TicketModel` class with `createIndexes()` including the unique index on `ticketId` (REQ-12.22) and the composite `(ticketId, expoId)` index for check-in lookups

- [x] 6. Create `backend/src/models/Session.model.ts`
  - [x] 6a. Define `ISession` / `ISessionCreate` interfaces per design
  - [x] 6b. Implement `SessionModel` class with `createIndexes()` for `(expoId, startTime)` and the room conflict index `(expoId, room, startTime, endTime)`

- [x] 7. Create `backend/src/models/Bookmark.model.ts`
  - [x] 7a. Define `IBookmark` / `IBookmarkCreate` interfaces per design
  - [x] 7b. Implement `BookmarkModel` class with `createIndexes()` including the unique index on `(sessionId, attendeeId)` and the `sessionId` cascade index

- [x] 8. Register all five new model `createIndexes()` calls in `backend/src/server.ts`

## Group 2 - Upload Service & Routes

- [x] 9. Create `backend/src/services/upload.service.ts`
  - [x] 9a. Implement magic-byte MIME validation: PNG (`\x89PNG`), JPEG (`\xFF\xD8`), WebP (`RIFF...WEBP`) - reject any other type with `UPLOAD_INVALID_TYPE`
  - [x] 9b. Enforce size limits by purpose: `expo_banner` â‰¤ 5 MB, `company_logo` â‰¤ 2 MB; reject with `UPLOAD_TOO_LARGE`
  - [x] 9c. Upload validated buffer to Cloudinary using the SDK; store in `eventsphere/banners` or `eventsphere/logos` folder by purpose; return `{ url, publicId }`

- [x] 10. Create `backend/src/routes/upload.routes.ts`
  - [x] 10a. `POST /api/upload/image` - `authenticate` middleware, multipart/form-data (`multer` or equivalent), call `UploadService.uploadImage()`; wrap handler in `asyncHandler`
  - [x] 10b. Register upload routes in `app.ts`: `app.use('/api/upload', uploadRoutes)`

## Group 3 - Expo Backend

- [x] 11. Create `backend/src/services/expo.service.ts`
  - [x] 11a. Implement `create()` - sets `status: 'draft'`, associates `organizerId`, validates all required field lengths and date logic (startDate in future, endDate > startDate); returns new `IExpo`
  - [x] 11b. Implement `update()` - validates ownership (403 if mismatch), applies partial field updates, re-validates date logic on any date change
  - [x] 11c. Implement `transition()` - enforces `VALID_TRANSITIONS` map; `draftâ†’published` additionally calls `validateForPublish()`; `*â†’archived` and delete go through cascade gate (checks `confirmed` flag, throws `CASCADE_CONFIRMATION_REQUIRED` 409 if counts > 0 and not confirmed)
  - [x] 11d. Implement `getCascadePreview()` - counts `active` tickets and `pending`/`approved` applications for the expo; returns `{ activeTickets, pendingApplications, approvedApplications, requiresConfirmation }`
  - [x] 11e. Implement `delete()` - validates ownership; runs cascade gate; calls `executeCascade()` if confirmed; permanently removes expo document
  - [x] 11f. Implement `listPublic()` - paginated query (max 12/page), status filter mapping (`upcoming` â†’ `published`, `ongoing` â†’ `ongoing`, `completed` â†’ `completed`), MongoDB text search on name+description; truncates description to 160 chars in returned DTO; includes `approvedExhibitorCount` via aggregation
  - [x] 11g. Implement `getPublicDetail()` - full expo document + all approved applications for exhibitor list
  - [x] 11h. Implement `listByOrganizer()` and `getExpoStats()` for organizer-scoped queries
  - [x] 11i. Implement private `validateForPublish()` - returns array of missing field names; and private `executeCascade()` - bulk-updates active tickets to `cancelled` and pending applications to `rejected`

- [x] 12. Create `backend/src/routes/expo.routes.ts`
  - [x] 12a. `GET /api/expos` (public) and `GET /api/expos/:id` (public) - call `ExpoService.listPublic()` / `getPublicDetail()`; wrap in `asyncHandler`
  - [x] 12b. `POST /api/expos` - `authenticate`, `authorize('organizer')`; call `ExpoService.create()`; wrap in `asyncHandler`
  - [x] 12c. `PATCH /api/expos/:id` and `PATCH /api/expos/:id/status` - `authenticate`, `authorize('organizer')`; ownership validated inside service; wrap in `asyncHandler`
  - [x] 12d. `GET /api/expos/:id/cascade-preview` - `authenticate`, `authorize('organizer')`; call `ExpoService.getCascadePreview()`; wrap in `asyncHandler`
  - [x] 12e. `DELETE /api/expos/:id` - `authenticate`, `authorize('organizer')`; call `ExpoService.delete()`; wrap in `asyncHandler`
  - [x] 12f. `GET /api/expos/:id/stats` and `GET /api/organizer/expos` - `authenticate`, `authorize('organizer')`; wrap in `asyncHandler`
  - [x] 12g. Register expo routes in `app.ts`: `app.use('/api/expos', expoRoutes)` and `app.use('/api/organizer', expoRoutes)`

- [x] 13. Write `backend/src/__tests__/expo.crud.test.ts`
  - [x] 13a. Test create expo: valid payload â†’ draft status + correct organizerId; missing required field â†’ 400; past startDate â†’ 400; endDate before startDate â†’ 400
  - [x] 13b. Test update expo: owner can update; non-owner gets 403
  - [x] 13c. Test status transitions: valid transition succeeds; invalid transition (e.g. `completedâ†’published`) â†’ 400 `INVALID_STATUS_TRANSITION`; publish with missing fields â†’ 400
  - [x] 13d. Test cascade gate: archive/delete with active tickets and no `confirmed` â†’ 409 `CASCADE_CONFIRMATION_REQUIRED`; with `confirmed: true` â†’ succeeds, tickets cancelled, applications rejected
  - [x] 13e. Test public listing: only `published`/`ongoing`/`completed` expos returned; pagination limits to 12; text search returns matching results

- [x] 14. Write `backend/src/__tests__/properties/expo.properties.test.ts`
  - [x] 14a. Property 1: public listing returns only visible-status expos (100 iterations)
  - [x] 14b. Property 2: description in ExpoCardDTO is always â‰¤ 160 chars (100 iterations)
  - [x] 14c. Property 3: pagination response never exceeds 12 items (100 iterations)
  - [x] 14d. Property 4: new expo always has `status=draft` and correct `organizerId` (100 iterations)
  - [x] 14e. Property 5: organizer expo list contains only own expos (100 iterations)
  - [x] 14f. Property 6: `endDate â‰¤ startDate` always rejected (100 iterations)
  - [x] 14g. Property 7: delete without `confirmed` blocked when tickets/approved applications exist (100 iterations)
  - [x] 14h. Property 20: only valid status transitions accepted (100 iterations)
  - [x] 14i. Property 22: cross-organizer access returns 403 (100 iterations)

## Group 4 - Application Backend

- [x] 15. Create `backend/src/services/application.service.ts`
  - [x] 15a. Implement `submit()` - validates expo is `published`; checks no existing `pending`/`approved` application for (exhibitorId, expoId) pair (throws `DUPLICATE_APPLICATION`); creates record with `status: 'pending'`
  - [x] 15b. Implement `edit()` - validates ownership + `status === 'pending'`; applies partial field updates
  - [x] 15c. Implement `withdraw()` - validates ownership + `status === 'pending'`; hard-deletes the application record
  - [x] 15d. Implement `approve()` - validates organizer ownership of expo; validates boothLabel is present and not already assigned in this expo (throws `BOOTH_CONFLICT`); warns if `approvedCount >= expo.totalBooths`; sets `status: 'approved'`, stores `boothLabel`
  - [x] 15e. Implement `reject()` - validates organizer ownership; sets `status: 'rejected'`, stores optional `rejectionReason`
  - [x] 15f. Implement `revokeApproval()` - validates organizer ownership; resets status to `pending`, clears `boothLabel`
  - [x] 15g. Implement `listForExpo()` - returns applications grouped by status with `boothFillRate`, `totalBooths`, `assignedBooths`
  - [x] 15h. Implement `getByExhibitorAndExpo()` and `getBoothFillRate()`

- [x] 16. Create `backend/src/routes/application.routes.ts`
  - [x] 16a. `POST /api/expos/:expoId/applications` - `authenticate`, `authorize('exhibitor')`; wrap in `asyncHandler`
  - [x] 16b. `GET /api/expos/:expoId/applications` - `authenticate`, `authorize('organizer')`; wrap in `asyncHandler`
  - [x] 16c. `GET /api/expos/:expoId/applications/mine` and `GET /api/exhibitor/applications` - `authenticate`, `authorize('exhibitor')`; wrap in `asyncHandler`
  - [x] 16d. `PATCH /api/expos/:expoId/applications/:id` (edit) and `DELETE /api/expos/:expoId/applications/:id` (withdraw) - `authenticate`, `authorize('exhibitor')`; wrap in `asyncHandler`
  - [x] 16e. `PATCH /api/expos/:expoId/applications/:id/review` - `authenticate`, `authorize('organizer')`; wrap in `asyncHandler`
  - [x] 16f. Register routes in `app.ts`: `app.use('/api/expos', applicationRoutes)` and `app.use('/api/exhibitor', applicationRoutes)`

- [x] 17. Write `backend/src/__tests__/application.flow.test.ts`
  - [x] 17a. Submit: valid â†’ 201 pending; duplicate â†’ 409; non-published expo â†’ error
  - [x] 17b. Edit: owner + pending â†’ updated; non-owner â†’ 403; approved status â†’ rejected
  - [x] 17c. Withdraw: owner + pending â†’ deleted; can reapply after withdraw
  - [x] 17d. Approve: valid boothLabel â†’ approved; duplicate boothLabel â†’ 409 `BOOTH_CONFLICT`; overfill â†’ 200 with warning
  - [x] 17e. Reject with reason; revoke approval clears boothLabel

- [x] 18. Write `backend/src/__tests__/properties/application.properties.test.ts`
  - [x] 18a. Property 8: booth labels unique within expo (100 iterations)
  - [x] 18b. Property 9: booth fill rate calculation is correct (100 iterations)
  - [x] 18c. Property 10: duplicate application for same exhibitorÃ—expo rejected (100 iterations)

## Group 5 - Ticket Backend

- [x] 19. Create `backend/src/services/ticket.service.ts`
  - [x] 19a. Implement `register()` - validates expo is `published` or `ongoing`; checks no existing `active`/`checked_in` ticket for (attendeeId, expoId) (throws `DUPLICATE_REGISTRATION`); generates UUID v4 `ticketId`; calls `generateQRPNG()`; inserts ticket; returns `TicketRegistrationResponse` with qrCodeDataUrl, expo details, and attendee name
  - [x] 19b. Implement private `generateQRPNG()` - calls `QRCode.toDataURL(ticketId, { width: 300, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } })`
  - [x] 19c. Implement `getQRCode()` - looks up ticket by ticketId, re-calls `generateQRPNG()`; returns data URL (deterministic re-render)
  - [x] 19d. Implement `generatePDF()` - validates ownership; uses `pdf-lib` to compose: expo name (heading), attendee full name, start+end dates, venue name, embedded QR PNG (via `embedPng`), ticket ID in `CourierPrime` or `Helvetica` mono; returns `Buffer`
  - [x] 19e. Implement `cancel()` - validates ownership + `status === 'active'`; sets status to `cancelled`
  - [x] 19f. Implement `processCheckIn()` - looks up ticket by ticketId; if not found â†’ `invalid_ticket`; if `cancelled` â†’ `cancelled_ticket`; if expoId mismatch â†’ `wrong_event`; if `checked_in` â†’ `already_checked_in` with original `checkedInAt`; if `active` â†’ update to `checked_in`, set `checkedInAt: new Date()`, return `checked_in` with attendee name and expo name

- [x] 20. Create `backend/src/routes/ticket.routes.ts`
  - [x] 20a. `POST /api/expos/:expoId/tickets` - `authenticate`, `authorize('attendee')`; wrap in `asyncHandler`
  - [x] 20b. `GET /api/tickets/mine` and `GET /api/tickets/:ticketId` - `authenticate`, `authorize('attendee')`; wrap in `asyncHandler`
  - [x] 20c. `PATCH /api/tickets/:ticketId/cancel` - `authenticate`, `authorize('attendee')`; wrap in `asyncHandler`
  - [x] 20d. `POST /api/tickets/checkin` - `authenticate`, `authorize('organizer')`; always returns HTTP 200 with `result` discriminator; wrap in `asyncHandler`
  - [x] 20e. `GET /api/tickets/:ticketId/pdf` - `authenticate`, `authorize('attendee')`; validates ownership; calls `TicketService.generatePDF()`; sets `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="ticket-{ticketId}.pdf"`; pipes Buffer as response; wrap in `asyncHandler`
  - [x] 20f. Register routes in `app.ts`: `app.use('/api/tickets', ticketRoutes)` and `app.use('/api/expos', ticketRoutes)` (for the registration endpoint)

- [x] 21. Write `backend/src/__tests__/ticket.checkin.test.ts`
  - [x] 21a. Register: published expo + authenticated attendee â†’ 201 with qrCodeDataUrl; completed/archived expo â†’ error; duplicate â†’ 409
  - [x] 21b. PDF: `GET /api/tickets/:ticketId/pdf` â†’ 200 with `Content-Type: application/pdf`; non-owner â†’ 403
  - [x] 21c. Check-in: active ticket â†’ `{ result: 'checked_in' }`; checked_in ticket â†’ `{ result: 'already_checked_in', checkedInAt: <original> }`; wrong expo â†’ `{ result: 'wrong_event' }`; cancelled â†’ `{ result: 'cancelled_ticket' }`; non-existent â†’ `{ result: 'invalid_ticket' }`
  - [x] 21d. Cancel: active ticket â†’ cancelled; already-cancelled â†’ error; non-owner â†’ 403

- [x] 22. Write `backend/src/__tests__/properties/ticket.properties.test.ts`
  - [x] 22a. Property 11: new ticket has `status=active` and UUID v4 format ticketId (100 iterations)
  - [x] 22b. Property 12: QR generation is deterministic - same ticketId always produces same data URL (100 iterations)
  - [x] 22c. Property 13: duplicate registration for same attendeeÃ—expo blocked (100 iterations)
  - [x] 22d. Property 18: check-in transitions `activeâ†’checked_in` with `checkedInAt > registeredAt` (100 iterations)
  - [x] 22e. Property 19: second check-in scan returns `already_checked_in` with unchanged original timestamp (100 iterations)

## Group 6 - Session & Bookmark Backend

- [x] 23. Create `backend/src/services/session.service.ts`
  - [x] 23a. Implement `create()` - validates organizer owns the expo; validates `endTime > startTime` (throws `INVALID_TIME_RANGE`); calls `checkRoomConflict()`; if conflict â†’ throws `ROOM_CONFLICT` with conflicting session data; inserts session
  - [x] 23b. Implement `update()` - validates ownership; re-validates time range; re-runs `checkRoomConflict()` excluding current session id
  - [x] 23c. Implement `delete()` - validates ownership; deletes session; bulk-deletes all bookmarks with matching `sessionId` (cascade per REQ-6.7)
  - [x] 23d. Implement `listByExpo()` - returns sessions sorted by `startTime` ascending
  - [x] 23e. Implement private `checkRoomConflict()` - query: same `expoId` + same `room` + overlapping time range (`startTime < B.endTime && endTime > B.startTime`); exclude `excludeId` if provided

- [x] 24. Create `backend/src/services/bookmark.service.ts`
  - [x] 24a. Implement `add()` - upsert on `(sessionId, attendeeId)`; idempotent
  - [x] 24b. Implement `remove()` - deleteOne on `(sessionId, attendeeId)`; no-op if not found
  - [x] 24c. Implement `listForAttendeeAndExpo()` - find bookmarks by attendeeId; join with sessions to filter by `expoId`; return sessions sorted by startTime

- [x] 25. Create `backend/src/routes/session.routes.ts` and `backend/src/routes/bookmark.routes.ts`
  - [x] 25a. Session routes: `GET /api/expos/:expoId/sessions` (`authenticate` only, any role); `POST`, `PATCH /:id`, `DELETE /:id` - `authenticate`, `authorize('organizer')`; all wrapped in `asyncHandler`
  - [x] 25b. Bookmark routes: `POST` and `DELETE /api/expos/:expoId/sessions/:sessionId/bookmarks` - `authenticate`, `authorize('attendee')`; `GET /api/expos/:expoId/bookmarks/mine` - `authenticate`, `authorize('attendee')`; all wrapped in `asyncHandler`
  - [x] 25c. Register in `app.ts`: `app.use('/api/expos', sessionRoutes)` and `app.use('/api/expos', bookmarkRoutes)`

- [x] 26. Write `backend/src/__tests__/session.schedule.test.ts`
  - [x] 26a. Create session: valid â†’ 201; `endTime â‰¤ startTime` â†’ 400 `INVALID_TIME_RANGE`; room conflict â†’ 409 `ROOM_CONFLICT` with conflicting session title
  - [x] 26b. Update session: room conflict excluding self works correctly
  - [x] 26c. Delete session: verifies all associated bookmarks are also deleted

- [x] 27. Write `backend/src/__tests__/properties/session.properties.test.ts`
  - [x] 27a. Property 14: `endTime â‰¤ startTime` always rejected (100 iterations)
  - [x] 27b. Property 15: overlapping sessions in same room rejected with conflict error (100 iterations)
  - [x] 27c. Property 16: deleting session removes all associated bookmarks (100 iterations)

- [x] 28. Write `backend/src/__tests__/properties/bookmark.properties.test.ts`
  - [x] 28a. Property 17: bookmark then remove returns session to pre-bookmarked state (100 iterations)

## Group 7 - Stats & Dashboard Backend

- [x] 29. Create `backend/src/services/stats.service.ts`
  - [x] 29a. Implement `getOrganizerDashboard()` - MongoDB aggregation: count active expos (`published`/`ongoing`) for organizer; sum attendees and check-ins across those expos; compute aggregate booth fill rate; fetch last 5 updated expos
  - [x] 29b. Implement `getExpoStats()` - per-expo: count applications by status, ticket count, check-in count, booth fill rate
  - [x] 29c. Implement `getSuperAdminDashboard()` - platform totals: total expos (all statuses), total attendees, total applications, total check-ins; 5 most recently created expos joined with organizer name from users collection

- [x] 30. Create `backend/src/routes/dashboard.routes.ts`
  - [x] 30a. `GET /api/dashboard/organizer` - `authenticate`, `authorize('organizer')`; wrap in `asyncHandler`
  - [x] 30b. `GET /api/dashboard/organizer/:expoId` - `authenticate`, `authorize('organizer')`; wrap in `asyncHandler`
  - [x] 30c. `GET /api/dashboard/superadmin` - `authenticate`, `authorize('superadmin')`; wrap in `asyncHandler`
  - [x] 30d. Register in `app.ts`: `app.use('/api/dashboard', dashboardRoutes)`

- [x] 31. Write `backend/src/__tests__/dashboard.stats.test.ts`
  - [x] 31a. Organizer dashboard: correct counts for active expos, attendees, check-ins, booth fill rate
  - [x] 31b. SuperAdmin dashboard: platform-wide totals and recent expos with organizer names

- [x] 32. Write `backend/src/__tests__/properties/cascade.properties.test.ts`
  - [x] 32a. Property 21: after archive/delete with confirmed cascade, no `active` tickets and no `pending` applications remain for that expo (100 iterations)

## Group 8 - Frontend Foundation

- [x] 33. Install frontend dependencies
  - [x] 33a. Install production dep: `html5-qrcode@^2.3.8`
  - [x] 33b. Install dev deps: `fast-check@^4.1.0`, `@fast-check/vitest@^0.2.0`

- [x] 34. Create all frontend axios service modules in `frontend/src/services/`
  - [x] 34a. `expoService.ts` - `list(query)`, `getById(id)`, `create(data)`, `update(id, data)`, `transitionStatus(id, status, confirmed?)`, `getCascadePreview(id)`, `delete(id, confirmed)`, `getStats(id)`, `listMine()`
  - [x] 34b. `applicationService.ts` - `submit(expoId, data)`, `getMine(expoId)`, `listForExpo(expoId)`, `edit(expoId, applicationId, data)`, `withdraw(expoId, applicationId)`, `review(expoId, applicationId, body)`, `listAllMine()`
  - [x] 34c. `ticketService.ts` - `register(expoId)`, `getMine()`, `getById(ticketId)`, `cancel(ticketId)`, `checkIn(ticketId, expoId)`, `downloadPDF(ticketId)` (responseType: 'blob')
  - [x] 34d. `sessionService.ts` - `list(expoId)`, `create(expoId, data)`, `update(expoId, sessionId, data)`, `delete(expoId, sessionId)`
  - [x] 34e. `bookmarkService.ts` - `add(expoId, sessionId)`, `remove(expoId, sessionId)`, `getMine(expoId)`
  - [x] 34f. `statsService.ts` - `getOrganizerDashboard()`, `getExpoStats(expoId)`, `getSuperAdminDashboard()`
  - [x] 34g. `uploadService.ts` - `uploadImage(file, purpose)` - posts multipart/form-data to `/api/upload/image`

- [x] 35. Create all custom hooks in `frontend/src/hooks/`
  - [x] 35a. `useExpos.ts` - accepts `{ organizerOnly?, query? }`; fetches and returns expo list + loading/error state
  - [x] 35b. `useApplications.ts` - accepts `(expoId, role)`; returns application list and action handlers
  - [x] 35c. `useTickets.ts` - returns attendee's own tickets
  - [x] 35d. `useSessions.ts` - accepts `expoId`; returns sessions list
  - [x] 35e. `useBookmarks.ts` - accepts `expoId`; returns bookmarked sessions
  - [x] 35f. `useOrganizerStats.ts` - fetches organizer dashboard stats immediately on mount and every 60 seconds via `setInterval`; clears interval on unmount (REQ-10.4)

- [x] 36. Register all new routes in `frontend/src/App.tsx`
  - [x] 36a. Public routes (no ProtectedRoute): `/expos` â†’ `ExpoListingPage`, `/expos/:id` â†’ `ExpoDetailPage`, `/expos/:id/schedule` â†’ `ScheduleBrowsePage`
  - [x] 36b. Organizer routes (ProtectedRoute `allowedRoles=['organizer']`): `/organizer/expos`, `/organizer/expos/new`, `/organizer/expos/:id/edit`, `/organizer/expos/:id/applications`, `/organizer/expos/:id/schedule`, `/organizer/expos/:id/booths`, `/organizer/scanner`
  - [x] 36c. Exhibitor routes (ProtectedRoute `allowedRoles=['exhibitor']`): `/exhibitor/applications`, `/expos/:id/apply`
  - [x] 36d. Attendee routes (ProtectedRoute `allowedRoles=['attendee']`): `/attendee/tickets`, `/attendee/tickets/:ticketId`

## Group 9 - Public Expo Pages

- [x] 37. Create `frontend/src/components/expo/ExpoStatusBadge.tsx`
  - [x] 37a. Color-coded status pill: `draft` (secondary text), `published` (success), `ongoing` (brand primary), `completed` (warning), `archived` (danger); uses design token classes only

- [x] 38. Create `frontend/src/components/expo/ExpoCard.tsx`
  - [x] 38a. Displays: name, description (truncated to 160 chars client-side), startDate, endDate, venueName, `approvedExhibitorCount`, `ExpoStatusBadge`; wraps in a link to `/expos/:id`; uses design token classes only; supports dark/light mode via `useTheme()`

- [x] 39. Create `frontend/src/components/exhibitor/ExhibitorCard.tsx`, `ExhibitorFilterBar.tsx`, `ExhibitorDetailModal.tsx`
  - [x] 39a. `ExhibitorCard`: company logo (with `alt` text) or placeholder, name, category, description snippet (120 chars); design token classes only
  - [x] 39b. `ExhibitorFilterBar`: text search input (debounced 300ms) + category chip/dropdown filter; design token classes only
  - [x] 39c. `ExhibitorDetailModal`: full description, logo, website link, booth number, contact info; accessible modal with focus trap; design token classes only

- [x] 40. Create `frontend/src/pages/expos/ExpoListingPage.tsx`
  - [x] 40a. Fetch `expoService.list(query)` on mount and on filter/search/page change; render `ExpoCard` grid (max 12/page)
  - [x] 40b. Status filter chips (`upcoming`, `ongoing`, `completed`); debounced text search input (300ms)
  - [x] 40c. Pagination controls (prev/next); empty-state when no results (REQ-1.7)
  - [x] 40d. Design token classes only; supports dark/light mode

- [x] 41. Create `frontend/src/pages/expos/ExpoDetailPage.tsx`
  - [x] 41a. Fetch expo by id; show name, full description, banner image (`alt` = expo name), dates, venue, category
  - [x] 41b. Approved exhibitor list with `ExhibitorFilterBar` (client-side filter); `ExhibitorDetailModal` on card click
  - [x] 41c. Schedule preview section (sessions list, read-only on this page)
  - [x] 41d. "Register for Expo" button (Attendee or unauthenticated): if not authenticated â†’ navigate to `/login?redirect=/expos/:id`; if authenticated attendee â†’ trigger registration flow
  - [x] 41e. "Apply to Exhibit" button (Exhibitor or unauthenticated): if not authenticated â†’ navigate to `/login?redirect=/expos/:id`; if authenticated exhibitor â†’ navigate to `/expos/:id/apply`; hidden if expo not `published` (REQ-3.11)
  - [x] 41f. Design token classes only; supports dark/light mode

## Group 10 - Organizer Expo Management Pages

- [x] 42. Create `frontend/src/components/expo/ExpoForm.tsx`
  - [x] 42a. Controlled form with all required fields (name, description, startDate, endDate, venueName, venueAddress, totalBooths) and optional fields (bannerUrl, websiteUrl, category, tags, venueMapUrl)
  - [x] 42b. Cloudinary banner upload: calls `uploadService.uploadImage(file, 'expo_banner')`; validates PNG/JPG/WebP, â‰¤ 5 MB client-side before upload; displays preview
  - [x] 42c. Date validation: startDate must be in future; endDate must be after startDate; field-level error messages with `<label>` bindings (REQ-12.15)
  - [x] 42d. Design token classes only; all form fields have `<label>` + `id` pairs; supports dark/light mode

- [x] 43. Create `frontend/src/components/expo/ExpoStatusTransitionButton.tsx` and `CascadeConfirmDialog.tsx`
  - [x] 43a. `ExpoStatusTransitionButton`: calls `expoService.getCascadePreview(id)` before archive/delete; if `requiresConfirmation` â†’ opens `CascadeConfirmDialog`; otherwise proceeds directly; design token classes only
  - [x] 43b. `CascadeConfirmDialog`: accessible modal displaying "X tickets will be cancelled and Y applications will be rejected"; requires explicit confirm click to proceed; cancel aborts; design token classes only

- [x] 44. Create `frontend/src/pages/organizer/MyExposPage.tsx`
  - [x] 44a. Fetch `expoService.listMine()`; render list of expo cards with `ExpoStatusBadge` and quick-action buttons: Edit, Manage Applications, Manage Schedule, Delete
  - [x] 44b. Delete action: triggers `ExpoStatusTransitionButton` cascade gate flow
  - [x] 44c. Design token classes only; supports dark/light mode

- [x] 45. Create `frontend/src/pages/organizer/CreateExpoPage.tsx` and `EditExpoPage.tsx`
  - [x] 45a. `CreateExpoPage`: renders `ExpoForm` in create mode; on submit calls `expoService.create()`; on success â†’ `showSuccess` toast + navigate to `/organizer/expos`
  - [x] 45b. `EditExpoPage`: fetches expo by id; renders `ExpoForm` pre-filled; on submit calls `expoService.update()`; includes `ExpoStatusTransitionButton` for publish/archive actions; `showSuccess` toast on save

## Group 11 - Application Pages

- [x] 46. Create `frontend/src/components/application/ApplicationStatusBadge.tsx` and `ApplicationCard.tsx`
  - [x] 46a. `ApplicationStatusBadge`: `pending` (warning), `approved` (success), `rejected` (danger); design token classes only
  - [x] 46b. `ApplicationCard`: company name, category, submission date, `ApplicationStatusBadge`; design token classes only

- [x] 47. Create `frontend/src/components/application/ApplicationForm.tsx`
  - [x] 47a. Two-step multi-page form: Step 1 - company name, description, category (predefined list), phone number; Step 2 - website URL, logo upload, note to organizer
  - [x] 47b. Progress indicator showing current step; Back button on Step 2
  - [x] 47c. Logo upload: calls `uploadService.uploadImage(file, 'company_logo')`; validates PNG/JPG/WebP, â‰¤ 2 MB; preview
  - [x] 47d. Field-level validation errors; all fields have `<label>` + `id` pairs; responsive 320pxâ€“1920px (REQ-3.12); design token classes only

- [x] 48. Create `frontend/src/pages/exhibitor/ApplicationFormPage.tsx` and `MyApplicationsPage.tsx`
  - [x] 48a. `ApplicationFormPage`: renders `ApplicationForm`; on submit calls `applicationService.submit(expoId, data)`; `showSuccess` toast on success; `showError` on `DUPLICATE_APPLICATION`
  - [x] 48b. `MyApplicationsPage`: fetches `applicationService.listAllMine()`; renders `ApplicationCard` list; for `pending` applications: shows Edit and Withdraw buttons; `WithdrawConfirmDialog` before withdraw; on withdraw calls `applicationService.withdraw()` and `showSuccess`; for `approved`: shows booth label + venue map link; for `rejected`: shows rejection reason

- [x] 49. Create `frontend/src/components/application/WithdrawConfirmDialog.tsx`, `ReviewPanel.tsx`, `BoothAssignmentModal.tsx`
  - [x] 49a. `WithdrawConfirmDialog`: accessible modal confirming withdrawal; design token classes only
  - [x] 49b. `ReviewPanel`: slide-in side panel showing full application details; action buttons: Approve, Reject, Revoke (for approved); design token classes only
  - [x] 49c. `BoothAssignmentModal`: text input for booth label (1â€“20 chars); shows current fill rate; warns if all booths filled; design token classes only

- [-] 50. Create `frontend/src/pages/organizer/ApplicationsPage.tsx`
  - [x] 50a. Fetch `applicationService.listForExpo(expoId)`; render three columns by status (`pending`, `approved`, `rejected`) with `ApplicationCard` items
  - [x] 50b. Booth fill rate progress bar at top of page (REQ-4.7); status filter and company name search (REQ-4.11)
  - [x] 50c. Clicking an application card opens `ReviewPanel`; approve action opens `BoothAssignmentModal`; all actions call appropriate `applicationService` methods and show toasts
  - [x] 50d. Design token classes only; supports dark/light mode

## Group 12 - Ticket Pages

- [x] 51. Create `frontend/src/components/ticket/QRTicketDisplay.tsx`
  - [x] 51a. Renders QR code as `<img src={qrCodeDataUrl}>` with `alt="QR code for ticket {ticketId}"`; always uses white card background with dark QR regardless of current theme (REQ-5.11); "Download PNG" button triggers `<a download>` with the data URL
  - [x] 51b. Design token classes for surrounding card; QR image itself is always high-contrast (white bg, black QR)

- [x] 52. Create `frontend/src/components/ticket/PDFDownloadButton.tsx`
  - [x] 52a. On click: calls `ticketService.downloadPDF(ticketId)` with `responseType: 'blob'`; constructs object URL; triggers programmatic `<a>` click with `download="ticket-{ticketId}.pdf"`; revokes object URL after click; shows loading state during fetch; design token classes only

- [x] 53. Create `frontend/src/components/ticket/TicketStatusBadge.tsx` and `TicketCard.tsx`
  - [x] 53a. `TicketStatusBadge`: `active` (success), `checked_in` (brand primary), `cancelled` (danger); design token classes only
  - [x] 53b. `TicketCard`: expo name, registration date, `TicketStatusBadge`, link to `TicketDetailPage`; design token classes only

- [x] 54. Create `frontend/src/pages/attendee/MyTicketsPage.tsx` and `TicketDetailPage.tsx`
  - [x] 54a. `MyTicketsPage`: fetches `ticketService.getMine()`; renders `TicketCard` list; empty state if no tickets
  - [x] 54b. `TicketDetailPage`: fetches ticket by id; renders `QRTicketDisplay`, `PDFDownloadButton`, `TicketStatusBadge`; Cancel Registration button (only for `active` tickets) calls `ticketService.cancel()` + `showSuccess` toast; design token classes only; supports dark/light mode

## Group 13 - Schedule Pages

- [x] 55. Create `frontend/src/components/session/DayTabs.tsx`, `SessionCard.tsx`, `ConflictWarning.tsx`
  - [x] 55a. `DayTabs`: renders one tab per expo day; active tab highlighted with brand primary; design token classes only
  - [x] 55b. `SessionCard`: title, speaker name, startTimeâ€“endTime, room, track badge (if set), description (if set); optional bookmark icon (toggle); design token classes only
  - [x] 55c. `ConflictWarning`: inline warning banner showing "Conflicts with: {sessionTitle} ({startTime}â€“{endTime})"; uses warning background/text tokens

- [x] 56. Create `frontend/src/components/session/SessionForm.tsx` and `ScheduleGrid.tsx`
  - [x] 56a. `SessionForm`: modal form for create/edit; all required fields + optional description/track; `endTime > startTime` client-side validation; conflict warning displayed inline if API returns `ROOM_CONFLICT`; all fields have `<label>` + `id` pairs; design token classes only
  - [x] 56b. `ScheduleGrid`: timeline-style layout of `SessionCard` items for a given day, sorted by startTime; design token classes only

- [x] 57. Create `frontend/src/pages/organizer/ScheduleBuilderPage.tsx`
  - [x] 57a. Fetch sessions via `sessionService.list(expoId)`; render `DayTabs` + `ScheduleGrid` for selected day
  - [x] 57b. "Add Session" button opens `SessionForm` modal; on submit calls `sessionService.create()`; handles `ROOM_CONFLICT` by showing `ConflictWarning`; `showSuccess` toast on create
  - [x] 57c. Edit: clicking session card opens `SessionForm` pre-filled; calls `sessionService.update()`
  - [x] 57d. Delete: confirm then calls `sessionService.delete()`; `showSuccess` toast; design token classes only; supports dark/light mode

- [x] 58. Create `frontend/src/pages/attendee/ScheduleBrowsePage.tsx`
  - [x] 58a. Fetch sessions via `sessionService.list(expoId)`; render `DayTabs` + `SessionCard` list for selected day
  - [x] 58b. Check if user has an `active`/`checked_in` ticket via `useTickets()`; if yes â†’ render bookmark icons on each `SessionCard` (toggle via `bookmarkService.add/remove()`); if no â†’ read-only with "Register to access bookmarks" prompt (REQ-7.7)
  - [x] 58c. "My Bookmarks" tab/filter showing only bookmarked sessions; day and track/tag filter controls
  - [x] 58d. Design token classes only; supports dark/light mode; no `ProtectedRoute` wrapper (public read-only access)

## Group 14 - Scanner Page

- [x] 59. Create `frontend/src/components/scanner/QRScanner.tsx`
  - [x] 59a. Mounts `html5-qrcode` scanner on a `<div id="qr-reader">`; requests camera permission on mount; if permission denied â†’ shows clear error message with instructions (REQ-8.2)
  - [x] 59b. On successful scan: calls `onScan(decodedText)` prop within 300ms; implements 5-second debounce - ignores re-scans of the same `ticketId` within the window (REQ-8.13)
  - [x] 59c. `useEffect` cleanup: calls `html5QrcodeScanner.clear()` to stop camera stream on unmount (REQ-8.15)

- [x] 60. Create `frontend/src/components/scanner/ScanResultDisplay.tsx`
  - [x] 60a. Accepts `result: 'checked_in' | 'already_checked_in' | 'invalid_ticket' | 'cancelled_ticket' | 'wrong_event' | null` prop
  - [x] 60b. `checked_in` â†’ green background (`bg-bg-success-dark`), attendee name, "âœ“ Checked In" - auto-dismisses after 3 seconds
  - [x] 60c. `already_checked_in` â†’ yellow background (`bg-bg-warning-dark`), "Already checked in" + original timestamp - auto-dismisses after 3 seconds
  - [x] 60d. `invalid_ticket` / `cancelled_ticket` / `wrong_event` â†’ red background (`bg-bg-danger-dark`), appropriate message - auto-dismisses after 3 seconds
  - [x] 60e. Design token classes only; no glassmorphism

- [x] 61. Create `frontend/src/pages/organizer/ScannerPage.tsx`
  - [x] 61a. Expo selector dropdown: fetches organizer's active expos; Organizer must select an expo before camera activates (REQ-8.12)
  - [x] 61b. Renders `QRScanner` component; on scan calls `ticketService.checkIn(ticketId, expoId)`; passes result to `ScanResultDisplay`
  - [x] 61c. Always uses `bg-bg-base-dark` for page background regardless of current theme - NOT controlled by ThemeContext (REQ-8.10); `text-text-primary-dark` for all text; camera viewfinder takes `min-h-[60vh]` on mobile < 768px (REQ-8.11)
  - [x] 61d. Mobile-first layout; no glassmorphism anywhere on this page

## Group 15 - Dashboard Updates

- [x] 62. Create `frontend/src/components/dashboard/OrganizerStatsPanel.tsx` and `ExpoStatCard.tsx`
  - [x] 62a. `OrganizerStatsPanel`: renders four `BentoCard` components (from Phase 1) for: active expo count, total attendees, total check-ins, aggregate booth fill rate; uses `useOrganizerStats()` hook (60-second auto-refresh); empty-state if no active expos (REQ-10.6); design token classes only
  - [x] 62b. `ExpoStatCard`: per-expo breakdown showing applications by status, registrations, check-ins, booth fill rate; design token classes only

- [x] 63. Update `frontend/src/pages/dashboard/OrganizerDashboard.tsx`
  - [x] 63a. Add `OrganizerStatsPanel` at top of dashboard; add link/button to "Manage Expos" (`/organizer/expos`) and "Scanner" (`/organizer/scanner`)
  - [x] 63b. Clicking an expo in the dashboard shows `ExpoStatCard` for that expo; design token classes only

- [x] 64. Update `frontend/src/pages/dashboard/SuperAdminDashboard.tsx`
  - [x] 64a. Add platform-wide stats section: total expos, total attendees, total applications, total check-ins - using `statsService.getSuperAdminDashboard()` (REQ-11.1)
  - [x] 64b. Recent expos table: 5 most recently created expos with name, organizer name, status, creation date (REQ-11.2); design token classes only

- [x] 65. Create `frontend/src/pages/organizer/BoothLayoutPage.tsx`
  - [x] 65a. Fetch approved applications for expo; display table sorted by booth label with company name and label; design token classes only (polish item - fill rate bar on ApplicationsPage covers minimum requirement)w

## Group 16 - Frontend Tests

- [ ] 66. Write `frontend/src/__tests__/components/ExpoCard.test.tsx`
  - [ ] 66a. Renders expo name, truncated description, dates, exhibitor count; snapshot test for stable rendering

- [ ] 67. Write `frontend/src/__tests__/components/QRTicketDisplay.test.tsx`
  - [ ] 67a. Renders QR image with correct `src` and `alt` text; snapshot test to detect regressions in QR display

- [ ] 68. Write `frontend/src/__tests__/components/ScanResultDisplay.test.tsx`
  - [ ] 68a. `checked_in` renders green state with attendee name; `already_checked_in` renders yellow with timestamp; error states render red with correct messages

- [ ] 69. Write `frontend/src/__tests__/components/ApplicationForm.test.tsx`
  - [ ] 69a. Step 1 fields validated before advancing to Step 2; missing required field shows field-level error; submit blocked if required fields absent

- [ ] 70. Write `frontend/src/__tests__/hooks/useOrganizerStats.test.ts`
  - [ ] 70a. Fetches on mount; sets up 60-second interval; clears interval on unmount

- [ ] 71. Write `frontend/src/__tests__/properties/expoValidation.properties.test.ts`
  - [ ] 71a. Property 2: description in ExpoCardDTO is always â‰¤ 160 chars client-side (100 iterations)
  - [ ] 71b. Property 3: paginated response array length â‰¤ 12 (100 iterations)
  - [ ] 71c. Property 6: `endDate â‰¤ startDate` always produces validation error in form (100 iterations)

- [ ] 72. Write `frontend/src/__tests__/properties/ticketLogic.properties.test.ts`
  - [ ] 72a. Property 12: QR generation utility produces same output for same ticketId input (100 iterations)
  - [ ] 72b. Property 13: duplicate registration for same expo blocked by service layer (100 iterations)

- [ ] 73. Write `frontend/src/__tests__/properties/sessionLogic.properties.test.ts`
  - [ ] 73a. Property 14: session form rejects `endTime â‰¤ startTime` for any generated time pair (100 iterations)
  - [ ] 73b. Property 15: room conflict detection flags overlapping sessions (100 iterations)

## Group 17 - Exit Criteria & Completion

- [ ] 74. Manual end-to-end smoke test: full expo lifecycle
  - [ ] 74a. Organizer creates expo (draft â†’ published); Exhibitor applies; Organizer approves with booth label; Attendee registers and downloads QR ticket; Organizer scans QR on ScannerPage; ticket shows `checked_in`
  - [ ] 74b. Verify cascade gate: attempt to archive expo with active tickets â†’ confirmation dialog appears with correct counts â†’ confirm â†’ tickets cancelled

- [ ] 75. Performance spot-checks (optional - run after smoke test passes)
  - [ ] 75a. Seed 1,000 expos; verify `GET /api/expos` responds < 500ms (REQ-12.1)
  - [ ] 75b. Verify `POST /api/expos/:expoId/tickets` (QR generation) completes < 2,000ms (REQ-12.3)
  - [ ] 75c. Verify `POST /api/tickets/checkin` responds < 500ms (REQ-12.4)

- [ ] 76. Update `PROGRESS.md`
  - [ ] 76a. Add Phase 2 completion section: what was built, new env vars (`CLOUDINARY_*`), any deviations from spec
  - [ ] 76b. Update "Next Steps" to Phase 3 (email notifications, PDF polish, lead capture, analytics)

- [ ] 77. Commit and tag Phase 2 completion
  - [ ] 77a. Stage all Phase 2 files; commit with message: `Complete Phase 2 (Core Expo Operations)`
  - [ ] 77b. Tag: `git tag v1.0.0-phase2`















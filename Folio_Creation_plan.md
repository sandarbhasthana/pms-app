# Project Plan: Bookings Enhancements, Audit, Documents, Cards, and Folio (with Stripe)

This document consolidates requirements and defines a sequenced task list. We will update task statuses as we proceed.

---

## Scope Summary

- NewBookingSheet: keep Payment; add Notes field in Add-ons tab (persisted to reservation).
- EditBookingSheet:
  - Show Reservation ID under guest name at top (muted gray, monospace/uppercase).
  - Remove Payment tab.
  - Add tabs: Notes, Cards, Documents, Reservation Log (Audit), Folio.
  - Add placeholders for Status and Actions dropdowns (top-right; no-ops initially).
- Backend:
  - Notes persistence.
  - Documents (S3) pipeline.
  - Reservation Log (audit trail).
  - Cards via Stripe (SetupIntents/PaymentMethods).
  - Folio system (transactions, mapping to Stripe Intents/Charges/Refunds).

---

## UI Plan

- Header (EditBooking):
  - Line 1: Guest Name (bold)
  - Line 2: Reservation ID (muted gray, monospace/uppercase)
  - Right side: Status dropdown (Confirmed, Confirmation Pending, Canceled, In‑House, Checked Out, No‑Show) and Actions dropdown (Change Dates, Move Room, Add Charge, Record Payment, Refund, Print/Download Folio, Send Confirmation) — placeholders now.
- Tabs (EditBooking):
  - Details, Add-ons, Notes, Cards, Documents, Reservation Log, Folio
  - Payment tab removed from Edit.
- NewBookingSheet:
  - Add Notes field in Add-ons tab and persist to reservation notes on creation.

Notes Tab:
- List notes with author/time, add note, mark important (internal notes first; guest-visible later).

Documents Tab:
- Upload via S3 pre-signed URL, list, preview (image/pdf), download, delete, tags.

Reservation Log Tab (Audit):
- Chronological audit feed (who/what/when, field diffs) from server-side logging.

Cards Tab:
- Stripe Elements to add card (SetupIntent), list cards, set default, deactivate.

Folio Tab:
- Summary (charges, taxes/fees, payments, balance), transactions list with filters, add charge/adjustment, record payment/refund (wire to Stripe in later phase).

---

## Data Model (Prisma-oriented)

Reservation (existing)
- Relations: folio?, paymentCards[], notes[], documents[], logs[]

Folio
- id, reservationId (unique), propertyId, totals, status (ACTIVE/CLOSED/DISPUTED), createdAt/updatedAt

FolioTransaction
- id, folioId, type (CHARGE, PAYMENT, REFUND, ADJUSTMENT, TRANSFER)
- status (PENDING, REQUIRES_ACTION, PROCESSING, AUTHORIZED, CAPTURED, PARTIALLY_CAPTURED, REFUND_PENDING, REFUNDED, PARTIALLY_REFUNDED, VOIDED, FAILED)
- category (ROOM_CHARGE, ROOM_TAX, RESTAURANT, MINIBAR, SPA, LAUNDRY, PARKING, CITY_TAX, SERVICE_CHARGE, CASH_PAYMENT, CARD_PAYMENT, DEPOSIT, DISCOUNT, COMP, CORRECTION, CANCELLATION_FEE, NO_SHOW_FEE, MISCELLANEOUS ...)
- description, quantity, unitPrice, taxRate, taxAmount, discountAmount, netAmount
- gateway refs: stripePaymentIntentId, stripeChargeId, stripeRefundId
- audit: userId, transactionDate, postingDate, isVoided/voidReason/voidedAt/voidedBy

GuestPaymentCard
- id, reservationId, brand, last4, expMonth/expYear, isDefault
- stripeCustomerId, stripePaymentMethodId, billingAddress, isActive

ReservationNote
- id, reservationId, noteType (INTERNAL, GUEST_REQUEST, MAINTENANCE, HOUSEKEEPING, FRONT_DESK, MANAGEMENT, BILLING), content, important, isGuestVisible, createdBy, createdAt

ReservationLog
- id, reservationId, userId, action, field, oldValue, newValue, metadata, createdAt

ReservationDocument
- id, reservationId, key/url, name, size, mime, tag, uploadedBy, createdAt

All queries enforced via property RLS (withPropertyContext/validatePropertyAccess).

---

## Stripe Integration (Answers & Mapping)

All cards and transactions go through Stripe.

Cards (Cards Tab):
- Use Stripe Elements to collect card.
- Create SetupIntent; on success, attach PaymentMethod to a Stripe Customer.
- Store only stripeCustomerId and stripePaymentMethodId + brand/last4/exp.

Payments/Deposits (Folio Tab):
- Create PaymentIntent for the amount; on_session (Elements) or off_session (saved PM).
- Optional capture_method=manual for preauth/holds; separate capture step.

Refunds:
- Create Stripe Refund against the Charge; update FolioTransaction accordingly.

Webhooks (critical for lifecycle):
- payment_intent.requires_action → REQUIRES_ACTION
- payment_intent.processing → PROCESSING
- payment_intent.succeeded → CAPTURED
- payment_intent.canceled → VOIDED
- payment_intent.payment_failed → FAILED
- charge.captured → CAPTURED (manual capture)
- charge.refunded / refund.updated → REFUND_PENDING/REFUNDED

Idempotency and reconciliation: use idempotency keys and match events to FolioTransaction by stored Stripe IDs.

Yes: PENDING (and other lifecycle statuses) are required on FolioTransaction and derived from Stripe Intent/Charge/Refund states.

---

## APIs (New/Updated)

Folio
- POST   /api/reservations/:id/folio (create if missing)
- GET    /api/reservations/:id/folio (summary + lines)
- GET    /api/folios/:id/transactions
- POST   /api/folios/:id/transactions (add CHARGE/ADJUSTMENT)
- PATCH  /api/folios/:id/transactions/:txId (allowed edits)
- POST   /api/folios/:id/payments (create PaymentIntent; returns client_secret or result)
- POST   /api/folios/:id/refunds (create refund)
- POST   /api/folios/:id/capture (capture an auth)
- POST   /api/folios/:id/void (void/cancel intent/charge if allowed)

Cards
- POST   /api/reservations/:id/cards (create SetupIntent, return client_secret)
- GET    /api/reservations/:id/cards
- PATCH  /api/reservations/:id/cards/:cardId (set default / deactivate)
- DELETE /api/reservations/:id/cards/:cardId

Notes
- GET/POST/PATCH/DELETE /api/reservations/:id/notes

Documents
- GET    /api/reservations/:id/documents
- POST   /api/reservations/:id/documents/presign
- POST   /api/reservations/:id/documents/complete
- DELETE /api/reservations/:id/documents/:docId

Logs
- GET    /api/reservations/:id/logs (paginated)
- All modifying endpoints must write ReservationLog records.

All APIs enforce property RLS (validatePropertyAccess/withPropertyContext).

---

## UI Deliverables (Incremental)

Phase 1 — Scaffolding (placeholders)
- Header: Guest name + Reservation ID; Status & Actions dropdowns (no-op).
- EditBooking tabs: Details, Add-ons, Notes, Cards, Documents, Reservation Log, Folio. Remove Payment.
- NewBooking: Add Notes field in Add-ons.

Phase 2 — Notes
- Notes CRUD backend + UI; creation notes appear in Edit Notes tab.

Phase 3 — Documents
- S3 presign + upload/list/preview/download/delete + tags.

Phase 4 — Reservation Log
- Server-side logging of PATCH/operations; UI feed with who/when/what.

Phase 5 — Cards (Stripe)
- SetupIntent + Elements; list/set default/deactivate.

Phase 6 — Folio MVP
- Models + endpoints; add charge/adjustment; totals; UI list.

Phase 7 — Folio + Stripe Wiring
- PaymentIntent/Refund flows, webhooks, real-time updates.

Phase 8 — Status & Actions
- Wire dropdowns to PATCH reservation.status; open modals for actions.

---

## Task List (to track progress)

Legend: [ ] Not started, [/] In progress, [x] Complete

0. Planning and Setup
- [ ] Draft implementation plan and tasklist (this document)

1. UI Scaffolding
- [ ] Add ReservationID under guest name in EditBookingSheet header
- [ ] Add Status and Actions dropdowns (placeholders) to header top-right
- [ ] Remove Payment tab from EditBooking
- [ ] Add new tabs in EditBooking: Notes, Cards, Documents, Reservation Log, Folio (placeholders)
- [ ] NewBookingSheet: Add Notes field in Add-ons tab (UI only)

2. Notes (Creation + Edit)
- [ ] Backend: ReservationNote model + CRUD API (RLS)
- [ ] NewBookingSheet: Persist notes on create
- [ ] EditBooking Notes tab: List/add/edit/delete notes
- [ ] Wire audit log for note operations

3. Documents (S3)
- [ ] Backend: Presign + complete endpoints, list, delete (RLS)
- [ ] EditBooking Documents tab UI
- [ ] Migrate initial ID scan to reservation documents store
- [ ] Audit logs for document ops

4. Reservation Log (Audit Trail)
- [ ] Model + API: ReservationLog with diff recording
- [ ] Hook audit in PATCH /api/reservations/[id] and related endpoints
- [ ] UI: Reservation Log tab with filters/pagination

5. Cards (Stripe)
- [ ] Model: GuestPaymentCard
- [ ] Backend: SetupIntent + PM attach + list/set default/deactivate
- [ ] UI: Cards tab — add card with Elements, list, default toggle, deactivate
- [ ] Webhooks: reflect card/payment lifecycle
- [ ] Audit: card add/remove/default changes

6. Folio MVP
- [ ] Models: Folio, FolioTransaction (+ enums/fields)
- [ ] Backend: Folio read API + add charge/adjustment
- [ ] UI: Folio tab — totals and transactions; add charge/adjustment modals
- [ ] Server-side totals math, currency/tax formatting

7. Folio + Stripe
- [ ] Payments: create/confirm PaymentIntent; update FolioTransaction
- [ ] Refunds: refund endpoint + webhook-driven updates
- [ ] Webhooks: handlers with idempotency and reconciliation
- [ ] Real-time updates: SWR mutate or channel to refresh Folio and Log

8. Status & Actions
- [ ] Status dropdown: PATCH reservation.status (with audit)
- [ ] Actions: modals for dates, room move, add charge, payment, refund, print, send confirmation
- [ ] Print/Export: basic invoice PDF from folio

9. QA and Tests
- [ ] Unit tests: APIs (validation, RLS), folio math, webhook idempotency
- [ ] Integration tests: card add → charge → webhook → folio update; refund flow; docs upload
- [ ] UI tests: tabs render, notes CRUD, documents upload, placeholders no-op

---

## Risks & Decisions

- Stripe webhooks mandatory for accurate states; handle retries + idempotency.
- Nightly room charge policy (on creation / on check-in / daily job) to confirm.
- Taxes engine per property; define taxable categories and rates.
- PCI: never store PAN/CVV; rely on Stripe tokens only.
- Enforce property isolation (validatePropertyAccess/withPropertyContext) for all endpoints.


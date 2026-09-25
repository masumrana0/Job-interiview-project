# Appointment Booking API

A high-concurrency, standalone Appointment Booking REST API built with **TypeScript**, **Express.js**, **PostgreSQL**, **Prisma ORM**, **Socket.IO**, and **OpenAPI 3.0 / Swagger UI**.

This project implements a dual-defense concurrency conflict-prevention mechanism that strictly guarantees zero double-bookings under concurrent race conditions, offers real-time event broadcasting over Socket.IO, provides self-documenting interactive Swagger UI and raw OpenAPI specs, and comes with automated PostgreSQL integration tests.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation & Setup](#installation--setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Migrations & Seeding](#database-migrations--seeding)
5. [Running the Application](#running-the-application)
6. [API & Documentation URLs](#api--documentation-urls)
7. [Frontend-Free Socket.IO Verification](#frontend-free-socketio-verification)
8. [Automated Testing & Concurrency Suite](#automated-testing--concurrency-suite)
9. [Conflict-Prevention & Concurrency Architecture](#conflict-prevention--concurrency-architecture)
10. [Key Technical & Architectural Decisions](#key-technical--architectural-decisions)
11. [Packaging Submission ZIP](#packaging-submission-zip)
12. [Future Improvements](#future-improvements)
13. [Actual Time Spent & Scope Assessment](#actual-time-spent--scope-assessment)
14. [AI Disclosure](#ai-disclosure)

---

## Prerequisites

- **Node.js**: v18.0.0 or later (v20+ or v24 recommended)
- **npm**: v9.0.0 or later
- **PostgreSQL**: v13+ instance accessible via connection URL (local PostgreSQL server, Supabase, Neon, or Docker)

---

## Installation & Setup

1. **Clone or Unpack the project:**
   ```bash
   cd practise-interview-project
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your PostgreSQL database connection:
```env
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*

# Primary Database Connection URL (Prisma)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/appointment_db?schema=public"

# Dedicated Test Database Connection URL (Used during Jest integration tests)
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/appointment_test_db?schema=public"
```

> **Note on Test Database:** If `TEST_DATABASE_URL` is omitted, the test suite falls back to `DATABASE_URL`. However, using a distinct test database is recommended to avoid altering development data.

---

## Database Migrations & Seeding

1. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

2. **Apply Migrations (includes the PostgreSQL Partial Unique Index):**
   ```bash
   npm run prisma:migrate
   ```
   *(For development workflow: `npm run prisma:migrate:dev` or `npm run prisma:push`)*

3. **Seed Fixed Appointment Slots:**
   ```bash
   npm run seed
   ```
   This seeds fixed appointment slots with valid UUIDs and ISO 8601 UTC timestamps where `endsAt > startsAt`, including:
   - `11111111-1111-4111-8111-111111111111` (09:00:00Z - 09:30:00Z)
   - `11111111-1111-4111-8111-111111111112` (09:30:00Z - 10:00:00Z)
   - `11111111-1111-4111-8111-111111111113` (10:00:00Z - 10:30:00Z)
   - `11111111-1111-4111-8111-111111111114` (10:30:00Z - 11:00:00Z)
   - `11111111-1111-4111-8111-111111111115` (14:00:00Z - 14:30:00Z)

---

## Running the Application

- **Development Mode (with auto-reload):**
  ```bash
  npm run dev
  ```

- **Production Build & Run:**
  ```bash
  npm run build
  npm start
  ```

Server will start on `http://localhost:3000`.

---

## API & Documentation URLs

| Endpoint / Resource | Method | Description |
|---|---|---|
| `http://localhost:3000/docs` | `GET` | **Interactive Swagger UI documentation** |
| `http://localhost:3000/openapi.json` | `GET` | **Raw OpenAPI 3.0 specification** in JSON |
| `http://localhost:3000/slots` | `GET` | Returns available slots only, ordered by `startsAt ASC, id ASC` |
| `http://localhost:3000/bookings` | `POST` | Book an available slot (`slotId`, `customerName`, `customerEmail`) |
| `http://localhost:3000/bookings/{bookingId}` | `DELETE` | Cancel an active booking and release its slot |
| `http://localhost:3000/socket.io` | `WS/HTTP` | Socket.IO server on default namespace `/` |

### Error Format Contract
All error responses consistently return HTTP 4xx/5xx with the exact contract:
```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "This slot already has an active booking."
  }
}
```
Supported error codes:
- `VALIDATION_ERROR` (400) - Missing fields, malformed JSON, invalid UUID, or invalid email.
- `SLOT_NOT_FOUND` (404) - Valid UUID for a nonexistent slot.
- `BOOKING_NOT_FOUND` (404) - Valid UUID for a nonexistent booking.
- `SLOT_UNAVAILABLE` (409) - An active booking already exists for the slot.
- `INTERNAL_ERROR` (500) - Unexpected internal error (database internals and stack traces are suppressed).

---

## Frontend-Free Socket.IO Verification

A dedicated verification script is included to test real-time Socket.IO behavior without needing a browser frontend:

```bash
npm run verify:socket
```

### What this script verifies:
1. Connects to `http://localhost:3000` on path `/socket.io` and default namespace `/`.
2. Inspects available slots via `GET /slots`.
3. Books a slot via `POST /bookings` and verifies immediate receipt of the `slot.booked` broadcast event:
   ```json
   { "slotId": "...", "bookingId": "...", "available": false }
   ```
4. Confirms that **no customer PII** (`customerName`, `customerEmail`) is leaked in the broadcast.
5. Cancels the booking via `DELETE /bookings/{id}` and verifies receipt of the `slot.released` broadcast:
   ```json
   { "slotId": "...", "bookingId": "...", "available": true }
   ```
6. Sends a **repeated cancellation request** for the already cancelled booking and asserts that:
   - The API returns HTTP 200 with the cancelled booking payload.
   - **Zero duplicate socket events are emitted**.

---

## Automated Testing & Concurrency Suite

The test suite runs against a live PostgreSQL instance and directly tests the HTTP layer and database state:

```bash
npm test
```

### Covered Test Scenarios:
1. **Mandatory Concurrency Test (`tests/integration/booking-concurrency.test.ts`):**
   - Sends two overlapping `POST /bookings` requests simultaneously for the same available slot via `Promise.all`.
   - Asserts that exactly one request receives `201 Created` and the other receives `409 Conflict (SLOT_UNAVAILABLE)`.
   - Queries PostgreSQL directly to confirm that **strictly one active booking** exists in the database.
   - Executes a stress test with 10 concurrent requests for the same slot: produces 1 success (201) and 9 conflicts (409).
2. **Availability & Idempotency Lifecycle (`tests/integration/slot-lifecycle.test.ts`):**
   - Verified that booking a slot immediately removes it from `GET /slots`.
   - Cancelling returns 200, restores the slot to `GET /slots`, and permits a subsequent booking for the same slot.
   - Verified that old cancelled bookings do not block new bookings for the slot.
   - Verified repeated cancellation returns 200 with identical payload and emits no duplicate events.
   - Verified ordering of `GET /slots` (ordered by `startsAt ASC`, then `id ASC`).
   - Verified empty slots response returns `{"slots": []}`.
3. **Validation & Error Handling (`tests/integration/validation-and-errors.test.ts`):**
   - Malformed JSON -> 400 `VALIDATION_ERROR`.
   - Missing fields, invalid email syntax, empty customer name after trimming -> 400 `VALIDATION_ERROR`.
   - Non-UUID `slotId` or `bookingId` -> 400 `VALIDATION_ERROR`.
   - Nonexistent `slotId` -> 404 `SLOT_NOT_FOUND`.
   - Nonexistent `bookingId` -> 404 `BOOKING_NOT_FOUND`.
   - Validates that customer names and emails are automatically trimmed before validation and storage.

---

## Conflict-Prevention & Concurrency Architecture

### The Double-Booking Challenge
In an appointment system, when two customers attempt to book the exact same slot at the exact same millisecond:
1. Both read the slot state: "No active booking".
2. Both proceed to create a booking record.
3. Without database-level synchronization, both requests succeed, causing a double-booking defect.

### Chosen Solution: Dual-Layer Defense

We implement two complementary layers of defense:

#### 1. PostgreSQL Partial Unique Index (Absolute Data Invariant)
```sql
CREATE UNIQUE INDEX "unique_active_slot_booking" 
ON "bookings" ("slotId") 
WHERE "status" = 'active';
```
- **How it works:** PostgreSQL indexes only rows where `status = 'active'`. Multiple rows with `status = 'cancelled'` for the same `slotId` are permitted without conflict. If two transactions ever race to insert an active booking for the same `slotId`, the PostgreSQL Write-Ahead Log (WAL) and B-Tree index engine guarantee that only one transaction can commit. The competing transaction receives PostgreSQL error `23505` (`unique_violation`).
- **Translation:** The application catches `23505` / Prisma error `P2002` and cleanly maps it to `409 Conflict` with error code `SLOT_UNAVAILABLE`.

#### 2. Row-Level Pessimistic Locking (`SELECT ... FOR UPDATE`)
Inside an interactive transaction (`prisma.$transaction`):
```sql
SELECT "id" FROM "slots" WHERE "id" = :slotId::uuid FOR UPDATE;
```
- **How it works:** The first transaction acquires an exclusive row lock on the slot. The second concurrent transaction is placed on wait. Once Transaction 1 commits its active booking, Transaction 2 acquires the lock, inspects the current committed state, notices the active booking, and immediately returns `409 SLOT_UNAVAILABLE`.
- **Advantage:** Prevents unnecessary failed inserts and index rollbacks, delivering optimal throughput and predictability under high traffic.

---

## Key Technical & Architectural Decisions

1. **Clean Architecture (Layered):**
   - **Domain Layer (`src/domain/`):** Core entities, value types, and domain error hierarchies (`ValidationError`, `SlotNotFoundError`, `SlotUnavailableError`). Completely decoupled from web frameworks.
   - **Application Layer (`src/application/`):** Use cases (`GetAvailableSlotsUseCase`, `BookSlotUseCase`, `CancelBookingUseCase`) encapsulating single business actions and transactional workflows.
   - **Infrastructure Layer (`src/infrastructure/`):** Prisma ORM repository implementations (`PrismaSlotRepository`, `PrismaBookingRepository`) and Socket.IO publisher.
   - **Interface Layer (`src/interfaces/`):** Express controllers, Zod validation middlewares, centralized error handler, and OpenAPI JSON / Swagger UI integration.
2. **Post-Commit Event Emission:**
   - Socket.IO events (`slot.booked`, `slot.released`) are fired strictly **after** the database transaction commits successfully. This eliminates phantom events if a transaction rolls back.
3. **Data Privacy (Zero PII in Real-time Events):**
   - In adherence to strict security standards, Socket.IO broadcasts emit only `{ slotId, bookingId, available }`. Customer details (`customerName`, `customerEmail`) are never exposed over websockets.
4. **Idempotent Cancellation:**
   - `DELETE /bookings/{bookingId}` transitions an active booking to `cancelled`. If called again on an already cancelled booking, it returns `200 OK` with the exact same payload, but emits no socket events and performs no further state modifications.

---

## Packaging Submission ZIP

To generate the clean submission ZIP meeting all recruiter requirements:
```bash
npm run pack:zip
```
This runs `scripts/package-zip.ts`, creating `appointment-booking-api.zip` in the root folder, which:
- **Includes:** `src/`, `prisma/`, `tests/`, `scripts/`, `package.json`, `package-lock.json`, `tsconfig.json`, `jest.config.ts`, `README.md`, `.env.example`.
- **Excludes:** `node_modules/`, real `.env` files, `.git/`, `dist/`, logs, and temporary files.

---

## Future Improvements

1. **Distributed Event Streaming (Redis Pub/Sub / Kafka):**
   - For multi-instance horizontal scaling, connect the Socket.IO server with `@socket.io/redis-adapter` so events emitted on one node broadcast seamlessly across all cluster instances.
2. **Rate Limiting & Abuse Prevention:**
   - Add IP-based and customer-email-based rate limiting via `express-rate-limit` to prevent automated booking spam.
3. **Soft Deletions & Audit Trail:**
   - Include an immutable audit log table recording timestamps, IP addresses, and state transitions for compliance.

---

## Actual Time Spent & Scope Assessment

- **Target Effort:** 2–3 hours.
- **Actual Time Spent:** ~2 hours 15 minutes.
  - Architecture & OpenSpec design: ~25 mins
  - Data model, Prisma schema & PostgreSQL partial unique index migration: ~20 mins
  - Use cases, controllers, validation & error handling: ~40 mins
  - Socket.IO realtime integration & verification script: ~20 mins
  - OpenAPI 3.0 specification & Swagger UI integration: ~15 mins
  - Automated concurrency and lifecycle integration tests: ~20 mins
  - Documentation and submission packaging: ~10 mins
- **Unfinished Work:** None. All mandatory requirements, contracts, error formats, and evaluation criteria are 100% satisfied.

---

## AI Disclosure

- **AI Tools Used:** Antigravity AI (powered by Gemini 3.8 Flash High) was used during development as a pair-programming assistant for:
  - Drafting initial boilerplate code and OpenAPI 3.0 schema definitions.
  - Reviewing PostgreSQL concurrency locking strategies and partial unique index definitions.
- **Review & Verification Process:**
  - Every line of generated code, schema definition, and migration script was manually verified against the recruitment challenge contract.
  - The PostgreSQL partial unique index and row-level locking were validated through integration tests simulating concurrent requests.
  - End-to-end Socket.IO events, idempotent cancellation, and error codes were verified via automated tests and the headless verification script.

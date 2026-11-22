# Leads Management System — Server (API)

Express + Mongoose REST API for the Leads Management System.

> **Status: skeleton only.** Dependencies for the API foundation are installed and the folder
> structure is in place, but there is no entry point yet, so the server cannot be started.
> The contract below — including authentication and rate limiting — is the agreed shape of
> the API. Implementation follows in the next steps; run instructions will be added once
> `src/server.js` exists.

**Implementation order:** DB connection + `Lead` model + validation → lead CRUD routes →
auth (User model, hashing, JWT) → rate limiting → API tests.

---

## 1. Environment variables

| Variable | Required | Default (dev) | Purpose |
| --- | --- | --- | --- |
| `PORT` | no | `5000` | Port the API listens on |
| `MONGO_URI` | **yes** | — | MongoDB connection string (Atlas) |
| `CLIENT_ORIGIN` | no | `http://localhost:5173` | Origin allowed by CORS |
| `NODE_ENV` | no | `development` | Enables verbose errors locally; also controls `trust proxy` |
| `JWT_SECRET` | **yes** | — | Signing key for access tokens; app refuses to start without it |
| `JWT_EXPIRES_IN` | no | `7d` | Access-token lifetime |
| `BCRYPT_ROUNDS` | no | `12` | Password hashing cost; tests override this to `4` to stay fast |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` (15 min) | Window for the general API limiter |
| `RATE_LIMIT_MAX` | no | `300` | Max requests per window, per IP, on `/api` |
| `AUTH_RATE_LIMIT_MAX` | no | `10` | Max attempts per window, per IP, on auth routes |

Secrets stay out of the repo. A committed `.env.example` with placeholder values will be
added alongside the config module; the real `.env` is git-ignored.

---

## 2. Data model — `User`

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | String | **yes** | trimmed, 1–100 chars |
| `email` | String | **yes** | valid email, lowercased, **unique** |
| `passwordHash` | String | **yes** | bcrypt hash; `select: false` so it never leaves the DB by accident |
| `createdAt` / `updatedAt` | Date | auto | Mongoose timestamps |

A plaintext password is **never** stored, logged, or returned. Hashing only — bcrypt is
one-way, so a database leak does not expose passwords.

**Password policy** (enforced on signup): 8–72 characters, at least one letter and one digit.
The 72-**byte** ceiling is bcrypt's own limit — input past it is ignored by the algorithm, so
longer passwords are **rejected** rather than silently truncated (a silent truncation means
two different long passwords could unlock the same account).

---

## 3. Data model — `Lead`

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | String | **yes** | trimmed, 1–100 chars |
| `email` | String | **yes** | valid email, lowercased, ≤254 chars |
| `phone` | String | no | trimmed, ≤30 chars, `+`, digits, spaces, `()`, `.`, `-` only |
| `company` | String | no | trimmed, ≤120 chars |
| `source` | String | no | one of the sources below, defaults to `Other` |
| `status` | String | no | one of the statuses below, defaults to `New` |
| `owner` | ObjectId → `User` | **yes** | set by the server from the token, never from the request body |
| `createdAt` / `updatedAt` | Date | auto | Mongoose timestamps |

**`source` values:** `Website`, `Referral`, `Cold Call`, `Email Campaign`, `Social Media`,
`Event`, `Other`

**`status` values:** `New`, `Contacted`, `Qualified`, `Lost` (fixed by the assignment brief)

**Indexes** — every read is scoped to one owner, so `owner` leads each compound index:

| Index | Reason |
| --- | --- |
| `{ owner: 1, status: 1, createdAt: -1 }` | The default view: one user's leads, filtered by status, newest first |
| `{ owner: 1, name: 1 }` | Name sorting and prefix lookups within a user's list |
| `{ owner: 1, email: 1 }` **unique** | Stops the same person being entered twice by the same user, while allowing different users to track the same contact |

**API representation:** documents are returned with `id` (not `_id`) and no `__v`, via a
`toJSON` transform. Clients never see Mongo internals.

---

## 4. Authentication & authorization

Custom email + password auth. **No OAuth / Google sign-in** — deliberately out of scope.

- **Signup** stores a bcrypt hash and returns a token, so the user lands logged in.
- **Login** compares the submitted password with the stored hash. Comparison uses bcrypt's
  constant-time check, and a failed login always returns the same generic message
  (`Invalid email or password`) so the API never reveals which emails are registered.
- **Tokens** are signed JWTs with the payload `{ sub: <userId> }`. The server reads the user
  id from `sub` — never from the request body.
- **Transport** is `Authorization: Bearer <token>`.
- **Protection** is a `requireAuth` middleware: it verifies the signature and expiry, then sets
  `req.user`. Missing, malformed, or expired tokens get `401`.
- **Ownership scoping** is the important part: every lead query is filtered by
  `owner: req.user.id`, and `owner` on create is taken from the token. If a client sends an
  `owner` field, it is stripped by validation and ignored — otherwise a user could write leads
  into someone else's list.
- **Failure modes stay vague on purpose:** requesting another user's lead returns **`404`,
  not `403`**, so the API does not confirm that the id exists.
- **Logout is client-side.** Tokens are stateless, so the client discards its token. A
  server-side denylist would be needed for true immediate revocation — noted under
  "What I'd improve".

**Client token storage tradeoff:** the token is returned in the JSON body and sent as a Bearer
header, which is the simplest thing that deploys cleanly across two different domains
(e.g. Vercel frontend + Render API). The safer alternative — an `httpOnly`, `Secure`,
`SameSite` cookie — removes XSS token theft, but needs cross-site cookie configuration that
adds real friction at this scope. This is a conscious tradeoff, recorded here rather than
left implicit.

---

## 5. Rate limiting & abuse protection

Brute force and request flooding are both handled with `express-rate-limit`, applied as two
separate limiters:

| Limiter | Applies to | Limit | Why |
| --- | --- | --- | --- |
| `authLimiter` | `POST /api/auth/login`, `POST /api/auth/signup` | `AUTH_RATE_LIMIT_MAX` (10) per 15 min per IP | Slow down password guessing and mass account creation |
| `apiLimiter` | all `/api` routes | `RATE_LIMIT_MAX` (300) per 15 min per IP | Blunt request flooding so one client cannot exhaust the API |

Details that matter:

- **`skipSuccessfulRequests: true` on login** — only failed attempts consume the quota, so a
  legitimate user typing their password correctly is never locked out by their own activity.
- **`429` uses the same error envelope** as every other failure, so the frontend has exactly
  one error shape to handle.
- **`app.set('trust proxy', 1)` in production.** Render/Railway terminate TLS at a proxy; without
  this the limiter sees the proxy's IP and throttles *every* user together instead of the
  offender.
- **Payload size is capped** (`express.json({ limit: '100kb' })`) so a huge body cannot be used
  to burn memory — a cheap complement to rate limiting.
- **In-memory store.** The default store is per-process and resets on restart, which is fine
  for a single instance. Horizontal scaling would need a shared store (Redis) or each instance
  would enforce its own quota.

---

## 6. Endpoints

**Public**

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Liveness + database connection state | `200` |
| `POST` | `/api/auth/signup` | Create an account, returns user + token | `201` |
| `POST` | `/api/auth/login` | Exchange credentials for a token | `200` |

**Requires `Authorization: Bearer <token>`**

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/api/auth/me` | Current user, used to restore a session on reload | `200` |
| `GET` | `/api/leads` | List **your** leads with search, filter, pagination, sorting | `200` |
| `GET` | `/api/leads/stats` | **Your** lead counts per status + total (dashboard) | `200` |
| `GET` | `/api/leads/:id` | Fetch one of your leads | `200` |
| `POST` | `/api/leads` | Create a lead owned by you | `201` |
| `PATCH` | `/api/leads/:id` | Partial update (used for status changes) | `200` |
| `DELETE` | `/api/leads/:id` | Delete one of your leads | `204` |

`GET /api/leads/stats` is declared **before** `GET /api/leads/:id` in the router so that
`stats` is never parsed as an id.

### Query parameters — `GET /api/leads`

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `search` | string | — | Case-insensitive substring over `name`, `email`, `company`; ≤100 chars |
| `status` | enum | `All` | One of the four statuses, or `All` |
| `page` | int ≥ 1 | `1` | |
| `limit` | int 1–100 | `10` | Capped to protect the API |
| `sort` | enum | `createdAt` | `name`, `email`, `company`, `status`, `createdAt`, `updatedAt` |
| `order` | `asc` \| `desc` | `desc` | |

### Request bodies

`POST /api/auth/signup` — `{ "name": "...", "email": "...", "password": "..." }`

`POST /api/auth/login` — `{ "email": "...", "password": "..." }`

`POST /api/leads` — `{ "name", "email", "phone", "company", "source", "status" }`
(`owner` is rejected/ignored; it comes from the token)

`PATCH /api/leads/:id` — any subset of the create fields; an empty body is a `400`.

---

## 7. Response shapes

Auth (`200` / `201`):

```json
{ "data": { "user": { "id": "6512...", "name": "Asha Rao", "email": "asha@example.com" }, "token": "eyJhbGci..." } }
```

List (`200`):

```json
{
  "data": [ { "id": "6512...", "name": "Asha Rao", "status": "New", "...": "..." } ],
  "meta": {
    "page": 1, "limit": 10, "total": 42, "totalPages": 5,
    "hasNextPage": true, "hasPrevPage": false
  }
}
```

Create / read / update (`200` / `201`) return the bare lead object — no envelope.

Stats (`200`) — all four statuses always present, `0` when empty, scoped to the caller:

```json
{ "data": { "total": 42, "byStatus": { "New": 10, "Contacted": 8, "Qualified": 6, "Lost": 4 } } }
```

Delete (`204`) returns no body.

### Errors

Every error uses one shape:

```json
{ "error": { "message": "Validation failed", "details": [ { "field": "email", "message": "Email must be a valid email address" } ] } }
```

`details` is present only for validation errors (`400`).

| Status | When |
| --- | --- |
| `400` | Failed validation, unknown field, invalid query param, malformed id |
| `401` | Missing, malformed, or expired token; bad login credentials |
| `404` | Unknown route, lead id does not exist, or the lead belongs to another user |
| `409` | Signup with an email that is already registered |
| `429` | Rate limit exceeded |
| `500` | Unexpected failure; internals logged, generic message returned |

---

## 8. Assumptions

- **`name` and `email` are the only required lead fields.** This is a sales tool — a lead should
  be capturable from a phone call before a company name is known. `phone`, `company` and
  `source` are validated only when provided.
- **Lead emails are unique per owner, not globally.** Two users may track the same contact;
  one user may not enter the same contact twice.
- **Search covers `email` and `company` in addition to `name`.** The brief requires search by
  name; widening it is a small UX win. Case-insensitive regex is used, which is fine at this
  scale but does not use an index — see "What I'd improve".
- **Delete is a hard delete.** No soft-delete or audit trail, as the brief does not ask for one.
- **Dates are returned as ISO 8601 strings**, so the client formats them for display.
- **Rate limits are per IP, not per account.** A distributed attacker rotating IPs would need
  per-account lockout as well; in-memory counters reset on deploy.

## 9. Open questions

- **Refresh tokens.** A single 7-day access token is simple; short-lived access tokens plus
  refresh rotation is the stronger pattern, at the cost of more moving parts.
- **Email verification.** Signup currently trusts the address. Verifying it would prevent
  typo'd accounts and fake signups.
- **Validation library** for request payloads is not yet chosen; hand-rolled validators versus
  a small schema library is a step-3 decision.

## 10. What I'd improve with more time

- Replace regex search with a MongoDB **text index** (or Atlas Search) so it uses an index and
  supports relevance ranking.
- **Refresh tokens + a token denylist**, so a stolen token can actually be revoked before it
  expires.
- **Redis-backed rate-limit store**, so limits hold across instances and survive a restart.
- **`helmet`** security headers, plus **per-account lockout** after repeated failures.
- **Soft delete + `deletedAt`** so a mis-clicked delete is recoverable.

## 11. Dependencies to add for auth and rate limiting

| Package | Purpose | Note |
| --- | --- | --- |
| `bcrypt` | Password hashing | Native module. If the native build misbehaves on a given machine, `bcryptjs` is a drop-in pure-JS alternative (slower at the same cost factor). |
| `jsonwebtoken` | Signing and verifying access tokens | |
| `express-rate-limit` | Auth and general API limiters | |

## 12. Frontend implications

- Needs **login and signup screens**, and a place to keep the token so a page reload does not
  log the user out (restored via `GET /api/auth/me`).
- Every request needs the `Authorization: Bearer <token>` header — one shared API helper
  rather than per-call headers.
- A `401` from any call means "session is gone": clear the token and send the user to login.
  This is the frontend counterpart of the `404`-not-`403` rule above.
- Forms must mirror the password policy (8–72 chars, letter + digit) so the user is not
  surprised by a server-side `400`.

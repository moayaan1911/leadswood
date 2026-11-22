# Leads Management — Server (API)

Express 5 · Mongoose 9 · MongoDB Atlas · Node 18+

The API half of LeadsWood. The React client lives in [`../client`](../client).

**Status: complete and tested** — 11 endpoints, 28 API tests passing.

---

## 1. Quick start

```bash
cd server
npm install
cp .env.example .env      # then fill MONGO_URI and JWT_SECRET
npm run dev               # nodemon → http://localhost:5000
```

Create the database user once in MongoDB Atlas, allow your IP under **Network access**, and copy the
`mongodb+srv://...` string into `.env` with the database name appended (`/leadswood`).

## 2. Commands

From the repository root:

| Command | What it does |
| --- | --- |
| `npm run dev:server` | Starts the API with nodemon |
| `npm test` | Runs the 28 API tests |
| `npm run dev` | Starts the React client |

From `server/`:

| Command | What it does |
| --- | --- |
| `npm run dev` | nodemon on `src/app.js` |
| `npm start` | plain node, for production |
| `npm test` | `vitest run` (add `--watch` for watch mode) |

## 3. Project structure

```
src/
  app.js                      entry point: middlewares, routes, DB connect, listen
  config/
    env.config.js             reads .env once, fails fast if a value is missing
    db.config.js              connect / disconnect
  controllers/
    auth.controller.js        signup, login, me, updateUser
    lead.controller.js        list, stats, get, create, update, delete
    user.controller.js        list, get, update, delete  (not mounted, see §11)
  middleware/
    auth.middleware.js        requireAuth — verifies the bearer token
    error.middleware.js       the only place an error response is rendered
    not-found.middleware.js   404 for unmatched routes
    rate-limit.middleware.js  auth limiter + general api limiter
  models/
    user.model.js             User schema
    lead.model.js             Lead schema
  routes/
    auth.routes.js            4 auth routes
    lead.routes.js            6 lead routes
    user.routes.js            user CRUD (not mounted, see §11)
tests/
  helpers.js                  memory database, test user + token
  app.test.js                 3 tests
  auth.test.js                10 tests
  lead.test.js                15 tests
```

## 4. Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGO_URI` | **yes** | — | Atlas connection string |
| `JWT_SECRET` | **yes** | — | Signs and verifies tokens (32+ characters) |
| `PORT` | no | `5000` | Port to listen on (Render/Railway set this themselves) |

The server refuses to start with a readable message if `MONGO_URI` or `JWT_SECRET` is missing.

## 5. Response shape

Every response — success or failure — uses one envelope, so the client parses one format everywhere.

```json
// success
{ "success": true, "message": "Lead created", "data": { "id": "..." } }

// list — data is the array, meta carries pagination
{ "success": true, "data": [ { "id": "..." } ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false } }

// failure
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR", "data": null,
  "errors": [ { "field": "email", "message": "Enter a valid email address" } ] }
```

`errors` appears only for validation failures. `success` is derived from the HTTP status inside the
error middleware, so the status and the flag can never disagree.

## 6. Endpoints

### Public

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `200` `{ success, message, data: { uptime, database } }` |
| `POST` | `/api/auth/signup` | `{ name, email, password }` | `201` `{ data: { user, token } }` |
| `POST` | `/api/auth/login` | `{ email, password }` | `200` `{ data: { user, token } }` |

### Requires `Authorization: Bearer <token>`

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| `GET` | `/api/auth/me` | — | `200` `{ data: user }` |
| `PATCH` | `/api/auth/me` | `{ name?, currentPassword?, newPassword? }` | `200` `{ data: { user } }` |
| `GET` | `/api/leads` | query: `search, status, page, limit, sort, order` | `200` `{ data, meta }` |
| `GET` | `/api/leads/stats` | — | `200` `{ data: { total, byStatus } }` |
| `GET` | `/api/leads/:id` | — | `200` `{ data: lead }` |
| `POST` | `/api/leads` | lead fields | `201` `{ data: lead }` |
| `PATCH` | `/api/leads/:id` | any subset of lead fields | `200` `{ data: lead }` |
| `DELETE` | `/api/leads/:id` | — | `200` `{ message: "Lead deleted" }` |

Notes:
- `PATCH /api/auth/me` updates the **name and/or password in one call** — send only what changed.
- `DELETE` answers `200` with the envelope, **not `204`**, so the client never needs a special case.
- `/api/leads/stats` is declared before `/api/leads/:id`, otherwise `stats` would be read as an id.
- Every lead query is scoped to the signed-in user. Another user's lead answers **`404`, not `403`**,
  so the API never confirms that an id exists.

### List query parameters

| Param | Default | Notes |
| --- | --- | --- |
| `search` | — | Case-insensitive match on `name`, `email` and `company` |
| `status` | `All` | `New · Contacted · Qualified · Lost`, or `All` |
| `page` | `1` | |
| `limit` | `10` | Capped at 100 |
| `sort` | `createdAt` | `name · email · company · status · createdAt · updatedAt` |
| `order` | `desc` | `asc` or `desc` |

## 7. Models

### User

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, trimmed, ≤100 |
| `email` | String | required, unique, lowercase, trimmed, valid email |
| `passwordHash` | String | required, `select: false` — never loaded unless asked for |
| `createdAt` / `updatedAt` | Date | automatic |

Index: `{ email: 1 }` unique. Documents serialise as `{ id, name, email, createdAt, updatedAt }`.

### Lead

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, trimmed, ≤100 |
| `email` | String | required, lowercase, valid email, ≤254 |
| `phone` | String | optional, ≤30, digits/space/`+`/`(`/`)`/`.`/`-` |
| `company` | String | optional, ≤120 |
| `source` | String | `Website · Referral · Cold Call · Email Campaign · Social Media · Event · Other` (default `Other`) |
| `status` | String | `New · Contacted · Qualified · Lost` (default `New`) |
| `owner` | ObjectId → User | required, **always taken from the token, never from the request body** |

Indexes:

| Index | Why |
| --- | --- |
| `{ owner: 1, status: 1, createdAt: -1 }` | The default list: one user's leads, filtered by status, newest first |
| `{ owner: 1, name: 1 }` | Name sorting inside one user's list |
| `{ owner: 1, email: 1 }` **unique** | One user cannot save the same contact twice; two users still can |

## 8. Validation rules

- **User:** name required; email required and valid; password 8–72 characters with at least one letter
  and one number. 72 is bcrypt's byte limit, so longer passwords are rejected rather than silently truncated.
- **Lead:** name and email required, email valid; phone validated only when provided; `source` and
  `status` must be one of the listed values.
- Validation failures answer `400` with one `errors[]` entry per field, and the client shows them inline.

## 9. Middleware order (in `app.js`)

```
trust proxy → cors → json body (100kb) → api limiter
→ /api/health → /api/auth → /api/leads
→ notFound → errorHandler
```

- Behind Render/Railway the proxy sends the real client IP in `X-Forwarded-For`, which is why
  `trust proxy` is set — without it the limiter would throttle all users as one.
- `errorHandler` is last and takes four arguments; Express only recognises an error handler that way.
- Errors thrown in async controllers reach it automatically in Express 5, so no `asyncHandler` wrapper
  is needed and no controller writes an error response itself.

## 10. Error codes

| Status | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid body, invalid query value, malformed ObjectId |
| 400 | `INVALID_JSON` | The request body is not valid JSON |
| 401 | `UNAUTHORIZED` | Missing, invalid or expired token; wrong login credentials |
| 404 | `NOT_FOUND` | Unknown route, or a lead/user that does not exist (or belongs to someone else) |
| 409 | `EMAIL_TAKEN` | Unique index hit — email already registered |
| 413 | `PAYLOAD_TOO_LARGE` | Body over the 100kb limit |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected failure; details are logged, the client gets a generic message |

## 11. Tests

```bash
cd server && npm test        # or: npm test from the repo root
```

```
✓ tests/lead.test.js  (15 tests)
✓ tests/auth.test.js  (10 tests)
✓ tests/app.test.js   ( 3 tests)

Test Files  3 passed (3)
     Tests  28 passed (28)
```

| File | Coverage |
| --- | --- |
| `tests/app.test.js` | Health check (including database state), unknown route returns the standard shape, broken JSON body |
| `tests/auth.test.js` | Signup (create / invalid input / duplicate email), login (correct and wrong password, one generic message), `me` with and without a token, name+password update in one call, old password stops working, wrong current password, empty update body |
| `tests/lead.test.js` | Create (including 401 without a token), validation, duplicate email per user, list (pagination meta, case-insensitive search, status filter, sort, paging), ownership isolation, `owner` in the body is ignored, update, delete then 404, stats |

How they run:

- `vitest` + `supertest` + **`mongodb-memory-server`** — tests never touch the real Atlas database.
- `vitest.config.js` sets `NODE_ENV=test`; in that mode `app.js` exports the app **without** connecting
  to MongoDB or opening a port, so `supertest` can drive it directly.
- `tests/helpers.js` starts one in-memory MongoDB per test file, clears the collections between tests,
  and mints a signed token directly so lead tests do not depend on the signup endpoint.

### Test values used by the suite

| Purpose | Value |
| --- | --- |
| Test account | `asha@example.com` / `password123` |
| Second account (isolation tests) | `other@example.com` (created directly in the database) |
| Sample lead | name `Asha Rao`, email `asha.rao@northwind.example`, phone `+91 98200 41122`, company `Northwind`, source `Referral`, status `Qualified` |

### Manual run (same values)

```bash
# create the account
curl -X POST localhost:5000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Asha Rao","email":"asha@example.com","password":"password123"}'

# copy the token from the response, then
TOKEN=<token>

curl localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"

curl -X POST localhost:5000/api/leads -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Vikram Menon","email":"vikram@brightlayne.example","phone":"+91 98450 21188","company":"Brightlayne","source":"Website","status":"New"}'

curl "localhost:5000/api/leads?search=vikram&sort=name&order=asc" -H "Authorization: Bearer $TOKEN"
curl localhost:5000/api/leads/stats -H "Authorization: Bearer $TOKEN"
curl localhost:5000/api/nope
```

## 12. Rate limiting

| Limiter | Applies to | Limit |
| --- | --- | --- |
| `authLimiter` | `POST /api/auth/signup`, `POST /api/auth/login` | 10 requests / 15 min per IP, successful ones not counted |
| `apiLimiter` | everything under `/api` | 300 requests / 15 min per IP |

Both hand their `429` to the error middleware, so a rate-limited request answers with the same envelope
as everything else. The counters live in memory: they reset on restart, and a multi-instance deployment
would need a shared store (Redis) to enforce one quota across instances.

## 13. Known gaps

- `src/controllers/user.controller.js` and `src/routes/user.routes.js` exist but are **not mounted** —
  user CRUD is not part of the brief and the client never calls it. They should be removed before submission.
- The rate limiter has no automated test (an in-memory store plus hundreds of requests would make the
  suite slow and flaky); its behaviour was verified manually.
- `cors()` currently allows every origin. Before deploying, it should be restricted to the frontend URL.

## 14. Assumptions and what I would improve

- **`name` + `email` are the only required lead fields.** A lead should be capturable from a phone call
  before a company name is known.
- **Lead emails are unique per owner, not globally.** Two users may track the same contact.
- **Search also covers `email` and `company`** beyond the required name search. It uses an escaped regex,
  which is fine at this scale but does not use an index.
- **Delete is a hard delete.** No soft delete or audit trail — the brief does not ask for one.
- With more time: a text index (or Atlas Search) for search; refresh tokens plus a revocation list;
  a Redis-backed rate-limit store; `helmet` security headers; and per-account lockout after repeated
  failed logins.
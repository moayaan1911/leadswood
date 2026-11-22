# LeadsWood

A small, complete lead manager: capture a lead, move it through a pipeline, and find it again in a
keystroke. A mini project built end to end — API, database, tests and a live demo.

![LeadsWood](client/public/og-image.jpg)

**Live demo:** https://leadswood.vercel.app/ · **API:** https://leadswood.onrender.com ·
**API contract:** [server/README.md](server/README.md)

> The API runs on Render's free tier, so it sleeps when idle and the first request can take ~30
> seconds. The client is on Vercel and loads immediately.

---

## 1. What it does

| Requirement | Where it lives |
| --- | --- |
| Add a lead: name, email, phone, company, source dropdown, status | `POST /api/leads` + the add-lead slide-over |
| List all leads in a table with the status shown clearly | `GET /api/leads` + the dashboard table, each row carrying a labelled status dot |
| Edit a lead and update its status | `PATCH /api/leads/:id`; clicking a status cell opens the edit panel with the status select already focused |
| Delete a lead, with a confirmation step | `DELETE /api/leads/:id` + a dark confirm dialog where **cancel** holds focus |
| Search / filter by name or status | `GET /api/leads?search=&status=`; the counts strip doubles as the status filter |
| Validation on the frontend **and** the backend | The same email rule and the same 10-digit phone rule run on both sides |

**Also included:**

- **Authentication** — bcrypt-hashed passwords and JWT access tokens, so each account only ever sees
  its own leads
- **Pagination and sorting** — `page`, `limit`, `sort` and `order` on the list endpoint
- **Counts per status** — `GET /api/leads/stats` feeding the dashboard strip
- **28 API tests** — vitest + supertest against an in-memory MongoDB
- **A read-only profile preview** with an Edit mode for the name and the password

## 2. Tech stack, and why

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | **React 19 + Vite** | A stack I am productive in. Vite keeps the dev loop instant, and the app is small enough that no meta-framework is needed. |
| Styling | **Tailwind CSS 4** | One stylesheet of design tokens plus utility classes; no runtime CSS-in-JS and no `tailwind.config.js` in v4. |
| Backend | **Express 5** | The team's stack. Express 5 forwards async errors to the error middleware automatically, so no `asyncHandler` wrapper is needed anywhere. |
| Database | **MongoDB Atlas + Mongoose** | The free tier means no local database to install, and documents map cleanly onto leads. Lead documents are owner-scoped with compound indexes. |
| Auth | **bcrypt + jsonwebtoken** | Passwords are **hashed**, never encrypted — hashing is one-way, so a database leak does not expose them. Tokens carry only the user id. |
| Tests | **vitest + supertest + mongodb-memory-server** | Tests run against a real MongoDB engine, never the real database, and need no local database or setup. |

**Design language:** a warm beige and brown palette (ink `#3B2A20` on canvas `#FAF6EF`, ~11:1
contrast), Orbitron for display type and Share Tech Mono for everything else, hairlines instead of
cards, and a blinking cursor that ties the landing page to the terminal feel. Status colours are
deliberately outside the brown family so a status never blends into the page.

## 3. Run it locally

Prerequisites: **Node 18+** and a MongoDB connection string (the free Atlas tier works).

```bash
# 1. install (three package manifests: root tooling, client, server)
npm install
npm install --prefix client
npm install --prefix server

# 2. configure the API
cp server/.env.example server/.env
#    then fill in MONGO_URI and JWT_SECRET (see server/README.md §4)

# 3. start the API and the client together
npm run dev
```

Then open **http://localhost:5173**. The API listens on **http://localhost:3000**, and Vite proxies
`/api` to it, so there is no CORS step in development.

Other commands, from the repository root:

| Command | What it does |
| --- | --- |
| `npm run dev` | API and client together |
| `npm run dev:server` | API only (nodemon) |
| `npm run dev:client` | client only |
| `npm test` | the 28 API tests |
| `npm run build` | production build of the client |
| `npm run lint` | lint the client |

> **Port note:** the API runs on `3000`. On macOS, port `5000` is held by the AirPlay Receiver, which
> answers `403` — that is why the default is not 5000.

## 4. Project structure

```
leadswood/
├── client/                     React app (see client/README.md)
│   ├── public/                 icons, banner, og-image, robots.txt, sitemap.xml, llms.txt
│   └── src/
│       ├── api/                one fetch helper + the calls to the API
│       ├── components/         table, form panel, confirm dialog, profile, counters, badge, toast
│       ├── constants/          status and source lists, shared with the forms
│       ├── hooks/              panel keys (Escape + focus trap) and per-page titles
│       └── pages/              Home, Login, Dashboard
└── server/                     Express API (see server/README.md)
    ├── src/
    │   ├── config/             env + database connection
    │   ├── controllers/        auth, leads
    │   ├── middleware/         auth, error, not-found, rate limiting
    │   ├── models/             User, Lead
    │   └── routes/             auth, leads
    └── tests/                  3 test files + helpers
```

## 5. API at a glance

Eleven endpoints. Every response — success or failure — uses one envelope, so the client parses one
shape everywhere:

```json
{ "success": true,  "message": "Lead created", "data": { "id": "..." } }
{ "success": false, "message": "Validation failed", "code": "VALIDATION_ERROR", "data": null,
  "errors": [ { "field": "email", "message": "Enter a valid email address" } ] }
```

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | liveness + database state |
| `POST` | `/api/auth/signup` · `/login` | — | create an account, or sign in |
| `GET` · `PATCH` | `/api/auth/me` | token | current user; update name and/or password |
| `GET` | `/api/leads` | token | list with search, status filter, sorting, pagination |
| `GET` | `/api/leads/stats` | token | counts per status |
| `GET` · `POST` | `/api/leads` · `/api/leads/:id` | token | read, create |
| `PATCH` · `DELETE` | `/api/leads/:id` | token | update, delete |

The full contract — validation rules, indexes, error codes, rate limits — is in
[server/README.md](server/README.md).

## 6. Database design in one paragraph

`User` holds a name, a unique lowercased email and a bcrypt hash that is never loaded by default.
`Lead` holds the six lead fields plus an `owner` reference that is always taken from the
token — never from the request body. Indexes follow the queries: `{owner, status, createdAt}` for the
default list, `{owner, name}` for sorting, and a unique `{owner, email}` so one user cannot store the
same contact twice while two users still can.

## 7. Security choices worth naming

- Passwords are hashed with bcrypt and the hash is `select: false`; no response ever contains it.
- Login failures always answer with the same message, so the API never reveals which emails exist.
- Another user's lead answers **404, not 403**, so the API never confirms that an id exists.
- CORS is restricted to `CLIENT_ORIGIN`, the JSON body is capped at 100kb, and auth routes are rate
  limited to 10 attempts per 15 minutes (successful logins do not count).

## 8. Assumptions

- **`name` and `email` are the only required lead fields.** A lead should be capturable from a phone
  call, before a company name is known. Phone is optional, and exactly 10 digits when given.
- **Lead emails are unique per owner, not globally.** Two salespeople may track the same contact.
- **Search also covers email and company** beyond the required name search.
- **Delete is a hard delete** — no soft-delete or audit trail, which a tool this size does not need.

## 9. What I would improve with more time

- Replace the regex search with a MongoDB text index (or Atlas Search) so it uses an index and ranks
  by relevance.
- Refresh tokens plus a revocation list, so a stolen token can be cut short before it expires.
- A Redis-backed rate-limit store, so limits hold across instances instead of per process.
- `helmet` security headers and per-account lockout after repeated failed logins.
- Soft delete with `deletedAt`, and a keyboard-driven command palette for the table.

## 10. Note

Two things I'm happiest with: every endpoint answers the same response envelope and every error
passes through a single middleware, so the frontend has exactly one shape to parse; and owner
scoping where another user's lead answers 404 rather than 403, so the API never confirms an id
exists. The trickiest part was keeping client and server validation in step — the same email rule and
the same 10-digit phone rule now live on both sides.

## 11. How it was built

The commit history is the work log: repo and API contract first, then the landing page and login,
then the dashboard against a mock API, then the real backend with tests, then the switch to the real
API, and finally the polish, CORS tightening and SEO. Each commit is a step that stands on its own.
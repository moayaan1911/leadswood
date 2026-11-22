# LeadsWood — client

The React frontend. It talks to the Express API in [`../server`](../server); the API contract lives in
[`../server/README.md`](../server/README.md), and the project overview is in the
[root README](../README.md).

**Deployed:** https://leadswood.vercel.app/ — the API it calls lives at
https://leadswood.onrender.com/api

![LeadsWood](../client/public/og-image.jpg)

## Run it

From the repository root, `npm run dev` starts this app and the API together. To run only the client:

```bash
npm run dev            # from the repo root
# or
cd client && npm run dev
```

Open **http://localhost:5173**. The API is expected on **http://localhost:3000**; Vite forwards
`/api` there (see `vite.config.js`), so requests are same-origin in development and CORS is never in
the way.

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | no | `/api` | Base URL of the API. Leave it unset locally (the proxy handles it); set it to the deployed API URL when hosting the client on its own, e.g. `https://leadswood-api.onrender.com/api` |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build locally |
| `npm run lint` | oxlint |

## Structure

```
src/
├── api/           one fetch helper that unwraps the API envelope, plus the auth and lead calls
├── components/    lead table, add/edit slide-over, delete dialog, profile panel,
│                  status counters, status label, toast
├── constants/     the status and source lists shared by the form and the table
├── hooks/         usePanelKeys (Escape + focus trap) and usePageTitle
├── pages/         Home, Login, Dashboard
├── App.jsx        routes: /, /login, /dashboard
└── index.css      design tokens (colours, type, animations) and Tailwind
```

## Notes

- **All network access goes through `src/api/client.js`.** It adds the bearer token, unwraps
  `{ success, data, meta }`, and turns a failure into one `ApiError` carrying `message`, `code` and
  field `errors`. No component calls `fetch` directly.
- **A `401` anywhere means the session is gone**: the dashboard clears the stored session and sends
  the visitor back to `/login`.
- **The token lives in `localStorage`** (`src/api/session.js`). That is the simplest thing that
  deploys cleanly across two domains; the safer alternative is an `httpOnly` cookie, which needs
  cross-site cookie configuration that is out of scope here.
- **Design language:** beige canvas, dark brown ink, Orbitron for display type and Share Tech Mono for
  the rest. Status colours sit outside the brown family on purpose. All motion is disabled under
  `prefers-reduced-motion`.
- **SEO/GEO:** `index.html` carries the meta tags, Open Graph and Twitter cards, and a JSON-LD
  `WebSite` + `SoftwareApplication` graph; `public/` carries `robots.txt` (with an AI-crawler
  allowlist), `sitemap.xml` and `llms.txt`. Each page sets its own document title.
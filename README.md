# ProductPulse

Customer feedback, voting and public roadmap SaaS demo. React, TypeScript, Vite, Tailwind CSS, React Router, Axios, JSON Server and Recharts.

## Run locally

```bash
npm install
npm run dev        # JSON Server on :3001 + Vite on :5173
npm run reset-db   # restore the original demo data
```

Copy `.env.example` to `.env` if the API runs somewhere else (`VITE_API_URL`).

## Demo accounts (password `password123`)

| Email | Acme Cloud | Nimbus Notes |
| --- | --- | --- |
| alice@acme.test | Owner | Customer |
| bob@acme.test | Admin | none |
| carol@acme.test | Product manager | Product manager |
| dave@acme.test | Customer | Owner |
| erin@acme.test | Customer (invited) | Admin |

Acme Cloud is on the Free plan and close to its limits, so you can see the usage warnings. Owners can upgrade it on the Subscription page. The public roadmap is at `/roadmap/acme-cloud` and `/roadmap/nimbus-notes`.

## Structure

- `db.json`: all mock data (reset from `db.seed.json`). Every workspace-owned record carries a `workspaceId`.
- `src/api`: Axios client, generic CRUD helpers, vote toggle and cascade deletes.
- `src/context`: auth session and active workspace (role and plan come from `workspaceMembers` and `workspaceSubscriptions`).
- `src/permissions.ts`: the role to capability table that drives navigation and route guards.
- `src/pages`: one file per page.

## Deploying

The frontend is static (`npm run build`, output `dist`). `public/_redirects` handles SPA routing on Netlify. JSON Server needs a Node host, so deploy `db.json` with `json-server` somewhere (Render, Railway) and set `VITE_API_URL` at build time.

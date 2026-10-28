# PakPOS Admin

Web panel for the PakPOS owner: businesses, subscriptions, payments, plans, offline licenses, support settings, admin users and the audit log.

Next.js (App Router) + TypeScript + Tailwind. It talks **only** to the backend's `/platform/*` APIs.

## How it works

- The browser never calls the backend directly. Every call goes to `/api/proxy/platform/...`, a Next route handler that reads the **httpOnly** session cookie and forwards it as `Authorization: Bearer`. The token is never visible to browser JavaScript and never stored in localStorage.
- Login: email + password + 6-digit code → `POST {API}/platform/auth/login` → token stored in the cookie (`SameSite=Strict`, `Secure` in production).
- Session: 30 minutes idle. The cookie is renewed on every request; the page also signs out after 30 idle minutes. Any `401` signs the admin out.
- CSRF: `SameSite=Strict` cookie, plus every state-changing request must carry `X-Requested-With: pakpos-admin` and a same-origin `Origin`.
- Headers: nonce-based CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, no-referrer, Permissions-Policy (see `src/middleware.ts`, `next.config.mjs`).

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | yes | Backend base URL, no trailing slash, e.g. `https://api.example.com`. Not a secret. Read on the server only (the browser only talks to this site). |
| `COOKIE_SECURE` | no | `false` only for local `http` development. Defaults to secure in production. |
| `PORT` | no | Default `3100`. Railway sets it. |

There are no secrets in the client bundle.

## Run locally

```bash
cp .env.example .env.local     # set NEXT_PUBLIC_API_BASE; add COOKIE_SECURE=false for http
npm install
npm run dev                    # http://localhost:3100
npm test                       # unit/component tests
npm run lint                   # type check
npm run build && npm start     # production mode
```

## Deploy on Railway

1. Push this folder as its own repo and create a Railway project from it. Railway detects the `Dockerfile`.
2. Under **Variables** add `NEXT_PUBLIC_API_BASE` (your backend URL). Railway passes variables to Docker builds as build args, so no extra step is needed.
3. Deploy. Railway provides `PORT`; the container listens on it. Add a custom domain if you want one (HTTPS is automatic).
4. On the backend, make sure the admin accounts exist and that its CORS settings are not needed (calls come from this server, not the browser).
5. Open the site, sign in with email, password and the 6-digit code.

Or with Docker directly:

```bash
docker build --build-arg NEXT_PUBLIC_API_BASE=https://api.example.com -t pakpos-admin .
docker run -p 3100:3100 -e NEXT_PUBLIC_API_BASE=https://api.example.com pakpos-admin
```

## Backend contract

All shapes live in `src/lib/types.ts` and all paths in `src/lib/api.ts`. If the backend differs, change only those two files (and the login/session handlers in `src/app/api/auth/*`).

| Area | Calls |
|---|---|
| Auth | `POST /platform/auth/login` `{email,password,totp_code}` → `{access_token, token_type, expires_in, admin}`; `POST /platform/auth/refresh` (keep-alive, returns a fresh token); `POST /platform/auth/logout`; `GET /platform/me` |
| Dashboard | `GET /platform/dashboard` |
| Businesses | `GET /platform/businesses?search&status&sort&order&page&page_size`; `GET /platform/businesses/{id}`; `POST …/payments` `{amount_pkr, method, reference?, period_months, note?}`; `PATCH …/subscription` `{plan_id?, status?, extend_days? | subscription_ends_at?}` (extend days and change plan); `POST …/suspend`, `…/activate`, `…/notes` |
| Plans | `GET/POST /platform/plans`; `PUT /platform/plans/{id}`; `POST …/enable`, `…/disable` |
| Licenses | `GET/POST /platform/licenses`; `POST …/{id}/revoke`, `…/transfer`, `…/extend-updates`; `GET …/{id}/file` (license.txt) |
| Settings | `GET/PUT /platform/settings`; `GET/POST /platform/admins`; `POST …/{id}/enable`, `…/disable`, `…/reset-2fa` |
| Audit | `GET /platform/audit?admin&action&entity_type&date_from&date_to&page` |

Errors are read from `{ "detail": "..." }`. This matches the backend's Phase 3 `/platform/*` API.

## Pages

`/login`, `/` (dashboard), `/businesses`, `/businesses/[id]`, `/plans`, `/licenses`, `/audit`, `/settings`.

## Structure

```
src/app/(app)/…        protected pages (dashboard, businesses, plans, licenses, audit, settings)
src/app/login          sign-in page
src/app/api/auth/*     login / logout / session route handlers (cookie handling)
src/app/api/proxy/…    authenticated pass-through to /platform/*
src/components/        ui kit, Shell, forms, IdleGuard, AuditTable
src/lib/api.ts         the one typed API client
src/lib/types.ts       contract types
src/middleware.ts      route protection + CSP
tests/                 login, record payment, route protection, CSRF
```

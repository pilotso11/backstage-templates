# API Endpoints + Frontend Integration Design

## Overview

Replace the placeholder `/api/hello` and `/api/whoami` endpoints with a functional calculator API, user identity endpoint, and permission-checked admin endpoint. Implement corresponding frontend pages in all three frameworks (React, Lit, Vanilla TS).

## Backend API

### Endpoints

| Endpoint | Method | Request Body | Response | Auth Required |
|----------|--------|-------------|----------|---------------|
| `GET /api/user` | GET | — | `{name: string, email: string, authenticated: bool}` | Reads OAuth2 headers |
| `POST /api/compute` | POST | `{a: number, op: string, b: number}` | `{a: number, op: string, b: number, result: number}` | None |
| `GET /api/admin/users` | GET | — | `{authorized: bool, users: string[]}` | Checks authorized_users.json |
| `GET /healthz` | GET | — | `{status: "ok"}` | None (unchanged) |

### Compute Operations

- `add`: a + b
- `sub`: a - b
- `mul`: a * b
- `div`: a / b (400 on division by zero)
- `pow`: a ^ b

Invalid `op` returns 400 with `{error: "invalid operation"}`.

### Permission Model

- `authorized_users.json` ships in the repo root of each backend as `["dev@example.com"]`
- Loaded at startup (or on each request for simplicity)
- `/api/admin/users` checks if current user's email is in the list
- Returns `{authorized: true/false, users: [...]}` — the list is always returned so the admin page can display it
- This is a placeholder for future group membership / external service lookup

### OpenAPI Documentation

- Go Fiber: swaggo annotations on all handlers, served at `/swagger/*`
- FastAPI: built-in at `/docs` and `/openapi.json`

## Frontend

### Page 1 — Main (Calculator + User Info)

- On load: `GET /api/user` → display user name/email in header
- Calculator form: two `<input type="number">`, `<select>` for operation, submit button
- On submit: `POST /api/compute` → display result
- Link to Admin page in the header/nav

### Page 2 — Admin (Protected)

- On load: `GET /api/admin/users` → check `authorized` field
- If authorized: display the user list
- If not authorized: display "Access Denied" with the user's email
- Back link to main page

### Routing

- React: `useState<"main" | "admin">` page toggle (no router dependency)
- Lit: reactive property `page` in root component
- Vanilla TS: hash-based routing (`#/admin`) with `hashchange` listener

### Styling

- Tailwind CSS (already configured in all three frontends)
- Clean, minimal layout — focused on demonstrating the API integration

## Catalog Integration

Add an API entity to `catalog-info.yaml.njk` so Backstage discovers the OpenAPI spec:

```yaml
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: ${{ values.name }}-api
  description: ${{ values.description }} API
spec:
  type: openapi
  lifecycle: experimental
  owner: ${{ values.owner }}
  definition:
    $text: <url-to-openapi-spec>
```

## Files Changed

### Backend (Go Fiber)
- `main.go.njk` — replace `/api/hello` + `/api/whoami` with `/api/user`, `/api/compute`, `/api/admin/users`
- `auth.go.njk` — update `AuthUser` struct to include `Authenticated` field
- `admin.go.njk` — new file: admin handler + authorized_users.json loader
- `compute.go.njk` — new file: compute handler with validation
- `authorized_users.json` — new file: `["dev@example.com"]`
- `main_test.go.njk` — update tests for new endpoints
- `go.mod.njk` — no new dependencies needed

### Backend (FastAPI)
- `main.py.njk` — replace `/api/hello` + `/api/whoami` with new endpoints
- `auth.py.njk` — update `AuthUser` to include `authenticated` field
- `admin.py.njk` — new file: admin handler + user list loader
- `compute.py.njk` — new file: compute handler with Pydantic models
- `authorized_users.json` — new file: `["dev@example.com"]`
- `test_main.py.njk` — update tests for new endpoints

### Frontend (React)
- `App.tsx.njk` — full rewrite: calculator UI, user display, page routing
- `App.test.tsx.njk` — update tests

### Frontend (Lit)
- `app-root.ts.njk` — full rewrite: calculator UI, user display, page routing
- `app-root.test.ts.njk` — update tests

### Frontend (Vanilla TS)
- `app.ts.njk` — full rewrite: calculator UI, user display, hash routing
- `app.test.ts.njk` — update tests
- `index.html.njk` — may need minor updates

### Common
- `catalog-info.yaml.njk` — add API entity
- `Dockerfile.njk` — ensure `authorized_users.json` is copied

## No Changes Required

- Template parameters (no new params)
- Flux manifests / registerWithFlux action
- Vite configs (proxy already set up)
- CI/CD workflows
- Makefile
- devcontainer config

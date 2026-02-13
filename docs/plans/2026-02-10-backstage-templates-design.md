# Backstage Templates Design
**Date:** 2026-02-10
**Status:** Approved

## Overview

A composable Backstage software template that scaffolds new full-stack application repos on GitHub. Generated repos follow the patterns established by `pilotso11/llmproxy` and `pilotso11/verifai`: Go/Python backend serving Bun/Vite frontend static files, multi-arch Docker, auto-committing coverage badges, and OpenAPI docs.

---

## Repo Structure

### This repo: `backstage/templates`
Template definitions only.

```
templates/
└── app/
    ├── template.yaml        ← Backstage scaffolder template definition
    └── skeleton/            ← files rendered into generated repos
catalog-info.yaml            ← registers templates with Backstage
docs/plans/                  ← design + implementation docs
```

### New repo: `backstage/config`
Backstage application deployment.

```
app-config.yaml              ← Backstage config (integrations, catalog, auth)
app-config.local.yaml.example
Dockerfile                   ← Docker-ready for self-hosting
packages/
  app/                       ← Backstage frontend
  backend/                   ← Backstage backend
catalog/
  all.yaml                   ← points at template repos
```

The Backstage config repo reads secrets from environment at runtime:
- `GITHUB_TOKEN` — PAT (migrate to GitHub App later)
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

---

## Template Wizard Parameters

Single composable template with the following inputs:

| Parameter | Type | Description |
|---|---|---|
| `name` | string | Repo name; also used as `CLAUDE_CODE_TASK_LIST_ID` |
| `description` | string | Repo description |
| `owner` | string | GitHub user/org where repo is created |
| `frontend` | enum | `none` \| `react` \| `lit` \| `typescript` |
| `backend` | enum | `none` \| `gofiber` \| `fastapi` |
| `dockerhub_org` | string | Pre-filled from `DOCKERHUB_USERNAME` env var |

### Backstage Scaffolder Actions (post-form)
1. Render skeleton files (conditional on `frontend`/`backend` selections)
2. Create **private** GitHub repo under `owner`
3. Add `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN` as GitHub Actions secrets
4. Enable branch protection on `main` (require PR + passing checks, no direct push)
5. Register new component in Backstage catalog

### Future Extension
A `deploy.yml` stub is included in the skeleton for future automated deployment wiring.

---

## Generated Repo Structure

Full-stack example (`react` + `gofiber`):

```
my-app/
├── .devcontainer/
│   └── devcontainer.json       ← image: pilotso11/fullstack-devc:dev
│                                  postStartCommand: source ./setup.sh
├── .github/workflows/
│   ├── build.yml               ← lint + build + test + coverage badge commit
│   ├── docker.yml              ← multi-arch build + push to DockerHub
│   └── deploy.yml              ← stub (TODO: configure deployment target)
├── frontend/                   ← only present if frontend != none
│   ├── src/
│   │   └── main.{tsx,ts}       ← React / Lit / TS entry point
│   ├── index.html
│   ├── vite.config.ts          ← /api proxied to backend in dev
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   └── package.json            ← bun runtime
├── backend/                    ← only present if backend != none
│   ├── main.go / main.py       ← entry point with OpenAPI setup
│   ├── go.mod / requirements.txt
│   ├── Makefile (backend-specific targets)
│   └── docs/                   ← swaggo generated (Go only)
├── Dockerfile                  ← multi-stage (see Docker section)
├── docker-compose.yml          ← local dev: hot reload for both frontend + backend
├── Makefile                    ← root Makefile (delegates to frontend/backend)
├── setup.sh                    ← exports CLAUDE_CODE_TASK_LIST_ID=<name>
└── README.md                   ← includes coverage badge placeholder
```

Frontend-only: drops `backend/`, Dockerfile is a simple nginx/static serve.
Backend-only: drops `frontend/`, Dockerfile is a single-stage Go or Python build.

---

## Makefile Targets

Consistent across all stack combinations:

| Target | Description |
|---|---|
| `make build` | Compile backend and/or build frontend |
| `make test` | Run all tests with coverage output |
| `make lint` | Run all linters |
| `make swagger` | Regenerate OpenAPI docs (Go: swag init; Python: no-op, built-in) |
| `make docker` | Build Docker image locally |
| `make run` | Run backend locally in dev mode |
| `make dev` | Start docker-compose for full local dev stack |
| `make clean` | Remove build artifacts |

CI workflows call `make build`, `make lint`, `make test` — identical to local.

---

## CI/CD Workflows

### `build.yml` — triggers on push/PR to any branch

**Go (GoFiber):**
1. `golangci-lint` (`.golangci.yml` in skeleton with sensible defaults)
2. `go build ./...`
3. `go test -race -coverprofile=coverage.out ./...`
4. `tj-actions/coverage-badge-go` → updates README badge → commits to branch

**Python (FastAPI):**
1. `ruff check` + `ruff format --check` (`ruff.toml` in skeleton)
2. `mypy` for type checking
3. `pytest --cov --cov-report=xml`
4. `py-cov-action/python-coverage-comment-action` → commits badge to branch

**Frontend (Bun):**
1. `bun run lint` (ESLint with TypeScript plugin, `.eslintrc.json` in skeleton)
2. `bun run build`
3. `bun run test --coverage`
4. Coverage badge committed to branch

Coverage badge commits are **skipped on protected `main`** — they commit on the PR branch and merge with the PR (matching llmproxy/lmon pattern).

### `docker.yml` — triggers on push/PR/tags

- Multi-arch: `linux/amd64,linux/arm64` via Docker Buildx
- Semver tags (`{{version}}`, `{{major}}.{{minor}}`, `{{major}}`), SHA, and `latest` on default branch
- Pushes to `DOCKERHUB_USERNAME/repo-name` (from GitHub secrets set during scaffolding)
- GHA layer cache

### `deploy.yml` — stub

```yaml
# TODO: configure deployment target
# Suggested: SSH deploy, Fly.io, Render, or Kubernetes
```

---

## Docker Architecture

Multi-stage Dockerfile follows llmproxy/verifai pattern:

```dockerfile
# Stage 1: Build frontend (only if frontend != none)
FROM oven/bun:latest AS frontend-builder
WORKDIR /app/frontend
COPY frontend/ .
RUN bun install --frozen-lockfile && bun run build

# Stage 2a: Build backend (Go)
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY backend/ .
RUN go build -ldflags="-w -s" -o server .

# Stage 2b: Build backend (Python) - alternative to 2a
FROM python:3.13-slim AS backend-builder
WORKDIR /app
COPY backend/ .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Runtime
FROM alpine:latest  # Go
# OR: FROM python:3.13-slim  # Python
COPY --from=backend-builder /app/server .       # or python app
COPY --from=frontend-builder /app/frontend/dist ./dist
ENV STATIC_FILES_DIR=./dist
EXPOSE 3000  # Go / 8000 Python
HEALTHCHECK CMD curl http://localhost:3000/healthz
```

Backend serves `./dist` as static files in production — same pattern as llmproxy serving verifai.

---

## OpenAPI

### GoFiber
- `swaggo/swag` + `gofiber/swagger` middleware
- Annotations on handlers generate `backend/docs/`
- `make swagger` runs `swag init`
- Swagger UI available at `/swagger`

### FastAPI
- Built-in, zero config
- Swagger UI at `/docs`
- OpenAPI JSON at `/openapi.json`

---

## Dev Proxy (local, no Docker)

`vite.config.ts` proxy config:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // GoFiber
      // target: 'http://localhost:8000',  // FastAPI
      changeOrigin: true,
    }
  }
}
```

Enables CORS-free dev: Vite serves frontend on `:5173`, all `/api` calls proxy to backend.

---

## setup.sh

```bash
#!/usr/bin/env bash
export CLAUDE_CODE_TASK_LIST_ID=${{ values.name }}
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Referenced in `.devcontainer/devcontainer.json`:
```json
{
  "name": "${{ values.name }}",
  "image": "pilotso11/fullstack-devc:dev",
  "postStartCommand": "source ./setup.sh"
}
```

---

## Decisions & Trade-offs

| Decision | Choice | Rationale |
|---|---|---|
| Template style | Composable single template | Fewer templates to maintain; handles all 9+ combos |
| GitHub auth | PAT now, GitHub App later | Simple bootstrap; App migration when multi-user needed |
| Coverage badges | Auto-committed to README on PR branch | Matches existing pilotso11 repo pattern |
| Base dev container image | `pilotso11/fullstack-devc:dev` | Single image supports Go + Bun + Python; add missing tools there |
| Python framework | FastAPI | OpenAPI built-in; async; better for JSON APIs |
| Go OpenAPI | swaggo/swag | Annotation-based, integrates cleanly with GoFiber |
| Python lint | ruff | Replaces flake8 + black + isort; fast, single tool |

---

## Out of Scope (this iteration)

- Automated deployment in `deploy.yml` (stub only)
- GitHub App authentication (PAT for now)
- Database scaffolding (Postgres, etc.)
- Multiple deployment targets

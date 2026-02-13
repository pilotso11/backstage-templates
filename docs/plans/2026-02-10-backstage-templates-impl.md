# Backstage Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a composable Backstage software template that scaffolds full-stack application repos on GitHub with Go (GoFiber) or Python (FastAPI) backends, optional Vite+Tailwind frontends (React/Lit/TypeScript), multi-arch Docker, OpenAPI, coverage badges, branch protection, and consistent Makefiles.

**Architecture:** Two repos — `backstage/templates` (this repo, template definitions + skeleton files) and `backstage/config` (Backstage app deployment, created in Stage 10). The single composable template uses multiple conditional `fetch:template` Backstage scaffolder steps to assemble only the selected stack. Generated repos follow the pilotso11/llmproxy + verifai patterns throughout.

**Tech Stack:** Backstage scaffolder v1beta3, Nunjucks templating, GoFiber + swaggo/swag, FastAPI (built-in OpenAPI), Bun + Vite 6 + Tailwind CSS 3, golangci-lint, ruff + mypy, ESLint, tj-actions/coverage-badge-go, Docker Buildx multi-arch, GitHub Actions.

**Design doc:** `docs/plans/2026-02-10-backstage-templates-design.md`

---

## Nunjucks Escaping Reference

GitHub Actions uses `${{ }}` syntax. Backstage templates also use `${{ }}`. To output literal GitHub Actions expressions in generated workflow files, wrap them with Nunjucks raw tags:

```
{% raw %}${{ secrets.GITHUB_TOKEN }}{% endraw %}
```

All `.njk` files are processed by Backstage's Nunjucks engine. The `.njk` extension is stripped from the output filename.

---

## Stage 1: Repo Scaffold & Catalog Registration

### Task 1: catalog-info.yaml for this repo

**Files:**
- Create: `catalog-info.yaml`

**Step 1: Create the file**

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: backstage-templates
  description: Full-stack application templates
spec:
  targets:
    - ./templates/app/template.yaml
```

**Step 2: Verify YAML is valid**
```bash
npx js-yaml catalog-info.yaml
```
Expected: no output (valid YAML)

**Step 3: Commit**
```bash
git add catalog-info.yaml
git commit -m "feat: add catalog-info.yaml to register templates"
```

---

### Task 2: Skeleton directory structure

**Step 1: Create the directory tree**
```bash
mkdir -p templates/app/skeleton/common/.devcontainer
mkdir -p templates/app/skeleton/common/.github/workflows
mkdir -p templates/app/skeleton/backend/gofiber
mkdir -p templates/app/skeleton/backend/fastapi
mkdir -p templates/app/skeleton/frontend/react/src
mkdir -p templates/app/skeleton/frontend/lit/src
mkdir -p templates/app/skeleton/frontend/typescript/src
touch templates/app/skeleton/backend/gofiber/.gitkeep
touch templates/app/skeleton/backend/fastapi/.gitkeep
touch templates/app/skeleton/frontend/react/src/.gitkeep
touch templates/app/skeleton/frontend/lit/src/.gitkeep
touch templates/app/skeleton/frontend/typescript/src/.gitkeep
```

**Step 2: Commit**
```bash
git add templates/
git commit -m "feat: scaffold skeleton directory structure"
```

---

## Stage 2: Common Skeleton Files

These files are always included regardless of frontend/backend selection.

### Task 3: setup.sh template

**Files:**
- Create: `templates/app/skeleton/common/setup.sh.njk`

```bash
#!/usr/bin/env bash
# Source this file to configure your local development environment
# Usage: source ./setup.sh
export CLAUDE_CODE_TASK_LIST_ID=${{ values.name }}
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/setup.sh.njk
git commit -m "feat: add setup.sh template with CLAUDE_CODE_TASK_LIST_ID"
```

---

### Task 4: devcontainer.json template

**Files:**
- Create: `templates/app/skeleton/common/.devcontainer/devcontainer.json`

No Nunjucks expressions — plain JSON, no `.njk` needed here since devcontainer.json does not reference template values.

Wait — it does reference `${{ values.name }}` for the name field. Use `.njk` extension.

Create `templates/app/skeleton/common/.devcontainer/devcontainer.json.njk`:

```json
{
  "name": "${{ values.name }}",
  "image": "pilotso11/fullstack-devc:dev",
  "postStartCommand": "source ./setup.sh",
  "customizations": {
    "vscode": {
      "extensions": [
        "golang.go",
        "ms-python.python",
        "ms-python.vscode-pylance",
        "biomejs.biome",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode"
      ]
    }
  }
}
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/.devcontainer/
git commit -m "feat: add devcontainer.json template"
```

---

### Task 5: README.md template

**Files:**
- Create: `templates/app/skeleton/common/README.md.njk`

```markdown
# ${{ values.name }}

${{ values.description }}

{% if values.backend === "gofiber" %}
![Coverage](coverage_badge.png)
{% elif values.backend === "fastapi" %}
[![Coverage](https://img.shields.io/badge/coverage-0%25-red)](coverage.xml)
{% endif %}

## Development

```bash
source ./setup.sh   # set CLAUDE_CODE_TASK_LIST_ID
make dev            # start full local dev stack
make test           # run all tests
make lint           # run all linters
make build          # build all
make docker         # build Docker image locally
```
{% if values.backend !== "none" %}

## API
{% if values.backend === "gofiber" %}
- Swagger UI: http://localhost:3000/swagger
- Health: http://localhost:3000/healthz
{% elif values.backend === "fastapi" %}
- Swagger UI: http://localhost:8000/docs
- OpenAPI JSON: http://localhost:8000/openapi.json
- Health: http://localhost:8000/healthz
{% endif %}
{% endif %}
{% if values.frontend !== "none" %}

## Frontend

- Dev server: http://localhost:5173 (proxies `/api` to backend)
{% endif %}

## Docker

```bash
make docker
docker run -p 3000:3000 ${{ values.dockerhub_org }}/${{ values.name }}
```
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/README.md.njk
git commit -m "feat: add README.md template with conditional sections"
```

---

### Task 6: Root Makefile template

**Files:**
- Create: `templates/app/skeleton/common/Makefile.njk`

Note: Makefiles require real tab characters for recipe indentation, not spaces.

```makefile
# ${{ values.name }} - Root Makefile
IMAGE_NAME := ${{ values.dockerhub_org }}/${{ values.name }}
IMAGE_TAG  := latest

.PHONY: build test lint docker run dev clean{% if values.backend === "gofiber" %} swagger{% endif %}

build:
{% if values.backend !== "none" %}
	$(MAKE) -C backend build
{% endif %}
{% if values.frontend !== "none" %}
	$(MAKE) -C frontend build
{% endif %}

test:
{% if values.backend !== "none" %}
	$(MAKE) -C backend test
{% endif %}
{% if values.frontend !== "none" %}
	$(MAKE) -C frontend test
{% endif %}

lint:
{% if values.backend !== "none" %}
	$(MAKE) -C backend lint
{% endif %}
{% if values.frontend !== "none" %}
	$(MAKE) -C frontend lint
{% endif %}

{% if values.backend === "gofiber" %}
swagger:
	$(MAKE) -C backend swagger

{% endif %}
docker:
	docker build --platform linux/amd64 -t $(IMAGE_NAME):$(IMAGE_TAG) .

run:
{% if values.backend !== "none" %}
	$(MAKE) -C backend run
{% endif %}

dev:
	docker compose up

clean:
{% if values.backend !== "none" %}
	$(MAKE) -C backend clean
{% endif %}
{% if values.frontend !== "none" %}
	$(MAKE) -C frontend clean
{% endif %}
	docker compose down --rmi local
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/Makefile.njk
git commit -m "feat: add root Makefile template"
```

---

### Task 7: deploy.yml stub

**Files:**
- Create: `templates/app/skeleton/common/.github/workflows/deploy.yml`

```yaml
# TODO: Configure deployment target
# Suggested approaches:
#   - SSH deploy to self-hosted server
#   - Fly.io: flyctl deploy
#   - Render: render deploy
#   - Kubernetes: kubectl set image
#
# Uncomment and configure when ready:
#
# name: Deploy
# on:
#   push:
#     branches: [main]
# jobs:
#   deploy:
#     runs-on: ubuntu-latest
#     needs: [docker]
#     steps:
#       - name: Deploy
#         run: echo "Configure deployment here"
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/.github/workflows/deploy.yml
git commit -m "feat: add deploy.yml stub for future deployment wiring"
```

---

## Stage 3: GoFiber Backend Skeleton

### Task 8: GoFiber main.go and test

**Files:**
- Create: `templates/app/skeleton/backend/gofiber/main.go.njk`
- Create: `templates/app/skeleton/backend/gofiber/main_test.go`

**Step 1: Create main.go.njk**

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/swagger"
	_ "github.com/${{ values.owner }}/${{ values.name }}/docs"
)

// @title           ${{ values.name }} API
// @version         1.0
// @description     ${{ values.description }}
// @host            localhost:3000
// @BasePath        /api
func main() {
	app := fiber.New()
	app.Use(logger.New())
	app.Use(cors.New())

	app.Get("/swagger/*", swagger.HandlerDefault)
	app.Get("/healthz", healthHandler)

	api := app.Group("/api")
	api.Get("/hello", helloHandler)

	staticDir := os.Getenv("STATIC_FILES_DIR")
	if staticDir != "" {
		app.Use("/", filesystem.New(filesystem.Config{
			Root: http.Dir(staticDir),
		}))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	log.Fatal(app.Listen(":" + port))
}

// healthHandler godoc
// @Summary     Health check
// @Tags        ops
// @Produce     json
// @Success     200 {object} map[string]string
// @Router      /healthz [get]
func healthHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok"})
}

// helloHandler godoc
// @Summary     Hello world example
// @Tags        example
// @Produce     json
// @Success     200 {object} map[string]string
// @Router      /api/hello [get]
func helloHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"message": "Hello from ${{ values.name }}!"})
}
```

**Step 2: Create main_test.go**

```go
package main

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func testApp() *fiber.App {
	app := fiber.New()
	app.Get("/healthz", healthHandler)
	api := app.Group("/api")
	api.Get("/hello", helloHandler)
	return app
}

func TestHealthHandler(t *testing.T) {
	resp, err := testApp().Test(httptest.NewRequest("GET", "/healthz", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if len(body) == 0 {
		t.Error("expected non-empty body")
	}
}

func TestHelloHandler(t *testing.T) {
	resp, err := testApp().Test(httptest.NewRequest("GET", "/api/hello", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}
```

**Step 3: Commit**
```bash
git add templates/app/skeleton/backend/gofiber/
git commit -m "feat: add GoFiber main.go skeleton with swagger, health, and test"
```

---

### Task 9: GoFiber go.mod, Makefile, and lint config

**Files:**
- Create: `templates/app/skeleton/backend/gofiber/go.mod.njk`
- Create: `templates/app/skeleton/backend/gofiber/Makefile`
- Create: `templates/app/skeleton/backend/gofiber/.golangci.yml.njk`

**go.mod.njk:**
```
module github.com/${{ values.owner }}/${{ values.name }}

go 1.25

require (
	github.com/gofiber/fiber/v2 v2.52.5
	github.com/gofiber/swagger v1.1.0
	github.com/swaggo/swag v1.16.4
)
```

Note: After generation, the developer must run `go mod tidy` to resolve exact versions and create `go.sum`. This is noted in the README.

**Makefile:**
```makefile
# Backend Makefile (GoFiber)
BINARY := server

.PHONY: build test lint swagger run clean

build:
	go build -ldflags="-w -s" -o $(BINARY) .

test:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

lint:
	golangci-lint run ./...

swagger:
	swag init --parseDependency --parseInternal -o docs

run:
	go run .

clean:
	rm -f $(BINARY) coverage.out coverage.html
	rm -rf docs
```

**.golangci.yml.njk:**
```yaml
linters-settings:
  goimports:
    local-prefixes: github.com/${{ values.owner }}/${{ values.name }}

linters:
  enable:
    - goimports
    - govet
    - errcheck
    - staticcheck
    - gosimple
    - ineffassign
    - unused

run:
  timeout: 5m
```

**Step: Commit**
```bash
git add templates/app/skeleton/backend/gofiber/
git commit -m "feat: add GoFiber go.mod, Makefile, and golangci-lint config"
```

---

## Stage 4: FastAPI Backend Skeleton

### Task 10: FastAPI main.py, tests, dependencies, lint config, Makefile

**Files:**
- Create: `templates/app/skeleton/backend/fastapi/main.py.njk`
- Create: `templates/app/skeleton/backend/fastapi/test_main.py.njk`
- Create: `templates/app/skeleton/backend/fastapi/requirements.txt`
- Create: `templates/app/skeleton/backend/fastapi/requirements-dev.txt`
- Create: `templates/app/skeleton/backend/fastapi/ruff.toml`
- Create: `templates/app/skeleton/backend/fastapi/mypy.ini`
- Create: `templates/app/skeleton/backend/fastapi/Makefile`

**main.py.njk:**
```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title="${{ values.name }} API",
    description="${{ values.description }}",
    version="1.0.0",
)


@app.get("/healthz", tags=["ops"])
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/hello", tags=["example"])
async def hello() -> dict[str, str]:
    """Returns a hello message."""
    return {"message": "Hello from ${{ values.name }}!"}


# Serve frontend static files if STATIC_FILES_DIR is set
_static_dir = os.getenv("STATIC_FILES_DIR")
if _static_dir and os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
```

**test_main.py.njk:**
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_hello() -> None:
    response = client.get("/api/hello")
    assert response.status_code == 200
    assert "message" in response.json()


def test_openapi_schema() -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "${{ values.name }} API"
```

**requirements.txt:**
```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
```

**requirements-dev.txt:**
```
-r requirements.txt
pytest>=8.0.0
pytest-cov>=5.0.0
httpx>=0.27.0
```

Note: `httpx` is a required peer dep for FastAPI's `TestClient`.

**ruff.toml:**
```toml
line-length = 100
target-version = "py312"

[lint]
select = ["E", "F", "I", "N", "UP", "B", "SIM"]

[format]
quote-style = "double"
indent-style = "space"
```

**mypy.ini:**
```ini
[mypy]
python_version = 3.12
strict = true
ignore_missing_imports = true
```

**Makefile:**
```makefile
# Backend Makefile (FastAPI)
VENV   := .venv
PY     := $(VENV)/bin/python
PIP    := $(VENV)/bin/pip

.PHONY: install build test lint run clean

install:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements-dev.txt

build: install

test:
	$(VENV)/bin/pytest --cov=. --cov-report=xml --cov-report=term-missing

lint:
	$(VENV)/bin/ruff check .
	$(VENV)/bin/ruff format --check .
	$(VENV)/bin/mypy .

run:
	$(VENV)/bin/uvicorn main:app --reload --port 8000

clean:
	rm -rf $(VENV) .coverage coverage.xml __pycache__ .mypy_cache .ruff_cache
	find . -name "__pycache__" -type d -exec rm -rf {} +
```

**Step: Commit**
```bash
git add templates/app/skeleton/backend/fastapi/
git commit -m "feat: add FastAPI skeleton with main.py, tests, lint config, and Makefile"
```

---

## Stage 5: Frontend Skeletons

### Task 11: React frontend skeleton

**Files to create in `templates/app/skeleton/frontend/react/`:**

**package.json.njk:**
```json
{
  "name": "${{ values.name }}-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest run --coverage",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@vitest/coverage-v8": "^2.0.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0"
  }
}
```

**index.html.njk:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${{ values.name }}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**src/main.tsx:**
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**src/App.tsx.njk:**
```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">${{ values.name }}</h1>
        <p className="text-gray-600">${{ values.description }}</p>
      </div>
    </div>
  )
}

export default App
```

**src/App.test.tsx:**
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders a heading', () => {
    render(<App />)
    expect(screen.getByRole('heading')).toBeDefined()
  })
})
```

**src/index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**vite.config.ts.njk:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  server: {
    proxy: {
{% if values.backend === "gofiber" %}
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
{% elif values.backend === "fastapi" %}
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
{% endif %}
    },
  },
  build: { outDir: 'dist' },
})
```

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

**postcss.config.js:**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**.eslintrc.json:**
```json
{
  "root": true,
  "env": { "browser": true, "es2020": true },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "ignorePatterns": ["dist"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["react-refresh"],
  "rules": {
    "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

**Makefile:**
```makefile
# Frontend Makefile (React + Bun)
.PHONY: install build test lint dev clean

install:
	bun install

build: install
	bun run build

test: install
	bun run test

lint: install
	bun run lint

dev: install
	bun run dev

clean:
	rm -rf dist node_modules
```

**Step: Commit**
```bash
git add templates/app/skeleton/frontend/react/
git commit -m "feat: add React + Tailwind frontend skeleton"
```

---

### Task 12: Lit frontend skeleton

**Files to create in `templates/app/skeleton/frontend/lit/`:**

Most config files (tailwind, postcss, tsconfig, eslint, Makefile) are identical to React except:
- `package.json` has `lit` instead of React deps, no React Vite plugin
- `vite.config.ts` has no `react()` plugin
- `tailwind.config.js` content array uses `*.ts` not `*.tsx`
- Source files use Lit web component pattern

**package.json.njk:**
```json
{
  "name": "${{ values.name }}-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext ts --report-unused-disable-directives --max-warnings 0",
    "test": "vitest run --coverage",
    "test:watch": "vitest"
  },
  "dependencies": {
    "lit": "^3.2.0"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0"
  }
}
```

**index.html.njk:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${{ values.name }}</title>
    <link rel="stylesheet" href="/src/index.css" />
  </head>
  <body>
    <app-root></app-root>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**src/main.ts:**
```typescript
import './app-root.ts'
```

**src/app-root.ts.njk:**
```typescript
import { LitElement, html, css } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('app-root')
export class AppRoot extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `

  render() {
    return html`
      <div class="min-h-screen bg-gray-100 flex items-center justify-center">
        <div class="bg-white rounded-lg shadow p-8 max-w-md w-full">
          <h1 class="text-3xl font-bold text-gray-900 mb-4">${{ values.name }}</h1>
          <p class="text-gray-600">${{ values.description }}</p>
        </div>
      </div>
    `
  }
}
```

**src/app-root.test.ts:**
```typescript
import { describe, it, expect } from 'vitest'
import { AppRoot } from './app-root.ts'

describe('AppRoot', () => {
  it('is defined as a custom element', () => {
    expect(AppRoot).toBeDefined()
    expect(customElements.get('app-root')).toBeDefined()
  })
})
```

**src/index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**vite.config.ts.njk:** (no React plugin)
```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    proxy: {
{% if values.backend === "gofiber" %}
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
{% elif values.backend === "fastapi" %}
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
{% endif %}
    },
  },
  build: { outDir: 'dist' },
})
```

**tailwind.config.js:**
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts}'],
  theme: { extend: {} },
  plugins: [],
}
```

Remaining files (postcss.config.js, tsconfig.json, .eslintrc.json, Makefile) — identical to React skeleton. Copy them, removing React-specific rules from eslintrc (no react-refresh plugin).

**Step: Commit**
```bash
git add templates/app/skeleton/frontend/lit/
git commit -m "feat: add Lit + Tailwind frontend skeleton"
```

---

### Task 13: Raw TypeScript frontend skeleton

**Files to create in `templates/app/skeleton/frontend/typescript/`:**

No framework — plain TypeScript DOM manipulation using safe `createElement`/`textContent` patterns (not `innerHTML`).

**src/main.ts.njk:**
```typescript
import { App } from './app.ts'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')
const app = new App(root)
app.render()
```

**src/app.ts.njk:**
```typescript
export class App {
  constructor(private readonly container: HTMLElement) {}

  render(): void {
    this.container.replaceChildren()

    const wrapper = document.createElement('div')
    wrapper.className = 'min-h-screen bg-gray-100 flex items-center justify-center'

    const card = document.createElement('div')
    card.className = 'bg-white rounded-lg shadow p-8 max-w-md w-full'

    const heading = document.createElement('h1')
    heading.className = 'text-3xl font-bold text-gray-900 mb-4'
    heading.textContent = '${{ values.name }}'

    const description = document.createElement('p')
    description.className = 'text-gray-600'
    description.textContent = '${{ values.description }}'

    card.append(heading, description)
    wrapper.appendChild(card)
    this.container.appendChild(wrapper)
  }
}
```

**src/app.test.ts:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { App } from './app.ts'

describe('App', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  it('renders a heading into the container', () => {
    const app = new App(container)
    app.render()
    const heading = container.querySelector('h1')
    expect(heading).not.toBeNull()
    expect(heading?.textContent).toBeTruthy()
  })

  it('renders a description paragraph', () => {
    const app = new App(container)
    app.render()
    const para = container.querySelector('p')
    expect(para).not.toBeNull()
  })

  it('clears previous content on re-render', () => {
    const app = new App(container)
    app.render()
    app.render()
    expect(container.querySelectorAll('h1').length).toBe(1)
  })
})
```

**index.html.njk:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${{ values.name }}</title>
    <link rel="stylesheet" href="/src/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**src/index.css** — identical to React/Lit:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**package.json.njk** — no framework deps:
```json
{
  "name": "${{ values.name }}-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint src --ext ts --report-unused-disable-directives --max-warnings 0",
    "test": "vitest run --coverage",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0"
  }
}
```

`vite.config.ts.njk`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `.eslintrc.json`, `Makefile` — same as Lit skeleton.

**Step: Commit**
```bash
git add templates/app/skeleton/frontend/typescript/
git commit -m "feat: add raw TypeScript + Tailwind frontend skeleton"
```

---

## Stage 6: Dockerfile & Docker Compose

### Task 14: Dockerfile template

**Files:**
- Create: `templates/app/skeleton/common/Dockerfile.njk`

```dockerfile
# syntax=docker/dockerfile:1
{% if values.frontend !== "none" %}
# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM oven/bun:latest AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile
COPY frontend/ .
RUN bun run build
{% endif %}
{% if values.backend === "gofiber" %}

# ── Stage 2: Build Go backend ─────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache git
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -ldflags="-w -s" -o server .

# ── Stage 3: Runtime (Go) ─────────────────────────────────────────────────────
FROM alpine:latest
RUN apk add --no-cache curl tzdata ca-certificates
WORKDIR /app
COPY --from=backend-builder /app/server .
{% if values.frontend !== "none" %}
COPY --from=frontend-builder /app/frontend/dist ./dist
ENV STATIC_FILES_DIR=./dist
{% endif %}
ENV PORT=3000
ENV TZ=Europe/London
EXPOSE 3000
HEALTHCHECK CMD curl -f http://localhost:3000/healthz
ENTRYPOINT ["/app/server"]

{% elif values.backend === "fastapi" %}

# ── Stage 2: Build Python backend ────────────────────────────────────────────
FROM python:3.13-slim AS backend-builder
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
COPY backend/ .

# ── Stage 3: Runtime (Python) ────────────────────────────────────────────────
FROM python:3.13-slim
WORKDIR /app
COPY --from=backend-builder /root/.local /root/.local
COPY --from=backend-builder /app .
{% if values.frontend !== "none" %}
COPY --from=frontend-builder /app/frontend/dist ./dist
ENV STATIC_FILES_DIR=./dist
{% endif %}
ENV PATH=/root/.local/bin:$PATH
ENV PORT=8000
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

{% elif values.frontend !== "none" %}

# ── Frontend-only: serve with nginx ──────────────────────────────────────────
FROM nginx:alpine
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD curl -f http://localhost/

{% endif %}
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/Dockerfile.njk
git commit -m "feat: add multi-stage Dockerfile template with conditional Go/Python/frontend stages"
```

---

### Task 15: docker-compose.yml template

**Files:**
- Create: `templates/app/skeleton/common/docker-compose.yml.njk`

```yaml
# Local development — hot reload for all services
# Usage: make dev  (or: docker compose up)
services:
{% if values.backend === "gofiber" %}
  backend:
    image: golang:1.25-alpine
    working_dir: /app
    command: sh -c "go run ."
    volumes:
      - ./backend:/app
    ports:
      - "3000:3000"
    environment:
      PORT: "3000"
    restart: unless-stopped

{% elif values.backend === "fastapi" %}
  backend:
    image: python:3.13-slim
    working_dir: /app
    command: sh -c "pip install -r requirements-dev.txt -q && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    restart: unless-stopped

{% endif %}
{% if values.frontend !== "none" %}
  frontend:
    image: oven/bun:latest
    working_dir: /app
    command: sh -c "bun install && bun run dev --host"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    restart: unless-stopped
{% endif %}
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/docker-compose.yml.njk
git commit -m "feat: add docker-compose.yml template for local dev"
```

---

## Stage 7: GitHub Actions Workflows

### Task 16: build.yml workflow template

**Files:**
- Create: `templates/app/skeleton/common/.github/workflows/build.yml.njk`

Key: all `${{ }}` that must appear in the output file (GitHub Actions expressions) are wrapped in `{% raw %}...{% endraw %}` to prevent Nunjucks from processing them.

```yaml
name: Build & Test

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main]

jobs:
{% if values.backend === "gofiber" %}
  go:
    name: Go Build & Test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: "1.25"
          cache-dependency-path: backend/go.sum

      - name: Install swag
        run: go install github.com/swaggo/swag/cmd/swag@latest

      - name: Generate swagger docs
        run: swag init --parseDependency --parseInternal -o docs

      - name: Lint
        uses: golangci/golangci-lint-action@v6
        with:
          version: latest
          working-directory: backend

      - name: Build
        run: go build ./...

      - name: Test
        run: go test -race -coverprofile=coverage.out ./...

      - name: Update coverage badge
        if: {% raw %}${{ github.ref != 'refs/heads/main' }}{% endraw %}
        uses: tj-actions/coverage-badge-go@v2
        with:
          filename: backend/coverage.out

      - name: Commit coverage badge
        if: {% raw %}${{ github.ref != 'refs/heads/main' }}{% endraw %}
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update coverage badge [skip ci]"
          file_pattern: README.md

{% elif values.backend === "fastapi" %}
  python:
    name: Python Build & Test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
          cache: "pip"
          cache-dependency-path: backend/requirements-dev.txt

      - name: Install dependencies
        run: pip install -r requirements-dev.txt

      - name: Lint (ruff)
        run: |
          ruff check .
          ruff format --check .

      - name: Type check (mypy)
        run: mypy .

      - name: Test
        run: pytest --cov=. --cov-report=xml --cov-report=term-missing

      - name: Coverage comment
        if: {% raw %}${{ github.event_name == 'pull_request' }}{% endraw %}
        uses: py-cov-action/python-coverage-comment-action@v3
        with:
          GITHUB_TOKEN: {% raw %}${{ secrets.GITHUB_TOKEN }}{% endraw %}

{% endif %}
{% if values.frontend !== "none" %}
  frontend:
    name: Frontend Build & Test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Lint
        run: bun run lint

      - name: Build
        run: bun run build

      - name: Test
        run: bun run test

{% endif %}
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/.github/workflows/build.yml.njk
git commit -m "feat: add build.yml CI workflow template"
```

---

### Task 17: docker.yml workflow template

**Files:**
- Create: `templates/app/skeleton/common/.github/workflows/docker.yml.njk`

```yaml
name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ["v*.*.*"]
  pull_request:
    branches: [main]

jobs:
  docker:
    name: Docker Build & Push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ values.dockerhub_org }}/${{ values.name }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={% raw %}{{version}}{% endraw %}
            type=semver,pattern={% raw %}{{major}}.{{minor}}{% endraw %}
            type=semver,pattern={% raw %}{{major}}{% endraw %}
            type=sha
            type=raw,value=latest,enable={% raw %}${{ github.ref == format('refs/heads/{0}', github.event.repository.default_branch) }}{% endraw %}

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        if: {% raw %}${{ github.event_name != 'pull_request' }}{% endraw %}
        uses: docker/login-action@v3
        with:
          username: {% raw %}${{ secrets.DOCKERHUB_USERNAME }}{% endraw %}
          password: {% raw %}${{ secrets.DOCKERHUB_TOKEN }}{% endraw %}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: {% raw %}${{ github.event_name != 'pull_request' }}{% endraw %}
          tags: {% raw %}${{ steps.meta.outputs.tags }}{% endraw %}
          labels: {% raw %}${{ steps.meta.outputs.labels }}{% endraw %}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/.github/workflows/docker.yml.njk
git commit -m "feat: add docker.yml CI workflow template with multi-arch build and push"
```

---

## Stage 8: Backstage Template Definition

### Task 18: template.yaml

**Files:**
- Create: `templates/app/template.yaml`

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: fullstack-app
  title: Full-Stack Application
  description: >
    Composable full-stack app with optional frontend (React/Lit/TypeScript + Vite + Tailwind + Bun)
    and backend (GoFiber + OpenAPI or FastAPI + OpenAPI). Multi-arch Docker, coverage badges,
    GitHub Actions CI, branch protection, and Claude Code task list support.
  tags:
    - go
    - python
    - react
    - lit
    - typescript
    - vite
    - tailwind
    - docker
spec:
  owner: user:default/guest
  type: service

  parameters:
    - title: Application Details
      required: [name, description, owner]
      properties:
        name:
          title: Name
          type: string
          description: Repository name (also becomes CLAUDE_CODE_TASK_LIST_ID and Docker image name)
          pattern: "^[a-z0-9-]+$"
          ui:autofocus: true
        description:
          title: Description
          type: string
          description: Short description of the application
        owner:
          title: GitHub Owner
          type: string
          description: GitHub username or organization that will own the repo

    - title: Stack Selection
      properties:
        frontend:
          title: Frontend
          type: string
          default: react
          enum: [none, react, lit, typescript]
          enumNames:
            - "None (backend only)"
            - "React + Tailwind"
            - "Lit + Tailwind"
            - "TypeScript + Tailwind"
        backend:
          title: Backend
          type: string
          default: gofiber
          enum: [none, gofiber, fastapi]
          enumNames:
            - "None (frontend-only SPA)"
            - "Go + GoFiber (OpenAPI via swaggo)"
            - "Python + FastAPI (OpenAPI built-in)"

    - title: Docker Hub
      properties:
        dockerhub_org:
          title: Docker Hub Org / Username
          type: string
          description: Docker Hub organization or username for image pushes

  steps:
    - id: fetch-common
      name: Fetch common files
      action: fetch:template
      input:
        url: ./skeleton/common
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}
          frontend: ${{ parameters.frontend }}
          backend: ${{ parameters.backend }}
          dockerhub_org: ${{ parameters.dockerhub_org }}

    - id: fetch-frontend-react
      name: Fetch React frontend
      if: ${{ parameters.frontend === "react" }}
      action: fetch:template
      input:
        url: ./skeleton/frontend/react
        targetPath: frontend
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          backend: ${{ parameters.backend }}

    - id: fetch-frontend-lit
      name: Fetch Lit frontend
      if: ${{ parameters.frontend === "lit" }}
      action: fetch:template
      input:
        url: ./skeleton/frontend/lit
        targetPath: frontend
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          backend: ${{ parameters.backend }}

    - id: fetch-frontend-typescript
      name: Fetch TypeScript frontend
      if: ${{ parameters.frontend === "typescript" }}
      action: fetch:template
      input:
        url: ./skeleton/frontend/typescript
        targetPath: frontend
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          backend: ${{ parameters.backend }}

    - id: fetch-backend-gofiber
      name: Fetch GoFiber backend
      if: ${{ parameters.backend === "gofiber" }}
      action: fetch:template
      input:
        url: ./skeleton/backend/gofiber
        targetPath: backend
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}

    - id: fetch-backend-fastapi
      name: Fetch FastAPI backend
      if: ${{ parameters.backend === "fastapi" }}
      action: fetch:template
      input:
        url: ./skeleton/backend/fastapi
        targetPath: backend
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}

    - id: publish
      name: Create GitHub repository
      action: publish:github
      input:
        repoUrl: "github.com?owner=${{ parameters.owner }}&repo=${{ parameters.name }}"
        description: ${{ parameters.description }}
        repoVisibility: private
        defaultBranch: main
        protectDefaultBranch: true

    - id: github-secret-username
      name: Add DOCKERHUB_USERNAME secret
      action: github:actions:secrets:create
      input:
        repoUrl: "github.com?owner=${{ parameters.owner }}&repo=${{ parameters.name }}"
        secrets:
          DOCKERHUB_USERNAME: ${{ secrets.DOCKERHUB_USERNAME }}

    - id: github-secret-token
      name: Add DOCKERHUB_TOKEN secret
      action: github:actions:secrets:create
      input:
        repoUrl: "github.com?owner=${{ parameters.owner }}&repo=${{ parameters.name }}"
        secrets:
          DOCKERHUB_TOKEN: ${{ secrets.DOCKERHUB_TOKEN }}

    - id: register
      name: Register in Backstage catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['publish'].output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml

  output:
    links:
      - title: Repository
        url: ${{ steps['publish'].output.remoteUrl }}
      - title: Open in catalog
        url: ${{ steps['register'].output.entityRef }}
```

**Step: Commit**
```bash
git add templates/app/template.yaml
git commit -m "feat: add Backstage template.yaml — composable full-stack scaffolder"
```

---

## Stage 9: Generated catalog-info.yaml

### Task 19: catalog-info.yaml for generated repos

**Files:**
- Create: `templates/app/skeleton/common/catalog-info.yaml.njk`

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{ values.name }}
  description: ${{ values.description }}
  annotations:
    github.com/project-slug: ${{ values.owner }}/${{ values.name }}
spec:
  type: service
  lifecycle: experimental
  owner: user:default/${{ values.owner }}
```

**Step: Commit**
```bash
git add templates/app/skeleton/common/catalog-info.yaml.njk
git commit -m "feat: add catalog-info.yaml template for generated repos"
```

---

## Stage 10: Backstage Config Repo

### Task 20: Bootstrap Backstage app

**Step 1: Create the app (run from parent directory)**
```bash
cd /Users/sethosher/projects/opensource/backstage
npx @backstage/create-app@latest --skip-install
# When prompted for name: enter "backstage-config"
```

**Step 2: Initialize git and create GitHub repo**
```bash
cd backstage-config
git init
git add .
git commit -m "feat: initial Backstage app from create-app"
gh repo create pilotso11/backstage-config --private --source=. --remote=origin --push
```

---

### Task 21: Configure GitHub integration and catalog

**Files:**
- Modify: `../backstage-config/app-config.yaml`

Add/update these sections:

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

catalog:
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchName: backstage-integration
  rules:
    - allow: [Component, System, API, Resource, Location, Template]
  locations:
    - type: url
      target: https://github.com/pilotso11/backstage-templates/blob/main/catalog-info.yaml
      rules:
        - allow: [Location, Template]

scaffolder:
  defaultAuthor:
    name: Backstage Scaffolder
    email: scaffolder@example.com
  defaultCommitMessage: "feat: scaffolded by Backstage"
```

**Step: Commit**
```bash
git add app-config.yaml
git commit -m "feat: configure GitHub integration and template catalog"
```

---

### Task 22: app-config.local.yaml.example and Dockerfile

**Files:**
- Create: `../backstage-config/app-config.local.yaml.example`
- Create: `../backstage-config/Dockerfile`
- Modify: `../backstage-config/.gitignore` (add `app-config.local.yaml`)

**app-config.local.yaml.example:**
```yaml
# Copy to app-config.local.yaml and fill in values.
# NEVER commit app-config.local.yaml — it is gitignored.

app:
  baseUrl: http://localhost:3000

backend:
  baseUrl: http://localhost:7007
  cors:
    origin: http://localhost:3000

integrations:
  github:
    - host: github.com
      token: ghp_YOUR_GITHUB_PAT_HERE

# Docker Hub credentials injected as GitHub repo secrets during scaffolding.
# Set as environment variables before starting Backstage:
#   export DOCKERHUB_USERNAME=your-org
#   export DOCKERHUB_TOKEN=your-token
```

**Dockerfile:**
```dockerfile
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . .
RUN yarn tsc && yarn build:backend --config ../../app-config.yaml

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 g++ build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/yarn.lock ./
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/package.json ./packages/backend/package.json

RUN yarn install --frozen-lockfile --production --network-timeout 600000

ENV NODE_ENV=production
EXPOSE 7007
CMD ["node", "packages/backend", "--config", "app-config.yaml"]
```

**Step: Commit**
```bash
git add app-config.local.yaml.example Dockerfile .gitignore
git commit -m "feat: add local config example and Docker deployment setup"
git push
```

---

## Stage 11: End-to-End Smoke Test

### Task 23: Run Backstage locally and test template rendering

**Step 1: Install deps**
```bash
cd /Users/sethosher/projects/opensource/backstage/backstage-config
yarn install
```

**Step 2: Set environment variables**
```bash
cp app-config.local.yaml.example app-config.local.yaml
# Edit app-config.local.yaml: set GITHUB_TOKEN
export GITHUB_TOKEN=ghp_your_token
export DOCKERHUB_USERNAME=your-org
export DOCKERHUB_TOKEN=your-token
```

**Step 3: Start Backstage**
```bash
yarn dev
```
Expected: opens at http://localhost:3000, no errors in terminal

**Step 4: Verify template is listed**
- Navigate to: http://localhost:3000/create
- Confirm "Full-Stack Application" appears
- Step through the wizard with: name=`smoke-test-app`, frontend=`react`, backend=`gofiber`

**Step 5: Generate a real repo**
- Complete the wizard
- Verify on GitHub:
  - Repo is private: `gh repo view pilotso11/smoke-test-app --json isPrivate`
  - Main is protected: `gh api repos/pilotso11/smoke-test-app/branches/main/protection`
  - Secrets set: `gh secret list --repo pilotso11/smoke-test-app`

**Step 6: Verify generated repo**
```bash
gh repo clone pilotso11/smoke-test-app /tmp/smoke-test-app
cd /tmp/smoke-test-app
source ./setup.sh
echo $CLAUDE_CODE_TASK_LIST_ID
# Expected: smoke-test-app
```

**Step 7: Run the Makefile**
```bash
# In generated repo — requires Go and Bun installed (or use devcontainer)
make lint
make build
make test
```
Expected: all pass (Go will need `go mod tidy` first — noted in README)

**Step 8: Verify GitHub Actions on first push**
- The CI workflow should trigger
- Check: `gh run list --repo pilotso11/smoke-test-app`

**Step 9: Clean up**
```bash
gh repo delete pilotso11/smoke-test-app --yes
rm -rf /tmp/smoke-test-app
```

---

## Implementation Notes

### go.sum bootstrap
Generated Go repos have `go.mod` but no `go.sum`. Add a `make init` target to the GoFiber Makefile:
```makefile
init:
	go mod tidy
```
And document in README: "Run `make init` after cloning."

### bun.lockb bootstrap
Generated frontend repos have no `bun.lockb`. CI uses `bun install` (without `--frozen-lockfile`) on the first run to create it. Subsequent runs can use `--frozen-lockfile` after the lock file is committed.

### Backstage `secrets` in template.yaml
The `${{ secrets.DOCKERHUB_USERNAME }}` syntax in `template.yaml` reads from the Backstage backend environment. Wire these in `app-config.yaml` under the `scaffolder.secrets` key using `${DOCKERHUB_USERNAME}` env var substitution.

### GitHub Actions secrets action
The `github:actions:secrets:create` scaffolder action requires the `@backstage/plugin-scaffolder-backend-module-github` package. Verify it is installed in the Backstage backend or install it:
```bash
yarn workspace backend add @backstage/plugin-scaffolder-backend-module-github
```

# Backstage Templates

Nunjucks-based skeleton templates for scaffolding full-stack applications via Backstage.

## Skeleton Directories

```
templates/app/skeleton/
├── backend/
│   ├── fastapi/       # Python FastAPI + OpenAPI
│   └── gofiber/       # Go Fiber + OpenAPI
├── frontend/
│   ├── react/         # React + Tailwind + Vite + Bun
│   ├── lit/           # Lit + Tailwind + Vite + Bun
│   └── typescript/    # Vanilla TS + Tailwind + Vite + Bun
└── common/            # Shared files (CI, devcontainer, Dockerfile, catalog-info)
```

## Prerequisites

- Python 3 (for the render script)
- Bun (for frontend tests)
- Go (for GoFiber tests)
- Python + pip (for FastAPI tests)

## Makefile Targets

```bash
make test              # Run ALL skeleton tests (fastapi, gofiber, react, lit, typescript)
make test-fastapi      # Render + build + test + lint FastAPI backend
make test-gofiber      # Render + init + test Go Fiber backend
make test-react        # Render + bun install + test React frontend
make test-lit          # Render + bun install + test Lit frontend
make test-typescript   # Render + bun install + test TypeScript frontend
make regenerate-docs   # Rebuild pre-generated OpenAPI specs for both backends
make clean             # Remove all /tmp/skeleton-* output directories
```

## Conventions

- `.njk` files are Nunjucks templates — the `.njk` extension is stripped during rendering
- `{% raw %}` / `{% endraw %}` protect template syntax (e.g., GitHub Actions `${{ }}`) from being substituted
- Coverage thresholds are 80% for lines, functions, branches, and statements
- Always bump the version in `templates/app/template.yaml` after changes

## OpenAPI Docs

The template skeletons include **pre-generated OpenAPI specs** (`docs/openapi.json`) so that newly scaffolded apps have valid API docs in Backstage from day one. The `catalog-info.yaml` references these via Backstage's `$text` substitution:

```yaml
definition:
  $text: ./backend/docs/openapi.json
```

### How it works

- Pre-generated specs are committed in `backend/gofiber/docs/` and `backend/fastapi/docs/`
- CI (`build.yml`) regenerates and commits updated specs on feature branches (not main, which is protected)
- Backstage resolves the relative `$text` path through its GitHub integration

### When to regenerate

After adding, removing, or modifying API endpoints in the template skeleton code, run:

```bash
make regenerate-docs
```

This renders both backend skeletons, generates fresh OpenAPI specs (`swag init` for GoFiber, `app.openapi()` for FastAPI), and copies them back into the skeleton directories. Review the diff and commit.

> **Important:** The `$text` key in `catalog-info.yaml` must be a YAML mapping key, not a quoted string. `definition: '$text: ...'` is a literal string that Backstage will not expand. Use the multi-line form shown above.

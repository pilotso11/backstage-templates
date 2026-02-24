RENDER := python3 scripts/render-skeleton.py
ARGS   := --name testapp --owner testowner

TMPDIR_FASTAPI     := /tmp/skeleton-fastapi
TMPDIR_GOFIBER     := /tmp/skeleton-gofiber
TMPDIR_REACT       := /tmp/skeleton-react
TMPDIR_LIT         := /tmp/skeleton-lit
TMPDIR_TYPESCRIPT  := /tmp/skeleton-typescript

.PHONY: test test-fastapi test-gofiber test-react test-lit test-typescript regenerate-docs clean

test: test-fastapi test-gofiber test-react test-lit test-typescript

test-fastapi:
	$(RENDER) templates/app/skeleton/backend/fastapi $(TMPDIR_FASTAPI) $(ARGS)
	$(MAKE) -C $(TMPDIR_FASTAPI) build test lint

test-gofiber:
	$(RENDER) templates/app/skeleton/backend/gofiber $(TMPDIR_GOFIBER) $(ARGS)
	$(MAKE) -C $(TMPDIR_GOFIBER) init test

test-react:
	$(RENDER) templates/app/skeleton/frontend/react $(TMPDIR_REACT) $(ARGS)
	cd $(TMPDIR_REACT) && bun install && bun run test

test-lit:
	$(RENDER) templates/app/skeleton/frontend/lit $(TMPDIR_LIT) $(ARGS)
	cd $(TMPDIR_LIT) && bun install && bun run test

test-typescript:
	$(RENDER) templates/app/skeleton/frontend/typescript $(TMPDIR_TYPESCRIPT) $(ARGS)
	cd $(TMPDIR_TYPESCRIPT) && bun install && bun run test

SKELETON_GOFIBER  := templates/app/skeleton/backend/gofiber
SKELETON_FASTAPI  := templates/app/skeleton/backend/fastapi

regenerate-docs:
	@echo "==> Regenerating GoFiber OpenAPI docs..."
	rm -rf /tmp/skeleton-gofiber-gen
	$(RENDER) $(SKELETON_GOFIBER) /tmp/skeleton-gofiber-gen $(ARGS)
	cd /tmp/skeleton-gofiber-gen && go mod tidy && \
		go install github.com/swaggo/swag/cmd/swag@latest && \
		$$(go env GOPATH)/bin/swag init --parseDependency --parseInternal -o docs && \
		cp docs/swagger.json docs/openapi.json
	cp /tmp/skeleton-gofiber-gen/docs/docs.go $(SKELETON_GOFIBER)/docs/
	cp /tmp/skeleton-gofiber-gen/docs/swagger.json $(SKELETON_GOFIBER)/docs/
	cp /tmp/skeleton-gofiber-gen/docs/swagger.yaml $(SKELETON_GOFIBER)/docs/
	cp /tmp/skeleton-gofiber-gen/docs/openapi.json $(SKELETON_GOFIBER)/docs/
	@echo "==> Regenerating FastAPI OpenAPI docs..."
	rm -rf /tmp/skeleton-fastapi-gen
	$(RENDER) $(SKELETON_FASTAPI) /tmp/skeleton-fastapi-gen $(ARGS)
	cd /tmp/skeleton-fastapi-gen && python3 -m venv .venv && \
		.venv/bin/pip install -q -r requirements.txt && \
		mkdir -p docs && \
		.venv/bin/python -c "from main import app; import json; f=open('docs/openapi.json','w'); json.dump(app.openapi(), f, indent=2); f.close()"
	cp /tmp/skeleton-fastapi-gen/docs/openapi.json $(SKELETON_FASTAPI)/docs/
	rm -rf /tmp/skeleton-gofiber-gen /tmp/skeleton-fastapi-gen
	@echo "==> Done. Review changes with: git diff templates/app/skeleton/backend/*/docs/"

clean:
	rm -rf $(TMPDIR_FASTAPI) $(TMPDIR_GOFIBER) $(TMPDIR_REACT) $(TMPDIR_LIT) $(TMPDIR_TYPESCRIPT)

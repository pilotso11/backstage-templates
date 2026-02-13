RENDER := python3 scripts/render-skeleton.py
ARGS   := --name testapp --owner testowner

TMPDIR_FASTAPI     := /tmp/skeleton-fastapi
TMPDIR_GOFIBER     := /tmp/skeleton-gofiber
TMPDIR_REACT       := /tmp/skeleton-react
TMPDIR_LIT         := /tmp/skeleton-lit
TMPDIR_TYPESCRIPT  := /tmp/skeleton-typescript

.PHONY: test test-fastapi test-gofiber test-react test-lit test-typescript clean

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

clean:
	rm -rf $(TMPDIR_FASTAPI) $(TMPDIR_GOFIBER) $(TMPDIR_REACT) $(TMPDIR_LIT) $(TMPDIR_TYPESCRIPT)

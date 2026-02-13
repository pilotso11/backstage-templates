# Frontend Makefile (Lit + Bun)
.PHONY: install build test lint dev clean e2e

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

e2e: install
	bun run test:e2e

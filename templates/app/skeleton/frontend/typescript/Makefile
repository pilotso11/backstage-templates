# Frontend Makefile (TypeScript + Bun)
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

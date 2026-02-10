# Backend Makefile (GoFiber)
BINARY := server

.PHONY: build test lint swagger run init clean

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

init:
	go mod tidy

clean:
	rm -f $(BINARY) coverage.out coverage.html
	rm -rf docs

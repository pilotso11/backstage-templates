# API Endpoints + Frontend Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace placeholder `/api/hello` and `/api/whoami` endpoints with a functional calculator API, user identity endpoint, and permission-checked admin endpoint. Implement corresponding frontend pages in all three frameworks (React, Lit, Vanilla TS).

**Architecture:** Each backend (Go Fiber, FastAPI) gets three new endpoints: `/api/user`, `POST /api/compute`, `/api/admin/users`. Frontends get two pages: a main page with calculator + user info, and an admin page with permission check. Routing is framework-specific (React useState, Lit reactive property, Vanilla hash-based). The `authorized_users.json` file is a placeholder for future group/service lookup.

**Tech Stack:** Go Fiber + swaggo, FastAPI + Pydantic, React, Lit, Vanilla TypeScript, Tailwind CSS, Vitest

---

## Task 1: Go Fiber — Auth Update + Compute Handler

**Files:**
- Modify: `templates/templates/app/skeleton/backend/gofiber/auth.go.njk`
- Create: `templates/templates/app/skeleton/backend/gofiber/compute.go.njk`

**Step 1: Update AuthUser struct to include Authenticated field**

Replace the entire contents of `templates/templates/app/skeleton/backend/gofiber/auth.go.njk`:

```go
package main

import (
	"os"

	"github.com/gofiber/fiber/v2"
)

// AuthUser represents the authenticated user from OAuth2 headers.
type AuthUser struct {
	Email         string `json:"email"`
	User          string `json:"user"`
	Username      string `json:"username"`
	Authenticated bool   `json:"authenticated"`
}

// GetAuthUser extracts the user from OAuth2 proxy headers, falling back
// to DEV_USER_EMAIL in development mode.
func GetAuthUser(c *fiber.Ctx) AuthUser {
	if os.Getenv("DEV_MODE") == "true" {
		email := os.Getenv("DEV_USER_EMAIL")
		if email == "" {
			email = "dev@example.com"
		}
		return AuthUser{
			Email:         email,
			User:          email,
			Username:      "Dev User",
			Authenticated: true,
		}
	}

	email := c.Get("X-Auth-Request-Email")
	if email == "" {
		email = c.Get("X-Auth-Request-User")
	}
	username := c.Get("X-Auth-Request-Preferred-Username")
	if username == "" {
		username = email
	}

	return AuthUser{
		Email:         email,
		User:          email,
		Username:      username,
		Authenticated: email != "",
	}
}
```

**Step 2: Create compute handler**

Create `templates/templates/app/skeleton/backend/gofiber/compute.go.njk`:

```go
package main

import (
	"math"

	"github.com/gofiber/fiber/v2"
)

// ComputeRequest is the input for the compute endpoint.
type ComputeRequest struct {
	A  float64 `json:"a"`
	Op string  `json:"op"`
	B  float64 `json:"b"`
}

// ComputeResponse is the output from the compute endpoint.
type ComputeResponse struct {
	A      float64 `json:"a"`
	Op     string  `json:"op"`
	B      float64 `json:"b"`
	Result float64 `json:"result"`
}

// computeHandler godoc
// @Summary     Compute a math operation
// @Tags        compute
// @Accept      json
// @Produce     json
// @Param       body body ComputeRequest true "Compute request"
// @Success     200 {object} ComputeResponse
// @Failure     400 {object} map[string]string
// @Router      /api/compute [post]
func computeHandler(c *fiber.Ctx) error {
	var req ComputeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	var result float64
	switch req.Op {
	case "add":
		result = req.A + req.B
	case "sub":
		result = req.A - req.B
	case "mul":
		result = req.A * req.B
	case "div":
		if req.B == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "division by zero"})
		}
		result = req.A / req.B
	case "pow":
		result = math.Pow(req.A, req.B)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid operation"})
	}

	return c.JSON(ComputeResponse{
		A:      req.A,
		Op:     req.Op,
		B:      req.B,
		Result: result,
	})
}
```

**Step 3: Commit**

```bash
cd templates
git add templates/app/skeleton/backend/gofiber/auth.go.njk templates/app/skeleton/backend/gofiber/compute.go.njk
git commit -m "feat(gofiber): add Authenticated field to AuthUser and compute handler"
```

---

## Task 2: Go Fiber — Admin Handler + authorized_users.json

**Files:**
- Create: `templates/templates/app/skeleton/backend/gofiber/admin.go.njk`
- Create: `templates/templates/app/skeleton/backend/gofiber/authorized_users.json`

**Step 1: Create authorized_users.json**

Create `templates/templates/app/skeleton/backend/gofiber/authorized_users.json`:

```json
["dev@example.com"]
```

**Step 2: Create admin handler**

Create `templates/templates/app/skeleton/backend/gofiber/admin.go.njk`:

```go
package main

import (
	"encoding/json"
	"os"
	"sync"

	"github.com/gofiber/fiber/v2"
)

// AdminUsersResponse is the response from the admin users endpoint.
type AdminUsersResponse struct {
	Authorized bool     `json:"authorized"`
	Users      []string `json:"users"`
}

var (
	authorizedUsers     []string
	authorizedUsersOnce sync.Once
)

func loadAuthorizedUsers() []string {
	authorizedUsersOnce.Do(func() {
		data, err := os.ReadFile("authorized_users.json")
		if err != nil {
			authorizedUsers = []string{}
			return
		}
		if err := json.Unmarshal(data, &authorizedUsers); err != nil {
			authorizedUsers = []string{}
		}
	})
	return authorizedUsers
}

// adminUsersHandler godoc
// @Summary     List authorized users (admin)
// @Tags        admin
// @Produce     json
// @Success     200 {object} AdminUsersResponse
// @Router      /api/admin/users [get]
func adminUsersHandler(c *fiber.Ctx) error {
	user := GetAuthUser(c)
	users := loadAuthorizedUsers()

	authorized := false
	for _, u := range users {
		if u == user.Email {
			authorized = true
			break
		}
	}

	return c.JSON(AdminUsersResponse{
		Authorized: authorized,
		Users:      users,
	})
}
```

**Step 3: Commit**

```bash
cd templates
git add templates/app/skeleton/backend/gofiber/admin.go.njk templates/app/skeleton/backend/gofiber/authorized_users.json
git commit -m "feat(gofiber): add admin handler with authorized_users.json"
```

---

## Task 3: Go Fiber — Update main.go.njk with New Routes

**Files:**
- Modify: `templates/templates/app/skeleton/backend/gofiber/main.go.njk`

**Step 1: Replace main.go.njk**

Replace the entire contents of `templates/templates/app/skeleton/backend/gofiber/main.go.njk`:

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
// @host            localhost:8000
// @BasePath        /api
func main() {
	app := fiber.New()
	app.Use(logger.New())
	app.Use(cors.New())

	app.Get("/swagger/*", swagger.HandlerDefault)
	app.Get("/healthz", healthHandler)

	api := app.Group("/api")
	api.Get("/user", userHandler)
	api.Post("/compute", computeHandler)
	api.Get("/admin/users", adminUsersHandler)

	staticDir := os.Getenv("STATIC_FILES_DIR")
	if staticDir != "" {
		app.Use("/", filesystem.New(filesystem.Config{
			Root: http.Dir(staticDir),
		}))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
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

// userHandler godoc
// @Summary     Get current user identity
// @Tags        auth
// @Produce     json
// @Success     200 {object} AuthUser
// @Router      /api/user [get]
func userHandler(c *fiber.Ctx) error {
	user := GetAuthUser(c)
	return c.JSON(user)
}
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/backend/gofiber/main.go.njk
git commit -m "feat(gofiber): replace hello/whoami routes with user/compute/admin"
```

---

## Task 4: Go Fiber — Update Tests

**Files:**
- Modify: `templates/templates/app/skeleton/backend/gofiber/main_test.go`

**Important:** This file is `main_test.go` (NOT `.njk`). It is a static file that does not go through Nunjucks templating.

**Step 1: Replace main_test.go**

Replace the entire contents of `templates/templates/app/skeleton/backend/gofiber/main_test.go`:

```go
package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// testApp builds a minimal app with handlers wired — no middleware
// that would interfere with tests (no logger noise, no static files).
func testApp() *fiber.App {
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
	})
	app.Get("/healthz", healthHandler)
	api := app.Group("/api")
	api.Get("/user", userHandler)
	api.Post("/compute", computeHandler)
	api.Get("/admin/users", adminUsersHandler)
	return app
}

// helper: perform a test request and return response + body bytes
func doRequest(t *testing.T, app *fiber.App, method, path string) (*http.Response, []byte) {
	t.Helper()
	req := httptest.NewRequest(method, path, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test(%s %s): %v", method, path, err)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("reading body: %v", err)
	}
	return resp, body
}

// helper: perform a test request with JSON body
func doJSONRequest(t *testing.T, app *fiber.App, method, path string, payload any) (*http.Response, []byte) {
	t.Helper()
	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal JSON: %v", err)
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test(%s %s): %v", method, path, err)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("reading body: %v", err)
	}
	return resp, body
}

// ── /healthz ──────────────────────────────────────────────────────────────────

func TestHealthz_Status200(t *testing.T) {
	resp, _ := doRequest(t, testApp(), "GET", "/healthz")
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestHealthz_JSONBody(t *testing.T) {
	_, body := doRequest(t, testApp(), "GET", "/healthz")
	var m map[string]string
	if err := json.Unmarshal(body, &m); err != nil {
		t.Fatalf("unmarshal JSON: %v\nbody: %s", err, body)
	}
	if m["status"] != "ok" {
		t.Errorf("expected status=ok, got %q", m["status"])
	}
}

func TestHealthz_ContentType(t *testing.T) {
	resp, _ := doRequest(t, testApp(), "GET", "/healthz")
	ct := resp.Header.Get("Content-Type")
	if !strings.Contains(ct, "application/json") {
		t.Errorf("expected application/json content-type, got %q", ct)
	}
}

func TestHealthz_MethodNotAllowed(t *testing.T) {
	for _, method := range []string{"POST", "PUT", "DELETE", "PATCH"} {
		resp, _ := doRequest(t, testApp(), method, "/healthz")
		if resp.StatusCode != http.StatusMethodNotAllowed {
			t.Errorf("%s /healthz: expected 405, got %d", method, resp.StatusCode)
		}
	}
}

// ── /api/user ─────────────────────────────────────────────────────────────────

func TestUser_Status200(t *testing.T) {
	t.Setenv("DEV_MODE", "true")
	resp, _ := doRequest(t, testApp(), "GET", "/api/user")
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestUser_DevMode_ReturnsDevUser(t *testing.T) {
	t.Setenv("DEV_MODE", "true")
	t.Setenv("DEV_USER_EMAIL", "test@example.com")
	_, body := doRequest(t, testApp(), "GET", "/api/user")
	var user AuthUser
	if err := json.Unmarshal(body, &user); err != nil {
		t.Fatalf("unmarshal JSON: %v\nbody: %s", err, body)
	}
	if user.Email != "test@example.com" {
		t.Errorf("expected email=test@example.com, got %q", user.Email)
	}
	if !user.Authenticated {
		t.Error("expected authenticated=true in dev mode")
	}
}

func TestUser_NoHeaders_NotAuthenticated(t *testing.T) {
	t.Setenv("DEV_MODE", "false")
	_, body := doRequest(t, testApp(), "GET", "/api/user")
	var user AuthUser
	if err := json.Unmarshal(body, &user); err != nil {
		t.Fatalf("unmarshal JSON: %v\nbody: %s", err, body)
	}
	if user.Authenticated {
		t.Error("expected authenticated=false with no headers")
	}
}

func TestUser_ContentType(t *testing.T) {
	t.Setenv("DEV_MODE", "true")
	resp, _ := doRequest(t, testApp(), "GET", "/api/user")
	ct := resp.Header.Get("Content-Type")
	if !strings.Contains(ct, "application/json") {
		t.Errorf("expected application/json content-type, got %q", ct)
	}
}

// ── POST /api/compute ─────────────────────────────────────────────────────────

func TestCompute_Add(t *testing.T) {
	resp, body := doJSONRequest(t, testApp(), "POST", "/api/compute", ComputeRequest{A: 2, Op: "add", B: 3})
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var result ComputeResponse
	json.Unmarshal(body, &result)
	if result.Result != 5 {
		t.Errorf("expected 5, got %f", result.Result)
	}
}

func TestCompute_Sub(t *testing.T) {
	resp, body := doJSONRequest(t, testApp(), "POST", "/api/compute", ComputeRequest{A: 10, Op: "sub", B: 3})
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var result ComputeResponse
	json.Unmarshal(body, &result)
	if result.Result != 7 {
		t.Errorf("expected 7, got %f", result.Result)
	}
}

func TestCompute_Mul(t *testing.T) {
	resp, body := doJSONRequest(t, testApp(), "POST", "/api/compute", ComputeRequest{A: 4, Op: "mul", B: 5})
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var result ComputeResponse
	json.Unmarshal(body, &result)
	if result.Result != 20 {
		t.Errorf("expected 20, got %f", result.Result)
	}
}

func TestCompute_Div(t *testing.T) {
	resp, body := doJSONRequest(t, testApp(), "POST", "/api/compute", ComputeRequest{A: 10, Op: "div", B: 4})
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var result ComputeResponse
	json.Unmarshal(body, &result)
	if result.Result != 2.5 {
		t.Errorf("expected 2.5, got %f", result.Result)
	}
}

func TestCompute_Pow(t *testing.T) {
	resp, body := doJSONRequest(t, testApp(), "POST", "/api/compute", ComputeRequest{A: 2, Op: "pow", B: 10})
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var result ComputeResponse
	json.Unmarshal(body, &result)
	if result.Result != 1024 {
		t.Errorf("expected 1024, got %f", result.Result)
	}
}

func TestCompute_DivByZero(t *testing.T) {
	resp, _ := doJSONRequest(t, testApp(), "POST", "/api/compute", ComputeRequest{A: 1, Op: "div", B: 0})
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestCompute_InvalidOp(t *testing.T) {
	resp, body := doJSONRequest(t, testApp(), "POST", "/api/compute", ComputeRequest{A: 1, Op: "modulo", B: 2})
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
	var m map[string]string
	json.Unmarshal(body, &m)
	if m["error"] != "invalid operation" {
		t.Errorf("expected 'invalid operation' error, got %q", m["error"])
	}
}

func TestCompute_InvalidBody(t *testing.T) {
	app := testApp()
	req := httptest.NewRequest("POST", "/api/compute", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestCompute_GetMethodNotAllowed(t *testing.T) {
	resp, _ := doRequest(t, testApp(), "GET", "/api/compute")
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("GET /api/compute: expected 405, got %d", resp.StatusCode)
	}
}

func TestCompute_ResponseIncludesInputs(t *testing.T) {
	_, body := doJSONRequest(t, testApp(), "POST", "/api/compute", ComputeRequest{A: 7, Op: "add", B: 3})
	var result ComputeResponse
	json.Unmarshal(body, &result)
	if result.A != 7 || result.B != 3 || result.Op != "add" {
		t.Errorf("response should echo inputs: got a=%f op=%s b=%f", result.A, result.Op, result.B)
	}
}

// ── /api/admin/users ──────────────────────────────────────────────────────────

func TestAdminUsers_Status200(t *testing.T) {
	t.Setenv("DEV_MODE", "true")
	resp, _ := doRequest(t, testApp(), "GET", "/api/admin/users")
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestAdminUsers_DevUser_IsAuthorized(t *testing.T) {
	// Reset the sync.Once so it reloads
	authorizedUsersOnce = *new(sync.Once)
	authorizedUsers = nil

	// Write a temp authorized_users.json
	tmpFile := "authorized_users.json"
	os.WriteFile(tmpFile, []byte(`["dev@example.com"]`), 0644)
	defer os.Remove(tmpFile)

	t.Setenv("DEV_MODE", "true")
	t.Setenv("DEV_USER_EMAIL", "dev@example.com")

	_, body := doRequest(t, testApp(), "GET", "/api/admin/users")
	var resp AdminUsersResponse
	json.Unmarshal(body, &resp)
	if !resp.Authorized {
		t.Error("expected authorized=true for dev@example.com")
	}
}

func TestAdminUsers_UnknownUser_NotAuthorized(t *testing.T) {
	authorizedUsersOnce = *new(sync.Once)
	authorizedUsers = nil

	tmpFile := "authorized_users.json"
	os.WriteFile(tmpFile, []byte(`["dev@example.com"]`), 0644)
	defer os.Remove(tmpFile)

	t.Setenv("DEV_MODE", "true")
	t.Setenv("DEV_USER_EMAIL", "stranger@example.com")

	_, body := doRequest(t, testApp(), "GET", "/api/admin/users")
	var resp AdminUsersResponse
	json.Unmarshal(body, &resp)
	if resp.Authorized {
		t.Error("expected authorized=false for stranger@example.com")
	}
}

func TestAdminUsers_ReturnsUserList(t *testing.T) {
	authorizedUsersOnce = *new(sync.Once)
	authorizedUsers = nil

	tmpFile := "authorized_users.json"
	os.WriteFile(tmpFile, []byte(`["dev@example.com","admin@example.com"]`), 0644)
	defer os.Remove(tmpFile)

	t.Setenv("DEV_MODE", "true")

	_, body := doRequest(t, testApp(), "GET", "/api/admin/users")
	var resp AdminUsersResponse
	json.Unmarshal(body, &resp)
	if len(resp.Users) != 2 {
		t.Errorf("expected 2 users, got %d", len(resp.Users))
	}
}

// ── 404 for unknown routes ────────────────────────────────────────────────────

func TestUnknownRoute_404(t *testing.T) {
	for _, path := range []string{"/notfound", "/api/notfound", "/api/"} {
		resp, _ := doRequest(t, testApp(), "GET", path)
		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("GET %s: expected 404, got %d", path, resp.StatusCode)
		}
	}
}
```

**Step 2: Run tests locally to verify they compile**

Run: `cd templates/templates/app/skeleton/backend/gofiber && go vet ./...`

Note: Tests won't fully pass outside a Go module context, but `go vet` confirms no syntax errors.

**Step 3: Commit**

```bash
cd templates
git add templates/app/skeleton/backend/gofiber/main_test.go
git commit -m "test(gofiber): update tests for user/compute/admin endpoints"
```

---

## Task 5: FastAPI — Auth Update + Compute Handler

**Files:**
- Modify: `templates/templates/app/skeleton/backend/fastapi/auth.py.njk`
- Create: `templates/templates/app/skeleton/backend/fastapi/compute.py.njk`

**Step 1: Update auth.py.njk to include authenticated field**

Replace the entire contents of `templates/templates/app/skeleton/backend/fastapi/auth.py.njk`:

```python
"""OAuth2 proxy authentication helpers.

In production, user info comes from X-Auth-Request-* headers set by
oauth2-proxy via Traefik ForwardAuth. In development (DEV_MODE=true),
a simulated user is returned from the DEV_USER_EMAIL env var.
"""

import os
from dataclasses import dataclass

from fastapi import Request

_DEV_MODE = os.getenv("DEV_MODE", "").lower() == "true"
_DEV_USER_EMAIL = os.getenv("DEV_USER_EMAIL", "dev@example.com")


@dataclass
class AuthUser:
    email: str
    user: str
    username: str
    authenticated: bool


def get_auth_user(request: Request) -> AuthUser:
    """Get the authenticated user from OAuth2 headers or dev fallback."""
    if _DEV_MODE:
        return AuthUser(
            email=_DEV_USER_EMAIL,
            user=_DEV_USER_EMAIL,
            username="Dev User",
            authenticated=True,
        )

    email = request.headers.get("X-Auth-Request-Email") or request.headers.get(
        "X-Auth-Request-User", ""
    )
    username = request.headers.get("X-Auth-Request-Preferred-Username", email)

    return AuthUser(
        email=email,
        user=email,
        username=username,
        authenticated=bool(email),
    )
```

**Step 2: Create compute handler**

Create `templates/templates/app/skeleton/backend/fastapi/compute.py.njk`:

```python
"""Compute endpoint — simple calculator API."""

import math

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

VALID_OPS = {"add", "sub", "mul", "div", "pow"}


class ComputeRequest(BaseModel):
    a: float
    op: str
    b: float


class ComputeResponse(BaseModel):
    a: float
    op: str
    b: float
    result: float


@router.post("/api/compute", tags=["compute"], response_model=ComputeResponse)
async def compute(req: ComputeRequest) -> ComputeResponse:
    """Compute a math operation: add, sub, mul, div, pow."""
    if req.op not in VALID_OPS:
        raise HTTPException(status_code=400, detail="invalid operation")

    if req.op == "add":
        result = req.a + req.b
    elif req.op == "sub":
        result = req.a - req.b
    elif req.op == "mul":
        result = req.a * req.b
    elif req.op == "div":
        if req.b == 0:
            raise HTTPException(status_code=400, detail="division by zero")
        result = req.a / req.b
    elif req.op == "pow":
        result = math.pow(req.a, req.b)

    return ComputeResponse(a=req.a, op=req.op, b=req.b, result=result)
```

**Step 3: Commit**

```bash
cd templates
git add templates/app/skeleton/backend/fastapi/auth.py.njk templates/app/skeleton/backend/fastapi/compute.py.njk
git commit -m "feat(fastapi): add authenticated field to AuthUser and compute handler"
```

---

## Task 6: FastAPI — Admin Handler + authorized_users.json

**Files:**
- Create: `templates/templates/app/skeleton/backend/fastapi/admin.py.njk`
- Create: `templates/templates/app/skeleton/backend/fastapi/authorized_users.json`

**Step 1: Create authorized_users.json**

Create `templates/templates/app/skeleton/backend/fastapi/authorized_users.json`:

```json
["dev@example.com"]
```

**Step 2: Create admin handler**

Create `templates/templates/app/skeleton/backend/fastapi/admin.py.njk`:

```python
"""Admin endpoint — permission-checked user list."""

import json
from pathlib import Path

from fastapi import APIRouter, Request
from pydantic import BaseModel

from auth import get_auth_user

router = APIRouter()

_AUTHORIZED_USERS_PATH = Path(__file__).parent / "authorized_users.json"


class AdminUsersResponse(BaseModel):
    authorized: bool
    users: list[str]


def _load_authorized_users() -> list[str]:
    """Load authorized user emails from JSON file."""
    try:
        return json.loads(_AUTHORIZED_USERS_PATH.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return []


@router.get(
    "/api/admin/users", tags=["admin"], response_model=AdminUsersResponse
)
async def admin_users(request: Request) -> AdminUsersResponse:
    """List authorized users. Returns whether current user is authorized."""
    user = get_auth_user(request)
    users = _load_authorized_users()
    return AdminUsersResponse(
        authorized=user.email in users,
        users=users,
    )
```

**Step 3: Commit**

```bash
cd templates
git add templates/app/skeleton/backend/fastapi/admin.py.njk templates/app/skeleton/backend/fastapi/authorized_users.json
git commit -m "feat(fastapi): add admin handler with authorized_users.json"
```

---

## Task 7: FastAPI — Update main.py.njk with New Routes

**Files:**
- Modify: `templates/templates/app/skeleton/backend/fastapi/main.py.njk`

**Step 1: Replace main.py.njk**

Replace the entire contents of `templates/templates/app/skeleton/backend/fastapi/main.py.njk`:

```python
import os

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from admin import router as admin_router
from auth import AuthUser, get_auth_user
from compute import router as compute_router

app = FastAPI(
    title="${{ values.name }} API",
    description="${{ values.description }}",
    version="1.0.0",
)

app.include_router(compute_router)
app.include_router(admin_router)


@app.get("/healthz", tags=["ops"])
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/user", tags=["auth"])
async def user(request: Request) -> AuthUser:
    """Get current user identity."""
    return get_auth_user(request)


# Serve frontend static files if STATIC_FILES_DIR is set
_static_dir = os.getenv("STATIC_FILES_DIR")
if _static_dir and os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/backend/fastapi/main.py.njk
git commit -m "feat(fastapi): replace hello/whoami routes with user/compute/admin"
```

---

## Task 8: FastAPI — Update Tests

**Files:**
- Modify: `templates/templates/app/skeleton/backend/fastapi/test_main.py.njk`

**Step 1: Replace test_main.py.njk**

Replace the entire contents of `templates/templates/app/skeleton/backend/fastapi/test_main.py.njk`:

```python
"""Integration tests for ${{ values.name }} API."""

import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app, raise_server_exceptions=True)


# ── /healthz ──────────────────────────────────────────────────────────────────


class TestHealthz:
    def test_status_200(self) -> None:
        response = client.get("/healthz")
        assert response.status_code == 200

    def test_returns_ok(self) -> None:
        response = client.get("/healthz")
        assert response.json() == {"status": "ok"}

    def test_content_type_json(self) -> None:
        response = client.get("/healthz")
        assert "application/json" in response.headers["content-type"]

    def test_post_method_not_allowed(self) -> None:
        response = client.post("/healthz")
        assert response.status_code == 405

    def test_put_method_not_allowed(self) -> None:
        response = client.put("/healthz")
        assert response.status_code == 405

    def test_delete_method_not_allowed(self) -> None:
        response = client.delete("/healthz")
        assert response.status_code == 405


# ── /api/user ─────────────────────────────────────────────────────────────────


class TestUser:
    @patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_EMAIL": "test@example.com"})
    def test_status_200(self) -> None:
        response = client.get("/api/user")
        assert response.status_code == 200

    @patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_EMAIL": "test@example.com"})
    def test_returns_email(self) -> None:
        response = client.get("/api/user")
        data = response.json()
        assert data["email"] == "test@example.com"

    @patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_EMAIL": "test@example.com"})
    def test_returns_authenticated_true(self) -> None:
        response = client.get("/api/user")
        data = response.json()
        assert data["authenticated"] is True

    def test_no_headers_not_authenticated(self) -> None:
        response = client.get("/api/user")
        data = response.json()
        assert data["authenticated"] is False

    def test_content_type_json(self) -> None:
        response = client.get("/api/user")
        assert "application/json" in response.headers["content-type"]

    def test_post_method_not_allowed(self) -> None:
        response = client.post("/api/user")
        assert response.status_code == 405


# ── POST /api/compute ────────────────────────────────────────────────────────


class TestCompute:
    def test_add(self) -> None:
        response = client.post("/api/compute", json={"a": 2, "op": "add", "b": 3})
        assert response.status_code == 200
        assert response.json()["result"] == 5

    def test_sub(self) -> None:
        response = client.post("/api/compute", json={"a": 10, "op": "sub", "b": 3})
        assert response.status_code == 200
        assert response.json()["result"] == 7

    def test_mul(self) -> None:
        response = client.post("/api/compute", json={"a": 4, "op": "mul", "b": 5})
        assert response.status_code == 200
        assert response.json()["result"] == 20

    def test_div(self) -> None:
        response = client.post("/api/compute", json={"a": 10, "op": "div", "b": 4})
        assert response.status_code == 200
        assert response.json()["result"] == 2.5

    def test_pow(self) -> None:
        response = client.post("/api/compute", json={"a": 2, "op": "pow", "b": 10})
        assert response.status_code == 200
        assert response.json()["result"] == 1024

    def test_div_by_zero(self) -> None:
        response = client.post("/api/compute", json={"a": 1, "op": "div", "b": 0})
        assert response.status_code == 400

    def test_invalid_op(self) -> None:
        response = client.post("/api/compute", json={"a": 1, "op": "modulo", "b": 2})
        assert response.status_code == 400

    def test_response_includes_inputs(self) -> None:
        response = client.post("/api/compute", json={"a": 7, "op": "add", "b": 3})
        data = response.json()
        assert data["a"] == 7
        assert data["b"] == 3
        assert data["op"] == "add"

    def test_get_method_not_allowed(self) -> None:
        response = client.get("/api/compute")
        assert response.status_code in (404, 405)

    def test_missing_fields_422(self) -> None:
        response = client.post("/api/compute", json={"a": 1})
        assert response.status_code == 422


# ── /api/admin/users ─────────────────────────────────────────────────────────


class TestAdminUsers:
    def _write_users(self, users: list[str], tmp_path: Path) -> Path:
        p = tmp_path / "authorized_users.json"
        p.write_text(json.dumps(users))
        return p

    @patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_EMAIL": "dev@example.com"})
    def test_status_200(self) -> None:
        response = client.get("/api/admin/users")
        assert response.status_code == 200

    @patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_EMAIL": "dev@example.com"})
    def test_authorized_user(self, tmp_path: Path) -> None:
        users_file = self._write_users(["dev@example.com"], tmp_path)
        with patch("admin._AUTHORIZED_USERS_PATH", users_file):
            response = client.get("/api/admin/users")
            data = response.json()
            assert data["authorized"] is True

    @patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_EMAIL": "stranger@example.com"})
    def test_unauthorized_user(self, tmp_path: Path) -> None:
        users_file = self._write_users(["dev@example.com"], tmp_path)
        with patch("admin._AUTHORIZED_USERS_PATH", users_file):
            response = client.get("/api/admin/users")
            data = response.json()
            assert data["authorized"] is False

    @patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_EMAIL": "dev@example.com"})
    def test_returns_user_list(self, tmp_path: Path) -> None:
        users_file = self._write_users(["dev@example.com", "admin@example.com"], tmp_path)
        with patch("admin._AUTHORIZED_USERS_PATH", users_file):
            response = client.get("/api/admin/users")
            data = response.json()
            assert len(data["users"]) == 2


# ── OpenAPI ───────────────────────────────────────────────────────────────────


class TestOpenAPI:
    def test_openapi_json_status_200(self) -> None:
        response = client.get("/openapi.json")
        assert response.status_code == 200

    def test_openapi_title_matches_app(self) -> None:
        response = client.get("/openapi.json")
        schema = response.json()
        assert schema["info"]["title"] == "${{ values.name }} API"

    def test_openapi_has_compute_path(self) -> None:
        response = client.get("/openapi.json")
        paths = response.json()["paths"]
        assert "/api/compute" in paths

    def test_openapi_has_user_path(self) -> None:
        response = client.get("/openapi.json")
        paths = response.json()["paths"]
        assert "/api/user" in paths

    def test_openapi_has_admin_path(self) -> None:
        response = client.get("/openapi.json")
        paths = response.json()["paths"]
        assert "/api/admin/users" in paths

    def test_docs_ui_accessible(self) -> None:
        response = client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]


# ── 404 for unknown routes ────────────────────────────────────────────────────


class TestNotFound:
    @pytest.mark.parametrize("path", ["/notfound", "/api/notfound", "/api/"])
    def test_unknown_routes_return_404(self, path: str) -> None:
        response = client.get(path)
        assert response.status_code == 404
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/backend/fastapi/test_main.py.njk
git commit -m "test(fastapi): update tests for user/compute/admin endpoints"
```

---

## Task 9: React Frontend — Calculator + Admin Pages

**Files:**
- Modify: `templates/templates/app/skeleton/frontend/react/src/App.tsx.njk`

**Step 1: Replace App.tsx.njk**

Replace the entire contents of `templates/templates/app/skeleton/frontend/react/src/App.tsx.njk`:

```tsx
import { useState, useEffect, FormEvent } from 'react'

type Page = 'main' | 'admin'
type Op = 'add' | 'sub' | 'mul' | 'div' | 'pow'

interface User {
  email: string
  username: string
  authenticated: boolean
}

interface ComputeResult {
  a: number
  op: string
  b: number
  result: number
}

interface AdminData {
  authorized: boolean
  users: string[]
}

function MainPage() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [op, setOp] = useState<Op>('add')
  const [result, setResult] = useState<ComputeResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    try {
      const resp = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: Number(a), op, b: Number(b) }),
      })
      if (!resp.ok) {
        const data = await resp.json()
        setError(data.error || data.detail || 'Request failed')
        return
      }
      setResult(await resp.json())
    } catch {
      setError('Network error')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Calculator</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={a}
            onChange={e => setA(e.target.value)}
            placeholder="a"
            step="any"
            required
            className="w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={op}
            onChange={e => setOp(e.target.value as Op)}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="add">+</option>
            <option value="sub">-</option>
            <option value="mul">&times;</option>
            <option value="div">&divide;</option>
            <option value="pow">^</option>
          </select>
          <input
            type="number"
            value={b}
            onChange={e => setB(e.target.value)}
            placeholder="b"
            step="any"
            required
            className="w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            =
          </button>
        </div>
      </form>
      {result && (
        <p className="mt-4 text-lg text-gray-700">
          {result.a} {result.op} {result.b} = <span className="font-bold">{result.result}</span>
        </p>
      )}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  )
}

function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (!data) return <p className="text-red-600">Failed to load admin data</p>

  if (!data.authorized) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600">You are not authorized to view this page.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Authorized Users</h2>
      <ul className="list-disc list-inside space-y-1">
        {data.users.map(u => (
          <li key={u} className="text-gray-700">{u}</li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  const [page, setPage] = useState<Page>('main')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(setUser)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">${{ values.name }}</h1>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => setPage('main')}
              className={`text-sm font-medium ${page === 'main' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Calculator
            </button>
            <button
              onClick={() => setPage('admin')}
              className={`text-sm font-medium ${page === 'admin' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Admin
            </button>
            {user && (
              <span className="text-sm text-gray-500">
                {user.authenticated ? user.email : 'Not signed in'}
              </span>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {page === 'main' ? <MainPage /> : <AdminPage />}
        </div>
      </main>
    </div>
  )
}

export default App
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/frontend/react/src/App.tsx.njk
git commit -m "feat(react): add calculator + admin pages with API integration"
```

---

## Task 10: React Frontend — Update Tests

**Files:**
- Modify: `templates/templates/app/skeleton/frontend/react/src/App.test.tsx`

**Step 1: Replace App.test.tsx**

Replace the entire contents of `templates/templates/app/skeleton/frontend/react/src/App.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

// Mock fetch for all tests
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation((url: string) => {
    if (url === '/api/user') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
      })
    }
    if (url === '/api/admin/users') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ authorized: true, users: ['dev@example.com'] }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

describe('App component', () => {
  describe('rendering', () => {
    it('mounts without throwing', () => {
      expect(() => render(<App />)).not.toThrow()
    })

    it('renders the app name as heading', () => {
      render(<App />)
      expect(screen.getByRole('heading', { level: 1 })).toBeDefined()
    })

    it('renders Calculator and Admin nav buttons', () => {
      render(<App />)
      expect(screen.getByText('Calculator')).toBeDefined()
      expect(screen.getByText('Admin')).toBeDefined()
    })
  })

  describe('layout', () => {
    it('root element has full-screen wrapper class', () => {
      const { container } = render(<App />)
      expect(container.firstElementChild?.className).toContain('min-h-screen')
    })

    it('renders a white card container', () => {
      const { container } = render(<App />)
      expect(container.querySelector('.bg-white')).not.toBeNull()
    })
  })

  describe('calculator page', () => {
    it('renders number inputs', () => {
      const { container } = render(<App />)
      const inputs = container.querySelectorAll('input[type="number"]')
      expect(inputs.length).toBe(2)
    })

    it('renders operation select', () => {
      const { container } = render(<App />)
      expect(container.querySelector('select')).not.toBeNull()
    })

    it('renders submit button', () => {
      const { container } = render(<App />)
      expect(container.querySelector('button[type="submit"]')).not.toBeNull()
    })
  })

  describe('api calls', () => {
    it('fetches /api/user on mount', () => {
      render(<App />)
      expect(mockFetch).toHaveBeenCalledWith('/api/user')
    })
  })
})
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/frontend/react/src/App.test.tsx
git commit -m "test(react): update tests for calculator + admin pages"
```

---

## Task 11: Lit Frontend — Calculator + Admin Pages

**Files:**
- Modify: `templates/templates/app/skeleton/frontend/lit/src/app-root.ts.njk`

**Step 1: Replace app-root.ts.njk**

Replace the entire contents of `templates/templates/app/skeleton/frontend/lit/src/app-root.ts.njk`:

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'

interface User {
  email: string
  username: string
  authenticated: boolean
}

interface ComputeResult {
  a: number
  op: string
  b: number
  result: number
}

interface AdminData {
  authorized: boolean
  users: string[]
}

@customElement('app-root')
export class AppRoot extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `

  @state() private page: 'main' | 'admin' = 'main'
  @state() private user: User | null = null
  @state() private result: ComputeResult | null = null
  @state() private computeError = ''
  @state() private adminData: AdminData | null = null
  @state() private adminLoading = false

  connectedCallback() {
    super.connectedCallback()
    fetch('/api/user')
      .then(r => r.json())
      .then(u => { this.user = u })
  }

  private async handleCompute(e: Event) {
    e.preventDefault()
    this.computeError = ''
    this.result = null
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    try {
      const resp = await fetch('/api/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a: Number(formData.get('a')),
          op: formData.get('op'),
          b: Number(formData.get('b')),
        }),
      })
      if (!resp.ok) {
        const data = await resp.json()
        this.computeError = data.error || data.detail || 'Request failed'
        return
      }
      this.result = await resp.json()
    } catch {
      this.computeError = 'Network error'
    }
  }

  private async showAdmin() {
    this.page = 'admin'
    this.adminLoading = true
    try {
      const resp = await fetch('/api/admin/users')
      this.adminData = await resp.json()
    } finally {
      this.adminLoading = false
    }
  }

  render() {
    return html`
      <div class="min-h-screen bg-gray-100">
        <header class="bg-white shadow">
          <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 class="text-2xl font-bold text-gray-900">${{ values.name }}</h1>
            <nav class="flex items-center gap-4">
              <button
                @click=${() => { this.page = 'main' }}
                class="text-sm font-medium ${this.page === 'main' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}"
              >Calculator</button>
              <button
                @click=${() => this.showAdmin()}
                class="text-sm font-medium ${this.page === 'admin' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}"
              >Admin</button>
              ${this.user ? html`
                <span class="text-sm text-gray-500">
                  ${this.user.authenticated ? this.user.email : 'Not signed in'}
                </span>
              ` : ''}
            </nav>
          </div>
        </header>
        <main class="max-w-3xl mx-auto px-4 py-8">
          <div class="bg-white rounded-lg shadow p-6">
            ${this.page === 'main' ? this.renderMain() : this.renderAdmin()}
          </div>
        </main>
      </div>
    `
  }

  private renderMain() {
    return html`
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Calculator</h2>
      <form @submit=${this.handleCompute} class="space-y-4">
        <div class="flex items-center gap-2">
          <input
            type="number"
            name="a"
            placeholder="a"
            step="any"
            required
            class="w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="op"
            class="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="add">+</option>
            <option value="sub">-</option>
            <option value="mul">&times;</option>
            <option value="div">&divide;</option>
            <option value="pow">^</option>
          </select>
          <input
            type="number"
            name="b"
            placeholder="b"
            step="any"
            required
            class="w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >=</button>
        </div>
      </form>
      ${this.result ? html`
        <p class="mt-4 text-lg text-gray-700">
          ${this.result.a} ${this.result.op} ${this.result.b} =
          <span class="font-bold">${this.result.result}</span>
        </p>
      ` : ''}
      ${this.computeError ? html`<p class="mt-4 text-red-600">${this.computeError}</p>` : ''}
    `
  }

  private renderAdmin() {
    if (this.adminLoading) return html`<p class="text-gray-500">Loading...</p>`
    if (!this.adminData) return html`<p class="text-red-600">Failed to load admin data</p>`

    if (!this.adminData.authorized) {
      return html`
        <h2 class="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
        <p class="text-gray-600">You are not authorized to view this page.</p>
      `
    }

    return html`
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Authorized Users</h2>
      <ul class="list-disc list-inside space-y-1">
        ${this.adminData.users.map(u => html`<li class="text-gray-700">${u}</li>`)}
      </ul>
    `
  }
}
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/frontend/lit/src/app-root.ts.njk
git commit -m "feat(lit): add calculator + admin pages with API integration"
```

---

## Task 12: Lit Frontend — Update Tests

**Files:**
- Modify: `templates/templates/app/skeleton/frontend/lit/src/app-root.test.ts`

**Step 1: Replace app-root.test.ts**

Replace the entire contents of `templates/templates/app/skeleton/frontend/lit/src/app-root.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AppRoot } from './app-root.ts'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as any

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation((url: string) => {
    if (url === '/api/user') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
})

describe('AppRoot custom element', () => {
  describe('registration', () => {
    it('is registered in the custom element registry', () => {
      expect(customElements.get('app-root')).toBeDefined()
    })

    it('is the AppRoot class', () => {
      expect(customElements.get('app-root')).toBe(AppRoot)
    })
  })

  describe('lifecycle', () => {
    let el: AppRoot

    beforeEach(async () => {
      el = document.createElement('app-root') as AppRoot
      document.body.appendChild(el)
      await el.updateComplete
    })

    afterEach(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })

    it('is an instance of AppRoot', () => {
      expect(el).toBeInstanceOf(AppRoot)
    })

    it('is an instance of HTMLElement', () => {
      expect(el).toBeInstanceOf(HTMLElement)
    })

    it('is attached to the DOM', () => {
      expect(document.contains(el)).toBe(true)
    })

    it('has a shadow root', () => {
      expect(el.shadowRoot).not.toBeNull()
    })

    it('updateComplete resolves to true', async () => {
      const result = await el.updateComplete
      expect(result).toBe(true)
    })

    it('fetches /api/user on connect', () => {
      expect(mockFetch).toHaveBeenCalledWith('/api/user')
    })
  })

  describe('styles', () => {
    it('has static styles defined', () => {
      expect(AppRoot.styles).toBeDefined()
    })
  })

  describe('shadow DOM content', () => {
    let el: AppRoot

    beforeEach(async () => {
      el = document.createElement('app-root') as AppRoot
      document.body.appendChild(el)
      await el.updateComplete
    })

    afterEach(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })

    it('renders an h1 heading', () => {
      expect(el.shadowRoot?.querySelector('h1')).not.toBeNull()
    })

    it('renders Calculator nav button', () => {
      const buttons = el.shadowRoot?.querySelectorAll('button')
      const texts = Array.from(buttons || []).map(b => b.textContent?.trim())
      expect(texts).toContain('Calculator')
    })

    it('renders Admin nav button', () => {
      const buttons = el.shadowRoot?.querySelectorAll('button')
      const texts = Array.from(buttons || []).map(b => b.textContent?.trim())
      expect(texts).toContain('Admin')
    })

    it('renders number inputs for calculator', () => {
      const inputs = el.shadowRoot?.querySelectorAll('input[type="number"]')
      expect(inputs?.length).toBe(2)
    })

    it('renders operation select', () => {
      expect(el.shadowRoot?.querySelector('select')).not.toBeNull()
    })
  })
})
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/frontend/lit/src/app-root.test.ts
git commit -m "test(lit): update tests for calculator + admin pages"
```

---

## Task 13: Vanilla TS Frontend — Calculator + Admin Pages with Hash Routing

**Files:**
- Modify: `templates/templates/app/skeleton/frontend/typescript/src/app.ts.njk`

**Step 1: Replace app.ts.njk**

Replace the entire contents of `templates/templates/app/skeleton/frontend/typescript/src/app.ts.njk`:

```typescript
interface User {
  email: string
  username: string
  authenticated: boolean
}

interface ComputeResult {
  a: number
  op: string
  b: number
  result: number
}

interface AdminData {
  authorized: boolean
  users: string[]
}

export class App {
  private user: User | null = null

  constructor(private readonly container: HTMLElement) {}

  render(): void {
    this.container.replaceChildren()
    this.fetchUser()
    this.route()
    window.addEventListener('hashchange', () => this.route())
  }

  private async fetchUser() {
    try {
      const resp = await fetch('/api/user')
      this.user = await resp.json()
      this.updateUserDisplay()
    } catch { /* ignore */ }
  }

  private route() {
    const hash = window.location.hash
    const main = this.container.querySelector('[data-page]') as HTMLElement | null
    if (main) main.remove()

    if (hash === '#/admin') {
      this.renderAdmin()
    } else {
      this.renderMain()
    }
  }

  private renderShell(): HTMLElement {
    this.container.replaceChildren()

    const wrapper = document.createElement('div')
    wrapper.className = 'min-h-screen bg-gray-100'

    // Header
    const header = document.createElement('header')
    header.className = 'bg-white shadow'
    const headerInner = document.createElement('div')
    headerInner.className = 'max-w-3xl mx-auto px-4 py-4 flex items-center justify-between'

    const h1 = document.createElement('h1')
    h1.className = 'text-2xl font-bold text-gray-900'
    h1.textContent = '${{ values.name }}'

    const nav = document.createElement('nav')
    nav.className = 'flex items-center gap-4'

    const calcLink = document.createElement('a')
    calcLink.href = '#/'
    calcLink.className = 'text-sm font-medium text-gray-500 hover:text-gray-700'
    calcLink.textContent = 'Calculator'

    const adminLink = document.createElement('a')
    adminLink.href = '#/admin'
    adminLink.className = 'text-sm font-medium text-gray-500 hover:text-gray-700'
    adminLink.textContent = 'Admin'

    const userSpan = document.createElement('span')
    userSpan.className = 'text-sm text-gray-500'
    userSpan.dataset.userDisplay = ''
    if (this.user) {
      userSpan.textContent = this.user.authenticated ? this.user.email : 'Not signed in'
    }

    nav.append(calcLink, adminLink, userSpan)
    headerInner.append(h1, nav)
    header.appendChild(headerInner)

    // Main
    const main = document.createElement('main')
    main.className = 'max-w-3xl mx-auto px-4 py-8'
    const card = document.createElement('div')
    card.className = 'bg-white rounded-lg shadow p-6'
    card.dataset.page = ''
    main.appendChild(card)

    wrapper.append(header, main)
    this.container.appendChild(wrapper)
    return card
  }

  private updateUserDisplay() {
    const span = this.container.querySelector('[data-user-display]')
    if (span && this.user) {
      span.textContent = this.user.authenticated ? this.user.email : 'Not signed in'
    }
  }

  private renderMain() {
    const card = this.renderShell()

    const h2 = document.createElement('h2')
    h2.className = 'text-xl font-semibold text-gray-800 mb-4'
    h2.textContent = 'Calculator'

    const form = document.createElement('form')
    form.className = 'space-y-4'
    const row = document.createElement('div')
    row.className = 'flex items-center gap-2'

    const inputA = document.createElement('input')
    inputA.type = 'number'
    inputA.name = 'a'
    inputA.placeholder = 'a'
    inputA.step = 'any'
    inputA.required = true
    inputA.className = 'w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'

    const select = document.createElement('select')
    select.name = 'op'
    select.className = 'px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
    for (const [val, label] of [['add', '+'], ['sub', '-'], ['mul', '\u00d7'], ['div', '\u00f7'], ['pow', '^']]) {
      const opt = document.createElement('option')
      opt.value = val
      opt.textContent = label
      select.appendChild(opt)
    }

    const inputB = document.createElement('input')
    inputB.type = 'number'
    inputB.name = 'b'
    inputB.placeholder = 'b'
    inputB.step = 'any'
    inputB.required = true
    inputB.className = 'w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'

    const btn = document.createElement('button')
    btn.type = 'submit'
    btn.className = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition'
    btn.textContent = '='

    row.append(inputA, select, inputB, btn)
    form.appendChild(row)

    const resultP = document.createElement('p')
    resultP.className = 'mt-4 text-lg text-gray-700 hidden'

    const errorP = document.createElement('p')
    errorP.className = 'mt-4 text-red-600 hidden'

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      resultP.classList.add('hidden')
      resultP.textContent = ''
      errorP.classList.add('hidden')
      try {
        const resp = await fetch('/api/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            a: Number(inputA.value),
            op: select.value,
            b: Number(inputB.value),
          }),
        })
        if (!resp.ok) {
          const data = await resp.json()
          errorP.textContent = data.error || data.detail || 'Request failed'
          errorP.classList.remove('hidden')
          return
        }
        const result: ComputeResult = await resp.json()
        // Build result display using safe DOM methods (no innerHTML)
        resultP.textContent = ''
        resultP.append(
          document.createTextNode(`${result.a} ${result.op} ${result.b} = `),
        )
        const bold = document.createElement('span')
        bold.className = 'font-bold'
        bold.textContent = String(result.result)
        resultP.appendChild(bold)
        resultP.classList.remove('hidden')
      } catch {
        errorP.textContent = 'Network error'
        errorP.classList.remove('hidden')
      }
    })

    card.append(h2, form, resultP, errorP)
  }

  private async renderAdmin() {
    const card = this.renderShell()

    const loading = document.createElement('p')
    loading.className = 'text-gray-500'
    loading.textContent = 'Loading...'
    card.appendChild(loading)

    try {
      const resp = await fetch('/api/admin/users')
      const data: AdminData = await resp.json()
      card.replaceChildren()

      if (!data.authorized) {
        const h2 = document.createElement('h2')
        h2.className = 'text-xl font-semibold text-red-600 mb-2'
        h2.textContent = 'Access Denied'
        const p = document.createElement('p')
        p.className = 'text-gray-600'
        p.textContent = 'You are not authorized to view this page.'
        card.append(h2, p)
        return
      }

      const h2 = document.createElement('h2')
      h2.className = 'text-xl font-semibold text-gray-800 mb-4'
      h2.textContent = 'Authorized Users'
      const ul = document.createElement('ul')
      ul.className = 'list-disc list-inside space-y-1'
      for (const u of data.users) {
        const li = document.createElement('li')
        li.className = 'text-gray-700'
        li.textContent = u
        ul.appendChild(li)
      }
      card.append(h2, ul)
    } catch {
      card.replaceChildren()
      const err = document.createElement('p')
      err.className = 'text-red-600'
      err.textContent = 'Failed to load admin data'
      card.appendChild(err)
    }
  }
}
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/frontend/typescript/src/app.ts.njk
git commit -m "feat(vanilla-ts): add calculator + admin pages with hash routing"
```

---

## Task 14: Vanilla TS Frontend — Update Tests

**Files:**
- Modify: `templates/templates/app/skeleton/frontend/typescript/src/app.test.ts`

**Step 1: Replace app.test.ts**

Replace the entire contents of `templates/templates/app/skeleton/frontend/typescript/src/app.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { App } from './app.ts'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as any

beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockImplementation((url: string) => {
    if (url === '/api/user') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com', username: 'Test', authenticated: true }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
  window.location.hash = ''
})

describe('App class', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
  })

  describe('render()', () => {
    it('does not throw on first render', () => {
      expect(() => new App(container).render()).not.toThrow()
    })

    it('produces DOM children', () => {
      new App(container).render()
      expect(container.children.length).toBeGreaterThan(0)
    })

    it('renders exactly one h1 element', () => {
      new App(container).render()
      expect(container.querySelectorAll('h1')).toHaveLength(1)
    })

    it('renders a Calculator heading (h2)', () => {
      new App(container).render()
      const h2 = container.querySelector('h2')
      expect(h2?.textContent).toBe('Calculator')
    })

    it('fetches /api/user on render', () => {
      new App(container).render()
      expect(mockFetch).toHaveBeenCalledWith('/api/user')
    })
  })

  describe('calculator page', () => {
    it('renders number inputs', () => {
      new App(container).render()
      const inputs = container.querySelectorAll('input[type="number"]')
      expect(inputs.length).toBe(2)
    })

    it('renders operation select', () => {
      new App(container).render()
      expect(container.querySelector('select')).not.toBeNull()
    })

    it('renders submit button', () => {
      new App(container).render()
      expect(container.querySelector('button[type="submit"]')).not.toBeNull()
    })

    it('select has all 5 operations', () => {
      new App(container).render()
      const options = container.querySelectorAll('select option')
      expect(options.length).toBe(5)
    })
  })

  describe('navigation', () => {
    it('has Calculator link', () => {
      new App(container).render()
      const link = container.querySelector('a[href="#/"]')
      expect(link).not.toBeNull()
      expect(link?.textContent).toBe('Calculator')
    })

    it('has Admin link', () => {
      new App(container).render()
      const link = container.querySelector('a[href="#/admin"]')
      expect(link).not.toBeNull()
      expect(link?.textContent).toBe('Admin')
    })
  })

  describe('layout classes', () => {
    it('outer wrapper has min-h-screen class', () => {
      new App(container).render()
      expect(container.firstElementChild?.className).toContain('min-h-screen')
    })

    it('card has bg-white class', () => {
      new App(container).render()
      expect(container.querySelector('.bg-white')).not.toBeNull()
    })

    it('card has shadow class', () => {
      new App(container).render()
      const card = container.querySelector('.bg-white.shadow')
      expect(card).not.toBeNull()
    })
  })
})
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/frontend/typescript/src/app.test.ts
git commit -m "test(vanilla-ts): update tests for calculator + admin pages"
```

---

## Task 15: Catalog Integration — Add API Entity

**Files:**
- Modify: `templates/templates/app/skeleton/common/catalog-info.yaml.njk`

**Step 1: Replace catalog-info.yaml.njk with API entity added**

Replace the entire contents of `templates/templates/app/skeleton/common/catalog-info.yaml.njk`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{ values.name }}
  description: ${{ values.description }}
  annotations:
    github.com/project-slug: ${{ values.owner }}/${{ values.name }}
    backstage.io/kubernetes-id: ${{ values.name }}
    backstage.io/techdocs-ref: url:https://github.com/${{ values.owner }}/${{ values.name }}
  links:
    - url: https://${{ values.name }}.staging.oshers.com
      title: Live Site
      icon: web
    - url: https://github.com/${{ values.owner }}/${{ values.name }}/actions
      title: CI/CD Pipelines
      icon: github
    - url: https://hub.docker.com/r/${{ values.dockerhub_org }}/${{ values.name }}
      title: Docker Hub
      icon: docker
    - url: https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/${{ values.owner }}/${{ values.name }}
      title: Open in Dev Container
      icon: code
spec:
  type: service
  lifecycle: experimental
  owner: user:default/${{ values.backstageUser }}
{% if values.backend !== "none" %}
  providesApis:
    - ${{ values.name }}-api
{% endif %}
{% if values.backend !== "none" %}
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: ${{ values.name }}-api
  description: ${{ values.description }} API
spec:
  type: openapi
  lifecycle: experimental
  owner: user:default/${{ values.backstageUser }}
{% if values.backend === "gofiber" %}
  definition:
    $text: https://${{ values.name }}.staging.oshers.com/swagger/doc.json
{% elif values.backend === "fastapi" %}
  definition:
    $text: https://${{ values.name }}.staging.oshers.com/openapi.json
{% endif %}
{% endif %}
```

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/common/catalog-info.yaml.njk
git commit -m "feat(catalog): add API entity with OpenAPI spec reference"
```

---

## Task 16: Dockerfile — Copy authorized_users.json

**Files:**
- Modify: `templates/templates/app/skeleton/common/Dockerfile.njk`

**Step 1: Add COPY for authorized_users.json in Go runtime stage**

In `Dockerfile.njk`, find the Go runtime stage. After the line:

```dockerfile
COPY --from=backend-builder /app/server .
```

Add:

```dockerfile
COPY --from=backend-builder /app/authorized_users.json .
```

The Python stage already copies the entire `/app` directory, so `authorized_users.json` is included automatically.

**Step 2: Commit**

```bash
cd templates
git add templates/app/skeleton/common/Dockerfile.njk
git commit -m "fix(docker): copy authorized_users.json into Go runtime image"
```

---

## Task 17: Bump Template Version

**Files:**
- Modify: `templates/templates/app/template.yaml`

**Step 1: Bump version in template title**

Open `templates/templates/app/template.yaml` and increment the version number in the `title` field (e.g., from `v0.0.XX` to `v0.0.XX+1`). Check the current version first.

**Step 2: Commit all remaining changes**

```bash
cd templates
git add templates/app/template.yaml
git commit -m "chore: bump template version for API + frontend integration"
```

---

## Summary of All New/Modified Files

| File | Action | Task |
|------|--------|------|
| `backend/gofiber/auth.go.njk` | Modify | 1 |
| `backend/gofiber/compute.go.njk` | Create | 1 |
| `backend/gofiber/admin.go.njk` | Create | 2 |
| `backend/gofiber/authorized_users.json` | Create | 2 |
| `backend/gofiber/main.go.njk` | Modify | 3 |
| `backend/gofiber/main_test.go` | Modify | 4 |
| `backend/fastapi/auth.py.njk` | Modify | 5 |
| `backend/fastapi/compute.py.njk` | Create | 5 |
| `backend/fastapi/admin.py.njk` | Create | 6 |
| `backend/fastapi/authorized_users.json` | Create | 6 |
| `backend/fastapi/main.py.njk` | Modify | 7 |
| `backend/fastapi/test_main.py.njk` | Modify | 8 |
| `frontend/react/src/App.tsx.njk` | Modify | 9 |
| `frontend/react/src/App.test.tsx` | Modify | 10 |
| `frontend/lit/src/app-root.ts.njk` | Modify | 11 |
| `frontend/lit/src/app-root.test.ts` | Modify | 12 |
| `frontend/typescript/src/app.ts.njk` | Modify | 13 |
| `frontend/typescript/src/app.test.ts` | Modify | 14 |
| `common/catalog-info.yaml.njk` | Modify | 15 |
| `common/Dockerfile.njk` | Modify | 16 |
| `templates/app/template.yaml` | Modify | 17 |

## No Changes Required

- Template parameters (no new params needed)
- Flux manifests / registerWithFlux action
- Vite configs (proxy already set up for `/api` -> `localhost:8000`)
- CI/CD workflows
- Makefile
- devcontainer config
- go.mod.njk (no new dependencies -- `math` is stdlib)

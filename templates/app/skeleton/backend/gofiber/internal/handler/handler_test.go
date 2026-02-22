package handler

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// newTestApp creates a Fiber app configured for testing (no startup message).
func newTestApp() *fiber.App {
	return fiber.New(fiber.Config{DisableStartupMessage: true})
}

// testReq is a helper that performs a request and returns status code + body.
func testReq(t *testing.T, app *fiber.App, method, path string) (int, []byte) {
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
	return resp.StatusCode, body
}

// testJSONReq is a helper that performs a request with a JSON body.
func testJSONReq(t *testing.T, app *fiber.App, method, path string, payload any) (int, []byte) {
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
	return resp.StatusCode, body
}

// ── ComputeHandler ───────────────────────────────────────────────────────────

func TestComputeHandler_Add(t *testing.T) {
	app := newTestApp()
	app.Post("/compute", ComputeHandler)

	status, body := testJSONReq(t, app, "POST", "/compute", ComputeRequest{A: 2, Op: "add", B: 3})
	if status != http.StatusOK {
		t.Fatalf("expected 200, got %d", status)
	}
	var result ComputeResponse
	if err := json.Unmarshal(body, &result); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if result.Result != 5 {
		t.Errorf("expected 5, got %f", result.Result)
	}
}

func TestComputeHandler_DivByZero(t *testing.T) {
	app := newTestApp()
	app.Post("/compute", ComputeHandler)

	status, _ := testJSONReq(t, app, "POST", "/compute", ComputeRequest{A: 1, Op: "div", B: 0})
	if status != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", status)
	}
}

func TestComputeHandler_InvalidOp(t *testing.T) {
	app := newTestApp()
	app.Post("/compute", ComputeHandler)

	status, body := testJSONReq(t, app, "POST", "/compute", ComputeRequest{A: 1, Op: "modulo", B: 2})
	if status != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", status)
	}
	var m map[string]string
	if err := json.Unmarshal(body, &m); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if m["error"] != "invalid operation" {
		t.Errorf("expected 'invalid operation', got %q", m["error"])
	}
}

func TestComputeHandler_InvalidBody(t *testing.T) {
	app := newTestApp()
	app.Post("/compute", ComputeHandler)

	req := httptest.NewRequest("POST", "/compute", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

// ── HealthHandler ────────────────────────────────────────────────────────────

func TestHealthHandler_OK(t *testing.T) {
	app := newTestApp()
	h := &HealthHandler{DB: nil}
	app.Get("/healthz", h.Health)

	t.Setenv("DATABASE_URL", "")

	status, body := testReq(t, app, "GET", "/healthz")
	if status != http.StatusOK {
		t.Fatalf("expected 200, got %d", status)
	}
	var m map[string]string
	if err := json.Unmarshal(body, &m); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if m["status"] != "ok" {
		t.Errorf("expected status=ok, got %q", m["status"])
	}
}

func TestHealthHandler_Unhealthy(t *testing.T) {
	app := newTestApp()
	h := &HealthHandler{DB: nil}
	app.Get("/healthz", h.Health)

	t.Setenv("DATABASE_URL", "postgres://localhost/test")

	status, body := testReq(t, app, "GET", "/healthz")
	if status != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", status)
	}
	var m map[string]string
	if err := json.Unmarshal(body, &m); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if m["status"] != "unhealthy" {
		t.Errorf("expected status=unhealthy, got %q", m["status"])
	}
}

func TestHealthHandler_OKWithDB(t *testing.T) {
	app := newTestApp()
	h := &HealthHandler{DB: &gorm.DB{}}
	app.Get("/healthz", h.Health)

	t.Setenv("DATABASE_URL", "postgres://localhost/test")

	status, _ := testReq(t, app, "GET", "/healthz")
	if status != http.StatusOK {
		t.Errorf("expected 200, got %d", status)
	}
}

// ── FeaturesHandler ──────────────────────────────────────────────────────────

func TestFeaturesHandler_NoDB(t *testing.T) {
	app := newTestApp()
	h := &FeaturesHandler{DB: nil}
	app.Get("/features", h.Features)

	status, body := testReq(t, app, "GET", "/features")
	if status != http.StatusOK {
		t.Fatalf("expected 200, got %d", status)
	}
	var resp FeaturesResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Database {
		t.Error("expected database=false when DB is nil")
	}
}

func TestFeaturesHandler_WithDB(t *testing.T) {
	app := newTestApp()
	h := &FeaturesHandler{DB: &gorm.DB{}}
	app.Get("/features", h.Features)

	status, body := testReq(t, app, "GET", "/features")
	if status != http.StatusOK {
		t.Fatalf("expected 200, got %d", status)
	}
	var resp FeaturesResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !resp.Database {
		t.Error("expected database=true when DB is set")
	}
}

// ── UserHandler ──────────────────────────────────────────────────────────────

func TestUserHandler_DevMode(t *testing.T) {
	app := newTestApp()
	app.Get("/user", UserHandler)

	t.Setenv("DEV_MODE", "true")
	t.Setenv("DEV_USER_EMAIL", "test@example.com")

	status, body := testReq(t, app, "GET", "/user")
	if status != http.StatusOK {
		t.Fatalf("expected 200, got %d", status)
	}
	var user AuthUser
	if err := json.Unmarshal(body, &user); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if user.Email != "test@example.com" {
		t.Errorf("expected email=test@example.com, got %q", user.Email)
	}
	if !user.Authenticated {
		t.Error("expected authenticated=true")
	}
}

func TestUserHandler_NoAuth(t *testing.T) {
	app := newTestApp()
	app.Get("/user", UserHandler)

	t.Setenv("DEV_MODE", "false")

	status, body := testReq(t, app, "GET", "/user")
	if status != http.StatusOK {
		t.Fatalf("expected 200, got %d", status)
	}
	var user AuthUser
	if err := json.Unmarshal(body, &user); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if user.Authenticated {
		t.Error("expected authenticated=false with no headers")
	}
}

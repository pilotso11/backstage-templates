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

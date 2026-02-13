package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// testApp builds a minimal app with handlers wired — no middleware
// that would interfere with tests (no logger noise, no static files).
func testApp() *fiber.App {
	app := fiber.New(fiber.Config{
		// Disable startup message in tests
		DisableStartupMessage: true,
	})
	app.Get("/healthz", healthHandler)
	api := app.Group("/api")
	api.Get("/hello", helloHandler)
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

// helper: assert JSON field equals expected string value
func assertJSONField(t *testing.T, body []byte, field, expected string) {
	t.Helper()
	var m map[string]string
	if err := json.Unmarshal(body, &m); err != nil {
		t.Fatalf("unmarshal JSON: %v\nbody: %s", err, body)
	}
	if m[field] != expected {
		t.Errorf("expected %s=%q, got %q", field, expected, m[field])
	}
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
	assertJSONField(t, body, "status", "ok")
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

// ── /api/hello ────────────────────────────────────────────────────────────────

func TestHello_Status200(t *testing.T) {
	resp, _ := doRequest(t, testApp(), "GET", "/api/hello")
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestHello_JSONBody(t *testing.T) {
	_, body := doRequest(t, testApp(), "GET", "/api/hello")
	var m map[string]string
	if err := json.Unmarshal(body, &m); err != nil {
		t.Fatalf("unmarshal JSON: %v\nbody: %s", err, body)
	}
	if _, ok := m["message"]; !ok {
		t.Error("expected 'message' field in response")
	}
	if m["message"] == "" {
		t.Error("expected non-empty message")
	}
}

func TestHello_ContentType(t *testing.T) {
	resp, _ := doRequest(t, testApp(), "GET", "/api/hello")
	ct := resp.Header.Get("Content-Type")
	if !strings.Contains(ct, "application/json") {
		t.Errorf("expected application/json content-type, got %q", ct)
	}
}

func TestHello_MethodNotAllowed(t *testing.T) {
	for _, method := range []string{"POST", "PUT", "DELETE"} {
		resp, _ := doRequest(t, testApp(), method, "/api/hello")
		if resp.StatusCode != http.StatusMethodNotAllowed {
			t.Errorf("%s /api/hello: expected 405, got %d", method, resp.StatusCode)
		}
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

// ── Handler unit tests ────────────────────────────────────────────────────────

func TestHealthHandler_DirectCall(t *testing.T) {
	app := fiber.New(fiber.Config{DisableStartupMessage: true})
	app.Get("/healthz", healthHandler)
	resp, body := doRequest(t, app, "GET", "/healthz")
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if len(body) == 0 {
		t.Error("expected non-empty body")
	}
}

func TestHelloHandler_DirectCall(t *testing.T) {
	app := fiber.New(fiber.Config{DisableStartupMessage: true})
	app.Get("/hello", helloHandler)
	resp, body := doRequest(t, app, "GET", "/hello")
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if len(body) == 0 {
		t.Error("expected non-empty body")
	}
}

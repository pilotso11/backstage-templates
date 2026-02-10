package main

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func testApp() *fiber.App {
	app := fiber.New()
	app.Get("/healthz", healthHandler)
	api := app.Group("/api")
	api.Get("/hello", helloHandler)
	return app
}

func TestHealthHandler(t *testing.T) {
	resp, err := testApp().Test(httptest.NewRequest("GET", "/healthz", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if len(body) == 0 {
		t.Error("expected non-empty body")
	}
}

func TestHelloHandler(t *testing.T) {
	resp, err := testApp().Test(httptest.NewRequest("GET", "/api/hello", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

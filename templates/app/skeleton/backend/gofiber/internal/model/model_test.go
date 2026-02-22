package model

import (
	"testing"
	"time"
)

func TestBuildDSN(t *testing.T) {
	dsn := BuildDSN("postgres://host:5432/mydb?sslmode=disable", "myuser", "mypass")
	expected := "postgres://myuser:mypass@host:5432/mydb?sslmode=disable"
	if dsn != expected {
		t.Errorf("expected %q, got %q", expected, dsn)
	}
}

func TestBuildDSN_InvalidURL(t *testing.T) {
	dsn := BuildDSN("://bad", "u", "p")
	if dsn != "://bad" {
		t.Errorf("expected fallback to original, got %q", dsn)
	}
}

func TestBuildDSN_EmptyCredentials(t *testing.T) {
	dsn := BuildDSN("postgres://host:5432/mydb", "", "")
	expected := "postgres://:@host:5432/mydb"
	if dsn != expected {
		t.Errorf("expected %q, got %q", expected, dsn)
	}
}

func TestTodoToResponse(t *testing.T) {
	now := time.Now()
	todo := Todo{
		Title:       "Test",
		Description: "Desc",
		Status:      "open",
	}
	todo.ID = 1
	todo.CreatedAt = now
	todo.UpdatedAt = now

	resp := todo.ToResponse()
	if resp.ID != 1 {
		t.Errorf("expected ID 1, got %d", resp.ID)
	}
	if resp.Title != "Test" {
		t.Errorf("expected title 'Test', got %q", resp.Title)
	}
	if resp.Description != "Desc" {
		t.Errorf("expected description 'Desc', got %q", resp.Description)
	}
	if resp.Status != "open" {
		t.Errorf("expected status 'open', got %q", resp.Status)
	}
	if resp.CreatedAt != now.Format(time.RFC3339) {
		t.Errorf("expected createdAt %q, got %q", now.Format(time.RFC3339), resp.CreatedAt)
	}
	if resp.UpdatedAt != now.Format(time.RFC3339) {
		t.Errorf("expected updatedAt %q, got %q", now.Format(time.RFC3339), resp.UpdatedAt)
	}
}

func TestTodoToResponse_ZeroValues(t *testing.T) {
	todo := Todo{}
	resp := todo.ToResponse()
	if resp.ID != 0 {
		t.Errorf("expected ID 0, got %d", resp.ID)
	}
	if resp.Title != "" {
		t.Errorf("expected empty title, got %q", resp.Title)
	}
}

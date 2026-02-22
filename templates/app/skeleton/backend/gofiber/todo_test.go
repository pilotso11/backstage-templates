package main

import (
	"encoding/json"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// setupMockDB creates a GORM *gorm.DB backed by sqlmock and sets appDB.
func setupMockDB(t *testing.T) sqlmock.Sqlmock {
	t.Helper()
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	gormDB, err := gorm.Open(postgres.New(postgres.Config{
		Conn: db,
	}), &gorm.Config{})
	if err != nil {
		t.Fatalf("gorm.Open: %v", err)
	}
	appDB = gormDB
	t.Cleanup(func() {
		appDB = nil
		_ = db.Close()
	})
	return mock
}

// ── GET /api/features (with DB) ──────────────────────────────────────────────

func TestFeatures_WithDB(t *testing.T) {
	setupMockDB(t)

	_, body := doRequest(t, testApp(), "GET", "/api/features")
	var resp FeaturesResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !resp.Database {
		t.Error("expected database=true when appDB is set")
	}
}

// ── GET /api/todos ───────────────────────────────────────────────────────────

func TestListTodos_Empty(t *testing.T) {
	mock := setupMockDB(t)

	rows := sqlmock.NewRows([]string{"id", "created_at", "updated_at", "deleted_at", "title", "description", "status"})
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "todos" WHERE "todos"."deleted_at" IS NULL ORDER BY created_at desc`)).
		WillReturnRows(rows)

	resp, body := doRequest(t, testApp(), "GET", "/api/todos")
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var todos []TodoResponse
	if err := json.Unmarshal(body, &todos); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(todos) != 0 {
		t.Errorf("expected 0 todos, got %d", len(todos))
	}
}

func TestListTodos_ReturnsTodos(t *testing.T) {
	mock := setupMockDB(t)

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "created_at", "updated_at", "deleted_at", "title", "description", "status"}).
		AddRow(1, now, now, nil, "Buy milk", "From the store", "open").
		AddRow(2, now, now, nil, "Walk dog", "", "done")
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "todos" WHERE "todos"."deleted_at" IS NULL ORDER BY created_at desc`)).
		WillReturnRows(rows)

	resp, body := doRequest(t, testApp(), "GET", "/api/todos")
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var todos []TodoResponse
	if err := json.Unmarshal(body, &todos); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(todos) != 2 {
		t.Errorf("expected 2 todos, got %d", len(todos))
	}
	if todos[0].Title != "Buy milk" {
		t.Errorf("expected first todo title 'Buy milk', got %q", todos[0].Title)
	}
}

// ── POST /api/todos ──────────────────────────────────────────────────────────

func TestCreateTodo_Success(t *testing.T) {
	mock := setupMockDB(t)

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "todos"`)).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), nil, "Buy milk", "From the store", "open").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	resp, body := doJSONRequest(t, testApp(), "POST", "/api/todos", TodoCreateRequest{
		Title:       "Buy milk",
		Description: "From the store",
	})
	if resp.StatusCode != 201 {
		t.Fatalf("expected 201, got %d; body: %s", resp.StatusCode, body)
	}
	var todo TodoResponse
	if err := json.Unmarshal(body, &todo); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if todo.Title != "Buy milk" {
		t.Errorf("expected title 'Buy milk', got %q", todo.Title)
	}
	if todo.Status != "open" {
		t.Errorf("expected status 'open', got %q", todo.Status)
	}
}

func TestCreateTodo_EmptyTitle(t *testing.T) {
	setupMockDB(t)

	resp, _ := doJSONRequest(t, testApp(), "POST", "/api/todos", TodoCreateRequest{
		Title: "",
	})
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestCreateTodo_InvalidBody(t *testing.T) {
	setupMockDB(t)

	app := testApp()
	req := httptest.NewRequest("POST", "/api/todos", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

// ── PATCH /api/todos/:id ─────────────────────────────────────────────────────

func TestUpdateTodo_Complete(t *testing.T) {
	mock := setupMockDB(t)

	now := time.Now()
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "todos" WHERE "todos"."id" = $1 AND "todos"."deleted_at" IS NULL ORDER BY "todos"."id" LIMIT $2`)).
		WithArgs(1, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at", "deleted_at", "title", "description", "status"}).
			AddRow(1, now, now, nil, "Buy milk", "From the store", "open"))
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "todos" SET`)).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	done := "done"
	resp, body := doJSONRequest(t, testApp(), "PATCH", "/api/todos/1", TodoUpdateRequest{
		Status: &done,
	})
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d; body: %s", resp.StatusCode, body)
	}
	var todo TodoResponse
	if err := json.Unmarshal(body, &todo); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if todo.Status != "done" {
		t.Errorf("expected status 'done', got %q", todo.Status)
	}
}

func TestUpdateTodo_InvalidStatus(t *testing.T) {
	mock := setupMockDB(t)

	now := time.Now()
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "todos" WHERE "todos"."id" = $1 AND "todos"."deleted_at" IS NULL ORDER BY "todos"."id" LIMIT $2`)).
		WithArgs(1, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "updated_at", "deleted_at", "title", "description", "status"}).
			AddRow(1, now, now, nil, "Buy milk", "", "open"))
	bad := "invalid"
	resp, _ := doJSONRequest(t, testApp(), "PATCH", "/api/todos/1", TodoUpdateRequest{
		Status: &bad,
	})
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestUpdateTodo_NotFound(t *testing.T) {
	mock := setupMockDB(t)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "todos" WHERE "todos"."id" = $1 AND "todos"."deleted_at" IS NULL ORDER BY "todos"."id" LIMIT $2`)).
		WithArgs(999, 1).
		WillReturnError(gorm.ErrRecordNotFound)

	done := "done"
	resp, _ := doJSONRequest(t, testApp(), "PATCH", "/api/todos/999", TodoUpdateRequest{
		Status: &done,
	})
	if resp.StatusCode != 404 {
		t.Errorf("expected 404, got %d", resp.StatusCode)
	}
}

// ── DELETE /api/todos/:id ────────────────────────────────────────────────────

func TestDeleteTodo_Success(t *testing.T) {
	mock := setupMockDB(t)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "todos" SET "deleted_at"=$1 WHERE "todos"."id" = $2 AND "todos"."deleted_at" IS NULL`)).
		WithArgs(sqlmock.AnyArg(), 1).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	resp, _ := doRequest(t, testApp(), "DELETE", "/api/todos/1")
	if resp.StatusCode != 204 {
		t.Errorf("expected 204, got %d", resp.StatusCode)
	}
}

func TestDeleteTodo_NotFound(t *testing.T) {
	mock := setupMockDB(t)

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "todos" SET "deleted_at"=$1 WHERE "todos"."id" = $2 AND "todos"."deleted_at" IS NULL`)).
		WithArgs(sqlmock.AnyArg(), 999).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	resp, _ := doRequest(t, testApp(), "DELETE", "/api/todos/999")
	if resp.StatusCode != 404 {
		t.Errorf("expected 404, got %d", resp.StatusCode)
	}
}

// ── DTO conversion ───────────────────────────────────────────────────────────

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
	if resp.CreatedAt != now.Format(time.RFC3339) {
		t.Errorf("expected createdAt %q, got %q", now.Format(time.RFC3339), resp.CreatedAt)
	}
}

// ── Todo routes not registered when appDB is nil ─────────────────────────────

func TestTodoRoutes_NotRegistered_WhenNoDB(t *testing.T) {
	saved := appDB
	appDB = nil
	defer func() { appDB = saved }()

	app := testApp()
	for _, path := range []string{"/api/todos"} {
		resp, _ := doRequest(t, app, "GET", path)
		if resp.StatusCode != 404 {
			t.Errorf("GET %s: expected 404 when no DB, got %d", path, resp.StatusCode)
		}
	}
}

package main

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// listTodosHandler godoc
// @Summary     List all todos
// @Tags        todos
// @Produce     json
// @Success     200 {array} TodoResponse
// @Router      /api/todos [get]
func listTodosHandler(c *fiber.Ctx) error {
	var todos []Todo
	if err := appDB.Order("created_at desc").Find(&todos).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch todos"})
	}
	resp := make([]TodoResponse, len(todos))
	for i := range todos {
		resp[i] = todos[i].ToResponse()
	}
	return c.JSON(resp)
}

// createTodoHandler godoc
// @Summary     Create a new todo
// @Tags        todos
// @Accept      json
// @Produce     json
// @Param       body body TodoCreateRequest true "Todo to create"
// @Success     201 {object} TodoResponse
// @Failure     400 {object} map[string]string
// @Router      /api/todos [post]
func createTodoHandler(c *fiber.Ctx) error {
	var req TodoCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title is required"})
	}
	todo := Todo{
		Title:       req.Title,
		Description: req.Description,
		Status:      "open",
	}
	if err := appDB.Create(&todo).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create todo"})
	}
	return c.Status(fiber.StatusCreated).JSON(todo.ToResponse())
}

// updateTodoHandler godoc
// @Summary     Update an existing todo
// @Tags        todos
// @Accept      json
// @Produce     json
// @Param       id   path int              true "Todo ID"
// @Param       body body TodoUpdateRequest true "Fields to update"
// @Success     200 {object} TodoResponse
// @Failure     400 {object} map[string]string
// @Failure     404 {object} map[string]string
// @Router      /api/todos/{id} [patch]
func updateTodoHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	var todo Todo
	if err := appDB.First(&todo, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "todo not found"})
	}

	var req TodoUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if req.Title != nil {
		todo.Title = *req.Title
	}
	if req.Description != nil {
		todo.Description = *req.Description
	}
	if req.Status != nil {
		if *req.Status != "open" && *req.Status != "done" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status must be open or done"})
		}
		todo.Status = *req.Status
	}

	if err := appDB.Save(&todo).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update todo"})
	}
	return c.JSON(todo.ToResponse())
}

// deleteTodoHandler godoc
// @Summary     Delete a todo
// @Tags        todos
// @Param       id path int true "Todo ID"
// @Success     204
// @Failure     400 {object} map[string]string
// @Failure     404 {object} map[string]string
// @Router      /api/todos/{id} [delete]
func deleteTodoHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	result := appDB.Delete(&Todo{}, id)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete todo"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "todo not found"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

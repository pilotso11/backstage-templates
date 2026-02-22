package handler

import (
	"os"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// HealthHandler provides the health check endpoint.
type HealthHandler struct {
	DB *gorm.DB
}

// Health godoc
// @Summary     Health check
// @Tags        ops
// @Produce     json
// @Success     200 {object} map[string]string
// @Failure     503 {object} map[string]string
// @Router      /healthz [get]
func (h *HealthHandler) Health(c *fiber.Ctx) error {
	if os.Getenv("DATABASE_URL") != "" && h.DB == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status": "unhealthy",
			"reason": "database not connected",
		})
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

package handler

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// FeaturesResponse reports which optional features are enabled.
type FeaturesResponse struct {
	Database bool `json:"database"`
}

// FeaturesHandler provides the features endpoint.
type FeaturesHandler struct {
	DB *gorm.DB
}

// Features godoc
// @Summary     List enabled features
// @Tags        ops
// @Produce     json
// @Success     200 {object} FeaturesResponse
// @Router      /api/features [get]
func (h *FeaturesHandler) Features(c *fiber.Ctx) error {
	return c.JSON(FeaturesResponse{
		Database: h.DB != nil,
	})
}

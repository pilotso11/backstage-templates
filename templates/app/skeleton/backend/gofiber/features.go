package main

import "github.com/gofiber/fiber/v2"

// FeaturesResponse reports which optional features are enabled.
type FeaturesResponse struct {
	Database bool `json:"database"`
}

// featuresHandler godoc
// @Summary     List enabled features
// @Tags        ops
// @Produce     json
// @Success     200 {object} FeaturesResponse
// @Router      /api/features [get]
func featuresHandler(c *fiber.Ctx) error {
	return c.JSON(FeaturesResponse{
		Database: appDB != nil,
	})
}

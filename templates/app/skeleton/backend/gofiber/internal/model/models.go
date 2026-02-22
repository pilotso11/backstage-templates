package model

import "gorm.io/gorm"

// Todo represents a task in the database.
type Todo struct {
	gorm.Model
	Title       string `gorm:"not null"`
	Description string
	Status      string `gorm:"default:open;not null"` // "open" or "done"
}

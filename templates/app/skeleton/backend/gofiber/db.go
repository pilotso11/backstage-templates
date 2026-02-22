package main

import (
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// appDB holds the database connection, nil when DATABASE_URL is not set.
var appDB *gorm.DB

// InitDB connects to the database and runs auto-migration.
func InitDB(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&Todo{}); err != nil {
		return nil, err
	}
	return db, nil
}

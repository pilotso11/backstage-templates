package main

import (
	"net/url"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// appDB holds the database connection, nil when DATABASE_URL is not set.
var appDB *gorm.DB

// BuildDSN injects user/pass credentials into a base database URL.
// The base URL should not contain credentials (e.g. "postgres://host:5432/db?sslmode=disable").
func BuildDSN(baseURL, user, pass string) string {
	u, err := url.Parse(baseURL)
	if err != nil {
		return baseURL
	}
	u.User = url.UserPassword(user, pass)
	return u.String()
}

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

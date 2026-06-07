package router

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/handler"
	"pos-cafe/internal/middleware"
	"pos-cafe/internal/repository"
)

func Setup(db *sql.DB) *gin.Engine {
	r := gin.Default()

	r.Use(corsMiddleware())

	api := r.Group("/api/v1")

	authRepo := repository.NewAuthRepository(db)
	authHandler := handler.NewAuthHandler(authRepo)

	// Public routes
	public := api.Group("")
	public.POST("/auth/login", authHandler.Login)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	protected.GET("/auth/me", authHandler.Me)

	return r
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin,Content-Type,Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

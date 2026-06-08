package router

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/handler"
	"pos-cafe/internal/middleware"
	"pos-cafe/internal/repository"
)

const uploadDir = "uploads/menus"
const uploadBase = "/uploads/menus"

func Setup(db *sql.DB) *gin.Engine {
	r := gin.Default()

	r.Use(corsMiddleware())

	// Serve uploaded images
	r.StaticFS("/uploads", http.Dir("uploads"))

	api := r.Group("/api/v1")

	// Repositories
	authRepo := repository.NewAuthRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	menuRepo := repository.NewMenuRepository(db)

	// Handlers
	authHandler := handler.NewAuthHandler(authRepo)
	categoryHandler := handler.NewCategoryHandler(categoryRepo)
	menuHandler := handler.NewMenuHandler(menuRepo, uploadDir, uploadBase)

	// Public routes
	public := api.Group("")
	public.POST("/auth/login", authHandler.Login)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())

	protected.GET("/auth/me", authHandler.Me)

	// Categories
	protected.GET("/categories", categoryHandler.List)
	protected.POST("/categories", middleware.RequirePermission("category:create"), categoryHandler.Create)
	protected.PUT("/categories/:id", middleware.RequirePermission("category:update"), categoryHandler.Update)
	protected.DELETE("/categories/:id", middleware.RequirePermission("category:delete"), categoryHandler.Delete)

	// Menus
	protected.GET("/menus", menuHandler.List)
	protected.POST("/menus", middleware.RequirePermission("menu:create"), menuHandler.Create)
	protected.PUT("/menus/:id", middleware.RequirePermission("menu:update"), menuHandler.Update)
	protected.PATCH("/menus/:id/availability", middleware.RequirePermission("menu:update"), menuHandler.ToggleAvailability)
	protected.DELETE("/menus/:id", middleware.RequirePermission("menu:delete"), menuHandler.Delete)

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

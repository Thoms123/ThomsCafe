package router

import (
	"database/sql"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/gin-gonic/gin"
	"pos-cafe/internal/handler"
	"pos-cafe/internal/middleware"
	"pos-cafe/internal/repository"
)

func Setup(db *sql.DB, cld *cloudinary.Cloudinary) *gin.Engine {
	r := gin.Default()

	r.Use(corsMiddleware())

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	api := r.Group("/api/v1")

	// Repositories
	authRepo := repository.NewAuthRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	menuRepo := repository.NewMenuRepository(db)
	tableRepo := repository.NewTableRepository(db, frontendURL)
	orderRepo := repository.NewOrderRepository(db)

	// Handlers
	authHandler := handler.NewAuthHandler(authRepo)
	categoryHandler := handler.NewCategoryHandler(categoryRepo)
	menuHandler := handler.NewMenuHandler(menuRepo, cld)
	tableHandler := handler.NewTableHandler(tableRepo, menuRepo)
	orderHandler := handler.NewOrderHandler(orderRepo, tableRepo)

	// Public routes
	public := api.Group("")
	public.POST("/auth/login", authHandler.Login)
	public.GET("/public/menu/:token", tableHandler.PublicMenuByToken)
	public.POST("/public/orders", orderHandler.Create)
	public.GET("/public/orders/:id", orderHandler.GetStatus)

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

	// Tables
	protected.GET("/tables", tableHandler.List)
	protected.POST("/tables", middleware.RequirePermission("table:create"), tableHandler.Create)
	protected.PUT("/tables/:id", middleware.RequirePermission("table:update"), tableHandler.Update)
	protected.DELETE("/tables/:id", middleware.RequirePermission("table:delete"), tableHandler.Delete)

	// Orders
	protected.GET("/orders", orderHandler.List)
	protected.GET("/orders/:id", orderHandler.GetByID)
	protected.PATCH("/orders/:id/status", middleware.RequirePermission("order:update"), orderHandler.UpdateStatus)

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

package router

import (
	"database/sql"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
	"pos-cafe/internal/handler"
	"pos-cafe/internal/middleware"
	"pos-cafe/internal/repository"
	"pos-cafe/internal/ws"
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
	customerRepo := repository.NewCustomerRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)
	userRepo := repository.NewUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	reportRepo := repository.NewReportRepository(db)

	// WebSocket hub — broadcasts order events to kasir/staff (/ws/orders) and
	// targeted status updates to customers watching a single order (/ws/order/:id).
	hub := ws.NewHub()

	// Handlers
	authHandler := handler.NewAuthHandler(authRepo)
	categoryHandler := handler.NewCategoryHandler(categoryRepo)
	menuHandler := handler.NewMenuHandler(menuRepo, cld)
	tableHandler := handler.NewTableHandler(tableRepo, menuRepo)
	orderHandler := handler.NewOrderHandler(orderRepo, tableRepo, customerRepo, settingsRepo, hub)
	customerHandler := handler.NewCustomerHandler(customerRepo)
	settingsHandler := handler.NewSettingsHandler(settingsRepo)
	userHandler := handler.NewUserHandler(userRepo)
	roleHandler := handler.NewRoleHandler(roleRepo)
	reportHandler := handler.NewReportHandler(reportRepo)
	wsHandler := handler.NewWSHandler(hub, orderRepo)

	// Rate limit order creation per IP to prevent spam (1 req/sec, burst of 5).
	orderLimiter := middleware.NewIPRateLimiter(rate.Limit(1), 5)

	// WebSocket routes — mounted at root (not under /api/v1) since the
	// frontend derives its WS base URL by stripping /api/v1 from the API URL.
	r.GET("/ws/orders", wsHandler.HandleOrdersWS)
	r.GET("/ws/order/:id", wsHandler.HandleOrderSubWS)

	// Public routes
	public := api.Group("")
	public.POST("/auth/login", authHandler.Login)
	public.GET("/public/menu/:token", tableHandler.PublicMenuByToken)
	public.POST("/public/orders", orderLimiter.Middleware(), orderHandler.Create)
	public.GET("/public/orders", orderLimiter.Middleware(), orderHandler.GetByPhone)
	public.GET("/public/orders/:id", orderHandler.GetStatus)
	public.GET("/public/store-hours", settingsHandler.GetPublicHours)

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

	// Users
	protected.GET("/users", middleware.RequirePermission("user:read"), userHandler.List)
	protected.POST("/users", middleware.RequirePermission("user:create"), userHandler.Create)
	protected.PUT("/users/:id", middleware.RequirePermission("user:update"), userHandler.Update)
	protected.DELETE("/users/:id", middleware.RequirePermission("user:delete"), userHandler.Delete)

	// Roles & permissions
	protected.GET("/roles", middleware.RequirePermission("role:manage"), roleHandler.List)
	protected.POST("/roles", middleware.RequirePermission("role:manage"), roleHandler.Create)
	protected.PUT("/roles/:id/permissions", middleware.RequirePermission("role:manage"), roleHandler.UpdatePermissions)
	protected.GET("/permissions", middleware.RequirePermission("role:manage"), roleHandler.ListPermissions)

	// Customers
	protected.GET("/customers", middleware.RequirePermission("customer:read"), customerHandler.List)

	// Settings
	protected.PUT("/settings/store-hours", middleware.RequirePermission("setting:update"), settingsHandler.UpdateHours)

	// Reports
	protected.GET("/reports/sales", middleware.RequirePermission("report:read"), reportHandler.Sales)
	protected.GET("/reports/sales/daily", middleware.RequirePermission("report:read"), reportHandler.DailySales)
	protected.GET("/reports/top-menus", middleware.RequirePermission("report:read"), reportHandler.TopMenus)
	protected.GET("/reports/tables", middleware.RequirePermission("report:read"), reportHandler.TableRecap)

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

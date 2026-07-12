package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"pos-cafe/pkg/response"
	"pos-cafe/pkg/utils"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			response.Unauthorized(c, "Missing or invalid token")
			c.Abort()
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := utils.ValidateJWT(tokenStr)
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)
		c.Set("permissions", claims.Permissions)
		c.Next()
	}
}

func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		permissions, exists := c.Get("permissions")
		if !exists {
			response.Forbidden(c, "Access denied")
			c.Abort()
			return
		}

		perms, ok := permissions.([]string)
		if !ok {
			response.Forbidden(c, "Access denied")
			c.Abort()
			return
		}

		for _, p := range perms {
			if p == permission {
				c.Next()
				return
			}
		}

		response.Forbidden(c, "Permission denied: "+permission)
		c.Abort()
	}
}

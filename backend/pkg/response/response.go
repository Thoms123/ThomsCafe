package response

import "github.com/gin-gonic/gin"

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type PaginatedResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Meta    Meta        `json:"meta"`
}

type Meta struct {
	Page      int   `json:"page"`
	PerPage   int   `json:"per_page"`
	Total     int64 `json:"total"`
	TotalPage int   `json:"total_page"`
}

func OK(c *gin.Context, message string, data interface{}) {
	c.JSON(200, Response{Success: true, Message: message, Data: data})
}

func Created(c *gin.Context, message string, data interface{}) {
	c.JSON(201, Response{Success: true, Message: message, Data: data})
}

func BadRequest(c *gin.Context, message string) {
	c.JSON(400, Response{Success: false, Message: message})
}

func Unauthorized(c *gin.Context, message string) {
	c.JSON(401, Response{Success: false, Message: message})
}

func Forbidden(c *gin.Context, message string) {
	c.JSON(403, Response{Success: false, Message: message})
}

func NotFound(c *gin.Context, message string) {
	c.JSON(404, Response{Success: false, Message: message})
}

func InternalError(c *gin.Context, message string) {
	c.JSON(500, Response{Success: false, Message: message})
}

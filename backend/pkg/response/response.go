package response

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

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

func TooManyRequests(c *gin.Context, message string) {
	c.JSON(429, Response{Success: false, Message: message})
}

// ValidationError formats a c.ShouldBindJSON error into field-level messages
// instead of leaking the raw go-playground/validator struct-tag error text.
func ValidationError(c *gin.Context, err error) {
	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		fields := make(map[string]string, len(ve))
		for _, fe := range ve {
			fields[fe.Field()] = validationMessage(fe)
		}
		c.JSON(400, Response{Success: false, Message: "Validation failed", Data: gin.H{"errors": fields}})
		return
	}
	BadRequest(c, err.Error())
}

func validationMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return fe.Field() + " is required"
	case "email":
		return fe.Field() + " must be a valid email address"
	case "min":
		return fe.Field() + " must be at least " + fe.Param() + " characters"
	case "max":
		return fe.Field() + " must be at most " + fe.Param() + " characters"
	default:
		return fe.Field() + " is invalid"
	}
}

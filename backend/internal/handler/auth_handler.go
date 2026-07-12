package handler

import (
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
	"pos-cafe/pkg/utils"
)

type AuthHandler struct {
	repo *repository.AuthRepository
}

func NewAuthHandler(repo *repository.AuthRepository) *AuthHandler {
	return &AuthHandler{repo: repo}
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	user, err := h.repo.FindByEmail(req.Email)
	if err != nil {
		response.InternalError(c, "Server error")
		return
	}
	if user == nil {
		response.Unauthorized(c, "Invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		response.Unauthorized(c, "Invalid email or password")
		return
	}

	token, err := utils.GenerateJWT(user.ID, user.Role, user.Permissions)
	if err != nil {
		response.InternalError(c, "Failed to generate token")
		return
	}

	response.OK(c, "Login successful", gin.H{
		"token": token,
		"user": gin.H{
			"id":          user.ID,
			"name":        user.Name,
			"email":       user.Email,
			"role":        user.Role,
			"permissions": user.Permissions,
		},
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, _ := c.Get("user_id")
	id, ok := userID.(int)
	if !ok {
		response.Unauthorized(c, "Unauthorized")
		return
	}

	user, err := h.repo.FindByID(id)
	if err != nil || user == nil {
		response.Unauthorized(c, "User not found")
		return
	}

	response.OK(c, "OK", gin.H{
		"id":          user.ID,
		"name":        user.Name,
		"email":       user.Email,
		"role":        user.Role,
		"permissions": user.Permissions,
	})
}

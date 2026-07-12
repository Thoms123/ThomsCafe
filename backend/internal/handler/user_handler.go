package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"pos-cafe/internal/repository"
	"pos-cafe/pkg/response"
)

type UserHandler struct {
	repo *repository.UserRepository
}

func NewUserHandler(repo *repository.UserRepository) *UserHandler {
	return &UserHandler{repo: repo}
}

func (h *UserHandler) List(c *gin.Context) {
	users, err := h.repo.FindAll()
	if err != nil {
		response.InternalError(c, "Failed to fetch users")
		return
	}
	response.OK(c, "OK", users)
}

func (h *UserHandler) Create(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required,min=1,max=100"`
		Email    string `json:"email" binding:"required,email,max=150"`
		Password string `json:"password" binding:"required,min=6"`
		RoleID   int    `json:"role_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	user, err := h.repo.Create(req.Name, req.Email, req.Password, req.RoleID)
	if err != nil {
		if repository.IsEmailExists(err) {
			response.BadRequest(c, "Email sudah digunakan")
			return
		}
		if repository.IsRoleNotFound(err) {
			response.BadRequest(c, "Role tidak ditemukan")
			return
		}
		response.InternalError(c, "Failed to create user")
		return
	}
	response.Created(c, "User created", user)
}

func (h *UserHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}

	var req struct {
		Name     string  `json:"name" binding:"required,min=1,max=100"`
		Email    string  `json:"email" binding:"required,email,max=150"`
		RoleID   int     `json:"role_id" binding:"required"`
		IsActive bool    `json:"is_active"`
		Password *string `json:"password" binding:"omitempty,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err)
		return
	}

	user, err := h.repo.Update(id, repository.UserUpdateInput{
		Name:     req.Name,
		Email:    req.Email,
		RoleID:   req.RoleID,
		IsActive: req.IsActive,
		Password: req.Password,
	})
	if err != nil {
		if repository.IsEmailExists(err) {
			response.BadRequest(c, "Email sudah digunakan")
			return
		}
		if repository.IsRoleNotFound(err) {
			response.BadRequest(c, "Role tidak ditemukan")
			return
		}
		response.InternalError(c, "Failed to update user")
		return
	}
	if user == nil {
		response.NotFound(c, "User not found")
		return
	}
	response.OK(c, "User updated", user)
}

func (h *UserHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "Invalid ID")
		return
	}

	if uid, ok := c.Get("user_id"); ok {
		if currentID, ok := uid.(int); ok && currentID == id {
			response.BadRequest(c, "Tidak bisa menghapus akun sendiri")
			return
		}
	}

	ok, err := h.repo.Delete(id)
	if err != nil {
		response.InternalError(c, "Failed to delete user")
		return
	}
	if !ok {
		response.NotFound(c, "User not found")
		return
	}
	response.OK(c, "User deleted", nil)
}
